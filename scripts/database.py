"""Read/write the split database and compose isolated research snapshots.

The database contains research only. Role text and registry metadata live under prompts/.
Each document is saved with atomic replacement; callers hold the shared review lock.
"""
import argparse
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(root=ROOT):
    root = Path(root)
    manifest = json.loads((root / 'database/manifest.json').read_text())
    collections = {}
    for collection in manifest['collections']:
        collections[collection] = {
            path.stem: json.loads(path.read_text())
            for path in sorted((root / 'database' / collection).glob('*.json'))
        }
    registry = json.loads((root / 'prompts/registry.json').read_text())
    for key, row in registry.items():
        text = root / 'prompts/roles' / f'{key}.md'
        if text.exists():
            row['text'] = text.read_text()
    collections['prompts'] = registry
    return {'collections': collections}


def fingerprint(ledger):
    return hashlib.sha256(json.dumps(ledger, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, mode='w', delete=False) as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
        temporary = stream.name
    os.chmod(temporary, 0o644)
    os.replace(temporary, path)


def changes(before, after):
    result = []
    for collection, current in after['collections'].items():
        previous = before['collections'].get(collection, {})
        for key in sorted(set(previous) | set(current)):
            if previous.get(key) != current.get(key):
                result.append({'collection': collection, 'id': key,
                               'before': previous.get(key), 'after': current.get(key)})
    return result


def apply(before, after, root=ROOT):
    if fingerprint(load(root)) != fingerprint(before):
        raise RuntimeError('Database or prompts changed during review; reconcile before applying.')
    if before['collections']['prompts'] != after['collections']['prompts']:
        raise ValueError('Scheduled reviews cannot edit prompts.')
    for change in changes(before, after):
        path = Path(root) / 'database' / change['collection'] / f"{change['id']}.json"
        if change['after'] is None:
            path.unlink(missing_ok=True)
        else:
            atomic_json(path, change['after'])


def validate(ledger):
    collections = ledger['collections']
    required = {'events', 'factions', 'issues', 'nominations', 'people', 'donors', 'runs', 'prompts', 'assessments'}
    if not required <= collections.keys():
        raise ValueError('Missing required collections')
    for collection, documents in collections.items():
        for key in documents:
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', key):
                raise ValueError(f'Unsafe document identifier in {collection}: {key}')
    seen = set()
    for group in collections['events'].values():
        for event in group['items']:
            if event['id'] in seen:
                raise ValueError(f"Duplicate event: {event['id']}")
            seen.add(event['id'])
            if not set(event['issues']) <= collections['issues'].keys():
                raise ValueError(f"Unknown issue: {event['id']}")
    from validate_nominees import validate as validate_nominees
    validate_nominees(ledger, ledger, 'Integrity')
    from validate_assessments import validate as validate_assessments
    validate_assessments(ledger)
    return {'collections': len(collections), 'events': len(seen), 'nominees': len(collections['nominations']['republican_2028']['candidates'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'export'])
    parser.add_argument('destination', nargs='?')
    args = parser.parse_args()
    ledger = load()
    if args.command == 'validate':
        print(json.dumps(validate(ledger)))
    else:
        if not args.destination:
            parser.error('export requires a destination file')
        atomic_json(args.destination, ledger)


if __name__ == '__main__':
    main()

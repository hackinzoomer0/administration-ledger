"""Journaled, idempotent application. Caller owns the shared review lock."""
import json
from pathlib import Path


def apply_transaction(before, after, root, resume=False, publication=None, require_publication=False):
    from database import atomic_json, changes, fingerprint, load
    root = Path(root)
    journal = root / '.runtime' / 'application.json'
    journal.parent.mkdir(parents=True, exist_ok=True)
    if resume:
        state = json.loads(journal.read_text())
        if state.get('phase') == 'applied':
            if fingerprint(load(root)) != state['fingerprint']:
                raise RuntimeError('Applied receipt no longer matches current data; reconcile explicitly')
            if require_publication and (state.get('publication') or {}).get('status') not in {'verified', 'unchanged'}:
                raise RuntimeError('Application recovery requires a verified publication receipt')
            return load(root)
        if require_publication and (state.get('publication') or {}).get('status') not in {'verified', 'unchanged'}:
            raise RuntimeError('Application recovery requires a verified publication receipt')
        before, after = state['before'], state['after']
    else:
        if journal.exists() and json.loads(journal.read_text()).get('phase') != 'applied':
            raise RuntimeError('Unfinished application journal; reconcile before a new review')
        if fingerprint(load(root)) != fingerprint(before):
            raise RuntimeError('Database or prompts changed during review; reconcile before applying.')
        if before['collections']['prompts'] != after['collections']['prompts']:
            raise ValueError('Scheduled reviews cannot edit prompts.')
        state = {'phase': 'applying', 'before': before, 'after': after, 'publication': publication}
        atomic_json(journal, state)
        journal.chmod(0o600)
    current = load(root)
    if current['collections']['prompts'] != before['collections']['prompts']:
        raise RuntimeError('Prompts changed during interrupted application; reconcile explicitly')
    edits = changes(before, after)
    changed = {(row['collection'], row['id']) for row in edits}
    # Check the entire state before replacing anything, including unrelated remote/local edits.
    for collection in set(current['collections']) | set(before['collections']):
        if collection == 'prompts':
            continue
        for key in set(current['collections'].get(collection, {})) | set(before['collections'].get(collection, {})) | set(after['collections'].get(collection, {})):
            value = current['collections'].get(collection, {}).get(key)
            previous = before['collections'].get(collection, {}).get(key)
            target = after['collections'].get(collection, {}).get(key)
            if value != previous and ((collection, key) not in changed or value != target):
                raise RuntimeError(f'Application conflict in {collection}/{key}; no reconciliation writes made')
    for row in edits:
        path = root / 'database' / row['collection'] / f"{row['id']}.json"
        if row['after'] is None:
            path.unlink(missing_ok=True)
            import os
            descriptor = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        else:
            atomic_json(path, row['after'])
    if fingerprint(load(root)) != fingerprint(after):
        raise RuntimeError('Applied database fingerprint differs from intended state')
    atomic_json(journal, {'phase': 'applied', 'fingerprint': fingerprint(after), 'publication': state.get('publication')})
    journal.chmod(0o600)
    return after

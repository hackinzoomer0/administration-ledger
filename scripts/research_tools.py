"""Targeted staged retrieval and reusable private intake receipts. Never fetches around access controls."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from database import ROOT, atomic_json


def normalize(value):
    if value.startswith(('http://', 'https://')):
        p = urlsplit(value)
        query = [(k, v) for k, v in parse_qsl(p.query) if not k.lower().startswith('utm_') and k not in {'fbclid', 'gclid'}]
        return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path or '/', urlencode(sorted(query)), ''))
    return re.sub(r'\s+', ' ', value.casefold()).strip()


def receipt_key(kind, value, window):
    # Query results depend on their date window; a source URL can be reused across windows after checking its age.
    scope = window if kind == 'query' else ''
    return hashlib.sha256(json.dumps([kind, normalize(value), scope]).encode()).hexdigest()[:24]


def receipts(stage):
    path = Path(stage) / 'intake-receipts.json'
    return json.loads(path.read_text()) if path.exists() else []


def record(stage, row):
    if row.get('kind') not in {'query', 'source'} or row.get('status') not in {'read', 'headline_only', 'blocked', 'not_found'}:
        raise ValueError('Receipt requires query/source kind and honest access status')
    for key in ['value', 'window', 'purpose', 'result', 'reporting_origin']:
        if not isinstance(row.get(key), str) or not row[key].strip():
            raise ValueError(f'Receipt needs {key}')
    # Original reporting origin distinguishes syndication from independent corroboration.
    row = dict(row)
    row['id'] = receipt_key(row['kind'], row['value'], row['window'])
    row['recorded_at'] = datetime.now(timezone.utc).isoformat()
    row['normalized'] = normalize(row['value'])
    if 'excerpt' in row:
        row['content_hash'] = hashlib.sha256(row['excerpt'].encode()).hexdigest()
    rows = [old for old in receipts(stage) if old['id'] != row['id']] + [row]
    atomic_json(Path(stage) / 'intake-receipts.json', rows)
    # A bounded receipt/excerpt cache, not an independent claim verification service.
    cache = ROOT / '.runtime' / 'intake-cache'
    atomic_json(cache / f"{row['id']}.json", row)
    (cache / f"{row['id']}.json").chmod(0o600)
    return row['id']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', type=Path)
    sub = parser.add_subparsers(dest='command', required=True)
    slicer = sub.add_parser('slice'); slicer.add_argument('candidates', type=Path)
    get = sub.add_parser('get'); get.add_argument('collection'); get.add_argument('id'); get.add_argument('--path', default='')
    find = sub.add_parser('find'); find.add_argument('text'); find.add_argument('--limit', type=int, default=15)
    put = sub.add_parser('receipt'); put.add_argument('file', type=Path)
    lookup = sub.add_parser('lookup'); lookup.add_argument('kind', choices=['query', 'source']); lookup.add_argument('value'); lookup.add_argument('window')
    args = parser.parse_args()
    args.stage = args.stage.resolve()
    for key in ['file', 'candidates']:
        supplied = getattr(args, key, None)
        if supplied is not None and not supplied.resolve().is_relative_to(args.stage):
            parser.error('Receipt and candidate inputs must live inside the staged workspace')
    if args.command == 'receipt':
        print(record(args.stage, json.loads(args.file.read_text()))); return
    if args.command == 'lookup':
        path = ROOT / '.runtime/intake-cache' / f'{receipt_key(args.kind, args.value, args.window)}.json'
        print(path.read_text() if path.exists() else '{}'); return
    ledger = json.loads((args.stage / 'ledger-owner-redacted.json').read_text())['collections']
    if args.command == 'slice':
        import subprocess
        directory = args.stage / '.slices' / 'documents'
        for collection in ['events', 'issues', 'meta', 'factions', 'people', 'donors', 'assessments']:
            for key, value in ledger[collection].items():
                atomic_json(directory / collection / f'{key}.json', value)
        subprocess.run([__import__('sys').executable, str(ROOT / 'scripts/slice_research.py'), str(directory), str(args.candidates.resolve()), str(args.stage / '.slices'), __import__('datetime').date.today().isoformat()], check=True)
        return
    if args.command == 'get':
        value = ledger[args.collection][args.id]
        for key in args.path.split('/'):
            if key:
                value = value[int(key)] if isinstance(value, list) else value[key]
        print(json.dumps(value, ensure_ascii=False)); return
    matches = []
    for collection, documents in ledger.items():
        for key, value in documents.items():
            if args.text.casefold() in json.dumps(value, ensure_ascii=False).casefold():
                matches.append({'collection': collection, 'id': key})
    print(json.dumps(matches[:max(1, min(args.limit, 100))]))


if __name__ == '__main__':
    main()

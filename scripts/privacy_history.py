"""Read-only audit of reachable public history. Reports locations/categories, never matched text."""
import json
from pathlib import Path
import subprocess
from privacy import ROOT, identifiers, violations
from database import atomic_json


def audit(root=ROOT):
    private = identifiers(required=True)
    entries = subprocess.check_output(['git', 'rev-list', '--objects', '--all'], cwd=root, text=True).splitlines()
    objects = {}
    for entry in entries:
        parts = entry.split(' ', 1)
        if len(parts) == 2 and Path(parts[1]).suffix in {'.json', '.md', '.py', '.ts', '.tsx', '.yml', '.mjs', '.html'}:
            objects[parts[0]] = parts[1]
    data = subprocess.check_output(['git', 'cat-file', '--batch'], cwd=root, input=('\n'.join(objects) + '\n').encode())
    offset = 0; findings = []
    for object_id, name in objects.items():
        end = data.index(b'\n', offset)
        header = data[offset:end].decode().split()
        if len(header) != 3 or header[1] != 'blob':
            raise ValueError('Unexpected history object; audit incomplete')
        size = int(header[2]); offset = end + 1
        found = violations(data[offset:offset+size].decode(errors='replace'), private)
        offset += size + 1
        if name.startswith(('scripts/', 'tests/')):
            found = [value for value in found if value != 'private runtime or mailbox metadata']
        if found:
            findings.append({'object': object_id, 'path': name, 'categories': found})
    return {'objects_checked': len(objects), 'findings': findings,
            'scope': 'Locally reachable refs only; remote caches/forks and unreachable objects are not covered. No history rewritten.'}


if __name__ == '__main__':
    result = audit()
    target = ROOT / '.runtime/privacy-history-audit.json'
    atomic_json(target, result); target.chmod(0o600)
    print(json.dumps({'objects_checked': result['objects_checked'], 'affected_historical_objects': len(result['findings']), 'private_report': '.runtime/privacy-history-audit.json'}))

"""Shared event/profile integrity checks. Legacy exceptions cover unchanged presentation only."""
import difflib
import hashlib
import json
import re
from datetime import date as calendar_date
from pathlib import Path

BASELINE = Path(__file__).with_name('legacy_event_exceptions.json')

def record_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()

def validate(collections, today, new_ids=None):
    baseline = json.loads(BASELINE.read_text())
    errors, warnings = [], []
    CODES = re.compile(r'\b(IRN|FED|SUC|MID|TAR|IMM|VEN|EPS|RUS)\b')
    ISSUES = set(collections['issues'])
    FACTIONS = set(collections['factions'])
    REQ = ['id', 'date', 'precision', 'issues', 'kind', 'actor', 'text', 'source', 'tier', 'weight',
           'rationale', 'added', 'by', 'fx', 'fxnote']
    
    items, seen = [], {}
    for doc, group in collections['events'].items():
        for it in group.get('items', []):
            items.append((doc, it))
            if it.get('id') in seen:
                errors.append(f"duplicate id {it.get('id')}")
            seen[it.get('id')] = doc
    
    for doc, it in items:
        iid = it.get('id', '?')
        check = new_ids is None or iid in new_ids
        if not check:
            continue
        for k in REQ:
            if k not in it:
                errors.append(f'{iid}: missing field {k}')
        if not re.fullmatch(r'\d{4}-\d{2}(-\d{2})?', str(it.get('date', ''))):
            errors.append(f'{iid}: bad date {it.get("date")}')
        else:
            try:
                calendar_date.fromisoformat(it['date'] + ('-01' if len(it['date']) == 7 else ''))
            except ValueError:
                errors.append(f'{iid}: impossible calendar date')
        if it.get('date', '') > today and it.get('kind') != 'scheduled':
            errors.append(f'{iid}: dated in the future ({it["date"]}) but kind is not scheduled')
        bad = set(it.get('issues', [])) - ISSUES
        if bad:
            errors.append(f'{iid}: unknown issue codes {bad}')
        for f in list(it.get('by', [])) + list((it.get('fx') or {}).keys()):
            if f not in FACTIONS:
                errors.append(f'{iid}: unknown faction id {f}')
        for v in (it.get('fx') or {}).values():
            if type(v) is not int or v not in (1, -1):
                errors.append(f'{iid}: fx value {v} is not 1 or -1')
        if it.get('kind') not in {'chron', 'act', 'shift', 'scheduled'}:
            errors.append(f'{iid}: invalid kind {it.get("kind")}')
        if it.get('tier') not in {'documented', 'reported', 'claimed', 'inferred', 'carried'}:
            errors.append(f'{iid}: invalid evidence tier')
        w = it.get('weight', 0)
        if type(w) is not int or not 0 <= w <= 5:
            errors.append(f'{iid}: weight {w} out of range')
        if 'headline only' in (it.get('rationale', '') + it.get('source', '')).lower() and w > 2:
            errors.append(f'{iid}: headline-only item has weight {w} (cap 2)')
        if it.get('tier') == 'inferred' and w > 2:
            errors.append(f'{iid}: inferred item has weight {w} (cap 2)')
        if w >= 3:
            if 'my reading' not in it.get('rationale', '').lower():
                errors.append(f'{iid}: weight 3+ rationale lacks the net-effect sentence labeled "my reading"')
            if not it.get('fx'):
                note = it.get('fxnote', '')
                if not note.startswith('No fx: ') or len(note) < 20:
                    errors.append(f'{iid}: empty fx needs fxnote "No fx: <specific reason>"')
        if baseline.get(iid) == record_hash(it):
            errors[:] = [e for e in errors if e not in {
                f'{iid}: weight 3+ rationale lacks the net-effect sentence labeled "my reading"',
                f'{iid}: empty fx needs fxnote "No fx: <specific reason>"'}]
        for k in ('text', 'context', 'rationale', 'fxnote', 'actor'):
            m = CODES.search(str(it.get(k, '')))
            if m:
                errors.append(f'{iid}: issue code {m.group(0)} in prose field {k}')
    
    # near-duplicate occurrences on the same date across all docs
    by_date = {}
    for doc, it in items:
        by_date.setdefault(it.get('date'), []).append((doc, it))
    for date, lst in by_date.items():
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                a, b = lst[i][1], lst[j][1]
                if new_ids and a.get('id') not in new_ids and b.get('id') not in new_ids:
                    continue
                r = difflib.SequenceMatcher(None, a.get('text', '').lower(), b.get('text', '').lower()).ratio()
                if r > 0.6:
                    warnings.append(f"possible duplicate occurrence on {date}: {a.get('id')} / {b.get('id')} (similarity {r:.2f})")
    
    for kind in ('people', 'donors'):
        lst = collections[kind]['all'].get('list', [])
        ids = [x.get('id') for x in lst]
        for x in set(i for i in ids if ids.count(i) > 1):
            errors.append(f'{kind}: duplicate id {x}')
        for x in lst:
            n = x.get('name', '')
            if kind == 'people' and ' ' not in n.strip():
                warnings.append(f'people: "{n}" is not a first-and-last name')
            if re.search(r',| and ', n) and 'identity not verified' not in n:
                warnings.append(f'{kind}: "{n}" may combine several entries')
            if x.get('added') == today:
                need = ['mtype', 'read', 'pattern', 'drive', 'flip', 'mtier'] if kind == 'people' else ['identity', 'supports', 'motive', 'mtier']
                for k in need:
                    if not x.get(k):
                        errors.append(f'{kind}: new entry {x.get("id")} lacks {k}')
    return errors, warnings

if __name__ == '__main__':
    import sys
    directory = Path(sys.argv[1])
    collections = {name: {p.stem: json.loads(p.read_text()) for p in (directory / name).glob('*.json')}
                   for name in ['events', 'people', 'donors', 'issues', 'factions']}
    ids = set(Path(sys.argv[3]).read_text().splitlines()) if len(sys.argv) > 3 else None
    errors, warnings = validate(collections, sys.argv[2], ids)
    for warning in warnings:
        print('WARNING', warning)
    for error in errors:
        print('ERROR', error)
    print(f'{len(errors)} errors, {len(warnings)} warnings')
    sys.exit(bool(errors))

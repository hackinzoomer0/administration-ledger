#!/usr/bin/env python3
"""Ledger validator. Usage: python3 -I validate.py <db_dir> <today YYYY-MM-DD> [new_item_ids_file]
<db_dir> holds the ArtifactData out_dir layout: events/*.json, people/all.json, donors/all.json.
Run it on the documents AS YOU INTEND TO WRITE THEM. Exit code 1 = errors that must be fixed before writing.
"""
import json, glob, os, re, sys, difflib

db, today = sys.argv[1], sys.argv[2]
new_ids = set()
if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
    new_ids = set(x.strip() for x in open(sys.argv[3]) if x.strip())
errors, warnings = [], []
CODES = re.compile(r'\b(IRN|FED|SUC|MID|TAR|IMM|VEN|EPS|RUS)\b')
ISSUES = {'IRN', 'FED', 'SUC', 'AI', 'MID', 'TAR', 'IMM', 'VEN', 'EPS', 'RUS'}
FACTIONS = {'operation', 'maximalists', 'treasury', 'deal-capital', 'tech-right', 'vance', 'hawks',
            'pentagon', 'populist', 'dissenters', 'party'}
REQ = ['id', 'date', 'precision', 'issues', 'kind', 'actor', 'text', 'source', 'tier', 'weight',
       'rationale', 'added', 'by', 'fx', 'fxnote']

items, seen = [], {}
for f in sorted(glob.glob(os.path.join(db, 'events', '*.json'))):
    size = os.path.getsize(f)
    if size > 1024 * 1024:
        warnings.append(f'{os.path.basename(f)}: {size} bytes; consider splitting for readability')
    d = json.load(open(f))
    for it in d.get('items', []):
        items.append((os.path.basename(f), it))
        if it.get('id') in seen:
            errors.append(f"duplicate id {it.get('id')} in {seen[it['id']]} and {f}")
        seen[it.get('id')] = f

for doc, it in items:
    iid = it.get('id', '?')
    check = (not new_ids) or iid in new_ids
    if not check:
        continue
    for k in REQ:
        if k not in it:
            errors.append(f'{iid}: missing field {k}')
    if not re.fullmatch(r'\d{4}-\d{2}(-\d{2})?', str(it.get('date', ''))):
        errors.append(f'{iid}: bad date {it.get("date")}')
    elif it.get('date', '') > today and it.get('kind') != 'scheduled':
        errors.append(f'{iid}: dated in the future ({it["date"]}) but kind is not scheduled')
    bad = set(it.get('issues', [])) - ISSUES
    if bad:
        errors.append(f'{iid}: unknown issue codes {bad}')
    for f in list(it.get('by', [])) + list((it.get('fx') or {}).keys()):
        if f not in FACTIONS:
            errors.append(f'{iid}: unknown faction id {f}')
    for v in (it.get('fx') or {}).values():
        if v not in (1, -1):
            errors.append(f'{iid}: fx value {v} is not 1 or -1')
    w = it.get('weight', 0)
    if not isinstance(w, int) or not 0 <= w <= 5:
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
    f = os.path.join(db, kind, 'all.json')
    if not os.path.exists(f):
        continue
    size = os.path.getsize(f)
    if size > 1024 * 1024:
        warnings.append(f'{kind}/all: {size} bytes; consider splitting for readability')
    lst = json.load(open(f)).get('list', [])
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

for w in warnings:
    print('WARNING', w)
for e in errors:
    print('ERROR', e)
print(f'{len(errors)} errors, {len(warnings)} warnings')
sys.exit(1 if errors else 0)


# Additional manual review checks
# - Check that each new person profile has a specific tracked role. Check that legal case participants render from case context and that retained subject links resolve.
# - Check that representation and financial flows are described separately, with dated evidence for claimed influence.
# - Check that repeated or bundled episodes have one overall scoring record and that each credited dimension has evidence.
# - Check that report and relationship claims reflect the reviewed evidence and label legacy conclusions.

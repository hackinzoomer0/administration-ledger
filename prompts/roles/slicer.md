#!/usr/bin/env python3
"""Ledger slicer and duplicate finder. Usage:
  python3 -I slice.py <db_dir> <candidates.json> <out_dir> <today YYYY-MM-DD>
<db_dir> holds the ArtifactData out_dir layout (events/*.json, issues/*.json, meta/*.json,
factions/*.json, people/all.json, donors/all.json).
<candidates.json> = {"clusters":{"<name>":{"issues":[codes],"candidates":[{id,date,facts,url,...}]}}}
Writes <out_dir>/beliefs_<name>.json per cluster and <out_dir>/dupes.json, and prints sizes.
Each beliefs file holds ONLY what that analyst needs: events of the last 60 days (compact),
the issue docs, stances/holders/policy/motives for its issues, faction fields that analysts
edit (exact stored text, so old/new edits still match), and the people and donor entries
whose names appear in its candidates. Each candidate gets "possibleDuplicates": stored
event ids with the same URL or similar text (the analyst confirms or rejects each).
"""
import json, os, re, sys, datetime

STOP = set('the a an of to in on for and or with by at from as is are was were be has have had its it that this after over into about than more not new says said will would could us u.s'.split())

def toks(s):
    return {w for w in re.findall(r"[a-z0-9$%.]+", (s or '').lower()) if w not in STOP and len(w) > 2}

def load(p):
    with open(p) as f:
        return json.load(f)

def main():
    db, cpath, out, today = sys.argv[1:5]
    os.makedirs(out, exist_ok=True)
    cut = (datetime.date.fromisoformat(today) - datetime.timedelta(days=60)).isoformat()
    cands = load(cpath)['clusters']
    events = {}
    for f in os.listdir(os.path.join(db, 'events')):
        if f.endswith('.json'):
            events[f[:-5]] = load(os.path.join(db, 'events', f))['items']
    allitems = [(c, it) for c, items in events.items() for it in items]
    meta = {n: load(os.path.join(db, 'meta', n + '.json')) for n in ('stances', 'holders', 'policy', 'motives')
            if os.path.exists(os.path.join(db, 'meta', n + '.json'))}
    factions = {f[:-5]: load(os.path.join(db, 'factions', f)) for f in os.listdir(os.path.join(db, 'factions')) if f.endswith('.json')}
    people = load(os.path.join(db, 'people', 'all.json'))['list']
    donors = load(os.path.join(db, 'donors', 'all.json'))['list']
    dupes = {}
    for name, cl in cands.items():
        iss = cl['issues']
        text = ' '.join(json.dumps(c, ensure_ascii=False) for c in cl['candidates'])
        low = text.lower()
        # 3. duplicate finder (across ALL events docs, any date)
        for c in cl['candidates']:
            ct = toks(c.get('facts', '') + ' ' + c.get('headline', ''))
            hits = []
            cd = c.get('date') or today
            for doc, it in allitems:
                url = c.get('url') or ''
                blob = (it.get('source') or '') + ' ' + (it.get('url') or '')
                if url and len(url) > 25 and url in blob:
                    hits.append((9.0, doc, it['id'], it.get('date'), it.get('text', '')[:140]))
                    continue
                d = it.get('date') or ''
                try:
                    gap = abs((datetime.date.fromisoformat(d[:10]) - datetime.date.fromisoformat(cd[:10])).days)
                except ValueError:
                    gap = 99
                if gap > 14 or it.get('kind') == 'scheduled':
                    continue
                st = toks(it.get('text', '') + ' ' + it.get('context', ''))
                if len(st) < 6 or not ct:
                    continue
                ov = len(ct & st)
                score = ov / min(len(ct), len(st))
                if ov >= 5 and score >= 0.25:
                    hits.append((round(ov + score, 2), doc, it['id'], it.get('date'), it.get('text', '')[:140]))
            hits.sort(reverse=True)
            c['possibleDuplicates'] = [{'score': h[0], 'doc': h[1], 'id': h[2], 'date': h[3], 'text': h[4]} for h in hits[:4]]
            dupes[c['id']] = [h[2] for h in hits[:4]]
        # 1. slices
        ev = []
        for doc, it in allitems:
            if (doc in iss or set(it.get('issues', [])) & set(iss)) and (it.get('date', '') >= cut or it.get('kind') == 'scheduled'):
                ev.append({k: it.get(k) for k in ('id', 'date', 'kind', 'weight', 'tier', 'actor', 'text', 'by', 'fx', 'fxnote') if k in it}
                          | {'doc': doc, 'mergedFromIds': [m.get('id') for m in it.get('mergedFrom', [])]})
        fac = {}
        for fid, f in factions.items():
            fac[fid] = {k: f.get(k) for k in ('name', 'short', 'wants', 'gained', 'lost', 'win', 'blunder', 'cause', 'did', 'weak')}
            fac[fid]['positions'] = {i: f.get('positions', {}).get(i) for i in iss if f.get('positions', {}).get(i)}
            fac[fid]['members'] = [r[:2] for r in f.get('members', [])[1:] if r]
        def named(e):
            nm = e.get('name', '')
            last = nm.split()[-1].lower() if nm.split() else ''
            return (nm and nm.lower() in low) or (len(last) > 3 and re.search(r'\b' + re.escape(last) + r'\b', low))
        sl = {
            'cluster': name, 'issues': iss, 'today': today,
            'candidates': cl['candidates'],
            'events': sorted(ev, key=lambda x: x.get('date', '')),
            'issuesDocs': {i: load(os.path.join(db, 'issues', i + '.json')) for i in iss if os.path.exists(os.path.join(db, 'issues', i + '.json'))},
            'stances': {i: meta.get('stances', {}).get('stances', {}).get(i) for i in iss},
            'holders': {i: meta.get('holders', {}).get(i) for i in iss},
            'policy': {i: meta.get('policy', {}).get(i) for i in iss},
            'motives': {i: meta.get('motives', {}).get('issues', {}).get(i) for i in iss},
            'factions': fac,
            'people': [p for p in people if named(p)],
            'donors': [d for d in donors if named(d)],
            'peopleIndex': [[p['id'], p.get('name')] for p in people],
            'donorIndex': [[d['id'], d.get('name')] for d in donors],
        }
        p = os.path.join(out, f'beliefs_{name}.json')
        with open(p, 'w') as f:
            json.dump(sl, f, ensure_ascii=False)
        print(name, os.path.getsize(p), 'bytes;', len(ev), 'events;', len(sl['people']), 'people;', len(sl['donors']), 'donors')
    with open(os.path.join(out, 'dupes.json'), 'w') as f:
        json.dump(dupes, f)
    print('possible duplicates:', sum(1 for v in dupes.values() if v), 'of', len(dupes))

if __name__ == '__main__':
    main()

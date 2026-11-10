"""Validate case forecasts, immutable history and evidence-linked political momentum."""
from datetime import date, datetime
from math import isfinite
from urllib.parse import urlsplit


def fail(message):
    raise ValueError('Impeachments: ' + message)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        fail('missing ' + label)


def ids(rows, label):
    if not isinstance(rows, list) or any(not isinstance(r, dict) or not r.get('id') for r in rows):
        fail('invalid ' + label)
    values = [r['id'] for r in rows]
    if len(values) != len(set(values)):
        fail('duplicate ' + label)
    return set(values)


def day(value):
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        fail('invalid date')


def instant(value):
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if result.tzinfo is None:
            fail('review time needs a timezone')
        return result
    except (ValueError, TypeError, AttributeError):
        fail('invalid review time')


def validate(after, before=None, section='Integrity'):
    collections = after['collections']
    documents = collections.get('impeachments', {})
    if set(documents) != {'all'}:
        fail('requires the all document')
    doc = documents['all']
    if doc.get('schema_version') != 1 or doc.get('methodology', {}).get('id') != 'impeachment_judgment_v1':
        fail('unknown method')
    for field in ['target', 'limits', 'arithmetic', 'momentum_rule', 'departure_rule', 'cadence']:
        text(doc['methodology'].get(field), field)
    sources = ids(doc.get('sources'), 'sources')
    cases = ids(doc.get('cases'), 'cases')
    people = {p['id'] for p in collections['people']['all']['list']}
    events = {e['id'] for group in collections['events'].values() for e in group['items']}

    def refs(row, require=False):
        for key, known in [('source_ids', sources), ('event_ids', events)]:
            values = row.get(key)
            if not isinstance(values, list) or any(not isinstance(v, str) for v in values) or not set(values) <= known:
                fail('unresolved ' + key)
        if require and not (row['source_ids'] or row['event_ids']):
            fail('an observed outcome requires evidence')

    for row in doc['sources']:
        text(row.get('title'), 'source title')
        try:
            url = urlsplit(row.get('url', ''))
            if url.scheme not in {'http', 'https'} or not url.netloc:
                fail('unsafe source URL')
        except ValueError:
            fail('unsafe source URL')
        day(row.get('accessed_on'))
        if row.get('publication_date') is not None:
            day(row['publication_date'])
        text(row.get('limitation'), 'source limitation')
    for row in doc['cases']:
        if row.get('person_id') is not None and row['person_id'] not in people:
            fail('unknown person')
        for field in ['name', 'office', 'title', 'allegations', 'defense', 'watch']:
            text(row.get(field), field)
        if row.get('eligibility') not in {'eligible', 'unresolved', 'ineligible'}:
            fail('invalid office eligibility')
        if row.get('tenure') not in {'in_office', 'left_relevant_office', 'unverified'}:
            fail('invalid tenure')
        refs(row)

    proceedings = ids(doc.get('proceedings'), 'proceedings')
    by_proceeding = {p['id']: p for p in doc['proceedings']}
    superseded = set()
    for row in doc['proceedings']:
        if row.get('case_id') not in cases or row.get('kind') not in {
            'inquiry', 'articles_introduced', 'procedural_vote', 'house_impeachment',
            'senate_conviction', 'senate_acquittal', 'dismissed', 'departure', 'correction',
        }:
            fail('invalid proceeding')
        day(row.get('date')); text(row.get('summary'), 'proceeding summary'); refs(row, True)
        old = row.get('supersedes')
        if old:
            prior = by_proceeding.get(old)
            if not prior or old == row['id'] or prior['case_id'] != row['case_id'] or old in superseded or day(prior['date']) > day(row['date']):
                fail('invalid proceeding correction')
            # Corrections must follow their originals in the append-only register.
            if list(by_proceeding).index(old) >= list(by_proceeding).index(row['id']):
                fail('correction precedes original')
            superseded.add(old)

    observations = ids(doc.get('momentum_observations'), 'momentum observations')
    for row in doc['momentum_observations']:
        day(row.get('date')); refs(row, True)
        for key in ['assessment', 'countercase', 'political_response', 'coalition', 'scope']:
            text(row.get(key), key)
        if row.get('kind') not in {'conviction', 'impeachment', 'backlash', 'coalition', 'other'}:
            fail('invalid momentum kind')
        linked = row.get('proceeding_ids')
        if not isinstance(linked, list) or not set(linked) <= proceedings:
            fail('invalid momentum proceeding link')
        if row['kind'] in {'conviction', 'impeachment'}:
            expected = 'senate_conviction' if row['kind'] == 'conviction' else 'house_impeachment'
            if not any(by_proceeding[p]['kind'] == expected and day(by_proceeding[p]['date']) <= day(row['date']) for p in linked):
                fail('momentum cannot label a procedural vote a conviction or impeachment')

    history = doc.get('history')
    ids(history, 'history')
    if not history:
        fail('missing forecast history')
    previous_time = None
    for snapshot in history:
        when = instant(snapshot.get('as_of'))
        if previous_time and when <= previous_time:
            fail('history must advance chronologically')
        previous_time = when
        if day(snapshot.get('deadline')) < when.date():
            fail('forecast deadline precedes issuance')
        if snapshot.get('run_id') not in collections['runs']:
            fail('unknown review run')
        if snapshot.get('type') not in {'pilot', 'baseline', 'daily', 'weekly', 'material_update'}:
            fail('invalid review type')
        text(snapshot.get('summary'), 'review summary'); text(snapshot.get('coverage'), 'review coverage')
        context = snapshot.get('context', {})
        if context.get('state') not in {'unverified', 'no_conviction', 'isolated_conviction', 'normalization', 'backlash', 'mixed'}:
            fail('invalid momentum state')
        text(context.get('assessment'), 'shared momentum assessment'); refs(context)
        linked = context.get('observation_ids')
        if not isinstance(linked, list) or not set(linked) <= observations:
            fail('invalid context observations')
        if context['state'] in {'isolated_conviction', 'normalization'}:
            observed = [r for r in doc['momentum_observations'] if r['id'] in linked]
            if not any(r['kind'] == 'conviction' for r in observed):
                fail('observed conviction state requires a conviction observation')
        if any(day(r['date']) > when.date() for r in doc['momentum_observations'] if r['id'] in linked):
            fail('future momentum evidence in historical snapshot')
        paths = context.get('pathways', [])
        if ids(paths, 'momentum pathways') != {'normalization', 'exception', 'backlash'}:
            fail('consider normalization, exception and backlash pathways')
        for path in paths:
            text(path.get('title'), 'pathway title'); text(path.get('assessment'), 'pathway assessment')
        forecasts = snapshot.get('forecasts', {})
        if not forecasts or not set(forecasts) <= cases:
            fail('unknown forecast case')
        for ident, forecast in forecasts.items():
            outcomes = forecast.get('outcomes', {})
            if any(outcomes.get(k) not in {'pending', 'occurred'} for k in ['house', 'conviction']):
                fail('invalid outcome status')
            outcome_ids = outcomes.get('proceeding_ids')
            if not isinstance(outcome_ids, list) or not set(outcome_ids) <= proceedings:
                fail('unresolved outcome proceedings')
            for key, expected in [('house', 'house_impeachment'), ('conviction', 'senate_conviction')]:
                if outcomes[key] == 'occurred' and not any(
                    by_proceeding[p]['kind'] == expected and by_proceeding[p]['case_id'] == ident
                    and day(by_proceeding[p]['date']) <= when.date() for p in outcome_ids
                ):
                    fail('resolved outcome requires its case-specific proceeding')
            if outcomes['conviction'] == 'occurred' and outcomes['house'] != 'occurred':
                fail('conviction requires House impeachment')
            text(forecast.get('reason'), 'case forecast reason')
            if forecast.get('confidence') not in {'low', 'medium', 'high'}:
                fail('invalid confidence')
            basis = forecast.get('basis', {})
            refs(basis)
            for field in ['allegations', 'defense', 'office', 'watch']:
                text(basis.get(field), 'historical ' + field)
            if basis.get('eligibility') not in {'eligible', 'unresolved', 'ineligible'}:
                fail('invalid historical eligibility')
            values = [forecast.get(k) for k in ['house_pct', 'conviction_given_impeachment_pct', 'joint_pct']]
            if all(v is None for v in values):
                if forecast.get('joint_range_pct') is not None:
                    fail('unestimated case cannot have a numerical range')
            else:
                if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) or not 0 <= v <= 100 for v in values):
                    fail('probabilities must be finite numbers from 0 to 100 or all null')
                if basis['eligibility'] != 'eligible':
                    fail('resolve office eligibility before assigning comparable odds')
                h, c, joint = values
                if outcomes['house'] == 'occurred' and h != 100 or outcomes['conviction'] == 'occurred' and (c != 100 or joint != 100):
                    fail('occurred outcomes must be resolved at 100, preserving earlier forecasts')
                if abs(round(h * c / 100, 2) - joint) > 0.005:
                    fail('joint probability must equal House times conditional Senate probability')
                bounds = forecast.get('joint_range_pct')
                if not isinstance(bounds, list) or len(bounds) != 2 or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) for v in bounds) or not 0 <= bounds[0] <= joint <= bounds[1] <= 100:
                    fail('invalid joint judgment range')
                refs(basis, True)
            effect = forecast.get('momentum', {})
            if effect.get('direction') not in {'up', 'down', 'hold', 'mixed', 'unquantified'}:
                fail('invalid case momentum direction')
            text(effect.get('assessment'), 'case momentum assessment')
            linked = effect.get('observation_ids')
            if not isinstance(linked, list) or not set(linked) <= set(context['observation_ids']):
                fail('case momentum must reference contemporaneous context observations')
            if effect['direction'] in {'up', 'down', 'mixed'} and not linked:
                fail('changed momentum requires observed evidence')
            if all(v is None for v in values) and any(outcomes[k] == 'occurred' for k in ['house', 'conviction']):
                fail('an occurred outcome cannot remain unestimated')
    if set(history[-1]['forecasts']) != cases:
        fail('latest review must cover every tracked case including watchlist')
    latest_date = instant(history[-1]['as_of']).date()
    if any(day(row['date']) > latest_date for row in doc['proceedings'] + doc['momentum_observations']):
        fail('outcomes cannot postdate the latest review')
    tests = ids(doc.get('tests'), 'dated tests')
    for row in doc['tests']:
        if row.get('case_id') is not None and row['case_id'] not in cases:
            fail('unknown test case')
        text(row.get('claim'), 'test claim'); refs(row)
        if row.get('status') not in {'pending', 'met', 'not_met', 'unresolved', 'retired'}:
            fail('invalid dated test status')
        if row['status'] != 'pending':
            text(row.get('resolution'), 'test resolution')
        if day(row.get('resolve_by')) < latest_date and row['status'] == 'pending':
            fail('due test needs an outcome or explicit unresolved explanation')

    if before:
        prior = before['collections'].get('impeachments', {}).get('all')
        if prior:
            if prior['methodology'] != doc['methodology']:
                fail('scheduled reviews cannot change the forecast method')
            for key in ['history', 'proceedings', 'momentum_observations', 'sources']:
                if doc[key][:len(prior[key])] != prior[key]:
                    fail(key + ' is append-only; record a correction instead')
            new_observations = {r['id'] for r in doc['momentum_observations'][len(prior['momentum_observations']):]}
            if new_observations:
                if not new_observations <= set(history[-1]['context']['observation_ids']):
                    fail('latest review must address new momentum observations')
                for forecast in history[-1]['forecasts'].values():
                    if not new_observations <= set(forecast['momentum']['observation_ids']):
                        fail('each case must explain its response or hold after a momentum observation')
            if not {r['id'] for r in prior['cases']} <= cases:
                fail('retain earlier cases on the watchlist')
            for old in prior['tests']:
                current = next((r for r in doc['tests'] if r['id'] == old['id']), None)
                if not current or any(current.get(k) != old.get(k) for k in ['claim', 'case_id', 'resolve_by']):
                    fail('preserve dated test claims/deadlines; retire with a reason and add a new ID')
            if section in {'Daily', 'Weekly'}:
                added = history[len(prior['history']):]
                run_id = collections['assessments']['current']['review']['run_id']
                if not added or added[-1]['run_id'] != run_id or added[-1]['type'] != section.lower():
                    fail('scheduled review requires a new linked impeachment review, including holds')
                if instant(added[-1]['as_of']).date() != day(collections['runs'][run_id]['date']):
                    fail('review date must match its run')
    return {'cases': len(cases), 'reviews': len(history), 'tests': len(tests)}

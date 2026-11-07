"""Integrity rules for the maintained, evidence-linked product assessment."""
from datetime import date

SUBSTANTIVE = {'daily_review', 'weekly_review', 'faction_consistency_review'}
STATUSES = {'pending', 'contested', 'strengthening', 'weakening', 'unchanged', 'not_reviewed'}


def validate(ledger):
    c = ledger['collections']
    current = c['assessments']['current']
    for key in ['research_as_of', 'last_substantive_change']:
        date.fromisoformat(current[key])
    if current['last_substantive_change'] > current['research_as_of']:
        raise ValueError('Substantive change cannot postdate research coverage')
    review = current['review']
    date.fromisoformat(review['date'])
    if review['run_id'] not in c['runs'] or not review['scope'].strip():
        raise ValueError('Current assessment needs a review record and scope')
    forecast = c['nominations']['republican_2028']
    sources = {row['id'] for row in forecast['sources']}
    events = {row['id'] for group in c['events'].values() for row in group['items']}
    nominees = [row['id'] for row in forecast['candidates']]
    rows = current['nomination']['candidates']
    if [row['candidate_id'] for row in rows] != nominees:
        raise ValueError('Assessment must cover exactly the authorized candidate roster')
    history = [row for row in forecast['tracking']['history'] if row.get('type') in SUBSTANTIVE]
    if not history or current['nomination']['snapshot_id'] != history[-1]['id']:
        raise ValueError('Assessment must reference the latest substantive forecast, not a technical snapshot')
    people = {row['id'] for row in c['people']['all']['list']}
    for row in rows:
        for key in ['path', 'coalition', 'advantage', 'vulnerability', 'positions', 'money']:
            if not row[key].strip():
                raise ValueError(f'Missing candidate assessment field: {key}')
        if row.get('person_id') and row['person_id'] not in people:
            raise ValueError('Unresolved candidate/person link')
    contests = current['administration']['contests']
    ids = [row['id'] for row in contests]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate power contest identifier')
    for row in contests:
        if row['status'] not in STATUSES or row['issue_id'] not in c['issues']:
            raise ValueError('Invalid assessment status or issue')
        for key in ['assessment', 'summary', 'authority', 'leverage', 'change', 'watch']:
            if not row[key].strip():
                raise ValueError(f'Missing power assessment field: {key}')
        if set(row['basis']) != {'actions', 'positions', 'money'} or not all(row['basis'].values()):
            raise ValueError('Power assessments must distinguish actions, positions and money')
    for row in rows + contests:
        date.fromisoformat(row['reviewed_at'])
        if row['reviewed_at'] > current['research_as_of']:
            raise ValueError('Claim review postdates declared research coverage')
    for row in current['relationships']:
        if row['source'] not in c['factions'] or row['target'] not in c['factions']:
            raise ValueError('Unresolved relationship endpoint')
        if not set(row['issues']) <= c['issues'].keys():
            raise ValueError('Unknown relationship issue')
    policies = c['assessments']['issues']
    if set(policies) != set(c['issues']):
        raise ValueError('Every issue requires a current policy assessment')
    for code, policy in policies.items():
        if not policy['policy'].strip() or not policy['dispute'].strip():
            raise ValueError('Missing policy or factional dispute assessment')
        if not set(policy['player_ids']) <= people:
            raise ValueError('Unresolved issue player')
        if not set(policy['event_ids']) <= events:
            raise ValueError('Unresolved policy evidence')
        for stance in policy['factions']:
            if stance['faction_id'] not in c['factions'] or not stance['position'].strip():
                raise ValueError('Missing structured faction position')
    for shift in current.get('power_shifts', []):
        if shift['faction_id'] not in c['factions'] or any(type(shift[k]) is not int or not 0 <= shift[k] <= 5 for k in ['before', 'after']):
            raise ValueError('Invalid role leverage scenario')
    if current.get('power_shifts') and not all(current['power_method'].get(k) for k in ['scale', 'status', 'condition', 'policy_projection', 'event_ids']):
        raise ValueError('Numerical scenarios require a scale, assumptions and evidence')
    def references(value):
        if isinstance(value, dict):
            if 'event_ids' in value or 'source_ids' in value:
                if not set(value.get('event_ids', [])) <= events or not set(value.get('source_ids', [])) <= sources:
                    raise ValueError('Unresolved assessment evidence reference')
                if not value.get('event_ids') and not value.get('source_ids') and value.get('status') != 'not_reviewed':
                    raise ValueError('Assessment claims require evidence or an explicit unreviewed record')
            if 'faction_ids' in value and not set(value['faction_ids']) <= c['factions'].keys():
                raise ValueError('Unresolved assessment faction')
            for item in value.values():
                references(item)
        elif isinstance(value, list):
            for item in value:
                references(item)
    references(current)


def validate_review(before, after, section):
    validate(after)
    if section == 'Daily':
        previous = before['collections']['assessments']['current']['review']
        current = after['collections']['assessments']['current']['review']
        if current == previous or current['type'] != 'daily_review':
            raise ValueError('Daily review must explicitly reassess the current product assessment, including holds and gaps')
        if current['run_id'] in before['collections']['runs']:
            raise ValueError('Daily assessment must reference this run, not an older review')

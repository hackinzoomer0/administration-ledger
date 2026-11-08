"""Validate the nominee forecast before any publication or ledger application."""
import datetime
import json
import math
import sys
from pathlib import Path

KEY = "republican_2028"


def validate(before, after, section):
    old = before['collections']['nominations'][KEY]
    new = after['collections']['nominations'][KEY]
    for key in ('roster_authorization', 'forecast_methodology'):
        if new[key] != old[key]:
            raise ValueError(f'Nominee {key} requires an explicit owner-authorized workflow change')
    authorized = old['roster_authorization']['candidates']
    roster = [{'id': row['id'], 'name': row['name']} for row in new['candidates']]
    if roster != authorized or new['scope']['candidates'] != [r['name'] for r in authorized]:
        raise ValueError('Unauthorized nominee roster change')
    names = [r['id'] for r in authorized]
    def probabilities(rows):
        if set(rows) != set(names):
            raise ValueError('Forecast must cover exactly the authorized roster')
        values = list(rows.values())
        if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 100 for v in values):
            raise ValueError('Invalid nomination likelihood')
        if abs(sum(values) - 100) > 0.011:
            raise ValueError('Conditional nomination likelihoods must sum to 100')
    current = {r['id']: r['nomination_likelihood_pct'] for r in new['candidates']}
    probabilities(current)
    for row in new['candidates']:
        if not row.get('forecast_rationale', '').strip():
            raise ValueError('Every nominee needs a forecast rationale')
    previous_history = old['tracking']['history']
    history = new['tracking']['history']
    if history[:len(previous_history)] != previous_history:
        raise ValueError('Nominee history must be append-only')
    added = history[len(previous_history):]
    if section in ('Daily', 'Weekly') and not added:
        raise ValueError(f'{section} review must record a nominee snapshot, including unchanged estimates')
    if new != old and not added:
        raise ValueError('Nominee changes require an auditable snapshot')
    if added and section in ('Daily', 'Weekly') and added[-1].get('type') != ('daily_review' if section == 'Daily' else 'weekly_review'):
        raise ValueError('Scheduled nominee snapshot must match the review type')
    sources = {r['id'] for r in new['sources']}
    if len(sources) != len(new['sources']):
        raise ValueError('Duplicate nominee source IDs')
    events = {r['id'] for group in after['collections']['events'].values() for r in group['items']}
    factions = set(after['collections']['factions'])
    prior = {r['id']: r['nomination_likelihood_pct'] for r in old['candidates']}
    seen = {r['id'] for r in previous_history}
    from wargame import effective_game, validate_case_review, validate_comparison_review
    previous_game, full_id = effective_game(previous_history) if old['forecast_methodology'].get('version') == 'scenario_wargame_v1' else (None, None)
    processed = list(previous_history)
    for entry in added:
        if entry['id'] in seen:
            raise ValueError('Duplicate nominee snapshot ID')
        seen.add(entry['id'])
        datetime.date.fromisoformat(entry['date'])
        if entry['run_id'] not in after['collections']['runs']:
            raise ValueError('Nominee snapshot must link to a run log')
        if entry.get('comparison') == 'not_comparable_roster_change':
            raise ValueError('Scheduled reviews cannot establish a new roster baseline')
        probabilities(entry['probabilities_pct'])
        if set(entry['assessments']) != set(names):
            raise ValueError('Snapshot must assess every nominee')
        for candidate, assessment in entry['assessments'].items():
            delta = entry['probabilities_pct'][candidate] - prior[candidate]
            if abs(assessment['delta_pp'] - delta) > 0.011:
                raise ValueError('Incorrect nominee percentage-point delta')
            if not assessment['reason'].strip():
                raise ValueError('Explain changed and unchanged nominee estimates')
            if assessment['review_status'] not in ('reviewed', 'partial', 'unreviewed'):
                raise ValueError('Invalid nominee coverage status')
            if delta and assessment['review_status'] == 'unreviewed':
                raise ValueError('Cannot change an unreviewed nominee estimate')
            if not set(assessment['source_ids']) <= sources or not set(assessment['event_ids']) <= events:
                raise ValueError('Unresolved nominee evidence reference')
            if delta and not assessment['source_ids'] and not assessment['event_ids']:
                raise ValueError('Nominee probability changes require evidence references')
            for link in assessment['faction_links']:
                if link['faction_id'] not in factions or not link['mechanism'].strip():
                    raise ValueError('Faction links need a known faction and a concrete mechanism')
                if link['direction'] not in ('faction_to_nominee', 'nominee_to_faction', 'both'):
                    raise ValueError('Invalid faction/nominee link direction')
                if not set(link['event_ids']) <= events or not set(link['source_ids']) <= sources:
                    raise ValueError('Unresolved faction/nominee link evidence')
                if not link['event_ids'] and not link['source_ids']:
                    raise ValueError('Faction/nominee links require evidence')
        if new['forecast_methodology'].get('version') == 'scenario_wargame_v1':
            from wargame import validate_game, forecast
            if entry.get('type') == 'daily_review':
                if 'wargame' in entry or entry.get('wargame_ref') != full_id:
                    raise ValueError('Daily review uses a reference to the latest full wargame, not a full rerun')
                monitor = entry.get('monitoring', {})
                if not monitor.get('summary', '').strip() or not isinstance(monitor.get('developments'), list) or not isinstance(monitor.get('prediction_updates'), list):
                    raise ValueError('Daily monitoring needs a summary, developments and prediction updates')
                seen_tests = set()
                for update in monitor['prediction_updates']:
                    if update.get('id') in seen_tests or update.get('status') not in {'supported', 'contradicted', 'unresolved'} or not update.get('resolution', '').strip():
                        raise ValueError('Invalid monitored prediction update')
                    seen_tests.add(update.get('id'))
                    if not update.get('source_ids') and not update.get('event_ids') or not set(update.get('source_ids', [])) <= sources or not set(update.get('event_ids', [])) <= events:
                        raise ValueError('Monitoring updates require resolved evidence')
                for development in monitor['developments']:
                    if not all(development.get(key, '').strip() for key in ['finding', 'implication', 'weekly_question']):
                        raise ValueError('Daily developments must queue a weekly question')
                    if not development.get('source_ids') and not development.get('event_ids') or not set(development.get('source_ids', [])) <= sources or not set(development.get('event_ids', [])) <= events:
                        raise ValueError('Monitored developments require resolved evidence')
                if entry['probabilities_pct'] != prior:
                    raise ValueError('Daily monitoring holds odds until the weekly wargame')
            else:
                game = entry.get('wargame')
                if not isinstance(game, dict):
                    raise ValueError('Weekly snapshot requires an adjudicated wargame, including holds')
                if previous_game:
                    validate_case_review(game, previous_game)
            processed.append(entry)
            game, full_id = effective_game(processed)
            validate_game(game, names, sources, events, entry['date'])
            if entry.get('type') == 'weekly_review':
                validate_comparison_review(game, names, sources, events)
                from wargame import validate_projection_review
                validate_projection_review(game, names, sources, events)
            previous_game = game
            if forecast(game, names) != entry['probabilities_pct']:
                raise ValueError('Nominee estimates must reproduce the scenario mixture')
        if not entry['summary'].strip() or not isinstance(entry['gaps'], list):
            raise ValueError('Snapshot requires a summary and coverage gaps')
        prior = entry['probabilities_pct']
    if new['forecast_methodology'].get('version') == 'scenario_wargame_v1':
        from wargame import validate_game, forecast
        game, game_id = effective_game(history)
        validate_game(game, names, sources, events, new['as_of_date'])
        if next(row for row in history if row['id'] == game_id).get('type') == 'weekly_review':
            validate_comparison_review(game, names, sources, events)
        if forecast(game, names) != current:
            raise ValueError('Current forecast must reproduce the scenario mixture')
    latest = history[-1]
    if latest.get('comparison') == 'not_comparable_roster_change':
        if len(history) < 2 or latest.get('roster_ids') != names or set(latest.get('previous_roster_ids', [])) == set(names):
            raise ValueError('Roster baseline must identify its different previous field')
        previous = history[-2]['probabilities_pct']
        if latest.get('previous_probabilities_pct') != previous or set(latest.get('previous_roster_ids', [])) != set(previous):
            raise ValueError('Roster baseline must preserve the previous denominator and estimates')
        if any(row.get('delta_pp') is not None for row in latest['assessments'].values()):
            raise ValueError('Cross-roster estimates cannot claim comparable percentage-point changes')
    if history[-1]['probabilities_pct'] != current:
        raise ValueError('Latest nominee snapshot and current forecast disagree')
    if history[-1]['date'] != new['as_of_date']:
        raise ValueError('Nominee as-of date and latest snapshot disagree')


if __name__ == '__main__':
    before, after = (json.loads(Path(p).read_text()) for p in sys.argv[1:3])
    validate(before, after, sys.argv[3])
    print('Nominee roster, probabilities, history and evidence references validated.')

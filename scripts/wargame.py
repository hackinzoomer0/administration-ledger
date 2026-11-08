"""Reproduce and check the analyst's conditional scenario mixture; no fitted probabilities."""
import json
import math
from decimal import Decimal, ROUND_FLOOR
from pathlib import Path
import sys

MODEL = 'scenario_wargame_v1'
JUDGMENTS = {'election_verdict', 'responsibility', 'appeal_and_durability', 'democratic_power', 'oversight_findings', 'loyalty_dilemma'}


def distribution(values, names, label):
    if set(values) != set(names) or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 100 for v in values.values()):
        raise ValueError(f'Invalid {label} distribution')
    if abs(sum(values.values()) - 100) > 0.00001:
        raise ValueError(f'{label} distribution must sum to 100')


def forecast(game, names):
    """Largest-remainder rounding preserves 100.00 without giving the last candidate the residual."""
    exact = {name: sum(Decimal(str(s['weight_pct'])) * Decimal(str(s['shares_pct'][name])) / 100 for s in game['scenarios']) for name in names}
    cents = {name: (value * 100).to_integral_value(rounding=ROUND_FLOOR) for name, value in exact.items()}
    remaining = int(10000 - sum(cents.values()))
    order = sorted(names, key=lambda name: (-(exact[name] * 100 - cents[name]), name))
    for name in order[:remaining]:
        cents[name] += 1
    return {name: float(value / 100) for name, value in cents.items()}


def sensitivity(game, names):
    """Move ten points of scenario weight between any two branches, not a confidence interval."""
    shifts = {name: [] for name in names}
    for donor in game['scenarios']:
        for recipient in game['scenarios']:
            if donor['id'] == recipient['id'] or donor['weight_pct'] < 10:
                continue
            for name in names:
                shifts[name].append(round((recipient['shares_pct'][name] - donor['shares_pct'][name]) / 10, 2))
    return {name: {'min_delta_pp': min([0] + values), 'max_delta_pp': max([0] + values)} for name, values in shifts.items()}


def validate_game(game, names, sources, events, as_of=None):
    if game.get('model_version') != MODEL:
        raise ValueError('Unsupported wargame model')
    for key in ['target', 'horizon', 'summary', 'debate_mode', 'partition_rule', 'field_risk', 'weighting_note']:
        if not isinstance(game.get(key), str) or not game[key].strip():
            raise ValueError(f'Wargame requires {key}')
    def evidence(row):
        if not row.get('source_ids') and not row.get('event_ids'):
            raise ValueError('Wargame judgments require evidence')
        if not set(row.get('source_ids', [])) <= sources or not set(row.get('event_ids', [])) <= events:
            raise ValueError('Unresolved wargame evidence')
    if set(game.get('judgments', {})) != JUDGMENTS:
        raise ValueError('Wargame must adjudicate every strategic question')
    for row in game['judgments'].values():
        if not all(row.get(k, '').strip() for k in ['finding', 'countercase', 'resolution']):
            raise ValueError('Strategic judgments need a finding, countercase and resolution')
        evidence(row)
    scenarios = game.get('scenarios', [])
    if len(scenarios) < 3 or len({s['id'] for s in scenarios}) != len(scenarios):
        raise ValueError('Wargame needs distinct competing scenarios')
    distribution({s['id']: s['weight_pct'] for s in scenarios}, [s['id'] for s in scenarios], 'Scenario weights')
    for row in scenarios:
        if not all(row.get(k, '').strip() for k in ['name', 'definition', 'weight_reason', 'sequence', 'falsifier']):
            raise ValueError('Scenario needs a causal sequence, weight rationale and falsifier')
        distribution(row['shares_pct'], names, 'Scenario candidate shares')
        if set(row.get('candidate_reasoning', {})) != set(names) or not all(row['candidate_reasoning'].values()):
            raise ValueError('Every scenario must reason through every candidate')
        evidence(row)
    if set(game.get('candidate_debates', {})) != set(names):
        raise ValueError('Wargame must challenge every candidate')
    for row in game['candidate_debates'].values():
        for key in ['best_case', 'failure_case', 'rebuttal', 'verdict', 'entry_assessment', 'next_move', 'rival_attack', 'durability_test']:
            if not row.get(key, '').strip():
                raise ValueError(f'Candidate wargame requires {key}')
        evidence(row)
    if not game.get('predictions'):
        raise ValueError('Wargame needs testable dated predictions')
    if len({row.get('id') for row in game['predictions']}) != len(game['predictions']) or any(not row.get('id') for row in game['predictions']):
        raise ValueError('Prediction IDs must be unique and stable')
    for row in game['predictions']:
        from datetime import date
        date.fromisoformat(row['resolve_by'])
        if row.get('status') not in {'pending', 'supported', 'contradicted', 'unresolved'} or not all(row.get(k, '').strip() for k in ['claim', 'test', 'likelihood', 'resolution']):
            raise ValueError('Predictions require observable tests, status and resolution')
        if as_of and row['resolve_by'] < as_of and row['status'] == 'pending':
            raise ValueError('Passed prediction deadlines must be assessed, or marked unresolved')
        evidence(row)




def effective_game(history):
    """Resolve the latest full game and apply small daily outcome updates, without copying it into every snapshot."""
    import copy
    game, full_id = None, None
    for entry in history:
        if isinstance(entry.get('wargame'), dict):
            game, full_id = copy.deepcopy(entry['wargame']), entry['id']
        elif 'wargame_ref' in entry:
            if game is None or entry['wargame_ref'] != full_id:
                raise ValueError('Daily monitoring must reference the latest full wargame')
            tests = {row['id']: row for row in game['predictions']}
            for update in entry.get('monitoring', {}).get('prediction_updates', []):
                if update['id'] not in tests:
                    raise ValueError('Unknown monitored prediction')
                tests[update['id']].update(status=update['status'], resolution=update['resolution'], source_ids=update.get('source_ids', []), event_ids=update.get('event_ids', []))
    if game is None:
        raise ValueError('No full wargame available')
    return game, full_id


def validate_case_review(game, previous):
    """Weekly review revisits which questions to ask, while preserving original predictions for audit."""
    audit = game.get('case_review', {})
    if not audit.get('summary', '').strip():
        raise ValueError('Weekly wargame needs a review of scenarios and test cases')
    for field, collection in [('scenarios', 'scenarios'), ('predictions', 'predictions')]:
        old = {row['id']: row for row in previous[collection]}
        new = {row['id']: row for row in game[collection]}
        reviews = audit.get(field, {})
        if set(reviews) != set(old):
            raise ValueError('Case review must address every previous scenario and prediction')
        additions = audit.get('new_' + field, {})
        if set(additions) != set(new) - set(old) or not all(isinstance(reason, str) and reason.strip() for reason in additions.values()):
            raise ValueError('New scenarios and predictions need explicit reasons')
        for id, review in reviews.items():
            decision = review.get('decision')
            if decision not in {'retained', 'revised', 'retired', 'replaced'} or not review.get('reason', '').strip():
                raise ValueError('Case review needs a disposition and reason')
            replacements = review.get('replacement_ids', [])
            if decision == 'replaced' and (not replacements or not set(replacements) <= set(new) - {id} or any(not new[key].get('active', True) for key in replacements if key in new)):
                raise ValueError('Replacement cases must resolve to new active cases')
            if collection == 'scenarios':
                if (decision in {'retired', 'replaced'}) == (id in new):
                    raise ValueError('Scenario retirement must match the new scenario set')
            else:
                if id not in new or any(new[id][key] != old[id][key] for key in ['claim', 'resolve_by', 'test']):
                    raise ValueError('Prior wargame predictions must retain their claims, tests and deadlines')
                if old[id].get('active', True) and not new[id].get('active', True) and decision not in {'retired', 'replaced'}:
                    raise ValueError('Prediction retirement must be acknowledged in the case review')
                if decision in {'retired', 'replaced'} and (new[id].get('active', True) or not new[id].get('retirement_reason', '').strip()):
                    raise ValueError('Retired predictions stay auditable with an explicit retirement reason')




def validate_projection_review(game, names, sources, events):
    """Check causal coverage for new weekly runs; historical forecasts remain unchanged."""
    review = game.get('projection_review', {})
    if review.get('standard') != 'causal_projection_v1':
        raise ValueError('Weekly forecast requires a causal projection review')

    def check(row, fields):
        for field in fields:
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f'Causal projection requires {field}')
        if not row.get('source_ids') and not row.get('event_ids'):
            raise ValueError('Causal projections require evidence for their factual starting points')
        if not set(row.get('source_ids', [])) <= sources or not set(row.get('event_ids', [])) <= events:
            raise ValueError('Unresolved causal-projection evidence')

    check(review.get('current_landscape', {}), ['assessment', 'as_of'])
    scenarios = review.get('scenarios', {})
    if set(scenarios) != {row['id'] for row in game['scenarios']}:
        raise ValueError('Causal projection must cover every scenario')
    for scenario in scenarios.values():
        check(scenario, ['projected_landscape', 'likelihood_reason'])
        paths = scenario.get('candidate_paths', {})
        if set(paths) != set(names):
            raise ValueError('Causal projection must cover every candidate within each scenario')
        for path in paths.values():
            check(path, ['candidate_response', 'voter_response', 'donor_media_response',
                         'organization_coalition', 'feedback', 'share_justification', 'countercase'])


def validate_comparison_review(game, names, sources, events):
    """Require common evidence standards without pretending prose validation establishes analytical truth."""
    review = game.get('comparison_review', {})
    if review.get('standard') != 'common_candidate_standards_v1' or not review.get('framing_check', '').strip():
        raise ValueError('Weekly forecast requires a common-standard candidate comparison')
    rows = review.get('candidates', {})
    if set(rows) != set(names):
        raise ValueError('Comparative review must cover every authorized candidate')
    def evidence(row):
        if not row.get('source_ids') and not row.get('event_ids'):
            raise ValueError('Candidate comparisons require evidence or sourced coverage limitations')
        if not set(row.get('source_ids', [])) <= sources or not set(row.get('event_ids', [])) <= events:
            raise ValueError('Unresolved comparative-review evidence')
    for name, row in rows.items():
        for key in ['entry_and_competitiveness', 'resources_now_and_mobilizable', 'coalition_conversion', 'liabilities_and_constituencies', 'uncertainty_accounting', 'range_justification']:
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f'Candidate comparison requires {key}')
        values = [scenario['shares_pct'][name] for scenario in game['scenarios'] if scenario['weight_pct'] > 0]
        if row.get('scenario_range_pct') != {'min': min(values), 'max': max(values)}:
            raise ValueError('Declared candidate range must match actual scenario shares')
        evidence(row)
    covered = set()
    for challenge in review.get('cross_candidate_challenges', []):
        ids = challenge.get('candidate_ids', [])
        if len(set(ids)) < 2 or not set(ids) <= set(names):
            raise ValueError('Comparative challenges need at least two known candidates')
        if not all(challenge.get(key, '').strip() for key in ['issue', 'countercase', 'resolution']):
            raise ValueError('Comparative challenges need an issue, countercase and resolution')
        evidence(challenge)
        covered.update(ids)
    if covered != set(names):
        raise ValueError('Every candidate needs a cross-candidate consistency challenge')


if __name__ == '__main__':
    doc = json.loads(Path(sys.argv[1]).read_text())
    game, full_id = effective_game(doc['tracking']['history'])
    names = [r['id'] for r in doc['candidates']]
    print(json.dumps({'probabilities_pct': forecast(game, names), 'ten_point_scenario_weight_sensitivity': sensitivity(game, names)}, indent=2))

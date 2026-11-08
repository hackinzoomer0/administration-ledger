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


if __name__ == '__main__':
    doc = json.loads(Path(sys.argv[1]).read_text())
    game = doc['tracking']['history'][-1]['wargame']
    names = [r['id'] for r in doc['candidates']]
    print(json.dumps({'probabilities_pct': forecast(game, names), 'ten_point_scenario_weight_sensitivity': sensitivity(game, names)}, indent=2))

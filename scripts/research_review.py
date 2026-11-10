"""Compact question priorities, explicit plausibility and rolling coverage accountability."""
from datetime import date

STANDARD = 'question_review_v1'
WEIGHTS = {'dominant', 'credible', 'limited', 'negligible', 'contradicted'}
STATUSES = {'answered', 'partial', 'blocked', 'deferred'}


def latest_review(ledger):
    runs = ledger['collections']['runs']
    candidates = [(key, row) for key, row in runs.items() if row.get('type') in {'daily_review', 'weekly_review'}]
    return sorted(candidates, key=lambda pair: (pair[1].get('date', ''), pair[0]))


def coverage_state(ledger):
    result = {code: None for code in ledger['collections']['issues']}
    for _, run in latest_review(ledger):
        for code, coverage in run.get('assessment_audit', {}).get('issue_coverage', {}).items():
            if code in result and coverage.get('status') == 'reviewed':
                checked = run.get('date')
                if checked and (result[code] is None or checked > result[code]):
                    result[code] = checked
    return result


def plan(ledger):
    reviews = latest_review(ledger)
    previous = next((row['research_review'] for _, row in reversed(reviews) if 'research_review' in row), {})
    import json
    from database import ROOT
    from urllib.parse import urlsplit
    health = []
    for path in sorted((ROOT / '.runtime/intake-cache').glob('*.json'), key=lambda path: path.stat().st_mtime, reverse=True)[:50]:
        receipt = json.loads(path.read_text())
        if receipt.get('kind') == 'source':
            health.append({'domain': urlsplit(receipt['value']).netloc, 'status': receipt['status'], 'last_attempt': receipt.get('recorded_at')})
    active = set()
    def linked(value):
        if isinstance(value, dict):
            active.update(value.get('event_ids', []))
            for item in value.values():
                linked(item)
        elif isinstance(value, list):
            for item in value:
                linked(item)
    linked(ledger['collections']['assessments'])
    missing = [row['id'] for group in ledger['collections']['events'].values() for row in group['items']
               if row['id'] in active and 'http' not in json.dumps(row)]
    impeachment = ledger['collections'].get('impeachments', {}).get('all', {})
    history = impeachment.get('history', [])
    return {'standard': STANDARD, 'recent_source_health': health[:20], 'active_event_traceability_gaps': missing,
            'personnel_review': {'document': 'impeachments/all',
                                'last_review': history[-1]['as_of'] if history else None,
                                'tests': impeachment.get('tests', []),
                                'instruction': 'Execute impeachment-review with shared intake; append a linked review, assess outcomes and shared momentum even for unrelated cases.'},
            'note': 'Missing inline URLs require targeted source recovery; this is not proof a claim is false.', 'last_verified_by_issue': coverage_state(ledger),
            'carried_priorities': [row for row in previous.get('priorities', ledger['collections']['meta'].get('research_questions', {}).get('priorities', [])) if row['status'] != 'answered'],
            'discovery_leads': ledger['collections']['meta'].get('audit', {}).get('unmatched', []),
            'instructions': 'Choose 1–5 consequential questions; review overdue gaps and do not reset verification dates for carried evidence.'}


def text(row, keys):
    if not all(isinstance(row.get(key), str) and row[key].strip() for key in keys):
        raise ValueError('Research review requires ' + ', '.join(keys))


def validate(before, after, section, receipts):
    current = after['collections']['assessments']['current']['review']
    run = after['collections']['runs'][current['run_id']]
    review = run.get('research_review', {})
    if review.get('standard') != STANDARD:
        raise ValueError('Review requires question_review_v1 research priorities and plausibility judgments')
    priorities = review.get('priorities', [])
    if not isinstance(priorities, list) or not 1 <= len(priorities) <= 5:
        raise ValueError('Choose 1–5 consequential research priorities, not another full matrix')
    ids = [row.get('id') for row in priorities]
    if any(not item for item in ids) or len(set(ids)) != len(ids):
        raise ValueError('Research priorities need unique stable IDs')
    receipt_ids = {row['id'] for row in receipts}
    public_receipts = review.get('source_receipts', [])
    if {row.get('id') for row in public_receipts} != receipt_ids:
        raise ValueError('Public evidence receipts must match actual staged attempts without runtime metadata')
    allowed_receipt_keys = {'id', 'kind', 'value', 'window', 'purpose', 'status', 'result', 'reporting_origin'}
    for receipt in public_receipts:
        if set(receipt) != allowed_receipt_keys:
            raise ValueError('Public source receipts require an explicit metadata-free field projection')
        actual = next(row for row in receipts if row['id'] == receipt['id'])
        if any(receipt[key] != actual.get(key) for key in allowed_receipt_keys):
            raise ValueError('Public source receipt differs from actual research attempt')
    for row in priorities:
        text(row, ['question', 'importance', 'current_answer', 'outcome', 'next_action'])
        if row.get('status') not in STATUSES or not row.get('affected_assessments'):
            raise ValueError('Research priorities need status and affected assessments')
        date.fromisoformat(row['next_check'])
        explanations = row.get('explanations', [])
        if not explanations:
            raise ValueError('Explicitly weigh the current explanation; do not invent an alternative to fill a quota')
        for explanation in explanations:
            text(explanation, ['explanation', 'reason', 'discriminating_observation'])
            if explanation.get('weight') not in WEIGHTS:
                raise ValueError('Explanations require explicit plausibility weights')
        if sum(item['weight'] == 'dominant' for item in explanations) > 1:
            raise ValueError('At most one dominant explanation; coexisting motives must be stated explicitly')
        for trigger in row.get('change_triggers', []):
            text(trigger, ['development', 'reason', 'assessment_effect'])
            if trigger.get('likelihood') not in {'low', 'moderate', 'high', 'unknown'} or trigger.get('impact') not in {'low', 'moderate', 'high'}:
                raise ValueError('Future changes need separate likelihood and impact judgments')
        if not row.get('change_triggers'):
            text(row, ['no_change_trigger_reason'])
        refs = row.get('source_receipt_ids', [])
        if not set(refs) <= receipt_ids or row['status'] in {'answered', 'partial', 'blocked'} and not refs:
            raise ValueError('Attempted priorities require actual source/query receipts; deferred work needs no invented evidence')
    dispositions = review.get('prior_dispositions', {})
    previous_priorities = plan(before)['carried_priorities'] if any('research_review' in run for _, run in latest_review(before)) else []
    for row in previous_priorities:
        if row['id'] not in ids and not dispositions.get(row['id'], '').strip():
            raise ValueError('Unanswered research priorities cannot disappear without a disposition')
    debt = review.get('coverage_debt', {})
    if set(debt) != set(after['collections']['issues']):
        raise ValueError('Rolling coverage debt must cover every issue')
    last = coverage_state(before)
    overdue = []
    for code, row in debt.items():
        text(row, ['next_action', 'reason'])
        if date.fromisoformat(row['next_check']) < date.fromisoformat(run['date']):
            raise ValueError('Coverage next_check cannot already be in the past')
        if not set(row.get('attempt_receipt_ids', [])) <= receipt_ids:
            raise ValueError('Coverage catch-up attempts require actual receipts')
        coverage = run['assessment_audit']['issue_coverage'][code]['status']
        expected = run['date'] if coverage == 'reviewed' else last[code]
        if row.get('last_verified') != expected:
            raise ValueError('Carried coverage cannot reset last_verified')
        if coverage != 'reviewed' and (expected is None or (date.fromisoformat(run['date']) - date.fromisoformat(expected)).days >= 7):
            text(row, ['escalation'])
            overdue.append(row)
    if overdue and receipts and not any(row.get('attempt_receipt_ids') for row in overdue):
        raise ValueError('Reserve an actual catch-up attempt for at least one overdue issue')
    if overdue and not receipts:
        text(review, ['catch_up_shortfall'])
    text(review, ['discovery_question', 'discovery_disposition', 'premise_reconciliation'])
    if section == 'Weekly':
        for key in ['omitted_mechanism', 'test_discrimination', 'implementation_counterparty', 'motive_alternatives', 'prediction_outcomes', 'candidate_share_sensitivity']:
            text(review, [key])
        recall = run.get('coverage', {}).get('recall', {})
        if recall:
            if recall.get('sampled') != len(recall.get('items', [])):
                raise ValueError('Recall sample count must match actual recorded headlines')
            if len(set(recall.get('indexesRead', []))) < 2 or recall['sampled'] < 15:
                text(review, ['recall_shortfall'])
        else:
            text(review, ['recall_shortfall'])

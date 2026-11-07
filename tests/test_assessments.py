import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from database import load
from validate_assessments import validate, validate_review

class AssessmentIntegrity(unittest.TestCase):
    def setUp(self):
        self.before = load()
        self.after = copy.deepcopy(self.before)
        self.current = self.after['collections']['assessments']['current']

    def test_technical_forecast_cannot_be_presented_as_latest_assessment(self):
        history = self.after['collections']['nominations']['republican_2028']['tracking']['history']
        self.current['nomination']['snapshot_id'] = history[-1]['id']
        with self.assertRaisesRegex(ValueError, 'substantive'):
            validate(self.after)

    def test_broken_evidence_is_rejected(self):
        self.current['administration']['contests'][0]['event_ids'] = ['invented-episode']
        with self.assertRaisesRegex(ValueError, 'evidence reference'):
            validate(self.after)

    def test_daily_review_cannot_skip_the_product_assessment(self):
        with self.assertRaisesRegex(ValueError, 'explicitly reassess'):
            validate_review(self.before, self.after, 'Daily')

    def test_authority_and_leverage_cannot_be_collapsed(self):
        self.current['administration']['contests'][0]['authority'] = ''
        with self.assertRaisesRegex(ValueError, 'authority'):
            validate(self.after)

    def test_assessment_cannot_add_an_outside_candidate(self):
        self.current['nomination']['candidates'].append({'candidate_id': 'outside'})
        with self.assertRaisesRegex(ValueError, 'roster'):
            validate(self.after)

    def test_missing_issue_policy_is_rejected(self):
        del self.after['collections']['assessments']['issues']['AI']
        with self.assertRaisesRegex(ValueError, 'Every issue'):
            validate(self.after)

    def test_role_scenario_cannot_exceed_explained_scale(self):
        self.current['power_shifts'][0]['after'] = 100
        with self.assertRaisesRegex(ValueError, 'role leverage'):
            validate(self.after)

    def test_weekly_cannot_reuse_the_daily_review_stamp(self):
        with self.assertRaisesRegex(ValueError, 'explicitly reassess'):
            validate_review(self.before, self.after, 'Weekly')

    def test_new_review_stamp_alone_does_not_establish_a_current_assessment(self):
        self.current['review'].update(run_id='audit-fixture', type='daily_review')
        self.after['collections']['runs']['audit-fixture'] = {}
        with self.assertRaisesRegex(ValueError, 'reality-first'):
            validate_review(self.before, self.after, 'Daily')

    def test_weekly_hold_still_requires_a_competing_interpretation(self):
        self.current['review'].update(run_id='weekly-audit-fixture', type='weekly_review')
        self.after['collections']['runs']['weekly-audit-fixture'] = {'assessment_audit': {
            'major_developments': [], 'dated_assumptions': [], 'challenges': [],
            'summary_changed': False, 'summary_reason': 'A justified hold.',
            'issue_coverage': {code: {'status': 'carried', 'reason': 'Prior evidence retained; no new verification in this fixture.'} for code in self.after['collections']['issues']}
        }}
        with self.assertRaisesRegex(ValueError, 'competing interpretation'):
            validate_review(self.before, self.after, 'Weekly')
        self.after['collections']['runs']['weekly-audit-fixture']['assessment_audit']['challenges'] = [{
            'alternative': 'An alternative causal explanation.', 'finding': 'Evidence remains insufficient.',
            'consequence': 'Retain the assessment and its stated uncertainty.'
        }]
        validate_review(self.before, self.after, 'Weekly')

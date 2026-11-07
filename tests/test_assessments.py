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

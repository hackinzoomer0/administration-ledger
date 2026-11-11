import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from database import load
from validate_impeachments import validate


class ImpeachmentTests(unittest.TestCase):
    def setUp(self):
        self.before = load()
        # The initial baseline is immutable; tests do not depend on later live outcomes.
        doc = self.before['collections']['impeachments']['all']
        end = next(i for i, r in enumerate(doc['history']) if r['id'] == 'impeachment-comparison-2026-11-10') + 1
        doc['history'] = doc['history'][:end]
        case_ids = set(doc['history'][-1]['forecasts'])
        doc['cases'] = [r for r in doc['cases'] if r['id'] in case_ids]
        doc['proceedings'] = [r for r in doc['proceedings'] if r['date'] <= '2026-11-10' and r['case_id'] in case_ids]
        doc['momentum_observations'] = []
        doc['tests'] = [r for r in doc['tests'] if r.get('case_id') is None or r['case_id'] in case_ids]
        self.after = copy.deepcopy(self.before)
        self.doc = self.after['collections']['impeachments']['all']

    def forecast(self):
        return self.doc['history'][-1]['forecasts']['noem']

    def new_review(self):
        row = copy.deepcopy(self.doc['history'][-1])
        row.update(id='fixture-review', as_of='2026-11-10T17:00:00Z', type='material_update')
        self.doc['history'].append(row)
        return row

    def conviction(self):
        review = self.new_review()
        for ident, kind in [('house-result', 'house_impeachment'), ('senate-result', 'senate_conviction')]:
            self.doc['proceedings'].append(dict(id=ident, kind=kind, case_id='noem', date='2026-11-10', summary='Synthetic test outcome only.', source_ids=['noem-referral'], event_ids=[], supersedes=None))
        self.doc['momentum_observations'].append(dict(id='first-conviction', date='2026-11-10', kind='conviction', assessment='Synthetic first conviction.', countercase='Could be exceptional.', political_response='Backlash remains uncertain.', coalition='Cross-party coalition in the fixture.', scope='Could affect unrelated cases.', proceeding_ids=['senate-result'], source_ids=['noem-referral'], event_ids=[]))
        review['context'].update(state='normalization', observation_ids=['first-conviction'])
        for forecast in review['forecasts'].values():
            forecast['momentum'].update(direction='hold', observation_ids=['first-conviction'], assessment='Reviewed the new outcome; this fixture holds with an explicit case response.')
        review['forecasts']['noem'].update(house_pct=100, conviction_given_impeachment_pct=100, joint_pct=100, joint_range_pct=[100, 100], outcomes=dict(house='occurred', conviction='occurred', proceeding_ids=['house-result', 'senate-result']))
        return review

    def test_current_database_and_joint_arithmetic(self):
        self.assertEqual(validate(self.after)['cases'], 9)
        self.forecast()['joint_pct'] = 25
        with self.assertRaisesRegex(ValueError, 'joint probability'):
            validate(self.after)

    def test_probabilities_are_finite_and_unestimated_is_not_zero(self):
        self.forecast()['house_pct'] = float('nan')
        with self.assertRaisesRegex(ValueError, 'finite'):
            validate(self.after)
        self.forecast()['house_pct'] = None
        with self.assertRaisesRegex(ValueError, 'all null'):
            validate(self.after)

    def test_references_and_office_eligibility_are_required(self):
        self.forecast()['basis']['source_ids'].append('missing-source')
        with self.assertRaisesRegex(ValueError, 'unresolved source_ids'):
            validate(self.after)
        self.forecast()['basis']['source_ids'].pop()
        self.forecast()['basis']['eligibility'] = 'unresolved'
        with self.assertRaisesRegex(ValueError, 'eligibility'):
            validate(self.after)

    def test_history_and_sources_cannot_be_rewritten(self):
        self.doc['history'][0]['summary'] = 'Rewritten history'
        with self.assertRaisesRegex(ValueError, 'append-only'):
            validate(self.after, self.before)
        self.doc['history'] = copy.deepcopy(self.before['collections']['impeachments']['all']['history'])
        self.doc['sources'][0]['url'] = 'https://example.org/replacement'
        with self.assertRaisesRegex(ValueError, 'append-only'):
            validate(self.after, self.before)

    def test_a_procedural_vote_cannot_become_conviction_momentum(self):
        self.conviction()
        self.doc['proceedings'][-1]['kind'] = 'procedural_vote'
        with self.assertRaisesRegex(ValueError, 'procedural vote'):
            validate(self.after, self.before)

    def test_first_conviction_requires_reassessment_of_unrelated_cases(self):
        review = self.conviction()
        self.assertEqual(validate(self.after, self.before)['reviews'], 3)
        review['forecasts']['hegseth']['momentum']['observation_ids'] = []
        with self.assertRaisesRegex(ValueError, 'each case'):
            validate(self.after, self.before)

    def test_resolved_conviction_cannot_remain_a_prediction(self):
        self.conviction()
        self.forecast()['house_pct'] = 45
        with self.assertRaisesRegex(ValueError, 'resolved at 100'):
            validate(self.after, self.before)

    def test_due_tests_and_original_deadlines_remain_auditable(self):
        original = dict(
            id='fixture-dated-test',
            case_id='hegseth',
            claim='Verify the House disposition in the test fixture.',
            resolve_by='2026-11-12',
            status='pending',
            resolution='',
            source_ids=[],
            event_ids=[],
        )
        self.before['collections']['impeachments']['all']['tests'].append(original)
        current = dict(original, resolve_by='2026-11-09')
        self.doc['tests'].append(current)
        with self.assertRaisesRegex(ValueError, 'due test'):
            validate(self.after)
        current.update(status='unresolved', resolution='The official result was unavailable in the fixture.')
        validate(self.after)
        with self.assertRaisesRegex(ValueError, 'claims/deadlines'):
            validate(self.after, self.before)

    def test_momentum_cannot_use_future_evidence(self):
        review = self.conviction()
        self.doc['momentum_observations'][-1]['date'] = '2026-11-11'
        with self.assertRaisesRegex(ValueError, 'future momentum'):
            validate(self.after, self.before)
        review['context']['state'] = 'unverified'

    def test_scheduled_hold_requires_new_run_link(self):
        with self.assertRaisesRegex(ValueError, 'new linked impeachment review'):
            validate(self.after, self.before, 'Daily')
        row = self.new_review()
        row.update(type='daily', run_id=self.after['collections']['assessments']['current']['review']['run_id'])
        self.after['collections']['runs'][row['run_id']]['date'] = '2026-11-10'
        validate(self.after, self.before, 'Daily')

    def test_proceeding_corrections_preserve_original(self):
        old = self.doc['proceedings'][0]
        self.doc['proceedings'].append(dict(old, id='correction', kind='correction', supersedes=old['id'], date='2026-11-10', summary='Corrected wording, preserving original milestone.'))
        self.new_review()
        validate(self.after, self.before)


if __name__ == '__main__':
    unittest.main()

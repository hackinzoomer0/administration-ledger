"""Exercise the scheduled forecast integrity boundary without network or ledger writes."""
import copy
import importlib.util
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from database import load
spec = importlib.util.spec_from_file_location('nominees', Path(__file__).resolve().parents[1] / 'scripts/validate_nominees.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ForecastGuard(unittest.TestCase):
    def setUp(self):
        self.before = load()
        self.after = copy.deepcopy(self.before)
        self.forecast = self.after['collections']['nominations']['republican_2028']
        self.entry = copy.deepcopy(self.forecast['tracking']['history'][-1])
        self.entry['id'] = 'guard-test'
        self.entry['type'] = 'weekly_review'
        self.section = 'Weekly'
        self.entry['wargame']['case_review'] = {
            'summary': 'Fixture reassessment of case design.',
            'scenarios': {r['id']: {'decision':'retained','reason':'Still distinguishes a plausible environment.','replacement_ids':[]} for r in self.entry['wargame']['scenarios']},
            'predictions': {r['id']: {'decision':'retained','reason':'Still tests the stated mechanism.','replacement_ids':[]} for r in self.entry['wargame']['predictions']},
            'new_scenarios': {}, 'new_predictions': {}
        }
        for assessment in self.entry['assessments'].values():
            assessment['delta_pp'] = 0
        self.forecast['tracking']['history'].append(self.entry)

    def check(self):
        module.validate(self.before, self.after, self.section)

    def daily(self):
        self.section = 'Daily'
        self.entry['type'] = 'daily_review'
        self.entry.pop('wargame')
        self.entry['wargame_ref'] = self.before['collections']['nominations']['republican_2028']['tracking']['history'][-1]['id']
        self.entry['monitoring'] = {'summary':'No material change; odds carried from full review.', 'developments':[], 'prediction_updates':[]}

    def test_daily_hold(self):
        self.daily()
        self.check()

    def test_reject_missing_daily_snapshot(self):
        self.daily()
        self.forecast['tracking']['history'].pop()
        with self.assertRaises(ValueError):
            self.check()

    def test_reject_unauthorized_addition_even_with_rewritten_authorization(self):
        self.forecast['candidates'].append({'id': 'outsider', 'name': 'Outside contender'})
        self.forecast['roster_authorization']['candidates'].append({'id': 'outsider', 'name': 'Outside contender'})
        with self.assertRaises(ValueError):
            self.check()

    def test_reject_bad_total(self):
        self.forecast['candidates'][0]['nomination_likelihood_pct'] += 1
        with self.assertRaises(ValueError):
            self.check()

    def test_reject_rewritten_history(self):
        self.forecast['tracking']['history'][0]['summary'] = 'changed'
        with self.assertRaises(ValueError):
            self.check()

    def test_reject_broken_reference(self):
        self.entry['assessments']['jd_vance']['event_ids'] = ['missing-event']
        with self.assertRaises(ValueError):
            self.check()

    def test_supported_probability_change(self):
        source = self.forecast['sources'][0]['id']
        from wargame import forecast
        game = self.entry['wargame']
        game['scenarios'][1]['shares_pct']['jd_vance'] += 5
        game['scenarios'][1]['shares_pct']['marco_rubio'] -= 5
        computed = forecast(game, [row['id'] for row in self.forecast['candidates']])
        for candidate in self.forecast['candidates']:
            cid = candidate['id']
            delta = round(computed[cid] - candidate['nomination_likelihood_pct'], 2)
            candidate['nomination_likelihood_pct'] = computed[cid]
            self.entry['probabilities_pct'][cid] = computed[cid]
            assessment = self.entry['assessments'][cid]
            assessment.update(delta_pp=delta, review_status='reviewed', source_ids=[source])
        self.check()
        self.entry['assessments']['jd_vance']['source_ids'] = []
        self.entry['assessments']['jd_vance']['event_ids'] = []
        with self.assertRaises(ValueError):
            self.check()

    def test_reject_unmodeled_probability_adjustment(self):
        for index, delta in [(0, 1), (1, -1)]:
            row = self.forecast['candidates'][index]
            row['nomination_likelihood_pct'] += delta
            self.entry['probabilities_pct'][row['id']] += delta
            self.entry['assessments'][row['id']]['delta_pp'] = delta
        with self.assertRaisesRegex(ValueError, 'scenario mixture'):
            self.check()

    def test_hold_requires_an_adjudicated_game(self):
        del self.entry['wargame']
        with self.assertRaisesRegex(ValueError, 'adjudicated wargame'):
            self.check()

    def test_reject_unchallenged_candidate(self):
        self.entry['wargame']['candidate_debates']['jd_vance']['rebuttal'] = ''
        with self.assertRaisesRegex(ValueError, 'rebuttal'):
            self.check()

    def test_reject_incoherent_scenario_weights(self):
        self.entry['wargame']['scenarios'][0]['weight_pct'] += 1
        with self.assertRaisesRegex(ValueError, 'sum to 100'):
            self.check()

    def test_reject_candidate_missing_from_scenario(self):
        del self.entry['wargame']['scenarios'][0]['shares_pct']['john_mcentee']
        with self.assertRaisesRegex(ValueError, 'candidate shares'):
            self.check()

    def test_reject_deleting_or_rewriting_a_prediction(self):
        self.entry['wargame']['predictions'].pop()
        with self.assertRaisesRegex(ValueError, 'Prior wargame predictions'):
            self.check()

    def test_past_deadline_needs_resolution_not_silent_carry(self):
        self.entry['date'] = self.forecast['as_of_date'] = '2027-05-01'
        with self.assertRaisesRegex(ValueError, 'Passed prediction'):
            self.check()

    def test_weekly_hold_requires_snapshot(self):
        self.forecast['tracking']['history'].pop()
        with self.assertRaisesRegex(ValueError, 'snapshot'):
            module.validate(self.before, self.after, 'Weekly')

    def test_methodology_remains_locked_during_scheduled_reviews(self):
        self.forecast['forecast_methodology']['version'] = 'different'
        with self.assertRaisesRegex(ValueError, 'owner-authorized'):
            self.check()

    def test_weekly_must_review_the_cases_not_just_outcomes(self):
        del self.entry['wargame']['case_review']
        with self.assertRaisesRegex(ValueError, 'scenarios and test cases'):
            self.check()

    def test_daily_cannot_rerun_the_full_game(self):
        self.entry['type'] = 'daily_review'
        self.section = 'Daily'
        with self.assertRaisesRegex(ValueError, 'not a full rerun'):
            self.check()

    def test_daily_cannot_change_odds(self):
        self.daily()
        for index, delta in [(0,1),(1,-1)]:
            row=self.forecast['candidates'][index]
            row['nomination_likelihood_pct'] += delta
            self.entry['probabilities_pct'][row['id']] += delta
            self.entry['assessments'][row['id']]['delta_pp'] = delta
        with self.assertRaisesRegex(ValueError, 'holds odds'):
            self.check()

    def test_daily_cannot_point_to_an_older_game(self):
        self.daily()
        self.entry['wargame_ref'] = 'older-game'
        with self.assertRaisesRegex(ValueError, 'latest full wargame'):
            self.check()

    def test_daily_updates_a_due_test_without_rewriting_the_forecast(self):
        self.daily()
        self.entry['date'] = self.forecast['as_of_date'] = '2027-02-02'
        original=self.before['collections']['nominations']['republican_2028']['tracking']['history'][-1]['wargame']['predictions'][0]
        self.entry['monitoring']['prediction_updates']=[{
            'id': original['id'], 'status':'unresolved', 'resolution':'Outcome not verified in this fixture; retain gap.',
            'source_ids':original['source_ids'], 'event_ids':original['event_ids']
        }]
        self.check()
        from wargame import effective_game
        game, _=effective_game(self.forecast['tracking']['history'])
        self.assertEqual(game['predictions'][0]['status'],'unresolved')
        self.assertEqual(original['status'],'pending')

    def test_new_scenario_requires_a_design_reason(self):
        game=self.entry['wargame']
        added=copy.deepcopy(game['scenarios'][0]);added['id']='new-world-development'
        added['weight_pct']=0
        game['scenarios'].append(added)
        with self.assertRaisesRegex(ValueError, 'New scenarios'):
            self.check()
        game['case_review']['new_scenarios'][added['id']]='A newly observed mechanism warrants a separate branch; no probability assigned in this fixture.'
        self.check()

    def test_retired_test_remains_in_the_audit_record(self):
        game=self.entry['wargame'];row=game['predictions'][0]
        game['case_review']['predictions'][row['id']]['decision']='retired'
        row['active']=False;row['retirement_reason']='The case no longer discriminates between explanations.'
        self.check()
        row.pop('retirement_reason')
        with self.assertRaisesRegex(ValueError, 'Retired predictions'):
            self.check()

    def test_weekly_can_replace_a_scenario_without_rewriting_history(self):
        game=self.entry['wargame'];old=game['scenarios'].pop(0)
        new=copy.deepcopy(old);new['id']='replacement-scenario';game['scenarios'].append(new)
        game['case_review']['scenarios'][old['id']]={'decision':'replaced','reason':'New mechanism better explains the same branch.','replacement_ids':[new['id']]}
        game['case_review']['new_scenarios'][new['id']]='New evidence changes the mechanism, not the mixture in this fixture.'
        self.check()
        self.assertEqual(self.before['collections']['nominations']['republican_2028']['tracking']['history'][-1]['wargame']['scenarios'][0]['id'],old['id'])

    def test_replacement_prediction_gets_a_new_id_and_old_question_survives(self):
        game=self.entry['wargame'];old=game['predictions'][0]
        new=copy.deepcopy(old);new['id']='better-question';new['claim']='A more discriminating prediction.'
        game['predictions'].append(new)
        old.update(active=False,retirement_reason='Original question was too broad.')
        game['case_review']['predictions'][old['id']]={'decision':'replaced','reason':'Ask a narrower observable question.','replacement_ids':[new['id']]}
        game['case_review']['new_predictions'][new['id']]='More informative test of the mechanism.'
        self.check()

    def test_rounding_preserves_total_without_last_candidate_bias(self):
        from wargame import forecast
        game = {'scenarios': [{'weight_pct': 100, 'shares_pct': {'a': 33.333, 'b':33.333, 'c':33.334}}]}
        self.assertEqual(forecast(game, ['a','b','c']), {'a':33.33,'b':33.33,'c':33.34})

    def test_sensitivity_is_weight_transfer_not_probability_interval(self):
        from wargame import sensitivity
        game = {'scenarios': [{'id':'a','weight_pct':90,'shares_pct':{'x':80,'y':20}}, {'id':'b','weight_pct':10,'shares_pct':{'x':20,'y':80}}]}
        self.assertEqual(sensitivity(game,['x','y'])['x'], {'min_delta_pp':-6,'max_delta_pp':6})


if __name__ == '__main__':
    unittest.main()

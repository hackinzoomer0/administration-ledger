"""Exercise the scheduled forecast integrity boundary without network or ledger writes."""
import copy
import importlib.util
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from database import load
from wargame import effective_game, APPEAL_TRAITS
spec = importlib.util.spec_from_file_location('nominees', Path(__file__).resolve().parents[1] / 'scripts/validate_nominees.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ForecastGuard(unittest.TestCase):
    def setUp(self):
        self.before = load()
        # Production may end with daily monitoring or a full weekly record.
        # Exercise daily storage consistently instead of depending on today's HEAD.
        history = self.before['collections']['nominations']['republican_2028']['tracking']['history']
        monitor = copy.deepcopy(history[-1])
        monitor.update(id='fixture-prior-monitor', type='daily_review',
                       wargame_ref=effective_game(history)[1],
                       monitoring={'prediction_updates':[]})
        monitor.pop('wargame', None)
        history.append(monitor)
        self.after = copy.deepcopy(self.before)
        self.forecast = self.after['collections']['nominations']['republican_2028']
        self.entry = copy.deepcopy(self.forecast['tracking']['history'][-1])
        self.previous_game,self.full_game_id=effective_game(self.forecast['tracking']['history'])
        self.entry['wargame']=copy.deepcopy(self.previous_game)
        self.entry.pop('wargame_ref',None)
        self.entry.pop('monitoring',None)
        self.entry.pop('comparison', None)
        self.entry['id'] = 'guard-test'
        self.entry['type'] = 'weekly_review'
        self.section = 'Weekly'
        self.entry['wargame']['case_review'] = {
            'summary': 'Fixture reassessment of case design.',
            'scenarios': {r['id']: {'decision':'retained','reason':'Still distinguishes a plausible environment.','replacement_ids':[]} for r in self.entry['wargame']['scenarios']},
            'predictions': {r['id']: {'decision':'retained','reason':'Still tests the stated mechanism.','replacement_ids':[]} for r in self.entry['wargame']['predictions']},
            'new_scenarios': {}, 'new_predictions': {}
        }
        game = self.entry['wargame']
        names = [row['id'] for row in self.forecast['candidates']]
        source = self.forecast['sources'][0]['id']
        game['appeal_review'] = {
            'standard': 'candidate_appeal_v1',
            'candidates': {name: {
                'traits': {trait: {'assessment': 'Fixture inference from a sourced public record, not measured enthusiasm.',
                                   'evidence_kind': 'inferred', 'confidence': 'low',
                                   'source_ids': [source], 'event_ids': []} for trait in APPEAL_TRAITS},
                'constituency_differences': 'Different groups can interpret the same presentation differently.',
                'growth_or_limits': 'A crisis can change appeal; it does not guarantee preference.',
                'strongest_countercase': 'Issue agreement can coexist with rejection of the candidate.',
                'scenario_effects': {row['id']: 'Fixture explains how appeal affects preference and the assigned winning chance.'
                                     for row in game['scenarios'] if row['weight_pct'] > 0}
            } for name in names}
        }
        game['projection_review'] = {
            'standard': 'causal_projection_v1',
            'current_landscape': {'assessment': 'Fixture current landscape.', 'as_of': self.entry['date'],
                                  'source_ids': [source], 'event_ids': []},
            'scenarios': {scenario['id']: {
                'projected_landscape': 'Fixture future state.', 'likelihood_reason': 'Defend the assigned scenario weight.',
                'source_ids': [source], 'event_ids': [],
                'candidate_paths': {name: {
                    key: 'Fixture causal judgment, distinct from the documented factual starting point.'
                    for key in ['candidate_response', 'voter_response', 'donor_media_response',
                                'organization_coalition', 'feedback', 'share_justification', 'countercase']
                } | {'base_effects': {'fixture-supporters': {'response':'Some supporters stay; others could leave after a compromise.',
                      'leverage':'Volunteers and donors could withhold work or money; the rival response is uncertain.',
                      'countercase':'Supporters might prioritize defeating the other party.'}}, 'source_ids': [source], 'event_ids': []} for name in names}
            } for scenario in game['scenarios']}
        }
        game['comparison_review'] = {
            'standard': 'common_candidate_standards_v1',
            'framing_check': 'Fixture comparison; no preference-driven reweighting.',
            'candidates': {name: {
                'base_assessment': {
                    'constituencies':[{'id':'fixture-supporters','description':'Potential supporters sharing the candidate’s recorded priorities; not measured voters.',
                                      'status':'potential','evidence_kind':'inferred','confidence':'low','source_ids':[source],'event_ids':[]}],
                    'loyalty_and_alignment':'Support could depend on the candidate, an issue or an outside commentator.',
                    'overlap_and_transfer':'A rival endorsement does not guarantee that supporters follow.',
                    'limits_and_countercase':'An engaged audience may not volunteer, donate or vote.'},
                'entry_and_competitiveness': 'Entry is a separate uncertainty from winning after entry.',
                'resources_now_and_mobilizable': 'Distinguish current resources from plausible future resources.',
                'coalition_conversion': 'A constituency must translate into votes and delegates.',
                'liabilities_and_constituencies': 'Specify which voters or backers respond to a liability.',
                'uncertainty_accounting': 'Missing coverage is not documented absence; avoid repeated penalties.',
                'range_justification': 'Fixture defends the actual scenario ceiling without assuming equal outcomes.',
                'scenario_range_pct': {'min':min(row['shares_pct'][name] for row in game['scenarios']), 'max':max(row['shares_pct'][name] for row in game['scenarios'])},
                'source_ids':[source], 'event_ids':[]
            } for name in names},
            'cross_candidate_challenges': [{
                'candidate_ids':[name,names[(index+1)%len(names)]],
                'issue':'Compare treatment of potential organizing capacity.',
                'countercase':'Future organization is not equally plausible for every contender.',
                'resolution':'Explain differences using evidence rather than status or missing coverage.',
                'source_ids':[source], 'event_ids':[]
            } for index,name in enumerate(names)]
        }
        for assessment in self.entry['assessments'].values():
            assessment['delta_pp'] = 0
        self.forecast['tracking']['history'].append(self.entry)

    def check(self):
        # Scenario-edit tests exercise case design; extend their projection fixture
        # independently so missing-projection failures don't mask that boundary.
        game = self.entry.get('wargame')
        if game:
            for row in game['appeal_review']['candidates'].values():
                effects=row['scenario_effects']
                row['scenario_effects']={scenario['id']: effects.get(scenario['id'], 'Fixture appeal effect for the replacement case.')
                                         for scenario in game['scenarios'] if scenario['weight_pct'] > 0}
            rows = game['projection_review']['scenarios']
            template = copy.deepcopy(next(iter(rows.values())))
            game['projection_review']['scenarios'] = {
                scenario['id']: rows.get(scenario['id'], copy.deepcopy(template))
                for scenario in game['scenarios']
            }
        module.validate(self.before, self.after, self.section)

    def daily(self):
        self.section = 'Daily'
        self.entry['type'] = 'daily_review'
        self.entry.pop('wargame')
        self.entry['wargame_ref'] = self.full_game_id
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
            self.entry['assessments'][row['id']].update(delta_pp=delta, source_ids=[self.forecast['sources'][0]['id']])
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
        from datetime import date, timedelta
        prediction=self.entry['wargame']['predictions'][0]
        prediction['status']='pending'
        prediction['resolution']='Fixture awaits its outcome.'
        self.entry['date'] = self.forecast['as_of_date'] = (date.fromisoformat(prediction['resolve_by']) + timedelta(days=1)).isoformat()
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
            self.entry['assessments'][row['id']].update(delta_pp=delta, source_ids=[self.forecast['sources'][0]['id']])
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
        original=self.previous_game['predictions'][0]
        original_status=original['status']
        self.entry['monitoring']['prediction_updates']=[{
            'id': original['id'], 'status':'unresolved', 'resolution':'Outcome not verified in this fixture; retain gap.',
            'source_ids':original['source_ids'], 'event_ids':original['event_ids']
        }]
        self.check()
        from wargame import effective_game
        game, _=effective_game(self.forecast['tracking']['history'])
        self.assertEqual(game['predictions'][0]['status'],'unresolved')
        self.assertEqual(original['status'],original_status)

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
        self.assertEqual(self.previous_game['scenarios'][0]['id'],old['id'])

    def test_replacement_prediction_gets_a_new_id_and_old_question_survives(self):
        game=self.entry['wargame'];old=game['predictions'][0]
        new=copy.deepcopy(old);new['id']='better-question';new['claim']='A more discriminating prediction.'
        game['predictions'].append(new)
        old.update(active=False,retirement_reason='Original question was too broad.')
        game['case_review']['predictions'][old['id']]={'decision':'replaced','reason':'Ask a narrower observable question.','replacement_ids':[new['id']]}
        game['case_review']['new_predictions'][new['id']]='More informative test of the mechanism.'
        self.check()

    def roster_baseline(self):
        ledger=load()
        nomination=ledger['collections']['nominations']['republican_2028']
        history=nomination['tracking']['history']
        index=next(i for i,row in enumerate(history) if row.get('comparison') == 'not_comparable_roster_change')
        nomination['tracking']['history']=history[:index+1]
        snapshot=history[index]
        nomination['as_of_date']=snapshot['date']
        for candidate in nomination['candidates']:
            candidate['nomination_likelihood_pct']=snapshot['probabilities_pct'][candidate['id']]
        module.validate(ledger,ledger,'Integrity')
        return ledger,snapshot

    def test_cross_roster_baseline_does_not_report_false_movement(self):
        ledger,snapshot=self.roster_baseline()
        self.assertEqual(len(snapshot['roster_ids']),8)
        self.assertNotIn('tucker_carlson', snapshot['roster_ids'])
        self.assertTrue(all(row['delta_pp'] is None for row in snapshot['assessments'].values()))
        snapshot['assessments']['jd_vance']['delta_pp'] = -7.4
        with self.assertRaisesRegex(ValueError,'Cross-roster'):
            module.validate(ledger,ledger,'Integrity')

    def test_rebase_cannot_rewrite_the_previous_field(self):
        ledger,snapshot=self.roster_baseline()
        snapshot['previous_probabilities_pct']['jd_vance'] = 0
        with self.assertRaisesRegex(ValueError,'previous denominator'):
            module.validate(ledger,ledger,'Integrity')

    def test_weekly_requires_comparison_not_just_candidate_biographies(self):
        del self.entry['wargame']['comparison_review']
        with self.assertRaisesRegex(ValueError, 'common-standard'):
            self.check()

    def test_weekly_cannot_omit_personal_appeal(self):
        del self.entry['wargame']['appeal_review']
        with self.assertRaisesRegex(ValueError, 'personal-appeal review'):
            module.validate(self.before,self.after,self.section)

    def test_appeal_inference_is_allowed_before_polls(self):
        self.check()
        trait=self.entry['wargame']['appeal_review']['candidates']['rand_paul']['traits']['enthusiasm_and_mobilization']
        trait.update(evidence_kind='unknown',confidence='low',source_ids=[],event_ids=[])
        self.check()
        trait['confidence']='high'
        with self.assertRaisesRegex(ValueError,'Unknown appeal'):
            self.check()

    def test_appeal_cannot_skip_a_candidate_or_trait(self):
        rows=self.entry['wargame']['appeal_review']['candidates']
        saved=rows.pop('rand_paul')
        with self.assertRaisesRegex(ValueError,'every candidate'):
            module.validate(self.before,self.after,self.section)
        rows['rand_paul']=saved
        del saved['traits']['enthusiasm_and_mobilization']
        with self.assertRaisesRegex(ValueError,'all five traits'):
            self.check()

    def test_appeal_requires_resolved_evidence_for_non_unknown_claims(self):
        trait=self.entry['wargame']['appeal_review']['candidates']['rand_paul']['traits']['enthusiasm_and_mobilization']
        trait['source_ids']=[]
        with self.assertRaisesRegex(ValueError,'sourced premises; polls are not required'):
            self.check()
        trait['source_ids']=['invented']
        with self.assertRaisesRegex(ValueError,'Unresolved personal-appeal evidence'):
            self.check()

    def test_appeal_must_influence_the_scenarios_not_only_add_a_biography(self):
        self.entry['wargame']['appeal_review']['candidates']['rand_paul']['scenario_effects'].popitem()
        with self.assertRaisesRegex(ValueError,'effect in every positive-weight scenario'):
            module.validate(self.before,self.after,self.section)

    def test_weekly_requires_projection_not_only_comparison(self):
        del self.entry['wargame']['projection_review']
        with self.assertRaisesRegex(ValueError, 'causal projection review'):
            module.validate(self.before, self.after, self.section)

    def test_projection_cannot_skip_candidate_or_voter_response(self):
        paths=next(iter(self.entry['wargame']['projection_review']['scenarios'].values()))['candidate_paths']
        paths['john_mcentee']['voter_response']=''
        with self.assertRaisesRegex(ValueError, 'voter_response'):
            self.check()
        del paths['john_mcentee']
        with self.assertRaisesRegex(ValueError, 'every candidate within each scenario'):
            self.check()

    def test_projection_cannot_skip_a_scenario(self):
        self.entry['wargame']['projection_review']['scenarios'].popitem()
        with self.assertRaisesRegex(ValueError, 'every scenario'):
            module.validate(self.before, self.after, self.section)

    def test_projection_requires_every_link_and_resolved_evidence(self):
        path=next(iter(self.entry['wargame']['projection_review']['scenarios'].values()))['candidate_paths']['jd_vance']
        for field in ['candidate_response', 'voter_response', 'donor_media_response',
                      'organization_coalition', 'feedback', 'share_justification', 'countercase']:
            with self.subTest(field=field):
                saved=path.pop(field)
                with self.assertRaisesRegex(ValueError, field):
                    self.check()
                path[field]=saved
        path['source_ids']=['invented']
        with self.assertRaisesRegex(ValueError, 'Unresolved causal-projection evidence'):
            self.check()

    def test_comparison_cannot_skip_a_disfavored_candidate(self):
        del self.entry['wargame']['comparison_review']['candidates']['john_mcentee']
        with self.assertRaisesRegex(ValueError, 'every authorized candidate'):
            self.check()

    def test_comparison_must_defend_the_actual_ceiling(self):
        self.entry['wargame']['comparison_review']['candidates']['john_mcentee']['scenario_range_pct']['max'] = 50
        with self.assertRaisesRegex(ValueError, 'actual scenario shares'):
            self.check()

    def test_comparison_needs_explicit_uncertainty_accounting(self):
        self.entry['wargame']['comparison_review']['candidates']['john_mcentee']['uncertainty_accounting']=''
        with self.assertRaisesRegex(ValueError, 'uncertainty_accounting'):
            self.check()

    def test_comparative_challenges_cannot_ignore_most_of_the_field(self):
        self.entry['wargame']['comparison_review']['cross_candidate_challenges'] = self.entry['wargame']['comparison_review']['cross_candidate_challenges'][:1]
        with self.assertRaisesRegex(ValueError, 'Every candidate needs'):
            self.check()

    def test_comparison_rejects_unresolved_sources(self):
        self.entry['wargame']['comparison_review']['candidates']['john_mcentee']['source_ids']=['invented']
        with self.assertRaisesRegex(ValueError, 'Unresolved comparative'):
            self.check()

    def test_zero_weight_breakthrough_does_not_fake_a_higher_forecast_ceiling(self):
        game=self.entry['wargame']
        added=copy.deepcopy(game['scenarios'][0]);added['id']='unweighted-breakthrough';added['weight_pct']=0
        transfer=50-added['shares_pct']['john_mcentee']
        added['shares_pct']['john_mcentee']=50
        added['shares_pct']['jd_vance']-=transfer
        game['scenarios'].append(added)
        game['case_review']['new_scenarios'][added['id']]='A zero-weight branch retained only as a research question.'
        self.check()
        game['comparison_review']['candidates']['john_mcentee']['scenario_range_pct']['max']=50
        with self.assertRaisesRegex(ValueError,'actual scenario shares'):
            self.check()

    def test_rounding_preserves_total_without_last_candidate_bias(self):
        from wargame import forecast
        game = {'scenarios': [{'weight_pct': 100, 'shares_pct': {'a': 33.333, 'b':33.333, 'c':33.334}}]}
        self.assertEqual(forecast(game, ['a','b','c']), {'a':33.33,'b':33.33,'c':33.34})

    def test_sensitivity_is_weight_transfer_not_probability_interval(self):
        from wargame import sensitivity
        game = {'scenarios': [{'id':'a','weight_pct':90,'shares_pct':{'x':80,'y':20}}, {'id':'b','weight_pct':10,'shares_pct':{'x':20,'y':80}}]}
        self.assertEqual(sensitivity(game,['x','y'])['x'], {'min_delta_pp':-6,'max_delta_pp':6})

    def test_new_weekly_requires_candidate_base_assessment(self):
        del self.entry['wargame']['comparison_review']['candidates']['john_mcentee']['base_assessment']
        with self.assertRaisesRegex(ValueError,'Support-base assessment requires'):
            self.check()

    def test_base_must_distinguish_actual_support_from_inferred_affinity(self):
        group=self.entry['wargame']['comparison_review']['candidates']['john_mcentee']['base_assessment']['constituencies'][0]
        group['status']='observed'
        with self.assertRaisesRegex(ValueError,'Observed support requires'):
            self.check()
        group.update(status='unknown',evidence_kind='unknown',confidence='low',source_ids=[])
        self.check()
        group['confidence']='high'
        with self.assertRaisesRegex(ValueError,'Unknown support requires'):
            self.check()

    def test_support_base_evidence_must_resolve(self):
        group=self.entry['wargame']['comparison_review']['candidates']['rand_paul']['base_assessment']['constituencies'][0]
        group['source_ids']=['not-a-source']
        with self.assertRaisesRegex(ValueError,'Unresolved support-base evidence'):
            self.check()

    def test_each_support_group_needs_scenario_response_leverage_and_countercase(self):
        path=next(iter(self.entry['wargame']['projection_review']['scenarios'].values()))['candidate_paths']['jd_vance']
        effect=path['base_effects']['fixture-supporters']
        for key in ['response','leverage','countercase']:
            saved=effect.pop(key)
            with self.subTest(field=key), self.assertRaisesRegex(ValueError,'Support-base scenario requires '+key):
                self.check()
            effect[key]=saved
        path['base_effects']={}
        with self.assertRaisesRegex(ValueError,'every candidate support group'):
            self.check()

    def test_duplicate_support_group_cannot_hide_missing_coverage(self):
        groups=self.entry['wargame']['comparison_review']['candidates']['jd_vance']['base_assessment']['constituencies']
        groups.append(copy.deepcopy(groups[0]))
        with self.assertRaisesRegex(ValueError,'unique nonempty IDs'):
            self.check()

    def test_new_requirement_does_not_rewrite_history_or_expand_daily_work(self):
        module.validate(self.before,self.before,'Integrity')
        self.daily()
        self.check()

    def test_scenario_must_cover_each_distinct_group_not_just_one_generic_base(self):
        base=self.entry['wargame']['comparison_review']['candidates']['jd_vance']['base_assessment']
        group=copy.deepcopy(base['constituencies'][0]);group['id']='second-group'
        base['constituencies'].append(group)
        with self.assertRaisesRegex(ValueError,'every candidate support group'):
            self.check()
        for scenario in self.entry['wargame']['projection_review']['scenarios'].values():
            effects=scenario['candidate_paths']['jd_vance']['base_effects']
            effects['second-group']=copy.deepcopy(effects['fixture-supporters'])
        self.check()


if __name__ == '__main__':
    unittest.main()

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
        self.entry['type'] = 'daily_review'
        for assessment in self.entry['assessments'].values():
            assessment['delta_pp'] = 0
        self.forecast['tracking']['history'].append(self.entry)

    def check(self):
        module.validate(self.before, self.after, 'Daily')

    def test_daily_hold(self):
        self.check()

    def test_reject_missing_daily_snapshot(self):
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
        for index, delta in ((0, 1), (1, -1)):
            candidate = self.forecast['candidates'][index]
            cid = candidate['id']
            candidate['nomination_likelihood_pct'] = round(candidate['nomination_likelihood_pct'] + delta, 2)
            self.entry['probabilities_pct'][cid] = candidate['nomination_likelihood_pct']
            assessment = self.entry['assessments'][cid]
            assessment.update(delta_pp=delta, review_status='reviewed', source_ids=[source])
        self.check()
        self.entry['assessments']['jd_vance']['source_ids'] = []
        self.entry['assessments']['jd_vance']['event_ids'] = []
        with self.assertRaises(ValueError):
            self.check()


if __name__ == '__main__':
    unittest.main()

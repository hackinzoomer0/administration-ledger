import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from daily_coverage import validate_daily_coverage


class DailyCoverageTests(unittest.TestCase):
    def setUp(self):
        self.receipts = [
            dict(id=key, kind='source', reporting_origin=origin, status='read')
            for key, origin in [('ap', 'AP'), ('reuters', 'Reuters'), ('nbc', 'NBC')]
        ]
        self.run = {
            'date': '2026-11-20',
            'summary': 'Musk distances himself from MAGA. Future funding is unverified.',
            'coverage': {'major_news': {
                'opening': {'source_receipt_ids': ['ap', 'reuters'], 'story_ids': [],
                            'empty_reason': 'No major stories surfaced in the opening scan.'},
                'closing': {'source_receipt_ids': ['reuters', 'nbc'], 'story_ids': ['musk']},
                'stories': {'musk': {
                    'headline': 'Musk distances himself from MAGA',
                    'status': 'unverified',
                    'reason': 'The interview was reported. Future commitments remain open.',
                    'source_receipt_ids': ['nbc'],
                    'next_check': '2026-11-21',
                }},
            }},
        }

    def test_closing_scan_story_is_accounted_for(self):
        validate_daily_coverage(self.run, self.receipts)

    def test_missing_inventory_rejected(self):
        with self.assertRaisesRegex(ValueError, 'opening news scan'):
            validate_daily_coverage({'coverage': {}}, self.receipts)

    def test_dropped_major_story_rejected(self):
        run = copy.deepcopy(self.run)
        run['coverage']['major_news']['stories'].clear()
        with self.assertRaisesRegex(ValueError, 'Reconcile every major story'):
            validate_daily_coverage(run, self.receipts)

    def test_recycled_opening_scan_rejected(self):
        run = copy.deepcopy(self.run)
        run['coverage']['major_news']['closing']['source_receipt_ids'] = ['ap', 'reuters']
        with self.assertRaisesRegex(ValueError, 'beyond the opening scan'):
            validate_daily_coverage(run, self.receipts)

    def test_open_story_must_be_visible_in_summary(self):
        run = copy.deepcopy(self.run)
        run['summary'] = 'The focused review is complete.'
        with self.assertRaisesRegex(ValueError, 'Name the open major story'):
            validate_daily_coverage(run, self.receipts)

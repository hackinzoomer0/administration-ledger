import copy
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from database import apply, fingerprint, load, validate
from privacy import screen
from review_workflow import prepare, finish


class DatabaseWorkflow(unittest.TestCase):
    def test_all_collections_and_nominee_history_load(self):
        ledger = load()
        summary = validate(ledger)
        self.assertEqual(summary['nominees'], 5)
        self.assertGreater(summary['events'], 600)
        self.assertIn('nominee-review', ledger['collections']['prompts'])
        self.assertNotIn('prompts', json.loads((ROOT / 'database/manifest.json').read_text())['collections'])

    def test_split_store_round_trip_and_conflict_protection(self):
        before = load()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / 'database', root / 'database')
            shutil.copytree(ROOT / 'prompts', root / 'prompts')
            self.assertEqual(before, load(root))
            after = copy.deepcopy(before)
            after['collections']['runs']['fixture-run'] = {'summary': 'Test snapshot'}
            apply(before, after, root)
            self.assertEqual(after, load(root))
            with self.assertRaises(RuntimeError):
                apply(before, after, root)

    def test_stage_uses_separate_prompts_without_production_writes(self):
        before = fingerprint(load())
        with tempfile.TemporaryDirectory() as directory:
            stage = Path(directory)
            prepare(stage, 'Daily')
            self.assertEqual(load(), json.loads((stage / 'original.json').read_text()))
            self.assertIn('nominee-review', (stage / 'prompt.txt').read_text())
        self.assertEqual(before, fingerprint(load()))

    def test_invalid_roster_is_rejected_before_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            stage = Path(directory)
            prepare(stage, 'Daily')
            file = stage / 'ledger-owner-redacted.json'
            ledger = json.loads(file.read_text())
            ledger['collections']['nominations']['republican_2028']['candidates'].pop()
            file.write_text(json.dumps(ledger))
            with patch('review_workflow.publish') as publish:
                with self.assertRaises(ValueError):
                    finish(stage, 'Daily')
                publish.assert_not_called()

    def test_successful_daily_review_reports_holds_after_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            stage = Path(directory)
            prepare(stage, 'Daily')
            file = stage / 'ledger-owner-redacted.json'
            ledger = json.loads(file.read_text())
            forecast = ledger['collections']['nominations']['republican_2028']
            snapshot = copy.deepcopy(forecast['tracking']['history'][-1])
            snapshot['id'] = 'workflow-fixture'
            snapshot['run_id'] = 'workflow-fixture'
            snapshot['type'] = 'daily_review'
            forecast['tracking']['history'].append(snapshot)
            ledger['collections']['runs']['workflow-fixture'] = {'summary': 'Fixture'}
            file.write_text(json.dumps(ledger))
            with patch('review_workflow.publish', return_value={'status': 'verified', 'commit': 'fixture'}) as publish, patch('review_workflow.apply') as apply_data:
                finish(stage, 'Daily')
                publish.assert_called_once()
                apply_data.assert_called_once()
            report = json.loads((stage / 'changes.json').read_text())
            self.assertEqual(report['nominee_forecast']['id'], 'workflow-fixture')
            self.assertIn('all five nominee percentages', (stage / 'completion-prompt.txt').read_text())

    def test_owner_local_path_is_removed_from_public_export(self):
        text = screen(f'Local path: {Path.home()}/Downloads/example')
        self.assertNotIn(str(Path.home()), text)
        self.assertIn('$HOME/Downloads/example', text)


if __name__ == '__main__':
    unittest.main()

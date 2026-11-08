"""Regression checks for observed audit failures, without network or real publication."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from database import ROOT, atomic_json, load, validate
from application import apply_transaction
from privacy import assert_public, violations
from research_review import coverage_state, validate as validate_research
from research_tools import normalize, receipt_key, record
from usage import UsageRecorder
from wargame import candidate_share_sensitivity, effective_game, forecast


def research_fixture(before, after, run_id):
    run = after['collections']['runs'][run_id]
    return {'standard': 'question_review_v1', 'priorities': [
        {'id': 'pending-outcome', 'question': 'Has the pending decision happened?', 'importance': 'Changes legal authority.',
         'affected_assessments': ['current.administration'], 'current_answer': 'Not yet independently checked.',
         'explanations': [{'explanation': 'The previous decision still applies.', 'weight': 'credible', 'reason': 'No new verification.', 'discriminating_observation': 'Read the next order.'}],
         'change_triggers': [{'development': 'New order', 'likelihood': 'unknown', 'impact': 'high', 'reason': 'Pending case.', 'assessment_effect': 'Reassess authority.'}],
         'status': 'deferred', 'outcome': 'Deferred honestly.', 'next_action': 'Read docket.', 'next_check': '2026-11-09', 'source_receipt_ids': []}],
        'prior_dispositions': {}, 'catch_up_shortfall': 'Fixture explicitly performs no intake; production must explain an actual shortfall.', 'discovery_question': 'Which implementer has a veto?', 'discovery_disposition': 'Research next.',
        'premise_reconciliation': 'Use the maintained dated authority map.',
        'coverage_debt': {code: {'last_verified': run['date'] if run['assessment_audit']['issue_coverage'][code]['status'] == 'reviewed' else previous,
                                 'next_action': 'Verify next decision.', 'next_check': '2026-11-09', 'reason': 'Scheduled follow-up.', 'escalation': 'Catch up next.'}
                          for code, previous in coverage_state(before).items()}}


class AuditRegressions(unittest.TestCase):
    def test_integrity_rejects_impossible_date_and_unknown_faction(self):
        for field, value in [('date', '2026-99-99'), ('by', ['unknown-faction']), ('kind', 'invented')]:
            ledger = load()
            next(iter(ledger['collections']['events'].values()))['items'][0][field] = value
            with self.assertRaisesRegex(ValueError, 'Event/profile validation'):
                validate(ledger)

    def test_private_identifiers_contacts_and_runtime_receipts_rejected(self):
        for value in ['PrivateExample', 'owner@' + 'example.org', '{"messageId":"123"}', '/Users/' + 'private/notes']:
            self.assertTrue(violations(value, ['PrivateExample']))
        with self.assertRaises(ValueError):
            assert_public('PrivateExample', ['PrivateExample'])
        self.assertEqual(violations('morningwire@apnews.com', []), [])

    def test_partial_application_resumes_and_refuses_unrelated_edits(self):
        before = load(); after = copy.deepcopy(before)
        after['collections']['runs']['recovery-a'] = {'summary': 'A'}
        after['collections']['runs']['recovery-b'] = {'summary': 'B'}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ['database', 'prompts']:
                shutil.copytree(ROOT/name, root/name)
            actual = atomic_json
            def crash(path, value):
                if Path(path).name == 'recovery-b.json':
                    raise OSError('simulated power interruption')
                actual(path, value)
            with patch('database.atomic_json', side_effect=crash):
                with self.assertRaises(OSError):
                    apply_transaction(before, after, root)
            self.assertTrue((root/'database/runs/recovery-a.json').exists())
            unrelated = root/'database/runs/unrelated.json'
            actual(unrelated, {'summary': 'Do not overwrite.'})
            with self.assertRaisesRegex(RuntimeError, 'conflict'):
                apply_transaction(None, None, root, resume=True)
            unrelated.unlink()
            apply_transaction(None, None, root, resume=True)
            self.assertEqual(load(root), after)
            self.assertEqual(apply_transaction(None, None, root, resume=True), after)

    def test_receipt_keys_reuse_same_query_or_tracking_url(self):
        self.assertEqual(receipt_key('query', '  TERM   site:example.org ', 'week'), receipt_key('query', 'term site:example.org', 'week'))
        self.assertEqual(normalize('https://example.org/a?utm_source=x#top'), 'https://example.org/a')
        with tempfile.TemporaryDirectory() as directory, patch('research_tools.ROOT', Path(directory)):
            stage = Path(directory)/'stage';stage.mkdir()
            row = {'kind': 'source', 'value': 'https://example.org/a', 'window': 'week', 'purpose': 'Resolve order.', 'status': 'blocked', 'result': '403', 'reporting_origin': 'Court'}
            key = record(stage, row);record(stage, row)
            self.assertEqual(len(json.loads((stage/'intake-receipts.json').read_text())), 1)
            self.assertEqual(key, receipt_key('source', row['value'], 'week'))

    def test_plausibility_and_coverage_dates_cannot_be_omitted(self):
        before=load(); after=copy.deepcopy(before)
        run_id=after['collections']['assessments']['current']['review']['run_id']
        run=after['collections']['runs'][run_id]
        run['research_review']=research_fixture(before,after,run_id)
        validate_research(before,after,'Daily',[])
        run['research_review']['priorities'][0]['explanations'][0]['weight']='equal by default'
        with self.assertRaisesRegex(ValueError,'plausibility'):
            validate_research(before,after,'Daily',[])
        run['research_review']=research_fixture(before,after,run_id)
        carried=next(code for code, row in run['assessment_audit']['issue_coverage'].items() if row['status']!='reviewed')
        run['research_review']['coverage_debt'][carried]['last_verified']='2099-01-01'
        with self.assertRaisesRegex(ValueError,'reset'):
            validate_research(before,after,'Daily',[])

    def test_telemetry_preserves_unknown_usage_and_observed_tokens_only(self):
        with tempfile.TemporaryDirectory() as directory:
            recorder=UsageRecorder(directory,'Daily');recorder.finish('completed')
            self.assertIsNone(json.loads((Path(directory)/'usage.json').read_text())[0]['observed_token_usage'])
            recorder=UsageRecorder(directory,'report')
            recorder.observe({'method':'thread/tokenUsage/updated','params':{'tokenUsage':{'total':{'inputTokens':100,'cachedInputTokens':40},'last':{'outputTokens':5}}}})
            recorder.finish('completed')
            self.assertEqual(json.loads((Path(directory)/'usage.json').read_text())[-1]['observed_token_usage']['total']['cachedInputTokens'],40)

    def test_share_stresses_leave_forecast_untouched(self):
        nomination=load()['collections']['nominations']['republican_2028'];game,_=effective_game(nomination['tracking']['history']);names=[row['id'] for row in nomination['candidates']]
        before=forecast(game,names);result=candidate_share_sensitivity(game,names)
        self.assertEqual(forecast(game,names),before)
        self.assertTrue(all(row['min_delta_pp']<=0<=row['max_delta_pp'] for row in result.values()))

class DeliveryRecovery(unittest.TestCase):
    def test_applied_daily_report_failure_does_not_require_research_again(self):
        import subprocess
        from datetime import datetime
        from zoneinfo import ZoneInfo
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); scripts = root/'scripts'; scripts.mkdir()
            shutil.copy(ROOT/'scripts/run-review', scripts/'run-review')
            (scripts/'review_workflow.py').write_text(
                'import pathlib,sys,json\np=pathlib.Path(sys.argv[2])\n'
                'if sys.argv[1]=="prepare":\n (p/"prompt.txt").write_text("research")\n (p/"research-count").write_text("1")\n'
                'else:\n (p/"application-success.json").write_text("{}")\n (p/"completion-prompt.txt").write_text("delivered")\n')
            (scripts/'review_chat.py').write_text(
                'import pathlib,sys\np=pathlib.Path(sys.argv[1])\n'
                'if sys.argv[2]=="report":\n f=p/"deliveries"\n n=int(f.read_text())+1 if f.exists() else 1\n f.write_text(str(n))\n sys.exit(1 if n==1 else 0)\n')
            first = subprocess.run(['bash', str(scripts/'run-review'), 'daily'], capture_output=True)
            self.assertNotEqual(first.returncode, 0)
            self.assertEqual((root/'.runtime/daily-review-success').read_text().strip(), datetime.now(ZoneInfo('America/Chicago')).date().isoformat())
            stage = next(path for path in (root/'.runtime').glob('review.*') if path.is_dir())
            second = subprocess.run(['bash', str(scripts/'run-review'), 'report', str(stage)], capture_output=True)
            self.assertEqual(second.returncode, 0)
            self.assertEqual((stage/'deliveries').read_text(), '2')
            self.assertEqual((stage/'research-count').read_text(), '1')

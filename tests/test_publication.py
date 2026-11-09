"""Distinguish failed CI from slow deployment without publishing or network access."""
import io
import json
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from publish_review import wait_for_deployment, deployment_status, require_same_state, check_remote_baseline


class BaselineReconciliation(unittest.TestCase):
    def test_unpublished_prompts_and_process_records_are_identified(self):
        remote = {'collections': {'prompts': {'rules': {'text': 'old'}}, 'runs': {}}}
        local = {'collections': {'prompts': {'rules': {'text': 'private text'}},
                                 'runs': {'process-update': {'summary': 'private text'}}}}
        with self.assertRaisesRegex(RuntimeError, 'prompts/rules.*runs/process-update') as error:
            require_same_state(remote, local, 'Baseline differs')
        self.assertNotIn('private text', str(error.exception))

    def test_remote_only_documents_are_not_silently_dropped(self):
        with self.assertRaisesRegex(RuntimeError, 'runs/remote-only'):
            require_same_state({'collections': {'runs': {'remote-only': {}}}},
                               {'collections': {'runs': {}}}, 'Baseline differs')

    def test_baseline_checks_composed_state_before_success(self):
        ledger = {'collections': {'prompts': {}, 'runs': {}}}
        with patch('publish_review.identifiers'), patch('publish_review.public_value', side_effect=lambda x: x), \
             patch('publish_review.load', side_effect=[ledger, ledger]), \
             patch('publish_review.subprocess.check_output', side_effect=['', 'revision\n']):
            self.assertEqual(check_remote_baseline(), {'status': 'matched', 'commit': 'revision'})


class DeploymentDiagnostics(unittest.TestCase):
    def version(self, commit='old', fingerprint='old'):
        return io.BytesIO(json.dumps({'commit':commit,'database_hash':fingerprint}).encode())

    def test_failed_ci_stops_wait_and_preserves_specific_diagnostic(self):
        status={'status':'completed','conclusion':'failure','url':'https://example.test/run/1'}
        with tempfile.TemporaryDirectory() as directory, patch('publish_review.urlopen', return_value=self.version()), patch('publish_review.deployment_status', return_value=status), patch('publish_review.time.sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError,'Deployment workflow failure.*Research was pushed'):
                wait_for_deployment(directory,'new','hash')
            self.assertEqual(json.loads((Path(directory)/'deployment-status.json').read_text()),status)
            sleep.assert_not_called()

    def test_live_matching_revision_can_succeed_without_ci_api(self):
        with tempfile.TemporaryDirectory() as directory, patch('publish_review.urlopen', return_value=self.version('new','hash')), patch('publish_review.deployment_status') as status:
            self.assertEqual(wait_for_deployment(directory,'new','hash')['status'],'verified')
            status.assert_not_called()

    def test_unavailable_ci_does_not_prevent_later_live_verification(self):
        with tempfile.TemporaryDirectory() as directory, patch('publish_review.urlopen', side_effect=[self.version(),self.version('new','hash')]), patch('publish_review.deployment_status', return_value=None), patch('publish_review.time.sleep'):
            self.assertEqual(wait_for_deployment(directory,'new','hash',attempts=2)['status'],'verified')

    def test_successful_ci_still_requires_exact_live_hash(self):
        with tempfile.TemporaryDirectory() as directory, patch('publish_review.urlopen', return_value=self.version('new','wrong')), patch('publish_review.deployment_status', return_value={'status':'completed','conclusion':'success'}):
            with self.assertRaisesRegex(RuntimeError,'Pages has not verified'):
                wait_for_deployment(directory,'new','hash',attempts=1)

    def test_ci_lookup_errors_are_nonfatal(self):
        with patch('publish_review.subprocess.run', side_effect=OSError('Unavailable')):
            self.assertIsNone(deployment_status('new'))

    def test_failed_job_step_is_recorded_when_github_supplies_it(self):
        outputs=[subprocess.CompletedProcess([],0,json.dumps([{'databaseId':12,'status':'completed','conclusion':'failure'}])),
                 subprocess.CompletedProcess([],0,json.dumps({'jobs':[{'name':'check','steps':[{'name':'Run npm run check','conclusion':'failure'}]}]}))]
        with patch('publish_review.subprocess.run',side_effect=outputs):
            self.assertEqual(deployment_status('new')['failed_steps'],['check: Run npm run check'])

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import review_followup as followup


class ReviewFollowupTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name) / 'canonical'
        self.root.mkdir()
        (self.root / '.runtime').mkdir()
        self.workspaces = Path(self.scratch.name) / 'chats'
        self.chat = self.workspaces / 'review.fixture'
        self.chat.mkdir(parents=True)
        (self.chat / 'AGENTS.md').touch()
        self.current = {'collections': {
            'events': {'AI': {'text': 'old'}, 'IRN': {'text': 'newer review'}},
            'prompts': {},
        }}
        self.proposal = {
            'collection': 'events', 'id': 'AI',
            'before': {'text': 'old'}, 'after': {'text': 'correction'},
        }
        for name, replacement in {
            'ROOT': self.root,
            'WORKSPACES': self.workspaces,
            'QUEUE': self.root / '.runtime/followups',
        }.items():
            override = patch.object(followup, name, replacement)
            override.start()
            self.addCleanup(override.stop)

    def queue(self):
        self.request_id = 'a' * 32
        (self.chat / followup.REQUEST).write_text(json.dumps({
            'id': self.request_id, 'changes': [self.proposal],
        }))

    def test_disjoint_review_edits_are_preserved(self):
        result = followup.amendment(self.current, [self.proposal])
        self.assertEqual(result['collections']['events']['AI'], self.proposal['after'])
        self.assertEqual(result['collections']['events']['IRN'], {'text': 'newer review'})
        self.assertEqual(self.current['collections']['events']['AI'], self.proposal['before'])

    def test_conflicting_draft_is_retained_without_publishing_or_applying(self):
        self.current['collections']['events']['AI'] = {'text': 'concurrent change'}
        self.queue()
        with patch.object(followup, 'load', return_value=self.current), \
                patch.object(followup, 'publish') as publish, patch.object(followup, 'apply') as apply:
            followup.process()
        publish.assert_not_called()
        apply.assert_not_called()
        status = followup.read(self.chat / followup.STATUS)
        self.assertEqual(status['status'], 'pending correction')
        self.assertIn('events/AI changed', status['error'])
        self.assertTrue(list(followup.QUEUE.glob('*/attempt.*/request/follow-up-request.json')))

    def test_publication_succeeds_before_application(self):
        self.queue()
        expected = followup.amendment(self.current, [self.proposal])
        publication = {'status': 'verified', 'commit': 'fixture'}
        ordered_calls = []
        with patch.object(followup, 'load', side_effect=[self.current, self.current, expected]), \
                patch.object(followup, 'validate'), patch.object(followup, 'validate_nominees'), \
                patch('validate_impeachments.validate'), patch.object(followup, 'check_remote_baseline'), \
                patch.object(followup, 'publish', side_effect=lambda *args, **kwargs:
                             ordered_calls.append('publish') or publication), \
                patch.object(followup, 'apply', side_effect=lambda *args, **kwargs:
                             ordered_calls.append('apply')) as apply:
            followup.process()
        self.assertEqual(ordered_calls, ['publish', 'apply'])
        apply.assert_called_once_with(self.current, expected, publication=publication)
        self.assertEqual(followup.read(self.chat / followup.STATUS), {**publication, 'id': self.request_id})

    def test_failed_deployment_rolls_back_and_preserves_the_draft(self):
        self.queue()

        def fail(job, **kwargs):
            followup.atomic_json(job / 'publication-pending.json', {'commit': 'failed'})
            raise RuntimeError('Deployment failed')

        def restore(job):
            followup.atomic_json(job / 'rollback.json', {'status': 'baseline restored'})

        with patch.object(followup, 'load', return_value=self.current), \
                patch.object(followup, 'validate'), patch.object(followup, 'validate_nominees'), \
                patch('validate_impeachments.validate'), patch.object(followup, 'check_remote_baseline'), \
                patch.object(followup, 'publish', side_effect=fail), \
                patch.object(followup, 'recover_followup_push', side_effect=restore) as recover, \
                patch.object(followup, 'apply') as apply:
            followup.process()
        recover.assert_called_once()
        apply.assert_not_called()
        self.assertEqual(followup.read(self.chat / followup.STATUS)['status'], 'pending correction')
        self.assertTrue(list(followup.QUEUE.glob('*/attempt.*/request/rollback.json')))

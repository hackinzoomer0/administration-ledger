import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from database import load
from reader_copy import plan, validate
from wargame import effective_game


class ReaderCopyReview(unittest.TestCase):
    def setUp(self):
        self.before=load()
        # Always exercise the real daily-after-weekly storage shape, even when
        # the checked-in database happens to end with a full game.
        history=self.before['collections']['nominations']['republican_2028']['tracking']['history']
        history.append({'id':'reader-copy-monitor','wargame_ref':effective_game(history)[1],
                        'monitoring':{'prediction_updates':[]}})
        self.before['collections']['assessments']['current']['review']['run_id']='reader-copy-test'
        self.before['collections']['runs']['reader-copy-test']={'summary':'Fixture review.'}
        self.after=copy.deepcopy(self.before)
        self.current=self.after['collections']['assessments']['current']
        self.current['nomination']['candidates'][0]['vulnerability']='Vance may lose supporters if they blame him for the war.'

    def review(self):
        rows=plan(self.before,self.after)
        run=self.after['collections']['runs'][self.current['review']['run_id']]
        run['reader_copy_review']={'standard':'reader_copy_v1','mode':'single_analyst_second_pass',
            'documents':{key:{'fingerprint':row['fingerprint'],'reader_takeaway':'Voters may blame Vance for the war.',
                              'context_check':'The candidate and reason are named.','uncertainty_check':'A projected reaction is conditional.',
                              'changes_made':['Expanded the original shorthand.']} for key,row in rows.items()}}
        return run['reader_copy_review']

    def test_plan_contains_only_changed_public_prose(self):
        rows=plan(self.before,self.after)
        self.assertEqual(set(rows),{'assessments/current'})
        self.assertEqual(len(rows['assessments/current']['edits']),1)
        self.assertIn('vulnerability',rows['assessments/current']['edits'][0]['path'])

    def test_missing_or_incomplete_review_blocks_publication(self):
        with self.assertRaisesRegex(ValueError,'second pass'):validate(self.before,self.after)
        review=self.review();review['documents']={}
        with self.assertRaisesRegex(ValueError,'exactly the changed'):validate(self.before,self.after)

    def test_edit_after_review_invalidates_the_stamp(self):
        self.review();validate(self.before,self.after)
        self.current['nomination']['candidates'][0]['vulnerability']='Voters may distrust Vance if his account conflicts with his earlier decisions.'
        with self.assertRaisesRegex(ValueError,'stale'):validate(self.before,self.after)

    def test_technical_changes_do_not_create_fake_editorial_work(self):
        self.after=copy.deepcopy(self.before)
        n=self.after['collections']['nominations']['republican_2028']
        next(row['wargame'] for row in reversed(n['tracking']['history']) if 'wargame' in row)['weighting_note']='Technical explanation kept in audit history.'
        self.assertEqual(plan(self.before,self.after),{})

    def test_real_wargame_response_and_new_event_are_reviewed(self):
        n=self.after['collections']['nominations']['republican_2028']
        game=next(row['wargame'] for row in reversed(n['tracking']['history']) if 'wargame' in row)
        path=next(iter(game['projection_review']['scenarios'].values()))['candidate_paths']['jd_vance']
        path['voter_response']='Voters could reward a negotiated end to the war.'
        event=self.after['collections']['events']['IRN']['items'][0]
        event['text']='A new reported decision needs a readable explanation.'
        rows=plan(self.before,self.after)
        self.assertIn('nominations/republican_2028',rows)
        self.assertIn('events/IRN',rows)
        self.assertTrue(any('/voter_response' in row['path'] for row in rows['nominations/republican_2028']['edits']))

    def test_removed_text_and_documents_need_review(self):
        self.after=copy.deepcopy(self.before)
        del self.after['collections']['assessments']['current']['nomination']['headline']
        rows=plan(self.before,self.after)
        self.assertTrue(any(row['after'] is None for row in rows['assessments/current']['edits']))
        del self.after['collections']['events']['IRN']
        self.assertIn('events/IRN',plan(self.before,self.after))

    def test_briefing_copy_is_reviewed_without_self_referencing_the_review(self):
        self.after=copy.deepcopy(self.before)
        run=self.after['collections']['runs'][self.current['review']['run_id']]
        run['summary']='Trump must choose whether to negotiate with the new Congress.'
        rows=plan(self.before,self.after)
        self.assertIn('runs/'+self.current['review']['run_id'],rows)
        run['reader_copy_review']={'documents':{'arbitrary':'review metadata'}}
        self.assertEqual(rows,plan(self.before,self.after))

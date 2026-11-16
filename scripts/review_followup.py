"""Keep review-chat amendments in private drafts until the runner publishes them."""
import copy
import fcntl
from contextlib import nullcontext
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from database import ROOT, apply, atomic_json, fingerprint, load, validate
from publish_review import check_remote_baseline, publish, recover_followup_push
from validate_nominees import validate as validate_nominees

WORKSPACES = ROOT.parent / f'.{ROOT.name}-review-chats'
QUEUE = ROOT / '.runtime/followups'
REQUEST = 'follow-up-request.json'
STATUS = 'follow-up-status.json'


def read(path):
    return json.loads(path.read_text())


def workspace(stage):
    """Give the chat a durable cwd outside the production checkout."""
    WORKSPACES.mkdir(mode=0o700, exist_ok=True)
    directory = WORKSPACES / stage.name
    directory.mkdir(mode=0o700, exist_ok=True)
    if not (directory / 'AGENTS.md').exists():
        atomic_json(directory / 'ledger-owner-redacted.json', load())
        (directory / 'changes.json').write_bytes((stage / 'changes.json').read_bytes())
        (directory / 'AGENTS.md').write_text(
            (ROOT / 'prompts/execution/follow-up.md').read_text())
    return directory


def amendment(current, rows):
    updated = copy.deepcopy(current)
    collections = updated['collections']
    seen = set()
    if not isinstance(rows, list) or not rows:
        raise ValueError('Submit a nonempty JSON array of document changes')
    for row in rows:
        collection, key = row['collection'], row['id']
        before, after = row['before'], row['after']
        if (collection not in collections or collection == 'prompts'
                or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', key)
                or (collection, key) in seen or not isinstance(after, dict)):
            raise ValueError('Invalid or duplicate research document change')
        seen.add((collection, key))
        existing = collections[collection].get(key)
        if existing != before and existing != after:
            raise ValueError(f'{collection}/{key} changed after this draft was prepared')
        collections[collection][key] = after
    return updated


def publish_draft(job):
    before_path = job / 'original.json'
    after_path = job / 'ledger-owner-redacted.json'
    publication_path = job / 'publication.json'
    pending_path = job / 'publication-pending.json'
    if publication_path.exists():
        publication = read(publication_path)
        before, after = read(before_path), read(after_path)
        if fingerprint(load()) != fingerprint(after):
            from application import apply_transaction
            journal = ROOT / '.runtime/application.json'
            state = read(journal) if journal.exists() else {}
            if state.get('phase') == 'applying' and state.get('publication') == publication:
                apply_transaction(None, None, ROOT, resume=True, require_publication=True)
            else:
                apply(before, after, publication=publication)
        return publication
    if (job / 'rollback.json').exists():
        raise RuntimeError('Deployment failed and the published baseline was restored')
    if pending_path.exists():
        pending = read(pending_path)
        from publish_review import wait_for_deployment
        try:
            publication = wait_for_deployment(job, pending['commit'], pending['database_hash'])
        except RuntimeError:
            recover_followup_push(job)
            raise
        atomic_json(publication_path, publication)
        return publish_draft(job)

    before = load()
    after = amendment(before, read(job / REQUEST))
    if before == after:
        return {'status': 'already applied'}
    validate(after)
    validate_nominees(before, after, 'Integrity')
    from validate_impeachments import validate as validate_impeachments
    validate_impeachments(after, before)
    check_remote_baseline()
    atomic_json(before_path, before)
    atomic_json(after_path, after)
    try:
        publication = publish(job, message='Publish ledger review follow-up')
    except (RuntimeError, OSError, subprocess.CalledProcessError):
        if pending_path.exists():
            recover_followup_push(job)
        raise
    atomic_json(publication_path, publication)
    return publish_draft(job)


def process(*, recover=False):
    """Serialize publication with reviews. Keep rejected drafts for revision."""
    os.umask(0o077)
    if not WORKSPACES.exists():
        return
    QUEUE.mkdir(parents=True, exist_ok=True)
    lock_context = nullcontext() if recover else (ROOT / '.runtime/review.lock').open('a')
    with lock_context as lock:
        if lock is not None:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return
        for directory in sorted(WORKSPACES.glob('review.*')):
            if directory.is_symlink() or not (directory / 'AGENTS.md').is_file():
                continue
            job = QUEUE / directory.name
            active = job / 'active'
            request = directory / REQUEST
            if recover and not (active / 'publication-pending.json').exists():
                continue
            if not active.exists():
                if not request.is_file() or request.is_symlink():
                    continue
                active.mkdir(parents=True)
            if not (active / REQUEST).exists():
                if not request.is_file() or request.is_symlink():
                    active.rmdir()
                    continue
                # Snapshot the submitted request before publication. The chat keeps its draft.
                request.replace(active / REQUEST)
            if not (active / 'result.json').exists():
                try:
                    result = publish_draft(active)
                except Exception as error:
                    if (active / 'publication.json').exists() or (
                            (active / 'publication-pending.json').exists()
                            and not (active / 'rollback.json').exists()):
                        atomic_json(directory / STATUS, {'status': 'retrying', 'error': str(error)})
                        raise
                    result = {'status': 'pending correction', 'error': str(error)}
                atomic_json(active / 'result.json', result)
            result = read(active / 'result.json')
            atomic_json(directory / STATUS, result)
            atomic_json(directory / 'ledger-owner-redacted.json', load())
            archive = Path(tempfile.mkdtemp(prefix='attempt.', dir=job))
            active.rename(archive / 'request')
            if result['status'] == 'verified':
                print(f"Verified follow-up {result['commit']}", flush=True)
            elif result['status'] == 'pending correction':
                print(f"Follow-up retained for correction: {result['error']}", flush=True)


if __name__ == '__main__':
    if sys.argv[1:] not in (['process'], ['recover']):
        raise SystemExit('Usage: review_followup.py process|recover')
    process(recover=sys.argv[1] == 'recover')

"""Publish changed research documents, then verify the deployed database fingerprint."""
import hashlib
import json
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen

from database import atomic_json, changes, load
from privacy import assert_public, identifiers, scan

REPO = 'hackinzoomer0/administration-ledger'
LIVE = 'https://hackinzoomer0.github.io/administration-ledger/'


def public_value(value):
    return json.loads(assert_public(json.dumps(value, ensure_ascii=False)))


def database_hash(root):
    digest = hashlib.sha256()
    for path in sorted((Path(root) / 'database').rglob('*.json')):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def publish(stage):
    identifiers(required=True)
    stage = Path(stage)
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    edits = [row for row in changes(before, after) if row['collection'] != 'prompts']
    if not edits:
        return {'status': 'unchanged', 'url': LIVE}
    with tempfile.TemporaryDirectory(prefix='ledger-publish-') as directory:
        def git(*args):
            return subprocess.check_output(['git', *args], cwd=directory, text=True).strip()
        git('clone', '--depth=1', '--branch=main', f'https://github.com/{REPO}.git', '.')
        remote = load(directory)
        for edit in edits:
            existing = remote['collections'].get(edit['collection'], {}).get(edit['id'])
            if existing != public_value(edit['before']) and existing != public_value(edit['after']):
                raise RuntimeError(f"Remote changed {edit['collection']}/{edit['id']}; reconcile before publishing")
            path = Path(directory) / 'database' / edit['collection'] / f"{edit['id']}.json"
            if edit['after'] is None:
                path.unlink(missing_ok=True)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(public_value(edit['after']), ensure_ascii=False, indent=2) + '\n')
        if load(directory) != {'collections': {key: public_value(value) for key, value in after['collections'].items()}}:
            raise RuntimeError('Remote/local state differs outside changed documents; sync the checkout before publication')
        scan(Path(directory), require_config=True)
        git('add', 'database')
        if git('diff', '--cached', '--name-only'):
            git('diff', '--cached', '--check')
            kind = after['collections']['nominations']['republican_2028']['tracking']['history'][-1].get('type')
            cadence = 'weekly' if kind == 'weekly_review' else 'daily'
            git('-c', 'user.name=Administration Ledger', '-c',
                'user.email=41898282+github-actions[bot]@users.noreply.github.com',
                'commit', '-m', f'Update {cadence} faction and nominee research')
            atomic_json(stage / 'publication-pending.json', {'commit': git('rev-parse', 'HEAD'), 'database_hash': database_hash(directory), 'url': LIVE})
            gh = shutil.which('gh') or str(Path.home() / '.local/bin/gh')
            git('-c', 'credential.helper=', '-c', f'credential.helper=!{shlex.quote(gh)} auth git-credential', 'push', 'origin', 'main')
        commit = git('rev-parse', 'HEAD')
        expected = database_hash(directory)
        return wait_for_deployment(stage, commit, expected)


def deployment_status(commit):
    """Best-effort CI diagnostics; unavailable GitHub API must not mask Pages verification."""
    gh = shutil.which('gh') or str(Path.home() / '.local/bin/gh')
    try:
        result = subprocess.run([gh, 'run', 'list', '--repo', REPO, '--commit', commit,
                                 '--workflow', 'deploy.yml', '--limit', '1',
                                 '--json', 'databaseId,status,conclusion,url'],
                                capture_output=True, text=True, timeout=15, check=True)
        rows = json.loads(result.stdout)
        status = rows[0] if rows else None
        if status and status.get('status') == 'completed' and status.get('conclusion') != 'success':
            try:
                result = subprocess.run([gh, 'run', 'view', str(status['databaseId']), '--repo', REPO,
                                         '--json', 'jobs'], capture_output=True, text=True, timeout=15, check=True)
                status['failed_steps'] = [job['name'] + ': ' + step['name']
                                          for job in json.loads(result.stdout).get('jobs', [])
                                          for step in job.get('steps', []) if step.get('conclusion') == 'failure']
            except (OSError, subprocess.SubprocessError, ValueError, KeyError):
                pass
        return status
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return None


def wait_for_deployment(stage, commit, expected, attempts=90, interval=5):
    for attempt in range(attempts):
        try:
            with urlopen(f'{LIVE}version.json?v={commit}&attempt={attempt}', timeout=10) as response:
                version = json.load(response)
            if version.get('commit') == commit and version.get('database_hash') == expected:
                return {'status': 'verified', 'commit': commit, 'database_hash': expected, 'url': LIVE}
        except (OSError, ValueError):
            pass
        if attempt % 3 == 0:
            status = deployment_status(commit)
            if status:
                atomic_json(Path(stage) / 'deployment-status.json', status)
                if status.get('status') == 'completed' and status.get('conclusion') != 'success':
                    raise RuntimeError(f"Deployment workflow {status.get('conclusion')} for {commit}: "
                                       f"{status.get('url')}; failed steps: {', '.join(status.get('failed_steps', [])) or 'see workflow'}. "
                                       'Research was pushed but has not been verified live or applied; '
                                       'inspect the failed CI job before retrying. Staged research retained.')
        if attempt + 1 < attempts:
            time.sleep(interval)
    raise RuntimeError(f'GitHub Pages has not verified {commit}; staged diagnostics retained')



if __name__ == '__main__':
    print(json.dumps(publish(sys.argv[1])))

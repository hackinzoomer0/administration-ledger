"""Prepare, validate, publish and apply one isolated scheduled review."""
import datetime
from collections import Counter
import json
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path
from zoneinfo import ZoneInfo

from database import ROOT, apply, atomic_json, changes, fingerprint, load, validate
from publish_review import publish
from validate_nominees import validate as validate_nominees
from validate_assessments import validate_review as validate_assessment_review
from reader_copy import plan as reader_copy_plan, validate as validate_reader_copy


def prepare(stage, section):
    ledger = load()
    atomic_json(stage / 'original.json', ledger)
    atomic_json(stage / 'ledger-owner-redacted.json', ledger)
    (stage / 'MEMORY.md').write_text((ROOT / 'MEMORY.md').read_text())
    prompt = (ROOT / 'prompts' / f'{section.lower()}.md').read_text()
    prefix = (ROOT / 'prompts/execution/stage.md').read_text()
    command = shlex.join([sys.executable, str(Path(__file__).resolve()), 'check',
                          str(stage.resolve()), section])
    copy_command = shlex.join([sys.executable, str(Path(__file__).resolve()), 'copy-plan', str(stage.resolve()), section])
    (stage / 'prompt.txt').write_text(prefix + prompt +
        '\nAfter drafting research, execute the reader-copy-review role. Generate the exact changed-public-text inventory with: '
        + copy_command + '\nRead reader-copy-plan.json in manageable sections, complete the second-pass critique, repair the stored text and record reader_copy_review in the new run. Regenerate the inventory after editing and use its final fingerprints.\nBefore ending the research turn, run this read-only preflight command and repair any errors in the staged ledger: '
        + command + '\nIt validates without publishing or applying changes. This runner-provided command is the permitted exception to the sibling-access restriction.\n')


def validate_changed_events(before, after, stage):
    old = {row['id']: row for group in before['collections']['events'].values() for row in group['items']}
    new = {row['id']: row for group in after['collections']['events'].values() for row in group['items']}
    changed = [key for key, row in new.items() if old.get(key) != row]
    if not changed and all(before['collections'][name] == after['collections'][name] for name in ['people', 'donors']):
        return
    with tempfile.TemporaryDirectory(dir=stage) as directory:
        out = Path(directory)
        for name in ['events', 'people', 'donors']:
            (out / name).mkdir()
            for key, row in after['collections'][name].items():
                atomic_json(out / name / f'{key}.json', row)
        script = out / 'validate.py'
        script.write_text(after['collections']['prompts']['validator']['text'])
        ids = out / 'changed.txt'
        ids.write_text('\n'.join(changed or ['__no_event_changes__']))
        today = datetime.datetime.now(ZoneInfo('America/Chicago')).date().isoformat()
        result = subprocess.run([sys.executable, '-I', str(script), str(out), today, str(ids)], capture_output=True, text=True)
        (stage / 'event-validation.txt').write_text(result.stdout + result.stderr)
        atomic_json(stage / 'event-validation.json', {
            'returncode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr})
        if result.returncode:
            reason = '\n'.join(line for line in result.stdout.splitlines() if line.startswith('ERROR'))
            raise ValueError('Event/profile validation failed: ' + (reason or result.stderr or result.stdout)[-2000:])


def check(stage, section):
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    documents = reader_copy_plan(before, after)
    atomic_json(stage / 'reader-copy-plan.json', documents)
    if before.keys() != after.keys() or before['collections'].keys() != after['collections'].keys():
        raise ValueError('Scheduled review changed collection schema')
    if before['collections']['prompts'] != after['collections']['prompts']:
        raise ValueError('Scheduled review changed prompts')
    validate(after)
    validate_nominees(before, after, section)
    validate_assessment_review(before, after, section)
    validate_reader_copy(before, after, documents)
    validate_changed_events(before, after, stage)
    if fingerprint(load()) != fingerprint(before):
        raise RuntimeError('Working data changed during review; retry before publishing')
    return before, after


def copy_plan(stage, section):
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    documents = reader_copy_plan(before, after)
    atomic_json(stage / 'reader-copy-plan.json', documents)
    print(json.dumps({'documents': {key: len(row['edits']) for key, row in documents.items()}, 'file': 'reader-copy-plan.json'}))


def finish(stage, section):
    before, after = check(stage, section)
    publication = publish(stage)
    atomic_json(stage / 'publication.json', publication)
    apply(before, after)
    report = {'publication': publication, 'changes': changes(before, after),
              'nominee_forecast': after['collections']['nominations']['republican_2028']['tracking']['history'][-1]}
    atomic_json(stage / 'changes.json', report)
    prompt = (ROOT / 'prompts/execution/completion.md').read_text()
    # Full before/after documents can exceed mobile chat rendering limits.
    # Keep the audit on disk and let the reporter read only relevant sections.
    notice = {'publication': publication, 'details_file': 'changes.json',
              'changed_record_counts': dict(Counter(row['collection'] for row in report['changes'])),
              'nominee_snapshot_id': report['nominee_forecast']['id']}
    (stage / 'completion-prompt.txt').write_text(prompt + json.dumps(notice, ensure_ascii=False))


if __name__ == '__main__':
    command, directory, section = sys.argv[1:]
    try:
        {'prepare': prepare, 'check': check, 'copy-plan': copy_plan, 'finish': finish}[command](Path(directory), section)
    except Exception as error:
        atomic_json(Path(directory) / 'failure.json', {'phase': command, 'error': str(error)})
        raise

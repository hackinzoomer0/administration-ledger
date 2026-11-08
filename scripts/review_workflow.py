"""Prepare, validate, publish and apply one isolated scheduled review."""
import datetime
from collections import Counter
import json
import shlex
import shutil
import sys
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
    from research_review import plan as research_plan
    atomic_json(stage / 'research-plan.json', research_plan(ledger))
    atomic_json(stage / 'intake-receipts.json', [])
    cached = ROOT / '.runtime/intake-cache'
    if cached.exists():
        shutil.copytree(cached, stage / 'intake-cache', dirs_exist_ok=True)
    (stage / 'MEMORY.md').write_text((ROOT / 'MEMORY.md').read_text())
    prompt = (ROOT / 'prompts' / f'{section.lower()}.md').read_text()
    prefix = (ROOT / 'prompts/execution/stage.md').read_text()
    tools_command = shlex.join([sys.executable, str(ROOT / 'scripts/research_tools.py'), str(stage.resolve())])
    prefix += '\nStart with research-plan.json and targeted retrieval, not the entire combined snapshot. Runner-authorized helper: ' + tools_command + ' get COLLECTION ID --path FIELD/PATH; find TEXT; lookup KIND VALUE WINDOW; receipt RECEIPT_JSON_FILE. This helper is also an exception to sibling-access restrictions. Log actual research attempts; inspect receipt age before reuse and refresh mutable indexes.\n'
    command = shlex.join([sys.executable, str(Path(__file__).resolve()), 'check',
                          str(stage.resolve()), section])
    copy_command = shlex.join([sys.executable, str(Path(__file__).resolve()), 'copy-plan', str(stage.resolve()), section])
    (stage / 'prompt.txt').write_text(prefix + prompt +
        '\nAfter drafting research, execute the reader-copy-review role. Generate the exact changed-public-text inventory with: '
        + copy_command + '\nRead reader-copy-plan.json in manageable sections, complete the second-pass critique, repair the stored text and record reader_copy_review in the new run. Regenerate the inventory after editing and use its final fingerprints.\nBefore ending the research turn, run this read-only preflight command and repair any errors in the staged ledger: '
        + command + '\nIt validates without publishing or applying changes. This runner-provided command is the permitted exception to the sibling-access restriction.\n')


def validate_changed_events(before, after, stage):
    from validate_events import validate as validate_events
    errors, warnings = validate_events(after['collections'], datetime.datetime.now(ZoneInfo('America/Chicago')).date().isoformat())
    output = '\n'.join(['WARNING ' + w for w in warnings] + ['ERROR ' + e for e in errors])
    (stage / 'event-validation.txt').write_text(output)
    atomic_json(stage / 'event-validation.json', {'returncode': int(bool(errors)), 'stdout': output, 'stderr': ''})
    if errors:
        raise ValueError('Event/profile validation failed: ' + '; '.join(errors[:10]))


def check(stage, section):
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    documents = reader_copy_plan(before, after)
    atomic_json(stage / 'reader-copy-plan.json', documents)
    if before.keys() != after.keys() or before['collections'].keys() != after['collections'].keys():
        raise ValueError('Scheduled review changed collection schema')
    if before['collections']['prompts'] != after['collections']['prompts']:
        raise ValueError('Scheduled review changed prompts')
    validate_changed_events(before, after, stage)
    validate(after, check_events=False)
    validate_nominees(before, after, section)
    validate_assessment_review(before, after, section)
    validate_reader_copy(before, after, documents)
    from research_review import validate as validate_research
    from research_tools import receipts
    validate_research(before, after, section, receipts(stage))
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
    from research_tools import harvest
    harvest(stage)
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    saved_publication = stage / 'publication.json'
    if saved_publication.exists() and fingerprint(load()) == fingerprint(after):
        publication = json.loads(saved_publication.read_text())
        if publication.get('status') not in {'verified', 'unchanged'}:
            raise RuntimeError('Cannot resume application without verified publication')
    else:
        before, after = check(stage, section)
        publication = publish(stage)
        atomic_json(saved_publication, publication)
        apply(before, after, publication=publication)
    atomic_json(stage / 'application-success.json', {'phase': 'applied', 'fingerprint': fingerprint(after), 'publication': publication})
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

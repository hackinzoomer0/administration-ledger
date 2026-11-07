"""Prepare, validate, publish and apply one isolated scheduled review."""
import datetime
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from zoneinfo import ZoneInfo

from database import ROOT, apply, atomic_json, changes, fingerprint, load, validate
from publish_review import publish
from validate_nominees import validate as validate_nominees


def prepare(stage, section):
    ledger = load()
    atomic_json(stage / 'original.json', ledger)
    atomic_json(stage / 'ledger-owner-redacted.json', ledger)
    (stage / 'MEMORY.md').write_text((ROOT / 'MEMORY.md').read_text())
    prompt = (ROOT / 'prompts' / f'{section.lower()}.md').read_text()
    prefix = (ROOT / 'prompts/execution/stage.md').read_text()
    (stage / 'prompt.txt').write_text(prefix + prompt)


def validate_changed_events(before, after, stage):
    old = {row['id']: row for group in before['collections']['events'].values() for row in group['items']}
    new = {row['id']: row for group in after['collections']['events'].values() for row in group['items']}
    changed = [key for key, row in new.items() if old.get(key) != row]
    if not changed:
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
        ids.write_text('\n'.join(changed))
        today = datetime.datetime.now(ZoneInfo('America/Chicago')).date().isoformat()
        result = subprocess.run([sys.executable, '-I', str(script), str(out), today, str(ids)], check=True, capture_output=True, text=True)
        (stage / 'event-validation.txt').write_text(result.stdout)


def finish(stage, section):
    before = json.loads((stage / 'original.json').read_text())
    after = json.loads((stage / 'ledger-owner-redacted.json').read_text())
    if before.keys() != after.keys() or before['collections'].keys() != after['collections'].keys():
        raise ValueError('Scheduled review changed collection schema')
    if before['collections']['prompts'] != after['collections']['prompts']:
        raise ValueError('Scheduled review changed prompts')
    validate(after)
    validate_nominees(before, after, section)
    validate_changed_events(before, after, stage)
    if fingerprint(load()) != fingerprint(before):
        raise RuntimeError('Working data changed during review; retry before publishing')
    publication = publish(stage)
    atomic_json(stage / 'publication.json', publication)
    apply(before, after)
    report = {'publication': publication, 'changes': changes(before, after),
              'nominee_forecast': after['collections']['nominations']['republican_2028']['tracking']['history'][-1]}
    atomic_json(stage / 'changes.json', report)
    prompt = (ROOT / 'prompts/execution/completion.md').read_text()
    (stage / 'completion-prompt.txt').write_text(prompt + json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    command, directory, section = sys.argv[1:]
    {'prepare': prepare, 'finish': finish}[command](Path(directory), section)

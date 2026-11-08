"""Reject private information before either publication route; diagnostics never echo matches."""
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / '.runtime' / 'privacy-identifiers.json'
# Public editorial contacts and the repository's generic commit identity only.
PUBLIC_MAIL_DOMAINS = {'axios.com', 'apnews.com', 'email.politico.com', 'semafor.com',
                       'thomsonreuters.com', 'mail.sailthru.com', 'punchbowl.news', 'users.noreply.github.com'}


def identifiers(required=False):
    raw = os.environ.get('LEDGER_PRIVATE_IDENTIFIERS')
    if raw is None and CONFIG.exists():
        raw = CONFIG.read_text()
    if not raw:
        if required:
            raise ValueError('Private publication identifiers are not configured')
        return []
    values = json.loads(raw)
    if not isinstance(values, list) or not values or any(not isinstance(v, str) or not v.strip() for v in values):
        raise ValueError('Invalid private identifier configuration')
    return values


def violations(text, private=None):
    issues = set()
    for value in identifiers() if private is None else private:
        if re.search(r'(?<![\w])' + re.escape(value) + r'(?![\w])', text, re.I):
            issues.add('configured owner identifier')
    if re.search(r'(?:/home/|/Users/)[A-Za-z0-9_.-]+' + r'|/tmp/' + 'codex-remote-attachments/', text):
        issues.add('machine-local identifying path')
    if re.search(r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{24,})', text):
        issues.add('credential')
    if re.search(r'\b(?:threadId|messageId|receivedTime|chat_id)\s*["\\]*\s*:', text):
        issues.add('private runtime or mailbox metadata')
    for email in re.findall(r'[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})', text):
        if email.lower() not in PUBLIC_MAIL_DOMAINS:
            issues.add('unapproved contact address')
    if re.search(r'\bowner (?:believes|confirmed mobile|wants)|owner[’\']s (?:Vance|personal) hypothesis', text, re.I):
        issues.add('personal owner commentary')
    return sorted(issues)


def screen(text):
    # Compatibility for non-public local exports; publication uses assert_public.
    return text.replace(str(Path.home()), '$HOME')


def assert_public(text, private=None):
    issues = violations(text, private)
    if issues:
        raise ValueError('Privacy check failed: ' + ', '.join(issues))
    return text


def scan(root=ROOT, require_config=False, output=None):
    private = identifiers(required=require_config)
    paths = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=root).decode().split('\0')
    failures = []
    for relative in paths:
        path = Path(root) / relative
        if not relative or not path.is_file() or path.is_symlink():
            continue
        # Executable code may describe runtime field names; actual contacts, paths, names and secrets remain checked.
        text = path.read_text(errors='replace')
        found = violations(text, private)
        if relative.startswith(('scripts/', 'tests/')):
            found = [v for v in found if v != 'private runtime or mailbox metadata']
        if found:
            failures.append({'file': relative, 'categories': found})
    if output:
        for path in Path(output).rglob('*'):
            if path.is_file():
                found = violations(path.read_text(errors='replace'), private)
                if found:
                    failures.append({'file': path.relative_to(output).as_posix(), 'categories': found})
    if failures:
        raise ValueError('Privacy check rejected files: ' + json.dumps(failures))
    return {'status': 'passed', 'private_identifiers_configured': bool(private)}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-config', action='store_true')
    parser.add_argument('--dist')
    args = parser.parse_args()
    print(json.dumps(scan(require_config=args.require_config, output=args.dist)))

"""Remove machine-local owner identifiers from authorized research exports."""
import os
import pwd
import re
from pathlib import Path


def screen(text):
    account = pwd.getpwuid(os.getuid())
    text = text.replace(str(Path.home()), '$HOME')
    text = re.sub(r'\b' + re.escape(account.pw_name) + r'\b', 'local-user', text)
    name = account.pw_gecos.split(',')[0].strip()
    if name and name.casefold() != account.pw_name.casefold():
        text = re.sub(re.escape(name), '[owner name redacted]', text, flags=re.I)
    if re.search(r'/home/[a-zA-Z0-9_]|/tmp/codex-remote-attachments/', text):
        raise ValueError('Machine-local identifying path remains in export')
    return text

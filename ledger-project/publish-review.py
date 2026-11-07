"""Publish only changed event rows to the public dashboard."""
import json
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen

REPO = "hackinzoomer0/administration-ledger"
FIELDS = set("actor added by context date fx fxnote id issues kind origin precision "
             "rationale source text tier url weight mergedFrom printedDate headlineOnly".split())
PRIVATE = re.compile(r"local-user|file://|/home/|/tmp/|owner-redacted|private source", re.I)


def events(path):
    groups = json.loads(path.read_bytes())["collections"]["events"]
    rows = {}
    for issue, group in groups.items():
        for row in group["items"]:
            key = issue, row["id"]
            if key in rows:
                raise ValueError(f"Duplicate event {key}")
            rows[key] = row
    return rows


def publish(stage, destination):
    old = events(stage / "original.json")
    new = events(stage / "ledger-owner-redacted.json")
    changes = {}
    for key, row in new.items():
        if row == old.get(key):
            continue
        public_row = {field: value for field, value in row.items() if field in FIELDS}
        if key[0] not in row["issues"] or not row["source"]:
            raise ValueError(f"Invalid event {key}")
        if PRIVATE.search(json.dumps(public_row, ensure_ascii=False)):
            raise ValueError(f"Private material in changed event {key}")
        changes[key] = public_row
    if not changes:
        return

    with tempfile.TemporaryDirectory(prefix="ledger-publish-") as directory:
        def git(*args):
            return subprocess.check_output(["/usr/bin/git", *args], cwd=directory, text=True).strip()

        git("clone", "--depth=1", "--branch=main", f"https://github.com/{REPO}.git", ".")
        index = Path(directory) / "index.html"
        html = index.read_text()
        match = re.search(r'id="ledger-data">(.*?)</script>', html, re.S)
        if match is None:
            raise ValueError("Dashboard data block missing")
        data = json.loads(match[1])
        changed = False
        for (issue, event_id), row in changes.items():
            items = data["events"][issue]["items"]
            matches = [i for i, item in enumerate(items) if item["id"] == event_id]
            if len(matches) > 1:
                raise ValueError(f"Duplicate public event {event_id}")
            if not matches:
                items.append(row)
                changed = True
            elif items[matches[0]] != row:
                items[matches[0]] = row
                changed = True
        if changed:
            encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
            index.write_text(html[:match.start(1)] + encoded + html[match.end(1):])
            git("diff", "--check")
            git("add", "index.html")
            git("-c", "user.name=Administration Ledger",
                "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
                "commit", "-m", "Publish scheduled ledger review")
            git("-c", "credential.helper=", "-c",
                f"credential.helper=!{shlex.quote(shutil.which('gh') or str(Path.home() / '.local/bin/gh'))} auth git-credential",
                "push", "origin", "main")
        commit = git("rev-parse", "HEAD")
        expected = index.read_bytes()
        url = f"https://hackinzoomer0.github.io/administration-ledger/?v={commit}"
        for attempt in range(24):
            try:
                with urlopen(f"{url}&check={attempt}", timeout=10) as response:
                    if response.read() == expected:
                        break
            except OSError:
                pass
            time.sleep(5)
        else:
            raise RuntimeError(f"GitHub Pages has not served {commit} yet")
        destination.write_bytes(expected)
        print(f"Verified live dashboard at {commit}", flush=True)


if __name__ == "__main__":
    publish(*map(Path, sys.argv[1:]))

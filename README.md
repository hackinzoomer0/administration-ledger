# Administration Ledger

The public dashboard is served from `index.html`. The research snapshot is `ledger-owner-redacted.json`; nominee tracking lives in `collections.nominations.republican_2028`.

`ledger-project/` contains the scheduled review runner, nominee validator, tests, project context and first-pass assessment. `ledger-scheduled-tasks.md` contains daily and weekly prompts. Local account paths and identifying owner details are screened for public export. Runtime logs, daemon metadata and credentials are excluded.

The five-candidate nomination estimates are subjective and conditional on one of those five winning. They are not full-field probabilities, poll shares or calibrated model outputs. The daily process shares evidence with faction analysis, records changed and unchanged forecasts, and prohibits roster changes without explicit owner authorization.

Run local checks with:

```sh
python3 ledger-project/test-nominees.py
python3 ledger-project/validate-nominees.py ledger-owner-redacted.json ledger-owner-redacted.json Weekly
bash -n ledger-project/run-review
```

The runner requires a configured local Codex Remote daemon, GitHub CLI authentication, the sibling dashboard directory, and Linux user timers. Nothing in this commit installs credentials or starts a scheduled research run. This repository is an exported source snapshot; the running local installation remains the source for subsequent scheduled reviews.

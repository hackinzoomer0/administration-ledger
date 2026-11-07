# Operations

## Local scheduled installation

Keep the repository in a stable checkout. Daily and weekly services run:

```sh
/path/to/administration-ledger/scripts/run-review daily
/path/to/administration-ledger/scripts/run-review weekly
```

The existing installation may retain a small compatibility launcher at its original service path. That launcher delegates to the repository runner; it contains no second copy of the implementation. The source of truth is the checkout's `database/` and `prompts/` folders. Earlier combined exports are historical backups, not active inputs.

Requirements: Python 3.10+, Bash, `flock`, Git, authenticated GitHub CLI, a configured local Codex Remote daemon and systemd user services. The launcher uses the environment's tools and home directory rather than an embedded account path. Schedules remain daily at 07:00 and Mondays at 10:00 America/Chicago. The weekly job requires a successful daily review on that Central date.

Runtime stages, chat IDs, failure diagnostics, the review lock and daily-success stamp live under `.runtime/` and are ignored by Git. Read final service status with `journalctl --user -u ledger-daily-review.service` or the corresponding weekly service.

## Editing research

Use the relevant document in `database/<collection>/<id>.json`. Preserve IDs and evidence distinctions. Use `prompts/roles/` for textual role instructions and `prompts/registry.json` for their metadata. The original nominee import baseline stays in append-only forecast history. No scheduled process may change the candidate roster or forecasting methodology.

Run `npm run database:validate` after data edits. For nominee changes, append a snapshot and link it to a run record; changed estimates require references. A daily snapshot is required even if all estimates hold. Never turn a candidate estimate into independent evidence for a faction claim.

## Publishing

Push source/data changes to `main`. The `Check and deploy` workflow runs lint, TypeScript, tests and the production build, then deploys Pages. Verify `version.json` for the expected commit and database hash. The scheduled publisher performs this verification before applying its staged local data.

To recover a failed scheduled run, read the retained `.runtime/review.*` stage. Compare `original.json`, the staged ledger, any `publication.json` and the working database. Reconcile against remote before rerunning. Do not reset or overwrite unrelated remote changes. No credentials or runtime chat metadata belong in public files.

## Migration checks

The framework migration preserves all original research documents and prompts. The first consistency-pass estimates remain Vance 49.35%, Rubio 20.78%, DeSantis 19.48%, Cruz 6.49% and McEntee 3.90%, conditional on the five-person roster. No political finding or legacy score was changed to support this structural refactor.

Current product assessments live in database/assessments/current.json. Every daily review executes prompts/roles/current-assessment.md, updates the review reference and actual coverage, and maintains evidence links and substantive snapshot selection. A technical migration or publication cannot advance the political assessment. The original issue/faction summaries remain historical where no current synthesis has been established.

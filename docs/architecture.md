# Architecture

## Front end

React owns rendering and state. React Router provides hash routes that remain compatible with static GitHub Pages hosting. Page components are loaded on demand. Material UI supplies navigation, responsive layouts, tables, pagination, forms, dialogs, accordions and accessibility behaviors. React Flow supplies the faction relationship graph; Recharts supplies forecast history and explicitly labeled legacy-effect charts. Application components compose these libraries rather than implementing new UI primitives.

`src/lib/types.ts` defines research-facing interfaces. `src/lib/data.ts` reads collection documents through Vite. Selectors are pure and tested independently of the UI. Research text remains plain text; only HTTP(S) links become interactive. There is no HTML injection from source records.

The original six views are retained: overview, issues, factions, people, donors and event ledger. Nominees have a dedicated view for estimates, deltas, policies, relationships, sources, coverage and snapshot history. People and donors expose complete underlying profiles. Issue and faction views retain dated positions and caveats. Review logs and methodological reports remain available through the overview.

## Data contract

`database/manifest.json` names the research collections. Each collection is a directory containing its original documents as JSON. Document IDs become file names; document contents, event IDs and evidence references are preserved. The migration was checked against the original combined ledger with exact parsed-object equality, including extracted role text.

`prompts/registry.json` retains structured prompt metadata. Text instructions live in `prompts/roles/*.md`. Daily and weekly entry points are separate Markdown files. During a scheduled review, the database loader composes the collections and role prompts into a single isolated `ledger-owner-redacted.json` for the existing research protocol. No composed snapshot is tracked in the repository.

## Review transaction

1. The runner holds `.runtime/review.lock` and waits for the same-day daily prerequisite before weekly work.
2. It composes an original and editable snapshot and starts a daemon chat in an isolated stage.
3. It rejects collection/schema changes, prompt edits, unauthorized nominees, invalid forecast totals, rewritten history and broken evidence links. Changed events also run through the stored event validator.
4. It checks the production fingerprint for intervening changes.
5. The publisher clones the current remote, rejects conflicting changes to affected documents, screens owner identifiers and commits only changed research documents.
6. GitHub Actions checks and builds the application. The publisher verifies both commit and database hash from the live `version.json`.
7. The runner checks for intervening local edits again, atomically replaces changed documents under the lock, then resumes the same chat with the generated diff for its final report.

Atomic replacement protects individual JSON documents. The review lock serializes scheduled writers; editing tools should also respect this lock. A failure between document replacements retains the full staged snapshot for reconciliation. A successful publication followed by an application failure must be reconciled with the published revision, never silently rolled back.

## Deployment

Only `dist/` is uploaded to Pages. The repository contains research and prompts for review, while the deployment contains the application assets and revision metadata. The Vite base path is `/administration-ledger/`. The Pages site uses the Actions build type rather than Jekyll; a build must pass before deployment.

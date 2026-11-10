# Architecture

## Front end

React owns rendering and state. React Router provides hash routes that remain compatible with static GitHub Pages hosting. Page components are loaded on demand. Material UI supplies navigation, responsive layouts, tables, pagination, forms, dialogs, accordions and accessibility behaviors. React Flow supplies the faction relationship graph; Recharts supplies forecast history and explicitly labeled legacy-effect charts. Application components compose these libraries rather than implementing new UI primitives.

`src/lib/types.ts` defines research-facing interfaces. `src/lib/data.ts` reads collection documents through Vite. Selectors are pure and tested independently of the UI. Research text remains plain text; only HTTP(S) links become interactive. There is no HTML injection from source records.

The primary navigation has four destinations: Current assessment, Administration, 2028 nomination and Research. Supporting issue/faction/person/money profiles and event records keep their deep links. Current power and race judgments lead the dashboard, with contextual evidence in a standard drawer. Full profiles prioritize role, incentives, actions and relationships. Complete historical records and technical metadata require explicit disclosure inside Research or a full-record view.

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

## Maintained current assessment

`database/assessments/current.json` is a first-class output of the daily process. It contains issue-specific power contests, candidate paths and vulnerabilities, cross-implications, and explicitly identified relationships. It links to events, nominee source IDs and a review run. Authority, leverage, actions, positions and money remain distinct. No overall power ranking is generated from activity, graph position or legacy scores.

The initial assessment is a synthesis of existing ledger evidence and the first faction-consistency review, not a new external news intake. Coverage gaps are explicit. Research-as-of and last substantive change are separate from build/publication time. `version.json` includes `built_at`; UI freshness comes from the assessment and not event ingestion timestamps.

Nomination values remain canonical in the original nomination document. The UI selects substantive daily, weekly or faction-consistency snapshots, excluding imports and workflow migrations. The current-assessment validator requires the latest substantive snapshot reference, exactly the authorized candidate roster, resolved evidence and people links, valid dates and decision-specific fields. Daily execution must reference a new run and explicitly reassess this output; unsupported holds remain labeled rather than pretending to new evidence.

Nomination snapshots now carry `wargame`: six adjudicated strategic questions, scenario weights and conditional candidate shares, candidate-specific opposing cases, and stable dated predictions. `scripts/wargame.py` reproduces the mixture and stresses. `validate_nominees.py` enforces this contract for new scheduled snapshots and the current forecast, while retaining legacy import/technical history unchanged. The UI exposes scenarios on the nomination view and each candidate's strategic case under Wargame.

Weekly snapshots contain full wargames with `case_review` dispositions for all prior scenarios/tests and reasons for additions. Daily snapshots carry `wargame_ref` plus `monitoring` deltas; `effective_game` in Python and `latestWargame` in the UI resolve the full game and outcome updates without duplicating the debate. Daily odds hold, while material developments and new design questions are queued. Full review dates stay distinct from daily monitoring dates.

## Personnel impeachment forecasts

Administration/personnel and linked person profiles expose the canonical `impeachments/all` collection. The route shares a separate research chunk rather than adding forecast history to the global data module. See [impeachments.md](impeachments.md) for case discovery, explicit probabilities, append-only history/proceedings, source evidence, outcomes and shared political momentum affecting unrelated cases. Both existing review entry points execute the stored impeachment-review role and the common validator. No nomination method or schedule changes.

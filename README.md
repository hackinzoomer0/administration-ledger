# Administration Ledger

A sourced research dashboard for decisions, factions, financial relationships and the 2028 Republican nomination. Built with **React, TypeScript and Vite**, using **Material UI**, **React Flow** and **Recharts**.

[Live dashboard](https://hackinzoomer0.github.io/administration-ledger/)

## Project structure

```text
database/           Research documents, grouped by collection
  events/           Dated episodes, one document per issue
  factions/         Faction profiles and issue positions
  nominations/      Authorized candidates, estimates and snapshot history
  people/, donors/  People and financial relationships
  meta/, report/    Cross-issue synthesis, methodology and legal context
  runs/, changes/   Review coverage, validation and change history
  inbox/            Intake records
prompts/
  daily.md          Daily review instructions (07:00 America/Chicago)
  weekly.md         Monday review instructions (10:00 America/Chicago)
  roles/            Readable research and validation instructions
  registry.json     Role metadata, structured lessons and source registry
src/
  components/       Shared Material UI compositions
  pages/            Overview, issues, factions, nominees, people, donors, ledger
  lib/              Research types, data access and pure selectors
  theme.ts          Shared design tokens and component defaults
scripts/            Database, scheduled review and publication tools
tests/              Unit, workflow integrity and browser tests
docs/               Architecture, operations and research assessments
.github/workflows/  Checks and GitHub Pages deployment
```

## Development

Requires Node.js 24+ and Python 3.10+ on Linux. Install dependencies with `npm ci`, then run `npm run dev`. Open the URL printed by Vite. Hash-based routes work on GitHub Pages, including direct profile links.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development with hot reload |
| `npm run build` | Type-check and build `dist/`, including revision metadata |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Lint, unit/workflow tests and production build |
| `npm run test:e2e` | Browser navigation, filtering, profiles and mobile checks |
| `npm run database:validate` | Validate database structure and nominee integrity |
| `npm run format` | Format application and configuration source |

Browser tests use local Google Chrome by default; set `CHROME_PATH` for another location. CI installs Playwright Chromium. Runtime state, credentials, dependencies and build output are ignored by Git.

## Data and evidence

Research belongs in `database/`; prompts belong in `prompts/`. Do not embed research payloads into HTML or components. `scripts/database.py export /tmp/review.json` composes the documents and role prompts into the legacy snapshot shape for research tools; this export is transient and is not a second source of truth.

The nominee roster is owner-authorized and fixed. Estimates are subjective, uncalibrated shares conditional on one of the five included candidates winning. They are not full-field probabilities, polling shares or market prices. Daily reviews record holds as well as changes and link candidate findings to faction evidence in both directions. Legacy faction scores remain explicitly labeled.

Research may be published when it does not personally identify the owner. Screen for owner names, personal contact information and machine-local paths. Never commit credentials or daemon/runtime metadata.

## Review and deployment

See [architecture](docs/architecture.md) and [operations](docs/operations.md). Daily and weekly systemd jobs invoke `scripts/run-review`; a separate stage protects the working database. Validation occurs before publication, publication is verified against the live build fingerprint, and the staged result is then applied. Failures retain diagnostics and report in the same review chat.

GitHub Actions runs checks and builds the React app before deploying `dist/` to Pages. `version.json` exposes the deployed commit and database fingerprint so automated reviews can verify the exact research revision. The HTML entry point contains only app metadata and the React mount.

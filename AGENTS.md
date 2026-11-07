# Administration Ledger

Read MEMORY.md at the start of each chat and update it after material decisions, workflow changes or user corrections. Keep detailed evidence and run history in database/runs/.

The canonical research lives in database/, with collections listed in database/manifest.json. All prompts live in prompts/. React application code lives in src/ and review/publication tools in scripts/. Do not embed research payloads or prompt text in HTML or application components.

Research may be published when authorized, provided it does not personally identify the owner. Keep names, personal contact details, machine-local account paths, credentials and runtime/daemon metadata out of public exports.

Use established Material UI components, React Flow and Recharts before writing custom interaction primitives. Preserve evidence distinctions and label legacy scores. No nominee roster or forecast methodology changes without explicit owner authorization.

Validate changed data, run checks appropriate to source changes, and verify the live revision after an authorized deployment. Respect .runtime/review.lock when editing production data during scheduled work. See docs/architecture.md and docs/operations.md for the review transaction and deployment contract.

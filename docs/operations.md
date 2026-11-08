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

Every daily AND weekly run must provide a new current-assessment review reference and assessment_audit in its run record. The audit covers material developments, all issues, summary changes/holds, dated assumptions and (weekly) competing interpretations. A new timestamp alone fails validation. This validates coverage and traceability, not the truth of an interpretation; evidence verification and explicit gaps remain essential. The summary must follow the dominant current reality rather than a permanent post-midterm template.


## Predictive nomination wargame

The owner-authorized `scenario_wargame_v1` replaces inherited starting weights with an explicit subjective scenario mixture. The authorized roster and method remain locked during scheduled runs. Weekly reviews execute `prompts/roles/nomination-wargame.md` and append a full game even on a hold. Daily reviews execute the lightweight `nominee-monitor` role and append a compact snapshot with `wargame_ref`, held odds, material developments, queued weekly questions and test-outcome updates. They do not run full debates, reconstruct scenarios, or automatically trigger extra full runs after shocks. Flag potentially stale odds instead. This is structured single-analyst opposition unless the run explicitly documents separate reviewers; it is not independent consensus.

Reproduce the current calculation and ten-point scenario-weight stresses:

```sh
python3 scripts/wargame.py database/nominations/republican_2028.json
```

Scenario weights total 100, and each scenario's five winner shares total 100. Both are conditional on an authorized candidate winning; entry and organization risks are included in those judgments. The weighted mixture uses largest-remainder rounding. The full field is not modeled, and a leadership crisis can benefit an unlisted contender. No missing-field odds or additional candidates are invented.

The validator checks arithmetic, coverage, opposition, evidence references, snapshot integrity and retained prediction tests. A past deadline must be assessed or explicitly unresolved. It cannot validate the political truth or calibration of an analyst's inputs. Preserve historical forecasts so misses remain visible. The first wargame is a documented model correction plus targeted evidence review, not an observed change in voter support.

Weekly case-design review must address every prior scenario and prediction: retain, revise, retire or replace, with reasons and valid replacement IDs. Newly plausible scenarios and better tests are allowed and must be justified. Retired scenarios leave the active mixture; original prediction questions/deadlines remain in the audit record with an inactive flag and retirement reason. Replacements get new IDs so changes do not erase misses. The weekly reviewer reads daily queued questions and outcome updates. UI and calculation resolve referenced full games and apply daily test updates while preserving the full-review date. No probabilities or political conclusions changed in this cadence adjustment.

The 2026-11-07 follow-up authorizes Rand Paul, Brian Kemp and Thomas Massie, bringing the roster to eight; Tucker Carlson is excluded. Earlier five-person history remains unchanged. The expansion is a new conditional baseline, with null cross-roster deltas and explicit prior-field metadata. Subsequent daily/weekly changes compare within the eight-person roster. Scheduled runs still cannot change authorization or methodology.

Weekly weighting also requires `comparison_review` under the same candidate standards for the full authorized field. It separates entry from conditional competitiveness, current from mobilizable resources, coalition conversion, constituency-specific liabilities and overlapping uncertainties. Reviewers must defend actual scenario ranges and test comparable assumptions across every contender. A missing profile detail is not evidence of absent support, and a user preference is not new evidence. The validator checks coverage, references and consistency with the actual scenario ranges; it cannot establish that the judgments are analytically correct. Existing historical forecasts remain unchanged until reassessed in the next full weekly review. Daily monitoring only queues comparative questions.

New weekly snapshots require `projection_review` with the `causal_projection_v1` standard: sourced current landscape; projected landscapes and likelihood reasoning; and each authorized candidate's response, voter response, donor/media response, organization/coalition formation, feedback, countercase and justification of the assigned winner share in each scenario. This owner-authorized reasoning structure adds no automatic scores or independent probabilities at each stage. The scenario-mixture arithmetic, roster and weekly cadence remain unchanged. Validators require coverage for newly appended weekly snapshots, preserving older historical games unchanged. Daily monitoring queues developments affecting these links without generating the matrix or changing odds.

## Review validation and recovery

Every prepared research chat receives an explicit `review_workflow.py check` command. This preflight performs the same research, nominee, current-assessment and event/profile checks as finish, without publishing or applying research. It is the permitted exception to the stage's sibling-access restriction. Changed people/donor profiles are validated even when no events changed. Repository files are not subject to the historical ArtifactData 256 KiB size cap; large-file warnings do not justify deleting research.

Validator stdout/stderr and exit status are retained as `event-validation.txt` and `event-validation.json`; CLI failures also write `failure.json`. Failure reporting reads these diagnostics and publication markers rather than showing only a subprocess traceback. SIGTERM/SIGINT leave a failing exit status so recovery stages survive cancellation. Before manual recovery, make a separate stage backup, verify the production research still matches its original snapshot, and explicitly reconcile prompt-only validator changes. Reuse the existing research instead of rerunning a completed wargame. Publication must pass CI and match the live commit/database fingerprint before application. Browser and workflow fixtures must resolve current headlines, counts, scenarios and the latest full game rather than assuming a fixed historical snapshot.

New weekly forecasts also require `appeal_review` (`candidate_appeal_v1`) across all authorized candidates: five qualitative dimensions, the kind and confidence of evidence, differences among constituencies, possible growth/limits, a countercase, and effects in every positive-weight scenario. This permits sourced behavioral evidence and explicit inference before polling; unknown is permitted with low confidence. It does not add numerical charisma scores or multipliers, require polling, change the formula/cadence/roster, or certify that the analyst's judgments are correct. The requirement applies to newly appended weekly records, preserving historical estimates. Daily monitoring queues consequential appeal developments.

Nomination product explanations use the maintained current-assessment candidate `path` and political response fields. Historical forecast rationale, numerical adjudication, inherited ceilings/floors and schema/audit notes remain research records; do not bind them directly to a public "Why this estimate" summary. Copy corrections update maintained presentation text without rewriting forecast history or advancing political review dates. Known audit/schema leakage in current candidate fields fails validation, and browser checks cover all candidate summaries/wargame views.

## Reader-copy review before publication

Daily and weekly writers execute `prompts/roles/reader-copy-review.md` after drafting research. The runner supplies `review_workflow.py copy-plan STAGE SECTION`, which writes the exact changed-public-text inventory to `reader-copy-plan.json`. Review it in small sections, repair the staged database, regenerate the plan and record a `reader_copy_review` in the new run. Each document needs its final fingerprint, reader takeaway, context and uncertainty checks, and corrections made. An empty corrections list requires a concrete explanation of why the text is already clear.

The common `check`/`finish` path rejects missing coverage or stale fingerprints before publication/application. It checks public prose additions, edits and deletions, including the site-visible latest full wargame resolved through daily references. Internal run logs and historical numerical adjudication are outside this editorial inventory. This enforces a fresh, documented single-analyst second pass; it does not automatically certify prose quality. Weekly review also samples older issue/faction and person/donor text and records remaining problems. See `docs/content-review-2026-11-07.md` for the initial audit and limits.

The publisher checks the commit-specific deployment workflow while waiting for Pages. A completed failed/cancelled workflow stops the wait and retains `deployment-status.json`, including failed job steps when GitHub supplies them. Missing CI API access does not prevent verification through Pages. Successful CI alone is insufficient: the live commit and database hash must still match. A pushed-but-unverified review remains unapplied for recovery.

Forecast/copy-review test fixtures must exercise daily-after-weekly storage even when the checked-in latest record is weekly. Resolve the latest full wargame through history; create pending predictions and evidence requirements explicitly rather than assuming production predictions are pending or production assessment references are populated. Recovery must test the exact failed research revision, not just the older local baseline.

New weekly games must identify each candidate's observed, potential or unknown support groups in `comparison_review.candidates[].base_assessment`. Record the evidence kind/confidence, loyalty and alignment, overlap/transfer and countercase. Every positive-weight scenario's candidate path must provide `base_effects` for exactly those groups: projected response, concrete influence and countercase. `validate_support_bases` applies only to newly appended weekly records; it does not retroactively require new fields in old games or lightweight daily records. It checks completeness, consistency and resolved references, not the truth of the political judgments. Unknown support remains allowed at low confidence and inferred affinity cannot be labeled observed support.

Writers must integrate these conclusions into the existing voter/donor/organizing projections, assigned shares and maintained candidate coalition explanations. Distinguish actual electoral influence from decision-makers' belief in spoiler influence, party leaders from primary voters, and candidate loyalty from an influencer's following. Do not assume an endorsement transfers an entire base or that threatened defection automatically produces either accommodation or backlash. Daily monitoring flags supported changes and queues questions without rebuilding the matrix or changing odds. No additional multiplier, roster change, automatic extra run or historical rewrite is authorized by this requirement.

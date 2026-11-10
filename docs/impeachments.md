# Personnel impeachment forecasts

The Administration → Personnel & impeachment view links official-specific forecasts, person profiles, source qualifications, proceeding milestones, dated follow-ups and immutable forecast history. Deep links use `#/administration/personnel/CASE_ID` and `?section=evidence|history|methods`. Watchlist means unestimated, not zero risk. Each view states its own research cutoff and deadline; deployment does not advance research freshness.

`database/impeachments/all.json` is canonical. The first two snapshots preserve the initial Hegseth pilot and expanded comparative dry run, explicitly labeling shared momentum as unassessed at that time. A third feature-baseline review adds the prospective momentum pathways while carrying the original probabilities. They are subjective, uncalibrated judgments imported from that research, not new factual verification during implementation. Four numerical cases and five watchlist cases have unequal coverage; close rankings are not robust. The current shared momentum estimate is explicitly unquantified, not an assumed measured uplift.

Case discovery is open to current and former officials without requiring faction membership or prior headlines. The separate nomination roster remains locked. A particular office's eligibility, the timing of alleged conduct and post-departure jurisdiction are distinct questions. Do not infer guilt from family/business links or a referral. Preserve the strongest surviving defense alongside allegations.

## Dependence and momentum

The first conviction could change the political cost and feasibility of unrelated later impeachments. Shared context explicitly considers normalization, exceptional-case containment and backlash. Append evidence-linked momentum observations and explain each affected case's response or hold. Do not treat another official's conviction as misconduct evidence, multiply independent case odds, add the individual probabilities into an aggregate, or automatically award an uplift. Initial forecasts are not a calibrated joint distribution or a quantified first-conviction model.

`proceedings` records verified procedural milestones, including introductions, inquiries, procedural votes, actual House adoption, Senate conviction/acquittal, dismissal and departure. A correction appends a row with `supersedes`; the original remains visible. `momentum_observations` links those milestones to coalition behavior, political response, scope and countercase. An observed conviction state needs an actual conviction-linked observation. Initial `unverified` describes reviewed coverage, not a census proving there were no convictions.

`history` contains timezone-aware issuance, deadline, linked run, coverage, full shared context and every case forecast. It snapshots both the case/defense evidence and momentum reasoning. Store three numeric probabilities together or all null. `joint_pct = round(house_pct * conviction_given_impeachment_pct /100,2)`. Source records, history, proceedings and momentum observations are append-only in scheduled reviews. New cases are allowed; old cases remain available. Due tests must resolve or carry an explicit unresolved explanation; replacements use new IDs.

## Reviews and validation

`prompts/roles/impeachment-review.md` runs inside existing daily/weekly intake. Daily work handles material evidence/outcomes, holds and tests; weekly work compares cases and challenges coverage and feedback assumptions. Unlike the separate nomination daily-hold rule, impeachment estimates can change after material developments during daily reviews. No new timer or extra full nomination run is introduced.

`scripts/validate_impeachments.py` runs in database integrity checks and the pre-publication review check. It rejects broken references, invalid arithmetic/ranges, rewritten histories, unsafe URLs, missing current cases, unsupported conviction labels, overdue pending tests and missing linked scheduled reviews. Reader-copy inventory includes the new collection; research-plan exposes its due checks. These checks establish structural traceability, not the truth or calibration of political judgments. Initial copy was reviewed for allegations/defenses, role/timing qualifications, plain-language consequences and explicit numerical uncertainty.

Run `npm run database:validate`, `npm test`, `npm run build` and the browser suite before deployment. Keep source/privacy checks and commit/database-hash live verification in the existing publication workflow.

"""Qualitative weekly review contracts, separate from scenario arithmetic."""
def validate_projection_review(game, names, sources, events):
    """Check causal coverage for new weekly runs; historical forecasts remain unchanged."""
    review = game.get('projection_review', {})
    if review.get('standard') != 'causal_projection_v1':
        raise ValueError('Weekly forecast requires a causal projection review')

    def check(row, fields):
        for field in fields:
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f'Causal projection requires {field}')
        if not row.get('source_ids') and not row.get('event_ids'):
            raise ValueError('Causal projections require evidence for their factual starting points')
        if not set(row.get('source_ids', [])) <= sources or not set(row.get('event_ids', [])) <= events:
            raise ValueError('Unresolved causal-projection evidence')

    check(review.get('current_landscape', {}), ['assessment', 'as_of'])
    scenarios = review.get('scenarios', {})
    if set(scenarios) != {row['id'] for row in game['scenarios']}:
        raise ValueError('Causal projection must cover every scenario')
    for scenario in scenarios.values():
        check(scenario, ['projected_landscape', 'likelihood_reason'])
        paths = scenario.get('candidate_paths', {})
        if set(paths) != set(names):
            raise ValueError('Causal projection must cover every candidate within each scenario')
        for path in paths.values():
            check(path, ['candidate_response', 'voter_response', 'donor_media_response',
                         'organization_coalition', 'feedback', 'share_justification', 'countercase'])


def validate_support_bases(game, names, sources, events, previous=None):
    """Prospective weekly coverage: who supports each contender and what those groups can do."""
    candidates = game.get('comparison_review', {}).get('candidates', {})
    for name in names:
        base = candidates.get(name, {}).get('base_assessment', {})
        for field in ['loyalty_and_alignment', 'overlap_and_transfer', 'limits_and_countercase']:
            if not isinstance(base.get(field), str) or not base[field].strip():
                raise ValueError(f'Support-base assessment requires {field} for {name}')
        discovery = base.get('discovery_review', {})
        for field in ['voters', 'donors', 'media', 'organizers', 'bias_check', 'changes_since_previous']:
            if not isinstance(discovery.get(field), str) or not discovery[field].strip():
                raise ValueError(f'Support-base discovery requires {field} for {name}')
        groups = base.get('constituencies')
        if not isinstance(groups, list) or not groups:
            raise ValueError(f'Support-base assessment needs constituencies for {name}; explicit unknown is allowed')
        ids = set()
        for group in groups:
            ident = group.get('id')
            if not isinstance(ident, str) or not ident.strip() or ident in ids:
                raise ValueError('Support-base constituencies require unique nonempty IDs per candidate')
            ids.add(ident)
            if not isinstance(group.get('description'), str) or not group['description'].strip():
                raise ValueError('Support-base constituency needs a description')
            if group.get('kind') not in {'voters', 'donors', 'media', 'organizers'}:
                raise ValueError('Support groups must distinguish voters, donors, media and organizers')
            for field in ['priorities', 'tradeoffs', 'commitment_signals', 'exit_conditions', 'alternatives']:
                if not isinstance(group.get(field), str) or not group[field].strip():
                    raise ValueError(f'Support group requires {field}')
            change = group.get('change', {})
            if change.get('direction') not in {'strengthening', 'stable', 'weakening', 'mixed', 'unknown'} or not isinstance(change.get('reason'), str) or not change['reason'].strip():
                raise ValueError('Support groups require a direction and reason for change or hold')
            status, kind, confidence = group.get('status'), group.get('evidence_kind'), group.get('confidence')
            if status not in {'observed', 'potential', 'unknown'} or kind not in {'measured', 'behavioral', 'inferred', 'unknown'} or confidence not in {'low', 'medium', 'high'}:
                raise ValueError('Support-base assessment must distinguish observed/potential/unknown support, evidence kind and confidence')
            if (status == 'unknown' or kind == 'unknown') and (status != 'unknown' or kind != 'unknown' or confidence != 'low'):
                raise ValueError('Unknown support requires unknown evidence and low confidence')
            if status == 'observed' and kind not in {'measured', 'behavioral'}:
                raise ValueError('Observed support requires measured or behavioral evidence, not inferred affinity')
            if kind != 'unknown' and not group.get('source_ids') and not group.get('event_ids'):
                raise ValueError('Support-base claims require sourced premises; polling is not required')
            if not set(group.get('source_ids', [])) <= sources or not set(group.get('event_ids', [])) <= events:
                raise ValueError('Unresolved support-base evidence')
        old_base = (previous or {}).get('comparison_review', {}).get('candidates', {}).get(name, {}).get('base_assessment', {})
        removed = {group['id'] for group in old_base.get('constituencies', [])} - ids
        retired = base.get('retired_groups')
        if not isinstance(retired, dict) or set(retired) != removed or any(not isinstance(reason, str) or not reason.strip() for reason in retired.values()):
            raise ValueError('Support-base changes must explain exactly the prior groups removed or replaced')
        for scenario in game['scenarios']:
            if scenario['weight_pct'] <= 0:
                continue
            path = game['projection_review']['scenarios'][scenario['id']]['candidate_paths'][name]
            effects = path.get('base_effects', {})
            if not isinstance(effects, dict) or set(effects) != ids:
                raise ValueError('Every positive-weight scenario must assess every candidate support group')
            for effect in effects.values():
                for field in ['response', 'leverage', 'countercase']:
                    if not isinstance(effect.get(field), str) or not effect[field].strip():
                        raise ValueError(f'Support-base scenario requires {field}')


APPEAL_TRAITS = {'likability_and_relatability', 'trust_and_authenticity',
                 'strength_and_competence', 'enthusiasm_and_mobilization', 'presidential_presence'}


def validate_appeal_review(game, names, sources, events):
    """Require early-cycle judgment without requiring polls or certifying its accuracy."""
    review = game.get('appeal_review', {})
    if review.get('standard') != 'candidate_appeal_v1' or set(review.get('candidates', {})) != set(names):
        raise ValueError('Weekly forecast requires a personal-appeal review for every candidate')
    active = {row['id'] for row in game['scenarios'] if row['weight_pct'] > 0}
    for row in review['candidates'].values():
        for field in ['constituency_differences', 'growth_or_limits', 'strongest_countercase']:
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f'Personal-appeal review requires {field}')
        effects = row.get('scenario_effects', {})
        if set(effects) != active or any(not isinstance(value, str) or not value.strip() for value in effects.values()):
            raise ValueError('Personal appeal must explain its effect in every positive-weight scenario')
        traits = row.get('traits', {})
        if set(traits) != APPEAL_TRAITS:
            raise ValueError('Personal-appeal review must assess all five traits')
        for trait in traits.values():
            if not isinstance(trait.get('assessment'), str) or not trait['assessment'].strip():
                raise ValueError('Personal appeal needs an assessment, not just a score')
            kind = trait.get('evidence_kind')
            if kind not in {'measured', 'behavioral', 'inferred', 'unknown'} or trait.get('confidence') not in {'low', 'medium', 'high'}:
                raise ValueError('Personal appeal must distinguish evidence kind and confidence')
            if kind == 'unknown' and trait['confidence'] != 'low':
                raise ValueError('Unknown appeal cannot carry high confidence')
            if kind != 'unknown' and not trait.get('source_ids') and not trait.get('event_ids'):
                raise ValueError('Personal-appeal claims require sourced premises; polls are not required')
            if not set(trait.get('source_ids', [])) <= sources or not set(trait.get('event_ids', [])) <= events:
                raise ValueError('Unresolved personal-appeal evidence')


def validate_comparison_review(game, names, sources, events):
    """Require common evidence standards without pretending prose validation establishes analytical truth."""
    review = game.get('comparison_review', {})
    if review.get('standard') != 'common_candidate_standards_v1' or not review.get('framing_check', '').strip():
        raise ValueError('Weekly forecast requires a common-standard candidate comparison')
    rows = review.get('candidates', {})
    if set(rows) != set(names):
        raise ValueError('Comparative review must cover every authorized candidate')
    def evidence(row):
        if not row.get('source_ids') and not row.get('event_ids'):
            raise ValueError('Candidate comparisons require evidence or sourced coverage limitations')
        if not set(row.get('source_ids', [])) <= sources or not set(row.get('event_ids', [])) <= events:
            raise ValueError('Unresolved comparative-review evidence')
    for name, row in rows.items():
        for key in ['entry_and_competitiveness', 'resources_now_and_mobilizable', 'coalition_conversion', 'liabilities_and_constituencies', 'uncertainty_accounting', 'range_justification']:
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f'Candidate comparison requires {key}')
        values = [scenario['shares_pct'][name] for scenario in game['scenarios'] if scenario['weight_pct'] > 0]
        if row.get('scenario_range_pct') != {'min': min(values), 'max': max(values)}:
            raise ValueError('Declared candidate range must match actual scenario shares')
        evidence(row)
    covered = set()
    for challenge in review.get('cross_candidate_challenges', []):
        ids = challenge.get('candidate_ids', [])
        if len(set(ids)) < 2 or not set(ids) <= set(names):
            raise ValueError('Comparative challenges need at least two known candidates')
        if not all(challenge.get(key, '').strip() for key in ['issue', 'countercase', 'resolution']):
            raise ValueError('Comparative challenges need an issue, countercase and resolution')
        evidence(challenge)
        covered.update(ids)
    if covered != set(names):
        raise ValueError('Every candidate needs a cross-candidate consistency challenge')


def validate_explanation_weights(game):
    """Material alternatives must be adjudicated, not presented as equally credible."""
    from research_review import WEIGHTS
    for row in list(game['judgments'].values()) + list(game['candidate_debates'].values()):
        if row.get('countercase_weight') not in WEIGHTS:
            raise ValueError('Weekly countercases require explicit plausibility weights and a reasoned resolution')

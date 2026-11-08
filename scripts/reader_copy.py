"""Track changed public prose and require a current second-pass editorial review."""
import hashlib
import json
import re

PUBLIC = {'assessments', 'events', 'people', 'donors', 'factions', 'issues', 'nominations', 'report', 'runs'}
METADATA = {'id', 'kind', 'tier', 'status', 'precision', 'home', 'also', 'issues', 'supports',
            'factions', 'model_version', 'standard', 'schema_version', 'type', 'url', 'source',
            'publication_date', 'accessed_on', 'added', 'date', 'reviewed_at', 'asof', 'as_of',
            'as_of_date', 'research_as_of', 'last_substantive_change'}


def nomination_view(document):
    # Audit history and numeric adjudication are not the text used by candidate views.
    from wargame import effective_game
    game, _ = effective_game(document['tracking']['history'])
    return {'candidates': [{k: v for k, v in row.items() if k != 'forecast_rationale'}
                           for row in document['candidates']],
            'sources': document.get('sources', []),
            'uncertainties': document.get('forecast_methodology', {}).get('critical_uncertainties', []),
            'wargame': {
                'judgments': {key: {k: v for k, v in row.items() if k in {'finding', 'countercase'}}
                              for key, row in game.get('judgments', {}).items()},
                'scenarios': [{k: v for k, v in row.items() if k in {'id', 'name', 'definition', 'weight_reason', 'falsifier'}}
                              for row in game.get('scenarios', [])],
                'candidates': {key: {k: v for k, v in row.items() if k in {
                    'best_case', 'failure_case', 'entry_assessment', 'next_move', 'rival_attack', 'durability_test'}}
                               for key, row in game.get('candidate_debates', {}).items()},
                'current_landscape': game.get('projection_review', {}).get('current_landscape', {}),
                'projection': {key: {
                    'projected_landscape': row.get('projected_landscape', ''),
                    'candidate_paths': {name: {k: v for k, v in path.items() if k not in {'share_justification', 'countercase'}}
                                        for name, path in row.get('candidate_paths', {}).items()}}
                               for key, row in game.get('projection_review', {}).get('scenarios', {}).items()},
                'predictions': game.get('predictions', [])}}


def briefing_view(document):
    # Only the prose shown above a review's explicitly technical full record.
    return {key: value for key, value in document.items() if key in {
        'summary', 'scope', 'changes', 'changed_entries', 'unresolved_claims'}}


def strings(value, path=''):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in METADATA or key.endswith('_id') or key.endswith('_ids') or key.endswith('_ref'):
                continue
            yield from strings(item, f'{path}/{key}')
    elif isinstance(value, list):
        for index, item in enumerate(value):
            ident = item.get('id', item.get('candidate_id', index)) if isinstance(item, dict) else index
            yield from strings(item, f'{path}/{ident}')
    elif isinstance(value, str) and value.strip():
        if not re.fullmatch(r'https?://\S+|\d{4}-\d{2}-\d{2}(?:T\S+)?', value):
            yield path, value


def plan(before, after):
    documents = {}
    for collection in sorted(PUBLIC):
        old_documents = before['collections'].get(collection, {})
        new_documents = after['collections'].get(collection, {})
        for key in sorted(set(old_documents) | set(new_documents)):
            document = new_documents.get(key, {})
            previous = old_documents.get(key, {})
            if previous == document:
                continue
            if collection == 'nominations':
                previous = nomination_view(previous) if previous else {}
                document = nomination_view(document) if document else {}
            if collection == 'runs':
                previous = briefing_view(previous)
                document = briefing_view(document)
            old = dict(strings(previous)); new = dict(strings(document))
            edits = [{'path': path, 'before': old.get(path), 'after': new.get(path)}
                     for path in sorted(set(old) | set(new)) if old.get(path) != new.get(path)]
            if edits:
                digest = hashlib.sha256(json.dumps(edits, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
                documents[f'{collection}/{key}'] = {'fingerprint': digest, 'edits': edits}
    return documents


def validate(before, after, documents=None):
    documents = plan(before, after) if documents is None else documents
    run_id = after['collections']['assessments']['current']['review']['run_id']
    review = after['collections']['runs'][run_id].get('reader_copy_review', {})
    if review.get('standard') != 'reader_copy_v1' or review.get('mode') != 'single_analyst_second_pass':
        raise ValueError('Review requires a reader-copy second pass before publication; read reader-copy-plan.json')
    rows = review.get('documents', {})
    if set(rows) != set(documents):
        raise ValueError('Reader-copy review must cover exactly the changed public-text documents in reader-copy-plan.json')
    for key, expected in documents.items():
        row = rows[key]
        if row.get('fingerprint') != expected['fingerprint']:
            raise ValueError(f'Reader-copy review is stale for {key}; review the final edited text again')
        for field in ['reader_takeaway', 'context_check', 'uncertainty_check']:
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f'Reader-copy review needs {field} for {key}')
        if not isinstance(row.get('changes_made'), list):
            raise ValueError(f'Reader-copy review must record editorial corrections or a justified empty list for {key}')

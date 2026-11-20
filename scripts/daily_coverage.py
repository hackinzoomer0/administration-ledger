"""Validate the two broad news scans and the disposition of their major stories."""

from datetime import date


def validate_daily_coverage(run, receipts):
    audit = run.get('coverage', {}).get('major_news', {})
    if not isinstance(audit, dict):
        raise ValueError('Daily major-news coverage must be an object')
    sources = {row['id']: row for row in receipts}
    discovered = set()
    scan_receipts = {}
    for phase in ('opening', 'closing'):
        scan = audit.get(phase, {})
        receipt_ids = scan.get('source_receipt_ids', []) if isinstance(scan, dict) else []
        if not isinstance(receipt_ids, list) or any(
            not isinstance(key, str) or key not in sources for key in receipt_ids
        ):
            raise ValueError(f'Daily {phase} news scan needs recorded source receipts')
        origins = {
            sources[key]['reporting_origin'].strip().casefold()
            for key in receipt_ids
            if sources[key]['kind'] == 'source'
            and sources[key]['status'] in {'read', 'headline_only'}
        }
        if len(origins) < 2:
            raise ValueError(f'Daily {phase} news scan needs two accessible independent news sources')
        scan_receipts[phase] = set(receipt_ids)
        story_ids = scan.get('story_ids', [])
        if not isinstance(story_ids, list) or not all(
            isinstance(key, str) and key.strip() for key in story_ids
        ):
            raise ValueError(f'Daily {phase} news scan needs a story ID list')
        if not story_ids and not str(scan.get('empty_reason', '')).strip():
            raise ValueError(f'Explain why the daily {phase} news scan found no major stories')
        discovered.update(story_ids)
    if not any(
        sources[key]['kind'] == 'source'
        and sources[key]['status'] in {'read', 'headline_only'}
        for key in scan_receipts['closing'] - scan_receipts['opening']
    ):
        raise ValueError('Daily closing news scan needs an accessible source receipt beyond the opening scan')

    stories = audit.get('stories', {})
    if not isinstance(stories, dict) or set(stories) != discovered:
        raise ValueError('Reconcile every major story identified in the two daily scans')
    open_statuses = {'pending', 'unverified'}
    for key, story in stories.items():
        if not isinstance(story, dict) or any(
            not isinstance(story.get(field), str) or not story[field].strip()
            for field in ('headline', 'reason')
        ):
            raise ValueError(f'Daily story {key} needs a headline and a disposition reason')
        status = story.get('status')
        if status not in ('reflected', 'already_covered', 'held', 'pending', 'unverified'):
            raise ValueError(f'Daily story {key} needs a coverage disposition')
        evidence = story.get('source_receipt_ids')
        if not isinstance(evidence, list) or not evidence or any(
            not isinstance(item, str) or item not in sources for item in evidence
        ):
            raise ValueError(f'Daily story {key} needs receipts for actual research attempts')
        if status == 'already_covered' and not str(story.get('prior_reference', '')).strip():
            raise ValueError(f'Daily story {key} needs a dated prior reference')
        if status in open_statuses:
            next_check = story.get('next_check')
            if not isinstance(next_check, str) or date.fromisoformat(next_check) < date.fromisoformat(run['date']):
                raise ValueError(f'Daily story {key} needs a current or future follow-up date')
            if story['headline'].casefold() not in run.get('summary', '').casefold():
                raise ValueError(f'Name the open major story in the daily summary: {story["headline"]}')

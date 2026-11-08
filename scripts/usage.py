"""Private passive telemetry: observed usage only, never inferred cost or raw tool output."""
from collections import Counter
import json
import hashlib
from pathlib import Path
import time
from database import atomic_json


class UsageRecorder:
    def __init__(self, stage, phase):
        self.path = Path(stage) / 'usage.json'
        self.phase = phase
        self.started = time.monotonic()
        self.tools = Counter()
        self.operations = Counter()
        self.item_ids = set()
        self.tokens = None
        self.rows = json.loads(self.path.read_text()) if self.path.exists() else []

    def observe(self, message):
        method = message.get('method')
        params = message.get('params', {})
        if method == 'thread/tokenUsage/updated':
            usage = params.get('tokenUsage', {})
            self.tokens = {key: {name: value for name, value in usage.get(key, {}).items()
                                 if isinstance(value, (int, float)) and not isinstance(value, bool)}
                           for key in ['total', 'last']}
        if method == 'item/completed':
            item = params.get('item', {})
            if item.get('id') and item['id'] in self.item_ids:
                return
            if item.get('id'):
                self.item_ids.add(item['id'])
            kind = item.get('type', '')
            if kind == 'webSearch':
                from research_tools import normalize
                action = item.get('action') or {'query': item.get('query', '')}
                stable = json.dumps(action, sort_keys=True)
                key = hashlib.sha256(normalize(stable).encode()).hexdigest()[:24]
                self.operations[key] += 1
            if kind in {'webSearch', 'commandExecution', 'mcpToolCall', 'fileChange', 'dynamicToolCall'}:
                self.tools[kind] += 1

    def finish(self, status):
        self.rows.append({'phase': self.phase, 'status': status,
                          'elapsed_seconds': round(time.monotonic() - self.started, 2),
                          'observed_token_usage': self.tokens, 'observed_tool_calls': dict(self.tools),
                          'repeated_research_operations': {key: count for key, count in self.operations.items() if count > 1},
                          'cost': None, 'note': 'Thread totals may include earlier turns; null usage means not reported. No savings or spend inferred.'})
        atomic_json(self.path, self.rows)
        self.path.chmod(0o600)

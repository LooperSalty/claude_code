"""Session persistence — JSON-based, mirrors Claw Code's session_store."""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from uuid import uuid4


SESSION_DIR = Path('.claw_sessions')


@dataclass(frozen=True)
class StoredSession:
    session_id: str
    messages: tuple[dict[str, object], ...]
    input_tokens: int
    output_tokens: int


def save_session(session_id: str, messages: list[dict[str, object]], input_tokens: int, output_tokens: int) -> Path:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    path = SESSION_DIR / f'{session_id}.json'
    data = {
        'session_id': session_id,
        'messages': messages,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
    }
    path.write_text(json.dumps(data, indent=2, default=str), encoding='utf-8')
    return path


def load_session(session_id: str) -> StoredSession:
    path = SESSION_DIR / f'{session_id}.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    return StoredSession(
        session_id=data['session_id'],
        messages=tuple(data['messages']),
        input_tokens=data['input_tokens'],
        output_tokens=data['output_tokens'],
    )


def list_sessions() -> list[str]:
    if not SESSION_DIR.exists():
        return []
    return sorted(p.stem for p in SESSION_DIR.glob('*.json'))


def new_session_id() -> str:
    return uuid4().hex[:12]

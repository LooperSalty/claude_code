"""Frozen dataclasses for the agent runtime."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Role(Enum):
    USER = 'user'
    ASSISTANT = 'assistant'
    TOOL_RESULT = 'tool_result'


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    input: dict[str, object]


@dataclass(frozen=True)
class ToolResult:
    tool_use_id: str
    content: str
    is_error: bool = False


@dataclass(frozen=True)
class Message:
    role: Role
    content: str
    tool_calls: tuple[ToolCall, ...] = ()
    tool_results: tuple[ToolResult, ...] = ()


@dataclass(frozen=True)
class UsageStats:
    input_tokens: int = 0
    output_tokens: int = 0

    def add(self, input_tokens: int, output_tokens: int) -> 'UsageStats':
        return UsageStats(
            input_tokens=self.input_tokens + input_tokens,
            output_tokens=self.output_tokens + output_tokens,
        )


@dataclass(frozen=True)
class SessionConfig:
    model: str = 'claude-sonnet-4-20250514'
    max_tokens: int = 8192
    max_tool_rounds: int = 25
    system_prompt: str = ''


@dataclass(frozen=True)
class TurnResult:
    text: str
    tool_calls: tuple[ToolCall, ...]
    usage: UsageStats
    stop_reason: str

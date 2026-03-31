"""Anthropic API client wrapper."""
from __future__ import annotations

import os

import anthropic

from .models import SessionConfig, ToolCall, TurnResult, UsageStats
from .tools import execute_tool, tool_defs_for_api, ToolExecResult


def _build_client() -> anthropic.Anthropic:
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        raise RuntimeError(
            'ANTHROPIC_API_KEY non definie.\n'
            'Exporte-la: export ANTHROPIC_API_KEY=sk-ant-...'
        )
    return anthropic.Anthropic(api_key=api_key)


def run_turn(
    client: anthropic.Anthropic,
    messages: list[dict[str, object]],
    config: SessionConfig,
) -> TurnResult:
    """Single API call, returns parsed result."""
    response = client.messages.create(
        model=config.model,
        max_tokens=config.max_tokens,
        system=config.system_prompt,
        tools=tool_defs_for_api(),
        messages=messages,
    )

    text_parts: list[str] = []
    tool_calls: list[ToolCall] = []

    for block in response.content:
        if block.type == 'text':
            text_parts.append(block.text)
        elif block.type == 'tool_use':
            tool_calls.append(ToolCall(
                id=block.id,
                name=block.name,
                input=block.input,
            ))

    return TurnResult(
        text='\n'.join(text_parts),
        tool_calls=tuple(tool_calls),
        usage=UsageStats(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        ),
        stop_reason=response.stop_reason,
    )


def run_agent_loop(
    messages: list[dict[str, object]],
    config: SessionConfig,
    on_text: object = None,
    on_tool_call: object = None,
    on_tool_result: object = None,
) -> tuple[str, UsageStats]:
    """Run the full tool-use loop until the model stops calling tools."""
    client = _build_client()
    total_usage = UsageStats()
    final_text = ''

    for _ in range(config.max_tool_rounds):
        result = run_turn(client, messages, config)
        total_usage = total_usage.add(result.usage.input_tokens, result.usage.output_tokens)

        if result.text:
            final_text = result.text
            if on_text:
                on_text(result.text)

        if not result.tool_calls:
            break

        # Build assistant message with all content blocks
        assistant_content: list[dict[str, object]] = []
        if result.text:
            assistant_content.append({'type': 'text', 'text': result.text})
        for tc in result.tool_calls:
            assistant_content.append({
                'type': 'tool_use',
                'id': tc.id,
                'name': tc.name,
                'input': tc.input,
            })
        messages.append({'role': 'assistant', 'content': assistant_content})

        # Execute tools and collect results
        tool_results: list[dict[str, object]] = []
        for tc in result.tool_calls:
            if on_tool_call:
                on_tool_call(tc)
            exec_result: ToolExecResult = execute_tool(tc.name, tc.input)
            if on_tool_result:
                on_tool_result(tc, exec_result)
            tool_results.append({
                'type': 'tool_result',
                'tool_use_id': tc.id,
                'content': exec_result.content,
                'is_error': exec_result.is_error,
            })

        messages.append({'role': 'user', 'content': tool_results})
    else:
        final_text += '\n[max tool rounds reached]'

    return final_text, total_usage

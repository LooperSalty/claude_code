"""Real tool implementations for the agent."""
from __future__ import annotations

import glob as glob_mod
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ToolDef:
    name: str
    description: str
    input_schema: dict[str, object]


@dataclass(frozen=True)
class ToolExecResult:
    content: str
    is_error: bool = False


# ---------------------------------------------------------------------------
# Tool definitions (sent to the API)
# ---------------------------------------------------------------------------

TOOL_DEFS: tuple[ToolDef, ...] = (
    ToolDef(
        name='bash',
        description='Execute a bash/shell command. Use for system commands, git, package managers, running scripts.',
        input_schema={
            'type': 'object',
            'properties': {
                'command': {'type': 'string', 'description': 'The shell command to execute'},
            },
            'required': ['command'],
        },
    ),
    ToolDef(
        name='read_file',
        description='Read a file from disk. Returns the full content with line numbers.',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'Absolute or relative file path'},
                'offset': {'type': 'integer', 'description': 'Start line (0-based). Optional.'},
                'limit': {'type': 'integer', 'description': 'Max lines to read. Optional.'},
            },
            'required': ['path'],
        },
    ),
    ToolDef(
        name='write_file',
        description='Create or overwrite a file with the given content.',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'File path to write'},
                'content': {'type': 'string', 'description': 'Full file content'},
            },
            'required': ['path', 'content'],
        },
    ),
    ToolDef(
        name='edit_file',
        description='Replace an exact string in a file. old_string must match exactly (whitespace-sensitive).',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'File path'},
                'old_string': {'type': 'string', 'description': 'Exact string to find'},
                'new_string': {'type': 'string', 'description': 'Replacement string'},
            },
            'required': ['path', 'old_string', 'new_string'],
        },
    ),
    ToolDef(
        name='grep',
        description='Search file contents using regex. Returns matching lines with file paths and line numbers.',
        input_schema={
            'type': 'object',
            'properties': {
                'pattern': {'type': 'string', 'description': 'Regex pattern to search'},
                'path': {'type': 'string', 'description': 'Directory or file to search in. Defaults to cwd.'},
                'include': {'type': 'string', 'description': 'Glob filter for filenames (e.g. "*.py"). Optional.'},
            },
            'required': ['pattern'],
        },
    ),
    ToolDef(
        name='find_files',
        description='Find files matching a glob pattern. Returns list of matching paths.',
        input_schema={
            'type': 'object',
            'properties': {
                'pattern': {'type': 'string', 'description': 'Glob pattern (e.g. "**/*.py", "src/**/*.ts")'},
                'path': {'type': 'string', 'description': 'Base directory. Defaults to cwd.'},
            },
            'required': ['pattern'],
        },
    ),
    ToolDef(
        name='list_dir',
        description='List directory contents with file sizes.',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'Directory path. Defaults to cwd.'},
            },
            'required': [],
        },
    ),
)

TOOL_MAP: dict[str, ToolDef] = {t.name: t for t in TOOL_DEFS}


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

def execute_tool(name: str, tool_input: dict[str, object]) -> ToolExecResult:
    try:
        if name == 'bash':
            return _exec_bash(str(tool_input['command']))
        if name == 'read_file':
            return _exec_read_file(
                str(tool_input['path']),
                int(tool_input.get('offset', 0)),
                tool_input.get('limit'),
            )
        if name == 'write_file':
            return _exec_write_file(str(tool_input['path']), str(tool_input['content']))
        if name == 'edit_file':
            return _exec_edit_file(
                str(tool_input['path']),
                str(tool_input['old_string']),
                str(tool_input['new_string']),
            )
        if name == 'grep':
            return _exec_grep(
                str(tool_input['pattern']),
                str(tool_input.get('path', '.')),
                tool_input.get('include'),
            )
        if name == 'find_files':
            return _exec_find_files(
                str(tool_input['pattern']),
                str(tool_input.get('path', '.')),
            )
        if name == 'list_dir':
            return _exec_list_dir(str(tool_input.get('path', '.')))
        return ToolExecResult(content=f'Unknown tool: {name}', is_error=True)
    except Exception as exc:
        return ToolExecResult(content=f'Error: {exc}', is_error=True)


def _exec_bash(command: str) -> ToolExecResult:
    blocked = ('rm -rf /', 'mkfs', ':(){', 'dd if=/dev/zero')
    for danger in blocked:
        if danger in command:
            return ToolExecResult(content=f'Blocked: dangerous command pattern "{danger}"', is_error=True)
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=os.getcwd(),
        )
        output = result.stdout
        if result.stderr:
            output += f'\n[stderr]\n{result.stderr}'
        if result.returncode != 0:
            output += f'\n[exit code: {result.returncode}]'
        return ToolExecResult(content=output.strip() or '(no output)')
    except subprocess.TimeoutExpired:
        return ToolExecResult(content='Command timed out after 120s', is_error=True)


def _exec_read_file(path: str, offset: int = 0, limit: object = None) -> ToolExecResult:
    p = Path(path).resolve()
    if not p.exists():
        return ToolExecResult(content=f'File not found: {p}', is_error=True)
    if not p.is_file():
        return ToolExecResult(content=f'Not a file: {p}', is_error=True)
    lines = p.read_text(encoding='utf-8', errors='replace').splitlines()
    end = offset + int(limit) if limit is not None else len(lines)
    selected = lines[offset:end]
    numbered = [f'{i + offset + 1:>5}\t{line}' for i, line in enumerate(selected)]
    return ToolExecResult(content='\n'.join(numbered) or '(empty file)')


def _exec_write_file(path: str, content: str) -> ToolExecResult:
    p = Path(path).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
    return ToolExecResult(content=f'Wrote {len(content)} bytes to {p}')


def _exec_edit_file(path: str, old_string: str, new_string: str) -> ToolExecResult:
    p = Path(path).resolve()
    if not p.exists():
        return ToolExecResult(content=f'File not found: {p}', is_error=True)
    text = p.read_text(encoding='utf-8', errors='replace')
    count = text.count(old_string)
    if count == 0:
        return ToolExecResult(content='old_string not found in file', is_error=True)
    if count > 1:
        return ToolExecResult(content=f'old_string found {count} times — must be unique', is_error=True)
    new_text = text.replace(old_string, new_string, 1)
    p.write_text(new_text, encoding='utf-8')
    return ToolExecResult(content=f'Edited {p} (1 replacement)')


def _exec_grep(pattern: str, path: str, include: object = None) -> ToolExecResult:
    base = Path(path).resolve()
    if not base.exists():
        return ToolExecResult(content=f'Path not found: {base}', is_error=True)
    try:
        regex = re.compile(pattern)
    except re.error as exc:
        return ToolExecResult(content=f'Invalid regex: {exc}', is_error=True)

    results: list[str] = []
    files = [base] if base.is_file() else sorted(base.rglob(str(include) if include else '*'))
    for fp in files:
        if not fp.is_file():
            continue
        try:
            for i, line in enumerate(fp.read_text(encoding='utf-8', errors='replace').splitlines(), 1):
                if regex.search(line):
                    results.append(f'{fp}:{i}: {line}')
                    if len(results) >= 200:
                        results.append('... (truncated at 200 matches)')
                        return ToolExecResult(content='\n'.join(results))
        except (OSError, UnicodeDecodeError):
            continue
    return ToolExecResult(content='\n'.join(results) or 'No matches found')


def _exec_find_files(pattern: str, path: str) -> ToolExecResult:
    base = Path(path).resolve()
    matches = sorted(str(p) for p in base.glob(pattern) if p.is_file())[:200]
    return ToolExecResult(content='\n'.join(matches) or 'No files matched')


def _exec_list_dir(path: str) -> ToolExecResult:
    p = Path(path).resolve()
    if not p.is_dir():
        return ToolExecResult(content=f'Not a directory: {p}', is_error=True)
    entries: list[str] = []
    for item in sorted(p.iterdir()):
        if item.is_dir():
            entries.append(f'  {item.name}/')
        else:
            size = item.stat().st_size
            entries.append(f'  {item.name}  ({size:,} bytes)')
    return ToolExecResult(content='\n'.join(entries) or '(empty directory)')


def tool_defs_for_api() -> list[dict[str, object]]:
    """Return tool definitions in Anthropic API format."""
    return [
        {
            'name': t.name,
            'description': t.description,
            'input_schema': t.input_schema,
        }
        for t in TOOL_DEFS
    ]

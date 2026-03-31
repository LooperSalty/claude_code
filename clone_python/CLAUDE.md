# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claw Code is a clean-room Python rewrite of Claude Code's agent harness. It mirrors the architectural patterns (commands, tools, runtime, query engine) without copying proprietary source. The project is in active porting state — not yet a full runtime-equivalent replacement. A Rust port is in progress on the `dev/rust` branch.

## Commands

```bash
# Run all tests
python3 -m unittest discover -s tests -v

# Render porting summary
python3 -m src.main summary

# Print workspace manifest
python3 -m src.main manifest

# Parity audit (compares against local archive if present)
python3 -m src.main parity-audit

# List commands/tools
python3 -m src.main commands --limit 10
python3 -m src.main tools --limit 10

# Route a prompt to matching commands/tools
python3 -m src.main route "review MCP tool" --limit 5

# Bootstrap a runtime session
python3 -m src.main bootstrap "review MCP tool" --limit 5

# Run a multi-turn loop
python3 -m src.main turn-loop "review MCP tool" --max-turns 3
```

## Architecture

**Pure Python, no external dependencies.** Standard library only (dataclasses, json, pathlib, argparse, uuid, unittest).

### Core Pipeline

1. **`main.py`** — CLI entrypoint, argparse-based dispatcher for all subcommands
2. **`runtime.py`** — `PortRuntime` orchestrates the full session lifecycle: prompt routing → command/tool matching → execution → turn loop → session persistence
3. **`query_engine.py`** — `QueryEnginePort` manages turn state, budget tracking, transcript compaction, structured output, and streaming via `stream_submit_message`
4. **`execution_registry.py`** — `ExecutionRegistry` wraps command/tool inventories into executable shims (`MirroredCommand`, `MirroredTool`)

### Data Layer

- **`models.py`** — Frozen dataclasses: `PortingModule`, `Subsystem`, `PermissionDenial`, `UsageSummary`, `PortingBacklog`
- **`commands.py` / `tools.py`** — Load mirrored inventories from JSON snapshots in `src/reference_data/`, provide filtering (permission context, simple mode, MCP exclusion), search, and execution
- **`session_store.py`** — JSON-based session persistence in `.port_sessions/`
- **`transcript.py`** — Append-only transcript with compaction and flush

### Subsystem Stubs

Directories under `src/` (e.g., `assistant/`, `bridge/`, `utils/`, `hooks/`, `plugins/`, `skills/`, `vim/`, `voice/`) are stub packages (`__init__.py` only) that mirror the original TypeScript directory structure. They expose `MODULE_COUNT` and `SAMPLE_FILES` metadata for parity tracking.

### Parity Tracking

- **`parity_audit.py`** — Compares Python workspace surface against `src/reference_data/archive_surface_snapshot.json` (root files, directories, command/tool counts)
- **`port_manifest.py`** — Introspects `src/` to count Python files per module
- Reference data: `commands_snapshot.json` (~150+ entries), `tools_snapshot.json` (~100+ entries), `archive_surface_snapshot.json`

### Supporting Modules

- **`setup.py`** — Workspace setup report with prefetch side-effects and deferred init
- **`context.py`** — `PortContext` dataclass for source/test/asset/archive paths
- **`permissions.py`** — `ToolPermissionContext` for deny-list filtering by name/prefix
- **`command_graph.py` / `tool_pool.py` / `bootstrap_graph.py`** — Graph/pool visualization helpers
- **`remote_runtime.py` / `direct_modes.py`** — Simulated remote/SSH/teleport/direct-connect/deep-link runtime modes

## Key Patterns

- All dataclasses use `frozen=True` for immutability
- Snapshot data is loaded via `@lru_cache(maxsize=1)` for single-load semantics
- `PortRuntime.route_prompt` scores commands/tools by token overlap with the prompt
- `QueryEnginePort` enforces `max_turns` and `max_budget_tokens` limits, compacts after `compact_after_turns`
- Session bootstrap emits structured `RuntimeSession` with full history log

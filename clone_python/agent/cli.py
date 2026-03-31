"""Claw Agent — Interactive CLI agent with real tools and LLM."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from .client import run_agent_loop
from .models import SessionConfig, ToolCall, UsageStats
from .session import list_sessions, load_session, new_session_id, save_session
from .tools import ToolExecResult


# ---------------------------------------------------------------------------
# ANSI colors
# ---------------------------------------------------------------------------

RESET = '\033[0m'
BOLD = '\033[1m'
DIM = '\033[2m'
RED = '\033[31m'
GREEN = '\033[32m'
YELLOW = '\033[33m'
BLUE = '\033[34m'
MAGENTA = '\033[35m'
CYAN = '\033[36m'


# ---------------------------------------------------------------------------
# System prompt — personalized for ANAKIN
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Tu es Claw, un agent CLI autonome et efficace. Tu assistes ANAKIN dans ses taches de developpement logiciel.

## Style
- Reponds en francais
- Sois direct, concis, efficace — pas de blabla
- Agis de maniere 100% autonome — n'attends pas de permission
- Utilise les outils disponibles pour explorer, lire, modifier le code

## Outils disponibles
Tu as acces a : bash, read_file, write_file, edit_file, grep, find_files, list_dir
Utilise-les sans hesiter pour accomplir les taches.

## Principes de code
- Immutabilite : cree de nouveaux objets plutot que de muter
- Petits fichiers : 200-400 lignes typique, 800 max
- Gestion d'erreurs exhaustive a chaque niveau
- Validation des inputs aux frontieres systeme
- Pas de secrets hardcodes — toujours des variables d'environnement
- Fonctions courtes (<50 lignes), pas de nesting profond (>4 niveaux)

## Securite
Avant tout commit, verifie : pas de secrets, inputs valides, pas d'injection SQL/XSS/CSRF.

## Repertoire de travail
""" + str(Path.cwd())


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def _print_banner() -> None:
    print(f"""
{MAGENTA}{BOLD}  ▄████▄   ██▓    ▄▄▄       █     █░
 ▒██▀ ▀█  ▓██▒   ▒████▄    ▓█░ █ ░█░
 ▒▓█    ▄ ▒██░   ▒██  ▀█▄  ▒█░ █ ░█
 ▒▓▓▄ ▄██▒▒██░   ░██▄▄▄▄██ ░█░ █ ░█
 ▒ ▓███▀ ░░██████▒▓█   ▓██▒░░██▒██▓
 ░ ░▒ ▒  ░░ ▒░▓  ░▒▒   ▓▒█░░ ▓░▒ ▒
   ░  ▒   ░ ░ ▒  ░ ▒   ▒▒ ░  ▒ ░ ░
 ░          ░ ░    ░   ▒     ░   ░
 ░ ░          ░  ░     ░  ░    ░
 ░{RESET}
{DIM}  Agent CLI autonome — Ctrl+C pour quitter{RESET}
{DIM}  /help /sessions /save /clear /model{RESET}
""")


def _print_tool_call(tc: ToolCall) -> None:
    label = f'{CYAN}{BOLD}[{tc.name}]{RESET}'
    detail = ''
    if tc.name == 'bash':
        detail = f" {DIM}${RESET} {tc.input.get('command', '')}"
    elif tc.name == 'read_file':
        detail = f" {DIM}{tc.input.get('path', '')}{RESET}"
    elif tc.name == 'write_file':
        detail = f" {DIM}{tc.input.get('path', '')}{RESET}"
    elif tc.name == 'edit_file':
        detail = f" {DIM}{tc.input.get('path', '')}{RESET}"
    elif tc.name == 'grep':
        detail = f" {DIM}/{tc.input.get('pattern', '')}/{RESET}"
    elif tc.name == 'find_files':
        detail = f" {DIM}{tc.input.get('pattern', '')}{RESET}"
    elif tc.name == 'list_dir':
        detail = f" {DIM}{tc.input.get('path', '.')}{RESET}"
    print(f'  {label}{detail}')


def _print_tool_result(tc: ToolCall, result: ToolExecResult) -> None:
    lines = result.content.splitlines()
    color = RED if result.is_error else DIM
    preview = lines[:5]
    for line in preview:
        print(f'  {color}  {line}{RESET}')
    if len(lines) > 5:
        print(f'  {color}  ... ({len(lines) - 5} more lines){RESET}')


def _print_usage(usage: UsageStats) -> None:
    print(f'{DIM}  [{usage.input_tokens} in / {usage.output_tokens} out]{RESET}')


# ---------------------------------------------------------------------------
# Slash commands
# ---------------------------------------------------------------------------

def _handle_slash(cmd: str, session_id: str, messages: list, total_usage: UsageStats, config: SessionConfig) -> tuple[bool, SessionConfig]:
    parts = cmd.strip().split(maxsplit=1)
    command = parts[0].lower()

    if command == '/help':
        print(f"""
{BOLD}Commandes:{RESET}
  /help        — cette aide
  /clear       — reinitialiser la conversation
  /save        — sauvegarder la session
  /sessions    — lister les sessions sauvegardees
  /load <id>   — charger une session
  /model <m>   — changer de modele (ex: claude-sonnet-4-20250514)
  /usage       — afficher les tokens consommes
  /cd <path>   — changer de repertoire
  Ctrl+C       — quitter
""")
        return True, config

    if command == '/clear':
        messages.clear()
        print(f'{YELLOW}Conversation reinitalisee.{RESET}')
        return True, config

    if command == '/save':
        path = save_session(session_id, messages, total_usage.input_tokens, total_usage.output_tokens)
        print(f'{GREEN}Session sauvegardee : {path}{RESET}')
        return True, config

    if command == '/sessions':
        sessions = list_sessions()
        if not sessions:
            print(f'{DIM}Aucune session sauvegardee.{RESET}')
        else:
            for sid in sessions:
                print(f'  {sid}')
        return True, config

    if command == '/load':
        if len(parts) < 2:
            print(f'{RED}Usage: /load <session_id>{RESET}')
            return True, config
        try:
            stored = load_session(parts[1])
            messages.clear()
            messages.extend(stored.messages)
            print(f'{GREEN}Session chargee : {stored.session_id} ({len(stored.messages)} messages){RESET}')
        except FileNotFoundError:
            print(f'{RED}Session introuvable : {parts[1]}{RESET}')
        return True, config

    if command == '/model':
        if len(parts) < 2:
            print(f'{DIM}Modele actuel : {config.model}{RESET}')
            return True, config
        new_config = SessionConfig(
            model=parts[1],
            max_tokens=config.max_tokens,
            max_tool_rounds=config.max_tool_rounds,
            system_prompt=config.system_prompt,
        )
        print(f'{GREEN}Modele change : {parts[1]}{RESET}')
        return True, new_config

    if command == '/usage':
        print(f'{DIM}Tokens : {total_usage.input_tokens} in / {total_usage.output_tokens} out{RESET}')
        return True, config

    if command == '/cd':
        if len(parts) < 2:
            print(f'{DIM}CWD: {os.getcwd()}{RESET}')
            return True, config
        try:
            os.chdir(parts[1])
            print(f'{GREEN}CWD: {os.getcwd()}{RESET}')
        except OSError as exc:
            print(f'{RED}Erreur: {exc}{RESET}')
        return True, config

    print(f'{RED}Commande inconnue : {command}{RESET}')
    return True, config


# ---------------------------------------------------------------------------
# Main REPL
# ---------------------------------------------------------------------------

def main() -> int:
    _print_banner()

    session_id = new_session_id()
    messages: list[dict[str, object]] = []
    total_usage = UsageStats()
    config = SessionConfig(system_prompt=SYSTEM_PROMPT)

    print(f'{DIM}  Session : {session_id}{RESET}')
    print(f'{DIM}  Modele  : {config.model}{RESET}')
    print(f'{DIM}  CWD     : {os.getcwd()}{RESET}')
    print()

    while True:
        try:
            user_input = input(f'{GREEN}{BOLD}anakin>{RESET} ').strip()
        except (KeyboardInterrupt, EOFError):
            print(f'\n{DIM}A+{RESET}')
            save_session(session_id, messages, total_usage.input_tokens, total_usage.output_tokens)
            return 0

        if not user_input:
            continue

        if user_input.startswith('/'):
            handled, config = _handle_slash(user_input, session_id, messages, total_usage, config)
            if handled:
                continue

        messages.append({'role': 'user', 'content': user_input})

        print()
        start = time.monotonic()

        try:
            text, usage = run_agent_loop(
                messages=messages,
                config=config,
                on_text=None,
                on_tool_call=_print_tool_call,
                on_tool_result=_print_tool_result,
            )
        except Exception as exc:
            print(f'{RED}Erreur API : {exc}{RESET}')
            messages.pop()
            continue

        total_usage = total_usage.add(usage.input_tokens, usage.output_tokens)
        elapsed = time.monotonic() - start

        # Append final assistant response
        messages.append({'role': 'assistant', 'content': text})

        print()
        print(f'{BOLD}{text}{RESET}')
        print()
        _print_usage(usage)
        print(f'{DIM}  [{elapsed:.1f}s]{RESET}')
        print()


if __name__ == '__main__':
    raise SystemExit(main())

# Architecture

## Vue d'ensemble

```
src/
 |-- main.py                  CLI entrypoint (argparse)
 |-- runtime.py               Orchestration du pipeline complet
 |-- query_engine.py          Gestion de tours, budget, streaming
 |-- execution_registry.py    Registre d'exécution commandes/outils
 |-- commands.py              Inventaire des commandes (JSON snapshot)
 |-- tools.py                 Inventaire des outils (JSON snapshot)
 |-- models.py                Dataclasses partagées
 |-- context.py               Contexte du workspace (chemins, compteurs)
 |-- setup.py                 Setup workspace (Python, plateforme, prefetch)
 |-- session_store.py         Persistence JSON des sessions
 |-- transcript.py            Transcript append-only avec compaction
 |-- parity_audit.py          Audit de parité Python vs TypeScript
 |-- port_manifest.py         Introspection du workspace Python
 |-- permissions.py           Filtrage d'outils par deny-list
 |-- execution_registry.py    Shims exécutables pour commandes/outils
 |-- reference_data/          Snapshots JSON (commandes, outils, surface)
 |-- [30+ sous-packages]      Stubs miroir de la hiérarchie TypeScript
```

## Pipeline core

### 1. Entrée CLI (`main.py`)

Le point d'entrée parse les arguments via `argparse` et dispatch vers le bon handler. Chaque sous-commande retourne un code de sortie (`0` = succès, `1` = erreur, `2` = commande inconnue).

### 2. Runtime (`runtime.py`)

`PortRuntime` orchestre le cycle de vie complet d'une session :

```
Prompt utilisateur
    |
    v
route_prompt()          -- Score commandes/outils par overlap de tokens
    |
    v
bootstrap_session()     -- Construit le contexte, setup, routing, exécution
    |                      Produit un RuntimeSession complet
    v
run_turn_loop()         -- Boucle multi-tours avec QueryEnginePort
```

**Scoring** : chaque token du prompt est comparé (inclusion de sous-chaîne) aux champs `name`, `source_hint`, et `responsibility` de chaque `PortingModule`. Les résultats sont triés par score décroissant.

**Session** : `RuntimeSession` est un dataclass qui agrège contexte, setup, historique, matches routés, résultats de tours, événements de stream, et chemin de session persistée.

### 3. Query Engine (`query_engine.py`)

`QueryEnginePort` gère l'état conversationnel :

- **Limites** : `max_turns` (8 par défaut), `max_budget_tokens` (2000), `compact_after_turns` (12)
- **submit_message()** : traite un prompt, vérifie les limites, met à jour l'usage, compacte si nécessaire
- **stream_submit_message()** : générateur SSE qui émet `message_start`, `command_match`, `tool_match`, `permission_denial`, `message_delta`, `message_stop`
- **Sortie structurée** : mode JSON avec retry automatique
- **Persistence** : `persist_session()` flush le transcript et sauvegarde en JSON

### 4. Registre d'exécution (`execution_registry.py`)

`ExecutionRegistry` encapsule les inventaires dans des objets exécutables :

- `MirroredCommand.execute(prompt)` -> message descriptif
- `MirroredTool.execute(payload)` -> message descriptif

Ce sont des shims : ils décrivent ce que l'original ferait, sans exécuter réellement.

## Couche de données

### Modèles (`models.py`)

Tous les dataclasses utilisent `frozen=True` pour l'immutabilité :

| Classe | Rôle |
|--------|------|
| `Subsystem` | Module Python avec nom, chemin, nombre de fichiers, notes |
| `PortingModule` | Entrée miroir (nom, responsabilité, source_hint, status) |
| `PermissionDenial` | Outil refusé avec raison |
| `UsageSummary` | Compteurs input/output tokens (immutable, `add_turn` retourne une nouvelle instance) |
| `PortingBacklog` | Titre + liste de modules (seul dataclass mutable) |

### Snapshots (`reference_data/`)

Trois fichiers JSON chargés au démarrage via `@lru_cache(maxsize=1)` :

- `commands_snapshot.json` — 207 entrées de commandes
- `tools_snapshot.json` — 184 entrées d'outils
- `archive_surface_snapshot.json` — métadonnées de surface pour l'audit de parité

### Sessions (`session_store.py`)

Sessions persistées en JSON dans `.port_sessions/` :

```json
{
  "session_id": "abc123...",
  "messages": ["prompt1", "prompt2"],
  "input_tokens": 42,
  "output_tokens": 28
}
```

## Sous-systèmes stubs

Les répertoires suivants sont des packages Python minimaux (`__init__.py` uniquement) qui miroir la structure du code TypeScript original :

`assistant`, `bootstrap`, `bridge`, `buddy`, `cli`, `components`, `constants`, `coordinator`, `entrypoints`, `hooks`, `keybindings`, `memdir`, `migrations`, `moreright`, `native_ts`, `outputStyles`, `plugins`, `remote`, `schemas`, `screens`, `server`, `services`, `skills`, `state`, `types`, `upstreamproxy`, `utils`, `vim`, `voice`

Chacun expose `MODULE_COUNT` et `SAMPLE_FILES` pour le suivi de parité.

## Modules de support

| Module | Rôle |
|--------|------|
| `setup.py` | Rapport de setup : version Python, plateforme, prefetch, deferred init |
| `context.py` | `PortContext` : chemins source/tests/assets/archive, compteurs |
| `permissions.py` | `ToolPermissionContext` : filtrage par nom exact ou préfixe |
| `port_manifest.py` | Introspection de `src/` : compte les fichiers Python par module |
| `parity_audit.py` | Compare la surface Python vs archive TS (fichiers racine, répertoires, commandes, outils) |
| `command_graph.py` | Visualisation du graphe de segmentation des commandes |
| `tool_pool.py` | Assemblage et visualisation du pool d'outils |
| `bootstrap_graph.py` | Graphe des étapes bootstrap/runtime |
| `remote_runtime.py` | Modes simulés : remote, SSH, teleport |
| `direct_modes.py` | Modes simulés : direct-connect, deep-link |
| `transcript.py` | Store append-only avec compaction et flush |
| `history.py` | Log d'historique avec entrées horodatées |
| `prefetch.py` | Prefetch side-effects simulés (MDM, keychain, project scan) |
| `deferred_init.py` | Initialisation différée (plugins, hooks) gated par trust |
| `cost_tracker.py` | Suivi des coûts (stub) |
| `costHook.py` | Hook de coût (stub) |

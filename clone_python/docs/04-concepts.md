# Concepts clés

## Mirroring vs Implémentation

Claw Code utilise une approche de **mirroring** : il catalogue et reproduit la structure du système original sans en implémenter la logique runtime. Chaque commande et outil est un "miroir" qui sait :

- Son **nom** (ex: `review`, `MCPTool`)
- Sa **responsabilité** (ce que l'original fait)
- Son **source_hint** (chemin TypeScript d'origine)
- Son **status** (`mirrored`)

## Routing de prompts

Le routing est le mécanisme central pour associer un prompt utilisateur aux commandes/outils pertinents :

1. Le prompt est tokenisé (split sur espaces, `/`, `-`)
2. Chaque token est comparé par inclusion de sous-chaîne aux champs de chaque module
3. Un score est calculé (nombre de tokens matchés)
4. Les résultats sont triés par score décroissant
5. Au moins une commande et un outil sont sélectionnés si disponibles

## Gestion de tours

Le query engine impose des limites strictes :

- **max_turns** (8) : nombre maximum de messages dans une session
- **max_budget_tokens** (2000) : budget total en tokens (estimation par split de mots)
- **compact_after_turns** (12) : seuil de compaction du transcript

Quand une limite est atteinte, le `stop_reason` passe de `completed` à `max_turns_reached` ou `max_budget_reached`.

## Streaming SSE

`stream_submit_message()` est un générateur Python qui émet des événements séquentiels :

```
message_start   -> {session_id, prompt}
command_match    -> {commands: [...]}       (si applicable)
tool_match       -> {tools: [...]}          (si applicable)
permission_denial -> {denials: [...]}       (si applicable)
message_delta    -> {text: "..."}
message_stop     -> {usage, stop_reason, transcript_size}
```

## Permission denials

Certains outils peuvent être refusés selon le contexte :

- **Par deny-list** : `ToolPermissionContext` bloque par nom exact ou préfixe
- **Par inférence** : le runtime détecte automatiquement les outils destructifs (ex: outils contenant "bash") et les gate

## Audit de parité

L'audit compare automatiquement la surface du workspace Python contre des snapshots de référence :

| Métrique | Description |
|----------|-------------|
| Root file coverage | Fichiers racine TS mappés vers Python (ex: `main.tsx` -> `main.py`) |
| Directory coverage | Répertoires TS mappés vers packages Python |
| Total file ratio | Nombre de fichiers Python vs fichiers TS-like |
| Command entry ratio | Entrées de commandes miroir vs originales |
| Tool entry ratio | Entrées d'outils miroir vs originales |

## Immutabilité

Tous les dataclasses de données utilisent `frozen=True`. La mutation est évitée :

```python
# UsageSummary.add_turn retourne une NOUVELLE instance
new_usage = usage.add_turn(prompt, output)  # l'original est inchangé
```

Seuls `QueryEnginePort` et `PortingBacklog` sont mutables (état de session conversationnelle).

## Sessions et persistence

Les sessions sont sérialisées en JSON dans `.port_sessions/`. Le cycle de vie :

1. `QueryEnginePort` accumule messages et usage
2. `flush_transcript()` marque le transcript comme flushed
3. `persist_session()` sauvegarde en JSON
4. `load_session(session_id)` restaure depuis le fichier
5. `QueryEnginePort.from_saved_session()` reconstruit le moteur depuis une session sauvegardée

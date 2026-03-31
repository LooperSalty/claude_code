# Mapping TypeScript -> Python

## Fichiers racine

| Fichier TypeScript original | Fichier Python |
|---------------------------|----------------|
| `QueryEngine.ts` | `QueryEngine.py` |
| `Task.ts` | `task.py` |
| `Tool.ts` | `Tool.py` |
| `commands.ts` | `commands.py` |
| `context.ts` | `context.py` |
| `cost-tracker.ts` | `cost_tracker.py` |
| `costHook.ts` | `costHook.py` |
| `dialogLaunchers.tsx` | `dialogLaunchers.py` |
| `history.ts` | `history.py` |
| `ink.ts` | `ink.py` |
| `interactiveHelpers.tsx` | `interactiveHelpers.py` |
| `main.tsx` | `main.py` |
| `projectOnboardingState.ts` | `projectOnboardingState.py` |
| `query.ts` | `query.py` |
| `replLauncher.tsx` | `replLauncher.py` |
| `setup.ts` | `setup.py` |
| `tasks.ts` | `tasks.py` |
| `tools.ts` | `tools.py` |

## Répertoires

| Répertoire TypeScript | Package Python |
|----------------------|----------------|
| `assistant/` | `assistant/` |
| `bootstrap/` | `bootstrap/` |
| `bridge/` | `bridge/` |
| `buddy/` | `buddy/` |
| `cli/` | `cli/` |
| `commands/` | `commands.py` (agrégé) |
| `components/` | `components/` |
| `constants/` | `constants/` |
| `context/` | `context.py` (agrégé) |
| `coordinator/` | `coordinator/` |
| `entrypoints/` | `entrypoints/` |
| `hooks/` | `hooks/` |
| `ink/` | `ink.py` (agrégé) |
| `keybindings/` | `keybindings/` |
| `memdir/` | `memdir/` |
| `migrations/` | `migrations/` |
| `moreright/` | `moreright/` |
| `native-ts/` | `native_ts/` |
| `outputStyles/` | `outputStyles/` |
| `plugins/` | `plugins/` |
| `query/` | `query.py` (agrégé) |
| `remote/` | `remote/` |
| `schemas/` | `schemas/` |
| `screens/` | `screens/` |
| `server/` | `server/` |
| `services/` | `services/` |
| `skills/` | `skills/` |
| `state/` | `state/` |
| `tasks/` | `tasks.py` (agrégé) |
| `tools/` | `tools.py` (agrégé) |
| `types/` | `types/` |
| `upstreamproxy/` | `upstreamproxy/` |
| `utils/` | `utils/` |
| `vim/` | `vim/` |
| `voice/` | `voice/` |

## Conventions de nommage

- Les tirets TypeScript deviennent des underscores Python (`native-ts` -> `native_ts`, `cost-tracker` -> `cost_tracker`)
- Les extensions `.ts`/`.tsx` deviennent `.py`
- Certains répertoires TS sont agrégés en un seul fichier Python quand leur contenu est résumable en un module

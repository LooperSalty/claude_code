# Claude Code - Source Code Analysis

> Analyse et documentation du code source de **Claude Code**, le CLI officiel d'Anthropic pour Claude.

## Contenu du depot

```
claude_code/
├── src/                    # Code source complet (~1 900 fichiers TypeScript)
│   ├── main.tsx            # Point d'entree principal
│   ├── QueryEngine.ts      # Moteur de requetes (boucle tour par tour)
│   ├── Tool.ts             # Interface abstraite des outils
│   ├── tools/              # 43+ outils (Bash, Read, Edit, Agent, Grep...)
│   ├── commands/           # 100+ commandes slash (/commit, /review...)
│   ├── skills/             # Systeme de skills extensible
│   ├── services/           # API Claude, MCP, analytics, compaction
│   ├── state/              # Gestion d'etat immutable (React store)
│   ├── components/         # 111+ composants UI terminal (React/Ink)
│   ├── hooks/              # 75+ hooks React
│   ├── coordinator/        # Orchestration multi-agent
│   ├── cli/                # Interface CLI (REPL, SDK, headless)
│   ├── constants/          # Constantes globales
│   ├── types/              # Definitions de types
│   ├── utils/              # 30+ sous-dossiers d'utilitaires
│   └── ...
│
└── docs/                   # Documentation technique
    ├── DOCUMENTATION.md    # Doc complete en Markdown (58 Ko)
    ├── DOCUMENTATION.docx  # Doc complete en Word (50 Ko)
    └── generate_docx.py    # Script de generation du .docx
```

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Langage | TypeScript (JSX/TSX) |
| Runtime | Bun (principal) / Node.js 18+ (fallback) |
| UI | React + Ink (rendu terminal) |
| API | @anthropic-ai/sdk (Direct, Bedrock, Vertex, Foundry) |
| Protocole | @modelcontextprotocol/sdk (MCP) |
| Validation | Zod |
| Telemetrie | OpenTelemetry |

## Architecture

```
Utilisateur → CLI (main.tsx) → Parsing commande
  → Verification permissions → QueryEngine
  → Selection et execution d'outils (60+)
  → Appel API Claude (streaming SSE)
  → Mise a jour etat → Rendu terminal (Ink/React)
```

## Fonctionnalites

- **60+ outils** : fichiers, bash, recherche web, agents, REPL, MCP
- **100+ commandes** : /commit, /review, /mcp, /plan, /skills...
- **Multi-agent** : sous-agents, equipes (swarms), coordinateur, worktrees
- **MCP** : 5 transports (stdio, SSE, HTTP, WebSocket, SDK)
- **Permissions** : 7 modes, pipeline multicouche, classificateur auto
- **Compaction** : gestion automatique de la fenetre de contexte
- **Suivi des couts** : tokens et prix par modele en temps reel
- **Sessions** : persistance, resume, historique

## Documentation

La documentation complete (15 sections + 4 annexes) est disponible dans le dossier `docs/` :
- Architecture detaillee de chaque module
- Schemas d'entree de tous les outils
- Diagrammes de flux (requete, permissions, multi-agent)
- Types et interfaces cles
- Feature gates et constantes

## Note

Ce depot contient le **code source decompile** de Claude Code a des fins d'analyse et de documentation.
Le code ne peut pas etre build directement car il depend du bundler Bun avec des feature gates
(`bun:bundle`), de packages internes Anthropic, et de configurations de build non publiques.

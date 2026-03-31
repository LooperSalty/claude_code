# Claude Code - Documentation Technique Complete

> **Version analysee** : Code source depuis `src/` (~1 884 fichiers TypeScript, ~33 Mo)
>
> Ce document couvre l'architecture, les systemes internes, les interfaces, les flux de donnees
> et les patterns de conception du CLI Claude Code d'Anthropic.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture des dossiers](#3-architecture-des-dossiers)
4. [Flux d'initialisation (Bootstrap)](#4-flux-dinitialisation-bootstrap)
5. [Moteur de requetes (QueryEngine & Query)](#5-moteur-de-requetes)
6. [Systeme d'outils (Tools)](#6-systeme-doutils)
7. [Commandes & Skills](#7-commandes--skills)
8. [Services](#8-services)
9. [Gestion d'etat (State)](#9-gestion-detat)
10. [UI & Composants (Ink + React)](#10-ui--composants)
11. [Multi-agent & Coordination](#11-multi-agent--coordination)
12. [Securite & Permissions](#12-securite--permissions)
13. [Utilitaires & Constantes](#13-utilitaires--constantes)
14. [Patterns architecturaux](#14-patterns-architecturaux)
15. [Diagrammes de flux](#15-diagrammes-de-flux)

---

## 1. Vue d'ensemble

Claude Code est un **CLI interactif d'assistance au developpement logiciel** construit par Anthropic. Il fournit une interface conversationnelle dans le terminal, connectee aux modeles Claude via l'API Anthropic, avec un systeme extensible de 60+ outils, 100+ commandes, et un support multi-agent.

### Fonctionnalites principales

| Categorie | Fonctionnalites |
|-----------|----------------|
| **Outils fichiers** | Lecture, ecriture, edition, glob, grep, notebooks Jupyter |
| **Execution** | Bash, PowerShell, REPL JavaScript |
| **Recherche** | Web search, web fetch, grep de code |
| **IA** | Streaming API Claude, tool calling, agents autonomes |
| **Multi-agent** | Agents paralleles, equipes (swarms), coordination, worktrees Git |
| **MCP** | Connexion a des serveurs MCP (stdio, SSE, HTTP, WebSocket, SDK) |
| **Plugins** | Systeme de plugins installables (user, project, managed) |
| **Skills** | Commandes personnalisees chargeables depuis le disque |
| **Planification** | Mode plan avec verification d'execution |
| **Sessions** | Persistance, resume, historique, compaction de contexte |
| **Couts** | Suivi en temps reel des tokens et couts API par modele |
| **Securite** | Permissions granulaires, classificateur auto, hooks |
| **UI** | Interface terminal React/Ink avec themes, dialogs, diffs |

---

## 2. Stack technique

### Runtime & Langage

| Composant | Technologie |
|-----------|------------|
| Langage | TypeScript (avec JSX/TSX) |
| Runtime principal | Bun |
| Runtime secondaire | Node.js 18+ |
| Bundler | Bun bundler avec `bun:bundle` (feature gates / dead code elimination) |

### Dependances principales

| Package | Role |
|---------|------|
| `@anthropic-ai/sdk` | Client API Claude (Direct, Bedrock, Vertex, Foundry) |
| `@modelcontextprotocol/sdk` | Protocole MCP (Model Context Protocol) |
| `react` + `ink` | Rendu UI terminal (React dans le terminal) |
| `zod` | Validation de schemas (inputs outils, configs) |
| `chalk` | Couleurs terminal |
| `commander` | Parsing arguments CLI |
| `lodash` | Utilitaires (memoize, debounce, etc.) |
| `@opentelemetry/*` | Telemetrie et tracing distribue |

---

## 3. Architecture des dossiers

```
src/
 ├── main.tsx                    # Point d'entree, bootstrap de l'application
 ├── setup.ts                    # Configuration de session (worktree, hooks, terminal)
 ├── QueryEngine.ts              # Boucle principale de requetes (tour par tour)
 ├── query.ts                    # Orchestration des requetes API
 ├── Tool.ts                     # Interface abstraite des outils
 ├── tools.ts                    # Registre et assemblage des outils
 ├── commands.ts                 # Registre des commandes slash
 ├── context.ts                  # Construction du contexte (git, memoire, systeme)
 ├── cost-tracker.ts             # Suivi des couts et tokens par modele
 ├── history.ts                  # Historique des sessions (JSONL)
 ├── Task.ts                     # Gestion des taches en arriere-plan
 ├── ink.ts                      # Wrapper Ink/React pour le rendu terminal
 │
 ├── entrypoints/
 │   └── init.ts                 # Initialisation systeme (configs, telemetrie, MDM)
 │
 ├── tools/                      # 43+ implementations d'outils
 │   ├── BashTool/               # Execution shell
 │   ├── FileReadTool/           # Lecture de fichiers
 │   ├── FileEditTool/           # Edition de fichiers (remplacement de texte)
 │   ├── FileWriteTool/          # Ecriture de fichiers
 │   ├── GlobTool/               # Recherche de fichiers par pattern
 │   ├── GrepTool/               # Recherche dans le contenu (regex)
 │   ├── AgentTool/              # Lancement de sous-agents
 │   ├── WebSearchTool/          # Recherche web
 │   ├── WebFetchTool/           # Telechargement de pages web
 │   ├── SkillTool/              # Invocation de skills
 │   ├── TodoWriteTool/          # Gestion de listes de taches
 │   ├── ToolSearchTool/         # Decouverte d'outils differes
 │   ├── EnterPlanModeTool/      # Passage en mode plan
 │   ├── ExitPlanModeTool/       # Sortie du mode plan
 │   ├── EnterWorktreeTool/      # Creation de worktree Git isole
 │   ├── ExitWorktreeTool/       # Sortie du worktree
 │   ├── SendMessageTool/        # Messagerie inter-agents
 │   ├── AskUserQuestionTool/    # Questions a l'utilisateur
 │   ├── NotebookEditTool/       # Edition de notebooks Jupyter
 │   ├── ScheduleCronTool/       # Taches planifiees (cron)
 │   ├── RemoteTriggerTool/      # Declencheurs distants
 │   ├── TeamCreateTool/         # Creation d'equipes (swarms)
 │   ├── TeamDeleteTool/         # Suppression d'equipes
 │   ├── PowerShellTool/         # Execution PowerShell
 │   ├── REPLTool/               # REPL JavaScript
 │   ├── LSPTool/                # Language Server Protocol
 │   ├── ListMcpResourcesTool/   # Listing ressources MCP
 │   ├── ReadMcpResourceTool/    # Lecture ressources MCP
 │   ├── BriefTool/              # Rapports synthetiques
 │   └── shared/                 # Utilitaires partages entre outils
 │
 ├── commands/                   # 100+ commandes slash
 │   ├── init/                   # /init
 │   ├── commit/                 # /commit
 │   ├── review/                 # /review
 │   ├── mcp/                    # /mcp
 │   ├── skills/                 # /skills
 │   ├── config/                 # /config
 │   ├── session/                # /session
 │   └── ...
 │
 ├── skills/                     # Systeme de skills
 │   ├── bundledSkills.ts        # Registre des skills integrees
 │   ├── loadSkillsDir.ts        # Chargement depuis le disque
 │   └── bundled/                # Skills integrees (batch, debug, loop, verify...)
 │
 ├── services/                   # Couche services
 │   ├── api/                    # Client API Claude (auth, streaming, erreurs)
 │   ├── mcp/                    # Gestion des serveurs MCP
 │   ├── analytics/              # GrowthBook, telemetrie, evenements
 │   ├── compact/                # Compaction automatique du contexte
 │   ├── plugins/                # Systeme de plugins
 │   ├── policyLimits/           # Limites d'utilisation
 │   ├── oauth/                  # Gestion des tokens OAuth
 │   ├── lsp/                    # Integration Language Server Protocol
 │   ├── PromptSuggestion/       # Suggestions de prompts pipelinees
 │   └── tools/                  # Orchestration d'execution d'outils
 │
 ├── state/                      # Gestion d'etat
 │   ├── AppStateStore.ts        # Store central immutable
 │   ├── AppState.tsx            # Provider React + contexte
 │   ├── onChangeAppState.ts     # Ecouteurs de changement d'etat
 │   ├── selectors.ts            # Selecteurs d'etat
 │   └── store.ts                # Factory de store
 │
 ├── components/                 # 111+ composants React/Ink
 │   ├── App.tsx                 # Composant racine
 │   ├── FullscreenLayout.tsx    # Layout principal de session
 │   ├── Message.tsx             # Affichage de messages
 │   ├── TextInput.tsx           # Saisie de texte
 │   ├── design-system/          # Systeme de design (ThemeProvider, ThemedBox...)
 │   ├── permissions/            # Dialogues de permission par outil
 │   ├── agents/                 # Wizard de creation d'agents
 │   ├── tasks/                  # Interface de gestion de taches
 │   └── ...
 │
 ├── hooks/                      # 75+ hooks React
 │   ├── toolPermission/         # Pipeline de permissions
 │   ├── notifs/                 # Notifications (rate limit, startup, MCP...)
 │   ├── useTextInput.ts         # Saisie de texte
 │   ├── useVimInput.ts          # Mode Vim
 │   ├── useHistorySearch.ts     # Ctrl+R recherche historique
 │   └── ...
 │
 ├── coordinator/                # Mode coordinateur multi-agent
 │   └── coordinatorMode.ts      # Orchestration des workers
 │
 ├── assistant/                  # Mode assistant (KAIROS)
 │
 ├── cli/                        # Interface CLI
 │   ├── print.ts                # Mode headless (non-interactif)
 │   ├── structuredIO.ts         # Protocole SDK (JSON-NDJSON)
 │   └── remoteIO.ts             # Sessions distantes (CCR)
 │
 ├── constants/                  # Constantes globales
 │   ├── system.ts               # Prefixes de prompt systeme
 │   ├── tools.ts                # Matrices d'outils par contexte
 │   ├── xml.ts                  # Tags XML pour messages
 │   └── ...
 │
 ├── types/                      # Definitions de types
 │   ├── command.ts              # Command, PromptCommand, LocalCommand
 │   ├── permissions.ts          # PermissionMode, PermissionRule
 │   └── ...
 │
 ├── migrations/                 # Migrations de modeles et configs
 │
 ├── utils/                      # 30+ sous-dossiers d'utilitaires
 │   ├── bash/                   # Parsing de commandes bash (AST)
 │   ├── git/                    # Operations Git
 │   ├── permissions/            # Systeme de permissions
 │   ├── settings/               # Gestion des parametres
 │   ├── model/                  # Selection et gestion des modeles
 │   ├── hooks/                  # Infrastructure de hooks
 │   ├── memory/                 # Gestion de la memoire
 │   ├── task/                   # Gestion des taches
 │   └── ...
 │
 ├── bridge/                     # Mode bridge (controle a distance)
 ├── remote/                     # Sessions distantes
 ├── voice/                      # Mode vocal (feature-gated)
 ├── plugins/                    # Systeme de plugins
 ├── memdir/                     # Repertoire de memoire
 └── vim/                        # Support mode Vim
```

---

## 4. Flux d'initialisation (Bootstrap)

### Sequence de demarrage

```
main.tsx entry
│
├── 1. PREFETCH PARALLELE (pas de await)
│   ├── startMdmRawRead()          → Lecture MDM (plutil/reg query)
│   └── startKeychainPrefetch()    → OAuth + cle API legacy
│
├── 2. CHARGEMENT DES IMPORTS (~135ms)
│   └── 135+ modules charges en parallele avec le prefetch
│
├── 3. init() [memoize - une seule fois]
│   ├── enableConfigs()
│   ├── applySafeConfigEnvironmentVariables()
│   ├── applyExtraCACertsFromConfig()
│   ├── setupGracefulShutdown()
│   ├── [async] Logging 1P evenements
│   ├── [async] populateOAuthAccountInfoIfNeeded()
│   ├── [async] initJetBrainsDetection()
│   ├── [async] detectCurrentRepository()
│   ├── [async] Remote managed settings
│   ├── [async] Policy limits init
│   ├── configureGlobalMTLS()
│   ├── configureGlobalAgents() (proxy HTTP)
│   ├── preconnectAnthropicApi() (warmup TCP+TLS)
│   └── initUpstreamProxy() [si CCR]
│
├── 4. setup(cwd, permissions, worktree, tmux)
│   ├── startUdsMessaging()        [si pas --bare]
│   ├── captureTeammateModeSnapshot()  [si swarms]
│   ├── checkAndRestoreTerminalBackup()
│   ├── setCwd()
│   ├── captureHooksConfigSnapshot()
│   ├── initializeFileChangedWatcher()
│   ├── createWorktreeForSession() [si --worktree]
│   ├── [bg] getCommands(), loadPluginHooks()
│   ├── [bg] registerAttributionHooks()
│   ├── [bg] startTeamMemoryWatcher()
│   ├── initSinks() (analytics + error log)
│   └── logEvent('tengu_started')
│
├── 5. RENDU
│   ├── Interactif → launchRepl() → React rendering loop
│   └── Headless   → runHeadless() via print.ts
│
└── 6. initializeTelemetryAfterTrust()
    ├── Attente remote managed settings
    ├── applyConfigEnvironmentVariables()
    └── setMeterState() (init OpenTelemetry)
```

### Prefixes du prompt systeme

| Contexte | Prefixe |
|----------|---------|
| Interactif (CLI) | `"You are Claude Code, Anthropic's official CLI for Claude."` |
| SDK (avec append) | `"You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK."` |
| SDK (sans append) | `"You are a Claude agent, built on Anthropic's Claude Agent SDK."` |
| Vertex API | Toujours le prefixe par defaut |

---

## 5. Moteur de requetes

### QueryEngine (`src/QueryEngine.ts`)

Classe principale qui orchestre la boucle tour par tour entre l'utilisateur, le modele et les outils.

```typescript
class QueryEngine {
  // Etat interne
  private mutableMessages: Message[]
  private abortController: AbortController
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage
  private discoveredSkillNames: Set<string>
  private loadedNestedMemoryPaths: Set<string>

  constructor(config: QueryEngineConfig)

  // Point d'entree principal - generateur async
  async *submitMessage(
    prompt: string,
    options?: { ... }
  ): AsyncIterable<StreamEvent | RequestStartEvent>

  // Finalisation de session
  async finalize(): Promise<SDKCompactMetadata>
}
```

### Configuration du QueryEngine

```typescript
type QueryEngineConfig = {
  cwd: string
  tools: Tools
  commands: Command[]
  mcpClients: MCPServerConnection[]
  agents: AgentDefinition[]
  canUseTool: CanUseToolFn
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  initialMessages?: Message[]
  readFileCache: FileStateCache
  customSystemPrompt?: string
  appendSystemPrompt?: string
  userSpecifiedModel?: string
  fallbackModel?: string
  thinkingConfig?: ThinkingConfig
  maxTurns?: number
  maxBudgetUsd?: number
  taskBudget?: { total: number }
  jsonSchema?: Record<string, unknown>
  verbose?: boolean
  abortController?: AbortController
}
```

### Boucle de requete (`src/query.ts`)

```typescript
async function* query(params: QueryParams): AsyncIterable<QueryResult>
```

**Flux d'un tour :**

```
1. Assemblage du prompt systeme (memoire, contexte, hooks)
2. Preparation du contexte utilisateur (git status, workdir)
3. Normalisation et validation des messages
4. Configuration du mode de permission
     │
     ▼
5. BOUCLE PAR TOUR:
   ├── Appel modele: queryModelWithStreaming()
   │   └── Yield de StreamEvent[]
   ├── Traitement des evenements (text, tool_use, erreurs)
   ├── Execution des outils: runTools() (streaming)
   ├── Verification de compaction: autoCompactIfNeeded()
   ├── Execution des hooks post-sampling
   ├── Suivi du budget (tokens/couts)
   └── Conditions d'arret: completion, erreur, max tours
     │
     ▼
6. FINALISATION
   ├── Flush des resultats d'outils en attente
   ├── Enregistrement des metriques
   └── Retour de l'etat final
```

### Seuils de compaction automatique

| Constante | Valeur | Role |
|-----------|--------|------|
| `AUTOCOMPACT_BUFFER_TOKENS` | 13 000 | Buffer pour la compaction auto |
| `WARNING_THRESHOLD_BUFFER_TOKENS` | 20 000 | Seuil d'avertissement |
| `ERROR_THRESHOLD_BUFFER_TOKENS` | 20 000 | Seuil d'erreur |
| `MANUAL_COMPACT_BUFFER_TOKENS` | 3 000 | Buffer pour compaction manuelle |
| `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES` | 3 | Disjoncteur (circuit breaker) |

---

## 6. Systeme d'outils

### Interface Tool (`src/Tool.ts`)

Chaque outil implemente cette interface. La fonction `buildTool()` fournit les valeurs par defaut.

```typescript
type Tool<Input, Output, Progress> = {
  // --- Identite ---
  name: string
  aliases?: string[]
  searchHint?: string        // 3-10 mots pour ToolSearch
  isMcp?: boolean
  shouldDefer?: boolean      // Outil differe (necessite ToolSearch)
  alwaysLoad?: boolean       // Jamais differe

  // --- Schema ---
  inputSchema: Input
  inputJSONSchema?: ToolInputJSONSchema
  outputSchema?: z.ZodType<unknown>

  // --- Execution ---
  call(args, context, canUseTool, parentMessage, onProgress?):
    Promise<ToolResult<Output>>

  // --- Descriptions ---
  description(input, options): Promise<string>
  prompt(options): Promise<string>
  userFacingName(input): string
  getActivityDescription?(input): string | null

  // --- Permissions ---
  checkPermissions(input, context): Promise<PermissionResult>
  validateInput?(input, context): Promise<ValidationResult>

  // --- Comportement ---
  isConcurrencySafe(input): boolean
  isEnabled(): boolean
  isReadOnly(input): boolean
  isDestructive?(input): boolean

  // --- Rendu UI ---
  renderToolUseMessage(input, options): React.ReactNode
  renderToolResultMessage?(output, progress, options): React.ReactNode
}
```

### Catalogue complet des outils

#### Outils toujours actifs

| Nom | Outil | Schema d'entree |
|-----|-------|-----------------|
| `Bash` | BashTool | `command` (string), `description?` (string), `timeout?` (number, max 600000), `run_in_background?` (boolean) |
| `Read` | FileReadTool | `file_path` (string), `offset?` (number), `limit?` (number), `pages?` (string) |
| `Edit` | FileEditTool | `file_path` (string), `old_string` (string), `new_string` (string), `replace_all?` (boolean) |
| `Write` | FileWriteTool | `file_path` (string), `content` (string) |
| `Glob` | GlobTool | `pattern` (string), `path?` (string) |
| `Grep` | GrepTool | `pattern` (string), `path?` (string), `glob?` (string), `output_mode?` (enum), `-i?` (boolean), `-n?` (boolean), `-A?`/`-B?`/`-C?` (number), `type?` (string), `head_limit?` (number), `multiline?` (boolean), `offset?` (number) |
| `Agent` | AgentTool | `description` (string), `prompt` (string), `subagent_type?` (string), `model?` (enum: sonnet/opus/haiku), `run_in_background?` (boolean), `name?` (string), `isolation?` (enum: worktree/remote) |
| `WebSearch` | WebSearchTool | `query` (string, min 2), `allowed_domains?` (string[]), `blocked_domains?` (string[]) |
| `WebFetch` | WebFetchTool | `url` (string), `prompt?` (string) |
| `Skill` | SkillTool | `skill` (string), `args?` (string) |
| `TodoWrite` | TodoWriteTool | `todos` (array: `{content, activeForm, status}`) |
| `NotebookEdit` | NotebookEditTool | Operations sur cellules Jupyter |
| `AskUserQuestion` | AskUserQuestionTool | `question` (string) |
| `EnterPlanMode` | EnterPlanModeTool | Mode planification |
| `ExitPlanMode` | ExitPlanModeV2Tool | Sortie du mode plan |
| `Task` | TaskOutputTool | Affichage de resultats de taches |
| `TaskStop` | TaskStopTool | Arret de taches |
| `ToolSearch` | ToolSearchTool | Recherche d'outils differes |
| `ListMcpResources` | ListMcpResourcesTool | Listing de ressources MCP |
| `ReadMcpResource` | ReadMcpResourceTool | Lecture de ressources MCP |

#### Outils conditionnels (feature-gated)

| Nom | Condition | Description |
|-----|-----------|-------------|
| `TaskCreate/Get/Update/List` | `isTodoV2Enabled` | Gestion de taches v2 |
| `EnterWorktree/ExitWorktree` | `isWorktreeModeEnabled` | Worktrees Git isoles |
| `SendMessage` | Charge dynamiquement | Messagerie inter-agents |
| `CronCreate/Delete/List` | `AGENT_TRIGGERS` | Taches planifiees |
| `RemoteTrigger` | `AGENT_TRIGGERS_REMOTE` | Declencheurs distants |
| `TeamCreate/TeamDelete` | `isAgentSwarmsEnabled` | Gestion d'equipes |
| `PowerShell` | `isPowerShellToolEnabled` | Execution PowerShell |
| `REPL` | `USER_TYPE='ant'` | REPL JavaScript |
| `LSP` | `ENABLE_LSP_TOOL` | Language Server Protocol |
| `Sleep` | `PROACTIVE` ou `KAIROS` | Pause/delai |
| `WebBrowser` | `WEB_BROWSER_TOOL` | Automatisation navigateur |
| `Config` | ANT-only | Configuration |
| `Tungsten` | ANT-only | Integration tmux |

### Matrices d'outils par contexte

| Contexte | Outils disponibles |
|----------|-------------------|
| **CLI principal** | Tous les outils actifs |
| **Sous-agents async** | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Skill, TodoWrite, NotebookEdit, ToolSearch, Worktree |
| **Teammates in-process** | Outils async + TaskCreate/Get/List/Update + SendMessage + Cron |
| **Mode coordinateur** | Agent, TaskStop, SendMessage, SyntheticOutput uniquement |
| **Agents custom** | Tout sauf les outils de la liste CUSTOM_AGENT_DISALLOWED |

---

## 7. Commandes & Skills

### Systeme de commandes

Trois types de commandes coexistent :

```typescript
type Command = CommandBase & (PromptCommand | LocalCommand | LocalJSXCommand)

// Commande "prompt" - genere un prompt envoye au modele
type PromptCommand = {
  type: 'prompt'
  progressMessage: string
  contentLength: number
  allowedTools?: string[]
  model?: string
  context?: 'inline' | 'fork'  // Inline ou sous-agent
  agent?: string
  hooks?: HooksSettings
  skillRoot?: string
  getPromptForCommand(args, context): Promise<ContentBlockParam[]>
}

// Commande "local" - executee localement (pas d'appel API)
type LocalCommand = {
  type: 'local'
  supportsNonInteractive: boolean
  load: () => Promise<LocalCommandModule>
}

// Commande "local-jsx" - UI React locale
type LocalJSXCommand = {
  type: 'local-jsx'
  load: () => Promise<LocalJSXCommandModule>
}
```

### Proprietes de CommandBase

```typescript
type CommandBase = {
  name: string                  // Nom unique
  description: string           // Description affichee
  aliases?: string[]            // Alias (/c pour /commit)
  argumentHint?: string         // Indice pour les arguments
  whenToUse?: string            // Description detaillee d'usage
  isEnabled?: () => boolean     // Activee ? (defaut: true)
  isHidden?: boolean            // Masquee ? (defaut: false)
  availability?: CommandAvailability[]  // 'claude-ai' | 'console'
  disableModelInvocation?: boolean
  userInvocable?: boolean
  loadedFrom?: 'commands_DEPRECATED' | 'skills' | 'plugin' | 'managed' | 'bundled' | 'mcp'
  kind?: 'workflow'
  immediate?: boolean
  isSensitive?: boolean
}
```

### Commandes principales

| Commande | Type | Description |
|----------|------|-------------|
| `/help` | local | Aide interactive |
| `/init` | local-jsx | Initialisation de projet |
| `/config` | local-jsx | Configuration |
| `/session` | local-jsx | Gestion de sessions |
| `/resume` | local | Reprise de session |
| `/commit` | prompt | Commit Git assiste |
| `/review` | prompt | Revue de code |
| `/diff` | local | Affichage de diff |
| `/mcp` | local-jsx | Gestion des serveurs MCP |
| `/skills` | local | Listing des skills |
| `/plan` | local | Mode planification |
| `/cost` | local | Affichage des couts |
| `/compact` | local | Compaction manuelle |
| `/theme` | local | Selection de theme |
| `/model` | local | Selection de modele |
| `/permissions` | local-jsx | Gestion des permissions |
| `/hooks` | local | Configuration des hooks |
| `/vim` | local | Toggle mode Vim |
| `/clear` | local | Nettoyage de la conversation |
| `/export` | local | Export de la conversation |

### Filtrage des commandes par contexte

| Contexte | Commandes disponibles |
|----------|-----------------------|
| **REMOTE_SAFE** | session, exit, clear, help, theme, color, vim, cost, usage, copy, btw, feedback, plan, keybindings, statusline, stickers, mobile |
| **BRIDGE_SAFE** | compact, clear, cost, summary, releaseNotes, files |

### Systeme de Skills

Les skills sont des commandes de type `prompt` chargees depuis le disque ou integrees au binaire.

#### Sources de chargement

```
1. ~/.claude/skills/       → Skills utilisateur (globales)
2. .claude/skills/         → Skills projet (locales)
3. Managed policy settings → Skills d'entreprise
4. Plugin directories      → Skills de plugins
5. MCP servers             → Skills via MCP
6. src/skills/bundled/     → Skills integrees au CLI
```

#### Definition d'une skill integree

```typescript
type BundledSkillDefinition = {
  name: string
  description: string
  aliases?: string[]
  whenToUse?: string
  argumentHint?: string
  allowedTools?: string[]
  model?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  isEnabled?: () => boolean
  hooks?: HooksSettings
  context?: 'inline' | 'fork'
  agent?: string
  files?: Record<string, string>  // Fichiers de reference extraits sur disque
  getPromptForCommand: (args, context) => Promise<ContentBlockParam[]>
}
```

#### Skills integrees

| Skill | Description |
|-------|-------------|
| `batch` | Execution de prompts en lot |
| `debug` | Utilitaires de debugging |
| `loop` | Planification de taches recurrentes |
| `remember` | Persistance en memoire |
| `scheduleRemoteAgents` | Planification d'agents distants |
| `simplify` | Revue de simplification de code |
| `skillify` | Creation de nouvelles skills |
| `stuck` | Assistance quand on est bloque |
| `updateConfig` | Mise a jour de configuration |
| `verify` | Boucles de verification |
| `keybindings` | Aide sur les raccourcis clavier |
| `claudeApi` | Exemples d'utilisation de l'API Claude |

#### Frontmatter des skills

Les fichiers SKILL.md utilisent un frontmatter YAML :

```yaml
---
name: ma-skill
description: Description de la skill
whenToUse: Quand utiliser cette skill
allowedTools: ["Bash", "Read", "Edit"]
context: fork    # 'inline' ou 'fork' (sous-agent)
agent: planner   # Type d'agent a utiliser
effort: high     # Niveau d'effort
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: "echo 'hello'"
---

Contenu du prompt de la skill...
```

---

## 8. Services

### 8.1 Service API (`src/services/api/`)

#### Client Anthropic

```typescript
async function getAnthropicClient({
  apiKey?: string,
  maxRetries: number,
  model?: string,
  fetchOverride?: ClientOptions['fetch'],
  source?: string,
}): Promise<Anthropic>
```

**Methodes d'authentification :**

| Methode | Variable d'environnement | Provider |
|---------|--------------------------|----------|
| Cle API directe | `ANTHROPIC_API_KEY` | API Anthropic |
| AWS Bedrock | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | AWS |
| Azure Foundry | `ANTHROPIC_FOUNDRY_RESOURCE` ou `ANTHROPIC_FOUNDRY_BASE_URL` | Azure |
| Vertex AI | `ANTHROPIC_VERTEX_PROJECT_ID` + region par modele | Google Cloud |
| OAuth | Token stocke en keychain | claude.ai / console |

**Headers par defaut :**
- `x-app: 'cli'`
- `User-Agent: getUserAgent()`
- `X-Claude-Code-Session-Id: getSessionId()`

#### Gestion d'erreurs

```typescript
const API_ERROR_MESSAGE_PREFIX = 'API Error'
const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt is too long'

function classifyAPIError(error): ErrorClassification
function categorizeRetryableAPIError(error): RetryCategory
function parsePromptTooLongTokenCounts(rawMessage): {
  actualTokens: number | undefined
  limitTokens: number | undefined
}
```

### 8.2 Service MCP (`src/services/mcp/`)

#### Types de transport

```typescript
type Transport = 'stdio' | 'sse' | 'sse-ide' | 'http' | 'ws' | 'sdk'
type ConfigScope = 'local' | 'user' | 'project' | 'dynamic' | 'enterprise' | 'claudeai' | 'managed'
```

#### Etats de connexion

```typescript
type MCPServerConnection =
  | ConnectedMCPServer    // Connecte avec client, capabilities, cleanup
  | FailedMCPServer       // Echec avec message d'erreur
  | NeedsAuthMCPServer    // En attente d'authentification OAuth
  | PendingMCPServer      // En cours de connexion (avec tentatives)
  | DisabledMCPServer     // Desactive par l'utilisateur
```

#### Configuration OAuth MCP

```typescript
type McpOAuthConfig = {
  clientId?: string
  callbackPort?: number
  authServerMetadataUrl?: string  // HTTPS uniquement
  xaa?: boolean                   // Cross-App Access
}
```

### 8.3 Service de compaction (`src/services/compact/`)

Le systeme de compaction gere la taille du contexte pour eviter de depasser la fenetre de contexte du modele.

| Module | Role |
|--------|------|
| `compact.ts` | `buildPostCompactMessages()` - compression du flux de messages |
| `autoCompact.ts` | `autoCompactIfNeeded()` - compaction heuristique automatique |
| `microCompact.ts` | `microcompactMessages()` - compression ciblee |
| `snipCompact.ts` | Compaction basee sur des frontieres (feature-gated) |
| `grouping.ts` | Strategies de regroupement de messages |
| `postCompactCleanup.ts` | Nettoyage post-compaction |

### 8.4 Service Analytics (`src/services/analytics/`)

```typescript
// Types marqueurs pour validation PII
type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = never
type AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED = never

// Interface de sink
type AnalyticsSink = {
  logEvent: (eventName: string, metadata: LogEventMetadata) => void
  logEventAsync: (eventName: string, metadata: LogEventMetadata) => Promise<void>
}
```

**Backends supportes :** Datadog, GrowthBook (feature flags), First-party event logger, OpenTelemetry

### 8.5 Service Plugins (`src/services/plugins/`)

```typescript
const VALID_INSTALLABLE_SCOPES = ['user', 'project', 'local'] as const
type InstallableScope = 'user' | 'project' | 'local'
```

Les plugins peuvent fournir : des outils, des commandes, des hooks, des skills.

---

## 9. Gestion d'etat

### Store (`src/state/store.ts`)

Pattern store minimal et immutable :

```typescript
type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}
```

### AppState (`src/state/AppStateStore.ts`)

Etat global de l'application (immutable via `DeepImmutable<T>`) :

| Champ | Type | Description |
|-------|------|-------------|
| `settings` | `SettingsJson` | Configuration persistante |
| `mainLoopModel` | `ModelSetting` | Modele actif |
| `tasks` | `{ [id]: TaskState }` | Taches en arriere-plan |
| `mcp` | MCP state | Clients, outils, ressources MCP |
| `plugins` | Plugin state | Plugins actifs/desactives, erreurs |
| `agentDefinitions` | Agent defs | Definitions d'agents charges |
| `agentNameRegistry` | `Map<string, AgentId>` | Routage nom → ID d'agent |
| `fileHistory` | File snapshots | Historique des fichiers modifies |
| `attribution` | Attribution state | Suivi des commits |
| `todos` | Per-agent todos | Listes de taches par agent |
| `notifications` | Notification queue | Notifications courantes et en file |
| `thinkingEnabled` | `boolean` | Extended thinking active |
| `teamContext` | Team metadata | Equipes, couleurs, panes |
| `inbox` | Message queue | File de messages inter-agents |
| `speculation` | Speculation state | Suggestions pipelinees |
| `activeOverlays` | `Set<string>` | Modals actives (coordination Escape) |
| `denialTracking` | Denial state | Historique des refus du classificateur |

### Provider React

```tsx
<App>
  <FpsMetricsProvider>
    <StatsProvider>
      <AppStateProvider
        store={store}
        onChangeAppState={onChangeAppState}
      >
        {children}
      </AppStateProvider>
    </StatsProvider>
  </FpsMetricsProvider>
</App>
```

---

## 10. UI & Composants

### Framework de rendu

L'UI est construite avec **React + Ink**, un framework de rendu React dans le terminal. Tous les composants sont des composants React standard, mais ils rendent du texte ANSI au lieu de HTML.

### Composants principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `App` | `App.tsx` | Racine avec providers (theme, state, stats) |
| `FullscreenLayout` | `FullscreenLayout.tsx` | Layout principal de session (84 Ko) |
| `Message` | `Message.tsx` | Rendu d'un message (user/assistant) |
| `MessageRow` | `MessageRow.tsx` | Ligne de message avec metadata |
| `Messages` | `Messages.tsx` | Liste de messages |
| `VirtualMessageList` | `VirtualMessageList.tsx` | Liste virtualisee (perf) |
| `TextInput` | `TextInput.tsx` | Saisie de texte standard |
| `VimTextInput` | `VimTextInput.tsx` | Saisie en mode Vim |
| `StructuredDiff` | `StructuredDiff.tsx` | Affichage de diffs de code |
| `ContextVisualization` | `ContextVisualization.tsx` | Visualisation des tokens (76 Ko) |
| `StatusLine` | `StatusLine.tsx` | Barre de statut en bas |
| `GlobalSearchDialog` | `GlobalSearchDialog.tsx` | Recherche dans la conversation (43 Ko) |
| `Feedback` | `Feedback.tsx` | Soumission de feedback (87 Ko) |

### Systeme de design (`src/components/design-system/`)

| Composant | Role |
|-----------|------|
| `ThemeProvider` | Gestion des themes (clair/sombre/custom) |
| `ThemedBox` | Conteneur avec bordures thematiques |
| `ThemedText` | Texte avec couleurs du theme |
| Couleurs | Systeme de tokens de couleur |

### Dialogues de permission (`src/components/permissions/`)

Chaque outil destructif a un dialogue de permission dedie :
- `BashPermissionDialog` - Execution de commandes shell
- `FileEditPermissionDialog` - Modification de fichiers
- `FileWritePermissionDialog` - Ecriture de fichiers
- `MCPServerApprovalDialog` - Approbation de serveurs MCP
- `CostThresholdDialog` - Depassement de seuil de cout

### CLI : Modes d'interface

| Mode | Fichier | Description |
|------|---------|-------------|
| Interactif | `replLauncher.tsx` | REPL React/Ink complet |
| Headless | `cli/print.ts` | Mode non-interactif (SDK, CI) |
| Structure | `cli/structuredIO.ts` | Protocole JSON-NDJSON pour SDK |
| Distant | `cli/remoteIO.ts` | Sessions via Claude Cloud Relay |

### Protocole SDK (structuredIO)

Le mode SDK utilise un protocole JSON-NDJSON :

```typescript
// Requetes du CLI → SDK
type SDKRequest =
  | { type: 'can_use_tool'; ... }     // Permission d'outil
  | { type: 'hook_callback'; ... }     // Callback de hook
  | { type: 'elicitation'; ... }       // Prompt MCP
  | { type: 'mcp_message'; ... }       // Message MCP brut

// Reponses du SDK → CLI
type SDKResponse =
  | { type: 'tool_permission'; ... }
  | { type: 'hook_result'; ... }
  | { type: 'elicitation_result'; ... }
```

---

## 11. Multi-agent & Coordination

### Modes multi-agent

| Mode | Feature Gate | Description |
|------|-------------|-------------|
| **Sous-agents** | Toujours actif | Agents lances via `AgentTool` |
| **Coordinateur** | `COORDINATOR_MODE` | Orchestration multi-workers |
| **Equipes (Swarms)** | `isAgentSwarmsEnabled` | Equipes avec messagerie |
| **Teammates** | Env var | Agents en processus avec taches partagees |

### Mode coordinateur (`src/coordinator/`)

Le coordinateur est un orchestrateur qui delegue le travail a des workers :

```typescript
function isCoordinatorMode(): boolean
function getCoordinatorSystemPrompt(): string
function getCoordinatorUserContext(mcpClients, scratchpadDir?): { workerToolsContext: string }
```

**Outils du coordinateur :** Agent, SendMessage, TaskStop, SyntheticOutput uniquement.

**Les workers** recoivent un ensemble reduit d'outils (pas d'AgentTool pour eviter la recursion infinie).

### Gestion des taches (`src/Task.ts`)

```typescript
type TaskType = 'local_bash' | 'local_agent' | 'remote_agent'
              | 'in_process_teammate' | 'local_workflow' | 'monitor_mcp' | 'dream'

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'
```

**Generation d'ID :** Prefixe par type (`b` bash, `a` agent, `r` remote, `t` teammate, `w` workflow, `m` monitor, `d` dream) + 8 caracteres alphanumeriques aleatoires.

### Messagerie inter-agents

- `SendMessageTool` : Envoi de messages entre agents nommes
- `ListPeersTool` : Listing des agents actifs
- `inbox` dans AppState : File de messages avec timestamps
- UDS (Unix Domain Sockets) sur Mac/Linux pour la communication inter-sessions

---

## 12. Securite & Permissions

### Modes de permission

```typescript
type ExternalPermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan'
type InternalPermissionMode = 'auto' | 'bubble'  // ANT-only, TRANSCRIPT_CLASSIFIER
type PermissionMode = ExternalPermissionMode | InternalPermissionMode
```

| Mode | Comportement |
|------|-------------|
| `default` | Demande pour chaque outil destructif |
| `plan` | Demande approbation du plan, puis auto-accept |
| `acceptEdits` | Auto-accept les edits, demande pour le bash |
| `dontAsk` | Auto-accept sauf fichiers sensibles |
| `bypassPermissions` | Tout accepter (dangereux) |
| `auto` | Classificateur automatique (ANT-only) |
| `bubble` | Remontee au parent (sous-agents) |

### Pipeline de permissions

```
Outil demande d'execution
         │
         ▼
1. Regles deny/allow configurees
   (global + projet + policy)
         │
         ▼
2. Hooks PreToolUse
   (scripts configurables)
         │
         ▼
3. Classificateur automatique
   (si mode auto/YOLO)
         │
         ▼
4. Dialogue interactif
   (demande a l'utilisateur)
         │
         ▼
Decision: allow / deny / abort
```

### Types de regles

```typescript
type PermissionBehavior = 'allow' | 'deny' | 'ask'
type PermissionRuleSource = 'global' | 'project' | 'policy'

type PermissionRule = {
  toolName: string
  behavior: PermissionBehavior
  // + conditions optionnelles
}
```

### Sources de decision

```typescript
// Approbation
type PermissionApprovalSource =
  | { type: 'hook'; permanent?: boolean }
  | { type: 'user'; permanent: boolean }
  | { type: 'classifier' }

// Refus
type PermissionRejectionSource =
  | { type: 'hook' }
  | { type: 'user_abort' }
  | { type: 'user_reject'; hasFeedback: boolean }
```

### Schema de permissions (settings)

```typescript
const PermissionsSchema = z.object({
  allow?: PermissionRule[]
  deny?: PermissionRule[]
  ask?: PermissionRule[]
  defaultMode?: PermissionMode
  disableBypassPermissionsMode?: 'disable'
  disableAutoMode?: 'disable'
  additionalDirectories?: string[]
})
```

### Securite des fichiers de skills

Les skills integrees extraient des fichiers de reference sur disque avec des protections solides :

| Protection | Mecanisme |
|-----------|-----------|
| Anti-symlink | `O_NOFOLLOW \| O_EXCL` (Linux), `'wx'` (Windows) |
| Owner-only | Permissions `0o700` (dirs) et `0o600` (fichiers) |
| Anti-traversal | Validation que le chemin relatif ne contient pas `..` |
| Anti-preemption | Nonce par processus dans le repertoire racine |

---

## 13. Utilitaires & Constantes

### Sous-dossiers de `src/utils/`

| Dossier | Role |
|---------|------|
| `bash/` | Parsing AST de commandes bash (tree-sitter) |
| `git/` | Operations Git (status, diff, config, gitignore) |
| `permissions/` | Systeme de permissions (deny tracking, filesystem) |
| `settings/` | Chargement, validation, fusion de parametres |
| `model/` | Selection de modele, routage de provider |
| `hooks/` | Infrastructure de hooks (post-sampling, session) |
| `memory/` | Gestion de la memoire (CLAUDE.md, attachments) |
| `task/` | Gestion de taches (etat, stockage disque) |
| `messages.ts` | Creation, normalisation, lookups de messages (1700+ lignes) |
| `tokens.ts` | Comptage de tokens avec estimation |
| `context.ts` | Gestion de la fenetre de contexte |
| `file.ts` | I/O fichier abstrait |
| `fileReadCache.ts` | Cache de lecture de fichiers |

### Constantes systeme (`src/constants/`)

| Fichier | Contenu |
|---------|---------|
| `system.ts` | Prefixes de prompt systeme (DEFAULT, AGENT_SDK) |
| `tools.ts` | Matrices d'outils par contexte d'agent |
| `xml.ts` | Tags XML pour les messages structures |
| `apiLimits.ts` | Limites de taux API |
| `toolLimits.ts` | Limites d'execution des outils |
| `oauth.ts` | Configuration OAuth |
| `files.ts` | Constantes de gestion de fichiers |
| `betas.ts` | Feature flags beta |
| `outputStyles.ts` | Styles de sortie configurables |

### Tags XML pour les messages

| Tag | Usage |
|-----|-------|
| `<command-name>` | Nom de commande slash |
| `<bash-input>` | Commande bash executee |
| `<bash-stdout>` / `<bash-stderr>` | Sortie standard/erreur bash |
| `<task-notification>` | Notification de tache (coordinateur) |
| `<teammate-message>` | Message de teammate (swarm) |
| `<channel-message>` | Message de canal |
| `<fork-boilerplate>` | Boilerplate de fork de sous-agent |

### Suivi des couts (`src/cost-tracker.ts`)

```typescript
type StoredCostState = {
  totalCostUSD: number
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  totalLinesAdded: number
  totalLinesRemoved: number
  lastDuration: number | undefined
  modelUsage: {
    [modelName: string]: {
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
    }
  } | undefined
}
```

**Fonctions principales :**

| Fonction | Role |
|----------|------|
| `addToTotalSessionCost(cost, usage, model)` | Ajoute un cout et met a jour les compteurs par modele |
| `formatTotalCost()` | Formate l'affichage complet (cout, duree, lignes changees) |
| `formatModelUsage()` | Detail par modele (input/output/cache tokens) |
| `saveCurrentSessionCosts()` | Sauvegarde dans la config projet |
| `restoreCostStateForSession(sessionId)` | Restauration au resume de session |

### Migrations (`src/migrations/`)

11 fichiers de migration gerent les transitions entre versions :

| Migration | De | Vers |
|-----------|----|------|
| `migrateSonnet45ToSonnet46` | Sonnet 4.5 | Sonnet 4.6 |
| `migrateOpusToOpus1m` | Opus | Opus 1M |
| `migrateAutoUpdatesToSettings` | Config legacy | Settings JSON |
| `migrateBypassPermissionsAccepted` | Flag legacy | Settings |

---

## 14. Patterns architecturaux

### 1. Etat immutable avec store reactif

```typescript
// Creation du store
const store = createStore<AppState>(initialState, onChange)

// Lecture (jamais de mutation directe)
const state = store.getState()

// Mise a jour (toujours via updater)
store.setState(prev => ({ ...prev, field: newValue }))

// Abonnement
const unsubscribe = store.subscribe(listener)
```

### 2. Architecture message-driven

Toutes les I/O sont des `AsyncIterable<StreamEvent>`. Les reponses streamees sont traitees evenement par evenement :

```
StreamEvent = TextDelta | ToolUse | ThinkingDelta | Error | ...
```

### 3. Injection de dependances pour les tests

```typescript
type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  microcompact: typeof microcompactMessages
  autocompact: typeof autoCompactIfNeeded
  uuid: () => string
}
```

### 4. Feature gates via bundler

```typescript
// Dead code elimination au build
if (feature('COORDINATOR_MODE')) {
  // Ce code est supprime du binaire si la feature est desactivee
}
```

### 5. Memoisation extensive

```typescript
// Contexte memoize par session
const getSystemContext = memoize(async () => { ... })
const getUserContext = memoize(async () => { ... })
const getGitStatus = memoize(async () => { ... })
```

### 6. Extraction lazy de fichiers

Les skills integrees extraient leurs fichiers de reference sur disque uniquement a la premiere invocation, avec memoisation de la promesse pour eviter les courses :

```typescript
let extractionPromise: Promise<string | null> | undefined
getPromptForCommand = async (args, ctx) => {
  extractionPromise ??= extractBundledSkillFiles(name, files)
  const dir = await extractionPromise
  // ...
}
```

### 7. Compaction adaptive

Trois niveaux de compaction pour gerer la fenetre de contexte :

| Niveau | Declencheur | Methode |
|--------|------------|---------|
| **Micro** | Avant chaque requete | Compression ciblee de messages specifiques |
| **Auto** | Seuil de tokens depasse | Compaction heuristique avec circuit breaker |
| **Manuel** | Commande `/compact` | Compaction complete avec prompt dedie |

### 8. Permission pipeline multicouche

```
Regles configurees → Hooks → Classificateur → Dialogue utilisateur
```

Chaque couche peut court-circuiter les suivantes. Les decisions sont loguees pour l'audit.

---

## 15. Diagrammes de flux

### Flux complet d'un tour de conversation

```
┌──────────────────────────────────────────────────────────────┐
│                    UTILISATEUR                                │
│                  (saisie texte)                               │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                   QueryEngine                                 │
│  submitMessage(prompt)                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Assemblage prompt systeme                            │ │
│  │    - CLAUDE.md (user + projet)                          │ │
│  │    - Git status                                         │ │
│  │    - Outils disponibles                                 │ │
│  │    - Skills decouvertes                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Claude                                  │
│  queryModelWithStreaming()                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ - Streaming SSE                                         │ │
│  │ - Token par token                                       │ │
│  │ - Content blocks: text, thinking, tool_use              │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              Traitement des evenements                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ TextDelta  │  │ Thinking   │  │ ToolUse                │ │
│  │ → afficher │  │ → stocker  │  │ → pipeline permission  │ │
│  │            │  │            │  │ → executer outil       │ │
│  │            │  │            │  │ → retourner resultat   │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                Post-traitement                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ - Hooks post-sampling                                   │ │
│  │ - Auto-compaction si necessaire                         │ │
│  │ - Suivi des couts                                       │ │
│  │ - Mise a jour de l'etat                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Tour suivant ? (tool_use → oui, stop → non)            │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Flux de permission d'un outil

```
┌───────────┐
│ Tool.call │
└─────┬─────┘
      │
      ▼
┌───────────────────────┐     ┌─────────┐
│ Regles deny/allow ?   │────►│ REFUSER │
│ (global+project+policy)│ deny└─────────┘
└─────────┬─────────────┘
          │ ask/allow
          ▼
┌───────────────────────┐     ┌──────────┐
│ Hooks PreToolUse ?    │────►│ AUTORISER│
│ (scripts configurables)│allow└──────────┘
└─────────┬─────────────┘
          │ pas de decision
          ▼
┌───────────────────────┐     ┌──────────┐
│ Classificateur auto ? │────►│ AUTORISER│
│ (mode auto/YOLO)      │allow└──────────┘
└─────────┬─────────────┘
          │ pas de decision
          ▼
┌───────────────────────┐     ┌──────────┐
│ Dialogue utilisateur  │────►│ Decision │
│ (terminal interactif) │     │ user     │
└───────────────────────┘     └──────────┘
```

### Flux multi-agent (coordinateur)

```
┌──────────────────────────────────────────────┐
│               COORDINATEUR                    │
│  Outils: Agent, SendMessage, TaskStop         │
│                                               │
│  ┌─────────────┐  ┌─────────────┐            │
│  │ Agent(W1)   │  │ Agent(W2)   │  ...        │
│  │ (worktree)  │  │ (in-process)│             │
│  └──────┬──────┘  └──────┬──────┘            │
│         │                │                    │
│         ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐            │
│  │ Worker 1    │  │ Worker 2    │             │
│  │ Bash, Read  │  │ Bash, Read  │             │
│  │ Edit, Grep  │  │ Edit, Grep  │             │
│  │ Skill, Web  │  │ Skill, Web  │             │
│  └──────┬──────┘  └──────┬──────┘            │
│         │                │                    │
│         ▼                ▼                    │
│  <task-notification>  <task-notification>      │
│  XML-wrapped results  XML-wrapped results     │
└──────────────────────────────────────────────┘
         │                │
         ▼                ▼
  ┌─────────────────────────────┐
  │  Scratchpad partagé (optionnel) │
  │  Connaissances durables     │
  └─────────────────────────────┘
```

---

## Annexe A : Historique et sessions

### Format de l'historique

- **Emplacement** : `~/.claude/history.jsonl`
- **Format** : JSON Lines (une entree par ligne)
- **Filtrage** : Par projet (`getProjectRoot()`) et session (`getSessionId()`)
- **Ordre** : Session courante en premier, puis tri chronologique inverse

### Gestion des pastes

```typescript
type StoredPastedContent = {
  id: number
  type: 'text' | 'image'
  content?: string        // Inline pour petits pastes
  contentHash?: string    // Reference hash pour gros pastes
  mediaType?: string
  filename?: string
}
```

### Fonctions cles

| Fonction | Description |
|----------|-------------|
| `getHistory()` | Historique projet + session (newest-first) |
| `getTimestampedHistory()` | Liste deduplicee avec resolution lazy |
| `makeHistoryReader()` | Generateur async sur toutes les entrees |
| `expandPastedTextRefs()` | Expanse `[Pasted text #N]` |

---

## Annexe B : Configuration et parametres

### Fichiers de configuration

| Fichier | Portee | Description |
|---------|--------|-------------|
| `~/.claude/settings.json` | Utilisateur | Parametres globaux |
| `.claude/settings.json` | Projet | Parametres projet |
| `.claude/hooks.json` | Projet | Hooks de projet |
| `~/.claude/keybindings.json` | Utilisateur | Raccourcis clavier |
| `~/.claude/agents/` | Utilisateur | Agents personnalises |
| `CLAUDE.md` | Projet | Instructions pour Claude |
| `~/.claude/CLAUDE.md` | Utilisateur | Instructions globales |

### Schema SettingsJson

```typescript
{
  permissions?: {
    allow?: PermissionRule[]
    deny?: PermissionRule[]
    ask?: PermissionRule[]
    defaultMode?: PermissionMode
    disableBypassPermissionsMode?: 'disable'
    additionalDirectories?: string[]
  }
  env?: Record<string, string>    // Variables d'environnement
  mcpServers?: Record<string, MCPServerConfig>
  hooks?: HooksSettings
  // + champs specifiques par context (managed, enterprise...)
}
```

---

## Annexe C : Types d'ID

```typescript
// IDs brandes (nominal typing)
type SessionId = string & { readonly __brand: 'SessionId' }
type AgentId = string & { readonly __brand: 'AgentId' }

// Format AgentId : a(?:.+-)?[0-9a-f]{16}
// Format TaskId  : [prefix][8 chars alphanumeriques]
//   b = bash, a = agent, r = remote, t = teammate,
//   w = workflow, m = monitor, d = dream
```

---

## Annexe D : Feature Gates

| Gate | Description |
|------|-------------|
| `COORDINATOR_MODE` | Orchestration multi-agent |
| `KAIROS` | Mode assistant |
| `TRANSCRIPT_CLASSIFIER` | Classificateur auto de permissions |
| `COMMIT_ATTRIBUTION` | Suivi d'attribution de commits |
| `HISTORY_SNIP` | Compaction par snipping |
| `UDS_INBOX` | Messagerie inter-sessions |
| `CONTEXT_COLLAPSE` | Optimisation de contexte |
| `AGENT_TRIGGERS` | Taches planifiees (cron) |
| `WORKFLOW_SCRIPTS` | Execution de workflows |
| `NATIVE_CLIENT_ATTESTATION` | Verification du client |
| `WEB_BROWSER_TOOL` | Automatisation navigateur |
| `ENABLE_LSP_TOOL` | Integration LSP |
| `PROACTIVE` | Mode proactif |
| `BRIDGE_MODE` | Controle a distance |
| `VOICE_MODE` | Mode vocal |
| `BUDDY` | Mode buddy |
| `FORK_SUBAGENT` | Fork de sous-agents |

---

> **Note** : Cette documentation a ete generee par analyse statique du code source.
> Les feature gates, noms d'outils et interfaces peuvent evoluer entre les versions.

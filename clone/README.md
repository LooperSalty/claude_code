# Claude Code Clone

Mini-clone fonctionnel de Claude Code, inspire de l'analyse du code source original.

## Fonctionnalites

- **6 outils** : Bash, Read, Edit, Write, Glob, Grep
- **Tool use** : Boucle automatique (le modele appelle des outils et recoit les resultats)
- **Streaming** : Affichage en temps reel des reponses
- **Suivi des couts** : Tokens et prix par tour
- **Contexte Git** : Status et branch injectes dans le prompt systeme
- **Commandes slash** : /cost, /tools, /clear, /help, /exit

## Installation

```bash
cd clone
npm install
```

## Utilisation

```bash
# Configurer la cle API
export ANTHROPIC_API_KEY="sk-ant-..."

# Lancer en mode dev
npm run dev

# Ou builder puis lancer
npm run build
npm start
```

## Architecture

```
clone/src/
├── main.ts              # Point d'entree, REPL interactif
├── types.ts             # Types (Tool, Message, Config, Session)
├── services/
│   └── api.ts           # Client API Claude avec tool use loop
├── tools/
│   ├── index.ts         # Registre des outils
│   ├── bash.ts          # Execution de commandes shell
│   ├── fileRead.ts      # Lecture de fichiers
│   ├── fileEdit.ts      # Edition par remplacement de texte
│   ├── fileWrite.ts     # Ecriture de fichiers
│   ├── glob.ts          # Recherche de fichiers par pattern
│   └── grep.ts          # Recherche dans le contenu (rg/grep)
└── utils/
    ├── context.ts       # Construction du prompt systeme
    └── cost.ts          # Suivi des tokens et couts
```

## Differences avec l'original

| Aspect | Original | Clone |
|--------|----------|-------|
| Runtime | Bun | Node.js |
| UI | React/Ink (terminal) | readline simple |
| Outils | 60+ | 6 essentiels |
| Commandes | 100+ | 6 |
| Multi-agent | Oui (swarms, coordinator) | Non |
| MCP | 5 transports | Non |
| Permissions | 7 modes, pipeline | Non (tout autorise) |
| Compaction | Auto + micro + manual | Non |
| Skills/Plugins | Oui | Non |
| Feature gates | 196 bun:bundle calls | Aucun |

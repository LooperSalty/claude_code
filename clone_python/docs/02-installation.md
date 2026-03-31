# Installation et utilisation

## Pré-requis

- Python 3.10 ou supérieur
- Aucune dépendance externe requise (bibliothèque standard uniquement)

## Cloner le projet

```bash
git clone https://github.com/instructkr/claw-code.git
cd claw-code
```

## Commandes CLI

Toutes les commandes s'exécutent via le module `src.main` :

### Résumé du workspace

```bash
python3 -m src.main summary
```

Affiche un résumé complet : fichiers Python, modules, commandes/outils miroir, état de la session.

### Manifeste du workspace

```bash
python3 -m src.main manifest
```

Liste tous les modules Python et leur nombre de fichiers.

### Audit de parité

```bash
python3 -m src.main parity-audit
```

Compare la surface Python contre le snapshot de l'archive TypeScript originale. Affiche la couverture en fichiers racine, répertoires, commandes et outils.

### Lister les commandes

```bash
python3 -m src.main commands --limit 10
python3 -m src.main commands --query "review"
python3 -m src.main commands --no-plugin-commands
python3 -m src.main commands --no-skill-commands
```

### Lister les outils

```bash
python3 -m src.main tools --limit 10
python3 -m src.main tools --query "MCP"
python3 -m src.main tools --simple-mode        # Seulement Bash, FileRead, FileEdit
python3 -m src.main tools --no-mcp             # Exclut les outils MCP
python3 -m src.main tools --deny-prefix mcp    # Filtre par préfixe
python3 -m src.main tools --deny-tool BashTool  # Exclut un outil spécifique
```

### Routing de prompts

```bash
python3 -m src.main route "review MCP tool" --limit 5
```

Score les commandes/outils par correspondance de tokens avec le prompt.

### Bootstrap d'une session

```bash
python3 -m src.main bootstrap "review MCP tool" --limit 5
```

Crée une session runtime complète : contexte, setup, routing, exécution, persistence.

### Boucle de tours

```bash
python3 -m src.main turn-loop "review MCP tool" --max-turns 3 --structured-output
```

Exécute plusieurs tours successifs avec gestion de budget et de limite.

### Autres commandes

```bash
python3 -m src.main setup-report               # Rapport de setup (Python, plateforme, prefetch)
python3 -m src.main command-graph               # Graphe de segmentation des commandes
python3 -m src.main tool-pool                   # Pool d'outils assemblé
python3 -m src.main bootstrap-graph             # Graphe des étapes bootstrap/runtime
python3 -m src.main subsystems --limit 16       # Liste des modules Python

python3 -m src.main show-command review         # Détail d'une commande
python3 -m src.main show-tool MCPTool           # Détail d'un outil
python3 -m src.main exec-command review "inspect security"  # Exécuter un shim de commande
python3 -m src.main exec-tool MCPTool "fetch resources"     # Exécuter un shim d'outil

python3 -m src.main flush-transcript "prompt"   # Persister et flush une session
python3 -m src.main load-session <session_id>   # Charger une session sauvegardée

python3 -m src.main remote-mode workspace       # Mode remote simulé
python3 -m src.main ssh-mode workspace          # Mode SSH simulé
python3 -m src.main teleport-mode workspace     # Mode teleport simulé
python3 -m src.main direct-connect-mode workspace  # Mode direct-connect
python3 -m src.main deep-link-mode workspace    # Mode deep-link
```

## Lancer les tests

```bash
python3 -m unittest discover -s tests -v
```

22 tests couvrent : manifeste, CLI, parity audit, routing, bootstrap, sessions, modes remote, transcript, exécution, et plus.

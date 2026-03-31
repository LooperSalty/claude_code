# Introduction

## Qu'est-ce que Claw Code ?

Claw Code est une réécriture clean-room en Python du harness agent de Claude Code (Anthropic). Le projet reproduit l'architecture, les patterns de commandes/outils, le runtime et le query engine du système original, sans copier de code propriétaire.

## Contexte

Le 31 mars 2026, le code source de Claude Code a été brièvement exposé. Sigrid Jin (@instructkr), power user reconnu par le Wall Street Journal pour avoir consommé 25 milliards de tokens Claude Code, a étudié l'architecture puis reconstruit les patterns en Python en quelques heures.

Le travail a été orchestré avec [oh-my-codex (OmX)](https://github.com/Yeachan-Heo/oh-my-codex), un outil de workflow basé sur OpenAI Codex, en utilisant les modes `$team` (revue parallèle) et `$ralph` (exécution persistante).

## Statut du projet

- **Langage principal** : Python 3.10+ (zéro dépendance externe)
- **Port Rust** : en cours sur la branche `dev/rust`
- **Parité** : miroir structurel de la surface TypeScript originale (commandes, outils, répertoires), mais pas encore un remplacement runtime complet
- **Stars GitHub** : 30K+ en quelques heures (record historique)

## Ce que le projet fait

- Catalogue 207 commandes et 184 outils du harness original
- Reproduit le pipeline runtime : routing de prompts, matching, exécution, boucle de tours
- Fournit un query engine avec gestion de budget, compaction de transcripts et streaming
- Offre un audit de parité automatique contre l'archive TypeScript originale

## Ce que le projet ne fait PAS

- Aucun appel API vers un LLM (pas de clé API, pas d'inférence)
- Les commandes et outils sont des shims descriptifs, pas des implémentations fonctionnelles
- Les sous-packages sont des stubs structurels (miroir de la hiérarchie TS)

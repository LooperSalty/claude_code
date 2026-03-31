# Tests

## Framework

Les tests utilisent `unittest` (bibliothèque standard). Un seul fichier de tests couvre l'ensemble du projet.

## Lancer les tests

```bash
python3 -m unittest discover -s tests -v
```

## Couverture

22 tests couvrent les fonctionnalités suivantes :

| Test | Ce qu'il vérifie |
|------|-----------------|
| `test_manifest_counts_python_files` | Le manifeste détecte >= 20 fichiers Python et des modules |
| `test_query_engine_summary_mentions_workspace` | Le résumé contient les sections attendues |
| `test_cli_summary_runs` | La commande `summary` s'exécute sans erreur |
| `test_parity_audit_runs` | La commande `parity-audit` s'exécute sans erreur |
| `test_root_file_coverage_is_complete_when_local_archive_exists` | Si l'archive locale est présente, la couverture est complète |
| `test_command_and_tool_snapshots_are_nontrivial` | >= 150 commandes et >= 100 outils |
| `test_commands_and_tools_cli_run` | Commandes CLI `commands` et `tools` avec filtres |
| `test_subsystem_packages_expose_archive_metadata` | Les packages stubs exposent `MODULE_COUNT` et `SAMPLE_FILES` |
| `test_route_and_show_entry_cli_run` | Routing et affichage d'entrées individuelles |
| `test_bootstrap_cli_runs` | Bootstrap produit une RuntimeSession complète |
| `test_bootstrap_session_tracks_turn_state` | La session tracke les matches et l'usage |
| `test_exec_command_and_tool_cli_run` | Exécution de shims commande/outil |
| `test_setup_report_and_registry_filters_run` | Setup report, filtres plugin/skill/simple/MCP |
| `test_load_session_cli_runs` | Persistence et chargement de session |
| `test_tool_permission_filtering_cli_runs` | Filtrage par deny-prefix |
| `test_turn_loop_cli_runs` | Boucle multi-tours avec sortie structurée |
| `test_remote_mode_clis_run` | Modes remote, SSH, teleport |
| `test_flush_transcript_cli_runs` | Flush de transcript |
| `test_command_graph_and_tool_pool_cli_run` | Graphe de commandes et pool d'outils |
| `test_setup_report_mentions_deferred_init` | Deferred init dans le setup report |
| `test_execution_registry_runs` | Registre d'exécution complet |
| `test_bootstrap_graph_and_direct_modes_run` | Graphe bootstrap, modes direct-connect et deep-link |

## Structure des tests

Les tests sont majoritairement des **tests d'intégration** qui :

1. Appellent la CLI via `subprocess.run` pour vérifier le comportement end-to-end
2. Importent directement les modules pour vérifier les résultats programmatiques
3. Vérifient la présence de marqueurs dans stdout (assertions `assertIn`)

## Ajouter un test

```python
def test_nouvelle_fonctionnalite(self) -> None:
    result = subprocess.run(
        [sys.executable, '-m', 'src.main', 'nouvelle-commande', 'arg'],
        check=True,
        capture_output=True,
        text=True,
    )
    self.assertIn('marqueur attendu', result.stdout)
```

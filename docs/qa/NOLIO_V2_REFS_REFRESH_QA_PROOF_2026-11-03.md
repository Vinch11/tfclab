# Nolio V2 QA — autorisation réelle et préparation références/renouvellement (3 novembre 2026)

Source QA finale : `1dd90fc6b99a67b52707ec6a0f1d362c9ccba559`, non publiée/non attestée.

L'autorisation réelle d'équipe a réussi dans le navigateur de l'utilisateur. Le choix d'athlète et le consentement sont enregistrés. Au contrôle indépendant : 1 grant, `pending_refs`, génération 1, refresh `idle`, références non chargées, 0 connexion active. Aucun secret ni jeton lu par l'agent.

La confirmation des sports et exercices et le renouvellement V2 sont implémentés en QA. Les références proviennent des GET documentés de l'athlète/de sa bibliothèque ; associations explicites et activation séparée. La rotation des jetons utilise réservation durable et génération ; une issue incertaine ou refusée bloque l'envoi, même si l'ancien accès semble valide. Un renouvellement ancien ne réactive pas une connexion révoquée.

Vérification : 174 tests ciblés verts, types/lint verts ; [compilation Deno indépendante finale](https://github.com/Vinch11/tfclab/actions/runs/41647546843) réussie sur les 15 fichiers serveur exacts. Empreintes des archives et plans courants A/B identiques avant/après.

Prochaine action : [ouvrir la page QA](https://lovable.dev/projects/c3941303-40d2-447e-9b87-867d82727fd1?preview-path=%2F__qa%2Fpilot-review), vérifier l'état puis « Charger les sports Nolio ». Examiner les références, associer explicitement les sports/exercices nécessaires, confirmer les associations et cliquer « Activer la connexion (aucun envoi) ». Utiliser un athlète de test explicitement consenti.

Limites : aucun GET de références, refresh, activation ou envoi Nolio réel exécuté par l'agent ; HTTP et RPC simulés dans les tests. Le lot prend en charge un seul grant par compte Nolio ; il bloque les associations multiples ambiguës. L'identité de compétition n'est pas configurable dans ce lot ; aucune validation de l'export complet d'un plan n'est revendiquée. Le prochain essai reste distinct d'une prescription, d'une validation sportive/scientifique et d'un GO production. TFCLab v2.1/V1 n'a pas été modifié.

Preuve détaillée : NOLIO_V2_REFS_REFRESH_QA_PROOF_2026-11-03.json ; audit indépendant : NOLIO_V2_REFS_REFRESH_INDEPENDENT_AUDIT_2026-11-03.json.

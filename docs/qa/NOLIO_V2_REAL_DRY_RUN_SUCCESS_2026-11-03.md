# Nolio V2 — simulation réelle acceptée le 3 novembre 2026

**PASS pour la simulation fournisseur d'une séance technique.** Nolio a répondu **HTTP 201**, avec le résultat `DRY_RUN_VALID`, à **18:40:46 heure de Bruxelles**. Le reçu a été relu indépendamment en base après le message du coach.

| Preuve | Valeur |
| --- | --- |
| Reçu | `fbc96836-1add-4f57-9a64-d3ce4378f428` |
| Fixture | `QA_TECH_RUN_10MIN_NO_TARGET` |
| Empreinte du contenu | `35cadad0588d8410f2226c14042be5a99e679a028e06519df6613b47fa9aefb7` |
| Résultat | `DRY_RUN_VALID / dry_run_valid / HTTP 201` |
| Envoi au calendrier | **ABSENT** |
| Horodatage UTC | `2026-11-03T17:40:46.850824Z` |

L'empreinte est identique à celle des refus précédents : le contenu n'a pas été assoupli pour obtenir le succès. La séance reste un test de course de 10 minutes, sans cible d'allure. Le contrat impose `dry_run: true`, une réponse positive de forme exacte et un reçu serveur concordant ; aucune création classique ne sert de repli.

## Blocage d'équipe levé pour ce test

Les reçus ultérieurs avaient confirmé `team_scope_forbidden`. Une lecture seule des options API/MCP de l'équipe courante a montré l'option **Calendrier prévu → Écriture** décochée avant le nouvel essai. Le coach a reçu l'instruction de la cocher puis de sauvegarder et a ensuite obtenu la réponse 201. L'agent n'a changé aucune permission.

La cause précise du tout premier refus générique n'a pas été conservée par l'ancien classeur ; ce succès ne permet pas de la reconstruire. Les reçus de refus restent intacts.

Aucun nom d'équipe, lien privé d'options, identifiant Nolio d'athlète ou de sport, jeton ou capture n'est publié dans cette preuve.

## Diagnostic et vérifications terminés

Le diagnostic ajouté en parallèle transmet au seul coach connecté le contexte privé d'un refus `team_scope_forbidden`, après validation stricte et stockage d'un reçu concordant. Le contexte ne va ni en base ni dans les logs. Le client le revalide et l'efface lors d'un changement d'identité ou d'un nouvel essai. Le succès actuel n'établit pas qu'un contexte réel de refus a été affiché : aucun nouveau refus n'a été provoqué.

- 103 tests ciblés réussis dans 7 fichiers, dont 17 nouveaux avec des valeurs fictives.
- 5 tests du manifeste réussis ; types et lint sans erreur, avec un avertissement antérieur.
- [CI Deno indépendante réussie](https://github.com/Vinch11/tfclab/actions/runs/41687298983) sur les **19 fichiers serveur exacts** de la source QA `2408a31fda4f7d23e1912b3084149e4f77410870`. Le détail des empreintes figure dans [la provenance](NOLIO_V2_REAL_DRY_RUN_DENO_PROVENANCE_2026-11-03.json).
- Seule la fonction dédiée `nolio-v2-dry-run` a été redéployée ; sans JWT elle répond 401. Le sender normal et OAuth sont inchangés.

Le reçu ne contient pas d'empreinte de source en exécution : il ne constitue pas une attestation signée liant le runtime à ce commit. Les vérifications de source et la preuve fournisseur sont documentées séparément.

## Ce que cette étape permet de conclure

La connexion Nolio réelle, les références déjà chargées et la simulation de cette séance fonctionnent ensemble. **Aucun envoi réel n'a été effectué.** Il reste à préparer une séance technique non prescriptive, vérifier son destinataire, sa date et son contenu, puis effectuer un unique envoi explicite et relire exactement le résultat dans le calendrier.

Le renouvellement réel du jeton, l'export complet d'un plan et la validation sportive ne sont pas prouvés par ce test. Le manifeste `9ec56cbec9f0bc3d3a0f76e67faa9905d828ea5e097842c8fdcc7b08447e335f` reste non attesté et non publié. **DRAFT — NO-GO prescription/pilote réel/production.** TFCLab v2.1, main et V1 restent inchangés ; le futur choix explicite DET Engine ou IA est conservé.

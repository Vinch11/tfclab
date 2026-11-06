# Nolio V2 QA — simulation d'une séance prête, 3 novembre 2026

La QA `/__qa/pilot-review` permet maintenant de tester une seule séance technique en mode dry_run. Source finale `d304476c9b11ce85671f7b5193bde9df52084e6e`, release non attestée `590d2ac4170b9e0c27fa5c32e934ddcf00109a35e004a27a6a825cf2538bea71`. Aucune publication ni promotion production.

## Parcours utilisateur préparé

Dans la session existante du coach : vérifier l'état de connexion, puis cliquer « Tester la séance sans l'envoyer ». L'aperçu décrit une course technique de 10 minutes sans objectif d'allure, de puissance ou de CSS. Il s'agit d'une fixture non prescriptive, pas d'une séance d'entraînement recommandée.

La fonction dédiée nolio-v2-dry-run vérifie l'identité et la propriété avant les accès privés. Le corps est fixé côté serveur, avec l'athlète et le sport issus de la connexion active. Le flag dry_run reste vrai ; le transport est séparé du sender réel. La validation fournisseur dispose de 15 s au total pour transport et corps. Le verrou client couvre garde, appel et relecture en 45 s, sans nouvel essai automatique.

## Confirmation

Le succès exige les trois champs techniques de la réponse WorkoutDryRun, avec dry_run et is_valid vrais et summary de type chaîne. Un objet 2xx différent, une ressource créée, une erreur, une réponse perdue ou un délai dépassé ne sont jamais qualifiés de validation.

Le serveur enregistre un reçu minimal ; l'interface n'affiche une validation confirmée qu'après relecture concordante sous le JWT du coach. L'état de simulation est séparé de l'envoi au calendrier, qui reste absent. Le reçu reste sauvegardé mais le résultat d'affichage n'est pas restauré automatiquement après rechargement.

## Vérifications

- Dernière sélection ciblée : 216/216 réussis, types valides, lint sans erreur avec 1 avertissement préexistant.
- Sélections antérieures : 83 tests ciblés et 190 tests Nolio réussis, non additionnés avec la dernière sélection.
- [CI Deno indépendante](https://github.com/Vinch11/tfclab/actions/runs/41662179351) réussie sur 18 fichiers exacts au commit source 22ffbe79 ; les 18 fichiers serveur ont été relus au commit final et sont tous identiques. Snapshot `4f87a41b82b130ca414138cb0cd5277fb62e589c`.
- Base : anon aucun droit sur les reçus ; authenticated SELECT sous RLS coach propriétaire ; service_role SELECT/INSERT uniquement.
- Une validation positive exige explicitement un statut HTTP non nul, HTTP 2xx et un hash. La contrainte additionnelle ferme le cas CHECK évalué à NULL.
- Aucun reçu réel présent au contrôle ; grant toujours active, génération 1, refresh idle, une connexion active.
- Seule la nouvelle fonction dry-run a été déployée. Le sender et la fonction OAuth n'ont pas été modifiés.
- Le refus sans JWT répond 401. Les tests utilisateur différents du propriétaire ont été simulés ; aucune nouvelle session réelle B n'a été utilisée.

## Contrat primaire et limites

Sources consultées : [OpenAPI Nolio V2](https://www.nolio.io/api/v2/openapi.json) et [guide officiel](https://media.cdn.nolio.io/api/migration-v1-to-v2.pdf), section 8.1. Le guide décrit la validation sans sauvegarde. Le contrat machine décrit dry_run dans le texte de l'opération et la réponse WorkoutDryRun mais omet le flag dans les propriétés de requête et ne précise pas son statut HTTP. Cette ambiguïté est conservée : aucune substitution par un POST de création.

Aucun dry_run Nolio authentifié n'a été exécuté par l'agent. La preuve réelle reste à obtenir par le clic manuel dans la session du coach. Aucun envoi au calendrier, plan complet, renouvellement effectif de jeton ou validation sportive n'est attesté. Les comptes, grant, jetons, consentement et association restent conservés ; V1, main et TFCLab v2.1 inchangés.

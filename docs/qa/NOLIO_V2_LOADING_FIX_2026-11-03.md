# Nolio V2 QA — chargement borné, vérification finale du 3 novembre 2026

Le chargement silencieux est corrigé dans la QA isolée. Source finale `1626acd828828099a1d85e851bf15e2453b92240`, release `8a4a2b73a1056b0fc1933f04d58d5ff91202b9489efc02c234c3ff69d9203fb1`, non attestée et non publiée. La lecture des sports dans la session réelle du coach reste à confirmer.

La limite générique de 8 secondes pouvait produire un rejet sans message. Le serveur attendait jusqu'à 30 pages successives, sans budget global. Les sports disposent maintenant de 12 secondes au total et la bibliothèque d'exercices de 8 secondes. Une bibliothèque lente laisse revenir les sports validés, avec exercices explicitement indisponibles et séances de force bloquées. Un échec sur les sports conserve les anciennes références.

Côté page, chargement et relecture partagent un verrou et une limite totale de 45 secondes. Les autres actions disposent de 20 secondes. Le résultat de l'action reste affiché si la relecture échoue. Le premier clic, le changement A→B, la déconnexion et les réponses tardives sont couverts sur le composant de page réel avec backend simulé.

## Vérifications

- Dernière suite sélectionnée : 208 réussis, 1 ignoré, aucun échec ; 7 tests de la page réelle réussis.
- Précédente sélection Nolio + pilot-review + page : 189 réussis avant les deux derniers tests. Ces nombres concernent des sélections différentes et ne s'additionnent pas.
- Types, lint sans erreur et preview valides ; 1 avertissement lint signalé.
- [CI Deno indépendante réussie](https://github.com/Vinch11/tfclab/actions/runs/41650858367) sur 15 fichiers serveur exacts de `764a6200`. Leurs contenus ont été relus au commit final : tous identiques à ceux contrôlés. Snapshot `ea7d90f1aaf45da9e7f934cbe3eb80b0ca0446af`.
- Audit final des seuls métadonnées : autorisation Team V2 en `pending_refs`, athlète et consentement présents, génération 1, refresh idle, références absentes, 0 connexion active. Aucun jeton ni identifiant d'athlète Nolio consulté.

## Limites et essai

Aucun appel Nolio réel par l'agent, aucune activation, aucun dry_run/envoi. La cause réseau précise n'est pas observée ; les défauts de gestion des délais sont établis dans le code. Le contrôle Deno porte sur les types, pas sur le fournisseur réel.

Dans la session Coach A : actualiser /__qa/pilot-review, cliquer « Vérifier l'état de connexion Nolio V2 », puis « Charger les sports Nolio ». Relever le résultat visible. Aucune nouvelle autorisation ni rotation de clé nécessaire à ce stade.

La production TFCLab v2.1, V1 et main restent hors de ce lot. La validation sportive et l'autorisation du pilote restent distinctes.

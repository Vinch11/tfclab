# Nolio V2 — essai réel unique prêt, non exécuté

Le parcours QA est prêt sur `/__qa/pilot-review`, source sauvegardée `e71a70c15ffbd87958dd85f60304e42ca75260f0`. **Aucune séance n'a encore été envoyée.** Le contrôle administrateur final trouve 0 essai et 0 reçu pour Coach A et son athlète de test.

La simulation fournisseur précédente reste validée : HTTP 201 / `DRY_RUN_VALID`, reçu `fbc96836-1add-4f57-9a64-d3ce4378f428`, le 3 novembre 2026 à 17:40:46 UTC. Elle ne prouve pas une création dans le calendrier.

## Parcours dans la session du coach

1. « Vérifier l'état de connexion Nolio V2 », puis « Préparer l'essai (rien n'est envoyé) ».
2. Contrôler le **destinataire Nolio** et la **date affichée**. La séance est une course technique de 10 minutes, sans cible. La date seule est fixée une fois pour demain UTC lors de la première préparation ; elle ne change plus au rechargement ou le lendemain.
3. « Ajouter cette séance de test à Nolio » déclenche l'unique tentative de création, puis sa relecture. Après réservation, seule « Vérifier dans Nolio (lecture seule) » permet de poursuivre.

La préparation ne lit ni n'écrit le calendrier ; le chargeur de connexion peut toutefois renouveler OAuth si le jeton expire bientôt. Le nom Nolio provient de l'autorisation stockée liée à la référence exacte du corps. Un nom de fiche TFCLab est affiché séparément. Sans destinataire confirmé, l'envoi est bloqué.

## Protections vérifiées

- Une ligne figée par coach, athlète et recette ; date et empreinte immuables.
- Réservation SQL atomique `frozen → sending` avant tout POST ; aucun nouvel envoi après timeout, perte de réponse, 5xx, 4xx ou 429.
- L'acceptation HTTP est distincte de la vérification : seul un reçu concordant, relu sous RLS, peut confirmer une occurrence exacte unique.
- Lecture complète du jour et détail de chaque séance, dans la limite de 5 pages et 30 détails ; lecture partielle, doublon, contenu divergent ou budget dépassé ⇒ résultat inconnu/refusé.
- Aucun nouveau GET après l'échéance de relecture ; résultat tardif ignoré.
- Reçus en ajout seul, lecture propriétaire ; aucun INSERT/UPDATE/DELETE navigateur. Les preuves positives incomplètes sont refusées explicitement par les contraintes SQL et par le client.

La revue a corrigé le nom de destinataire, le traitement SQL de NULL et l'arrêt des lectures tardives. Les informations privées restent dans la seule réponse au coach ; aucun nom, lien privé, identifiant Nolio ou jeton réel n'est publié dans cette preuve.

## Vérifications terminées

| Vérification | Résultat |
| --- | --- |
| Tests ciblés de revue | 131 réussis dans 8 fichiers, données/HTTP injectés |
| Tests du manifeste | 5 réussis |
| Types / lint | Réussis ; un avertissement préexistant |
| [CI Deno indépendante](https://github.com/Vinch11/tfclab/actions/runs/41691971887) | Réussie sur 21 fichiers serveur exacts, imports complets |
| Déploiement | Seule `nolio-v2-trial-session` redéployée ; 401 sans JWT |
| Contraintes positives corrigées | 3 validées dans le schéma QA |
| Métadonnées du destinataire | 1 connexion, 1 autorisation concordante, nom confirmable ; aucune valeur privée lue |
| Conservation | 4 archives A et plans courants A/B inchangés avant/après |

Les cas SQL invalides ont été évalués par prédicats sur valeurs synthétiques, sans insertion dans les tables réelles. Les tests A/B du nouveau parcours sont des tests injectés et une inspection des politiques/droits ; ils ne prouvent pas un nouveau parcours de connexion en navigateur.

La [preuve JSON](NOLIO_V2_SINGLE_REAL_TRIAL_2026-11-03.json) et la [provenance des 21 fichiers](NOLIO_V2_SINGLE_REAL_TRIAL_DENO_PROVENANCE_2026-11-03.json) donnent les empreintes et les limites. La CI effectue un contrôle statique, sans exécuter les fonctions ni appeler Nolio. La source runtime n'est pas attestée cryptographiquement par cette CI.

## Limites et portée

Le corps exact de la création n'a pas fait un nouveau dry-run : il reprend la structure validée, avec nom/description/marqueur propres à l'essai réel. Nolio ne déduplique pas les créations ; la protection contre un second POST est locale et durable. La vérification porte sur les événements visibles du coach, dont ses propres créations.

Le succès réel restera à établir par le clic du coach puis un reçu `VERIFIED_UNIQUE`. Le renouvellement réel du jeton, l'export complet d'un plan et la validation sportive restent distincts. Manifeste `2ea17fbe59a39490b4ba6315a05a8ca2d0d54c40bade1c88212ad32beb631412` non attesté et non publié. V1, production TFCLab v2.1, main, plans et choix DET Engine / IA inchangés.

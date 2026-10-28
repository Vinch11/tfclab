# Journal des dix unités

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

| Unité | Travail | Preuves |
|---|---|---|
| 1 | Baseline and root-cause audit of 700 incomplete records | preuves V18, tests ciblés puis validation globale |
| 2 | Boundary-safe quantities and syntax regression | preuves V18, tests ciblés puis validation globale |
| 3 | Compositional timeline, explicit recovery and alternatives | preuves V18, tests ciblés puis validation globale |
| 4 | 127 strength execution models | preuves V18, tests ciblés puis validation globale |
| 5 | 119 swim distance and stroke models | preuves V18, tests ciblés puis validation globale |
| 6 | 55 brick and 32 mixed execution models | preuves V18, tests ciblés puis validation globale |
| 7 | 2425 goal-variant source bindings | preuves V18, tests ciblés puis validation globale |
| 8 | Coach, local Nolio and family scientific review | preuves V18, tests ciblés puis validation globale |
| 9 | Independent audit, sensitivity and historical non-regression | preuves V18, tests ciblés puis validation globale |
| 10 | Dossier, publication and explicit closure | preuves V18, tests ciblés puis validation globale |


1. Baseline propre, HEAD V17 exact ; manifeste des 3 399 fichiers suivis existants, PR ouverte en brouillon.
2. Lecture des causes de 700 fiches incomplètes ; priorité à la grammaire, refus de choisir arbitrairement la récupération finale.
3. Candidats de grammaire conservés dans `candidate-1/2/3.json` et `candidate-build-*` ; comptes et limites restent visibles.
4. Une extension d’activité nommée a masqué le caractère optionnel d’un éducatif. Le test de témoin V17 et le contrôle indépendant ont échoué (`contracts-direct-2.txt`, `independent-attempt-2.json`). Cette interprétation n’a pas été acceptée. La voie optionnelle a été rétablie et les 67 témoins vérifiés à l’identique.
5. Le calcul exact du protocole marche/course a mis au jour 37 minutes contre une annonce 24–30. L’erreur source est conservée et l’export refusé ; aucune durée n’a été tronquée.
6. Des alternatives pouvaient être portées au mauvais niveau d’une répétition. Le candidat est archivé ; la grammaire atomique attache désormais le choix au repos concerné, en conservant son inconnue.
7. Le premier superviseur `spawnSync` remontait EPERM malgré une sortie 0, reproduit même sur `node --version` et `python3 --version`. Arrêt conservateur de `validation-1`, aucun vert forcé. Le diagnostic asynchrone ne présente pas cette erreur ; la supervision utilise les événements error/close et les mêmes limites, sans ignorer les erreurs.
8. Contrats texte : refus des deux sources course contradictoires, d’où 831 au lieu de 833 ; les 920 rendus restent disponibles. Aucun quota de réussite fixé.
9. Validation bornée, rejeu dans un autre processus, contrôle Python et mutations ; les corrections indépendantes sont conservées.
10. Dossier coach, registre, empreintes et mise à jour de la PR expérimentale ; aucune fusion, donnée réelle ou activation de workflow.

Toutes les sorties intermédiaires et erreurs sont conservées. La reprise n’est ni un processus permanent ni une promesse de redémarrage automatique.

Compléments de l’unité 10 : la garde de dossier de revue rejetait à tort un chemin V18 imbriqué (`validation-2/family_review.txt`). Elle a été corrigée sans autoriser de chemin hors de `v18/evidence` ; le rejeu candidat puis `validation-3` ont passé. Les logs Node vides ont conduit à la capture directe des rapports et à une correction ciblée du superviseur, avec tests négatifs. Deux incompatibilités de l’API locale jsdom 29 (exports CommonJS / retrait de ResourceLoader) ont été diagnostiquées ; la consultation finale est vérifiée avec ses ressources externes désactivées par défaut, des sources non interprétées comme HTML et aucun accès réseau. Les preuves des essais rejetés demeurent présentes.

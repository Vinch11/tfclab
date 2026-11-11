# Plan : séances précises, structurées et spécifiques

Objectif : chaque séance d'un plan a une durée unique, une structure exploitable par Nolio, et chaque objectif reçoit sa dose d'allure spécifique. Le parcours IA reste identique pour le coach (mêmes écrans, mêmes boutons).

## Étape 1 — Une seule durée par séance (plus de tranches)
- À la génération, toute tranche du catalogue (« 20–70 min Z2 ») est convertie en une valeur précise.
- Calcul : position dans la tranche selon le volume cible de la semaine, la phase (base → haut de tranche, affûtage → bas) et l'ambition ; arrondi à 5 min.
- La durée affichée, la durée comptée dans le volume et la durée envoyée à Nolio deviennent strictement identiques.
- Contrôle final : un plan contenant encore une tranche est signalé avant sauvegarde.
- Les plans déjà enregistrés ne sont pas modifiés ; une conversion leur sera proposée à l'ouverture.

## Étape 2 — Séances structurées
- Chaque séance course/vélo/natation est décrite en blocs : échauffement, corps (répétitions × durée ou distance, cible, récupération), retour au calme.
- Les cibles viennent du bilan via la doctrine TFCL (LT1 → MLSS → VO₂max) : allure, puissance ou FC. Donnée absente = « Donnée manquante », jamais de valeur inventée.
- Envoi à Nolio en séance structurée ; le texte reste en commentaire. Si une séance ne peut pas être structurée, elle est envoyée en texte avec une alerte visible.
- Vérification sur un plan réel envoyé à un compte Nolio de test avant d'annoncer que c'est fait.

## Étape 3 — Quota d'allure spécifique par objectif et par phase
- Tableau de quotas proposé pour 5 km, 10 km, semi, marathon, trail, 70.3, Ironman (ex. 10 km : 1 séance/sem à allure 10 km en phase spécifique, rappels courts en affûtage).
- Valeurs soumises à votre validation avant activation.
- Appliqué au choix des séances par l'IA, à la prévalidation sans IA et au contrôle final ; non respect = avertissement avec « Sauvegarder quand même », pas d'interdiction.
- Tests de non-régression par discipline.

## Étape 4 — Fiches compatibles avec l'objectif
- Une fiche marquée pour un autre objectif (ex. « semi » dans un plan 10 km) ne peut plus être séance clé ; elle reste possible comme séance facile si elle est neutre.
- Correction appliquée au mécanisme commun de sélection du catalogue, pas par exception.

## Ordre et livraison
1 et 3 d'abord (ce qui vous gêne le plus), puis 4, puis 2 (le plus lourd, dépend de Nolio).
Chaque étape : tests ciblés, version du générateur mise à jour, fonctions remises en ligne, vérification sur un plan de Vince régénéré (environ 0,5 crédit par génération).

## Ce que j'aurai besoin de vous
- Valider le tableau des quotas d'allure spécifique (étape 3).
- Un athlète Nolio de test pour l'envoi structuré (étape 2).

## Détails techniques
- Résolution des tranches : post-traitement déterministe après parsing (`aiPlanParser` / `mergePlanChunks`), helper pur partagé `_shared` pour client et edge function, règle de validation ajoutée à `finalValidation.ts`.
- Structure : schéma `steps[]` par séance, mapping vers le format structuré Nolio dans la fonction d'export ; cibles via `tfclDoctrine.ts`.
- Quotas : contrats hebdomadaires existants (layout, prévalidation, validation finale), nouvelle clé `specificPace` par objectif × phase, câblée dans les trois routages d'objectif.
- Compatibilité : filtre dans `buildWorkoutCatalog` sur `goals[]` pour `isKeySession`.

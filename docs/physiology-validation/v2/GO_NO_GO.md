# Critères de GO / NO-GO

## Revue technique F1–F4 — conditions satisfaites dans le périmètre testé

- Reproductions rouges archivées, corrections dans le code réel, tests verts après.
- Coût O₂ et score distincts ; coût absent/invalide ne crée pas de valeur ; proxy seuil/VMA conservé.
- Discipline explicite de VLa respectée dans snapshot et test lié ; ambiguïté conservée, non devinée.
- Bornes existantes conservées ; aucune équation, calibration ou fixture QA remplacée.
- Métadonnées connues traversant sauvegarde/réouverture, diagnostic, plan et rapport ; inconnues non comblées.
- Effets attendus sur les 37 profils séparés des blocs invariants ; historique des traces préservé.
- Typage, build et tests de protections normaux passent ; aucune attestation de déploiement créée.

Ces résultats autorisent une **revue de la correction** ; ils ne constituent pas une approbation de fusion ou de mise en production dans cette mission.

## NO-GO scientifique global maintenu

Une revendication d'exactitude indépendante nécessite les archives qualifiées ou un protocole indépendant exécuté : observations, protocole, version figée, séparation calibration/validation et incertitude de référence. Les erreurs historiques de groupe et les marges heuristiques ne suffisent pas pour certifier chaque profil individuel.

Une revendication de cohérence entre ratio seuil/VMA et %VO₂max demande une justification de la grandeur et de sa transférabilité. Supprimer une comparaison dans la mauvaise unité ne valide pas le proxy restant.

Une revendication d'efficacité de prescription exige sa preuve propre : limiteur causal, stimulus, dose, contexte, capacité et réponse. Le fait que DET reçoive correctement des valeurs ou qu'un calendrier soit construit ne satisfait pas ce critère.

## Conditions avant intégration éventuelle

1. Revue des fichiers modifiés et des quatre corrections, notamment discipline explicite, admission CE et version des traces.
2. Décision sur le format de métadonnées dans les notes, la taille maximale et les lecteurs legacy ; aucune migration silencieuse des données existantes.
3. Revue des adaptations DET V22/V23 dans un chantier distinct, avec unknown distinct de cohérent ; aucune modification de #420 ici.
4. Selon la cible d'intégration, smoke test navigateur des parcours import/édition/rapport et test de sauvegarde autorisé dans un environnement non réel. Les mocks ne certifient pas RLS ou impression.
5. Décision scientifique sur les archives N=44/N=15/Modèle C et sur les affirmations à maintenir dans les écrans/rapports parallèles.

## Décision de clôture

**PR DRAFT — NO-GO.** Aucun GO sportif individuel, aucun GO expérimental global, aucune fusion, publication de site ou activation automatique. Les preuves acquises sont conservées et les inconnues restent explicites. Aucune API payante, donnée réelle modifiée, migration ou déploiement.

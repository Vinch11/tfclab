# TFCLab V3 — État concret du pilote (30 octobre 2026)

## Périmètre réellement livré
- **48 recettes candidates, 12 par sport** (bike/run/swim/strength) dans \`src/lib/libraryV3/v3PilotCatalogue.json\`.
- **352 recettes restent à rédiger** avant l'objectif de 400 (100 par sport).
- Chaque fiche : ID stable, intention principale et domaine TFCL, explication, phases, niveau, précautions, arrêt, récupération, sources dont la portée est déclarée, blocs exécutables et limites de variation. Pas de simple duplication en changeant 5×3 en 6×3.
- Les fiches sont des **conceptions TFCLab originales** nourries par des principes, et non des reproductions prétendument publiées par Dan Lorang, Seiler, Bu ou Billat.
- Le moteur existant \`workoutLibrary.ts\` n'importe pas ce pilote ; aucune modification de prescription en production ; \`automaticSelection=false\` pour les 48 fiches.
- Le calculateur \`catalogueRuntime.ts\` calcule les durées de tous les segments chronométrés et les repos **entre** répétitions (pas de repos final ajouté). Il accepte des surcharges uniquement dans les bornes déclarées.
- Quand la natation contient des distances et que les allures mesurées correspondant aux domaines manquent, le total reste **non résolu** ; jamais de conversion mètres → minutes en silence.
- Les temps des exercices en répétitions de préparation physique sont **estimés**, pas des durées certaines de séance (installation, réglage des charges et transitions inconnus).
- Les tests Vitest \`catalogueRuntime.test.ts\` couvrent l'inventaire, les intentions et sources, les durées, les bornes, le risque de faux calcul natation, l'incertitude force et les doublons. Résultat CI à lire dans la PR ; la présence d'un test ne vaut pas preuve de son passage.

## Exemple vérifiable
- \`V3P_BIKE_008\` : échauffement 18 min ; 3×12 min MLSS ; 2×6 min récup ; retour 12 min = **78 min**. 4 répétitions est dans la borne pilote, durée totale **96 min**. Toute réduction/augmentation reste soumise à validation sportive, fatigue et charge cumulée.
- \`V3P_RUN_009\` : 20 + 5×3 + 4×3 + 12 = **59 min**.
- \`V3P_SWIM_007\` : 300 m échauffement + 12×100 m + 200 m retour = **1 700 m**, 11×20 s récupération. Durée **inconnue sans CSS/allures par domaine**. Exemple purement mathématique à des allures individuelles fournies 120s/100m récupération et 100s/100m seuil : 2 020 s. Ces allures ne sont pas attribuées à un athlète réel.

## Références vérifiées — appui sur le principe, NON sur la recette
- Oliveira et al. 2024, répartition d'intensité : https://pubmed.ncbi.nlm.nih.gov/38717713/
- Individual participant network meta-analysis 2025, niveau sportif et TID : https://pubmed.ncbi.nlm.nih.gov/39888556/
- Cove et al. 2025, interventions chez cyclistes : https://pubmed.ncbi.nlm.nih.gov/39788807/
- Revue nageurs 2021 : https://pubmed.ncbi.nlm.nih.gov/33952709/
- Revue sprint nageurs 2025/2026 : https://pubmed.ncbi.nlm.nih.gov/41269307/
- Revue / méta-analyse musculation course 2024 : https://pubmed.ncbi.nlm.nih.gov/38627351/
- Umbrella review musculation endurance 2025 : https://pubmed.ncbi.nlm.nih.gov/40153564/

## Contrôles bloquants pour l'intégration
1. Augmenter à **100 recettes vraiment distinctes par sport**, vérifier la couverture complète (nage technique et nage spécifique ; vélo 70.3/IM/CLM ; course 5/10/semi/marathon/trail ; renfo pour niveaux et profils variés).
2. Revue scientifique et coach **fiche par fiche** ; cette étape peut corriger/rejeter les recettes candidates sans les maquiller.
3. Audit des domaines, récupération, temps de travail intense, zones, sécurité selon profil, niveau, terrain et contraintes de semaine.
4. Construire un adaptateur V3 → catalogue existant **uniquement lorsque les durées sont déterminées** et que les règles sportives/exports sont conservées.
5. Rejouer les cas de génération 70.3 D1 où S2/S3 échouaient, plus profils de référence multisports, sans adoucir les validateurs.
6. Contrôler édition/sauvegarde/réouverture en Supabase isolé et export Nolio/PDF.
7. Fusion et activation seulement après preuves. **NO-GO production maintenu**.

## Commandes
\`\`\`sh
bunx tsc --noEmit -p tsconfig.app.json
bun run vitest run src/lib/libraryV3/__tests__/catalogueRuntime.test.ts
\`\`\`

Cette PR est **un premier lot technique**, pas un catalogue complet ni un produit activé.
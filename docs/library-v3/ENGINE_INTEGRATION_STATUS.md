# TFCLab — V3 branchée sur le VRAI moteur (pilote fermé)
Date : 2026-10-30 — PR #444, non fusionnée

## Problème initial résolu dans le code
La bibliothèque de 400 recettes vivait seulement dans scripts/library-v3 et un fichier HTML indépendant. Cela ne répondait pas à l'objectif du coach. Le code du moteur réel a maintenant un adaptateur V3 et une voie de sélection explicite.

### Chemin technique effectif
1. \`scripts/library-v3/v3PilotCatalogue.json\` et 4 expansions → 400 recettes sources structurées.
2. \`src/lib/v3EngineBridge.ts\` → ingestion par ID ; conversion en \`LibraryWorkout\` avec chronologie, durée exacte si possible, domaine TFCL, intention, sport, phases, niveau, notes et objections de sécurité.
3. \`src/lib/workoutCatalogBuilder.ts\` → \`buildWorkoutCatalog\` peut inclure les fiches V3 **uniquement** via \`options.v3CoachPilot\`, avec \`coachReviewedIds\` et niveau qualitativement saisi par le coach, source \`manual\`. Les 920 anciennes fiches restent le chemin par défaut.
4. \`src/lib/plan/prepareGenerationContracts.ts\` → passe le pilote à la construction des catalogues **de phase, de chunk et de régénération** du vrai générateur.
5. \`src/hooks/useAITrainingPlan.ts\` → \`generatePlanWindowed\` accepte un troisième argument pilote, pour les plans courts et les plans multi-fenêtres.
6. \`src/pages/AITrainingPlanPage.tsx\` → en **DEV uniquement**, contrôle réservé aux comptes coach, option explicite et maximum 20 IDs revus pour tests du générateur. Aucun accès aux athlètes.
7. \`src/lib/plan/sessionCatalogueValidation.ts\` + \`AITrainingPlanPage\` → acceptent le registre V3 pour vérifier IDs, sport, phase, durée, intensité en contrôle final/édition.
8. Le bouton de sauvegarde standard est **bloqué si le plan contient un ID V3**. Pas d'export automatique Nolio/persistance Supabase autorisé comme preuve.

### Ce que « moteur exploitable » signifie exactement pour cette branche
- Le vrai \`buildWorkoutCatalog\` filtre, score et sérialise une carte V3 approuvée nommément, et le contrat final peut la vérifier. Ce n'est plus un simple éditeur HTML.
- L'exécution initiale reste un **pilote de développement**, pas une activation production.
- Un ID V3 **sans revue explicite** n'est **jamais** disponible au moteur ; un niveau non saisi manuellement exclut la fiche.
- Le profil physiologique, les limiteurs, la charge qualitative, les phases, restrictions, quota sport, semaine de récupération et cohérence de microcycle restent la responsabilité du pipeline existant. Les tests du contrat ne prouvent pas automatiquement qu'un plan est sportif de qualité.
- Les fiches natation ne reçoivent pas de durée inventée : sans repères d'allure explicites par domaine, elles sont refusées par le pont ; une interface doit encore transmettre ces repères depuis un profil vérifié.
- Le renforcement refuse d'être converti en séance planifiée avec une durée certaine tant que les temps de transition/installation ne sont pas modélisés.
- **400 recettes existent, pas 400 autorisations automatiques.** Le nombre de fiches réellement admissibles varie selon la revue coach, le niveau et les métriques connues.

## Attestation et CI
Modifier des fichiers dans src invalide légitimement l'empreinte source actuelle. Le workflow séparé \`.github/workflows/v3-source-declaration.yml\` génère une déclaration **fidèle au commit source de cette branche** au moyen de \`scripts/preproduction/plan-release-source.mjs --write\` ; il conserve \`attested=false\` et ne déploie rien. Cela **n'atteste pas** une application de production, pas plus qu'une recette Supabase réelle.
La CI de la PR doit passer entièrement avant tout rapprochement de production.

## GO encore nécessaires
1. Vérifier les tests d'intégration V3 de la PR, puis reproduire les échecs D1 70.3 avec des profils synthétiques et des sources de durée réelles.
2. Qualifier les premières 20 séances (domaine, intensité, objectifs et limiteurs, contre-indications) ; ne pas considérer la seule validation de structure comme une validation sportive.
3. Traiter les 72 formules de répétitions proches en renforcement, sans les « approuver en série » automatiquement.
4. Couvrir l'absence de durée natation et l'estimation du temps de musculation, sans allonger artificiellement une séance.
5. Vérifier sauvegarde / édition / réouverture / restauration Supabase isolé et exporter sans pertes vers Nolio/PDF.
6. Nouvelle attestation du release candidat puis décision GO/NO-GO, sans fusion silencieuse de cette PR.

**Verdict : CÂBLAGE MOTEUR PILOTE EN BRANCHE — NO-GO SCIENTIFIQUE / PERSISTANCE / PRODUCTION.**

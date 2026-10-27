# DET-ENGINE — prototype expérimental

Base inspectée : main `3a2ba77a71b8177dc1ed841c488cd79b55f3eeb6` (#419).
Branche indépendante `experiment/det-engine`. Aucun branchement dans le frontend,
aucun changement des fonctions Edge ou des données. Aucun modèle requis.

## Chaîne et sources existantes

| Étape | Source réutilisée |
|---|---|
| Profil, incertitudes, limiteurs, ambition effective, niveau coach | `prepareTrainingPlanContext`, diagnostic existant, `ambitionDowngrade`, `physiologicalTargets` |
| Adaptations et pertinence du pool | `buildWorkoutCatalog`, filtres niveau/blessure/prohibitions, scoring limiteurs existant |
| Cycles, phases, événements | `buildPeriodizationCalendar`, `prepareGenerationContracts`, `declaredRaceSlotsForWeek` |
| Quotas, planchers, charge et progression maximale | `computeWeekQuotaEntry` → `computeWeeklySessionQuota`, `applySlFloorIndividualization`, `buildCoachVolumeBudget` |
| Placement | `buildWeeklySlotLayout`, contraintes de jours, récupération, LCW |
| Sélection | recherche bornée du prototype dans les fiches éligibles, sans création de séance |
| Compatibilité | `evaluateRepairSportingEquivalence`, `checkSessionCatalogue`, fréquence catalogue |
| Validation | prévalidation existante, `validateWeeklyQuotas`, `validatePlan`, validation finale B13/B14/B15 |
| Route statique | `buildStartToRunTemplatePlan`, sans réinventer sa progression |

`repairCandidateCompatible` est un wrapper privé Edge autour de
`evaluateRepairSportingEquivalence` avec contrôle de provenance des métadonnées.
Le prototype consomme directement les métadonnées structurées autorisées par le
pool préparé et le même évaluateur ; il n'importe pas le handler réseau.
`findReplacement` est privé dans `planReconciler` : ses principes de filtrage,
départage par usage et refus sans candidat sont repris ; son repli de saturation
n'est pas utilisé, les caps explicites du catalogue restent obligatoires.
Une extraction commune éventuelle doit garder les contrats de réparation avant
modification des composants de production. Aucune copie des règles d'intensité.

## Recherche

Chaque créneau reçoit une fiche réellement présente dans le catalogue de la
semaine. La dose appartient à la plage existante et satisfait les bornes du
créneau ; les variantes en prose ne sont pas utilisées. La structure est
conservée. L'algorithme cherche la première affectation faisable dans un ordre
déterministe : usage antérieur puis ordre du pool préparé puis identifiant.
B13 impose en outre un identifiant distinct par semaine. Les caps hebdomadaires, la séparation des séances de qualité et les plafonds de
charge sont des contraintes de recherche. La validation finale demeure indépendante.
Un épuisement de budget signifie « recherche incomplète », jamais « impossible ».
Un refus d'affectation concerne ce pool et ce placement, pas tous les plans possibles.
La trace expose fiche, intention, dose, semaine, jour et principe de choix.

Limites : la durée minimale autorisée est choisie ; cela ne démontre pas une dose
optimale. Les progressions portent sur les bornes et les phases existantes, pas
encore sur un objectif physiologique quantifié à l'échelle du cycle. L'ordre du
pool n'est pas une fonction d'utilité prouvée ; le moteur est un solveur de
satisfaction, pas encore un optimiseur sportif global. La diversité est limitée
aux candidats admis ; aucune diversité ne justifie une violation.

## Interprétation des sorties

- `technicallyConstructed` : toutes les semaines ont été assemblées.
- `constraintsSatisfied` : aucun blocage/erreur/critique des contrôles exécutés.
- `sportingRelevance: not_attested` : pas de certification scientifique automatique.
- `humanReviewRequired: true` : charge initiale, incertitudes, dose et compétition à revoir.

Les durées de compétition restent non estimées (0, avertissement explicite),
sans fausse séance catalogue. Cela limite toute conclusion sur la charge totale
et interdit une utilisation directe. Les trail sans quotas dédiés sont refusés,
sans transposition des règles route. Le template StartToRun contraint est refusé
si l'adaptation requiert de nouvelles décisions. Aucun refus n'est présenté
comme une réussite sportive.

## Gouvernance et boucle

#407 (`2515fa8`) est une proposition non fusionnée ; aucun cherry-pick ni
activation. Réutilisation des principes : preuves identifiées, budget API nul,
arrêt sur régression, revue humaine/scientifique distincte des tests logiciels.

`node scripts/det-engine/loop.mjs /tmp/det-loop [ancienne-matrix.json]`
exécute types, tests réels et matrice, journalise et compare chaque cas.
Plafonds : trois itérations, trente minutes, deux workers, heap Node 2048 Mo par
processus, 15 minutes par commande ; aucun appel payant. Ce heap n'est pas une
limite RSS OS. Chaque invocation s'arrête après sa mesure : aucune répétition
sans correction et aucun auto-patch aveugle. Les corrections appartiennent à la
session de développement, puis relance avec baseline explicite. L'agent de
correction autonome persistant et l'isolation OS stricte ne sont pas implémentés.
Le contrôleur ne publie rien ; les preuves sont commitées dans la PR brouillon.

## Critères d'intégration (actuellement NO-GO)

1. Couverture de chaque objectif/ambition et de chaque format, avec refus justifiés
   séparés des cas réalisables ; trail dédié et LCW complets attestés.
2. Zéro erreur de contrainte sur chaque plan déclaré conforme ; aucun nouveau
   défaut sur une configuration auparavant conforme.
3. Plans complets rejouables, provenance des fiches et événements vérifiée ;
   pas de dose/structure inventée, pas de durée de compétition fictive.
4. Revue scientifique indépendante de l'individualisation, des incertitudes,
   de la progression des stimuli et de la récupération. Aucun seuil nouveau
   de méthodologie n'est introduit pour améliorer les chiffres.
5. Non-régression de la suite existante, budget et arrêts testés, artefacts liés
   aux SHA et empreintes. Revue humaine avant tout branchement produit.

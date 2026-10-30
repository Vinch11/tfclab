# TFCLab — Bibliothèque paramétrable V2 · pilote de 20 modèles

**Statut : PILOTE ISOLÉ / NON INTÉGRÉ / NON AUTORISÉ POUR LA PRESCRIPTION.**

Le pilote est isolé dans `experimental/workout-v2/` ; ses tests restent dans `src/lib/workout-v2/__tests__/`. Ainsi, son code n'entre pas dans l'empreinte de release du frontend actif.\n\nCe paquet n'altère ni `WorkoutLibrary` (V1), ni `computePlan`, ni le catalogue existant, ni les exports Nolio/PDF, ni la base de données. Pas de nouvelle route ni de feature flag nécessaire puisque rien en production n'importe ces fichiers.

## Objectif livré dans ce lot

- 20 **familles** de séances paramétrables pour les six sports/modalités `run`, `bike`, `swim`, `trail`, `brick`, `strength`.
- Couverture des 13 objectifs déclarés par `WorkoutGoal` : `start_to_run`, `5k`, `10k`, `semi`, `marathon`, `sprint`, `olympic`, `half`, `ironman`, `trail_short`, `trail_mountain`, `trail_long`, `trail_ultra`.
- Paramètres entiers bornés, calcul de durée à la seconde, récupération **entre** répétitions et non après la dernière.
- Ancrages sportifs séparés : FTP vélo en W, VMA course, allure seuil course, CSS crawl, RPE. Une référence absente, mal typée ou non vérifiée est refusée ; aucune substitution entre sports.
- Des **candidats de revue coach**, jamais des prescriptions individuelles approuvées.
- Des tests de couverture, durée, reproductibilité et refus ; résultats GitHub CI à contrôler sur le SHA final.

## Modèles (20)

| ID | Discipline | Famille / rôle |
|---|---|---|
| V2_RUN_01 | Course | Courir–marcher, reprise |
| V2_RUN_02 | Course | Endurance facile / récupération |
| V2_RUN_03 | Course | Sortie longue |
| V2_RUN_04 | Course | Intervalles allure seuil |
| V2_RUN_05 | Course | Intervalles orientés VO2 |
| V2_RUN_06 | Course | Lignes droites et coordination |
| V2_BIKE_01 | Vélo | Endurance extensive |
| V2_BIKE_02 | Vélo | Intervalles modérés / seuil |
| V2_BIKE_03 | Vélo | Intervalles haute intensité |
| V2_BIKE_04 | Vélo | Spécificité compétition |
| V2_SWIM_01 | Natation | Endurance contrôlée |
| V2_SWIM_02 | Natation | Répétitions crawl CSS |
| V2_SWIM_03 | Natation | Éducatifs techniques minutés |
| V2_TRAIL_01 | Trail | Répétitions de montée |
| V2_TRAIL_02 | Trail | Sortie longue terrain |
| V2_TRAIL_03 | Trail | Habituation aux descentes |
| V2_BRICK_01 | Triathlon | Enchaînement vélo–CAP facile |
| V2_BRICK_02 | Triathlon | Enchaînement spécifique course |
| V2_STRENGTH_01 | Renfo | Force maximale membres inférieurs |
| V2_STRENGTH_02 | Renfo | Stabilité / mobilité / prévention |

Un objectif peut être compatible avec plusieurs modalités ; **couverture** signifie présence d'au moins une famille pour cet objectif, pas plan complet, adéquation clinique, ni variété suffisante pour toutes les semaines d'une saison.

## Exemple d'utilisation programmatique (isolée)

```ts
import { instantiateWorkoutV2 } from "../../experimental/workout-v2/instantiate";

const res = instantiateWorkoutV2("V2_BIKE_02", {
  goal: "half",
  phase: "build",
  level: "trained",
  readiness: "ready",
  pain: false,
  recoveryConcern: false,
  anchors: { ftpW: { value: 280, verified: true, sport: "bike" } },
  parameters: { repeats: 4, workSec: 600, recoverySec: 180 },
  maxDurationSec: 7200,
});
if (res.ok) console.log(res.candidate.steps, res.candidate.plannedDurationSec);
// Ce n'est pas une autorisation de prescription, ni une exportation Nolio.
```

## Règles et limites scientifiques

1. Les durées, répétitions, plages d'intensité et paramètres sont des **propositions éditoriales initiales** pour prototypage. Les publications citées soutiennent des principes généraux ou des résultats de groupes ; elles ne valident **pas** les bornes numériques individuelles de ces 20 modèles.
2. RPE est un repère de prescription qualitatif ; RPE faible ne prouve pas LT1. FTP n'est pas MLSS mesuré. Une fraction en pourcentage de VMA/FTP ne garantit pas un temps précis à VO2max.
3. En natation, CSS crawl n'est utilisée que pour les répétitions crawl ; jamais pour chronométrer des éducatifs ou une autre nage. Le temps calculé à la seconde représente la **cible théorique**, pas une nage réalisée.
4. En force, le temps est calculé à partir des répétitions et **du tempo déclaré**. La charge, l'exécution réelle et la technique restent à confirmer. Aucune conversion en fréquence cardiaque.
5. Les sorties trail n'infèrent ni dénivelé ni exposition excentrique à partir des minutes. Les bricks ont deux segments sportifs distincts et une transition explicitement chronométrée.
6. L'instanciation refuse la douleur signalée, la récupération défavorable, une readiness inconnue, l'insuffisance de niveau, une phase ou un objectif incompatible, un paramètre hors plage ou un dépassement du budget temporel. Le dossier des blessures et la réponse individuelle relèvent toujours du coach.
7. Ni ces modèles ni leurs références n'ont été validés sur les 37 profils QA, 600 configurations, 920 ID/2 425 variantes existants. **Ils n'ont pas été raccordés à DET ENGINE.**

## Bibliographie (point de départ, pas labels de certification)

- Tønnessen et al. (2024), *Training Session Models in Endurance Sports*, Sports Medicine. DOI [10.1007/s40279-024-02067-4](https://doi.org/10.1007/s40279-024-02067-4).
- *Time spent at or near VO2max during high-intensity interval training*, revue/méta-analyse, 2026. [PMID 42237396](https://pubmed.ncbi.nlm.nih.gov/42237396/).
- *Biophysical analyses of various interval training sets at critical swimming velocity*, 2024. [PMID 39526869](https://pubmed.ncbi.nlm.nih.gov/39526869/).
- *The Effect of Strength Training on Endurance Performance Determinants*, umbrella review 2025. [PMID 40153564](https://pubmed.ncbi.nlm.nih.gov/40153564/).
- *A review of uphill and downhill running*, 2025. [PMID 41209300](https://pubmed.ncbi.nlm.nih.gov/41209300/).
- *Effects of tapering on performance in endurance athletes*, méta-analyse 2023. [PMID 37163550](https://pubmed.ncbi.nlm.nih.gov/37163550/).

## Contrat de fin de lot

**GO pour le noyau isolé** seulement si : 20 IDs uniques, couverture 13/13 objectifs et 6/6 modalités, instanciation des 20 modèles sans erreur avec entrées admissibles, refus négatifs, durées exactes, TS/Vitest/CI verts sur le SHA exact.

**NO-GO pour intégration automatique dans TFCLab** tant que les étapes suivantes manquent : adaptation des sorties au schéma structuré de prescription/validation existant, preuve de qualité des séances dans le plan, comparaison des refus DET avant/après, revue sportive coach et qualification Nolio. Aucun masquage ni levée implicite des refus DET existants.

> Une bibliothèque V2 intéressante n'est une amélioration produit que lorsqu'elle diminue les impossibilités imputables au catalogue, **sans introduire de prescription dangereuse ni dégrader les anciens plans**.


## Lot complémentaire — patrimoine V1 et test de raccord réel

- `experimental/workout-v2/v1Lineage.ts` : correspondance **explicite 20/20** avec des IDs V1 existants. La relation est `inspired_by_not_equivalent` pour les 20 : aucune dose, variante, phase ou permission V1 n'est héritée.
- `experimental/workout-v2/fit.ts` : recherche déterministe bornée (3 000 variantes au plus) d'une durée **exacte** en ajustant uniquement les paramètres de structure explicitement déclarés (bloc continu, répétitions, fractions, longueur vélo du brick, etc.). Les intensités, les récupérations, le sport et les gardes sportifs ne sont jamais manipulés pour remplir du temps.
- `experimental/workout-v2/planBridge.ts` : tentative de transformation d'un candidat V2 en **séance du schéma réel TFCLab** `zSession`. Une séance recalculée reste `custom=true` et `catalogId=null`, avec provenance V1 et consignes détaillées dans le texte. Jamais d'usurpation d'identifiant catalogue.
- Le schéma actuel de plan stocke `durationMin` comme entier : les candidats non divisibles exactement par 60 secondes sont explicitement refusés par le bridge, **sans arrondi ni perte de structure**.
- Les `exactSteps` V2 sont conservés **à part** du schéma V1. Pas de sauvegarde, validation sportive globale ou export Nolio revendiqué.
- Tests : `src/lib/workout-v2/__tests__/v1Bridge.test.ts` (20 sources V1 réelles, vrai schéma, pertes de secondes, anciens conflits de phases) et `fit.test.ts` (créneau brick 100 min, déterminisme et refus de profils inadmissibles).

### Sens précis de l'exemple « brick 100 minutes »

Ce test vérifie qu'une **recette V2 candidate** peut remplir un créneau de 100 min via 67 min de vélo, 15 min de course, 10 min d'échauffement, 3 min de transition et 5 min de retour au calme. La séance produite **n'est ni la séance V1 `BRICK_IM_Z2_RUN`, ni la séance 70.3 race-pace incompatible**, et n'a aucune autorisation de substitution dans un calendrier réel. Le test ne démontre PAS que le refus sportif S2 de #427 est levé, ni que ce volume est adapté à un athlète précis.

### Verdict séparé

- **Terminé pour ce sous-lot technique :** correspondance avec V1, structure paramétrable, calcul de temps exact, refus du schéma incompatible, tests spécifiques — sous réserve de CI finale verte.
- **Non réalisé :** activation dans `AITrainingPlanPage` ou DET-ENGINE #420, validation de plans complets, correction des refus de #427, raccord à la persistance ou aux exports Nolio/PDF, revue scientifique indépendante.
- **GO opérationnel : NON.** L'absence de ces éléments interdit de parler d'une bibliothèque V2 « en place dans TFCLab ».

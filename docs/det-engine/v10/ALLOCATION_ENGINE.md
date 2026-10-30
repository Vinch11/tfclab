# AllocateurV10 — candidat expérimental, NO-GO

L’allocateur remplace le partage égal V9 par une sélection jointe des sources, une réservation des minima de tous les rôles essentiels, puis une allocation du reliquat par priorité. Il ne calcule pas un optimum physiologique. Les fonctions de production et les contrats historiques sont inchangés.

## Chaîne exécutée

Profil et incertitudes → limiteur → adaptation hypothétique → rôles → domaines source → minima incompressibles → allocation priorisée → calendrier complet → contrôles et réévaluation. L’intention est empreintée avant la sélection. Recalculer une empreinte ne permet ni de relever le plafond existant ni de retirer un rôle essentiel.

Le domaine physiologique vient exclusivement de `src/lib/zones/tfclDoctrine.ts`. Les deux casIronman ont le même limiteur classé VLamax, avec valeurs différentes ; le programme ne transforme pas ces valeurs en minutes par une formule non validée. Le choix de discipline prioritaire et les enveloppes historiques sont explicitement fournis dans les cas synthétiques préenregistrés.

## Ce qui est réutilisé

-Préparation physiologique et quotas :preparePlanningCaseContext,prepareGenerationContracts et leurs protections initiales.
-Catalogue :buildWorkoutCatalog, métadonnées de réparation, generationEligibility, isLevelPrerequisiteIncompatible et checkSessionCatalogue.
-Calendrier :contrat temporelV6 sourcePlacement ; solveur candidat borné pour placer les doses déjà choisies.
-Contrôles historiques :validateExperimentalCandidate et ses validateurs originaux ; feedbackV9 conservé.
-Preuves scientifiques :[matriceV8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md), notammentR25/M21/S25 etL175/L417. Elles soutiennent le raisonnement et ses limites, pas les nombres de minutes.

## Algorithme borné

1. Les sept rôlesIronman ou cinq rôlestrail restent essentiels. Une impossibilité ne supprime pas silencieusement une discipline.
2. Chaque plage intersecte les bornes catalogue, le minimum de rôle et le plafond individuel préenregistré. Les recettes littérales reconnues ajoutent leur propre contrainte temporelle ; aucune répétition n’est comprimée.
3. Une borne indépendante par rôle est calculée, puis un appariement distinct exact par discipline borne le coût minimal conjoint. Le résultat est local aux domaines admissibles, pas une preuve d’impossibilité physiologique globale.
4. Une recherche jointe vérifie sources distinctes, budget, disponibilités et placement. Maximum10000nœuds d’affectation ; placement limité à3000nœuds. Un budget épuisé renvoie inconclusif. Il ne s’agit pas de permutations massives de remplacements isolés.
5. Pour le rôle prioritaire, la préférence de source porte sur une plage compatible plus étendue, sous réserve de faisabilité de tous les rôles. Après réservation de tous les minima, le reliquat remplit les plafonds par ordre lexicographique de priorité. Des minutes peuvent rester inutilisées.
6. Le calendrier est revérifié après allocation. Les inconnues et les erreurs historiques sont conservées séparément.

## Deux contrats de composition vélo comparés

**endurance_only** : deux sources distinctes d’endurance vélo. Sous les contraintes actuelles, le premier cas exige au moins505min par appariement, au-delà de480 ; pour le second, les deux rôles ne disposent pas de deux sources distinctes compatibles avec leurs enveloppes. Ces résultats sont conservés.

**long_plus_technical** : une endurance longue autonome et un travail de position aéro à dose explicite. Les deux fréquences vélo et les obligations d’endurance longue restent présentes. La séance technique ne devient pas artificiellement une dose longue. Ce contrat est une hypothèse de programmation candidate, pas une règle Lorang universelle ni une promotion méthodologique. Il demande une revue indépendante avant utilisation.

## Conflits de source révélés

V3_BIKE_Z2_PROGRESSIF décrit15+30+30+30+15=120min malgré un intervalle total90–150min. Le candidat retient120min, sans créer de variante. V3_BIKE_Z2_ENDURANCE_LONG commence à180min lorsque l’échauffement et le retour au calme explicitement décrits sont inclus, même si la borne déclarée commence à150. Les blocs de position indiquent un nombre de répétitions et de récupérations ; l’ambiguïté de la récupération après la dernière répétition reste une petite plage documentée.

Les recettes non reconnues gardent leur contrat numérique avec une inconnue de chronologie complète. Le prototype n’invente pas un parseur physiologique universel. Les écarts source et les inconnues restent visibles dans les dossiers.

## Audit des18refusV9

| DemandeV9 | Motifs conservés | Attribution démontrée | Témoins dépassant le plafond partagé |
|---|---|---|---|
| IM_reference:bike:0 | no_admissible_catalogue_dose_in_prospective_envelope | algorithmic_share_ceiling_plus_joint_constraints | V3_BIKE_Z2_ENDURANCE_LONG |
| IM_reference:bike:1 | no_admissible_catalogue_dose_in_prospective_envelope | algorithmic_share_ceiling_plus_joint_constraints | V3_BIKE_Z2_ENDURANCE_LONG |
| IM_glycolytic:swim:0 | no_classifiable_limiter | contingent_on_missing_individual_evidence | aucun témoin indépendant |
| IM_glycolytic:swim:1 | no_classifiable_limiter | contingent_on_missing_individual_evidence | aucun témoin indépendant |
| IM_glycolytic:bike:0 | no_classifiable_limiter | contingent_on_missing_individual_evidence | V3_BIKE_Z2_ENDURANCE_LONG |
| IM_glycolytic:bike:1 | no_classifiable_limiter | contingent_on_missing_individual_evidence | V3_BIKE_Z2_ENDURANCE_LONG |
| IM_glycolytic:run:0 | no_classifiable_limiter | contingent_on_missing_individual_evidence | SEILER_RUN_Z1_EASY_LONG, LYDIARD_RUN_AEROBIC_BASE_LONG |
| IM_glycolytic:run:1 | no_classifiable_limiter | contingent_on_missing_individual_evidence | SEILER_RUN_Z1_EASY_LONG, LYDIARD_RUN_AEROBIC_BASE_LONG |
| IM_glycolytic:strength:0 | no_classifiable_limiter | contingent_on_missing_individual_evidence | aucun témoin indépendant |
| Trail_known_history:run:0 | individual_vertical_eccentric_tolerance_unknown | contingent_on_missing_individual_evidence | V2_TRAIL_MARCHE_COURSE_ALTERNE |
| Trail_known_history:run:3 | no_admissible_catalogue_dose_in_prospective_envelope | algorithmic_share_ceiling_plus_joint_constraints | V2_TRAIL_MARCHE_COURSE_ALTERNE, LYDIARD_RUN_AEROBIC_BASE_LONG |
| Trail_known_history:targeted_TTE | no_individual_threshold_dose_tolerance_evidence | contingent_on_missing_individual_evidence | aucun témoin indépendant |
| Trail_unknown_history:run:0 | recent_history_missing, individual_vertical_eccentric_tolerance_unknown | contingent_on_missing_individual_evidence | V2_TRAIL_MARCHE_COURSE_ALTERNE |
| Trail_unknown_history:run:1 | recent_history_missing | contingent_on_missing_individual_evidence | V2_TRAIL_MARCHE_COURSE_ALTERNE |
| Trail_unknown_history:run:2 | recent_history_missing | contingent_on_missing_individual_evidence | V2_TRAIL_MARCHE_COURSE_ALTERNE |
| Trail_unknown_history:run:3 | recent_history_missing | contingent_on_missing_individual_evidence | V2_TRAIL_MARCHE_COURSE_ALTERNE |
| Trail_unknown_history:strength:0 | recent_history_missing | contingent_on_missing_individual_evidence | aucun témoin indépendant |
| Trail_unknown_history:targeted_TTE | no_individual_threshold_dose_tolerance_evidence | contingent_on_missing_individual_evidence | aucun témoin indépendant |

Les témoins de partage portent sur des sources individuelles ; ils ne suffisent pas à prouver la faisabilité globale. L’audit ne confond donc pas plafond arbitraire, conflit de minima distincts, source incompatible et donnée absente. Les trois refus de domaine catalogue V9 demandent une analyse jointe, pas seulement un plafond plus élevé. Les autres refus restent liés aux données individuelles ou aux capacités non attestées.

Aucun refusV9 survenu avant le placement n’est attribué à la disponibilité sans témoin calendaire. Aucune mauvaise hiérarchisation physiologique ou contre-indication n’est inventée comme cause racine ; les contrôles de prohibition/prérequis restent exécutés. Les fichiers détaillés conservent les bornes déclarées et littérales séparément.

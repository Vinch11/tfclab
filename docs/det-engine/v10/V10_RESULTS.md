# RésultatsV10 — DRAFT / NO-GO

## Progrès démontrés

Deux profilsIronman admissibles au prototype obtiennent chacun un microcycle complet de sept séances, à480min, sous le contrat candidat long_plus_technical. Même objectif, ambition, niveau, budget effectif et disponibilité ; doses différentes et expliquées par les priorités de discipline et les enveloppes d’historique préenregistrées. Aucun optimum physiologique n’est démontré.

| Profil | Budget déclaré/effectif min | Utilisation min | Rôles remplis | État candidat | Réparation expérimentale acceptée |
|---|---|---:|---|---|---|
| IM_aerobic_history | 600/480 | 480 | 7/7 | passes_executed_constraints | True |
| IM_balanced_history | 600/480 | 480 | 7/7 | passes_executed_constraints | True |
| IM_insufficient | 600/480 | 0 | 0/7 | fail | False |
| Trail_unknown | 600/420 | 0 | 0/5 | fail | False |
| Trail_documented | 600/420 | 420 | 5/5 | unknown_vertical_total | False |

Le témoin sans diagnostic reste refusé. Le trail sans preuve verticale reste refusé ; le trail documenté est assemblé à420min mais sa somme verticale totale demeure inconnue pour trois sources. Aucune réparation automatique de ce trail n’est acceptée.

Les deux contrats sont comparés sans masquer leurs différences. Le modèle endurance_only reste en échec :borne de minima distincts505min pour le premier profil contre480disponibles ; capacité de sources vélo distinctes insuffisante sous les enveloppes du second. Ces refus ne sont pas transformés en impossibilité sportive universelle.

## Individualisation et science

Les physiologies sont celles de deux archétypesQA existants ; les historiques synthétiques supplémentaires sont des spécifications de cas, pas des données réelles. La préinscription et son empreinte sont inchangées depuis avant l’inspection du catalogue. Aucune valeur n’a été ajoutée pour combler un refus.

Le test factoriel change seulement la physiologie en conservant les mêmes contraintes, priorités et le même limiteur classé :il ne force pas une différence artificielle de minutes. Les différences principales résultent de l’interprétation de discipline et des enveloppes individuelles, pas d’une relation VLamax→dose. La formalisation de ces interprétations dans un workflow réel reste à revoir.

LittératureV8 et principesL175/L417 sont utilisés pour raisonner, pas pour valider les valeurs des enveloppes. Règles de dosage, limites du cas, incertitudes et hypothèses méthodologiques sont distinctes. Aucun haut domaine d’intensité n’a été imposé pour satisfaire une étiquette historique.

## Réparations

Deux réductions à IDconstant passent la non-régression sur tout le microcycle :A_RUN_Z2_EASY70→60min et90→60min. Les autres doses et placements sont inchangés ; aucune nouvelle erreur critique ni avertissement exécuté. Les sources, minima essentiels, jours et plafonds restent respectés. Il s’agit de propositions expérimentales avec revue coach, pas d’écritures de production ni de réponses physiologiques observées.

L’ancienne famille de substitutionsV9 n’est pas répétée. Le trail reste bloqué par sa couverture verticale inconnue ; une ancienne sortie exploratoire trop permissive est conservée mais rejetée comme conclusion finale.

## Contrôles : trois lectures séparées

1. **Construction d’un microcycle complet** :deuxIronman et untrail assemblés ; deux témoins refusés. Un microcycle n’est pas un plan de préparation complet.
2. **Contrats candidat exécutés** :les deuxIronman passent les contraintes de source/dose, budget, rôles, disponibilités et espacement définis ; le bilan verticaltrail reste inconnu. Ces passes ne valent pas sécurité physiologique.
3. **Validateurs historiques inchangés** :toutes leurs erreurs sont conservées. Les routines de plan complet signalent notamment couverture, compétition et continuité de préparation sur un préfixe d’une semaine. Certaines infèrent une semaine de course et ne prouvent donc pas l’applicabilité du contrôle de phasebase. Le trail présente aussi l’erreur de catégoriesLorang. Zéro candidat n’est annoncé sans blocage historique ni revu par expert.

| Profil | Blocages historiques bruts | Avertissements historiques |
|---|---:|---:|
| IM_aerobic_history | 5 | 7 |
| IM_balanced_history | 5 | 7 |
| IM_insufficient | 9 | 12 |
| Trail_unknown | 5 | 2 |
| Trail_documented | 4 | 2 |

Aucune erreur n’a été reclassée pour améliorer les statistiques. Les inconnues de chronologie de certaines fiches, réponse réelle, tolérance clinique, nutrition et récupération restent visibles dans les dossiers.

## Validation réellement exécutée

-Typage :réussi après un échec de typage du témoin factoriel, conservé dans validation-types-rejected.
-TestsNode :62réussis.
-Suite expérimentale ordinaire :88réussis,39opt-in ignorés.
-TestsV10ciblés :12réussis, dont les deux sorties de simulation activées séparément. Ces12ne sont pas ajoutés au totalordinaire comme12tests tous distincts.
-Suite historique :2999réussis,1ignoré,6àfaire.
-Rejeu complet indépendant :allocations, microcycles, refusV9et résumés identiques octet pour octet.
-Cas négatifs :budget impossible, absence de disponibilité, données manquantes, verticale inconnue, recherche bornée, recettes non compressibles, modification illicite du cadre ou suppression d’un rôle essentiel.

Les600références et les preuvesV2–V9 restent préservées. Leurs registres ne sont pas relancés et les matrices historiques lourdes opt-in ne sont pas revendiquées comme régénérées. La régression multiobjectifs vient de la suite historique inchangée ; l’efficacité du nouvel allocateur n’est démontrée que sur ces cas synthétiques.

## Essais et limites conservés

Les premiers résultats ne font pas foi :la borne numérique de certaines fiches contredisait la somme de leurs blocs, le catalogue primaire retourné restait tronqué, et la première réparationtrail ignorait des doses verticales inconnues. Les preuves sont conservées ; les corrections renforcent les contrôles sans changer le catalogue ou les validateurs de production.

## Décisions humaines réellement nécessaires

Avant promotion ou usage réel :revoir la composition candidate endurance longue+position et son applicabilité par phase/niveau ; vérifier comment une observation individuelle fonde priorité et enveloppe de dose. Pour attester letrail, obtenir les dosesD+/D− et la provenance de parcours des trois séances encore inconnues. Cela ne nécessite pas de nouveau questionnaire de charge ni d’accès athlète.

Les corrections techniques réversibles futures restent possibles dans un nouveau registre borné. Aucune permission intermédiaire n’a été demandée. NO-GO maintenu pour intégration ; zéro planIronman/trail complet, zéro validation clinique ou expertise humaine revendiquée. Aucun changement de production, migration, dépense, écritureNolio/athlète, fusion ou déploiement.

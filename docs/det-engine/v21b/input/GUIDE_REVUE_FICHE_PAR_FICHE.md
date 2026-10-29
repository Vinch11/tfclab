# TFCLab V21B — Protocole d'affectation d'une preuve à une fiche précise

**Attention : la bibliothèque de 920 fiches n'a pas été réévaluée séance par séance dans ce livrable.** Le routage V21A a déjà conservé les sources, 2 425 variantes et empreintes. Ce document spécifie exactement comment transformer une connaissance de famille en revue par fiche sans fabriquer de preuve.

## Triage préalable

| Statut | Conditions minimales | Autorisation |
|---|---|---|
| `family_research_context` | Famille V21A concordante, note scientifique sourcée | Notes contextuelles uniquement |
| `workout_intent_candidate` | Source exacte, objectif + structure confirmés manuellement | Explication candidate au coach |
| `workout_mechanism_reviewed` | Argument physiologique compatible structure, population et contexte d'étude ; revue enregistrée | Justification du choix, **pas** dose |
| `protocol_dose_candidate` | Papier avec intervention complète accessible, comparaison des minutes, intensités, récupérations, répétitions, discipline et variantes | Proposition de dose en revue |
| `individual_prescription_reviewed` | Références effectives, capacité, disponibilité, fatigue, restrictions, calendrier, réévaluation; décision coach | Critères nécessaires mais pas suffisants pour production |

## Formulaire de revue pour chaque fiche

1. ID exact et SHA source effective, SHA d'éventuelle recette candidate V19.
2. Sport, phase, niveau, objectif d'origine, `when` et `avoid`; toutes les variantes actives.
3. Stimulus primaire; secondaires; mécanisme; qualification du type de relation (`declared_target`, `component_or_rationale_only`, `goal_scope_only`).
4. Segment de la séance justifiant cette intention **avec offsets vers la source**; exclure attribution par titre seul.
5. Population de l'étude, niveau, sexe et sport; intervention **travail + récupération + fréquence + durée**; comparateur; critère et éventuel résultat nul.
6. Comparaison technique à la recette (différences de durée, restes, domaine, biomecanique); distinguer étude aiguë versus chronique.
7. Variable individuelle nécessaire (FTP/CSS/VMA/CP/MLSS/VO2/TTE/durabilité) avec mesure/provenance/incertitude.
8. Conditions de refus sportives; interférence avec microcycle; état fatigue et adaptation effectivement observée.
9. Décision documentaire `supports_with_limits`, `mixed`, `does_not_support`, `not_applicable`, `unassessed`; degré de transfert; acteur et date.
10. Garde-fous V21A : `prescriptionImpact=none_research_annotation_only`, `automaticPromotion=false`, `individualAthleteApproved=false`.

## Neuf exemples de triage sans attribution automatique

| ID historique | Familles à examiner, non validées | Question principale |
|---|---|---|
| `A_RUN_Z2_EASY` | aerobic_endurance, recovery, economy | Intensité réelle sous LT1 ? « récupération » est-elle une assertion ou un rôle de programmation ? |
| `B_BIKE_VO2_3MIN` | vo2max, aerobic_endurance | Domaines de puissance et récupération exacts, réponse cardio-respiratoire non observée ? |
| `C_STR_RUN_DRILLS_PRO` | technique, economy, strength | Quel geste et quel indicateur d'économie ? |
| `B_SWIM_TRI_CSS_10x200` | swimming, thresholds | Récupérations/nage/CSS et temps total individuel vérifiables ? |
| `A_BIKE_TRAIN_LOW` | aerobic_endurance, nutrition | Disponibilité énergétique et risque pour prochaine séance contrôlés ? |
| `C_IM_AERO_HOLD` | ironman_specificity, technique, durability | Repos `n`/`n−1`, 6×10 vs 4×15, tolérance cervico-lombaire ? |
| `C_BRICK_TRANSITION_DRILL` | bricks, technique | Conflit 55 minutes actives versus 30–45 annoncées ; transitions manquantes ? |
| `D_RUN_REGEN` | recovery | La description et la cible exportable reflètent-elles un effort réellement peu sollicitant ? |
| `A_TR_LONG_HIKE_RUN_DPLUS` | trail, durability | D−, technicité, marche/course et réponse excentrique documentées ? |

Les IDs sont tirés de l'inventaire V21A/V20; ce tableau **n'enregistre aucune attribution comme justifiée**.

## Checklist d'intégration DRAFT

- [ ] Paper réellement identifié; PMID/DOI corrects; accès et date réels.
- [ ] Revendication strictement comparable à son résumé ou texte.
- [ ] Source fiche/hashes exacts du dépôt, pas reconstruits.
- [ ] Aucune dilution/altération d'une `avoid` historique.
- [ ] Temps nage / récupération / brick non inventés.
- [ ] Score d'incertitude expliqué, non remplacé par « connu ».
- [ ] Réévaluation et critères de retrait explicites.
- [ ] Aucun changement de production, aucun export Nolio réel.

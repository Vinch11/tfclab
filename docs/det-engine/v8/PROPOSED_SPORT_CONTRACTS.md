# Contrats sportifs proposés — aucune promotion

Les25 contrats V7 sont conservés. Les dispositions candidate_withdrawal ne retirent aucune règle exécutée : elles proposent une décision future justifiée. Les défauts de mesure ou conventions méthodologiques ne sont pas silencieusement reclassés dans les résultats historiques.

Deux lectures expérimentales sont comparées : provenanceV7 conservée et exigence de preuve causale V8. La seconde vérifie la capacité d’explication, pas l’efficacité physiologique. Elle ajoute des inconnues et ne convertit aucun échec en succès. Les règles de sécurité restent bloquantes ; les inconnues empêchent l’attestation.

## Principes opérationnels

1. Reprendre la source catalogue admissible sans changer ses intensités ni ses durées.
2. Séparer confiance du classement, qualité des données et statut mesuré/estimé.
3. Pour chaque stimulus : hypothèse d’adaptation, priorité du moment, dose justifiée et interaction avec le calendrier complet.
4. Conserver les contraintes existantes, tout en identifiant celles dont le fondement est éditorial.
5. Prévoir ce qui ferait réviser la prescription à partir des observations/tests déjà présents.
6. Ne pas confondre une intention ou un mot-clé avec une réponse observée.

## technical_calendar

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : all candidates ; complete_plan, unité weeks/days/schema.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : ParsedPlan.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : schema does not attest prescription quality.

## catalogue_integrity

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : catalogued training sessions ; session, unité source dose/zone/phase.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : complete metadata, duration, zones, objective, phase.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : source editorial ranges do not prove individual tolerance.

## coach_load

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : recorded coach/internal budget ; week and last load week, unité training_minutes.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : weekly budget, actual session durations.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : configured progression ceiling is not a universal injury threshold.

## physical_frequency

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : all counted training slots ; week, unité physical_sessions.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : sport, isRest, race identity, nominal quotas, confirmed day availability for exceptions.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : physical sessions differ from discipline exposures.

## effective_frequency

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : brick replaces one standalone bike in existing quota convention ; week, unité effective_bike_and_total_sessions.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : nominal quota, brick count.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : nominal and effective totals cannot be interchanged.

## discipline_minutes

Disposition proposée : **contextualize**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : IM and multisport targets; training only ; actual_generation_block, unité endurance_minutes_by_discipline.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : generation windows, standalone minutes, known brick components.
Sources : R25, O24, L175. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : unknown brick time remains in denominator as interval uncertainty.

## historical_discipline_ratio

Disposition proposée : **candidate_withdrawal**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : legacy objective targets ; load weeks excluding race, unité session_counts_with_half_brick_rounding.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : counted sports, week classification.
Sources : L175. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : differs from source minute-based verification.

## intensity_minutes

Disposition proposée : **experimental_modification**. Adaptation / rôle : Retain original failure; expose thresholds, denominator and unknown minutes. Compare context-dependent distributions, no universal80/20..
Objectif et conditions : historical non-deload/non-race applicability ; week, unité estimated_zone_minutes.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : session text, durations, zones, individual dose rationale, observed or missing response, reassessment criterion.
Sources : R25, O24. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : clause estimates and unknown time; no equal split of tags.

## key_role

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : all historical key flags ; session/week, unité session_role_and_content.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : unchanged isKeySession, source content.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : structural/long key does not necessarily mean high intensity.

## trail_optional_cycling

Disposition proposée : **contextualize**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : explicit trail coach calendar with optional or absent cycling ; actual_generation_block, unité run/endurance_minutes_and_role_evidence.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : trail objective, coach run days, session sports, global load controls.
Sources : B20, M21. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : candidate replaces an upper proportion convention, not a safety limit.

## trail_base_AB

Disposition proposée : **experimental_modification**. Adaptation / rôle : Phase-specific stimulus rationale required; A/B labels and HIT counts are not universally mandated by the interviews..
Objectif et conditions : trail objective plus declared training level and phase ; base load week, unité actual_quality_and_foundation_roles.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : phase, level, actual session content, coach zone cap, individual dose rationale, observed or missing response, reassessment criterion.
Sources : L175, L417, R25. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : no universal requirement for HIT every base week; models need expert review.

## reduced_week_AB

Disposition proposée : **contextualize**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : missing A/B under a non-load week type, even if theme still says peak ; recorded recovery/taper/race week, unité quality-session applicability.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : recorded week type, phase, complete volume/intensity checks.
Sources : W23, L175. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : does not prove recovery or permit arbitrary intensity.

## long_development

Disposition proposée : **contextualize**. Adaptation / rôle : Retain programming obligation; exact duration minima require level, history, opportunity and purpose, not a universal law..
Objectif et conditions : recorded long endurance floor ; development/load week, unité minutes_by_discipline.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : standalone duration, known components, floors, individual dose rationale, observed or missing response, reassessment criterion.
Sources : L175, M21. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : brick is not automatically autonomous long endurance.

## IM_week_specific_long

Disposition proposée : **contextualize**. Adaptation / rôle : Differentiate development, recovery and taper; no evidence here fixes exact reduced-week long doses..
Objectif et conditions : continuous IM candidates ; week type, unité training_minutes_and_long_role.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : week type, previous load, original floors, standalone long exposure, individual dose rationale, observed or missing response, reassessment criterion.
Sources : W23, L175. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : allégement does not prove recovery adequacy.

## IM_training_continuity

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : swim/bike/run continuity contract ; week, unité training_presence_by_discipline.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : standalone sessions, positive known brick components.
Sources : L417. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : presence is not dose sufficiency.

## IM_competition_presence

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : actual matching declared IM race ; competition week, unité declared_discipline_presence.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : event date, event objective, actual race session.
Sources : L175. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : declared triathlon presence does not quantify race components.

## recovery_volume

Disposition proposée : **contextualize**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : previous load and configured budget available ; recovery week, unité training_minutes.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : previous load, week budget, race exclusion.
Sources : L417, I20. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : existing 70% convention is not universal safety proof.

## taper

Disposition proposée : **experimental_modification**. Adaptation / rôle : Separate volume reduction from quality reminders and ordinary recovery; J−1/J−2 dose and individual fatigue remain unknown..
Objectif et conditions : competitive taper distinct from ordinary recovery ; taper and competition week, unité volume / explicit intensity minutes.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : source activation, date, dose, individual cap, individual dose rationale, observed or missing response, reassessment criterion.
Sources : W23. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : residual fatigue not measured; missing dose is unknown, observed volume failure is error.

## vertical_muscle

Disposition proposée : **maintain**. Adaptation / rôle : D+ and D−, slope/terrain, eccentric dose and observed response separate; unknown tolerance cannot pass..
Objectif et conditions : trail or explicit muscle contract ; session, week, mesocycle, unité D+ / D− / eccentric exposure separately.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : route provenance, separate descent dose, recent exposure response, individual limits if set, individual dose rationale, observed or missing response, reassessment criterion.
Sources : B20. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : no tolerance inferred from level or scheduled sessions.

## global_progression

Disposition proposée : **contextualize**. Adaptation / rôle : Compare complete timelines by discipline and specific exposure; no universal10% or ACWR safety certificate..
Objectif et conditions : all candidates; vertical only where applicable ; complete_plan, unité discipline_minutes / mesocycles.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : full timeline, ledger, budgets, individual dose rationale, observed or missing response, reassessment criterion.
Sources : I20, M21. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : rolling windows are descriptive, not a universal safety threshold.

## catalogue_source_placement

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : explicit source timing or LCW-specific source ; session, unité event day offset / format.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : source when, event dates, declared format.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : ambiguous source context is not proof of compatibility.

## injury_prohibitions

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : declared contraindications ; complete_plan, unité session and athlete contraindication.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : physiological inputs, prohibitions, actual source session.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : known prohibitions preserved; missing individual evidence remains uncertain.

## limiter_individualization

Disposition proposée : **experimental_modification**. Adaptation / rôle : Add session-level causal evidence and preserve uncertainty; TTE is not measured durability and inferred VLamax is not laboratory measurement..
Objectif et conditions : declared limiter keys and coach order ; phase/plan, unité adaptation priority and source intent.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : identifiedLimitersRaw, physiologicalTrace, actual catalogue selection, individual dose rationale, observed or missing response, reassessment criterion.
Sources : L175, M21, S25, LL24. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : limiter uncertainty does not prove load tolerance.

## residual_fatigue

Disposition proposée : **maintain**. Adaptation / rôle : No observed response: status remains unknown; a volume drop is not proof of recovered state..
Objectif et conditions : all experimental plans ; recovery/taper/competition, unité actual response.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : individual fatigue response, recent history, known activation dose, individual dose rationale, observed or missing response, reassessment criterion.
Sources : L417, W23. Confiance : contextual_indirect.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : prescribed reduction is not observed recovery.

## expert_review

Disposition proposée : **maintain**. Adaptation / rôle : no direct adaptation claim; constraint, descriptive indicator or allocation convention.
Objectif et conditions : all experimental prescriptions ; complete_plan, unité review_state.
Profil / limiteurs : existing discipline-specific tests, ordered limiters with uncertainty, declared coach level; no new physiological target.
Données : independent qualified review.
Sources : contrainte déclarée / provenance logicielle ; pas de preuve d’efficacité revendiquée. Confiance : software_or_declared_guard_no_efficacy_claim.
Validation : preserve historical diagnostics and known safety errors ; verify input/source applicability and units ; missing evidence remains unknown ; compare full-plan dose and continuity ; independent review before promotion.
Risques / contre-indications : existing prohibitions unchanged ; absence of retrieved evidence does not authorize removal ; unmeasured fatigue or muscle tolerance cannot be certified.
Exceptions / incertitudes : no automated test establishes general sporting relevance.

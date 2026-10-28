# Registre des contrats V7

25 contrats explicites. Les règles de sécurité restent indépendantes des conventions méthodologiques candidates. Un statut inconnu n’est pas une validation.

## technical_calendar

Type : programming. Source : `experimental/det-engine/v2-technical-validation.ts` — `auditTechnicalPlan`.
Unité : weeks/days/schema. Période : complete_plan. Applicabilité : all candidates.
Sévérité : error. Candidat : False.
Données : ParsedPlan.
Incertitude : schema does not attest prescription quality.
Conséquence : incomplete plans cannot be considered constructed.

## catalogue_integrity

Type : safety. Source : `supabase/functions/_shared/sessionCatalogueContract.ts` — `checkSessionCatalogue`.
Unité : source dose/zone/phase. Période : session. Applicabilité : catalogued training sessions.
Sévérité : error. Candidat : False.
Données : complete metadata, duration, zones, objective, phase.
Incertitude : source editorial ranges do not prove individual tolerance.
Conséquence : incompatible or unknown source content blocks attestation.

## coach_load

Type : programming. Source : `src/lib/plan/coachVolumeValidation.ts` — `validateCoachVolumeBudgets`.
Unité : training_minutes. Période : week and last load week. Applicabilité : recorded coach/internal budget.
Sévérité : error. Candidat : False.
Données : weekly budget, actual session durations.
Incertitude : configured progression ceiling is not a universal injury threshold.
Conséquence : retain overshoot error.

## physical_frequency

Type : programming. Source : `supabase/functions/_shared/sessionQuotaAccounting.ts` — `countQuotaSessions`.
Unité : physical_sessions. Période : week. Applicabilité : all counted training slots.
Sévérité : error. Candidat : False.
Données : sport, isRest, race identity, nominal quotas, confirmed day availability for exceptions.
Incertitude : physical sessions differ from discipline exposures.
Conséquence : calendar capacity/availability must remain respected.

## effective_frequency

Type : programming. Source : `supabase/functions/_shared/sessionQuotaAccounting.ts` — `effectiveSessionQuota`.
Unité : effective_bike_and_total_sessions. Période : week. Applicabilité : brick replaces one standalone bike in existing quota convention.
Sévérité : error. Candidat : False.
Données : nominal quota, brick count.
Incertitude : nominal and effective totals cannot be interchanged.
Conséquence : preserve independent frequency checks.

## discipline_minutes

Type : methodology. Source : `supabase/functions/ai-training-plan/sportRatioMatrix.ts` — `mandatory ratio verification table`.
Unité : endurance_minutes_by_discipline. Période : actual_generation_block. Applicabilité : IM and multisport targets; training only.
Sévérité : error. Candidat : True.
Données : generation windows, standalone minutes, known brick components.
Incertitude : unknown brick time remains in denominator as interval uncertainty.
Conséquence : candidate ratio failure; historical session-count issue retained.

## historical_discipline_ratio

Type : methodology. Source : `src/engines/plan/planValidator.ts` — `validateSportRatio`.
Unité : session_counts_with_half_brick_rounding. Période : load weeks excluding race. Applicabilité : legacy objective targets.
Sévérité : error. Candidat : False.
Données : counted sports, week classification.
Incertitude : differs from source minute-based verification.
Conséquence : retain original error independently.

## intensity_minutes

Type : methodology. Source : `src/engines/plan/planValidator.ts` — `estimateSessionZoneMinutes / validatePolarization`.
Unité : estimated_zone_minutes. Période : week. Applicabilité : historical non-deload/non-race applicability.
Sévérité : error. Candidat : False.
Données : session text, durations, zones.
Incertitude : clause estimates and unknown time; no equal split of tags.
Conséquence : historical intensity errors remain blocking.

## key_role

Type : descriptive. Source : `src/engines/plan/planValidator.ts` — `isKeySession / self-declaration consistency`.
Unité : session_role_and_content. Période : session/week. Applicabilité : all historical key flags.
Sévérité : warning. Candidat : False.
Données : unchanged isKeySession, source content.
Incertitude : structural/long key does not necessarily mean high intensity.
Conséquence : retain warnings; never rewrite flags to obtain compliance.

## trail_optional_cycling

Type : methodology. Source : `experimental/det-engine/v7-contracts.ts` — `trail specificity candidate`.
Unité : run/endurance_minutes_and_role_evidence. Période : actual_generation_block. Applicabilité : explicit trail coach calendar with optional or absent cycling.
Sévérité : error. Candidat : True.
Données : trail objective, coach run days, session sports, global load controls.
Incertitude : candidate replaces an upper proportion convention, not a safety limit.
Conséquence : no mandatory bicycle insertion; historical ratio retained.

## trail_base_AB

Type : methodology. Source : `experimental/det-engine/v7-contracts.ts` — `three base models`.
Unité : actual_quality_and_foundation_roles. Période : base load week. Applicabilité : trail objective plus declared training level and phase.
Sévérité : error. Candidat : True.
Données : phase, level, actual session content, coach zone cap.
Incertitude : no universal requirement for HIT every base week; models need expert review.
Conséquence : compare strict, foundation and source-capability alternatives without relabelling technique.

## reduced_week_AB

Type : methodology. Source : `src/engines/plan/planValidator.ts` — `validateLorangCategories / inferWeekType`.
Unité : quality-session applicability. Période : recorded recovery/taper/race week. Applicabilité : missing A/B under a non-load week type, even if theme still says peak.
Sévérité : error. Candidat : True.
Données : recorded week type, phase, complete volume/intensity checks.
Incertitude : does not prove recovery or permit arbitrary intensity.
Conséquence : candidate treats missing A/B as not applicable; legacy issue retained.

## long_development

Type : programming. Source : `src/lib/plan/validateWeeklyQuotas.ts` — `long run/ride floors`.
Unité : minutes_by_discipline. Période : development/load week. Applicabilité : recorded long endurance floor.
Sévérité : error. Candidat : False.
Données : standalone duration, known components, floors.
Incertitude : brick is not automatically autonomous long endurance.
Conséquence : retain long-dose obligation in development.

## IM_week_specific_long

Type : methodology. Source : `experimental/det-engine/v7-contracts.ts` — `development vs recovery/taper/race`.
Unité : training_minutes_and_long_role. Période : week type. Applicabilité : continuous IM candidates.
Sévérité : error. Candidat : True.
Données : week type, previous load, original floors, standalone long exposure.
Incertitude : allégement does not prove recovery adequacy.
Conséquence : compare reference obligation and reduced-week contract; do not change plans.

## IM_training_continuity

Type : programming. Source : `experimental/det-engine/v5-global.ts` — `required training discipline gap`.
Unité : training_presence_by_discipline. Période : week. Applicabilité : swim/bike/run continuity contract.
Sévérité : error. Candidat : False.
Données : standalone sessions, positive known brick components.
Incertitude : presence is not dose sufficiency.
Conséquence : report training gap independently of competition.

## IM_competition_presence

Type : descriptive. Source : `experimental/det-engine/v7-contracts.ts` — `declared events separate from training`.
Unité : declared_discipline_presence. Période : competition week. Applicabilité : actual matching declared IM race.
Sévérité : unknown. Candidat : True.
Données : event date, event objective, actual race session.
Incertitude : declared triathlon presence does not quantify race components.
Conséquence : never fill unknown competition minutes or treat a race as measured training.

## recovery_volume

Type : programming. Source : `src/lib/plan/coachVolumeValidation.ts` — `last prescribed load comparison`.
Unité : training_minutes. Période : recovery week. Applicabilité : previous load and configured budget available.
Sévérité : error. Candidat : False.
Données : previous load, week budget, race exclusion.
Incertitude : existing 70% convention is not universal safety proof.
Conséquence : overshoot remains a failure.

## taper

Type : methodology. Source : `experimental/det-engine/v5-taper.ts` — `auditTaperContract`.
Unité : volume / explicit intensity minutes. Période : taper and competition week. Applicabilité : competitive taper distinct from ordinary recovery.
Sévérité : error. Candidat : False.
Données : source activation, date, dose, individual cap.
Incertitude : residual fatigue not measured; missing dose is unknown, observed volume failure is error.
Conséquence : unknown activation dose prevents full attestation; verified volume failure blocks the candidate.

## vertical_muscle

Type : safety. Source : `experimental/det-engine/v5-global.ts` — `IndividualExposureContract`.
Unité : D+ / D− / eccentric exposure separately. Période : session, week, mesocycle. Applicabilité : trail or explicit muscle contract.
Sévérité : unknown. Candidat : False.
Données : route provenance, separate descent dose, recent exposure response, individual limits if set.
Incertitude : no tolerance inferred from level or scheduled sessions.
Conséquence : retain unknowns and require human evidence.

## global_progression

Type : programming. Source : `experimental/det-engine/v5-global.ts` — `auditV5Global`.
Unité : discipline_minutes / mesocycles. Période : complete_plan. Applicabilité : all candidates; vertical only where applicable.
Sévérité : error. Candidat : False.
Données : full timeline, ledger, budgets.
Incertitude : rolling windows are descriptive, not a universal safety threshold.
Conséquence : no local correction may hide a global regression.

## catalogue_source_placement

Type : programming. Source : `experimental/det-engine/v6-placement.ts` — `sourcePlacement`.
Unité : event day offset / format. Période : session. Applicabilité : explicit source timing or LCW-specific source.
Sévérité : error. Candidat : False.
Données : source when, event dates, declared format.
Incertitude : ambiguous source context is not proof of compatibility.
Conséquence : candidate source-placement failure without changing legacy alerts.

## injury_prohibitions

Type : safety. Source : `src/engines/plan/planValidator.ts` — `validateProhibitionCompliance / validateInjuryRiskCompliance`.
Unité : session and athlete contraindication. Période : complete_plan. Applicabilité : declared contraindications.
Sévérité : error. Candidat : False.
Données : physiological inputs, prohibitions, actual source session.
Incertitude : known prohibitions preserved; missing individual evidence remains uncertain.
Conséquence : never superseded by a candidate convention.

## limiter_individualization

Type : programming. Source : `src/lib/limiterSessionPatterns.ts` — `LIMITER_SESSION_PATTERNS`.
Unité : adaptation priority and source intent. Période : phase/plan. Applicabilité : declared limiter keys and coach order.
Sévérité : error. Candidat : False.
Données : identifiedLimitersRaw, physiologicalTrace, actual catalogue selection.
Incertitude : limiter uncertainty does not prove load tolerance.
Conséquence : retain coherence errors and disclose unaddressed priorities.

## residual_fatigue

Type : safety. Source : `experimental/det-engine/v7-contracts.ts` — `candidate fatigue evidence`.
Unité : actual response. Période : recovery/taper/competition. Applicabilité : all experimental plans.
Sévérité : unknown. Candidat : False.
Données : individual fatigue response, recent history, known activation dose.
Incertitude : prescribed reduction is not observed recovery.
Conséquence : conditional status until individual evidence and review.

## expert_review

Type : descriptive. Source : `docs/det-engine/v6/CONTRATS_ET_LIMITES.md` — `independent review requirement`.
Unité : review_state. Période : complete_plan. Applicabilité : all experimental prescriptions.
Sévérité : unknown. Candidat : False.
Données : independent qualified review.
Incertitude : no automated test establishes general sporting relevance.
Conséquence : NO-GO for integration until independent validation.

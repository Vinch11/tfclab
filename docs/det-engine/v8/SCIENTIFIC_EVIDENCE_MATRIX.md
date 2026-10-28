# Scientific evidence matrix — V8, NO-GO

Audit ciblé, pas revue systématique enregistrée ni revue experte humaine. Recherche le 28 octobre2026 : titres/DOI fournis, TTS175/417,220Triathlon, durabilité, VLamax et renforcement. Sources primaires/éditeurs/PubMed privilégiés. Résumés et shownotes consultés ; accès intégral non établi pour plusieurs études. Pas de GRADE recalculé. La force ci-dessous porte sur la transférabilité au contrat exact, pas sur la qualité globale de la publication.

Les contraintes de logiciel, disponibilités ou contre-indications n’ont pas besoin d’un essai montrant un gain sportif pour rester bloquantes. Aucune preuve trouvée n’est différent de preuve d’absence.

| Contrat V7 | Provenance exacte | Preuves | Recommandation candidate | Limite / justification |
|---|---|---|---|---|
| technical_calendar (programming) | `experimental/det-engine/v2-technical-validation.ts` / auditTechnicalPlan | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| catalogue_integrity (safety) | `supabase/functions/_shared/sessionCatalogueContract.ts` / checkSessionCatalogue | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| coach_load (programming) | `src/lib/plan/coachVolumeValidation.ts` / validateCoachVolumeBudgets | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| physical_frequency (programming) | `supabase/functions/_shared/sessionQuotaAccounting.ts` / countQuotaSessions | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| effective_frequency (programming) | `supabase/functions/_shared/sessionQuotaAccounting.ts` / effectiveSessionQuota | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| discipline_minutes (methodology) | `supabase/functions/ai-training-plan/sportRatioMatrix.ts` / mandatory ratio verification table | R25, O24, L175 | contextualize | Minutes solve unit ambiguity; source sport-share targets and ±3 tolerance remain editorial, not validated physiological laws. |
| historical_discipline_ratio (methodology) | `src/engines/plan/planValidator.ts` / validateSportRatio | L175 | candidate_withdrawal | Session-count and half-brick shares cannot be equated with measured dose. Preserve historical diagnostic. |
| intensity_minutes (methodology) | `src/engines/plan/planValidator.ts` / estimateSessionZoneMinutes / validatePolarization | R25, O24 | experimental_modification | Retain original failure; expose thresholds, denominator and unknown minutes. Compare context-dependent distributions, no universal80/20. |
| key_role (descriptive) | `src/engines/plan/planValidator.ts` / isKeySession / self-declaration consistency | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| trail_optional_cycling (methodology) | `experimental/det-engine/v7-contracts.ts` / trail specificity candidate | B20, M21 | contextualize | No direct evidence retrieved that trail requires a maximum run share or mandatory bicycle. Preserve specificity and individual muscle/load checks. |
| trail_base_AB (methodology) | `experimental/det-engine/v7-contracts.ts` / three base models | L175, L417, R25 | experimental_modification | Phase-specific stimulus rationale required; A/B labels and HIT counts are not universally mandated by the interviews. |
| reduced_week_AB (methodology) | `src/engines/plan/planValidator.ts` / validateLorangCategories / inferWeekType | W23, L175 | contextualize | Absence of A/B in taper is not evidence of poor taper; also absence of all intensity reminders is not automatically ideal. |
| long_development (programming) | `src/lib/plan/validateWeeklyQuotas.ts` / long run/ride floors | L175, M21 | contextualize | Retain programming obligation; exact duration minima require level, history, opportunity and purpose, not a universal law. |
| IM_week_specific_long (methodology) | `experimental/det-engine/v7-contracts.ts` / development vs recovery/taper/race | W23, L175 | contextualize | Differentiate development, recovery and taper; no evidence here fixes exact reduced-week long doses. |
| IM_training_continuity (programming) | `experimental/det-engine/v5-global.ts` / required training discipline gap | L417 | maintain | Maintain continuity diagnostic, but presence alone does not prove adequate dose or technique. |
| IM_competition_presence (descriptive) | `experimental/det-engine/v7-contracts.ts` / declared events separate from training | L175 | maintain | Competition presence remains descriptive; competition is not measured training nor proof of component minutes. |
| recovery_volume (programming) | `src/lib/plan/coachVolumeValidation.ts` / last prescribed load comparison | L417, I20 | contextualize | Retain configured volume budget;70% convention is not an observed recovery guarantee. |
| taper (methodology) | `experimental/det-engine/v5-taper.ts` / auditTaperContract | W23 | experimental_modification | Separate volume reduction from quality reminders and ordinary recovery; J−1/J−2 dose and individual fatigue remain unknown. |
| vertical_muscle (safety) | `experimental/det-engine/v5-global.ts` / IndividualExposureContract | B20 | maintain | D+ and D−, slope/terrain, eccentric dose and observed response separate; unknown tolerance cannot pass. |
| global_progression (programming) | `experimental/det-engine/v5-global.ts` / auditV5Global | I20, M21 | contextualize | Compare complete timelines by discipline and specific exposure; no universal10% or ACWR safety certificate. |
| catalogue_source_placement (programming) | `experimental/det-engine/v6-placement.ts` / sourcePlacement | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| injury_prohibitions (safety) | `src/engines/plan/planValidator.ts` / validateProhibitionCompliance / validateInjuryRiskCompliance | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |
| limiter_individualization (programming) | `src/lib/limiterSessionPatterns.ts` / LIMITER_SESSION_PATTERNS | L175, M21, S25, LL24 | experimental_modification | Add session-level causal evidence and preserve uncertainty; TTE is not measured durability and inferred VLamax is not laboratory measurement. |
| residual_fatigue (safety) | `experimental/det-engine/v7-contracts.ts` / candidate fatigue evidence | L417, W23 | maintain | No observed response: status remains unknown; a volume drop is not proof of recovered state. |
| expert_review (descriptive) | `docs/det-engine/v6/CONTRATS_ET_LIMITES.md` / independent review requirement | Garde logiciel/déclaration | maintain | Software integrity, availability, contraindication or review guard. No sport-efficacy trial validates this exact software rule; retain it as an explicit constraint. |

Les unités, périodes, applicabilité, sévérités et données des 25 règles V7 sont conservées intégralement dans `contract-audit.json`. Les libellés de symboles éditoriaux non retrouvés littéralement sont marqués `symbolLocatorExact=false`, sans inventer de ligne source.

## Bibliographie évaluée

### R25 — Rosenblat et al. (2025)

[IPD network meta-analysis](https://pubmed.ncbi.nlm.nih.gov/39888556/). Population / durée : 13 studies, 348 trained endurance athletes; 296 men, 52 women; recreational/competitive; mean study ages 17.6–41.5. Duration by study not extracted from abstract.
No overall POL superiority over PYR in VO2max or time trial; exploratory level interaction. Different analyses/zone accounting from Oliveira.
Limites : Abstract inspected; IPD unavailable here; subgroup findings not universal prescriptions; sparse women and no demonstrated ultra transfer.

### O24 — Oliveira et al. (2024)

[systematic review/meta-analysis](https://pubmed.ncbi.nlm.nih.gov/38717713/). Population / durée : 17 studies, 437 subjects; adult/young adult endurance interventions >=4 weeks.
Small pooled VO2peak advantage for POL; does not establish a universal best race-performance distribution.
Limites : Abstract and search excerpts; full text blocked by recaptcha; heterogeneous protocols and outcomes, no direct TFCL percentage validation.

### W23 — Wang et al. (2023)

[systematic review/meta-analysis](https://pubmed.ncbi.nlm.nih.gov/37163550/). Population / durée : 14 studies in endurance athletes; competition taper; mixed sports.
Volume reduction with retained intensity/frequency can improve performance; reported 41–60% reduction and <=21 days are study-associated ranges.
Limites : Not universal dose thresholds or support for arbitrary J−1/J−2 intervals; fatigue response and individual readiness not measured in these fixtures.

### B20 — Bontemps et al. (2020)

[narrative review](https://pubmed.ncbi.nlm.nih.gov/33037592/). Population / durée : Downhill-running studies; variable slopes, participants and exposure protocols, not a pooled intervention.
Descent eccentric loading can impair performance; repeated exposure may induce adaptation.
Limites : No validated individual D− ceiling, no inference of acquired tolerance from planned sessions; narrative evidence.

### I20 — Impellizzeri et al. (2020)

[conceptual/methodological critique](https://pubmed.ncbi.nlm.nih.gov/32502973/). Population / durée : Training-load/injury inference; no intervention cohort or safe progression trial.
Conceptual pitfalls prevent treating acute/chronic ratios as causal injury safety rules.
Limites : Does not establish a replacement progression ceiling, nor prove any observed increase unsafe; abstract/search metadata checked.

### M21 — Maunder et al. (2021)

[narrative/conceptual review](https://pubmed.ncbi.nlm.nih.gov/33886100/). Population / durée : Endurance profiling during prolonged exercise, field observations; not a dosing trial.
Durability concerns onset/magnitude of physiological deterioration during prolonged exercise.
Limites : Fresh TTE or a fresh threshold alone is not a direct measurement of durability; no validated training progression algorithm.

### S25 — Sablain et al. (2025)

[original reliability/comparison study](https://pubmed.ncbi.nlm.nih.gov/40338332/). Population / durée : 13 physically active men; cycling; four 15-s isokinetic sprint tests; VO2max mean60.5.
VLamax repeatability and calculated MLSS agreement examined; wide individual power agreement limits despite similar group means.
Limites : Short laboratory protocol, no training efficacy trial, no validation of TFCL field-inverse estimates or trail transfer.

### LL24 — Llanos-Lagos et al. (2024)

[systematic review/meta-analysis](https://pubmed.ncbi.nlm.nih.gov/38165636/). Population / durée : 652 moderately/well/highly trained middle/long-distance runners; 6–24 weeks, 1–4 strength sessions/week.
Some high-load/plyometric/combined methods improve running economy, with method/speed dependence.
Limites : Low/moderate certainty by comparison; not proof that any strength catalogue entry treats an unmeasured economy deficit or requires a blanket VO2 prohibition.

### L175 — Dan Lorang, TTS175 shownotes (2019)

[coaching interview, edited shownotes](https://scientifictriathlon.com/tts175/). Population / durée : Professional and illustrative time-limited triathletes; no controlled trial.
Profile/history and athlete feedback guide dose; repeated technique, aerobic, strength/endurance and economisation phases are examples.
Limites : 0:56,10:41,58:50,1:12:12,1:21:45; shownotes not independently checked against full audio. Elite schedules are not age-group minima.

### L417 — Dan Lorang, TTS417 shownotes (2023)

[coaching interview, edited shownotes](https://scientifictriathlon.com/tts417/). Population / durée : Elite triathlon case discussions, including Lucy Charles-Barclay; no comparative trial.
Evolving individual plans, balance of low/higher effort and adjustment of other sessions; workload depends on athlete history/capacity.
Limites : 08:21,10:54,14:09,1:12:23; elite observations, no universal weekly HIT count; no VLamax term found on inspected page.

### L220 — 220 Triathlon interview with Lorang (2020)

[coaching/media account](https://www.220triathlon.com/training/long-distance/frodeno-and-haugs-coach-dan-lorang-on-how-to-train-for-ironman). Population / durée : Frodeno/Haug professional Ironman examples; updated page2022.
Metabolic profile, long-term consistency and feedback inform progressive load and changing phase focus.
Limites : Attributed coach/athlete statements, not controlled evidence; no exact transferable quotas or proof of a unique optimal phase sequence.

## Contradictions et universalisation

R25 et O24 diffèrent par comparateurs, agrégation, populations et méthode de comptage. Un petit avantage groupé sur VO2peak ne démontre pas un meilleur résultat Ironman/ultra pour tout profil. Les études ne valident pas la matrice éditoriale TFCL des parts par discipline. W23 concerne l’affûtage compétitif, pas toutes les semaines de récupération. B20 est une revue narrative, pas une méta-analyse fournissant une tolérance individuelle. I20 critique une inférence causale, sans fixer un nouveau seuil sûr. S25 ne valide pas les estimateurs inverses TFCL.

Toute modification de doctrine reste proposée pour revue indépendante. Les contrôles historiques et les règles de sécurité sont conservés.

## Actualisation ciblée2026

[E26 — Esteve-Lanao et al. (2026)](https://doi.org/10.1177/17479541261468168) : essai randomisé de20 marathoniens amateurs sur16semaines, charge hebdomadaire appariée. Le résumé éditeur rapporte une absence de différence significative de performance marathon entre POL et PYR, avec des adaptations distinctes. Petit effectif ; texte intégral payant non acheté ; pas de transfert démontré au trail ou à l’Ironman. Source complémentaire cohérente avec une contextualisation, pas preuve d’équivalence générale. Les autres résultats de recherche récents ont été repérés mais non utilisés pour fixer des seuils.

## Localisation vérifiable du code

Les libellés éditoriaux V7 sont préservés. Chaque règle dispose d’une ancre littérale vérifiée ; un libellé éditorial ne devient pas un nom de fonction exact.

| Contrat | Fichier:ligne | Ancre littérale |
|---|---|---|
| technical_calendar | `experimental/det-engine/v2-technical-validation.ts:5` | `auditTechnicalPlan` |
| catalogue_integrity | `supabase/functions/_shared/sessionCatalogueContract.ts:21` | `checkSessionCatalogue` |
| coach_load | `src/lib/plan/coachVolumeValidation.ts:9` | `validateCoachVolumeBudgets` |
| physical_frequency | `supabase/functions/_shared/sessionQuotaAccounting.ts:19` | `countQuotaSessions` |
| effective_frequency | `supabase/functions/_shared/sessionQuotaAccounting.ts:4` | `effectiveSessionQuota` |
| discipline_minutes | `supabase/functions/ai-training-plan/sportRatioMatrix.ts:2` | `SPORT RATIO MATRIX` |
| historical_discipline_ratio | `src/engines/plan/planValidator.ts:1601` | `validateSportRatio` |
| intensity_minutes | `src/engines/plan/planValidator.ts:573` | `function estimateSessionZoneMinutes` |
| key_role | `src/engines/plan/planValidator.ts:617` | `function isKeySession` |
| trail_optional_cycling | `experimental/det-engine/v7-contracts.ts:24` | `add('trail_optional_cycling'` |
| trail_base_AB | `experimental/det-engine/v7-contracts.ts:25` | `add('trail_base_AB'` |
| reduced_week_AB | `src/engines/plan/planValidator.ts:4656` | `function validateLorangCategories` |
| long_development | `src/lib/plan/validateWeeklyQuotas.ts:109` | `pas de SL` |
| IM_week_specific_long | `experimental/det-engine/v7-contracts.ts:17` | `candidateContract='IM_week_specific_long'` |
| IM_training_continuity | `experimental/det-engine/v5-global.ts:6` | `required_training_discipline_gap` |
| IM_competition_presence | `experimental/det-engine/v7-contracts.ts:26` | `competition_presence` |
| recovery_volume | `src/lib/plan/coachVolumeValidation.ts:9` | `validateCoachVolumeBudgets` |
| taper | `experimental/det-engine/v5-taper.ts:7` | `auditTaperContract` |
| vertical_muscle | `experimental/det-engine/v5-global.ts:3` | `IndividualExposureContract` |
| global_progression | `experimental/det-engine/v5-global.ts:4` | `auditV5Global` |
| catalogue_source_placement | `experimental/det-engine/v6-placement.ts:3` | `sourcePlacement` |
| injury_prohibitions | `src/engines/plan/planValidator.ts:3456` | `validateProhibitionCompliance` |
| limiter_individualization | `src/lib/limiterSessionPatterns.ts:14` | `LIMITER_SESSION_PATTERNS` |
| residual_fatigue | `experimental/det-engine/v7-contracts.ts:35` | `residual_fatigue` |
| expert_review | `docs/det-engine/v6/CONTRATS_ET_LIMITES.md:39` | `revue` |

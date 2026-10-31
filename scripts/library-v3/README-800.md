# TFCLab V3.1 — 800 recettes candidates, NOT A RELEASE

**Scope:** stacked PR #447 on the experimental DET-ENGINE PR #445; no main, Supabase, Nolio, external export, publication or real athlete mutation.

## Inventory and provenance

| Sport | Previous V3 (unchanged IDs) | Additional V3.1 | Total |
|---|---:|---:|---:|
| Cycling | 100 | 100 | 200 |
| Running | 100 | 100 | 200 |
| Swimming | 100 | 100 | 200 |
| Strength / movement control | 100 | 100 | 200 |
| **Total** | **400** | **400** | **800** |

The added recipes cover 20 sport-specific coaching intentions, each with five dose/phase versions. Their distinct sporting usefulness still requires individual editorial review. They are **original TFCLab proposals**, not replicas approved by named coaches and not sessions individually validated by the papers cited in the historical V3 reference inventory. See `generateV3Next400.mjs` for reproducible generation.

The five existing JSON sources have **not been discarded** or reassigned new IDs. Each historical source is annotated with the same structured `prescription` contract as each new source. A 400-card legacy snapshot remains `v3PilotCatalogue`; DET-ENGINE reads `v3FullCatalogue` with 800 records.

## Required contract on every workout

- `physiologicalIntent.statement / primaryIntent / primaryDomain / domainIds / limiterKeys`: intended adaptation and limiter(s). Strength has no invented aerobic metabolic domain.
- `individualization.anchors[]`: per-domain measurement keys, method and `missing: unresolved`. FTP is a measured input to a doctrine estimate, not a laboratory MLSS proof. VO2 requires measured PMA/vVO2 in addition to FTP/threshold pace. Sprint requires a verified athlete sprint range; strength requires coach-verified load and RPE. CSS can proxy MLSS only if the coach explicitly confirms its appropriateness.
- `parameters[]`: every editable tree path and bounded min/base/max for timed steps, distances, repetition counts, between-set rests and timeboxed strength repetition targets. Changes in intense or density-bearing blocks require explicit coach permission. Bounds do not themselves grant clinical clearance.
- `duration.classification / requiredMeasurements / formula`: deterministic recursive work + interval rest. Unknown swim pace remains unresolved; old repetition-only strength is estimated. New timeboxed swimming and strength use a guaranteed **reserved slot time**; fitness/technique and achieved reps still require review.
- `admissibility`: phases, minimum level, prerequisites, contraindications, recovery floor, stop rule and individual coach / weekly load / fatigue gates.

## Known limitations, not disguised

1. **Every workout is a candidate:** `automaticSelection=false`, `status=candidate`, individual coach approval and independent sports planning checks remain mandatory. All 800 unreviewed records must be rejected by DET.
2. Historical distance-based swimming remains unresolved without **domain-specific athlete paces**. CSS is not a silent pace for recovery, VO2, race effort or technique.
3. Historical repetition-based strength sessions still do not have confirmed appointment durations. The 100 new strength timeboxes have exact slots and may now enter DET as `sport=strength`, `intentFamily=force`, `zones=[]`, provided real athlete RPE/load evidence and human review are supplied. **Never relabel strength as Z1**. Success in prevalidation is not proof of safe weekly strength progression.
4. Correct reference anchors and syntactically bounded work do not prove dose suitability for a given individual. Athlete background, current capacity, qualitative weekly training load, recovery, goal and phases are separate gates. Physical and scientific approval has not been performed for all 800.
5. None of these source changes resolves the previously documented 70.3 calendar feasibility and recovery-hour verification obstacles. No scientifically attested plan or persistence/export GO is claimed.

## First exact-duration inventory

| Discipline | Whole-minute base duration established | Needs more evidence or a bounded adjustment |
|---|---:|---:|
| Bike | 189 | 11 fractional-minute baselines |
| Run | 191 | 9 fractional-minute baselines |
| Swim | 100 | 100 historical distance prescriptions requiring domain-specific paces |
| Strength | 101 | 99 historical movement-time estimates |
| **Total** | **581** | **219** |

These are **catalogue timing facts**, not counts of athlete-admissible sessions. Every source still requires available athlete anchor(s), a check of coach-defined load, and an individual review. The bridge rejects absent FTP/pace/PMA/vVO2/RPE evidence rather than substituting arbitrary values; target bands and provenance survive in the individual candidate text.

## Automated checks

Run:
```bash
bunx tsc --noEmit -p experimental/det-engine/tsconfig.json
bunx vitest run --config experimental/det-engine/vitest.v31.config.ts
```

`.github/workflows/ci.yml` now runs this **explicitly** as a dedicated job; the regular frontend Vitest config excludes `experimental/det-engine`.

Review process before promotion: inspect the real recipe and evidence, verify physiological/biomechanical intent, anchor availability and calibration, entire weekly load and hard/easy rhythm, injury and fatigue context, schedule recovery from actual session end, approval by a human coach, then trial with synthetic plans in the candidate branch. Document science and production GO/NO-GO independently.

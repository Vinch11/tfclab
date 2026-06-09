---
name: 70.3 Podium Durability Catalog
description: Catalogue dédié 70.3 (6 séances signature podium/elite) + prescription forcée dans le prompt 70.3 pour ambition podium/elite/competitor.
type: feature
---

# 70.3 Podium Durability Catalog

Comble les angles morts identifiés par audit coach 70.3 podium (race-pace CAP long manquant, briques race-pace 70.3 sous-prescrites, OWS race-sim absent, drafting/quick start piscine absent).

## Fichiers
- `src/lib/enrichedWorkouts703PodiumDurability.ts` — 6 séances signature
- `src/lib/workoutLibrary.ts` — registration
- `supabase/functions/ai-training-plan/promptHelpers.ts` (branche `objKeyForRappel === "703"` + amb podium/elite/competitor)

## IDs prescriptibles
- `A_703_RUN_RACE_PACE_LONG` — Long CAP 1h30-1h50 avec 45-60min @ pace 70.3
- `B_703_BRICK_RACE_PACE` — Brick 2h-2h30 vélo race-pace + 60-75' run race-pace
- `B_703_RUN_OFF_BIKE_FAST_FINISH` — Long run avec finish 20' @ pace 70.3 après SST
- `B_703_RUN_NEG_SPLIT` — Long run 3 tiers progressifs jusqu'à pace 70.3
- `B_703_SWIM_OWS_RACE_SIM` — OWS 2-3 km quick start + drafting + sighting
- `B_703_SWIM_QUICK_START_DRAFT` — Piscine race-sim départ explosif + drafting

## Règles de prescription
- Build 70.3 : ≥1 séance race-pace/race-sim/sem
- Peak 70.3 : ≥2 séances/sem + 1 natation race-sim/sem
- Brick race-pace : 4-6 occurrences S6-S14, jamais 2 sem de suite
- OWS dès que l'eau libre est accessible

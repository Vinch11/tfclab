---
name: Hedgehog Workouts Catalog
description: 4 séances 🦔 hérisson dans enrichedWorkoutsHedgehog (VMA courte/longue, seuil côte, escaliers) pour profils trail urbain sans accès montagne.
type: feature
---

# Catalogue séances Hérisson 🦔

Fichier : `src/lib/enrichedWorkoutsHedgehog.ts` (branché dans `workoutLibrary.ts` après StrengthV2).

4 séances directement prescriptibles par l'IA (pas seulement en alternative) :

1. **B_RUN_HEDGEHOG_VMA_SHORT** — 10–12 × 30–45 s côte 8–12 % @95–105 % VMA, récup descente.
   Cible : VO2max + puissance ascensionnelle. Talus / parking / côte ≥ 50 m.

2. **B_RUN_HEDGEHOG_VMA_LONG** — 6–8 × 60–90 s côte 6–10 % @90–95 % VMA.
   Cible : VO2max soutenu + lactique. Côte urbaine ≥ 200 m.

3. **B_RUN_HEDGEHOG_SEUIL** — 4–6 × 3–5 min côte 4–8 % Z3–Z4.
   Cible : endurance de force au seuil. Côte 400 m+ (typiquement 500 m / 50 m D+).

4. **C_RUN_HEDGEHOG_STAIRS** — 8–10 × 60–90 s escaliers/talus >15 %, récup descente MARCHE.
   Cible : puissance excentrique + chaîne postérieure. 100 % urbain.

Tags : `hedgehog`, `hill-repeats`, `urban`, `trail` — searchable via WorkoutLibraryBrowser.
Réfs : Saunders 2006 (RE), Barnes 2013 (VO2 cost uphill), Vernillo 2017 (biomécanique).

Cohérent avec [trail-session-alternatives](mem://features/plan-ia/trail-session-alternatives) (qui restait du fallback affichage) et [trail-urban-treadmill-cap](mem://logic/trail-urban-treadmill-cap).

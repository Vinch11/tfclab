---
name: Race Simulation LCW 3-Day Solo Mode
description: Onglet Simulation détecte format LCW 70.3 et propose 3 segments solo indépendants (Swim/Bike/Run) sans carry-over fatigue/glycogène.
type: feature
---

Quand `athlete_race_goals.race_format === 'lcw_3day'` pour un objectif 70.3 à venir, `RaceSimulationPage` :

1. Détecte LCW via `useAthleteRaceGoals` (date ≥ aujourd'hui OU objectif courant 70.3)
2. Affiche un banner + sélecteur 3 segments (🏊 Natation 1.9km / 🚴 Vélo 90km / 🏃 Course 21.1km)
3. Override `isTriathlon = false` (chaque segment = épreuve SOLO, pas d'enchaînement)
4. Override `raceObjective` :
   - `lcwSegment === 'run'` → `'Semi'` (semi solo fresh-start)
   - `lcwSegment === 'bike'` → `'70.3'` mais discipline=bike SOLO (90km TT)
   - `lcwSegment === 'swim'` → carte dédiée `LCWSwimSoloCard` (allure CSS, sighting, T1, refeed)
5. Hide `TriathlonFullRaceSimulationCard` (auto, via isTriathlon=false)
6. Pas de pénalité fatigue post-vélo sur le run (calcul standard Semi)

Source unique : `src/pages/RaceSimulationPage.tsx` — variables `lcwActive`, `lcwSegment`, override des useMemo `raceObjective` / `isTriathlon` / `discipline` / `raceDurationMin`.

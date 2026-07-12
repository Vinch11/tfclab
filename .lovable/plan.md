# Refonte cohérence plans IA — 7 correctifs

Objectif : que chaque plan généré soit physiologiquement cohérent, sans contradiction interne, avec des zones dérivées d'une source unique. Traitement en **3 phases**, chacune livrable et testable indépendamment.

## Phase 1 — Sécurité & cohérence critique (jour 1)

### #1 · Race power vélo bornée par TTE
Aujourd'hui l'IA prescrit 82-85% FTP en race sans consulter la TTE. Avec TTE 35', IF réaliste ≈ 72-78% FTP.

- Créer `src/lib/v2/racePowerCap.ts` : `capBikeRaceIF({ baselineIF, tteMin, raceDurationMin, ambition })` qui applique une pénalité log(raceDur/tte).
- Consommé par `promptHelpers.ts` (bloc "Cible course vélo") + injecté dans la prescription passée au prompt IA.
- Fallback texte : « TTE 35' → IF max soutenable ≈ 0.74. Prescrire 72-76% FTP en race, pas 82-85%. »

### #2 · Sprint Ban gated sur la vraie valeur VLamax + discipline
Bug racine probable : `computeLorangStrategy` reçoit `discipline='bike'` alors que VLamax mesurée est côté run. Cible bike=0.30 → seuil 0.375 → VLamax 0.44 déclenche à tort le ban.

- Auditer les 6 call-sites de `computeLorangStrategy` : garantir passage `discipline` cohérent avec la source de la valeur `physiology.vlamax`.
- Ajouter garde-fou dans `lorangStrategyEngine.ts` : si `physiology.vlamax <= physiology.vlamaxTarget * 1.0` → jamais de Sprint Ban, même en elite.
- Test unitaire `sprintBan.gating.test.ts` reproduisant le cas Cath (VLamax 0.44, 703, age_group).

### #7 · Volume hebdo calculé, pas placeholder
Le libellé « 8h30 → 10h45 » est identique semaine 1 à 5 (dont décharge).

- Dans `aiPlanParser.ts` (ou post-processor), calculer `week.totalMinutes = sum(session.estimatedDurationMin)` et remplacer le placeholder dans `week.theme`/UI.

## Phase 2 — Zones triathlon single-source (jour 2)

### #3 · Zones vélo/course d'une source unique en triathlon
Aujourd'hui : Z2 vélo varie de 95W à 124W dans le même plan, Z2 run à 6'05–6'30 quand seuil 4'52.

- Étendre `deriveRaceTargets` : nouvelle fonction `deriveTriathlonZones({ ftp, vmaKmh, paceThresholdSec, objectif, ambition })` produisant un bloc unique `{ bike: {z1..z5}, run: {z1..z5} }` cohérent Coggan/Daniels.
- Injecter ce bloc figé dans le prompt IA (« Zones à utiliser TEL QUEL, ne pas recalculer »).
- `planValidator` : nouvelle règle `zonesConsistencyRule` — flag si texte de séance mentionne un intervalle W ou allure hors de ±3% de la zone canonique du label utilisé.

## Phase 3 — Structure & catalogue (jour 3)

### #5 · Décharge obligatoire tous les 3 blocs
`planValidator` : règle `dechargeFrequencyRule` — pour tout plan > 6 semaines, exiger 1 semaine avec volume ≤ 70% de la précédente tous les 3-4 blocs, sinon severity=high + patch auto-inject.

### #6 · Anti-contamination élite sur plan Age Group
Filtre catalogue : quand `ambition ∈ {finisher, age_group, perf}`, stripper des `description`/`details` les mentions `#elite`, `#podium`, `"pour femme élite mondiale"`, `"viser 2×"`. Implémenter dans `aiPlanWorkoutEnricher.ts`.

### #4 · Format `raceFormat="lcw_3day"` propagé au sélecteur
- Ajouter 4 séances au catalogue (`src/lib/enrichedWorkoutsLCW.ts`) : refeed inter-jours, back-to-back sam-vélo/dim-run @ allure semi cible, OWS 1.9km frais, brick léger vs 70.3 classique.
- Étendre `promptHelpers.ts` : détecter `raceGoals[i].raceFormat === "lcw_3day"` → injecter section prompt dédiée qui force la sélection LCW-sim au lieu de `703_PODIUM_DURABILITY`.
- Bloquer `B_703_BRICK_RACE_PACE` et briques longues quand format LCW détecté.

## Aspects techniques

- Chaque phase est mergeable indépendamment (feature flag pas nécessaire — additive).
- Miroir `src/lib/deriveRaceTargets.ts` ↔ `supabase/functions/_shared/deriveRaceTargets.ts` maintenu pour Phase 2.
- Tests unitaires : au moins 1 test régression par correctif (`sprintBan.gating.test.ts`, `racePowerCap.test.ts`, `dechargeFrequency.test.ts`, `zonesConsistency.test.ts`).
- Aucun changement DB requis.

## Ordre d'exécution proposé

Je démarre par **Phase 1** (#1 + #2 + #7) dans le prochain tour — ce sont les 3 changements les plus haut ROI/sécurité, testables sur le prochain plan Cath régénéré. Puis on itère phase par phase avec ton retour à chaque livraison.

# P0 — Progression individualisée des charges et cohérence des quotas (sorties longues)

Date : 2026-10-24
Branche : `fix/p0-sl-individualized-progression-20261024`
Base : `main` @ `78e5d96` (PR #397 fusionnée)

## 1. Résumé

Le plancher de sortie longue (SL) hebdomadaire — `slLongRideMin`/`slLongRunMin`,
calculé dans `sessionSizingMatrix.ts` — exigeait **la même durée dès la semaine 1**
que n'importe quelle semaine de build ultérieure, quel que soit le niveau déclaré
de l'athlète ou sa charge réellement mesurée. Sur le plan réel 70.3/33 semaines
audité, cela se traduisait par une exigence de sortie longue vélo de 120 min (703)
ou course de 90 min dès S1, identique pour un débutant et un athlète confirmé.

La correction étend — **sans inventer de nouveau coefficient** — la rampe de
volume déjà individualisée (`PlanConfig.volumeRamp`, existante et déjà revue) à
la durée de sortie longue, pour les semaines de charge ("load") uniquement.

## 2. Diagnostic (causes démontrées, pas des hypothèses)

### 2.1 `computeWeeklySessionQuota` / `floorsFor` / `SL_MIN_BY_OBJECTIVE`
`floorsFor(obj)` lit une table plate par objectif (`SL_MIN_BY_OBJECTIVE`, ex.
`703: {bike:120, run:90}`, `10K: {run:60}`, `MARATHON: {run:110}`) — aucun
paramètre de semaine, de niveau ou de charge n'entre dans ce calcul.
`computeWeeklySessionQuota` ne reçoit ni `weekNumber` ni `phase`. Seule la
modulation `weekType` (recovery ×0.7, taper/race désactivé) existait déjà.
**Cause démontrée** : le plancher est invariant par semaine à l'intérieur
d'une même `weekType`, donc identique en S1 et en S20 d'une période "load".

### 2.2 `weeklyQuotas` / `applySLFloorEnforcement` (serveur)
Le serveur (`supabase/functions/ai-training-plan/jsonPlanHandler.ts`) ne
recalcule rien : il lit `planConfig._weeklyQuotas`, construit côté client et
transmis tel quel. **Source unique confirmée.**

### 2.3 `validateWeeklyQuotas.ts` (client)
Pure fonction de comparaison `observé vs entry.floors` — même source
(`lastWeeklyQuotasRef`), aucun calcul indépendant.

### 2.4 `planReconciler.ts` — insertion de plancher SL
Insertion de plancher via `findReplacement({..., targetDur: floor,
requireFamily: "easy"})`. `floor` provient du même `quotasByWeek` ; le
garde-fou de famille (`requireFamily`) est **dérivé uniquement de la zone
d'intensité de la fiche catalogue** (`intensityFamily(zoneMax)`), jamais de
la valeur du plancher.

### 2.5 Sélecteurs catalogue (serveur `applySLFloorEnforcement`, client `findReplacement`)
Vérification explicite demandée par la mission (point critique) : **le
plancher réduit ne peut-il faire accepter à tort une fiche incompatible
(ex. renfo vélo 75 min considérée comme équivalente à une SL 120 min) ?**
Non — confirmé en lisant le pipeline de filtrage des deux mécanismes :
- Serveur : `classifyIntensity(...)` classe la fiche en `endurance`/`recovery`
  **avant** le filtre de durée (`c.durationMin[1] >= spec.floor`) ; ce filtre
  d'intensité ne dépend jamais de la valeur numérique du plancher.
- Client : `requireFamily: "easy"` est un garde-fou dur basé sur
  `intensityFamily(zoneMax)`, également indépendant de `floor`.
Un plancher plus bas ne peut donc **qu'élargir l'ensemble des fiches
endurance déjà conformes** (plus de candidates légitimes), jamais faire
passer une fiche de force/seuil/VO2 pour une SL. La garantie de cohérence
catalogue (section 4 de la mission) est préservée par construction.

### 2.6 Données athlète réellement disponibles
`PlanConfig.volumeRamp` (déjà existant, déjà revu) est la seule donnée
d'individualisation disponible aujourd'hui qui combine : niveau déclaré par
le coach (`formConfig.trainingLevel`) **réconcilié avec la Charge Récente de
Référence réellement mesurée** (Nolio/snapshot, via
`resolveVolumeRampLoadAdjustment` — jamais une estimation fabriquée) et une
matrice à 4 paliers (`untrained/light/trained/highly_trained`). `injuryRisk`
(bike/run, niveaux FAIBLE/MODERE/ELEVE/CRITIQUE) est également disponible et
déjà calculé ailleurs (jamais ré-estimé ici).
**Limite démontrée** : quand `formConfig.trainingLevel` est absent ou vaut
"auto" (UI), ou que `weeklyHours` est nul, `volumeRamp` est `undefined` — il
n'existe alors **aucune donnée d'entrée** permettant d'individualiser quoi
que ce soit, ni la rampe de volume existante, ni (désormais) le plancher SL.

## 3. Correction appliquée

### 3.1 Principe
`applySlFloorIndividualization(floors, weekNumber, weekType, ramp, injuryRisk)`
(nouvelle fonction pure, additive, `sessionSizingMatrix.ts`) :
- **Semaines "load" uniquement** — recovery/taper/race restent modulées
  comme avant par `floorsFor`, jamais re-modulées ici (pas de double-remise).
- Réutilise **exclusivement** les deux ancres déjà individualisées de
  `volumeRamp` : `week1PctTarget` (interpolé linéairement de S1 à `rampWeeks`,
  puis 100% au-delà — pas une nouvelle courbe, l'extension de la rampe
  existante à une seconde grandeur).
- Réutilise le malus ×0.7 **déjà existant** (recovery) comme facteur
  protecteur si un risque blessure ÉLEVÉ/CRITIQUE est déjà calculé pour le
  sport concerné — jamais un nouveau coefficient inventé pour ce cas.
- **Vélo et course toujours traités indépendamment** (deux facteurs
  distincts, `Math.min(rampe, blessure)` par discipline — jamais un seul
  pourcentage générique appliqué aux deux).
- Si `volumeRamp` est absent → **no-op strict**, plancher nominal dès S1,
  comportement inchangé (voir limite connue, section 6).

### 3.2 Point d'intégration unique (cohérence serveur/client garantie)
`useAITrainingPlan.ts` (boucle de construction `weeklyQuotas`, génération
complète) et `AITrainingPlanPage.tsx` (`handleRegenerateWeek`, régénération
d'une semaine seule) appellent `applySlFloorIndividualization` immédiatement
après `computeWeekQuotaEntry`, puis propagent le résultat (`floors`
individualisés) à **la fois** à `buildWeeklySlotLayout` (squelette hebdo
imposé au LLM) et à l'entrée stockée dans `weeklyQuotas[w]` — la même entrée
lue ensuite par le prompt, `applySLFloorEnforcement` (serveur, via
`_weeklyQuotas`), `runReconciler` et `validateWeeklyQuotas`. Un seul point de
calcul alimente les cinq consommateurs : **aucune divergence possible entre
le texte de prompt, l'enforcement serveur, la réconciliation client et la
validation finale**, par construction.

## 4. Fichiers modifiés

- `src/engines/plan/sessionSizingMatrix.ts` — ajout (additif, aucune
  signature existante modifiée) : `SlFloorRampAnchors`, `slFloorRampFactor`,
  `slFloorInjuryFactor`, `SlFloorIndividualizationResult`,
  `applySlFloorIndividualization`.
- `src/hooks/useAITrainingPlan.ts` — boucle de génération complète : calcule
  les ancres une fois, applique l'individualisation par semaine, journalise
  un résumé (`console.log('[sl_floor_individualization]', ...)`, aucune
  donnée personnelle).
- `src/pages/AITrainingPlanPage.tsx` — `handleRegenerateWeek` : même
  individualisation pour la régénération d'une semaine seule (position
  globale réelle, pas un offset de chunk).
- `src/engines/plan/__tests__/slFloorIndividualization.profiles.test.ts`
  (nouveau) — 9 tests ciblés, 4 profils + risque blessure + indépendance
  vélo/course.

Aucune modification de `applySLFloorEnforcement`, `validateWeeklyQuotas.ts`,
ni d'aucun code serveur Deno — la cohérence vient du point d'intégration
unique (section 3.2), pas d'une duplication de logique côté serveur.

## 5. Tests

### 5.1 Nouveaux tests ciblés (9/9 verts)
`slFloorIndividualization.profiles.test.ts` — valeurs réellement transmises
au générateur (pas seulement absence d'alerte) :

- **Profil A** (triathlète confirmé, 70.3, niveau `trained`, rampe 80%/2 sem.) :
  plancher S1 réduit à 95 min vélo / 70 min course (vs 120/90 nominal),
  retour exact au plancher nominal dès S2 (fin de rampe), jamais réduit
  au-delà. Semaine recovery : individualisation sans effet (pas de
  double-réduction avec le ×0.7 existant).
- **Profil B** (débutant 10K, niveau `untrained`, rampe 40%/6 sem.) :
  plancher S1 à 25 min (vs 60 nominal) — prescription non excessive ;
  progression strictement monotone semaine après semaine jusqu'à 100% en S6.
- **Profil C** (marathonien expérimenté, niveau `highly_trained`,
  `rampWeeks=1`) : la rampe se neutralise d'elle-même (`rampWeeks<=1` → 1
  systématiquement) — plancher nominal (110 min) dès S1, **aucune
  régression artificielle de charge**.
- **Profil D** (données insuffisantes, `volumeRamp` absent) :
  comportement strictement inchangé, plancher nominal dès S1 — aucune
  estimation fabriquée sans donnée d'entrée.
- Risque blessure ÉLEVÉ/CRITIQUE : malus appliqué indépendamment par
  discipline, le plus restrictif entre rampe et blessure prévaut, actif même
  hors fenêtre de rampe.
- Indépendance vélo/course : un risque déclaré sur une seule discipline ne
  module jamais l'autre.

### 5.2 Non-régression
- `npx tsc --noEmit -p .` → 0 erreur.
- `npx vitest run` (suite complète) → **334/334 fichiers, 2503/2503 tests
  verts** (6 todo, pré-existants, hors scope).
- ESLint sur les 3 fichiers modifiés → **96 problèmes avant/après,
  identiques** (74 erreurs `no-explicit-any` pré-existantes, aucune
  nouvelle) — le diff n'introduit aucune régression de lint.

## 6. Limites connues / décisions nécessitant la validation du coach

1. **`volumeRamp` absent → aucune individualisation possible** (niveau non
   déclaré, UI "auto", ou `weeklyHours` nul). C'est un no-op strict et
   documenté, pas une estimation fabriquée — conforme à la consigne
   "ne jamais inventer d'historique fictif". Élargir le déclenchement de
   `volumeRamp` lui-même (dans `planConfigBuilder.ts`) est hors scope de
   cette correction (jugé trop invasif pour ce chantier) : **à valider par
   le coach si une individualisation est souhaitée même sans niveau
   déclaré** (ex. valeur par défaut conservatrice).
2. Les anomalies de la section 8 de la mission (10K non déclaré apparu en
   S24, divergence "course" vs "course+renfo") **ne sont pas traitées ici**,
   conformément à l'instruction explicite — elles restent dans le suivi,
   non corrigées par hypothèse.
3. La sévérité des contrôles (`sl_upgrade_unresolved`,
   `duration_unresolved`, `reconcile_conflict`) n'a **pas été modifiée** —
   conformément à l'instruction, les causes sont corrigées avant toute
   reclassification éventuelle, qui n'a pas été entreprise dans ce chantier.

## 7. Impact attendu sur le plan réel 33 semaines (70.3)

Pour un athlète dont le niveau déclaré se réconcilie en `trained` (rampe
80%/2 semaines), les sorties longues S1-S2 seront prescrites à ~95 min vélo
/ ~70 min course au lieu de 120/90 min imposés jusqu'ici dès S1 — la
génération ET les mécanismes de réparation (serveur et client) convergeront
désormais vers cette même cible réduite, sans qu'aucun ne tente de fabriquer
une fiche catalogue inadéquate pour l'atteindre. Les semaines ultérieures de
build ne sont pas affectées (retour au plancher nominal dès la fin de la
rampe). Les semaines de décharge/taper/course restent modulées exactement
comme avant.

## 8. Restrictions respectées

Aucune fusion automatique. Aucun déploiement. Aucun appel Gemini. Aucune
génération IA payante. Aucune modification des données réelles d'athlètes.
Aucune modification de l'intégration Nolio. Aucune désactivation des
protections P0.

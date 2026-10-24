# P0 — Progression individualisée des charges et cohérence des quotas (sorties longues)

Date : 2026-10-24 (mise à jour : revue sportive finale PR #398)
Branche : `fix/p0-sl-individualized-progression-20261024`
Base : `main` @ `78e5d96` (PR #397 fusionnée)

> **Mise à jour suite à la revue sportive finale de la PR #398** : les
> sections 0 et 6 ci-dessous répondent point par point aux 4 points soulevés
> (progression vélo/CAP, sensibilité aux phases, risque blessure, tests).
> Une correction de fond a été appliquée (point 1 — voir section 0.1) ; les
> points 2, 3 et 4 n'ont pas nécessité de changement de logique mais ont
> révélé des clarifications nécessaires (statut épistémique, wording) et de
> nouveaux tests. **Verdict : voir section 9.**

## 0. Réponses à la revue sportive finale (2026-10-24)

### 0.1 Point 1 — Progression des sorties longues : correction appliquée

**Constat confirmé, pas une fausse alerte.** La version initiale de
`slFloorRampFactor` interpolait linéairement de `week1PctTarget` à 100% en
EXACTEMENT `rampWeeks` semaines. Pour le palier "trained" (80%, rampWeeks=2),
cela produisait un saut S1→S2 de +25% relatif en **une seule semaine** —
strictement **plus agressif** que la consigne "+10%/sem MAX" que ce même
objet `volumeRamp` affiche pourtant déjà au LLM pour le volume hebdo total
(promptHelpers.ts, bloc "RAMPE DE VOLUME OBLIGATOIRE"). C'est une
**incohérence interne démontrée** entre deux usages de la même donnée, pas
une hypothèse.

**Second constat, plus fondamental** : `volumeRamp` individualise par
**palier de niveau déclaré** (untrained/light/trained/highly_trained), pas
par historique granulaire réel de l'athlète. `resolveVolumeRampLoadAdjustment`
ne fait que corriger le palier à la baisse quand la charge mesurée le
contredit (surcharge/sous-charge réelle) — quand la charge mesurée est
absente ou cohérente avec le niveau déclaré, la vitesse de rampe
(`week1PctTarget`, `rampWeeks`) reste une valeur de matrice fixe, écrite une
fois pour le volume hebdo agrégé, **jamais démontrée spécifiquement pour la
durée d'une sortie longue**. Conclusion honnête, conforme à la consigne de
la revue : cette fonction ne doit **jamais** être présentée comme "la
progression SL scientifiquement individualisée pour cet athlète" — c'est une
réutilisation cohérente d'un palier catégoriel déjà revu, pas une courbe
dérivée des données réelles de l'athlète.

**Correction appliquée** (`sessionSizingMatrix.ts::slFloorRampFactor`) :
remplacement de l'interpolation linéaire par une **croissance géométrique
plafonnée au taux hebdo déjà existant `weeklyIncreasePctMax`** (même objet
`volumeRamp`, défaut 0.10, abaissé à 0.07 par `resolveVolumeRampLoadAdjustment`
si charge réelle en surcharge). Aucun nouveau coefficient : on retient
toujours le taux le **plus lent** entre celui qu'impliquerait `rampWeeks`
pris littéralement et ce plafond déjà existant. Conséquence mesurée (palier
"trained", bike 120min/run 90min) :

| Semaine | Ancienne version | Nouvelle version |
|---|---|---|
| S1 | 95 / 70 min | 95 / 70 min (inchangé) |
| S2 | **120 / 90 min** (saut direct, +25%) | 105 / 80 min (+10%, plafonné) |
| S3 | 120 / 90 min | 115 / 85 min |
| S4 | 120 / 90 min | 120 / 90 min (nominal atteint) |

Jamais plus agressif que l'ancienne version, toujours au moins aussi lent —
**plus prudent, jamais moins sûr**. Pour le palier "untrained" (débutant),
le plancher nominal est désormais atteint en ~S11 au lieu de S6 — plus
progressif, cohérent avec "pas de prescription initiale excessive".

**Ce qui n'a pas été fait, volontairement** : inventer une courbe propre à
la durée de SL (aucune donnée ne la justifie aujourd'hui). Si une
individualisation réellement spécifique à la SL est souhaitée (ex. historique
de durée de sortie longue récemment réalisée), c'est une **décision à
prendre avec le coach** sur quelles données collecter — pas un coefficient à
inventer dans ce correctif.

### 0.2 Point 2 — Sensibilité aux phases (Base/Build/Peak)

**Investigation menée, aucune incohérence trouvée, aucun changement de
logique nécessaire.** Le mécanisme d'individualisation (`applySlFloorIndividualization`)
ne reçoit effectivement jamais la phase catalogue (Base/Build/Peak) — par
conception : il ne module qu'un NOMBRE (la durée plancher), jamais une
sélection de fiche. La cohérence avec les fiches réellement autorisées par
phase est vérifiée **en aval**, dans les deux mécanismes de remplacement
catalogue, et elle est **déjà garantie indépendamment de la valeur du
plancher** :
- `repairCandidateCompatible` (serveur, `jsonPlanHandler.ts`) et son
  équivalent client appellent tous deux `evaluateRepairSportingEquivalence`
  (`repairSportingEquivalence.ts`), qui compare `week.phase` (la phase RÉELLE
  de la semaine, déjà disponible dans le pipeline) aux `phases[]` déclarées
  de chaque fiche candidate — **avant** le filtre de durée, et **jamais** en
  fonction de la valeur numérique du plancher.
- Conséquence démontrée (et maintenant testée, section 0.4 / tests
  "slFloorPhaseRestriction") : un plancher plus bas ne peut **qu'élargir**
  l'ensemble des fiches déjà phase-compatibles qui satisfont aussi la durée —
  **jamais** faire admettre une fiche dont la phase ne convient pas, même si
  sa durée serait par ailleurs correcte.

**Découverte annexe, hors scope de cette correction** : `widenEndurancePhases`
(`src/lib/plan/phaseWidener.ts`) — un mécanisme PRÉEXISTANT qui élargit
automatiquement `phase[]` à `[base, build, peak]` pour toute fiche
endurance/technique au chargement de la bibliothèque — n'est appelé que
**côté client** (`src/lib/workoutLibrary.ts`). Il n'est **jamais invoqué
côté serveur** (`jsonPlanHandler.ts`, qui reçoit ses métadonnées déjà
construites). C'est une **asymétrie serveur/client préexistante et
démontrée** (pas une hypothèse), susceptible de rendre le filtre de phase
serveur plus restrictif que le filtre client pour une même fiche. Elle n'est
ni causée ni aggravée par cette correction (le filtre de phase, quel que
soit son réglage, reste de toute façon indépendant de la valeur du
plancher). **Non corrigée ici** (toucherait la construction du catalogue
serveur, hors périmètre "correction minimale" de ce chantier) — à consigner
dans le suivi, au même titre que les anomalies de la section 8 de la mission
d'origine.

### 0.3 Point 3 — Risque blessure : le malus ×0.7 n'est pas une garantie de sécurité

**Constat confirmé sur la présentation, aucun contournement de sécurité
trouvé dans le code.** Vérification explicite menée : le contrôle bloquant
réel pour le niveau CRITIQUE est `validateInjuryRiskCompliance`
(`planValidator.ts`) — il compte les séances à **impact mécanique élevé**
par semaine (motif texte : sortie longue/fractionné-côtes CAP, travail force
basse cadence vélo) et bloque la sauvegarde si ce compte dépasse 2/semaine.
Ce contrôle est **entièrement indépendant** de la durée de la sortie longue :
réduire une durée ne change ni le contenu ni le motif textuel de la séance,
donc ne change jamais son compte dans ce contrôle. **Vérifié explicitement** :
aucun champ produit par `applySlFloorIndividualization`
(`SlFloorIndividualizationResult`) n'est lu par `validateInjuryRiskCompliance`
ni par aucune logique de déclassement de sévérité — structurellement, cette
fonction ne peut pas supprimer ni affaiblir ce contrôle.

Ce qui était inexact, c'est la **présentation** : le code (commentaires,
messages de traçabilité) et le rapport initial employaient un vocabulaire
("malus protecteur") qui pouvait laisser croire que cette réduction de durée
"gère" le risque blessure. **Corrigé** : le code et les messages de
traçabilité affirment désormais explicitement que ce facteur est une
précaution volumique **supplémentaire et conservatrice**, **jamais une
preuve de sécurité**, et **jamais un substitut à la validation du coach**
sur une semaine à risque CRITIQUE. Pour le niveau ÉLEVÉ, par conception
préexistante (non modifiée ici), **aucun autre contrôle automatique
n'existe** ("niveau de vigilance, pas d'alerte") — ce facteur reste donc la
seule mitigation automatique disponible pour ÉLEVÉ, ce qui est maintenant dit
explicitement plutôt que sous-entendu.

**Ce qui n'a pas été fait, volontairement** : ajouter un nouveau contrôle
qui bloquerait ou signalerait spécifiquement "SL réduite pour risque
CRITIQUE, à valider" — ce serait un nouveau système QA, explicitement exclu
par la revue. La vigilance sur les semaines CRITIQUE reste, comme avant ce
chantier, une responsabilité du coach au moment de la revue du plan.

### 0.4 Point 4 — Tests ajoutés pour couvrir les 3 points ci-dessus

5 tests ajoutés à `slFloorIndividualization.profiles.test.ts` (vitest,
exécutés et verts — voir section 5) :
- Progression plafonnée à +10%/sem, jamais au-delà (point 1).
- Progression qui respecte le plafond RÉEL transmis (0.07 si charge mesurée
  en surcharge), pas une valeur par défaut générique ignorant la donnée
  réelle (point 1, "ne dépend pas d'une hypothèse non vérifiée").
- Le squelette hebdo (`buildWeeklySlotLayout`) porte bien la durée
  individualisée de bout en bout — reproduit le flux réel
  `useAITrainingPlan.ts` (point 4, "quotas propagés au pipeline cohérents").
- La réduction par risque blessure ne modifie jamais la présence/le nombre
  de séances exigées (`longRideWeekly`/`longRunWeekly`/quota) — seule la
  durée change (point 3/4).
- Même sous risque CRITIQUE, la séance de sortie longue reste présente dans
  le squelette (jamais retirée silencieusement) — le contrôle de conformité
  CRITIQUE garde une séance réelle à évaluer (point 3/4).

2 tests Deno ajoutés (`jsonPlanHandler.slFloorPhaseRestriction.test.ts`,
mirroré dans `ai-training-plan/` et `ai-training-plan-test/`, même
convention que les tests serveur existants) : démontrent qu'une fiche
phase-incompatible (ex. réservée Build/Peak) n'est **jamais** choisie pour
satisfaire un plancher SL en semaine "Base", **que le plancher soit nominal
ou réduit par individualisation** — et qu'un plancher réduit élargit
correctement la résolution vers la bonne fiche sans jamais tolérer la
mauvaise. **Limite de validation à signaler honnêtement** : ces 2 tests
n'ont pas pu être exécutés localement dans cette session (le bac à sable
bloque `deno.land` et `esm.sh`, dont dépend transitivement `jsonPlanHandler.ts`
via `zod`) — ils ont été écrits en suivant strictement la convention et la
logique exacte des tests serveur existants déjà verts en CI (même
construction `metadata()`/`catalogDump()`/`applySLFloorEnforcement(...)`
que `jsonPlanHandler.sportingEquivalence.test.ts`), et seront validés par le
job CI `deno-test` au push. Tous les autres tests (vitest : 334/334 fichiers,
2508/2508 tests, et tsc, et ESLint) ont bien été exécutés et vérifiés dans
cette session.

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
  — 14 tests ciblés (4 profils + risque blessure + indépendance vélo/course
  + 5 tests ajoutés suite à la revue finale : plafond de progression,
  dépendance aux données réelles, cohérence du squelette hebdo, non-garantie
  de sécurité).
- `supabase/functions/ai-training-plan/jsonPlanHandler.slFloorPhaseRestriction.test.ts`
  et son miroir `ai-training-plan-test/` (nouveaux, Deno) — cohérence de
  phase du catalogue sous plancher réduit (voir section 0.4, limite de
  validation locale signalée).

Aucune modification de `applySLFloorEnforcement`, `validateWeeklyQuotas.ts`,
ni d'aucun code serveur Deno — la cohérence vient du point d'intégration
unique (section 3.2), pas d'une duplication de logique côté serveur.

## 5. Tests

### 5.1 Tests ciblés vitest (14/14 verts, exécutés dans cette session)
`slFloorIndividualization.profiles.test.ts` — valeurs réellement transmises
au générateur (pas seulement absence d'alerte) :

- **Profil A** (triathlète confirmé, 70.3, niveau `trained`) : plancher S1
  réduit à 95 min vélo / 70 min course (vs 120/90 nominal), progression
  ensuite plafonnée à +10%/sem (105/80 en S2, 115/85 en S3), nominal atteint
  en S4 sans jamais le dépasser. Semaine recovery : individualisation sans
  effet (pas de double-réduction avec le ×0.7 existant).
- **Profil B** (débutant 10K, niveau `untrained`) : plancher S1 à 25 min
  (vs 60 nominal) — prescription non excessive ; progression strictement
  monotone, nominal atteint en S11 (plus progressif qu'avant la revue).
- **Profil C** (marathonien expérimenté, niveau `highly_trained`,
  `rampWeeks=1`) : la rampe se neutralise d'elle-même — plancher nominal
  (110 min) dès S1, **aucune régression artificielle de charge**.
- **Profil D** (données insuffisantes, `volumeRamp` absent) :
  comportement strictement inchangé, plancher nominal dès S1 — aucune
  estimation fabriquée sans donnée d'entrée.
- Risque blessure ÉLEVÉ/CRITIQUE : ajustement appliqué indépendamment par
  discipline, le plus restrictif entre rampe et blessure prévaut, actif même
  hors fenêtre de rampe.
- Indépendance vélo/course : un risque déclaré sur une seule discipline ne
  module jamais l'autre.
- **(Ajoutés suite à la revue finale)** Progression jamais plus rapide que
  +10%/sem (ou +7%/sem si charge réelle en surcharge — donnée réellement
  transmise, pas un défaut générique) ; le squelette hebdo imposé au LLM
  (`buildWeeklySlotLayout`) porte bien la durée individualisée de bout en
  bout ; la réduction par risque blessure ne touche jamais la
  présence/le nombre de séances exigées, seulement leur durée ; la séance de
  sortie longue reste toujours présente dans le squelette même sous risque
  CRITIQUE (jamais retirée silencieusement).

### 5.2 Tests Deno (serveur) — écrits, non exécutables localement
`jsonPlanHandler.slFloorPhaseRestriction.test.ts` — voir section 0.4 pour le
détail et la limite de validation (CI `deno-test` fera foi).

### 5.3 Non-régression (exécutée dans cette session)
- `npx tsc --noEmit -p .` → 0 erreur.
- `npx vitest run` (suite complète) → **334/334 fichiers, 2508/2508 tests
  verts** (6 todo, pré-existants, hors scope).
- ESLint sur les fichiers modifiés → **96 problèmes avant/après,
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
4. **(Section 0.2)** Asymétrie serveur/client préexistante et démontrée sur
   la disponibilité des phases catalogue (`widenEndurancePhases` client-only,
   jamais appelé côté serveur) — non corrigée ici (hors scope, toucherait la
   construction du catalogue serveur), à consigner dans le suivi.
5. **(Section 0.3)** Le malus blessure ÉLEVÉ/CRITIQUE reste une précaution
   volumique partielle, jamais une validation de sécurité — pour le niveau
   ÉLEVÉ spécifiquement, c'est la SEULE mitigation automatique existante
   (aucun autre contrôle ne couvre ce niveau, par conception préexistante
   non modifiée). La vigilance sur les semaines à risque reste une
   responsabilité du coach à la revue du plan.
6. **(Section 0.4)** Les 2 nouveaux tests Deno (cohérence de phase serveur)
   n'ont pas pu être exécutés localement (sandbox sans accès à `deno.land`/
   `esm.sh`) — à confirmer par le job CI `deno-test` au push.

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
protections P0. Aucun nouveau système QA ajouté. Aucun nouveau coefficient
inventé (point 1 réutilise `weeklyIncreasePctMax`, déjà existant dans
`volumeRamp`).

## 9. Verdict — GO/NO-GO pour la fusion

**NO-GO en l'état**, pour une seule raison factuelle : les 2 nouveaux tests
Deno serveur (`jsonPlanHandler.slFloorPhaseRestriction.test.ts`, point 2/4)
n'ont pas pu être exécutés dans ce bac à sable (réseau restreint) et
n'ont donc pas encore de confirmation CI — **PR laissée en brouillon**,
conformément aux restrictions.

Sur le fond :
- **Point 1 (progression)** : corrigé — la progression est désormais
  plafonnée par une donnée déjà existante (`weeklyIncreasePctMax`), jamais
  plus agressive qu'avant, et le rapport ne présente plus cette rampe comme
  une courbe scientifiquement individualisée spécifique à la SL.
- **Point 2 (phases)** : aucune incohérence trouvée — la cohérence de phase
  est déjà garantie en aval, indépendamment du plancher, par construction.
  Une asymétrie serveur/client préexistante (sans rapport avec ce chantier)
  a été découverte et consignée pour suivi.
- **Point 3 (risque blessure)** : aucun contournement de sécurité trouvé —
  le contrôle bloquant réel (`validateInjuryRiskCompliance`) reste
  entièrement indépendant et actif. Le vocabulaire a été corrigé pour ne
  plus présenter la réduction de durée comme une garantie.
- **Point 4 (tests)** : 5 nouveaux tests vitest exécutés et verts ; 2
  nouveaux tests Deno écrits mais non exécutables localement — seul point
  bloquant la fusion à ce stade.

**Action recommandée** : laisser CI (`deno-test`) confirmer les 2 tests
serveur après ce push ; si verts, la PR peut passer en revue finale pour
fusion sur votre décision explicite (toujours manuelle, jamais automatique).

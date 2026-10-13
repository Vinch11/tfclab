# Audit scientifique P0 — TFCLab

**Mode : lecture seule.** Aucune modification de code n'a été faite. Toutes les
lignes citées ont été lues directement dans le code exécutable actuel (pas
dans les anciens rapports `AUDIT_*.md`), conformément au périmètre demandé.

Aucune affirmation ci-dessous n'est une validation scientifique du modèle —
seulement un constat factuel sur ce que le code fait, documente ou ne documente
pas.

---

## 1. Cartographie des chemins réellement utilisés en production

| Fichier | Lignes | Consommé par (confirmé par grep) |
|---|---|---|
| `src/lib/v2/adaptationPredictor.ts` | 762 | `AdaptationPredictorCard.tsx`, `planConfigBuilder.ts`, `pages/Index.tsx` |
| `src/engines/plan/planValidator.ts` | 3965 | Pipeline de validation post-génération du plan (QA coach) |
| `src/lib/vlamaxResolver.ts` | 197 | `adaptationPredictor.ts`, `fatmaxTFCL.ts`, `computeDiagnostic.ts`, `runningLimiterDetection.ts`, `useDerivedTrainingZones.ts` (indirect), + 7 autres |
| `src/lib/v2/runMLSSPredictor.ts` | 142 | `useDerivedTrainingZones.ts`, `computeDiagnostic.ts`, `runMLSSCohortValidation.ts`, `LabAthleteValidator.tsx` |
| `src/lib/v2/runMLSSCohortValidation.ts` | 338 | `RunMLSSCohortPage.tsx` (page admin, hors flux coach normal) |
| `src/lib/zones/deriveTrainingZones.ts` | ~430 | `useDerivedTrainingZones.ts` → `DerivedTrainingZonesCard.tsx` (seul consommateur) |
| `src/lib/plan/planReconciler.ts` | 1683 | Pipeline client de génération de plan (`useAITrainingPlan.ts`), tourne après le réconciliateur serveur |

Tous les fichiers du périmètre sont bien des chemins de production actifs (aucun n'est du code mort).

---

## 2. Tableau des constats

Légende : 🔴 confirmé (lu dans le code, reproductible) · 🟡 risque théorique (plausible mais non vérifié en profondeur) · 🟢 déjà protégé.

| # | Chantier | Statut | Constat |
|---|---|---|---|
| F1 | 1 — Adaptation Predictor | 🔴 | 9 des 12 leviers de `LEVER_EFFECTS` (volume_z2, threshold_work, max_force, running_economy, reduce_anaerobic, vo2max_intervals, train_low, polarized_hi, increase_ftp_kg) n'ont **aucune citation** pour leurs bornes min/max %. Seuls `glycolytic_block` (Lievens 2020) et `norwegian_method` (Seiler 2010, Sylta/Tønnessen 2016, Casado/Foster 2022) sont sourcés. |
| F2 | 1 — Adaptation Predictor | 🔴 | `trainabilityCaps.ts` ne plafonne QUE vo2max/vlamax/lt2/fatmax (`CappedMetricId`). TTE/durabilité/économie restent **sans aucune borne de plausibilité** — avec `durationFactor` jusqu'à ×2.5, un levier comme `threshold_work` (tte +10-20%) peut projeter jusqu'à **+50% de TTE** sans aucun garde-fou, alors que vo2max/vlamax sont rigoureusement bornés sur le même scénario. |
| F3 | 1 — Adaptation Predictor | 🟡 | `computeDurationFactor` suppose une mise à l'échelle **linéaire** de l'effet avec la durée (weeks/6, borné [0.5, 2.5]) — simplification non sourcée ; les courbes d'adaptation réelles sont typiquement saturantes, pas linéaires. Partiellement compensé par F2 pour 4 métriques sur 7. |
| F4 | 2 — planValidator.ts | 🔴 | `isDeload = DELOAD_PATTERNS.test(themeText) || activeSessions.length <= 3` (ligne 591) — **toute** semaine à ≤3 séances actives est auto-exemptée des règles de polarisation/densité jours-durs/séances-clés, **même si le thème n'indique aucune récupération** (ex : semaine courte pour une autre raison — contrainte, sport banni retiré). |
| F5 | 2 — planValidator.ts | 🟡 | `validateWeeklyHardDayDensity` utilise un seuil d'exemption différent (`activeSessions.length < 5`, ligne 748) de celui utilisé par les autres règles (`<=3`) — incohérence de frontière entre fonctions de validation du même fichier. |
| F6 | 2 — planValidator.ts | 🔴 (déjà connu par l'équipe) | Le commentaire ligne 774-782 documente lui-même une limite non corrigée : la détection de séquence "jours durs consécutifs" est bornée à la semaine courante (dayIndex 0-6) et **ne détecte jamais un enchaînement à cheval sur deux semaines** (ex: Ven-Sam-Dim-Lun). Référencé comme bug réel déjà signalé ("ChatGPT, plan 10K Vince"). |
| F7 | 3 — Confiance VLamax | 🔴 | `resolveVlamaxForGoal()` calcule une `confidence` (0.15 à 0.92) **uniquement pour le sport "run"** — `undefined` pour vélo/tri (gap documenté dans le code lui-même). Plus important : grep exhaustif sur `planReconciler.ts`, `workoutCatalogBuilder.ts`, `jsonPlanHandler.ts`, `promptHelpers.ts` → **zéro référence à `.confidence`**. La valeur point (`.value`) propage jusqu'à la sélection de séance ; l'incertitude est jetée avant. |
| F8 | 4 — runMLSSPredictor.ts | 🔴 | "Modèle C" calibré sur **N=14 profils labo + 3 edge cases (poids 0.3)** — régression à 2 coefficients sur échantillon très réduit. Les 4 sources citées (Tønnessen 2015, Joyner 1991, INSCYD whitepapers, Hauser 2014) sont des références générales de physiologie ; **rien dans le fichier ne précise si ce sont elles qui fournissent les N=14 profils**, ni leur protocole de recrutement. |
| F9 | 4 — runMLSSPredictor.ts | 🔴 | Une vraie infrastructure de validation indépendante existe (`runMLSSCohortValidation.ts`, cohortes lab/field séparées, verdict `consistent/drifting/incoherent`) — mais ce verdict n'est **qu'un badge UI** (`RunMLSSExternalCohortRMSECard.tsx`, page admin). Il n'alimente **aucun kill-switch** : `USE_RUN_MLSS_PREDICTOR_V2` reste une constante `true` figée, même si le modèle dérive en conditions réelles. |
| F10 | 5 — Robustesse domaines d'intensité | 🔴 | `useDerivedTrainingZones.ts:41` — `vlamaxRun = snap?.vlamax_run ?? snap?.vlamax ?? null` — **fallback silencieux vélo→course** quand `vlamax_run` est absent, pour estimer l'allure seuil course. Ceci contredit **littéralement** la politique documentée dans `vlamaxResolver.ts` ("Pas de fallback silencieux vélo → run") — ce hook contourne le resolver et implémente le fallback interdit en inline. Impact confirmé : `DerivedTrainingZonesCard.tsx` (carte zones affichée au coach). |
| F11 | 5 — Robustesse domaines d'intensité | 🔴 | `deriveTrainingZones.ts::deriveRunPct()` (ligne 314) calcule l'ancre FatMax course avec une formule locale non sourcée `clamp(86 - 22×(vlamax-0.45), 76, 92)` qui **ignore totalement le VO2max** — alors que la branche vélo du MÊME fichier (ligne 359) délègue correctement à la fonction canonique unifiée `computeFatMaxAnchorPctFTP(vla, vo2)` (cf. l'unification "Audit 2D F29" déjà faite ailleurs). La branche course n'a jamais été migrée. |
| F12 | 6 — Non-régression planReconciler.ts | 🔴 | `runReconciler()` (lignes 1641-1679) : `dedupeWithinWeek`/`dedupeFastedWithinWeek` (PR #369/#370, ce jour) tournent, puis **plusieurs passes mutent encore** derrière : `fixEarlyConsolidationSessions`, trio Start-to-Run, `enforceTaperWeeks`, `ensureRaceDaySession`, `alignPostBikeRunClaims`, `enforceAthleteConstraints`. `enforceTaperWeeks` peut **relabelliser `w.phase`** (ex: build→taper) pour une semaine où le dédoublonnage a déjà choisi un remplaçant scoré sur l'ANCIENNE phase — rien ne re-valide après. `ensureRaceDaySession` et `enforceAthleteConstraints` vérifiés directement : **sans risque** (catalogId null/custom, ou déplacement de jour sans changement de fiche). `fixEarlyConsolidationSessions` et le trio Start-to-Run : non vérifiés dans cette passe. |
| F13 | 1 — Adaptation Predictor | 🟢 | `trainabilityCaps.ts`/`decorrelationGuard.ts` : garde-fous de plausibilité bien conçus, anti-circularité explicitement documentée (INSCYD 2025 utilisé comme statistique descriptive, jamais comme calibration), séparation propre avec `literatureReferences.ts`. |
| F14 | 2 — planValidator.ts | 🟢 | Le choix de détection de décharge par CONTENU (plutôt que par position) est justifié explicitement en commentaire (évite une présomption automatique qui masquerait une vraie absence de décharge). |
| F15 | 6 — planReconciler.ts | 🟢 | `enforceAthleteConstraints` et `ensureRaceDaySession` vérifiés directement : aucun des deux ne réassigne de `catalogId`, donc aucun des deux ne peut réintroduire les bugs corrigés par PR #369/#370. |

---

## 3. Tests de reproduction proposés (non appliqués)

### F10 — fallback vélo→course silencieux

```ts
// src/hooks/__tests__/useDerivedTrainingZones.vlamaxFallback.test.ts (proposé)
it("ne doit PAS utiliser vlamax vélo quand vlamax_run est absent (politique vlamaxResolver)", () => {
  const snap = { vlamax: 0.70, vlamax_run: null, vma: 18 }; // vlamax vélo ≠ vlamax course
  // Reproduction : predictRunMLSSPctFromVLaCE reçoit snap.vlamax (0.70) au lieu de null.
  // Attendu : paceEstimated devrait rester `false` / mlss devrait être null
  // tant que vlamax_run n'est pas connu — pas un fallback silencieux.
});
```

### F11 — divergence formule FatMax course vs vélo

```ts
// src/lib/zones/__tests__/deriveTrainingZones.fatmaxParity.test.ts (proposé)
it("l'ancre FatMax course doit tenir compte du VO2max comme la branche vélo", () => {
  const vo2Low = deriveTrainingZones({ sport: "run", vlamax: 0.5, vo2max: 45, paceThresholdSecPerKm: 240, vma: 18 });
  const vo2High = deriveTrainingZones({ sport: "run", vlamax: 0.5, vo2max: 70, paceThresholdSecPerKm: 240, vma: 18 });
  // Actuellement : vo2Low et vo2High produisent EXACTEMENT la même borne Z2
  // (deriveRunPct ignore vo2max) — ce test échoue aujourd'hui, ce qui
  // confirme F11.
  expect(vo2Low.pct?.Z2).not.toEqual(vo2High.pct?.Z2);
});
```

### F4 — fausse exemption deload sur semaine courte non-récup

```ts
// src/engines/plan/__tests__/planValidator.shortWeekNotDeload.test.ts (proposé)
it("une semaine à 3 séances très intenses ne doit pas être exemptée de la densité jours-durs", () => {
  // 3 séances, thème "Build — Spécifique" (aucun mot-clé DELOAD_PATTERNS),
  // les 3 en Z4/Z5 sur 3 jours consécutifs.
  // Comportement actuel : isDeload=true (activeSessions.length<=3) →
  // validateWeeklyHardDayDensity et validatePolarization l'ignorent
  // entièrement, alors que c'est la définition même d'une semaine à risque.
});
```

### F7 — confidence VLamax jamais consommée

```ts
// src/lib/plan/__tests__/vlamaxConfidencePropagation.test.ts (proposé)
it("une VLamax à confiance très basse (0.15) doit influencer la sélection de séance", () => {
  // Reproduction : grep `.confidence` sur planReconciler.ts/workoutCatalogBuilder.ts
  // → 0 résultat. Peu importe la confidence retournée par resolveVlamaxForGoal,
  // aucune fonction de scoring de séance ne la lit.
});
```

### F12 — dédoublonnage défait par enforceTaperWeeks

```ts
// src/lib/plan/__tests__/reconcilerTaperReorderInteraction.test.ts (proposé)
it("une semaine relabellisée taper après dedup ne doit pas garder un remplaçant scoré build", () => {
  // Construire un plan où S(n) est en phase "build" avec un doublon
  // catalogId résolu par dedupeWithinWeek (remplaçant scoré pour "build"),
  // puis où enforceTaperWeeks reclassifie S(n) en "taper" (semaine terminale
  // manquante). Vérifier que le remplaçant est toujours cohérent phase-taper
  // — actuellement rien ne le garantit.
});
```

---

## 4. Propositions de correction minimales (classées, non appliquées)

### P0 — à corriger en priorité (confirmés, actifs, visibles côté coach/athlète)

1. **F10** — Dans `useDerivedTrainingZones.ts:41`, remplacer le fallback inline par un appel à `resolveVlamaxForGoal` (ou au minimum supprimer le `?? snap?.vlamax`) pour respecter la politique déjà écrite dans `vlamaxResolver.ts`. Correction d'une ligne, zéro risque de régression ailleurs (consommateur unique confirmé : `DerivedTrainingZonesCard.tsx`).
2. **F11** — Dans `deriveTrainingZones.ts::deriveRunPct()`, remplacer la formule locale par un appel à `computeFatMaxAnchorPctFTP(vla, vo2)` (nécessite de faire remonter `vo2max` dans `deriveRunPct`, déjà disponible dans `DeriveZonesInput`). Vérifier l'absence de régression sur les tests existants de zones course.

### P1 — réels, mais nécessitent soit une décision de conception soit une fenêtre de déclenchement plus étroite

3. **F7/F9** — Décider explicitement SI et COMMENT la confidence VLamax / le verdict de généralisation MLSS doivent influencer une décision (ex : abaisser le poids d'une fiche scorée sur une VLamax à confidence <0.3, ou faire remonter un warning coach visible quand `generalizationVerdict === "incoherent"`). Ce n'est pas un simple bug à corriger — c'est un choix produit à valider avant d'écrire le code.
4. **F4** — Ajouter une garde additionnelle : `isDeload` ne devrait déclencher l'exemption "≤3 séances" que si AUCUNE des séances restantes n'est une séance-clé (`isKeySession`) à forte intensité — évite d'exempter une semaine courte mais dure.
5. **F6** — Étendre `validateWeeklyHardDayDensity` pour regarder les 2-3 derniers jours de la semaine précédente (déjà signalé par l'équipe, pas encore implémenté).
6. **F12** — Faire tourner `dedupeWithinWeek`/`dedupeFastedWithinWeek` une seconde fois, après `enforceTaperWeeks`, pour les seules semaines dont la phase a changé.
7. **F1/F2/F8** — Documenter (ou sourcer) les leviers non cités de `LEVER_EFFECTS`, et décider si TTE/durabilité/économie doivent recevoir un plafond de plausibilité même approximatif plutôt qu'aucun.

### P2 — cohérence méthodologique, impact faible

8. **F5** — Harmoniser le seuil d'exemption (`<=3` vs `<5`) entre les fonctions de `planValidator.ts`, ou documenter explicitement pourquoi ils diffèrent.
9. **F3** — Documenter explicitement que `computeDurationFactor` est une approximation linéaire assumée, pas une courbe sourcée.

---

## 5. Hors périmètre vérifié dans cette passe

`fixEarlyConsolidationSessions` et le trio Start-to-Run (`capStartToRunSessions`, `enforceStartToRunLadder`, `orderStartToRunWeek`) tournent eux aussi après les filtres de dédoublonnage (F12) mais n'ont pas été audités en détail — à couvrir dans une passe suivante si ce chantier est jugé prioritaire.

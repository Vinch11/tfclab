# AUDIT PLAN IA V5 — Cohérence Limiteurs ↔ Plans Générés

**Date** : 2026-04-04  
**Statut** : ✅ Corrigé + Validé (build clean, 14/14 tests pass)

---

## CHECKLIST FIGÉE (30 points)

### A. Chaîne Limiteurs : Détection → Injection → Prompt

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 1 | `computeDiagnostic()` détecte les limiteurs via `detectUnifiedLimiter` | ✅ | Hub `@/engines/diagnostic` |
| 2 | `buildPlanConfigFromDiagnostic()` extrait limiteurs du diagnostic | ✅ | `planConfigBuilder.ts` |
| 3 | Limiteurs classés par `weightedImpact` (impact × importance) | ✅ | `formatLimitersForPrompt()` |
| 4 | Coach override drag-and-drop respecté (re-sort) | ✅ | `coachLimiterOrder` param |
| 5 | L1 reçoit PRIORITÉ ABSOLUE dans le prompt | ✅ | `### Limiteur #1` + règles |
| 6 | L2 reçoit PRIORITÉ HAUTE | ✅ | `### Limiteur #2` |
| 7 | **Levier L2 extrait et injecté** | ✅ FIX | **Était manquant — seul L1 lever était envoyé** |
| 8 | Matrice Séance Clé × Limiteur × Phase présente | ✅ | `promptHelpers.ts` L677-689 |
| 9 | Règles de périodisation séquentielle strictes | ✅ | 5 règles dans le prompt |
| 10 | Synergies entre limiteurs documentées | ✅ | Tableau synergies |

### B. Prohibitions & Contraintes

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 11 | Sprint Ban activé si VLamax limiting + LD | ✅ | `buildProhibitions()` |
| 12 | Restriction VO2max lourd si VLamax élevée | ✅ | Même fonction |
| 13 | Sprints autorisés pour semi/10K/5K | ✅ | `isShortDistanceObjective()` |
| 14 | Prohibitions marquées PRIORITÉ ABSOLUE | ✅ | Prompt section L737-743 |
| 15 | Validator Rule 7 détecte violations | ✅ | `SPRINT_BAN_VIOLATION_PATTERNS` |

### C. Injection dans le Prompt IA

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 16 | Diagnostic structuré injecté dans chunk 1 | ✅ | `buildStructuredDiagnosticBlock()` |
| 17 | **`_athleteSex` injecté pour temps cible** | ✅ FIX | **N'était pas passé au config** |
| 18 | Phase heuristics adaptées au type de L1 | ✅ | VLamax→Build long, Économie→Fondation longue |
| 19 | Récapitulatif stratégique ré-injecté chunks 2+ | ✅ | `extractStrategicRecap()` |
| 20 | Calendrier absolu avec dates de course | ✅ | Section `📅 CALENDRIER ABSOLU` |
| 21 | Race Week obligation dans chunks contenant courses | ✅ | `🚨 RACE WEEK OBLIGATION` |
| 22 | W'bal reminder dans chaque chunk | ✅ | `wbalReminder` variable |

### D. Validation Post-Génération (10 règles)

| # | Règle | Poids | Statut | Détail |
|---|-------|-------|--------|--------|
| 23 | Rule 1: Polarisation 80/20 | 14% | ✅ | Seiler |
| 24 | Rule 2: Load/Deload 3:1 | 10% | ✅ | Rhea |
| 25 | Rule 3: Séances clés | 10% | ✅ | 1-3/sem |
| 26 | Rule 4: Progression volume | 8% | ✅ | Trend check |
| 27 | Rule 5: Ratio sportif | 8% | ✅ | Objectif-specific |
| 28 | Rule 6: Catalogue TFCL | 6% | ✅ | ≥80% target |
| 29 | Rule 7: Conformité prohibitions | 15% | ✅ | Sprint Ban |
| 30 | Rule 8: Cohérence phases | 10% | ✅ | Séquence + signatures |
| 31 | Rule 9: Jour de course | 8% | ✅ | Multi-objectif |
| 32 | **Rule 10: Cohérence limiteurs↔séances** | **11%** | ✅ NEW | **Vérifie que L1 ≥30% et L2 ≥15% des séances clés** |

---

## CORRECTIONS APPLIQUÉES

### FIX 1 — Rule 10 : Validation Limiteur↔Séance (NOUVEAU)
**Fichier** : `src/engines/plan/planValidator.ts`  
**Bug** : Aucune vérification que les séances clés du plan ciblaient réellement les limiteurs détectés par le diagnostic.  
**Fix** : Nouvelle `validateLimiterCoherence()` avec patterns par limiteur (vo2max→interval/billat, vlamax→Z2/trainLow, tte→seuil/norvégien, etc.). Score dégradé si L1 <30% ou L2 <15% de correspondance.

### FIX 2 — Extraction du levier L2
**Fichier** : `src/engines/plan/planConfigBuilder.ts`  
**Bug** : Seul `primaryLever` (L1) était envoyé dans `activeLevers`. Le levier L2 n'était jamais injecté.  
**Fix** : Extraction du L2 depuis `gapAnalysis[1]` et mapping vers le lever correspondant.

### FIX 3 — `_athleteSex` manquant dans PlanConfig
**Fichiers** : `src/hooks/useAITrainingPlan.ts`, `src/engines/plan/planConfigBuilder.ts`  
**Bug** : `buildStructuredDiagnosticBlock` utilise `config._athleteSex` pour calculer les temps cibles (M vs F), mais ce champ n'était jamais renseigné côté client.  
**Fix** : Ajout de `_athleteSex` à `PlanConfig` et injection depuis `diagnostic._rawInput.sex`.

---

## VALIDATION

- ✅ `tsc --noEmit` : 0 erreurs
- ✅ 14/14 tests unitaires passent
- ✅ Edge function déployée automatiquement

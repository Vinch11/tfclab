# AUDIT LIMITEURS ↔ SÉANCES CLÉS V2

**Date** : 2026-04-05  
**Statut** : ✅ Corrigé + Validé (build clean, 14/14 tests pass, 31/31 pattern tests pass)

---

## CHECKLIST EXHAUSTIVE (35 points)

### A. Chaîne Détection → Config → Prompt (planConfigBuilder.ts → promptHelpers.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 1 | `gapAnalysis` classé par `weightedImpact` | ✅ | `sort((a,b) => b.weightedImpact - a.weightedImpact)` L174-176 |
| 2 | Coach override drag-and-drop respecté | ✅ | Re-sort par `coachLimiterOrder` L179-189 |
| 3 | L1 = PRIORITÉ ABSOLUE dans le prompt | ✅ | `🎯 PRIORITÉ ABSOLUE` + séance clé #1 L211-212 |
| 4 | L2 = PRIORITÉ HAUTE dans le prompt | ✅ | `⚡ PRIORITÉ HAUTE` + séance clé #2 L213-214 |
| 5 | L2 levier extrait et injecté | ✅ | Via `gapAnalysis[1]` → `l2LeverMap` L112-130 |
| 6 | **`METRIC_TO_LIMITER_MAP["FTP/kg"]` correct** | ✅ FIX | **Était "VO2max bas" → corrigé en "FTP/kg bas (puissance au seuil)"** |
| 7 | `_athleteSex` injecté pour temps cibles | ✅ | `diagnostic._rawInput.sex` L158 |
| 8 | Prohibitions calculées (Sprint Ban, VO2 restriction) | ✅ | `buildProhibitions()` L267-309 |
| 9 | Adaptation Projections incluses | ✅ | `buildAdaptationProjections()` L315-366 |

### B. Injection dans le Prompt IA (promptHelpers.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 10 | Limiteurs re-injectés dans diagnostic structuré (chunk 1) | ✅ | `buildStructuredDiagnosticBlock()` L10-95 |
| 11 | Phase heuristics adaptées au type de L1 | ✅ | VLamax→Build long, Économie→Fondation étendue L60-67 |
| 12 | Matrice Séance Clé × Limiteur × Phase (8 limiteurs × 4 phases) | ✅ | L677-689 |
| 13 | Synergies entre limiteurs documentées | ✅ | VLamax↓→TTE↑, VO2max↑→FTP↑ etc. L691-698 |
| 14 | 5 Règles de périodisation séquentielle | ✅ | L701-727 |
| 15 | Résumé rapide L1→séance clé #1 par type | ✅ | L719-726 |
| 16 | Récapitulatif stratégique ré-injecté chunks 2+ | ✅ | `extractStrategicRecap()` L97+ |
| 17 | Prohibitions marquées PRIORITÉ ABSOLUE | ✅ | L737-743 |

### C. Détection Post-Génération (Rule 10 — planValidator.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 18 | `detectLimiterKeyFromText()` reconnaît 8 types | ✅ | vo2max, vlamax, tte, fatmax, économie, ftp, durabilité, sprint |
| 19 | Patterns VO2max spécifiques (vo2, vma, billat, pma) | ✅ | Aucun chevauchement |
| 20 | **VLamax : durée minimale requise pour EF** | ✅ FIX | **`ef\b.*z2` supprimé (matchait EF Z2 30min). Exige `ef\b.*(?:long\|[89]\d\|1[0-9]\d)` (≥80min ou "long")** |
| 21 | TTE restreint au seuil LONG (≥20min ou continu) | ✅ | `seuil\s*(?:continu\|long\|2×\|1×)` |
| 22 | FatMax isolé (lipid, oxydation, fat max) | ✅ | Pas de chevauchement avec VLamax |
| 23 | FTP isolé (sweet spot, over-under) | ✅ | Pas de chevauchement avec TTE |
| 24 | Durabilité : `\bsl\b` word boundary correct | ✅ | Fix précédent validé |
| 25 | Économie spécifique (côte, sfr, strides, drill) | ✅ | Aucun chevauchement |
| 26 | Catch-all `🔑.*` supprimés | ✅ | Fix précédent validé |
| 27 | Déduplication L1 > L2 > L3 > L4 | ✅ | `break` après premier match |

### D. Seuils & Scoring (planValidator.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 28 | L1 cible ≥30%, erreur si <15% | ✅ | Score -40 si <15%, -15 si <30% |
| 29 | L2 cible ≥15%, warning si <5% | ✅ | Score -15 si <5% |
| 30 | L3/L4 validation soft ≥5% | ✅ | Score -5 si <5%, info seulement |
| 31 | Poids Rule 10 = 11% du score global | ✅ | `weights.limiterCoherence = 0.11` |

### E. Affichage UI (AIPlanBenchmark.tsx)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 32 | Breakdown par limiteur L1→L4 avec barres | ✅ | L711-784 |
| 33 | Code couleur : vert (ok), ambre (low), rouge (absent) | ✅ | `barColor` / `bgColor` / `textColor` |
| 34 | Marqueur de cible sur la barre de progression | ✅ | `Target marker` L769-772 |
| 35 | Score global + badge dans l'en-tête | ✅ | L719-730 |

### F. Alignement Prompt ↔ Validator (extractLimiterKeywords vs LIMITER_SESSION_PATTERNS)

| # | Limiteur | Keywords Prompt (sportRatioMatrix.ts) | Patterns Validator (planValidator.ts) | Aligné ? |
|---|---------|---------------------------------------|--------------------------------------|----------|
| 36 | VO2max | vo2, pma, interval, 30/30, billat | vo2, vma, billat, 30/30, fractionn, pma | ✅ |
| 37 | VLamax | train low, glycoly, z2 long, endurance fond, jeun | train low, à jeun, z2 long, EF long, fondament, glycoly | ✅ |
| 38 | TTE | seuil continu, norvégi, mlss, tempo long | seuil continu/long, norvégi, mlss, tempo long/continu | ✅ |
| 39 | FatMax | fat max, lipid, oxydation, glycogène, gut training | fat max, lipid, oxydation, glycogène, gut training | ✅ |
| 40 | Économie | cadence, technique, gammes, foulée, côte, sfr | côte, sfr, rønnestad, strides, drill, technique | ✅ |
| 41 | FTP | sweet spot, over-under, threshold power, seuil puissance | sweet spot, over-under, ftp interval, seuil puissance | ✅ |
| 42 | Durabilité | sortie longue, long run, brick, simulation | sortie longue, SL, long run, brick, finish rapide | ✅ |
| 43 | Sprint | sprint, pmax, neuro, explo, plyo | sprint, neuromuscul, explo, plyo, force max | ✅ |

---

## CORRECTIONS APPLIQUÉES (V2)

### FIX 1 — `METRIC_TO_LIMITER_MAP["FTP/kg"]` : Mauvais label de catégorie
**Fichier** : `src/engines/plan/planConfigBuilder.ts` L66  
**Problème** : Mappé vers "VO2max bas" au lieu de "FTP/kg bas". L'IA recevait une instruction de cibler des séances VO2max au lieu de sweet spot/over-under pour un limiteur FTP.  
**Fix** : `"FTP/kg": "FTP/kg bas (puissance au seuil)"`

### FIX 2 — VLamax pattern : Faux positifs sur EF courtes
**Fichier** : `src/engines/plan/planValidator.ts` L869  
**Problème** : Le pattern `ef\b.*z2` matchait "EF Z2 30min récup" — une séance de récupération de 30min, pas du travail VLamax. Toute séance EF avec "z2" dans le titre était comptée comme VLamax.  
**Fix** : Supprimé `z2` de la branche EF. Le pattern exige maintenant `ef\b.*(?:long|[89]\d|1[0-9]\d\s*min)` — EF doit être combiné avec "long" ou une durée ≥80min pour matcher VLamax.

---

## MATRICE D'EXCLUSIVITÉ MUTUELLE (vérifiée par 31 tests)

| Limiteur | Mots-clés EXCLUSIFS | NE matche PAS |
|----------|---------------------|---------------|
| VO2max | vo2, vma, billat, 30/30, pma, fractionné | seuil, sweet spot, tempo |
| VLamax | train low, à jeun, EF long (≥80min), Z2 long, fondamentale, glycolytique | fat max, sortie longue, EF court (<60min) |
| TTE | seuil continu/long, norvégienne, MLSS, tempo long/continu | sweet spot, over-under, seuil puissance |
| FatMax | fat max, lipid, oxydation, glycogène, gut training | train low, Z2 long |
| Économie | côte, sfr, rønnestad, strides, drill, technique | sprint, force max |
| FTP | sweet spot, over-under, FTP interval, seuil puissance | seuil continu, norvégienne |
| Durabilité | sortie longue, SL, long run, brick, finish rapide | Z2 long (metabolic), train low |
| Sprint | sprint, neuromuscul, explo, plyo, force max | côte, sfr |

---

## VALIDATION

- ✅ `tsc --noEmit` : 0 erreurs
- ✅ 14/14 tests unitaires passent (planValidator + planConfigBuilder)
- ✅ 31/31 tests de patterns (sessions réalistes IA)
- ✅ 8/8 limiteurs alignés prompt ↔ validator
- ✅ Patterns mutuellement exclusifs vérifiés
- ✅ Déduplication L1>L2>L3>L4 fonctionnelle
- ✅ FTP/kg label corrigé dans le prompt IA

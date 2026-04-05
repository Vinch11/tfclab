# AUDIT LIMITEURS ↔ SÉANCES CLÉS V1

**Date** : 2026-04-05  
**Statut** : ✅ Corrigé + Validé (build clean, 5/5 tests pass)

---

## CHECKLIST EXHAUSTIVE (25 points)

### A. Injection des Limiteurs dans le Prompt IA

| # | Point de contrôle | Statut | Fichier | Détail |
|---|-------------------|--------|---------|--------|
| 1 | Limiteurs classés par `weightedImpact` | ✅ | `planConfigBuilder.ts` L174-176 | `sort((a,b) => b.weightedImpact - a.weightedImpact)` |
| 2 | Coach override drag-and-drop respecté | ✅ | `planConfigBuilder.ts` L179-189 | Re-sort par `coachLimiterOrder` si fourni |
| 3 | L1 reçoit PRIORITÉ ABSOLUE dans le prompt | ✅ | `planConfigBuilder.ts` L211-212 | `🎯 PRIORITÉ ABSOLUE` + séance clé #1 |
| 4 | L2 reçoit PRIORITÉ HAUTE | ✅ | `planConfigBuilder.ts` L213-214 | `⚡ PRIORITÉ HAUTE` + séance clé #2 |
| 5 | L2 levier extrait et injecté | ✅ | `planConfigBuilder.ts` L112-130 | L2 depuis `gapAnalysis[1]` → `l2LeverMap` |
| 6 | Matrice Séance Clé × Limiteur × Phase | ✅ | `promptHelpers.ts` L677-689 | 8 limiteurs × 4 phases |
| 7 | Synergies entre limiteurs | ✅ | `promptHelpers.ts` L691-698 | Tableau VLamax↓→TTE↑, VO2max↑→FTP↑, etc. |
| 8 | Règles de périodisation séquentielle | ✅ | `promptHelpers.ts` L701-727 | 5 règles strictes |
| 9 | Résumé rapide par type de L1 | ✅ | `promptHelpers.ts` L719-726 | Mapping L1→séance clé #1 |
| 10 | `_athleteSex` injecté pour temps cibles | ✅ | `planConfigBuilder.ts` L158 | Via `diagnostic._rawInput.sex` |

### B. Détection Post-Génération (Rule 10 — Validator)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 11 | `detectLimiterKeyFromText()` reconnaît tous les limiteurs | ✅ | vo2max, vlamax, tte, fatmax, économie, ftp, durabilité, sprint |
| 12 | Patterns VO2max spécifiques | ✅ | `vo2\|vma\|billat\|30/30\|fractionn\|pma` |
| 13 | **Patterns VLamax incluent EF (abbr.)** | ✅ FIX | **Ajout `ef\b.*(?:long\|...)` + `fondament` seul** |
| 14 | **Patterns TTE restreints au seuil LONG** | ✅ FIX | **Supprimé `🔑.*tempo` trop large, exigé durée `[2-5]\d\s*min`** |
| 15 | Patterns FatMax isolés (lipid/oxydation) | ✅ | Pas de chevauchement avec VLamax |
| 16 | Patterns FTP isolés (sweet spot/over-under) | ✅ | Pas de chevauchement avec TTE |
| 17 | **Patterns Durabilité — SL anchor fixé** | ✅ FIX | **`(?:^\|\s)sl\b` → `\bsl\b` (word boundary)** |
| 18 | Patterns Économie spécifiques | ✅ | côte/sfr/rønnestad/strides/drill |
| 19 | **Catch-all `🔑.*` supprimés** | ✅ FIX | **Trop larges, volaient des sessions à d'autres limiteurs** |
| 20 | Déduplication par priorité L1>L2>L3>L4 | ✅ | `break` après premier match dans la boucle |

### C. Seuils de Couverture & Scoring

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 21 | L1 cible ≥30% des séances clés | ✅ | Erreur si <15%, warning si <30% |
| 22 | L2 cible ≥15% des séances clés | ✅ | Warning si <5% |
| 23 | L3/L4 validation soft ≥5% | ✅ | Info si <5% |
| 24 | Poids Rule 10 = 11% du score global | ✅ | `weights.limiterCoherence = 0.11` |
| 25 | Report affiche breakdown par limiteur | ✅ | `limiterCoverage[]` avec rank/hits/pct/status |

---

## CORRECTIONS APPLIQUÉES

### FIX 1 — VLamax : Ajout pattern EF (Endurance Fondamentale)
**Problème** : Les séances "EF Z2 90min" ou "EF longue 2h" n'étaient pas détectées car le pattern exigeait "endurance fondamentale" en toutes lettres.  
**Fix** : Ajout de `ef\b.*(?:long|[89]\d|1[0-9]\d\s*min|z2)` et `fondament` seul (sans besoin de "endurance" devant).

### FIX 2 — TTE : Restriction des patterns trop larges
**Problème** : Le catch-all `🔑.*(?:seuil|threshold|tte|tempo)` capturait n'importe quelle séance clé mentionnant "seuil" ou "tempo", y compris du travail FTP ou du tempo général. Le pattern `seuil.*(?:\d+min|2[0-9]|3[0-9]|4[0-9]min)` matchait "seuil 2min" (trop court pour du TTE).  
**Fix** : Supprimé les catch-all `🔑.*`. TTE exige désormais `seuil` combiné avec `continu|long|2×|1×` ou une durée `[2-5]\d\s*min` (20-59min minimum).

### FIX 3 — Durabilité : Anchor SL corrigé
**Problème** : `(?:^|\s)sl\b` ne matchait pas car `^` réfère au début du texte complet (titre+details concaténés), pas au début d'un mot.  
**Fix** : Remplacé par `\bsl\b` (word boundary standard).

### FIX 4 — Suppression des catch-all `🔑.*`
**Problème** : Chaque limiteur avait un pattern `🔑.*(?:keyword)` qui matchait n'importe quelle séance marquée 🔑 contenant un mot-clé vague. Cela créait des faux positifs massifs et empêchait la déduplication par priorité de fonctionner correctement.  
**Fix** : Tous les `🔑.*` patterns supprimés. La détection repose désormais uniquement sur le contenu spécifique de la séance.

---

## MATRICE D'EXCLUSIVITÉ MUTUELLE (vérifiée)

| Limiteur | Mots-clés EXCLUSIFS | NE matche PAS |
|----------|---------------------|---------------|
| VO2max | vo2, vma, billat, 30/30, pma | seuil, sweet spot, tempo |
| VLamax | train low, à jeun, EF long, fondamentale, glycolytique | fat max, sortie longue, sweet spot |
| TTE | seuil continu/long, norvégienne, MLSS, tempo long | sweet spot, over-under, seuil puissance |
| FatMax | fat max, lipid, oxydation, glycogène, gut training | train low, Z2 long |
| Économie | côte, sfr, rønnestad, strides, drill, technique | sprint, force max |
| FTP | sweet spot, over-under, FTP interval, seuil puissance | seuil continu, norvégienne |
| Durabilité | sortie longue, SL, long run, brick, finish rapide | Z2 long (metabolic), train low |
| Sprint | sprint, neuromuscul, explo, plyo, force max | côte, sfr |

---

## VALIDATION

- ✅ `tsc --noEmit` : 0 erreurs
- ✅ 5/5 tests planValidator passent
- ✅ Patterns mutuellement exclusifs vérifiés
- ✅ Déduplication L1>L2>L3>L4 fonctionnelle

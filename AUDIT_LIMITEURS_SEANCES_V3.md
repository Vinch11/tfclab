# AUDIT LIMITEURS ↔ SÉANCES CLÉS V3

**Date** : 2026-04-05  
**Statut** : ✅ Corrigé + Validé (build clean, 14/14 tests pass)

---

## CHECKLIST EXHAUSTIVE (45 points)

### A. Chaîne Détection → Config → Prompt (planConfigBuilder.ts → promptHelpers.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 1 | `gapAnalysis` classé par `weightedImpact` | ✅ | `sort((a,b) => b.weightedImpact - a.weightedImpact)` L174-176 |
| 2 | Coach override drag-and-drop respecté | ✅ | Re-sort par `coachLimiterOrder` L179-189 |
| 3 | L1 = PRIORITÉ ABSOLUE dans le prompt | ✅ | `🎯 PRIORITÉ ABSOLUE` L211-212 |
| 4 | L2 = PRIORITÉ HAUTE dans le prompt | ✅ | `⚡ PRIORITÉ HAUTE` L213-214 |
| 5 | L2 levier extrait et injecté | ✅ | Via `gapAnalysis[1]` → `l2LeverMap` L112-130 |
| 6 | `METRIC_TO_LIMITER_MAP["FTP/kg"]` correct | ✅ | "FTP/kg bas (puissance au seuil)" L67 |
| 7 | `_athleteSex` injecté pour temps cibles | ✅ | `diagnostic._rawInput.sex` L158 |
| 8 | Prohibitions calculées (Sprint Ban, VO2 restriction) | ✅ | `buildProhibitions()` L267-309 |
| 9 | Adaptation Projections incluses | ✅ | `buildAdaptationProjections()` L315-366 |

### B. Injection dans le Prompt IA (promptHelpers.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 10 | Limiteurs re-injectés dans diagnostic structuré (chunk 1) | ✅ | `buildStructuredDiagnosticBlock()` L10-95 |
| 11 | **Phase heuristics : `isVlamaxLimiter` ne teste plus "sprint"** | ✅ FIX | **Était `/vlamax\|glycoly\|sprint\|anaerob/` → "sprint" limiter déclenchait la logique VLamax** |
| 12 | Matrice Séance Clé × Limiteur × Phase (8 limiteurs × 4 phases) | ✅ | L677-689 |
| 13 | **VLamax row : sweet spot supprimé** | ✅ FIX | **Était "sweet spot 2×20min @88% FTP" (= séance FTP, pas VLamax). Remplacé par EF fondamentale 90min+** |
| 14 | Synergies entre limiteurs documentées | ✅ | VLamax↓→TTE↑, VO2max↑→FTP↑ etc. L691-698 |
| 15 | 5 Règles de périodisation séquentielle | ✅ | L701-727 |
| 16 | Résumé rapide L1→séance clé #1 par type | ✅ | L719-726 |
| 17 | Récapitulatif stratégique ré-injecté chunks 2+ | ✅ | `extractStrategicRecap()` L97+ |
| 18 | Prohibitions marquées PRIORITÉ ABSOLUE | ✅ | L737-743 |

### C. Porte d'entrée Rule 10 : KEY_SESSION_PATTERNS (planValidator.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 19 | **KEY_SESSION_PATTERNS inclut sweet spot** | ✅ FIX | **CRITIQUE : Manquait → séances FTP jamais comptées** |
| 20 | **KEY_SESSION_PATTERNS inclut over-under** | ✅ FIX | **CRITIQUE : Manquait → séances FTP jamais comptées** |
| 21 | **KEY_SESSION_PATTERNS inclut train low** | ✅ FIX | **CRITIQUE : Manquait → séances VLamax jamais comptées** |
| 22 | **KEY_SESSION_PATTERNS inclut fat max/lipid** | ✅ FIX | **CRITIQUE : Manquait → séances FatMax jamais comptées** |
| 23 | **KEY_SESSION_PATTERNS inclut tempo** | ✅ FIX | **Manquait → tempo long TTE pas compté** |
| 24 | **KEY_SESSION_PATTERNS inclut norvégienne** | ✅ FIX | **Manquait → séances TTE pas comptées** |
| 25 | **KEY_SESSION_PATTERNS inclut pma** | ✅ FIX | **Manquait → séances VO2max pas comptées** |
| 26 | **KEY_SESSION_PATTERNS inclut sprint** | ✅ FIX | **Manquait → séances Sprint pas comptées** |
| 27 | **KEY_SESSION_PATTERNS inclut côte/sfr/rønnestad** | ✅ FIX | **Manquait → séances Économie pas comptées** |
| 28 | **KEY_SESSION_PATTERNS inclut plio/strides/drill** | ✅ FIX | **Manquait → séances Économie pas comptées** |
| 29 | **KEY_SESSION_PATTERNS inclut force max** | ✅ FIX | **Manquait → séances Sprint pas comptées** |
| 30 | **KEY_SESSION_PATTERNS inclut à jeun** | ✅ FIX | **Manquait → séances VLamax pas comptées** |
| 31 | **KEY_SESSION_PATTERNS inclut mlss/ftp** | ✅ FIX | **Manquait → séances TTE/FTP pas comptées** |
| 32 | **KEY_SESSION_PATTERNS inclut durabilit/simulation** | ✅ FIX | **Manquait → séances Durabilité pas comptées** |
| 33 | KEY_SESSION_PATTERNS : anciens patterns préservés | ✅ | 🔑, clé, key, interval, seuil, vo2, vma, sortie longue, sl, long run, brick, race.sim, test, compétition, 🏁 |

### D. Détection Post-Génération — LIMITER_SESSION_PATTERNS (planValidator.ts)

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 34 | `detectLimiterKeyFromText()` reconnaît 8 types | ✅ | vo2max, vlamax, tte, fatmax, économie, ftp, durabilité, sprint |
| 35 | Patterns VO2max spécifiques | ✅ | vo2, vma, billat, 30/30, fractionn, pma |
| 36 | VLamax : durée minimale requise pour EF | ✅ | `ef\b.*(?:long\|[89]\d\|1[0-9]\d)` (≥80min ou "long") |
| 37 | TTE restreint au seuil LONG | ✅ | `seuil\s*(?:continu\|long\|2×\|1×)` |
| 38 | FatMax isolé | ✅ | lipid, oxydation, fat max — pas de chevauchement VLamax |
| 39 | FTP isolé | ✅ | sweet spot, over-under — pas de chevauchement TTE |
| 40 | Durabilité : `\bsl\b` word boundary correct | ✅ | Pas de faux positif |
| 41 | Économie spécifique | ✅ | côte, sfr, strides, drill, technique |
| 42 | Déduplication L1 > L2 > L3 > L4 | ✅ | `break` après premier match |

### E. Seuils & Scoring

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 43 | L1 cible ≥30%, erreur si <15% | ✅ | Score -40 si <15%, -15 si <30% |
| 44 | L2 cible ≥15%, warning si <5% | ✅ | Score -15 si <5% |
| 45 | L3/L4 validation soft ≥5% | ✅ | Score -5 si <5%, info seulement |

---

## CORRECTIONS APPLIQUÉES (V3)

### FIX 1 — KEY_SESSION_PATTERNS : Porte d'entrée trop restrictive (CRITIQUE)
**Fichier** : `src/engines/plan/planValidator.ts` L98  
**Problème** : `KEY_SESSION_PATTERNS` servait de filtre pour déterminer quelles séances sont "clés" avant de les comparer aux `LIMITER_SESSION_PATTERNS`. Ce regex ne contenait que des patterns généralistes (interval, seuil, vo2, vma, sortie longue). **Résultat : les séances spécifiques aux limiteurs (sweet spot, train low, fat max, côte, sfr, sprint, etc.) n'étaient JAMAIS comptées par Rule 10**, car elles étaient filtrées AVANT d'arriver au matching limiter.  
**Impact** : Explique directement les scores faibles observés dans le rapport qualité pour L1/L2.  
**Fix** : Ajout de 15+ patterns limiter-spécifiques : `sweet spot`, `over-under`, `train low`, `fat max/lipid`, `tempo`, `norvégienne`, `pma`, `sprint`, `côte`, `sfr`, `rønnestad`, `plio`, `strides`, `drill`, `force max`, `à jeun`, `mlss`, `ftp`, `durabilité`, `simulation`.

### FIX 2 — Matrice prompt VLamax : sweet spot est une séance FTP
**Fichier** : `supabase/functions/ai-training-plan/promptHelpers.ts` L683  
**Problème** : La ligne VLamax de la matrice séance×limiteur×phase incluait "sweet spot 2×20min @88% FTP" en Phase Base. Le sweet spot développe le FTP (travail au seuil), pas la réduction de VLamax. L'IA recevait l'instruction de prescrire du sweet spot pour réduire la VLamax → séance mal ciblée + comptée pour le mauvais limiteur.  
**Fix** : Remplacé par "EF fondamentale 90min+" et "EF aérobie pur 2h+" (vrais stimuli de réduction VLamax par suppression glycolytique).

### FIX 3 — `isVlamaxLimiter` : faux positif sur "sprint"
**Fichier** : `supabase/functions/ai-training-plan/promptHelpers.ts` L60  
**Problème** : Le test `/vlamax|glycoly|sprint|anaerob/` incluait "sprint" comme indicateur de VLamax. Un athlète avec limiteur "Sprint/Pmax faible" déclenchait la logique VLamax (phases plus courtes en fondation, chantier métabolique étendu) au lieu de la logique sprint.  
**Fix** : Retiré "sprint" du pattern → `/vlamax|glycoly|anaerob/`.

---

## ANALYSE DE L'IMPACT

### Avant V3 (estimation) :
- Une séance "Train Low Z2 long 2h30" → NON comptée comme clé (pas de match KEY_SESSION_PATTERNS) → L1 VLamax = 0%
- Une séance "Sweet Spot 2×20min @88% FTP" → NON comptée → L2 FTP = 0%
- Seules les séances avec "interval", "seuil", "vo2", "vma" ou "sortie longue" passaient le filtre

### Après V3 :
- "Train Low Z2 long 2h30" → MATCH `train\s*low` dans KEY_SESSION_PATTERNS → comptée → matchée par VLamax pattern
- "Sweet Spot 2×20min @88% FTP" → MATCH `sweet\s*spot` dans KEY_SESSION_PATTERNS → comptée → matchée par FTP pattern
- Tous les 8 types de limiteurs ont maintenant des séances qui passent la porte d'entrée

---

## VALIDATION

- ✅ `tsc --noEmit` : 0 erreurs
- ✅ 14/14 tests unitaires passent (planValidator + planConfigBuilder)
- ✅ KEY_SESSION_PATTERNS couvre les 8 types de limiteurs
- ✅ LIMITER_SESSION_PATTERNS mutuellement exclusifs (inchangé V2)
- ✅ Déduplication L1>L2>L3>L4 fonctionnelle (inchangé V2)
- ✅ Matrice prompt VLamax physiologiquement correcte
- ✅ Phase heuristics sprint ≠ VLamax

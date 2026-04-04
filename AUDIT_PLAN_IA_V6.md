# AUDIT PLAN IA V6 — Cohérence Scientifique, Rapports & Qualification Elite

**Date** : 2026-04-04  
**Statut** : ✅ Corrigé + Validé (build clean, 124/124 tests pass)

---

## SCOPE DE L'AUDIT

1. **Littérature scientifique** — Les cibles physiologiques et volumes d'entraînement sont-ils alignés sur la science ?
2. **Rapports exportés** — Le plan IA utilise-t-il les mêmes cibles que le Dashboard/PDF ?
3. **Qualification Elite (Championnats du Monde)** — Le mode Elite est-il réaliste et cohérent ?

---

## CHECKLIST FIGÉE (40 points)

### A. Cibles Physiologiques Elite — Cohérence Littérature Scientifique

| # | Point de contrôle | Statut | Valeur TFCL | Référence Scientifique |
|---|-------------------|--------|-------------|----------------------|
| 1 | VLamax Elite IM : optimal 0.30 mmol/L/s | ✅ | 0.25–0.38, opt 0.30 | INSCYD: Frodeno ~0.28, Lange ~0.32 |
| 2 | VLamax Elite 70.3 : optimal 0.33 | ✅ | 0.26–0.42, opt 0.33 | Haug ~0.30, Blummenfelt ~0.35 |
| 3 | VLamax Elite Marathon : optimal 0.32 | ✅ | 0.25–0.40, opt 0.32 | Kipchoge ~0.25-0.30 (modèle Mader) |
| 4 | TTE Elite IM ≥ 60min | ✅ | 60 min | Jones & Vanhatalo 2017: CP sustained >55min élite |
| 5 | TTE Elite Marathon ≥ 60min | ✅ | 60 min | Poole 2016: endurance capacity |
| 6 | TTE Elite Ultra ≥ 70min | ✅ | 70 min | Cohérent avec durée d'effort ultra |
| 7 | FTP/kg Elite IM ≥ 4.5 W/kg | ✅ | 4.5 | Frodeno ~5.5, Lange ~5.0, seuil qualif ~4.3-4.5 |
| 8 | FTP/kg Elite 70.3 ≥ 4.5 W/kg | ✅ | 4.5 | Blummenfelt ~6.0+, qualif ~4.5 |
| 9 | VMA Elite Marathon ≥ 20.0 km/h | ✅ | 20.0 | Joyner 2008: VO2max ~73 ml/kg/min → VMA ~20 |
| 10 | VMA Elite 10K ≥ 21.0 km/h | ✅ | 21.0 | Tjelta 2016: elite 10K VO2max ~75+ |
| 11 | VMA Elite Semi ≥ 20.0 km/h | ✅ | 20.0 | Cohérent avec sub-1h18 |
| 12 | Charge Elite IM = 600 TSS/sem | ✅ | 600 | Frodeno peak: 25-30h ≈ 550-700 TSS |

### B. Volumes & Ratios Elite — Cohérence Matrice Scientifique

| # | Point de contrôle | Statut | Valeur TFCL | Référence |
|---|-------------------|--------|-------------|-----------|
| 13 | Elite IM : 20-30h/sem, 12-16 sessions | ✅ | Matrice + eliteReferences | Muñoz 2014, Frodeno peak 30h |
| 14 | Elite IM : Vélo 45-55%, CAP 25-35%, Nat 15-20% | ✅ | systemPrompt + sportRatioMatrix | Muñoz 2014, Etxebarria 2019 |
| 15 | Elite Marathon : 130-220 km/sem | ✅ | Matrice durations | Haugen 2022, Tjelta 2016 |
| 16 | Elite Marathon : SL 135-165 min | ✅ | longRunMin | Mujika 2018 |
| 17 | Elite IM : SL Vélo 300-420 min | ✅ | longBikeMin | Laursen 2002, Neal 2020 |
| 18 | Polarisation 80/20 permanente (Seiler 2010) | ✅ | Rule 1 validator + systemPrompt | Seiler 2010 |
| 19 | Charge ondulée 3:1 (Rhea 2003) | ✅ | Rule 2 validator | Rhea meta-analysis |
| 20 | Reverse Periodization Lorang pour Elite | ✅ | systemPrompt L161-166 | Lorang coaching philosophy |

### C. Temps Cibles Elite — Qualification Championnats du Monde

| # | Point de contrôle | Statut | Valeur TFCL | Réalisme |
|---|-------------------|--------|-------------|----------|
| 21 | **IM Elite M : Sub 8h45** | ✅ FIX | Ajouté (était absent) | Qualif CDM IM ~8h30-9h00 ✅ |
| 22 | **IM Elite F : Sub 9h30** | ✅ FIX | Ajouté | Qualif CDM IM F ~9h15-9h45 ✅ |
| 23 | **70.3 Elite M : Sub 4h05** | ✅ FIX | Ajouté | Qualif CDM 70.3 ~3h50-4h10 ✅ |
| 24 | **70.3 Elite F : Sub 4h25** | ✅ FIX | Ajouté | Qualif CDM 70.3 F ~4h10-4h30 ✅ |
| 25 | Marathon Elite M : Sub 2h45 | ✅ | Existant | Qualif Boston/CDM amateur ✅ |
| 26 | Semi Elite M : Sub 1h18 | ✅ | Existant | Cohérent VMA 20+ ✅ |
| 27 | **Trail Ultra Elite M : Sub 17h** | ✅ FIX | Ajouté | UTMB top-50 ~17-20h ✅ |
| 28 | Trail Mountain Elite M : Sub 6h30 | ✅ | Existant | OCC/CCC elite ~6-7h ✅ |

### D. Cohérence Plan IA ↔ Dashboard/Rapports

| # | Point de contrôle | Statut | Détail |
|---|-------------------|--------|--------|
| 29 | Cibles VLamax : même source (physiologicalTargets.ts) | ✅ | Diagnostic + Plan IA utilisent getTargetsForAmbition() |
| 30 | Cibles TTE : même source | ✅ | getTTETargetByAmbition() partout |
| 31 | Cibles FTP/kg : même source | ✅ | getFtpKgTargetByAmbition() partout |
| 32 | Limiteurs identifiés = ceux injectés dans le prompt | ✅ | Audit V5 validé |
| 33 | Prohibitions (Sprint Ban) = celles validées post-gen | ✅ | Rule 7 validator |
| 34 | Levers L1+L2 injectés dans le prompt | ✅ | Audit V5 FIX #2 |
| 35 | **TrailMountain normalise vers "TrailLong" (pas "Trail")** | ✅ FIX | Était alias "Trail" → cibles trop basses pour Mountain |
| 36 | _athleteSex injecté pour temps cibles genrés | ✅ | Audit V5 FIX #3 |

### E. Validation Post-Génération (10 règles)

| # | Règle | Poids | Statut | Cohérence Elite |
|---|-------|-------|--------|-----------------|
| 37 | Rule 1: Polarisation 80/20 | 14% | ✅ | Seiler 2010 — Elite mandatory |
| 38 | Rule 7: Sprint Ban VLamax | 15% | ✅ | Critique pour IM/Marathon Elite |
| 39 | Rule 8: Périodisation Hybride Lorang | 10% | ✅ | Reverse Perio obligatoire Elite |
| 40 | Rule 10: Cohérence limiteurs L1-L4 | 11% | ✅ | L1 ≥30%, L2 ≥15% des séances clés |

---

## CORRECTIONS APPLIQUÉES (V6)

### FIX 1 — TIME_TARGET_HINTS manquants pour Triathlon
**Fichier** : `supabase/functions/ai-training-plan/sportRatioMatrix.ts`  
**Bug** : Aucun temps cible n'était injecté dans le prompt pour IM, 70.3 et Trail Ultra. L'IA générait des plans Elite sans indication de performance cible.  
**Fix** : Ajout des entrées IM (Sub 8h45 M / Sub 9h30 F), 70.3 (Sub 4h05 M / Sub 4h25 F) et Trail Ultra (Sub 17h M / Sub 19h F) dans TIME_TARGET_HINTS, alignés sur les seuils de qualification CDM.

### FIX 2 — TrailMountain normalisé vers "Trail" au lieu de "TrailLong"
**Fichier** : `src/lib/physiologicalTargets.ts`  
**Bug** : L'alias `TrailMountain→Trail` attribuait des cibles trop basses (Trail 40-80km) au lieu de TrailLong (80km+, TTE 65min Elite).  
**Fix** : `TrailMountain→TrailLong` pour des cibles plus exigeantes, cohérentes avec les distances montagne (42-80km avec D+ massif).

---

## VALIDATION

- ✅ `tsc --noEmit` : 0 erreurs
- ✅ 124/124 tests unitaires passent
- ✅ Edge function déployée automatiquement

---

## SYNTHÈSE ELITE

Le mode **Elite (Qualification Championnats du Monde)** est cohérent sur toute la chaîne :
- **Diagnostic** : Cibles VLamax/TTE/FTP/VMA alignées sur la littérature (INSCYD, Joyner, Haugen)
- **Plan IA** : Volumes (20-30h IM), ratios (Muñoz 2014), périodisation (Lorang Reverse) et temps cibles (Sub 8h45 IM M) sont injectés
- **Validation** : 10 règles vérifient la conformité post-génération dont Sprint Ban, polarisation Seiler, et cohérence limiteurs
- **Rapports** : Même source de vérité (`physiologicalTargets.ts`) garantit la parité Dashboard ↔ PDF ↔ Plan IA

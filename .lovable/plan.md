# Plan : A' Checklist Semaine Test + B Fit Inverse Mader Conjoint

Objectif : amener TFCL de ~5% à ~3% d'erreur MLSS en (1) rendant visible la complétude de la Semaine Test TFCL côté Coach + détection auto FIT, et (2) en activant un **fit inverse Mader conjoint** sur les 4 efforts (P30s, P60s, MAP5, FTP/TTE) quand la semaine est complète.

---

## Partie A' — Checklist Semaine Test TFCL + détection FIT

### A'.1 — Bloc "Statut Semaine Test TFCL" dans la Checklist Coach
Nouveau composant `TFCLTestingWeekStatusCard` affiché dans la Checklist Coach (page Diagnostic / Dashboard coach selon emplacement actuel de la Checklist).

Contenu :
- Lit `computeTFCLCompletion` sur le snapshot actif (déjà disponible dans `tfclTestingWeek.ts`)
- 4 cases à cocher visuelles : P30s ✓, P60s ✓, MAP5min ✓, FTP+TTE ✓
- Badge global :
  - **"Précision haute (~3% MLSS)"** si les 4 efforts présents + `protocol_quality ≥ 4`
  - **"Précision standard (~5%)"** sinon
- Lien direct "Aller à la Semaine Test →" vers `/tfcl-testing-week`
- Affichage de la date du test le plus récent par effort (si dispo via `calibration_evidence`)

### A'.2 — Détection auto dans les FIT importés
Étendre `src/lib/fitImport/testDetector.ts` (déjà existant) pour mapper les tests détectés vers les 4 slots de la Semaine Test :
- `sprint_15s` / `pmax` → slot **P30s** (si durée ≈ 30s détectée) ou ignoré
- effort ~1min all-out → slot **P60s**
- effort ~5min all-out (MAP test) → slot **MAP5min**
- effort 20min / FTP test / TTE → slot **FTP+TTE**

Côté UI d'import FIT, après analyse : afficher un panneau **"Test reconnu — assigner à la Semaine Test TFCL ?"** avec :
- Le slot détecté (badge)
- La valeur extraite (W, durée)
- Bouton **"Valider et écrire dans le snapshot"** → écrit dans `p30s_w` / `p60s_w` / `map5min_w` / `ftp` + `tte_observed_min`
- Crée une entrée `calibration_evidence` avec `source_type='fit'`, `evidence_type='tfcl_week_test'`, `protocol_quality` calculé via `evaluateProtocolQuality`

---

## Partie B — Fit Inverse Mader Conjoint (gain de précision réel)

### B.1 — Nouveau module `src/lib/v2/maderInverseFitJoint.ts`
Fonction `fitMaderJoint(efforts)` qui prend les 4 efforts complets et estime conjointement `(VLamax, VO2max, CE/efficiency)` en minimisant l'erreur sur les 4 puissances observées (équations Mader power-duration).

Approche :
- Modèle direct existant : `maderPowerDurationCurve.ts` → P(t) = f(VLamax, VO2max, CE)
- Inverse : optimisation Levenberg-Marquardt simplifiée (ou grid-search affiné, 2 passes) sur `(VLamax, VO2max)` avec CE dérivé du FTP
- Retourne `{ vlamax, vo2max, ce, mlssEstimated, mlssConfidenceInterval, rmse, convergence }`
- Réutilise `computeMLSSConfidenceInterval` (inscydPoffe2024Sensitivity) pour l'IC final

### B.2 — Activation conditionnelle dans le moteur diagnostic
Dans `engines/diagnostic/computeDiagnostic.ts` (ou le hub diagnostic) :
- Si `computeTFCLCompletion(snapshot).complete === true` ET `protocol_quality ≥ 4` :
  - Appeler `fitMaderJoint` → **source primaire** pour VLamax, VO2max, MLSS%
  - Tracer dans `calibration_evidence` avec `evidence_type='mader_joint_fit'`, `confidence_evidence = 0.90`
- Sinon : pipeline actuel (vlamaxCapEstimator / vlamaxV2Engine) inchangé

### B.3 — Affichage du gain dans le DRE
Dans `useDecisionReliability` → `dre.decisionConfidenceScore` : bonus +0.15 quand le fit conjoint est actif. Le badge Checklist passe alors à **"Précision haute confirmée"**.

### B.4 — Tests unitaires
- `src/lib/v2/__tests__/maderInverseFitJoint.test.ts` : 5 profils synthétiques (sprinteur, endurant, mixte, élite, masters) → vérifier RMSE < 3% MLSS et convergence en < 50 itérations
- Cas dégradé (1 effort manquant) → doit retourner `convergence=false` sans crash

---

## Détails techniques

**Fichiers créés**
- `src/components/coach/TFCLTestingWeekStatusCard.tsx` (UI)
- `src/lib/v2/maderInverseFitJoint.ts` (moteur)
- `src/lib/v2/__tests__/maderInverseFitJoint.test.ts`

**Fichiers modifiés**
- `src/lib/fitImport/testDetector.ts` — ajout mapping slots Semaine Test
- `src/lib/fitImport/analyzer.ts` — exposer le slot détecté dans `FitAnalysisResult`
- Composant d'import FIT (à localiser : probablement `FitFileUpload*`) — panneau d'assignation
- `src/engines/diagnostic/computeDiagnostic.ts` — branchement fit conjoint
- `src/hooks/useDecisionReliability.ts` — bonus confiance
- Page Diagnostic ou Dashboard Coach — insertion `<TFCLTestingWeekStatusCard />` dans la Checklist

**Pas de migration DB** — tout passe par les colonnes existantes (`p30s_w`, `p60s_w`, `map5min_w`, `ftp`, `tte_observed_min`, `protocol_quality`) et la table `calibration_evidence` déjà en place.

**Memory à ajouter après implémentation** :
- `mem://features/mader-inverse-fit-joint` — protocole 4 efforts, RMSE cible 3%, activation conditionnelle
- `mem://features/tfcl-testing-week-checklist-card` — règles d'affichage du badge précision

---

## Livrables
1. Checklist Coach affiche en temps réel le statut des 4 efforts de la Semaine Test TFCL
2. Import FIT propose automatiquement d'assigner un test reconnu à un slot
3. Quand les 4 efforts sont présents + qualité ≥ 4, le diagnostic utilise le fit Mader conjoint (gain ~5% → ~3% sur MLSS)
4. Le DRE reflète le gain de confiance
5. Tests unitaires couvrent les cas nominaux et dégradés

Confirme et je lance l'implémentation.
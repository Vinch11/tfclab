## Objectif

Permettre d'adapter un plan IA en cours de préparation via deux mécanismes complémentaires :
- **Option 1** : Patch local déterministe (zéro IA) pour ajustements mineurs
- **Option 2** : Régénération partielle ciblée (IA légère, fenêtre 3-4 sem) pour changements physiologiques significatifs

Le tout sans dégrader la qualité ni fatiguer l'IA.

---

## Architecture

```text
src/engines/plan/
├─ planPatcher.ts              ← NEW (Option 1: transformations déterministes)
├─ planPatcher.test.ts         ← NEW
├─ planWindowRegen.ts          ← NEW (Option 2: orchestration fenêtre IA)
└─ planAdaptationJournal.ts    ← NEW (garde-fou anti-cascade)

src/hooks/
└─ usePlanAdaptation.ts        ← NEW (façade unifiée patch | window-regen)

src/components/plan/
└─ PlanAdaptationDialog.tsx    ← NEW (UI coach: choix patch vs window-regen)

supabase/migrations/
└─ plan_adaptations table     ← NEW (journal des adaptations)
```

---

## Option 1 — planPatcher.ts (déterministe)

Fonctions pures qui transforment `plan_json` sans appel IA :

| Fonction | Déclencheur | Effet |
|---|---|---|
| `applyDeload(plan, fromWeek, intensity)` | Fatigue détectée | Réduit TSS sem N+1 de 20-40% |
| `redistributeMissedTSS(plan, missedDate)` | Séance manquée | Re-répartit TSS sur 3 jours suivants (max +15%/jour) |
| `swapModality(plan, sessionId, newModality)` | Blessure mineure | Bike↔Run↔Swim avec conservation TSS |
| `shiftRaceDate(plan, newDate)` | Décalage course | Re-calibre taper (3 dernières semaines) |
| `truncateAfterWeek(plan, week)` | Préparation Window regen | Coupe le plan à la semaine N |

Contraintes :
- Garantit invariants : Σ TSS hebdo respecte ramp, jours OFF préservés
- Retourne `{ plan, diff: PatchDiff[], warnings: string[] }`
- Aucune nouvelle séance créée — uniquement transformations

---

## Option 2 — planWindowRegen.ts (IA légère)

Régénère une fenêtre de 3-4 semaines via l'edge function existante `ai-training-plan`, **sans toucher** le reste :

1. **Préserve passé** : sem 1 → N-1 inchangées
2. **Régénère fenêtre** : sem N → N+windowSize via prompt allégé incluant :
   - Résumé condensé des semaines passées (TSS moyen, séances clés, fatigue observée)
   - Snapshot physiologique courant
   - Catalogue filtré pour ces semaines uniquement (~30 séances)
   - Contraintes : continuité avec sem N-1, raccord propre vers sem N+windowSize+1 (si existe)
3. **Recolle** : concatène past + window + future

Mécanisme : nouveau param `regenWindow: { fromWeek, toWeek, pastSummary, futureAnchor }` ajouté côté edge function. ~30% tokens vs régénération complète.

---

## Garde-fou : planAdaptationJournal

Table `plan_adaptations` :
```sql
- id, athlete_id, plan_id
- type: 'patch' | 'window_regen'
- triggered_by: 'fatigue' | 'missed_session' | 'physio_drift' | ...
- diff_json, reason
- created_at
```

Règles :
- Max **2 window-regens / 28 jours** (sinon force patch ou propose plan complet)
- Max **5 patches consécutifs** sans window-regen
- Affichage timeline dans UI coach

---

## Intégration UI

`PlanAdaptationDialog` déclenché par :
- Bouton manuel "Adapter le plan" sur dashboard coach
- Auto-suggéré par `usePlanSnapshotSync` selon ampleur du drift :
  - Drift < 10% → propose **patch**
  - Drift ≥ 10% → propose **window-regen** (fenêtre courante + 2 sem)
  - Drift ≥ 25% → propose **régénération complète**

Dialog affiche :
- Diff visuel des semaines impactées
- Estimation coût (patch = instantané, window = ~15s)
- Confirmation coach avant application

---

## Tests

- `planPatcher.test.ts` : invariants TSS, ramp, conservation jours OFF
- `planWindowRegen.test.ts` : continuité sem N-1 ↔ N (raccord TSS, modalités)
- Snapshot test : journal correctement écrit après chaque adaptation

---

## Livraison incrémentale

1. Migration DB `plan_adaptations`
2. `planPatcher.ts` + tests (Option 1 complète, utilisable immédiatement)
3. `planAdaptationJournal.ts`
4. `planWindowRegen.ts` + adaptation edge function `ai-training-plan` (param `regenWindow`)
5. `usePlanAdaptation.ts` + `PlanAdaptationDialog.tsx`
6. Branchement auto-suggestion dans `usePlanSnapshotSync`

Chaque étape testable indépendamment.

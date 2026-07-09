
## Diagnostic (preuves)

### 1. Origine de la cible "1h12-1h20"
La fourchette provient de `TIME_TARGET_HINTS.Semi.elite.M` — table hardcodée dans `supabase/functions/ai-training-plan/sportRatioMatrix.ts` (L226-232). **Aucune consommation de la VMA snapshot**. Doublon identique dans `src/types/ambitionLevel.ts` (RUNNING_TIME_HINTS, L107-113) pour l'UI.

### 2. VMA consommée par l'estimateur "elite"
`getTimeTargetHint(objectif, ambition, sex)` → lookup pur table. Zéro VMA en entrée. La table code implicitement une VMA ~19-20 km/h pour "elite semi", incompatible avec un athlète VMA 16,5 km/h.

### 3. Consommateurs de la cible temporelle statique
| Site | Fichier | Ligne | Usage |
|---|---|---|---|
| Prompt IA principal | `promptHelpers.ts` | 765 | "🎯 Temps cible estimé" injecté au chunk 1 |
| Prompt diagnostic | `promptHelpers.ts` | 66 | `diagTimeTarget` dans bloc diag |
| UI sélecteur ambition | `src/pages/Index.tsx` | 1268 | Badge dans dropdown ambition |
| UI carte ambition | `src/pages/Index.tsx` | 1495-1535 | Ligne "· 1h12-1h20" détaillée |

### 4. Estimateur snapshot-based existant (non consommé pour affichage)
`raceTimePredictor.predictRaceDurationMin` (branche `daniels_scenario`, L129-146) calcule déjà `computeRaceScenarios(vmaKmh, thresholdPace, distKm)` → temps par ambition depuis la VMA snapshot. Actuellement utilisé uniquement en interne (F-24 durabilité) — **jamais rendu au coach ni au prompt de plan**.

### 5. Conséquence
Les allures des séances (dérivées zones Z1-Z7 sur VMA snapshot) et le temps cible J affiché (table littérature ambition) sont deux univers déconnectés. Sur cet athlète (VMA 16,5), les séances disent 4:10/km = 1h27, la ligne J dit 1h12-1h20.

---

## Fix (chirurgical, source de vérité unique)

### A. Nouveau helper `deriveRaceTargets` (source unique)
Fichier : `src/lib/deriveRaceTargets.ts` (+ miroir Deno `supabase/functions/_shared/deriveRaceTargets.ts` si import cross-runtime nécessaire ; sinon appel depuis `raceAnalysis.ts` déjà partagé).

Signature :
```ts
deriveRaceTargets({
  vmaKmh, thresholdPaceSecPerKm,   // snapshot
  objectif,                         // "Semi" | "Marathon" | "10K" | "5K" | ...
  ambition,                         // finisher..world_class
  literatureHintRange?              // fourchette table pour comparaison
}) → {
  distanceKm,
  racePaceSecPerKm,        // allure course dérivée snapshot × pctVMA(ambition)
  raceTimeSec,             // Riegel si dist > 21.1
  paceRange: {lo, hi},     // ±5s/km
  timeRange: {lo, hi},     // ±90s
  source: "snapshot" | "insufficient_data",
  literatureRange?: {loSec, hiSec},
  divergencePct?: number,  // (snapshot − milieu_literature) / milieu_literature
  warning?: string         // si |div| > 8%
}
```
Utilise directement `computeRaceScenarios` (existant, calibré) — ne réimplémente pas Riegel. Bornage `pctVMA` par ambition déjà présent dans `AMBITIONS` de `raceAnalysis.ts`.

### B. Remplacement dans le prompt IA
`supabase/functions/ai-training-plan/promptHelpers.ts` :
- L765 : remplacer le bloc `getTimeTargetHint` par `deriveRaceTargets(data.vma, data.paceThresholdSecPerKm, objectif, ambition)`. Injecter la ligne :
  > `🎯 CIBLE COURSE (snapshot-based) : {tempsRange} — allure {paceRange}/km — Source : VMA {vma} × {pctVMA}%. Fourchette littérature "{literatureHint}" affichée en référence uniquement.`
- Si `divergencePct > 8%` avec fourchette littérature ambition, ajouter :
  > `⚠️ INCOHÉRENCE AMBITION vs PHYSIOLOGIE : la fourchette littérature "{lit}" nécessite VMA ≈ {vmaRequired} km/h ; snapshot actuel {vmaActual} km/h. Utilise la cible SNAPSHOT pour toutes les prescriptions. Ne prescrit AUCUNE séance à des allures issues de la fourchette littérature.`
- L66 : idem pour `diagTimeTarget`.

### C. UI (`src/pages/Index.tsx`)
- L1495 (carte ambition détaillée) : sous la fourchette littérature, ajouter une seconde ligne calculée `deriveRaceTargets(...)` avec badge "Snapshot" et, si divergence >8%, badge "⚠️ Incompatible" cliquable → tooltip explicatif.
- L1268 (dropdown) : ne pas casser l'UX existante ; garder le hint littérature, ajouter une pastille discrète 🟢/🟠/🔴 selon compatibilité avec VMA snapshot.
- Ne PAS supprimer `RUNNING_TIME_HINTS` : reste utile comme référence populationnelle.

### D. Garde-fou moteur
`raceGoals[i].targetTimeMinutes` (coach saisi) : si l'écart avec `deriveRaceTargets.raceTimeSec` > 8%, propager le warning dans le prompt (déjà partiellement fait pour F-24 durabilité ; étendre à un warning générique "objectif temps incompatible physio").

### E. Logs
`console.log(\`🎯 deriveRaceTargets : VMA snapshot ${vma} km/h → allure ${pace}/km → objectif ${time} (ambition ${amb}, div littérature ${div}%)\`)` dans l'edge function au moment de l'appel.

---

## Ce qui ne change PAS
- Allures des séances (zones Z1-Z7) : déjà correctes, dérivées du snapshot via `zonesConfig` / promptHelpers L943-1020.
- Chunking, parser, moteurs Diagnostic/Décision.
- Schéma DB, tables `raceGoals`.
- `RUNNING_TIME_HINTS` (conservé comme référence secondaire).

---

## Validation

1. Régénérer un plan semi pour l'athlète VMA 16,5, ambition "elite" :
   - Ligne jour J doit afficher `~1h27-1h29 · allure 4:08-4:12/km · Source snapshot`.
   - Warning visible : `⚠️ Ambition "elite" (littérature 1h12-1h20) incompatible avec VMA actuelle`.
   - Logs edge : `🎯 deriveRaceTargets : VMA snapshot 16.5 km/h → allure 4:08/km → objectif 87min (ambition elite, div littérature +18%)`.
2. Test unitaire `deriveRaceTargets.test.ts` : couvrir VMA 16.5/18/20 × Semi/10K/Marathon × 3 ambitions.
3. Régénérer un plan pour un athlète VMA 20 km/h ambition elite : la ligne J doit tomber dans la fourchette littérature (divergence <8%, pas de warning).

---

## Estimation
- 1 nouveau fichier (`deriveRaceTargets.ts`) + tests
- 2 sites modifiés dans `promptHelpers.ts`
- 2 sites modifiés dans `Index.tsx`
- Aucun changement DB, aucune migration

Prêt à implémenter dès validation.

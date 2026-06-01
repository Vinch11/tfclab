
## Objectif

Permettre au bot in-app d'atteindre la même précision que les analyses faites en chat : comparer un chrono réel (ex: Vince, 20km en 1h33) avec les prédictions de l'app, expliquer les écarts physiologiquement, et proposer une calibration.

## Architecture cible

Migration de `supabase/functions/assistant-chat` du pattern actuel (fetch SSE manuel sans tools) vers **AI SDK + tool-calling** avec accès lecture DB et écriture calibration.

```text
[Chat UI]
   ↓ (messages + selectedAthleteId)
[assistant-chat edge function]
   ├─ system prompt enrichi (charte + référentiels TFCL)
   ├─ contexte athlète actif (existant)
   └─ streamText() avec tools:
        ├─ getRaceScenarios(athleteId, distanceKm)   ← lecture
        ├─ getSnapshotDetails(athleteId)              ← lecture
        ├─ analyzeRacePerformance({distanceKm, timeSec, athleteId})  ← calcul pur
        ├─ projectTimeRiegel({fromDistKm, fromTimeSec, toDistKm})    ← calcul pur
        └─ saveCalibrationEvidence({athleteId, kind, payload})       ← écriture (needsApproval)
```

## Composants à créer / modifier

### 1. Backend — `supabase/functions/assistant-chat/index.ts`
- Remplacer fetch SSE manuel par **AI SDK** (`streamText` + `tool` + `stopWhen: stepCountIs(50)`) via `createLovableAiGatewayProvider`.
- Ajouter 5 tools (voir architecture).
- Tool d'écriture (`saveCalibrationEvidence`) marqué `needsApproval` → confirmation UI avant insert.
- Enrichir `SYSTEM_PROMPT` avec :
  - Tableau scénarios Finish→World-class (%VMA, %seuil, allure)
  - Règles Riegel/Daniels (exposant 1.06)
  - Heuristiques physio (TTE à seuil, MLSS vs LT2, durabilité)
  - Méthodo : « si chrono observé > prédiction Perf, recalibrer VMA/seuil ou tte_observed_min_run »

### 2. Bibliothèque calcul partagée — `supabase/functions/_shared/raceAnalysis.ts` (nouveau)
- `computeRaceScenarios(snapshot, distanceKm)` → 5 lignes (Finish/Perf/Sub/Elite/WC) avec allure cible + temps prévu
- `projectRiegel(d1, t1, d2, exp=1.06)` 
- `analyzePerformance(actual, scenarios)` → renvoie écart %, scénario le plus proche, signal de recalibration

Réutilisable côté front aussi (export miroir dans `src/lib/`).

### 3. Frontend — composant chat
- Hook `useAssistantContext` : ajouter VMA, allure seuil (`mlss_pace_sec`), VO2max run, `tte_observed_min_run`, `time_*_sec` existants dans le snapshot.
- Composant `RaceChronoForm` (mini-formulaire) ouvert via bouton 📊 dans le chat : champs distance / temps / date / sport → injecte un message structuré dans la conversation.
- Rendu tool-calls : afficher dans la bulle assistant les appels de tool (« 🔧 Analyse 20 km à 1h33 ») et leurs résultats compacts (tableau allures, écart %).
- UI d'approbation pour `saveCalibrationEvidence` : carte « Enregistrer cette donnée comme calibration ? [Confirmer / Annuler] ».

### 4. Détection NL des chronos
- Pas de parser custom : c'est le rôle du modèle. Le system prompt donne quelques exemples (« 20km en 1h33 », « semi 1:38:30 », « 10K 38:42 ») et le bot appelle `analyzeRacePerformance` directement.

## Détails techniques

| Élément | Choix |
|---|---|
| Modèle | `google/gemini-3-flash-preview` (tool-calling robuste, latence ok) |
| Provider | `createLovableAiGatewayProvider` (helper standard) |
| `stopWhen` | `stepCountIs(50)` |
| DB tools | Lecture via `supabaseClient` (RLS scoped to user via `getUser()`) |
| Approval UI | Côté front, on lit `parts` de type `tool-call` et on rend boutons Confirm/Cancel qui réinjectent un message « tool result » |
| Streaming | `result.toUIMessageStreamResponse({ headers })` |

## Garde-fous
- Tools de lecture : input validé Zod (UUID athleteId, distance ∈ [1, 250], temps ∈ [60s, 24h]).
- Tool d'écriture : refuse si athleteId n'appartient pas au coach (vérif via `athletes.user_id = user.id`).
- Reprise charte TFCL existante (sources, confiance, plage incertitude).
- Pas de génération de plan ni d'override de snapshot sans confirmation.

## Hors scope (à voir plus tard)
- Vocal → texte (saisie chrono vocale).
- Détection auto de chronos depuis FIT files importés (déjà géré ailleurs).
- Recalcul automatique de VMA depuis chrono (le bot suggère, le coach valide manuellement).

## Livrables
1. `supabase/functions/_shared/raceAnalysis.ts` + tests
2. `supabase/functions/assistant-chat/index.ts` refondu (AI SDK + tools)
3. `src/lib/raceAnalysis.ts` (miroir front pour formulaire/preview)
4. `src/hooks/useAssistantContext.ts` enrichi (VMA, seuil, vo2max run, chronos historiques)
5. `src/components/assistant/RaceChronoForm.tsx` + intégration dans la fenêtre chat
6. Rendu tool-calls + approval UI dans le composant chat existant
7. Migration mémoire : nouvelle règle `mem://features/assistant-bot-tool-calling`

Estimation : ~6-8 fichiers touchés. Pas de changement DB.

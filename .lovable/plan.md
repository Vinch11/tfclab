# Phase 1A — Sortie IA structurée (Markdown → JSON contraint)

## Objectif

Remplacer la sortie Markdown token-par-token de l'edge `ai-training-plan` par une sortie **JSON validée Zod** dont le schéma est le miroir 1:1 de `ParsedPlan` (déjà défini dans `src/lib/aiPlanParser.ts`). Le parser Markdown côté client devient inutile (Phase 1B, hors périmètre).

## Point critique à valider AVANT implémentation

Le contrat client change forcément : l'edge n'émettra plus de deltas OpenAI-compatibles `{"choices":[{"delta":{"content":"..."}}]}` mais des events SSE `chunk-progress` + `chunk-json`. La contrainte "ne pas toucher au viewer/persistance/patcher" est tenue, MAIS **le consommateur SSE côté client (`useAITrainingPlan`) devra impérativement être adapté** — sinon le plan ne s'affiche plus. Deux options :

1. **Recommandé** : ajouter au périmètre uniquement l'adaptateur `useAITrainingPlan` qui, à la réception des chunks JSON, sérialise en Markdown compatible (fonction inverse minimale) pour que viewer/parser existants continuent à fonctionner à l'identique. Coût : ~150 lignes, aucun changement UI.
2. **Alternative** : livrer l'edge en Phase 1A avec un flag serveur `outputFormat: "json" | "markdown"` par défaut `markdown` — le JSON n'est activé que par un test dédié. Rien ne casse en prod jusqu'à Phase 1B.

À défaut de décision, j'irai avec **option 2** (feature flag) : plus sûr, découplage total, tu actives quand la Phase 1B est prête.

## Architecture cible

### 1. `planSchema.ts` (nouveau)

Schéma Zod miroir de `ParsedPlan`. Entête = table de correspondance :

| ParsedPlan (client)       | zPlan (LLM)                | Origine |
| ------------------------- | -------------------------- | ------- |
| `title`                   | `title`                    | LLM     |
| `diagnostic?`             | `diagnostic?`              | LLM     |
| `strategicRecap?`         | `strategicRecap?` (miroir) | LLM (chunk 1 uniquement) |
| `phases[]`                | `phases[]`                 | LLM     |
| `weeks[].weekNumber`      | id.                        | LLM     |
| `weeks[].phase`           | `phase` enum `base\|build\|peak\|taper` | LLM |
| `weeks[].theme`           | id.                        | LLM     |
| `weeks[].phaseObjective?` | id.                        | LLM     |
| `weeks[].volumeTarget`    | **supprimé** (recalculé)   | — (contrainte N°4) |
| `weeks[].computedVolumeMin/Str` | **supprimé du schéma LLM** | computed client |
| `weeks[].coachNotes?`     | `weeklyNotes?`             | LLM     |
| `sessions[].dayName`      | `day` enum `lundi..dimanche` | LLM   |
| `sessions[].dayIndex`     | **supprimé** (dérivé du day) | computed edge |
| `sessions[].sport`        | `sport` enum `swim\|bike\|run\|brick\|strength\|recovery\|rest` | LLM |
| `sessions[].title`        | id.                        | LLM     |
| `sessions[].details`      | id.                        | LLM     |
| `sessions[].isRest`       | **dérivé** (`sport==="rest"`) | computed edge |
| —                         | `isKeySession: boolean`    | remplace marqueur 🔑 |
| —                         | `catalogId: string \| null` | LLM (enum runtime) |
| —                         | `custom: boolean`          | LLM     |
| —                         | `durationMin: number`      | LLM (source de volume) |
| —                         | `zones: string[]`          | LLM     |

Discriminant contrainte N°2 : `zSessionRef` (`custom=false` → `catalogId ∈ enum runtime`), `zSessionCustom` (`custom=true` → `catalogId=null`), `zSessionRest` (`sport=rest`, aucun catalogId, `durationMin=0`), union discriminée sur `custom` + `sport`.

Fabrique `buildPlanChunkSchema(allowedCatalogIds: string[])` : construit `z.enum([...])` à l'appel (contrainte N°2). Extraction des IDs depuis le catalog string du chunk (`chunkCatalogs[i]`) via regex `/^([A-Z0-9_]+)\s+/m` sur les lignes du dump catalogue.

### 2. `mergePlanChunks.ts` (nouveau, contrainte N°4)

- `mergePlanChunks(chunks: PlanChunk[], totalWeeks: number): ParsedPlan`
- Ordonne par `weekNumber`, vérifie couverture `1..totalWeeks` sans trou ni doublon → erreur explicite `[SCHEMA_FAIL] gap|dup` sinon.
- Concatène `weeks`, prend `title/phases/diagnostic/strategicRecap` du premier chunk qui les fournit.
- **N'inclut aucun champ de volume déclaré** — le champ est absent du schéma, donc rien à faire côté merge.
- Tests unitaires Deno (`mergePlanChunks.test.ts`) : chunks désordonnés, semaine manquante, doublon, chunk unique.

### 3. `index.ts` — refonte de la boucle de génération

Nouvelle fonction `generateChunkJSON(systemPrompt, userPrompt, allowedIds, chunkIndex)` :

```
POST https://ai.gateway.lovable.dev/v1/chat/completions
body: {
  model: "google/gemini-3-flash-preview",
  messages: [{system}, {user}],
  response_format: { type: "json_schema", json_schema: {
    name: "plan_chunk",
    strict: true,
    schema: zodToJsonSchema(buildPlanChunkSchema(allowedIds))
  }},
  stream: false
}
```
- Validation `buildPlanChunkSchema(allowedIds).safeParse(JSON.parse(content))`.
- Échec → **1 seul retry** avec `user += "\n\nCORRECTION REQUISE (schéma) : " + zodErrorsCompact`.
- 2ᵉ échec → SSE event `{type:"error",chunkIndex,code:"SCHEMA_FAIL",errors}` + log `[SCHEMA_FAIL]` + fermeture stream. Jamais de 3ᵉ tentative.

Contrat SSE nouveau (contrainte N°3) :
```
event: chunk-progress
data: {"chunkIndex":0,"totalChunks":3,"status":"generating"}

event: chunk-json
data: <PlanChunk JSON complet du chunk validé>

event: chunk-progress
data: {"chunkIndex":0,"totalChunks":3,"status":"done"}

... (chunks suivants) ...

event: plan-complete
data: {"totalChunks":3}

event: error
data: {"chunkIndex":1,"code":"SCHEMA_FAIL",...}   // si échec
```

Feature flag (option 2 recommandée) : header `X-Plan-Output-Format: json` ou champ `planConfig._outputFormat === "json"` active le nouveau chemin ; sinon fallback intégral sur l'existant. Zéro changement de comportement en prod tant que le flag n'est pas activé.

### 4. `systemPrompt.ts` — nettoyage

**Supprimer** (règles obsolètes après passage JSON) :
- RÈGLE #0 H1 / `h1Rewrite` (schéma impose `title`)
- Format tableau Markdown + colonne "Détails"
- Marqueur `🔑` (remplacé par `isKeySession: true`)
- Buffer de streaming `h1Rewrite` dans `index.ts` (~40 lignes)
- Toutes les instructions "utilise ce format exact de tableau"
- Anti-semaine-vide format-driven (le schéma impose ≥1 session ou `sport=rest` explicite)

**Conserver intégralement** (défenses sémantiques) :
- Verrous sport / cross-sport (rule 6 non-cross-sport)
- Ratios `sportRatioMatrix`
- Règles Lorang (A/B/C/D, ratios A%/B%/C%)
- W'bal recovery reminders
- Hard-ban trail (déjà en place)
- `nutritionAndSafetyGuardrails`
- `ambitionDefense`

Ajouter en tête : "Tu produis un JSON conforme au schéma fourni via `response_format`. Aucun Markdown. Aucun texte hors JSON."

### 5. Chemin `regenerateWeek`

Même schéma, même route, mais `buildPlanChunkSchema` avec `weeks` de longueur exacte = 1 (raffiner via `.length(1)`). Enum IDs autorisés = catalog de la phase de la semaine régénérée.

## Périmètre non-touché (contrainte)

- `src/pages/AITrainingPlanPage.tsx` (viewer)
- `src/lib/aiPlanParser.ts` (Markdown parser — désactivé Phase 1B)
- `plan_versions` persistence
- `planPatcher.ts`
- `useAITrainingPlan.ts` **si option 2 (flag off en prod)** ; sinon adaptateur JSON→Markdown minimal

## Fichiers créés / modifiés

**Créés** (edge uniquement) :
- `supabase/functions/ai-training-plan/planSchema.ts` (~200 lignes)
- `supabase/functions/ai-training-plan/mergePlanChunks.ts` (~80 lignes)
- `supabase/functions/ai-training-plan/mergePlanChunks.test.ts` (Deno test, ~120 lignes)
- `supabase/functions/ai-training-plan/generateChunkJSON.ts` (~130 lignes, isole l'appel gateway + retry)

**Modifiés** :
- `supabase/functions/ai-training-plan/index.ts` : nouveau chemin JSON derrière flag ; nettoyage `h1Rewrite` et logique de format tableau (uniquement dans le nouveau chemin — l'ancien reste intact)
- `supabase/functions/ai-training-plan/systemPrompt.ts` : nouveau builder `getSystemPromptJSON(...)` en parallèle de l'existant, purge des règles format Markdown

## Ce qui reste EXPLICITEMENT hors Phase 1A

- Adaptateur / migration du client (`useAITrainingPlan`, viewer) → Phase 1B
- Suppression définitive de `aiPlanParser.ts` → Phase 1B après bascule complète
- Refonte du chunker (nombre de semaines par chunk) → Phase 2
- Squelette déterministe (slots pré-calculés hors LLM) → Phase 2

## Risques identifiés

1. **Gemini `json_schema` support** — Le gateway route `google/*` via OpenRouter. `response_format:json_schema` peut être partiellement supporté. Fallback prévu : `response_format:{type:"json_object"}` + validation Zod post-hoc + retry (comportement identique côté validation, seul le "server-side enforcement" est absent).
2. **Taille du schéma JSON pour catalogues >200 IDs** — Gemini rejette les enums >~500 valeurs. Cap à 150 IDs par chunk (déjà proche de `maxItems:80` actuel).
3. **Débordement `max_tokens`** — JSON verbeux > Markdown. Passer `max_tokens: 65536` → provider default et vérifier par test.

## Décisions à confirmer avant que je code

1. Option 1 (adaptateur client léger) ou **option 2 (feature flag serveur)** ?
2. Nom du feature flag : `planConfig._outputFormat` ou header HTTP ?
3. Faut-il conserver l'émission de `warningBanners` LCW / compliance dans le nouveau chemin JSON (via un champ `weeklyNotes` ou un event SSE dédié `warning`) ?

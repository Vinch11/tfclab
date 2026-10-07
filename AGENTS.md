# Architecture rules

- Intensity domains (LT1 → MLSS → VO₂max) are defined only in `src/lib/zones/tfclDoctrine.ts`; zones, workouts and AI prompts must reference a doctrine domain, never hardcoded % VMA. Why: author-named methods were redefining intensities inconsistently.

## Pourquoi cette section existe

Carte (audit 2026-10) pour retrouver où vivent les choses sans dépendre
d'une seule personne — pas une doc exhaustive ; à compléter au fil des
audits. Des règles locales vivent dans des `AGENTS.md` de sous-dossiers
(ex. `src/lib/print/`).

## Les trois couches

1. **Frontend** — Vite + React + shadcn/ui, hébergé sur Lovable
   (`https://tfclab.lovable.app`) ; `main` se synchronise avec l'éditeur
   Lovable dans les deux sens.
2. **Backend** — Supabase : Postgres (RLS sur toutes les tables, scopées
   `coach_id`/`user_id = auth.uid()`, cf. PR #301) + Edge Functions (Deno,
   `supabase/functions/*`).
3. **Intégrations** — Nolio (OAuth + sync bidirectionnelle,
   `supabase/functions/nolio-*`), Lovable AI Gateway (`LOVABLE_API_KEY`).

## Concepts clés et où ils vivent

**Objectifs/distances** — `ObjectifType` (`src/types/athlete.ts`). Trois
routages PARALLÈLES avec leur propre normalisation texte → clé canonique :
`normalizeGoal()` (`workoutCatalogBuilder.ts`, catalogue),
`normalizeObjectiveKey()` (`normalizeObjectiveKey.ts`, ratio par sport
dans `planValidator.ts`), `normalizeObjective()` (`physiologicalTargets.ts`,
cibles VLamax/TTE/FTP). `objectiveCoverage.definitionOfDone.test.ts`
(PR #298) casse la compilation si un objectif est oublié.

**Catalogue de séances** — `src/lib/workoutLibrary.ts` agrège les fiches
`enrichedWorkouts*.ts` + Pro Pack ; `buildWorkoutCatalog()`
(`workoutCatalogBuilder.ts`) filtre/score par objectif/phase/limiteur
(logs `[catalog_pipeline]`). `workoutGoalsEnricher.ts` infère
`goals[]`/`phase[]` des fiches historiques — `defaultGoalsForSport()` est
le point sensible.

**Génération de plan IA** — orchestrateur client `src/hooks/useAITrainingPlan.ts` :
config (`engines/plan/planConfigBuilder.ts`), chunks (tri long 5, trail 6,
sinon 4), edge function `ai-training-plan` (`systemPrompt.ts`/
`promptHelpers.ts`, JSON), parse (`lib/aiPlanParser.ts`), fusion
(`lib/plan/mergePlanChunks.ts`), validation (`engines/plan/planValidator.ts`,
règles B1-B12).

**QA de la génération** — `src/lib/plan/qa/` : profils synthétiques
(`syntheticProfiles.ts`) rejoués manuellement depuis `/debug/plan-qa`
(jamais en CI : coût IA réel) ; `checks.ts` applique B1-B12,
`checkB4For()` = dispatch exhaustif par profil.

**Zones/intensité** — `src/lib/zones/tfclDoctrine.ts` (seule source).
VLamax/métabolisme — `src/lib/v2/` (`vlamaxTargets.ts`,
`maderMetabolicModel.ts`). Cibles par objectif/ambition —
`src/lib/physiologicalTargets.ts`.

**Playwright** — `e2e/`, `playwright.config.ts`. "Mobile Safari" tourne
sous WebKit (seul moteur reproduisant les bugs tactiles Safari). Harnais
dev-only `src/pages/__e2e/` (gardés par `import.meta.env.DEV`).

**CI** (`.github/workflows/ci.yml`) — `vitest` (tsc + suite), `deno-test`
(seulement `supabase/functions/ai-training-plan/`), `playwright`
(chromium + webkit).

## Pièges connus

- Un nouvel objectif doit être câblé dans les 3 routages + 
  `syntheticProfiles.ts`/`checks.ts`, sinon le test de couverture échoue.
- Une fonction `nolio-*` utilisant la clé service-role DOIT vérifier
  l'appelant (`getClaims`, cf. `nolio-list-athletes`) — `verify_jwt` ne
  suffit pas, la clé anon est elle-même un JWT valide.

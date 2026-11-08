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

## Corrections du générateur — portée sportive

- Quand une cause est partagée, corriger le mécanisme commun plutôt qu'ajouter une exception par objectif. Ne pas généraliser une prescription propre au 10 km.
- Vérifier les impacts sur 5 km, 10 km, semi-marathon, marathon, trail, Half-Ironman et Ironman, avec les fixtures et tests existants, complétés par des non-régressions représentatives.
- Préserver les spécificités physiologiques, quotas, périodisation et récupération de chaque discipline. Une voie dédiée (ex. trail ou LCW) ne doit pas hériter silencieusement des règles d'une autre.
- Le rapport distingue corrections communes, corrections spécifiques, disciplines effectivement testées et comportements restant à vérifier. Un test 10 km vert ne valide jamais le moteur entier ni la qualité sportive d'un plan réel.

## Choix du moteur (IA / DET) et export Nolio V2 — production

- Le coach choisit le moteur dans `/planning/ai-plan` (`planningEngine`, préférence locale `tfcl_planning_engine`). Les deux moteurs reçoivent la MÊME entrée (athlète + config de la page) ; DET passe par `src/lib/plan/detEngineRun.ts` → `freezeAppPlanningInput` → `generateAppProfileDetPlan`. Un refus DET est affiché, jamais remplacé par l'IA. Pourquoi : un fallback silencieux masquerait la provenance réelle du plan.
- Un plan DET (`_provenance.engine === "det"`) est affiché/enregistré tel quel : `parsedPlanWithMeta` ne lui applique pas les post-traitements IA. Le moteur DET vit dans `experimental/det-engine/` + `scripts/library-v3/` + `src/lib/det/` ; ces dossiers entrent dans `planReleaseManifest.ts` (régénérer la déclaration après toute modification : `calculatePlanRelease` de `scripts/preproduction/plan-release-source.mjs`, sinon le build Vite échoue).
- Nolio V2 production : UNE autorisation OAuth par coach (`nolio_v2_grants`, rotation du refresh token sérialisée), un lien par athlète (`nolio_v2_athlete_links`, sports associés), journal `nolio_v2_operations` (réservation avant POST, jamais de recréation d'une opération confirmée ou incertaine). Edge : `nolio-v2-connect`, `nolio-v2-oauth-callback` (verify_jwt=false, state+PKCE), `nolio-v2-export-plan` (prepare / send par lots : simulation `dry_run` Nolio puis création). Plans DET → structure bloc par bloc (`preparePlan`) ; plans IA → `aiTextMapper.ts` (prescription complète en description + un pas minuté sans cible). Allures envoyées en m:ss entières (les secondes décimales ont été refusées en simulation). Le code V1 (`nolio-send-plan`, `nolio_tokens`) reste séparé et inchangé.
- Secrets Edge requis : `NOLIO_V2_CLIENT_ID`, `NOLIO_V2_CLIENT_SECRET` ; optionnel `NOLIO_V2_APP_ORIGIN` (défaut https://tfclab.lovable.app). URL de retour à déclarer chez Nolio : `https://<projet>.supabase.co/functions/v1/nolio-v2-oauth-callback`.

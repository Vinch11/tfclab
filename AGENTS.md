# Architecture rules

- Intensity domains (LT1 → MLSS → VO₂max) are defined only in `src/lib/zones/tfclDoctrine.ts`; zones, workouts and AI prompts must reference a doctrine domain, never hardcoded % VMA. Why: author-named methods were redefining intensities inconsistently.

## Pourquoi cette section existe

Ce fichier était jusqu'ici une seule règle. Étendu (2026-10, audit "produit
quasi fini") pour que quelqu'un sans tout le contexte en tête — un autre
dev, un autre coach, une future session — puisse retrouver où vivent les
choses sans dépendre d'une seule personne. Ce n'est pas une doc exhaustive
(735+ fichiers dans `src/`, 70 migrations, 22 edge functions) : c'est une
carte pour savoir où creuser, à compléter au fil des audits plutôt qu'à
rédiger d'un coup puis laisser périmer.

## Les trois couches

1. **Frontend** — Vite + React + shadcn/ui. Hébergé sur Lovable
   (`https://tfclab.lovable.app`) ; tout push sur `main` se synchronise avec
   l'éditeur Lovable, dans les deux sens.
2. **Backend** — Supabase : Postgres (26 tables, RLS sur toutes, scopées
   `coach_id`/`user_id = auth.uid()` — voir PR #301 pour l'audit complet) +
   Edge Functions (Deno, `supabase/functions/*`, 22 fonctions).
3. **Intégrations externes** — Nolio (plateforme tierce de plans
   d'entraînement structurés, OAuth + sync bidirectionnelle,
   `supabase/functions/nolio-*`), Lovable AI Gateway (accès LLM pour la
   génération de plan et les structures Nolio, clé `LOVABLE_API_KEY`).

## Concepts clés et où ils vivent

**Objectifs/distances** (IM, 703, Sprint, Olympic, Marathon, Semi, 10K, 5K,
StartToRun, Trail×3) — `ObjectifType` dans `src/types/athlete.ts`. Trois
routages PARALLÈLES et INDÉPENDANTS existent pour cette même liste, chacun
avec sa propre normalisation d'objectif en texte libre → clé canonique :
`normalizeGoal()` (`src/lib/workoutCatalogBuilder.ts`, routage catalogue),
`normalizeObjectiveKey()` (`src/lib/normalizeObjectiveKey.ts`, ratio par
sport dans `planValidator.ts`), `normalizeObjective()`
(`src/lib/physiologicalTargets.ts`, cibles VLamax/TTE/FTP). Un objectif
ajouté sans mettre à jour les trois est le bug le plus fréquent de ce repo
(cf. historique Sprint/Olympic/5K, PR #297) —
`src/lib/__tests__/objectiveCoverage.definitionOfDone.test.ts` (PR #298)
force une erreur de compilation si un objectif est oublié dans cette liste
de couverture.

**Catalogue de séances** — `src/lib/workoutLibrary.ts` agrège ~900+ fiches
depuis une vingtaine de fichiers `enrichedWorkouts*.ts` + le "Pro Pack"
historique. `src/lib/workoutCatalogBuilder.ts::buildWorkoutCatalog()` filtre/
score ce catalogue pour un objectif/phase/limiteur donné (pipeline en
étapes tracées, `[catalog_pipeline]` dans les logs). `workoutGoalsEnricher.ts`
est le filet de secours qui infère `goals[]`/`phase[]` pour les fiches
historiques qui ne les documentent pas explicitement — `defaultGoalsForSport()`
y est le point le plus sensible (silencieusement invisible à un objectif
oublié, cf. ci-dessus).

**Génération de plan IA** — `src/hooks/useAITrainingPlan.ts` est
l'orchestrateur client : construit la config
(`src/engines/plan/planConfigBuilder.ts`), découpe en chunks pour les plans
longs (triathlon long → `CHUNK_SIZE=5`, trail verbeux → `6`, sinon `4`),
appelle l'edge function `ai-training-plan` (prompt assemblé dans
`systemPrompt.ts`/`promptHelpers.ts`, génération JSON structurée), parse la
réponse (`src/lib/aiPlanParser.ts`), fusionne les chunks
(`src/lib/plan/mergePlanChunks.ts`), puis valide le résultat
(`src/engines/plan/planValidator.ts` — règles B1-B12 : continuité des
semaines, ratio par sport, densité de jours durs, etc.).

**QA de la génération** — `src/lib/plan/qa/` : 12 profils synthétiques
(`syntheticProfiles.ts`, un par objectif × palier d'ambition) rejoués via
`useQARunner.ts` (déclenché manuellement depuis `/debug/plan-qa` —
`PlanQAPage.tsx` — PAS en CI : chaque run coûte de vrais crédits IA).
`checks.ts` applique les règles B1-B12 à chaque génération ;
`checkB4For()` y est le dispatch exhaustif par profil (PR #299).

**Zones/intensité** — `src/lib/zones/tfclDoctrine.ts`, seule source
(règle historique ci-dessus). VLamax/métabolisme — `src/lib/v2/`
(`vlamaxTargets.ts`, `maderMetabolicModel.ts`). Cibles physiologiques par
objectif (VLamax/TTE/FTP/VMA par palier d'ambition) —
`src/lib/physiologicalTargets.ts`.

**Tests navigateur réels (Playwright)** — `e2e/`, `playwright.config.ts`
(PR #300). Project "Mobile Safari" tourne sous WebKit (pas Chromium —
`devices["iPhone 13"]` simule un vrai iPhone), seul moteur qui reproduit
les bugs d'interaction tactile spécifiques à Safari. Harnais dev-only sous
`src/pages/__e2e/` pour tester un composant sans dépendre d'une session
Supabase réelle (route gardée par `import.meta.env.DEV`, jamais en prod).

**CI** (`.github/workflows/ci.yml`) — 3 jobs indépendants : `vitest`
(frontend, `tsc --noEmit` + suite complète), `deno-test` (edge functions,
SCOPÉ à `supabase/functions/ai-training-plan/` uniquement — les 21 autres
fonctions n'ont aucun test automatisé), `playwright` (e2e/, chromium +
webkit).

## Pièges connus

- Un nouvel objectif (`ObjectifType`) doit être câblé dans les 3 routages
  ci-dessus + `syntheticProfiles.ts`/`checks.ts` (QA) — sinon
  `objectiveCoverage.definitionOfDone.test.ts` échoue à la compilation.
- Une fonction `supabase/functions/nolio-*` qui utilise la clé service-role
  DOIT vérifier l'identité de l'appelant (`getClaims`, cf.
  `nolio-list-athletes/index.ts`) — `verify_jwt=true` (défaut) ne suffit
  pas seul, la clé anon publique est elle-même un JWT valide (cf. PR #301).
- `/debug/plan-qa` et les profils QA ne tournent jamais en CI (coût IA réel
  à chaque run) — c'est un outil manuel, pas un gate automatique.

- On iPhone/iPad, `openPrintableHTML` builds a real PDF file on-device (`src/lib/print/iosPdfExport.ts`, html2canvas + jsPDF) and offers it via the native share sheet, falling back to the inline overlay only on failure. Why: Safari print is unreliable on iOS (blank tab in installed app, broken pagination in iframes).

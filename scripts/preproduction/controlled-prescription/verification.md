# Verification — 2026-11-09

## Installation contrôlée — état au 9 novembre, 06:10 UTC

- L'affichage du contrat global est installé dans l'aperçu. Le contrat fictif conserve 33 semaines après un refus de la fenêtre S1–S15, avec objectif Marathon distinct de l'Ironman.
- Vérification Python Playwright réussie à 1118×676 et 390×844, sans écriture réseau ni consultation d'athlète réel.
- Les deux fonctions ont été déployées dans l'ordre test puis principale. Les réponses release concordent avec la déclaration locale `38d6b6c8ac2fbeb16e4087286f1241baa2b43935e1dadd56f6b9d15fdc0636da`. Refus 409 sans marqueurs et 401 sans jeton vérifiés pour chacune.
- Le site n'a pas été publié : sa génération restera verrouillée par incompatibilité de version jusqu'à une publication coordonnée autorisée. Ce verrou n'a pas été contourné.
- Compilation de l'aperçu : OK. Vitest : 65 tests réussis ; Deno : 7 tests réussis. Le test e2e JS conservé ne peut pas démarrer ici (version du navigateur installée incompatible avec le runner) ; le même parcours a été exercé via Python Playwright.

## Prescription complète non activée

La couche applicative exige une physiologie explicitement relue. Le catalogue ne contient pas les contrats nécessaires pour tous les stimuli, les étapes de course, le trail et LCW. L'activation globale aurait bloqué les générations existantes ; elle n'a pas été faite. Le handler protège les appels portant le marqueur expérimental et refuse avant tout appel payant. La voie existante reste inchangée en dehors de cette garde et du contrat global.

Le traitement explicatif et ses contrôles sont installés mais non reliés à la voie de génération active. Aucun vrai plan ni comportement Gemini réel n'a été vérifié. Une préparation générique ne certifie pas la qualité sportive d'un plan complet.

## Préparation initiale (historique)

- Pure offline catalogue selection, budget/frequency caps, prerequisite and
  special-context approvals; mandatory explicit stimulus and domain inputs.
- Strict explanation-reference hydration rejecting prescription fields.
- Exact complete-week coverage assertion and global/window evidence merger.
- Unapplied candidate hook/panel patch preserving 33 global weeks when the
  current generation window is 15 weeks and showing the window objective.

## Tests actually run

Vitest: **56 passed** in four files:

- `controlledPrescription.offline.test.ts` — 41 tests.
- `controlledContractScope.offline.test.ts` — 4 tests.
- `useAITrainingPlan.prevalidation.test.tsx` — 5 existing tests.
- `prevalidation.test.ts` — 6 existing tests.

The objective parameterization covers compatible generic base fixtures for
5 km, 10 km, semi, marathon, trail, 70.3 and Ironman. This does not certify
the complete sporting behavior of those engines, nor LCW, race preparation,
intermediate bike/swim maintenance or actual Gemini output.

## État avant installation (historique, remplacé par l'état ci-dessus)

No candidate patch was applied, no frontend contract was activated, no provider
format correction was integrated, and no deterministic generator replaced the
current live path. No actual 33-week race-calendar generation was performed.
No authenticated browser flow was opened because athlete consultation can
write reliability scores. Patch applicability was not verified by Git: its
read-only `apply --check` command is refused in this environment.

Application/funtion code and the release declaration are untouched. The next
step requires explicit authorization for the coordinated release work on the
shared generation functions. Publication and real generation remain separate
authorizations. No database mutation, migration, deployment, publication,
Nolio operation or model call was performed.
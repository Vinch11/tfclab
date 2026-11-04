# DET V403 — sémantique typée des limiteurs (QA, scientificReview:false)

## Cause
- `engine.ts` comparait le primaire en minuscules (l.562/953) mais exactement `=== 'tte'` (V358, l.2074) : « TTE » de l'app ne déclenchait pas cet audit. Corrigé via `detPrimaryLimiterKey` (registre unique `v403-limiter-semantics.ts`).
- `unrecognizedByDet` lisait `LIMITER_LABELS` (affichage). Remplacé par `traceLimiterSemantics` (registre moteur) : priorités brutes conservées, traduction tracée (exact / case / accent_or_whitespace), aucune correspondance approximative.

## Durabilité ≠ TTE
- App (`unifiedLimiterDetection.ts` F-24) : même mesure (TTE effectif, min au seuil) vs cible relative à l'épreuve min(90,max(30,durée×fraction)); catégorie durability, levier app `increase_tte`.
- V3 `durability` = endurance LT1 (moderate_lt1) : autre domaine, NON accepté. Allure marathon (`race_pace_durability`) : non acceptée comme preuve de semaine de charge.
- Branche DET `durability_race_relative` : ordre de recherche sur créneaux clés prouvé par la preuve V353 (MLSS threshold_tolerance + fractional_utilization, ≥20 min Z4 exactes, levier de l'app) + audit bloquant par semaine de charge `det_v403_race_durability_coverage_*`. Distinct de TTE : la config garde « Durabilité » ⇒ le validateur natif vérifie le motif `durabilit` (sortie longue, simulation…), pas `tte` ; V358 non activé ; partie « relative à l'épreuve » prouvée seulement par la preuve pic V351 existante. Progression vers la cible en minutes : NON mesurée.
- Primaire non défini pour une famille qui lit le primaire (marathon) ⇒ `blocked_unsupported_limiter` avant toute écriture/solveur, avec éléments manquants. Secondaires non supportés : conservés, `retained_unsupported_secondary`.

## Résultats (vrai pipeline de la page, enregistrements synthétiques, revue des séances synthétique de test)
| Cas | Résultat |
|---|---|
| Semi 8/6 | ACCEPTÉ |
| Marathon 16/7, limiteurs app ["Durabilité","TTE"] inchangés | ACCEPTÉ (V403 vérifié, V351/V316 vérifiés, branche TTE primaire non activée), sauvegarde/réouverture OK |
| Marathon primaire « Durabilté » / « Foo » / « VLamax » | blocked_unsupported_limiter avant solveur |
| 70.3 12/9 profil complet | REFUS réel : brick S1 ≥140 min, 0 brique revue admissible (le pont réduit acceptait) |
| IM 16, semi 30 | refusés (inchangé) ; 10 km/5 km/trail/tri court non raccordés |

## Vérifications (2026-11-04)
- `npx vitest run src/lib/det` : 6 fichiers, 136/136.
- `npx vitest run src/lib/plan src/components/plan` : 119 fichiers ; seul échec `lovableBuild.test.ts` (déclaration périmée) → déclaration recalculée (releaseId 45a65c35…) puis 5/5.
- `npx vitest run -c vitest.experimental.config.ts experimental/det-engine/v35 …/v359 …/v360` : 16 fichiers, 116/116.
- tsgo 0 erreur ; ESLint 0 erreur.

## Transfert (QA → revue, aucune écriture main/prod)
SHA-256 : v403-limiter-semantics.ts a667072a…, engine.ts 49b8dfdf…, v401-coach-inputs-core.ts 3394f595…, coachDetRun.ts 0cc8fec5…, AthleteDetSimplePanel.tsx 4a43e38f…, planProvenance.ts df516986…, planReleaseManifest.ts 867e5ef3…, tests detLimiterSemantics 37401576…, appPlanningIntegration 2b332e84…, coachDetRun 84a51aef…, appPlanningInput 5c03155e…, athleteDetBridge 8b8b4d87….
Candidat CI : job `vitest` existant + étape `npx vitest run -c vitest.experimental.config.ts experimental/det-engine/v35 experimental/det-engine/v359 experimental/det-engine/v360` (non poussé).

## Bloqueur restant (C)
Revue humaine réelle des sources par famille : objet proposé = (famille, version catalogue V3 + empreintes `fingerprintV3SportingSource`, doses/bornes du pool, ancres requises) revu une fois en lecture groupée, lié au coach ; aucune case pré-cochée, aucune autorisation de prescription. Non implémenté ce tour.

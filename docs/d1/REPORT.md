> Suite D1.1 : [fiche courante](../d1.1/REPORT.md). Le rapport D1 ci-dessous reste l’historique de la première livraison.

# TFCLab — fiche unique Mission D1

**Verdict : NO-GO. 2/8 contrôles prouvés. Le parcours utilisable demandé n’est pas livré.**

Référence `main` : `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`.
Référence autorisée #420 : `234112a1fa713b796d1f41faf14819d5ab6d0171`.
SHA livré du code et de sa déclaration de source : `9b85228b03025ae567fbed9e774c3e1be673d3ac`.
Le commit documentaire suivant ajoute uniquement cette fiche et les preuves ; son SHA est donné dans la PR. La tête exacte se retrouve avec `git rev-parse origin/mission/d1` après fetch.

Travail commencé le 30/10/2026 vers 07:09 UTC ; clôture technique vers 07:23 UTC, moins d’une heure effective. Les jalons à 1 h et 6 h ne sont pas atteints ; le plafond de 8 h n’a pas été consommé. Arrêt anticipé du travail fonctionnel devant un conflit de contrat sportif démontré, dont la levée demanderait une fiche admissible supplémentaire ou un arbitrage sportif non autorisé. Aucun contournement ni élargissement de périmètre.

## C1–C8

| Contrôle | Statut | Résultat effectivement observé |
|---|---|---|
| C1 — Génération | **ÉCHOUÉ** | Trois profils exécutés dans Chromium ; chacun refuse en S2, `empty_catalogue_domain_week_2`. **0/28 jours** affichés pour chacun. Trois profils admissibles générant un bloc ne sont pas démontrés. |
| C2 — IA | **RÉUSSI** | Les trois clics déclenchent le moteur réel sans appel LLM ni fallback. Le relevé navigateur contient uniquement une requête externe de police Google, bloquée par le harnais ; aucune requête IA. Le rejeu moteur interdit aussi `fetch` et compte zéro appel. Portée : parcours D1 testé. |
| C3 — Déterminisme | **NON TESTÉ** | 20 répétitions par profil donnent des résultats complets identiques, mais ce sont des **refus**, pas des plans. Cela ne qualifie pas le déterminisme de plans de 28 jours. |
| C4 — Individualisation | **ÉCHOUÉ** | Les calculs existants transmettent `VLamax,TTE` / `TTE` / `VLamax,TTE`. Aucun calendrier n’est construit ; application effective des limiteurs aux séances non démontrée. Aucune estimation manquante ajoutée. |
| C5 — Sécurité | **NON TESTÉ** | Gardes de périmètre et refus existants exercés, six assertions négatives ciblées ; refus de contrat brick observé. La matrice complète des scénarios négatifs critiques, notamment incertitudes, capacités et récupération défavorable jusqu’à l’interface, n’est pas prouvée. |
| C6 — Séances | **NON TESTÉ** | Aucun bloc ni séance prescriptible obtenu. L’adaptateur indique explicitement `prescriptible:false` et le besoin d’attester durée/dose/intensité/récupération. Ce refus global n’est pas une preuve de complétude des séances. |
| C7 — Persistance | **NON TESTÉ** | Aucun projet Supabase ni compte de test autorisé configuré. Pas de sauvegarde, de réouverture indépendante ou de simulation de preuve. La sauvegarde est explicitement indisponible. Seules des notes de revue en mémoire ont été modifiées ; **aucune modification de séance livrée**. |
| C8 — Intégration | **RÉUSSI** | Flag `VITE_TFCL_D1` absent/désactivé par défaut, comparaison stricte à `true`, chargement du panneau à la demande. 70 tests ciblés réussis, TypeScript et build par défaut réussis. Fonctions IA, catalogue, contrats et lock non modifiés. Pas d’attestation de toutes les fonctionnalités historiques. |

## Reproduction et preuves

Fixtures : [fixtures.json](fixtures.json), matérialisées par `src/lib/plan/d1/fixtures.ts` à partir des générateurs synthétiques existants de `main`. Trois archétypes fixes, objectif `703`, niveau manuel `trained`, ambition `age_group`, historique synthétique connu, contraintes `unrestricted`, début `2026-10-26`, seed catalogue 0, plafond de recherche 20 000 nœuds. Aucun paramètre physiologique ajusté pour obtenir un succès.

Le premier raccord avait tronqué l’horizon à quatre semaines, faisant refuser la course déclarée en S12 (`declared_event_outside_plan`). La correction conserve la préparation native de 12 semaines et sa course, puis prévoit de projeter ses quatre premières semaines. L’amendement est explicite dans le manifeste ; les calculs, doses, politiques et règles d’admissibilité sont inchangés. Le moteur refuse ensuite dès S2, avant de retourner un calendrier complet.

Pour C2 :

```sh
npx playwright install chromium
npx playwright test --config playwright.d1.config.ts
npx vitest run src/lib/plan/d1/generateBlock.test.ts
```

Le premier test démarre Vite avec `VITE_TFCL_D1=true`, ouvre `/__e2e/d1`, sélectionne chaque profil, clique « Générer le bloc sans IA », relève le statut réel et modifie des notes. Résultat : un test navigateur réussi **de collecte des refus**, zéro appel modèle. Le second exécute 60 appels moteur et les gardes négatives, sans réseau. Ces tests verts ne signifient pas C1 réussi.

Preuves : [trace et requêtes](evidence/browser/run.json), [journal Chromium](evidence/browser-test-authorized.txt), [cohorte, entrées, versions et refus](evidence/cohort.json), [trace Playwright complète](evidence/browser/playwright/d1-block-D1-real-browser-c-968c9-twork-trace-and-coach-notes/trace.zip).
Captures réelles : [aérobie](evidence/browser/aerobic_dominant.png), [glycolytique](evidence/browser/glycolytic_dominant.png), [équilibré](evidence/browser/balanced_typical.png).

Pour C8 :

```sh
npx vitest run src/lib/plan/d1/generateBlock.test.ts src/components/D1BlockPanel.test.tsx src/lib/plan/d1/domainDiagnostic.test.ts src/lib/plan/__tests__/prevalidation.test.ts src/lib/plan/__tests__/prevalidation.physiologicalFailure.test.ts src/engines/plan/__tests__/prepareTrainingPlanContext.test.ts src/engines/plan/__tests__/sessionSizingMatrix.test.ts src/hooks/__tests__/useAITrainingPlan.prevalidation.test.tsx src/pages/__tests__/aiTrainingPlanAutoPlanDisplay.guard.test.ts src/pages/__tests__/aiTrainingPlanRaceGoalsPersistence.guard.test.ts
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Résultats : **10 fichiers / 70 tests réussis**, TypeScript sortie 0, build sortie 0 avec D1 désactivé. [Tests finaux](evidence/final-tests.txt), [TypeScript](evidence/types-delivery.txt), [build final](evidence/build-default-final.txt).

Le premier build de la branche a refusé une déclaration de source périmée. Correction via la procédure existante `node scripts/preproduction/plan-release-source.mjs --write`, sans désactiver le contrôle. Seules les empreintes frontend et release changent ; contrat, catalogue, lock et fonctions Edge IA conservent leurs empreintes. Le build de `main` dans un worktree indépendant réussit également : [baseline](evidence/build-main-baseline.txt). Aucun déploiement effectué.

Installation : `npm ci --ignore-scripts` échoue sur `main` car package.json et package-lock.json ne sont pas synchronisés (dépendances manquantes et versions incompatibles). Pour la session : `npm install --ignore-scripts --package-lock=false --no-audit --no-fund`, sans modification des manifests/verrous. Versions observées : [arbre](evidence/dependency-tree.json), [lock installé](evidence/installed-dependency-lock.json), [journal](evidence/dependency-install.txt). Node 24.19.0, Vite 5.4.21, Vitest 4.1.12. Le rejeu depuis une installation fraîche n’est pas garanti par le lock de `main` : défaut résiduel, pas masqué.

## Obstacle exact et prochain correctif minimal

Commande diagnostique :

```sh
npx vitest run src/lib/plan/d1/domainDiagnostic.test.ts
```

[Diagnostic complet](evidence/domain-diagnostic.json) : pour les trois profils, S2 est en phase base et exige un créneau `brick`, long/key, **minimum 100 min**. Le moteur expose deux fiches admissibles :

| Fiche | Plage source | Durée minimale demandée | Résultat natif |
|---|---|---|---|
| BRICK_STAGE1_INTRO | 60–90 min | 100 min | `catalogue_duration` |
| BRICK_ACTIVATION_PRE_RACE | 30–50 min | 100 min | `catalogue_duration` |

Le diagnostic recense aussi toutes les fiches brick de la bibliothèque, au-delà de la sélection préparée. Les autres fiches de durée suffisante sont refusées par la phase base, l’objectif ou des métadonnées incomplètes. Il ne s’agit donc pas simplement d’un ID oublié dans le raccord. Aucune fiche n’a été étendue à 100 min, aucune phase réétiquetée et aucun minimum réduit. Pas de compensation automatique.

**Prochain correctif minimal :** résoudre ce seul conflit quota/catalogue avec une fiche existante dont les sources démontrent une admissibilité base 70.3 à au moins 100 min, ou obtenir un arbitrage sportif explicite du contrat concerné. L’existence d’une telle fiche complète n’est pas démontrée. Ne pas changer le minimum ou la phase pour faire passer la recette. Rejouer ensuite les mêmes fixtures avant d’achever le raccord de modification des séances et de persistance sur un environnement de test autorisé. Aucun de ces changements sportifs ou de persistance n’est présenté comme effectué.

## Défauts résiduels

| Gravité | Défaut | Effet |
|---|---|---|
| Bloquant | Domaine brick base vide à partir de S2 | Aucun bloc de 28 jours utilisable. |
| Bloquant | Contrats individuels complets des séances non attestés | Prescription interdite ; aucun succès C6 revendiqué. |
| Majeur | Modification de séances et persistance non raccordées ; environnement de test absent | C7 non vérifiable ; seul un champ de notes en mémoire existe. |
| Majeur | Individualisation de calendriers et déterminisme de plans non observables | C3/C4 ne peuvent être qualifiés par les refus répétés. |
| Majeur | Matrice de refus critiques incomplètement exécutée sur D1 | C5 non qualifié. |
| Modéré | Lock npm de main désynchronisé | Installation fraîche non reproductible par `npm ci` ; versions de session archivées. |

## Limites de livraison

Inventaire limité au raccord page/assembleur/catalogue/validation, aux fixtures et aux métadonnées de build nécessaires. Seul `experimental/det-engine/engine.ts` est repris de #420 : blob Git `7ed998dc786220108bf6e380bc0875a572d6a190`, identique octet pour octet à la référence autorisée. Les autres fichiers expérimentaux lus n’ont pas été importés. [Empreintes sources](evidence/source-hashes.json).

Aucune formule physiologique recalibrée, aucun travail #425 importé ou validé, aucune politique sportive modifiée. Aucun appel Nolio, aucune migration ou extension Supabase, aucune fusion, publication d’application ou modification de production. La PR est un brouillon de raccord et de diagnostic, pas une livraison fonctionnelle D1.

Les tests unitaires ne prouvent ni une intégration réussie, ni une validation scientifique, ni une autorisation de prescription individuelle. Le navigateur prouve ici des **refus réellement affichés**. **GO D1 refusé : 8/8 preuves exigées, 2/8 obtenues.**

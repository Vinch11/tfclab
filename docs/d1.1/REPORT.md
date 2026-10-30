# TFCLab — D1.1 : génération réelle, résultat de livraison

**DRAFT / NO-GO. Objectif principal non atteint : zéro calendrier utilisable de 28 jours produit.**

PR poursuivie : [#427](https://github.com/Vinch11/tfclab/pull/427), branche `mission/d1`, sans fusion.
Départ D1 : `b984096d25c47509590a24c4535a5ff9b41d0536`.
Référence main et physiologie conservée : `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`.
Référence DET ENGINE : `234112a1fa713b796d1f41faf14819d5ab6d0171` ; fichier moteur repris inchangé.
Code D1.1 livré : `31a9bceabf6df69af50146d3f5541a967cdac16f`. Le commit documentaire suivant ajoute cette fiche et les preuves ; sa référence exacte figure dans la PR.

## 1. Conflit brick : avant / après

Le rapport et les diagnostics D1 ont été lus avant modification. La recherche reste limitée au contrat brick, aux sources déjà disponibles et au raccord D1. Aucun moteur nouveau, aucun ajout au catalogue global.

**Origine exacte.** `sessionSizingMatrix.ts:100` exige un brick hebdomadaire pour 703/age_group (commit `57ceeb1eba…`). `weeklySlotLayout.ts:171–188`, commit `d32e6567d2fc418f16ad8c9a1a3513d0b5578e98` du 14/07/2026, transforme le brick en remplacement de la sortie longue vélo et impose `slLongRideMin + 20`. Le validateur `validateWeeklyQuotas.ts:79` reprend la même convention. [Trace git blame](evidence/brick-origin.txt).

Le minimum n’est donc pas issu d’une recette brick : nominal vélo 120 min → rampe existante `0,60 × 1,10^(S−1)`, plafonnée et arrondie à 5 min → S2 vélo 80 min → brick 100 min. Le palier initial 0,60 provient de la réduction prudente au niveau effectif light face au snapshot synthétique de 120 TSS/7j, malgré le niveau manuel trained. Les trois profils D1 gardent ces mêmes entrées.

| Semaine | Plancher vélo natif | Minimum brick natif | Maximum vélo de la source base | Enveloppe totale source |
|---|---:|---:|---:|---:|
| S1 | 70 min | 90 min | 60 min | 60–90 min |
| S2 | 80 min | 100 min | 60 min | 60–90 min |
| S3 | 85 min | 105 min | 60 min | 60–90 min |
| S4 | 70 min | 90 min | 60 min | 60–90 min |

**Justification sportive examinée.** La matrice cite globalement Friel, Olbrecht et des pratiques Lorang/norvégiennes. Le code ne relie aucune page, observation individuelle ou étude au chiffre exact `+20`, à son rôle de remplacement de la sortie longue, ni à une obligation de 100 min en base dès S2. Les références renforcement/taper ne justifient pas ces valeurs. Leur provenance dans un ancien commit, même co-signé, n’est pas une preuve scientifique ni une nouvelle autorisation. L’existence d’un objectif 70.3 ne démontre pas la tolérance actuelle au brick long.

**Recherche de modèle.** Le diagnostic D1 recense l’ensemble des fiches brick, pas seulement les fiches sélectionnées. Aucun modèle long admissible de base avec une prescription complète n’y est démontré. `BRICK_FAST_FINISH` est explicitement peak et contient Z3 ; les modèles spécifiques 70.3/build/peak ne sont pas réétiquetés base. Les deux fiches admises dans le domaine D1 plafonnent à 90 et 50 min. Aucune source nouvelle scientifiquement justifiée pour un brick base de 100–105 min n’a été fournie pendant la mission.

| Élément | Avant D1 | Après D1.1 |
|---|---|---|
| Quota / minimum brick | S2 100 min | Identique, jamais abaissé |
| Source base | Texte vélo 45–60 / course 15–20, enveloppe 60–90 | Mêmes bornes, compilateur structuré à paramètres explicites |
| Problème visible | Domaine vide en S2 | Même refus réel, origine et composantes exposées dans l’interface |
| Limite supplémentaire | Durée globale seule | Vélo source ≤60 min : ne remplace déjà pas le vélo long ≥70 min de S1 |
| Génération | Aucun calendrier complet | Aucun calendrier complet ; pas de faux succès |

**Arbitrage nécessaire.** [Décision concrète à soumettre au coach](COACH_DECISION.md) : valider un contrat long réellement de base avec ses doses/conditions/progression, ou autoriser la séparation brick court et sortie longue avec révision explicite du comptage et des budgets. Aucun choix appliqué. Un simple allongement de Stage 1, une transition utilisée pour combler le vélo manquant ou un changement de phase serait un contournement.

## 2. Modèle paramétrable livré et portée

[Description complète](MODEL.md) ; code `src/lib/workouts/v2/brickBase703.ts`, ID `brick-base-703-v2`, version 1.0.0.

Le modèle **réutilise Stage 1**, avec vélo 45–60 min Z2 facile / `moderate_lt1`, course 15–20 min Z1 très facile / `recovery`, enveloppe 60–90 min. Il n’invente pas une nouvelle borne supérieure à 100 min. Son objectif demeure l’adaptation aux sensations de transition en base.

Chaque discipline reçoit explicitement échauffement/corps/retour au calme ; la transition est un segment séparé avec durée et consignes déclarées. Chaque segment possède discipline, rôle, secondes entières, répétition unique, récupération entre répétitions nulle et intensité de doctrine. Les ancres individuelles avec provenance, capacités actuelles, récupération favorable, disponibilité, minimum vélo, minimum total, revue coach et monitoring sont obligatoires. Les dates de preuves ne peuvent dépasser la date d’évaluation. Aucune durée inconnue n’est estimée ou remplacée par zéro.

Aucune progression automatique. Toute augmentation par rapport à une exposition déclarée exige une revue explicite et ne peut dépasser source/capacité/disponibilité. Il s’agit d’un compilateur pour revue, **pas d’une autorisation de prescription individuelle**. La partition échauffement/corps/retour au calme est fournie par le coach ; elle n’est pas présentée comme écrite dans la source d’origine ou optimisée par un calcul physiologique.

[Exemple calculable](evidence/template-example.json) : 60 min vélo + 2 min transition + 20 min course = **82 min**, dont 80 min d’exercice, sept segments. Toutes les données de cet exemple sont **synthétiques supplémentaires**, distinctes des trois profils D1 ; elles ne servent pas à lever leurs refus. Le modèle restitue explicitement `individualPrescriptionApproved:false` et `scientificallyValidated:false`.

Le type `StructuredSegment` et le contrat source/paramètres/contexte/refus constituent une première référence réutilisable pour les vingt modèles prévus. Aucun chantier de bibliothèque généralisée, aucun registre global ou moteur concurrent. Ce modèle n’est pas injecté dans le calendrier tant que son rôle et les paramètres individuels ne satisfont pas les contraintes natives.

## 3. Trois générations et déterminisme

Commande exécutée :

```sh
npx vitest run src/lib/plan/d1/d11Acceptance.test.ts
npx playwright test --config playwright.d11.config.ts
```

Le premier test compare explicitement chaque couple athlète/configuration aux entrées archivées dans `docs/d1/evidence/cohort.json` et vérifie leur immutabilité avant/après. Les fixtures D1 ne sont pas modifiées. Le second clique réellement dans Chromium sur le générateur, pour les trois profils, et ouvre le diagnostic brick.

| Profil D1 inchangé | Jours calendaires complets | Résultat | Répétitions du résultat | Comparaisons de plans complets |
|---|---:|---|---:|---:|
| Dominante aérobie | 0 / 28 | `refused: empty_catalogue_domain_week_2` | 20 identiques | **0** |
| Dominante glycolytique | 0 / 28 | Même refus | 20 identiques | **0** |
| Équilibré | 0 / 28 | Même refus | 20 identiques | **0** |

[Entrées complètes, empreintes et résultats des 60 appels](evidence/cohort.json). `successful28DayPlans=0`, `planDeterminismProven=false`. Les champs calendrier/doses demeurent absents ; aucune durée ou séance fictive n’est produite pour remplir 28 jours. Les trois refus identiques ne sont pas qualifiés de déterminisme de plans.

**Individualisation : non démontrée.** L’ordre des limiteurs reste `VLamax,TTE` / `TTE` / `VLamax,TTE`. En l’absence de calendriers complets, il n’existe aucune comparaison probante des doses ou des différences d’entraînement. Le nouveau modèle ne transforme pas un score limiteur en minutes, ne revendique pas une individualisation par rotation et conserve cette limite explicitement dans sa sortie.

Parcours réel : [trace réseau et textes affichés](evidence/browser/run.json), [journal Chromium](evidence/browser-tests.txt), [trace Playwright](evidence/browser/playwright/d11-block-D1-1-actual-unch-2b5fe--and-pending-coach-decision/trace.zip).
Captures : [aérobie](evidence/browser/aerobic_dominant.png), [glycolytique](evidence/browser/glycolytic_dominant.png), [équilibré](evidence/browser/balanced_typical.png).

## 4. C1–C8

| Contrôle | Statut | Preuve ou limitation |
|---|---|---|
| C1 Génération | **ÉCHOUÉ** | Chromium exécuté, 0/28 jours pour chacun des trois profils ; refus conservé. |
| C2 Zéro IA | **RÉUSSI** | 60 appels moteur avec `fetch` interdit ; zéro appel réseau. Chromium trace seulement la police Google externe bloquée, aucun LLM, fallback ou Nolio. Nouveau compilateur pur sans réseau, test également protégé par `fetch` interdit. |
| C3 Déterminisme de plans | **NON TESTÉ** | 20 résultats identiques par profil, mais zéro plan complet comparé ; les refus ne qualifient pas C3. |
| C4 Individualisation | **ÉCHOUÉ** | Limiteurs transmis, aucun calendrier ni différence de dose démontrés. |
| C5 Sécurité du bloc | **NON TESTÉ** | Tests négatifs du modèle exécutés ; les scénarios critiques ne sont pas tous exercés sur un bloc D1 complet, absent. Aucun assouplissement. |
| C6 Complétude des séances générées | **NON TESTÉ** | Un exemple V2 synthétique à sept segments est complet ; aucun bloc D1 complet prescriptible. Le succès de ce modèle isolé ne qualifie pas toutes les séances. |
| C7 Persistance | **NON TESTÉ** | Aucun environnement isolé autorisé configuré, aucune sauvegarde/fermeture/réouverture en base. Bouton explicitement indisponible, pas de simulation. |
| C8 Intégration | **RÉUSSI** | Flag toujours désactivé par défaut ; régressions pertinentes, TypeScript et build réussis. DET ENGINE, physiologie/doctrine, quotas, catalogue et fixtures préservés. |

Pour C2 et C8, commandes reproductibles et résultats :

```sh
# Suite ciblée : 114 tests passent avant ajout du dernier garde de date du modèle.
npx vitest run src/lib/workouts/v2/brickBase703.test.ts src/lib/plan/d1/d11Acceptance.test.ts src/components/D1BlockPanel.test.tsx src/lib/plan/__tests__/prevalidation.test.ts src/lib/plan/__tests__/prevalidation.physiologicalFailure.test.ts src/engines/plan/__tests__/prepareTrainingPlanContext.test.ts src/engines/plan/__tests__/sessionSizingMatrix.test.ts src/engines/plan/__tests__/weeklySlotLayout.test.ts src/hooks/__tests__/useAITrainingPlan.prevalidation.test.tsx src/pages/__tests__/aiTrainingPlanAutoPlanDisplay.guard.test.ts src/pages/__tests__/aiTrainingPlanRaceGoalsPersistence.guard.test.ts
# Version finale du modèle : 17 tests passent, remplaçant ses 16 tests précédents.
npx vitest run src/lib/workouts/v2/brickBase703.test.ts
npx tsc --noEmit -p tsconfig.app.json
npm run build
npx playwright test --config playwright.d11.config.ts
```

[Suite ciblée, 11 fichiers/114 tests](evidence/final-tests.txt), [modèle final, 17 tests](evidence/model-tests-final.txt), [TypeScript sortie 0](evidence/types-final.txt), [build sortie 0](evidence/build.txt). Ces comptes ne sont pas additionnés comme des tests distincts rejoués. La commande combinée sur la tête finale attend 115 tests après le garde de date supplémentaire ; le journal combiné archivé est celui de 114, pas une exécution prétendue à 115.

Le modèle final refuse notamment : créneau 100 min ; total compatible mais composante vélo insuffisante ; extension vélo ; transition inconnue ; durée inconnue ; ancre absente ; récupération inconnue/défavorable ; capacité ou disponibilité dépassée ; discipline indisponible ; preuve future ou revue périmée ; progression non revue ; changement de phase vers peak. Aucune création compensatoire.

La déclaration de source frontend a été régénérée par `node scripts/preproduction/plan-release-source.mjs --write`, conformément au build existant. Catalogue, contrats, lock et fonctions Edge gardent leurs empreintes. [Preuve de conservation](evidence/preservation.json). L’installation de cette session réutilise celle documentée dans D1 ; le problème npm ci/package-lock préexistant n’est pas prétendu corrigé.

## 5. Blocages résiduels et décision suivante

| Gravité | Blocage | Correctif minimal requis |
|---|---|---|
| Bloquant | Brick = sortie longue mais source base vélo ≤60 min contre floor 70–85 | Arbitrage coach du rôle, puis contrat source de base long validé ou séparation explicite du comptage/placement ; aucune option appliquée. |
| Bloquant | Aucune génération complète | Rejouer les trois mêmes profils après résolution autorisée du conflit, puis 20 comparaisons des plans complets. |
| Majeur | Capacités/récupération/prescriptions paramétriques individuelles non fournies dans les profils D1 | Fournir des preuves explicites sans inférer une tolérance depuis la disponibilité ou un score favorable. Ne pas modifier rétroactivement les fixtures pour annoncer un succès. |
| Majeur | Individualisation effective non prouvée | Comparer calendriers/doses et décisions causales lorsque des plans existent ; pas de simple rotation. |
| Majeur | Complétude de toutes les autres séances non prouvée | Vérifier tous les contrats des séances réellement retenues ; le modèle brick seul ne suffit pas. |
| Majeur | Persistance/modification de séances D1 toujours absentes | Raccord ciblé et vraie recette sur environnement isolé autorisé. |
| Modéré | Lock npm préexistant désynchronisé | Problème d’installation documenté en D1, inchangé. |

L’orientation coach a été demandée à partir du dossier concret ; aucune réponse ou validation sportive n’est présumée. Aucun changement implicite des bornes, de phase, des plafonds ou des règles d’admissibilité. Aucun LLM de génération, appel Nolio, écriture de production, migration, publication d’application ou fusion. La PR reste **DRAFT / NO-GO : 2/8 critères prouvés**.

Les tests isolés et refus réussis ne prouvent ni une génération de 28 jours, ni une validation scientifique, ni une autorisation de prescription individuelle.

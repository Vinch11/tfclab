# Approbation coach des séances avancées — parcours de production

Périmètre : moteur IA de TFCLab 2.1 (génération complète et régénérations). Aucun appel modèle, aucune génération de plan, aucun déploiement de fonction, aucune migration de base, aucune donnée athlète lue ou écrite. Le moteur déterministe et la prescription contrôlée ne sont pas touchés.

Ce document complète `docs/revue-lactate-norvegien-2026-11-09.md`, qui notait : « Le parcours d'approbation n'est pas construit : ces fiches demeurent donc fermées dans l'app réelle. » Ce parcours est construit ici, **sans modifier aucune des décisions de cette revue**.

## Cause démontrée

`workoutSafetyPrerequisites.ts` réserve 30 fiches (tests maximaux, sprints all-out, doubles journées, navettes en domaine sévère, charges lourdes) à une revue coach nominative : `requireExplicitCoachApproval`. Le garde-fou commun `isLevelPrerequisiteIncompatible` sait lire cette décision dans `approvedAdvancedSessionIds`.

Aucun code de production ne renseignait ce champ : seuls des tests et le laboratoire QA l'écrivaient. Ces 30 fiches étaient donc écartées du catalogue transmis au modèle et des substitutions, quel que soit le profil.

## Décisions de la revue du 9 novembre, reprises telles quelles

La liste approuvable n'est pas écrite à la main : elle est dérivée des tables d'audit (`requireExplicitCoachApproval` et non `blockAutomaticSelection`). Elle a donc suivi la revue sans intervention :

| Décision de la revue | Effet sur ce parcours |
|---|---|
| `B_RUN_LACTATE_SHUTTLE` (navette course au seuil) passe en sélection automatique bloquée, « même avec un accord nominatif » | **Non approuvable.** Absente du panneau, écartée si elle est glissée dans la liste, jamais transmise au modèle. Tests dédiés. |
| Cinq fiches norvégiennes de double journée reçoivent l'approbation nominative | Approuvables. Le double seuil complet garde son niveau « très chargé » et ses 8 h/sem : l'approbation ne les lève pas, et le panneau l'affiche. |
| Navettes sévères (`ENR_RUN_LACTATE_CLEARANCE`, `ENR_BIKE_LACTATE_SHUTTLE`) et test lactate : approbation conservée | Approuvables. |

Deux écarts constatés par rapport au texte de la revue, sans conséquence sur ses décisions :

* La revue indique que `ENR_RUN_NORWEGIAN_4X8`, `ENR_RUN_NORWEGIAN_5X6` et `ENR_BIKE_NORWEGIAN_5X5` « n'existent pas dans la bibliothèque actuelle ». Elles y figurent : un test vérifie que les 30 fiches approuvables existent dans `WorkoutLibrary` avec leur texte.
* La règle d'`AGENTS.md` « unrepresented qualitative exclusions stay automatically blocked » est respectée : ce parcours ne rend approuvable aucune fiche `blockAutomaticSelection`.

## Ce qui a été livré

**1. Un seul point d'entrée de la décision** — `src/lib/plan/advancedSessionApproval.ts`

* `APPROVABLE_ADVANCED_SESSION_IDS` : liste fermée dérivée des tables. Un test gèle la liste actuelle (30) pour qu'un ajout ou un retrait soit relu.
* `sanitizeApprovedAdvancedSessionIds` : tout ID hors liste est écarté, à trois frontières (état du formulaire, restauration `localStorage`, constructeur de configuration) puis une dernière fois dans le constructeur de signal.
* `buildLevelPrerequisiteSignal` : construit le signal de niveau transmis au catalogue et au réconciliateur. Il remplace quatre constructions manuelles du même objet (génération complète, deux catalogues de régénération, traçabilité QA).
* `evaluateAdvancedSessionApproval` : dit si cocher une fiche aura un effet pour un profil donné. Le verdict vient du garde-fou lui-même ; la raison affichée n'est qu'une explication. Un test vérifie sur 30 fiches × 5 niveaux × 5 sources × 3 volumes qu'ils ne divergent jamais.

**2. Le transport jusqu'à la génération**

`PlanFormConfig.approvedAdvancedSessionIds` → `buildPlanConfigFromDiagnostic` (filtré) → `PlanConfig.approvedAdvancedSessionIds` → `prepareGenerationContracts` → catalogues par phase et par chunk + réconciliateur de la génération complète. Les catalogues de régénération (semaine et fenêtre) utilisent le même constructeur.

**3. L'écran coach** — `AdvancedSessionApprovalPanel`, page « Plan IA », sous « Verrouiller l'ambition »

* Panneau replié par défaut, compteur visible (« Aucune approuvée » / « N approuvées »).
* 30 fiches groupées par sport (course 15, vélo 8, natation 2, renforcement 5). Pour chacune : intitulé, identifiant, durée, minimums de niveau et de volume, et les champs `when` / `avoid` **tels qu'écrits dans la bibliothèque** — le coach approuve en lisant la fiche, pas un résumé.
* Effet annoncé pour le profil réel de l'athlète (même résolution niveau / source / heures que le plan) :
  * niveau non vérifié (« Auto » sans TSS 7 j exploitable) → alerte unique : les approbations n'auront aucun effet ;
  * niveau ou volume minimal non atteint → « Sans effet pour ce profil » sous la fiche, avec le minimum exigé ;
  * niveau débutant vérifié → mise en garde non bloquante, plus le blocage nominatif des fiches qui restent fermées.
* L'approbation est propre à l'athlète affiché : remise à zéro au changement d'athlète, jamais transmise en mode multi-athlètes.

**4. Un resserrement du garde-fou** — `levelPrerequisiteCompatibility.ts`, une ligne

Une fiche de l'axe historique « débutant » reste fermée à un niveau débutant vérifié (`untrained` / `light`), même approuvée. Sans cette ligne, approuver `KENYAN_WEEK_STRUCTURE_MARATHON` ou `NORWEGIAN_WEEK_STRUCTURE_RUN` aurait rouvert à un débutant une fiche que l'invariant existant de l'Axe C garde fermée. Le changement est strictement plus restrictif : aucune fiche n'est rendue éligible par lui. C'est la seule modification du garde-fou ; les tests de la revue (`lactateNorwegianReview`, `reconcilerNorwegianApproval`) passent inchangés.

**5. Une règle dans `AGENTS.md`** pour que tout outil travaillant sur ce dépôt passe par ce module plutôt que d'écrire des IDs bruts dans le signal.

## Pourquoi cette forme

* **Liste fermée avant le garde-fou.** Le garde-fou conserve une branche historique où un ID approuvé *sans* `requireExplicitCoachApproval` contourne les contrôles de niveau et de volume. Exposer un champ libre aurait donné à l'écran ce pouvoir de dérogation. Le filtrage en amont rend cette branche inatteignable depuis la production ; un test le vérifie avec une liste hostile.
* **Le profil reste une preuve.** Les 30 fiches exigent `requireVerifiedProfile`. Une approbation sur un niveau « Auto » sans TSS ne produit rien, et l'écran le dit avant que le coach ne coche.
* **Aucune règle recopiée dans l'interface.** Ce que le panneau annonce est calculé par le garde-fou ; si une table change, le panneau suit — c'est ce qui s'est produit avec la revue du 9 novembre.

## Ce que l'approbation produit réellement

Approuver rend la fiche **éligible** au garde-fou. Cela ne garantit ni qu'elle entre dans le catalogue transmis au modèle, ni que le modèle la choisisse.

Mesure sur le catalogue course à pied plafonné comme à la génération d'une phase (`strictPhaseFilter`, `maxItems: 80`, semaines 7–9 d'un plan de 16, profil « Très chargé » manuel, 10 h/sem, **une seule fiche approuvée à la fois**). Position dans le catalogue, ou étape qui l'écarte :

| Fiche approuvée | 5 km build | 5 km peak | 10 km build | 10 km peak | Semi build | Semi peak | Marathon build | Marathon peak |
|---|---|---|---|---|---|---|---|---|
| `BILLAT_RUN_LACTATE_TOLERANCE` | 61/66 | 15/61 | plafond | 53/61 | plafond | 54/61 | plafond | 28/61 |
| `ENR_RUN_LACTATE_CLEARANCE` | plafond | phase | plafond | phase | plafond | phase | 61/66 | phase |
| `NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY` | 21/66 | phase | 34/66 | phase | 35/66 | phase | plafond | phase |
| `NORWEGIAN_RUN_THRESHOLD_LOW_AM` | 25/66 | phase | plafond | phase | plafond | phase | plafond | phase |
| `NORWEGIAN_RUN_THRESHOLD_HIGH_PM` | plafond | phase | plafond | phase | plafond | phase | plafond | phase |
| `NORWEGIAN_WEEK_STRUCTURE_RUN` | 15/66 | phase | 64/66 | phase | 65/66 | phase | plafond | phase |
| `V2_RUN_SPRINT_PLAT` | 24/66 | phase | plafond | phase | plafond | phase | plafond | phase |
| `KENYAN_WEEK_STRUCTURE_MARATHON` | plafond | phase | 61/66 | phase | 62/66 | phase | plafond | phase |

« phase » = la fiche n'est pas déclarée pour cette phase (`phase_filter`). « plafond » = la fiche passe le garde-fou mais le plafond par sport ou par catégorie de la phase de complément est atteint avant son rang de score (`fill_sport_cap` / `fill_cat_cap`) ; indépendant de `maxItems`. Sans approbation : absente partout.

Lecture : sur 10 km et semi en build, cinq de ces huit fiches n'atteignent pas le modèle même approuvées. C'est le classement du catalogue qui décide, pas le garde-fou. Ce classement n'a pas été modifié ici : y toucher changerait tous les plans, pas seulement ceux d'un athlète approuvé. La mesure dépend des options (semaines, limiteurs, rotation, historique) ; un plan réel peut différer.

## Ce qui N'EST PAS fait, délibérément

* **Navette lactate course au seuil** (`B_RUN_LACTATE_SHUTTLE`) : laissée bloquée, conformément à la revue. La rendre approuvable reviendrait à défaire cette décision ; ce n'est pas à ce parcours de le faire. Le point reste ouvert dans `roadmap.md`.
* **Hypoxie et exposition à la chaleur** : jamais approuvables, jamais affichées.
* **Dérogation** (approuver une fiche qui n'exige pas de revue nominative pour contourner son niveau minimal) : non exposée.
* **Moteur déterministe et prescription contrôlée** (`controlledPrescription.ts`) : inchangés, ils continuent d'exclure ces fiches.
* **Classement, plafonds et socle du catalogue, prompts, code des fonctions serveur** : inchangés. Le catalogue est construit côté navigateur.
* **Mode multi-athlètes** : aucune approbation transmise ; une même liste ne vaut pas pour un groupe.
* **Persistance en base** : les approbations vivent dans l'état local du formulaire (`localStorage`, par athlète), enregistré comme le reste du formulaire une fois un plan généré. Elles ne suivent pas le coach sur un autre appareil et ne laissent pas de trace d'audit serveur.
* **Substitutions du réconciliateur en régénération d'une seule semaine** : ce réconciliateur ne reçoit aucun signal de niveau (comportement antérieur, non modifié) ; il ne réintroduit donc jamais une fiche approuvée. Le catalogue proposé au modèle, lui, porte bien les approbations.

## Mise en production — à faire au moment de la fusion, pas avant

Le frontend et les fonctions `ai-training-plan` / `ai-training-plan-test` comparent leur empreinte de version avant toute génération (`planReleasePreflight.ts`, `planReleaseInfo.ts`). Cette branche modifie des sources du frontend et un fichier du contrat (`prepareGenerationContracts.ts`) : la déclaration `planReleaseManifest.ts` a été régénérée (`node scripts/preproduction/plan-release-source.mjs --write`, puis vérifiée fraîche).

Conséquence : publier ce frontend **sans redéployer les deux fonctions depuis le même commit** fait échouer toute génération avec `PLAN_RELEASE_MISMATCH` (« Versions frontend/serveur incompatibles »). Rien n'a été déployé depuis cette branche. Si `main` avance avant la fusion, la déclaration doit être régénérée après la fusion.

## Limites connues

* **Débutant vérifié.** Hors les fiches signalées sous leur carte (niveau ou volume minimal, axe historique), une fiche approuvée devient éligible pour un profil « Pas du tout » ou « Un peu entraîné » saisi manuellement : les tables d'audit ne leur fixent pas de niveau minimal. Le panneau affiche une mise en garde ; la décision reste celle du coach. Fixer un niveau minimal par fiche est une décision d'audit, à prendre dans `workoutSafetyPrerequisites.ts`.
* **Conditions qualitatives.** Le coach atteste avoir lu le champ « À éviter » de la fiche ; l'application ne vérifie pas ces conditions (fatigue, blessure récente, historique). C'est le même constat que celui qui a conduit la revue à bloquer la navette au seuil : pour les fiches approuvables, la vérification est humaine.
* **Traçabilité QA.** `sessionPhysiologicalTraceability` utilise désormais le même signal que la génération (heures hebdomadaires et approbations comprises). Effet de bord : une fiche à `minimumWeeklyHours` était auparavant toujours signalée, faute d'heures transmises ; elle est maintenant évaluée avec le volume réel.

## Corrections communes / spécifiques, disciplines testées

* **Commun à tous les objectifs** : module d'approbation, transport, panneau, resserrement du garde-fou.
* **Spécifique** : aucune règle propre à une discipline.
* **Testé sans modèle** sur 5 km, 10 km, semi-marathon, marathon, trail, Half et Ironman : sans approbation aucune fiche à revue n'entre au catalogue ; tout approuver sur un profil non vérifié n'ouvre rien ; hypoxie, chaleur et navette au seuil restent fermées, tout approuvé ; une approbation n'ouvre que la fiche nommée.
* **Catalogue plafonné** : mesuré en course à pied seulement (tableau ci-dessus). Vélo, natation et renforcement : garde-fou et panneau testés, position au catalogue non mesurée.

## Vérifié / non vérifié

Vérifié par tests automatisés :

* liste fermée exacte (30), exclusion des fiches bloquées, filtrage aux frontières, liste hostile sans effet ;
* accord verdict du garde-fou ↔ raison affichée sur toute la grille de profils ;
* parcours « formulaire → configuration → signal → catalogue plafonné » : une fiche approuvée arrive réellement au catalogue pour un profil vérifié, pas sans approbation, pas avec un profil non vérifié ;
* fiches de l'axe historique non rouvertes à un débutant ;
* panneau : 30 cases, texte réel des fiches, minimums, alertes de profil, blocages nominatifs, remontée de la sélection.

Non vérifié :

* aucune génération réelle par le modèle : la présence dans le catalogue est prouvée, pas la fréquence à laquelle le modèle choisit la fiche, ni la qualité du plan obtenu ;
* aucun essai dans un navigateur sur l'application déployée ; le panneau est couvert par des tests de composant uniquement.

## État de la suite de tests sur `main` au moment de ce travail

Constaté sur `main` (`de1a67d`) **avant** tout changement de cette branche :

* Six tests en échec dans trois fichiers antérieurs à la revue du 9 novembre, qui décrivaient encore l'ancien comportement des fiches norvégiennes (double seuil ouvert sans approbation, approbation levant le niveau, `NORWEGIAN_WEEK_STRUCTURE_RUN` hors revue) : `advancedWorkoutPrerequisites.test.ts`, `workoutCatalogBuilder.advancedPrerequisites.test.ts`, `levelPrerequisiteCompatibility.test.ts`. Ils contredisaient le test de la revue elle-même (`lactateNorwegianReview.test.ts`). Ils sont réalignés ici sur les décisions de la revue, sans toucher au code de production.
* `src/qa/sports-plan-lab/__tests__/globalPlanningMatrix.test.ts` échoue (102 `canonical_prescription_contract_conflict`). Sans lien avec ce parcours ; **laissé tel quel**, à traiter séparément.

## Reproduction

```sh
npx vitest run \
  src/lib/plan/__tests__/advancedSessionApproval.test.ts \
  src/lib/__tests__/workoutCatalogBuilder.coachApprovalPathway.test.ts \
  src/components/__tests__/AdvancedSessionApprovalPanel.test.tsx \
  src/engines/plan/__tests__/planConfigBuilder.test.ts \
  src/lib/plan/__tests__/levelPrerequisiteCompatibility.test.ts \
  src/lib/plan/__tests__/lactateNorwegianReview.test.ts \
  src/lib/plan/__tests__/reconcilerNorwegianApproval.test.ts
```

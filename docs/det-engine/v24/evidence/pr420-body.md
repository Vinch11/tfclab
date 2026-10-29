# V24 — DRAFT / NO-GO

## Amélioration fonctionnelle

Le moteur expérimental réutilise la chaîne existante et retient un séquençage différent pour B et deux contrefactuels éligibles : échange des sorties course en S3, après le plus grand bloc vélo déjà planifié. Aucun volume supplémentaire ni nouvel exercice. L'acceptation exige désormais l'absence de **tout nouveau témoin brut** d'avertissement/erreur, et pas seulement un compteur identique.

3 placements candidats retenus sur 8 cas, 6 jours de séances modifiés. 9 propositions avec compromis sont isolées pour le coach. 6 contrepropositions 90 minutes sont vérifiées comme blocs et restent rejetées par le floor historique. Le défaut de frontière commun à #424 est reproduit sans modification des calculateurs; les états corrigé candidat, incertain et absent ont des décisions de transport explicites.

| Cas figé | Placement retenu | Jours modifiés | Avertissements V23 → V24 | Erreurs historiques | Refus / conditions | Conflits capacité |
|---|---|---|---|---|---|---|
| A_aerobic | identique | 0 | 36 → 36 | 4 → 4 | 7 / 23 | 1 |
| B_sustainability | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 0 / 30 | 1 |
| C_uncertain | identique | 0 | 37 → 37 | 4 → 4 | 26 / 4 | 0 |
| B_changed_relevant_limiter | identique | 0 | 36 → 36 | 4 → 4 | 0 / 30 | 1 |
| B_missing_bike_reference | identique | 0 | 35 → 35 | 4 → 4 | 7 / 23 | 1 |
| B_lower_run_capacity | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 1 / 29 | 3 |
| B_adverse_recovery | space_peak_bike_block_and_long_run | 2 | 35 → 34 | 4 → 4 | 1 / 29 | 1 |
| B_insufficient_differentiation | identique | 0 | 36 → 36 | 4 → 4 | 0 / 30 | 1 |

## Vérifications exécutées

| Commande | Tests réussis | Tests ignorés | Code sortie |
|---|---|---|---|
| build | 23 | 0 | 0 |
| replay | 23 | 0 | 0 |
| v23_non_regression | 25 | 0 | 0 |
| v22_non_regression | 27 | 0 | 0 |
| multiobjective_non_regression | 175 | 5 | 0 |
| types | compilation TypeScript | 0 | 0 |

23 tests V24, puis rejeu des mêmes 23; 227 tests de non-régression V23/V22/multiobjectifs réussis, 5 tests anciens explicitement ignorés. TypeScript sans émission : réussi. Le vérificateur Python indépendant contrôle arithmétique, sources, jours, fréquences, espacements, capacités, refus, identités d'alertes et trois artefacts de rejeu logiquement identiques.

Les 4 654 fichiers précédemment suivis sont inchangés. 920 IDs, 2 425 variantes, 600 configurations historiques, 96 chronologies / 51 IDs, 418 vues candidates et 15 fixtures Nolio sont conservés. Les 600 cas sont préservés et recomptés, **pas réexécutés** dans V24. Aucun appel Nolio; aucun export nouveau, API payante, donnée réelle, migration, fusion ou déploiement.

## Limites et essais rejetés

Une assertion initiale attendait un attribut nul au lieu du diagnostic global nul quand CE et allure manquent : corrigée sans changer le comportement. Le premier loader utilisait `replaceAll`, incompatible avec la cible TypeScript existante : remplacement lexical équivalent par regex. Les logs des échecs restent archivés. Une première acceptation par compteurs seulement a été abandonnée après inspection des témoins; aucune promotion de ces résultats exploratoires.

Les quatre semaines restent des réservations conditionnelles, pas une préparation Ironman complète. 32 erreurs historiques de portée intégrale et 9 conflits de capacité subsistent; A garde 7 refus course et C 26 refus. L'observation défavorable garde son refus. Une organisation plus explicable n'établit ni dose optimale, ni adaptation acquise, ni supériorité scientifique du placement.

**NO-GO maintenu.** La revue indépendante des références, du contrat 95/90 et des réactions individuelles est indispensable avant toute prescription utilisable.


Baseline V23 : `4ec5547875768f8430606401bb750445e381f71f`. Implémentation : `4752273e9424a133b025487ff9ec92be4ff7a55f`.

[Dossiers V24](https://github.com/Vinch11/tfclab/tree/experiment/det-engine/docs/det-engine/v24) · [Comparaison coach](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v24/COACH_DECISIONS.md) · [Relais lecture seule #424](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v24/PHYSIOLOGY_HANDOFF_424.md) · [Reprise bornée](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v24/REPRISE.md).

Aucun correctif #424 supposé fusionné. Doses individuelles approuvées : **0** ; revues expertes humaines : **0**. Les calendriers sont conditionnels et quatre semaines ne valent pas une préparation Ironman complète.

---

## Référence V23 — corps précédent conservé

V23 rend le lien **intention physiologique → programmation** exécutable dans le moteur existant, puis rejette la variante qui ajoute une alerte historique. Les progrès retenus concernent le contrat de capacité, l’arrêt réellement appliqué sur récupération défavorable et la validation explicite du bloc de quatre semaines.

**DRAFT — NO-GO.** Baseline V22 `e449f302f4ebd8d7c5713bafe0596d4e61d70aae`, confirmée avant écriture. Preuves V23 : `efa50b520d993a32de95d609eadb5e0001e0ebca` ; reçu et clôture : `4ec5547875768f8430606401bb750445e381f71f`. Branche exclusivement `experiment/det-engine`.

### Résultat principal et limite

Dans V22, les demandes physiologiques étaient calculées après le calendrier. Le sélecteur utilisait des préférences fixes sport/rôle, un domaine modéré de base et des minima communs, sans consommer les intentions. V23 transmet avant construction une politique explicite de familles/priorités/placement au même moteur V14.

B dispose d’une demande de fondation liée à un TTE vélo observé ; A conserve des demandes VO₂/seuil différées et C manque de références. Le candidat B isole sa longue vélo du mardi et déplace deux nages par semaine de charge : **six placements changent, sans changer une source ou une minute**. Il ajoute **un avertissement anti_repetition S3** (35→36). Le filtre de non-régression rejette ce candidat et conserve le calendrier V22. Les trois contextes qui le proposent sont archivés, sans suppression/reclassification de l’alerte ni permutation pour la cacher.

**Aucune modification physique de calendrier retenue, aucun volume artificiellement différencié.** Cette limite est explicite. Le temps restant n’est pas rempli sans justification de dose ; aucune conversion universelle VO₂/VLamax/TTE→minutes.

| Originaux V22 inchangés | Refus physiologiques conservés | Réservations conditionnelles | Résultat |
|---|---:|---:|---|
| A | 7 course | 23 | Incomplet/refusé |
| B | 0 | 30 | Candidat complet conditionnel, non approuvé |
| C | 26 | 4 | Incomplet/refusé |

### Capacités nouvelles retenues

- **Capacité actuelle / future / assimilation séparées.** La course95 min S3 contre l’enveloppe90 n’est jamais actuellement admissible. L’alternative90 est examinée et refusée : floor natif95 non satisfait et preuve temporelle complète de cette alternative insuffisante. Aucune capacité acquise au passage des semaines ; aucune donnée favorable insérée.
- **Réductions réellement contrôlées.** Le contrefactuel plafond75 examine notamment une recette75 préservant échauffement10, corps55, retour5 et éducatifs5 ; elle reste refusée si le floor80/90 est violé. Au total9 alternatives rejetées,0 appliquée.
- **Récupération défavorable consommée par la décision du bloc.** Le cas préenregistré met réellement en arrêt la réservation vélo long S2 et transforme le statut du bloc, auparavant candidat complet conditionnel, en incomplet/refusé. Pas de compensation ailleurs, pas de changement de capacité ni d’assimilation supposée.
- **Validation quatre semaines parallèle.** Couverture S1–S4, calendrier/jours, quotas/floors/budgets originaux, sources, sérialisation, espacement, enveloppes et cohérence des états conditionnels. Les quatre erreurs historiques de portée par cas restent intactes et annotées avec témoins ; elles ne sont pas désactivées.
- **Dossier de conflit course A.** Les fonctions de production reproduisent82,8% observé/proxy contre95% prédit, écart−12,2. computeRunMLSS passe runEconomyScore3 à un prédicteur documenté en ml O₂/kg/km, qui borne CE à150. Un autre consommateur décrit le champ comme score0–100. La frontière de sens/unité et la comparaison ratio de vitesses/%VO₂ nécessitent revue parallèle. **Aucune formule ni référence remplacée.**

### Cohorte et mesures

Trois profils originaux et cinq contrefactuels sont préenregistrés sans modifier les entrées V22 :
1. B avec références de limiteur différent, recalcul TFCL réel.
2. B sans ancre FTP.
3. B avec enveloppe course75.
4. B avec récupération défavorable source/semaine précises.
5. B sans TTE observé : aucune priorité spécifique tirée de la seule estimation éventuelle.

| Mesure | Résultat vérifié |
|---|---:|
| Cas / blocs / réservations / jours examinés | 8 / 8 / 240 / 224 |
| Essais de priorité rejetés | 3 |
| Modifications physiques retenues | 0 |
| Alternatives de capacité rejetées / appliquées | 9 / 0 |
| Arrêt adverse réellement appliqué | 1 |
| Erreurs historiques de portée conservées | 4 par cas,32 au total |
| Erreurs des contrôles structurels du bloc sur les sorties retenues | 0 ; refus et conditions séparés |
| Nouveaux échecs/avertissements historiques dans les résultats retenus | 0 |
| Revues sportives humaines / approbations individuelles | 0 / 0 |

Les minutes par discipline et famille de catalogue sont publiées dans BEFORE_AFTER_PROFILES.md et case-summary.json. Elles restent descriptives ; la famille « force » du catalogue ne prouve pas une force maximale prescrite ou tolérée. Les mêmes volumes A/B ne sont pas présentés comme une individualisation quantitative démontrée.

### Tests et garanties

**25 tests V23 passent au build et au rejeu ;27 tests V22 et175 tests de non-régression passent,5 anciens archivages conditionnels non activés. TypeScript passe.**

Tests négatifs : semaine/nage manquante, durée sérialisée modifiée, jour indisponible, véritable course dans le bloc, capacité artificiellement relevée, conditions effacées et source altérée. Une erreur réelle du bloc ne peut pas bénéficier d’une annotation de portée16 semaines. Les conditions de séances, conflits d’enveloppe, conditions futures et décisions coach restent séparés ; aucune validation partielle n’atteste une préparation Ironman complète.

Audit indépendant stdlib sans importer moteur ni contrôleur TS :240 réservations, arithmétique, fréquences, sources, enveloppes,9 refus d’alternatives,3 essais rejetés et arrêt adverse. **Deux fichiers logiques identiques au rejeu**, sources exécutées épinglées.

Le test intermédiaire sur les données insuffisantes supposait à tort un levier Z2 ; il vérifie désormais le refus de priorité à partir de l’estimation et les leviers réellement calculés, sans modifier l’entrée. L’échec reste archivé. Les huit blancs finaux signalés dans les logs bruts sont conservés ; code et documents rédigés passent le contrôle de format.

### Conservation et livraison

**4 590 anciens fichiers inchangés ; deux extensions expérimentales avec comportement par défaut V22 rejoué à l’identique.** Archives V2–V22,920 sources/IDs,2425 variantes,600 configurations,96 chronologies,418 vues et15 fixtures Nolio conservées. Aucun validateur historique, calculateur, catalogue, sender ou moteur de production modifié.

Aucune recherche scientifique générale, migration de catalogue, nouveau moteur concurrent, donnée réelle, appel Nolio/Gemini payant, dépense, fusion ou déploiement. Budget unique60 min/10 unités, sans renouvellement ni relance automatique.

[Résultats](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/V23_RESULTS.md) · [Chaîne de décision](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/DECISION_CHAIN_DIAGNOSIS.md) · [Stimuli et rejet](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/PHYSIOLOGICAL_STIMULUS_SELECTION.md) · [Contrat de capacité](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/INDIVIDUAL_CAPACITY_CONTRACT.md) · [Conflit course et dossier parallèle](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/RUN_REFERENCE_CONFLICT.md) · [Portée quatre semaines](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/FOUR_WEEK_VALIDATION_SCOPE.md) · [Avant/après](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/BEFORE_AFTER_PROFILES.md) · [Coach](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/COACH_COMPARISON.md) · [Reprise](https://github.com/Vinch11/tfclab/blob/experiment/det-engine/docs/det-engine/v23/REPRISE.md).

**Décisions restantes :** clarification score/coût énergétique par le chantier physiologique, revue de la variante et de son alerte, preuves source-spécifiques de capacité/récupération/recette avant toute adaptation de dose. Les95 min ne sont pas acquises et les floors ne sont pas assouplis. **NO-GO maintenu.** [V22 et ses preuves](https://github.com/Vinch11/tfclab/blob/e449f302f4ebd8d7c5713bafe0596d4e61d70aae/docs/det-engine/v22/README.md) restent intacts.

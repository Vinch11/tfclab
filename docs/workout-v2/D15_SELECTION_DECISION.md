# D1.5 — Préférence de sélection sur preuves, sans intensité forcée

**Statut : PILOTE ISOLÉ / NO-GO sportif et production.** Branche issue de la PR #430, elle-même issue du pilote V2 #428. Aucun changement `main`, V1, DET, Nolio, Supabase ou publication.

## Correctif réellement branché

`d1EngineReference.ts` (copie D1 uniquement) accepte un nouveau point d'extension **facultatif** `preferReviewedCandidate`. Lorsque des preuves sont fournies, un candidat peut être examiné **avant** le départage natif par fréquence d'usage et ordre catalogue. On conserve **à l'identique** les domaines admissibles, bornes de doses V1, contraintes de jour, séparation de qualités, nombre de séances, limites de temps, contrôles et issues natifs. Sans preuve, le tri original reste strictement inchangé.

`d12Projection.ts` peut recevoir des revues explicites et expose `reviewedSelections` : les profils D1.2 historiques sont toujours rejoués sans approbation implicite. **Pas d'injection automatique de seuil, VO2max ou HIT** pour satisfaire `lorang_categories`.

## Conditions cumulatives d'une préférence

- Créneau explicitement `isKeySession` en semaine `load`, sport et phase exacts.
- Une seule preuve revue pour le candidat, le jour et la semaine (doublons ambigus refusés).
- Limiteur explicitement présent dans le plan ; lien avec le stimulus validé par revue, **jamais déduit** du nom du profil « aérobie/glycolytique ».
- Intention catalogue compatible (`seuil` ou `vo2`) ; l'intention **ne constitue pas** la preuve du stimulus.
- Structure textuelle V1 **inchangée** depuis la revue ; durée du candidat exactement identique à la durée revue, et comprise dans les bornes V1.
- Temps de travail cible strictement positif, entier, au plus égal à la durée prescrite.
- Structure du stimulus, ancre de discipline, adéquation de dose, phase, douleur/récupération, charge cumulée et séparation des journées difficiles **toutes confirmées explicitement**.

Ce contrat est conservateur, mais les champs booléens restent **des attestations fournies par le réviseur** : ils ne constituent pas une vérification indépendante des contenus V1. Les 20 modèles V2 ne sont pas automatiquement exploités pour sélectionner une dose. Toute attestation doit provenir d'un contrôle distinct reproductible avant d'envisager l'usage sur athlète réel.

## Vérifications

`d15EvidenceSelection.test.ts` couvre absence de preuve, dose et fiche exactes, tentative de contournement de niveau, charge/récupération, doublons de preuves, tri déterministe non destructif et trois rejeux D1.2 (aérobie, glycolytique, équilibré) sans changement des plans/erreurs lorsqu'aucun stimulus individuel n'a été vérifié.

**Critère sportif encore non obtenu :** aucune sélection physiologiquement meilleure n'est démontrée chez les trois profils réels de QA : les preuves de doses structurées et calibrées restent indisponibles pour les fiches V1 choisies. Il serait inexact de marquer `lorang_categories` conforme pour satisfaire le test.

## Suite pragmatique

1. Produire pour les modèles V2 seuil / VO2 une preuve structurée de durée réellement exécutée, référence et pertinence du limiteur, sans convertir des proxies FTP/VMA en MLSS/VO2max mesurés.
2. Tester la décision individuelle sur les trois profils sans inventer d'ancres vérifiées, avec une option de **refus explicite** si aucune bonne séance ne peut être argumentée.
3. Faire approuver la politique de ratios temporels (et la ventilation structurée des bricks) avant tout remplacement du validateur historique.
4. Ensuite seulement : intégration derrière parcours coach, sauvegarde/reprise en environnement autorisé, revue sportive, décision GO/NO-GO.

**GO technique pour le protocole expérimental seulement si la CI du SHA final est verte ; NO-GO opérationnel permanent jusque-là.**

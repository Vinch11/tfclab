# Méthode Lorang : attribution et architecture candidate

Document expérimental, sans revue experte humaine. Les sources sont des entretiens édités, pas des essais d’efficacité. [Bibliographie et limites](SCIENTIFIC_EVIDENCE_MATRIX.md).

## Ce qui est documenté

[L175, 2019](https://scientifictriathlon.com/tts175/) : à 0:56 et10:41, dose transformable en adaptation, historique et retours multisystèmes ; à58:50, stimulus choisi selon le besoin du moment ; à1:21:45, test utile seulement s’il influence la décision. Les phases présentées sont des exemples répétés et adaptables, pas un calendrier universel.

[L417, 2023](https://scientifictriathlon.com/tts417/) : à08:21 et10:54, équilibre de l’effort et adaptation des autres séances ; à14:09 et1:12:23, contraintes et capacité de charge propres à l’athlète. Le cas élite n’est pas un modèle à copier.

[L220, 2020](https://www.220triathlon.com/training/long-distance/frodeno-and-haugs-coach-dan-lorang-on-how-to-train-for-ironman) : profil métabolique, progression durable et retour athlète ; phasage technique/aérobie, force-endurance et économisation illustré par des professionnels. Aucun quota amateur exact n’en est démontré.

Shownotes consultées, audio intégral non vérifié. Aucune présentation originale supplémentaire identifiée et examinée ici avec provenance suffisante pour en tirer une règle. Les schémas métaboliques TFCL ne sont donc pas attribués automatiquement à une présentation de Lorang.

## Chaîne de décision TFCL proposée

**Profil → limiteurs → adaptations prioritaires → stimuli → dosage → organisation → récupération → réévaluation.** Cette formalisation opérationnelle est une proposition TFCL inspirée des sources, pas une citation de Lorang.

| Étape | Preuve requise | Explication attendue | Abstention / réévaluation |
|---|---|---|---|
| Profil | Tests terrain existants, date, discipline, méthode et incertitude | Ce qui est observé, estimé et absent | Ne pas fabriquer une mesure absente |
| Limiteur | Diagnostic ordonné, confiance et exigences de course | Facteur dominant présumé et alternatives | Classement net ≠ mesure fiable |
| Adaptation | Écart pertinent et contexte de phase | Pourquoi travailler ce facteur maintenant | Réviser si test ou réponse contredit l’hypothèse |
| Stimulus | Intention source catalogue et contenu effectif | Mécanisme plausible, pas simple mot-clé | Correspondance lexicale insuffisante |
| Dosage | Durée, domaine TFCL, répétitions, récupération, capacités | Pourquoi cette dose et fréquence | Dose justifiée non disponible : inconnu |
| Organisation | Calendrier intégral, disponibilités, autres disciplines | Effet cumulé et arbitrage d’opportunité | Contradiction de catalogue : refus explicite |
| Récupération | Retours et historique déjà disponibles | Sollicitations musculaires, métaboliques et techniques | Une semaine légère ne prouve pas la récupération |
| Réévaluation | Indicateur observable et décision associée | Quel résultat changerait le plan | Pas de processus adaptatif autonome sans observations |

Le prototype `v8-causal-audit.mjs` émet ces champs pour toutes les séances d’entraînement des quatre dossiers. Les adaptations sont des hypothèses d’intention ; il ne crée aucun dosage ni adaptation observée. Les preuves absentes restent absentes. L’optimisation individuelle de chaque séance n’est pas encore démontrée.

## Interactions physiologiques : hypothèses et limites

- **VO2max et seuils** : capacité aérobie, intensité soutenable et économie interagissent avec les exigences de course. R25/O24 comparent des distributions, pas une formule permettant de déduire une séance optimale de la seule VO2max. Les domaines d’intensité restent exclusivement ceux de `src/lib/zones/tfclDoctrine.ts`.
- **VLamax** : distinguer accumulation de lactate sanguin lors d’un protocole standardisé, estimation d’un modèle et flux glycolytique musculaire. S25 est une petite étude de répétabilité cycliste, pas une validation des formules inverses TFCL. Une baisse de VLamax n’est pas un objectif universel ni une adaptation démontrée par la seule prescription de Z2. Le coût potentiel pour des exigences de puissance doit rester discuté.
- **TTE, seuil et durabilité** : TTE informe une capacité spécifique du test ; M21 décrit la détérioration des caractéristiques physiologiques au cours d’un effort prolongé. On ne remplace pas l’une par l’autre. Les cibles numériques TFCL restent conventions du modèle tant que leur validation propre n’est pas établie.
- **Économie et force** : LL24 soutient des bénéfices moyens de certaines modalités. Ce n’est ni un diagnostic d’économie déficiente ni une équivalence entre isométrie, proprioception et force lourde.
- **Fatigue et interférence** : distinguer conflit de placement, sollicitation musculaire et incompatibilité physiologique démontrée. L’interdiction TFCL « gros blocs VO2 + force max » reste conservée ; l’audit n’en établit pas la validité comme loi universelle.

## Attribution à ne pas surinterpréter

Dans `src/lib/v2/lorangStrategyEngine.ts`, la confiance de décision découle de `gapClarity` (vers646), la force peut s’activer par âge/économie/limiteur (vers943), et des modèles incluent « +10%/semaine » (vers905). Ce sont des choix du code TFCL. Les entretiens examinés ne prouvent pas ces seuils, ni une obligation A/B chaque semaine, ni les ratios par sport, ni un nombre fixe d’intervalles. Aucune règle du moteur actuel n’est modifiée par la V8.

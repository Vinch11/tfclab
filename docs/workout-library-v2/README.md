# TFCLab — Bibliothèque de séances V2, noyau de 20 modèles

## Statut et frontière de sécurité

**DRAFT / NON INTÉGRÉ / NON APPROUVÉ POUR PRESCRIPTION.** Cette PR livre 20 modèles et un instanciateur déterministe autonome. Aucune modification de l'ancienne bibliothèque, du moteur de plan, du stockage, des fonctions Gemini ou de Nolio. Aucune publication ou migration.

Ce noyau vise **tous les sports et objectifs actuellement pertinents pour les parcours TFCLab**, et non tous les sports du monde : natation, vélo/CLM, course à pied, trail, renforcement, bricks; 13 objectifs historiques (start_to_run, 5k, 10k, semi, marathon, sprint, olympic, half, ironman, trail_short, trail_mountain, trail_long, trail_ultra), plus 3 clés exploratoires V2 (time_trial, open_water, general_fitness). **Ces trois nouvelles clés ne sont PAS raccordées à l'interface ou aux objectifs de production.**

La couverture signifie « au moins un modèle applicable potentiellement au contexte », **pas** couverture complète de toutes les phases, modalités, niveaux, situations cliniques, types de séance ou longueurs de saison. La V2 ne peut pas résoudre, à elle seule, une capacité athlète inconnue ni une contradiction de politique sportive.

## Inventaire de 20 familles

| ID | Sport | Famille | Intention principale |
|---|---|---|---|
| V2_SW01 | Natation | Technique / économie | Technique |
| V2_SW02 | Natation | Crawl aérobie par distances | Aérobie |
| V2_SW03 | Natation | Intervalles CSS crawl | Seuil candidat |
| V2_SW04 | Natation | Eau libre chronométrée | Spécificité |
| V2_BI01 | Vélo | Endurance continue | Sous LT1 |
| V2_BI02 | Vélo | Technique de pédalage | Technique |
| V2_BI03 | Vélo | Seuil contrôlé | Seuil |
| V2_BI04 | Vélo | Intervalles VO2 | VO2max |
| V2_BI05 | Vélo | Allure CLM / course | Spécificité |
| V2_RU01 | CAP | Endurance facile | Sous LT1 |
| V2_RU02 | CAP | Intervalles seuil | Seuil |
| V2_RU03 | CAP | Intervalles VO2 | VO2max |
| V2_RU04 | CAP | Longue progressive | Durabilité / spécifique |
| V2_RU05 | CAP | Course/marche | Initiation |
| V2_TR01 | Trail | Répétitions en montée | Endurance de force |
| V2_TR02 | Trail | Descente technique | Charge excentrique / technique |
| V2_ST01 | Force | Force lourde technique | Force maximale |
| V2_ST02 | Renforcement | Mollets / hanche / tronc | Robustesse technique |
| V2_BR01 | Triathlon | Brick aérobie vélo→CAP | Transition / endurance |
| V2_BR02 | Triathlon | Brick spécifique vélo→CAP | Spécificité course |

## Contrat de paramétrage

- Chaque famille est définie par ID stable, sport, objectifs, phases, intention, classe de charge, niveau minimal, provenance des inspirations, prérequis et notes coach.
- Chaque variable est **entière**, avec minimum, maximum, pas et valeur par défaut. Une valeur hors plage, hors pas ou inconnue provoque un refus.
- Chaque bloc représente un exercice continu chronométré, un intervalle chronométré, des longueurs crawl calibrées sur CSS, ou des séries de renforcement à tempo explicite.
- Les récupérations sont comptées **entre** répétitions, jamais après la dernière, sauf si un autre bloc les décrit explicitement.
- Les transitions brick occupent un bloc déclaré et compté. Aucun remplissage automatique des marges de créneau.
- La natation technique est chronométrée : ne pas inventer sa distance, ni utiliser la CSS crawl pour les éducatifs. Seuls les blocs "swim_crawl_intervals" utilisent CSS et leur facteur d'allure est une **heuristique de conception**, pas une preuve de réponse métabolique.
- Le temps de renforcement calculé suppose le tempo explicité, les pauses et les transitions déclarées. C'est un temps **programmé**, pas une mesure de durée réelle. Les charges et 1RM ne sont jamais inventées.
- Toutes les durées sortent en secondes entières et sont la somme contrôlable des événements.
- L'appelant doit fournir : objectif, phase, niveau qualitatif, disponibilité, récupération, douleur et références explicitement requises. Les séances intenses sont bloquées si récupération ou douleur inconnues; une information inconnue sur une séance facile devient avertissement, jamais approbation.
- Tous les résultats sont **candidate** ou **blocked** avec motifs. **Aucun résultat "approved".** Pas d'export Nolio, de modification de plan, de publication ni de stockage.

## Ce que ce noyau ne garantit PAS

1. **L'intention déclarée ne prouve pas le stimulus obtenu** : une séance nommée « VO2 » ne garantit ni un temps donné près du VO2max, ni une adaptation.
2. **Les bornes sont des propositions de conception**, pas des seuils scientifiques universels. Elles doivent être validées par revue coach par famille, niveau et sport.
3. **Le contrôle séance n'est pas un contrôle de microcycle** : accumulations hebdomadaires, progressions, charge mécanique, nutrition, fenêtres de récupération, épreuves, antécédents de blessure et interdits du contexte plan restent à la charge des validateurs existants.
4. Le noyau est indépendant de la bibliothèque actuelle : **aucun gain sur les refus de #420 n'est encore démontré**.
5. Il n'y a pas encore de convertisseur des événements V2 vers le schéma Nolio ni de preuve de fidélité du transport.
6. Les références scientifiques motivent les familles générales. **Aucune de ces vingt recettes ne doit être attribuée littéralement à un coach nommé ou à une étude sans comparaison explicite du protocole.**

## Sources de niveau scientifique différent

- **NOR-2024** — Sandbakk et al., *Training Session Models in Endurance Sports: A Norwegian Perspective on Best Practice Recommendations*, Sports Medicine (2024), DOI 10.1007/s40279-024-02067-4. [Texte](https://pmc.ncbi.nlm.nih.gov/articles/PMC11560996/). Modèles de pratique décrits, pas essais randomisés de chaque variante.
- **NOR-2025** — Sandbakk et al., *Best-Practice Training Characteristics Within Olympic Endurance Sports*, Sports Medicine Open (2025), DOI 10.1186/s40798-025-00848-3. [Texte](https://pmc.ncbi.nlm.nih.gov/articles/PMC12031707/). Descriptif qualitatif, généralisation limitée.
- **HIIT-2025** — *Comparison of different interval training methods on athletes' oxygen uptake*, revue systématique et méta-analyse (2025). [PubMed](https://pubmed.ncbi.nlm.nih.gov/40605061/). Hétérogénéité, ne valide pas les variantes TFCLab.
- **STRENGTH-2024** — Llanos-Lagos et al., *Effect of Strength Training Programs in Middle- and Long-Distance Runners' Economy*, Sports Medicine (2024), DOI 10.1007/s40279-023-01978-y. [Texte](https://pmc.ncbi.nlm.nih.gov/articles/PMC11052887/). Effets moyens et incertitudes ; aucune charge individuelle déduite.
- **TRAIL-2025** — *A review of uphill and downhill running*, Frontiers in Bioengineering and Biotechnology (2025), DOI 10.3389/fbioe.2025.1690023. [Texte](https://pmc.ncbi.nlm.nih.gov/articles/PMC12592170/). Exigences distinctes montée/descente et charge excentrique.

## Démonstration et décision pour cette PR

Commande ciblée (à confirmer dans la CI de la branche) :

    npx vitest run src/lib/workoutLibraryV2/catalogue.test.ts

Critères de **GO uniquement pour le noyau isolé** :
1. Exactement 20 IDs distincts, 6 sports et 16 objectifs couverts.
2. Les 20 recettes par défaut instanciables sur contexte synthétique explicitement admissible.
3. Vingt relectures identiques pour chaque recette; résultats en secondes entières égaux à la somme des événements.
4. Aucune récupération finale fantôme; nage CSS refusée sans référence; transitions brick visibles.
5. Tous les refus de paramètres, phase, objectif, niveau, douleur, récupération et disponibilité testés.
6. Aucun envoi ni autorisation de prescription possible dans le moteur.
7. TypeScript et CI du dépôt verts.

**GO noyau isolé ≠ GO intégration DET ≠ GO plan sportif ≠ GO publication.**

### Condition avant raccord à DET

Sur un jeu de cas de refus #420 arrêté **avant** modification, prouver un avant/après : pour chaque échec d'origine catalogue, le moteur V2 produit une variante admissible exacte ou un motif explicite sans élargir les politiques sportives. Comparer aussi les erreurs critiques et les refus nécessaires. Ne pas remplacer l'ancienne bibliothèque tant qu'une amélioration mesurée et une non-régression sont attestées.

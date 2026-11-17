# Une évaluation TFCL, un profil physiologique complet

## Objectif
Un seul parcours par athlète : préparer les efforts, importer ou saisir leurs résultats, les vérifier, puis retrouver toutes les valeurs TFCL exploitables dans le Dashboard et 100%lab. Conserver Bevel et le Compass historique.

« Une évaluation » signifie un dossier cohérent pouvant comprendre plusieurs efforts et plusieurs journées, pas la promesse qu’un seul effort mesure toute la physiologie. Les mesures directes et les valeurs calculées restent distinctes, avec une réserve discrète et leurs sources accessibles.

## 1. Définir précisément ce que l’évaluation fournit
- Établir une table par sport : résultat attendu, données nécessaires, protocole, calcul TFCL, provenance et limites. Couvrir VO₂max, VLamax, FatMax, seuils, utilisation des carburants et zones ; ajouter CP/W′ vélo et vitesse critique/D′ course.
- Distinguer le socle physiologique des analyses complémentaires : durabilité avant/après effort prolongé, réponses cardiaques et tolérance digestive ne sont pas démontrées par les seuls efforts maximaux.
- Auditer les calculateurs existants avant de les relier : vérifier notamment que les écrans et les calculs de vitesse/puissance critique exigent les mêmes efforts. Ne pas exploiter la règle actuelle de préparation CP « deux valeurs parmi 30 s, 60 s, 5 min » comme validation d’un protocole critique.
- Livrable : une liste explicite des résultats garantis par chaque parcours complet, sans prétendre fournir un modèle non validé pour un autre sport.

## 2. Construire un parcours unique, avec protocoles par sport
- Vélo : organiser les efforts courts, aérobies et soutenus nécessaires aux modèles existants ; préciser échauffement, récupération, capteur, durée, caractère maximal et conditions. Valider les durées avec la littérature avant d’en faire une prescription de test.
- Course : réutiliser les tests sprint, VMA et seuil ; ajouter un protocole vitesse critique avec trois efforts maximaux de durées distinctes. Les 3, 7 et 12 minutes proposés sont une base à vérifier, pas un protocole déjà validé dans TFCL.
- Éviter de multiplier les tests si une séance correctement documentée peut fournir plusieurs informations. Ne pas assimiler un record 6 minutes à une VMA confirmée ni la vitesse critique au seuil lactate.
- Prévoir deux voies : terrain/à distance avec capteurs adaptés ; laboratoire avec mesures directes lorsqu’elles sont réellement disponibles. Aucune transposition silencieuse vélo → course, ni promesse de profil métabolique complet en natation.

## 3. Réconcilier tests, bilans et Nolio
- Une période d’évaluation, un sport et un dossier de sources : séances sélectionnées, portions d’effort et de repos, résultats, capteurs, dates et validation coach.
- Exploiter Nolio pour rechercher les séances puis sélectionner les efforts ; un fractionné sans repos documenté reste à vérifier, pas un test maximal automatique.
- Récupérer les résultats déjà importés dans un bilan même si aucune fiche test séparée n’existe. Montrer ce qui est déjà exploitable et ce qui attend un enregistrement, plutôt que demander de refaire inutilement un test.
- Enregistrer les résultats et leur provenance une fois, puis les rendre accessibles aux différentes vues. Prévisualiser les valeurs avant validation ; ne pas écraser une mesure existante ou certifier un record automatiquement.
- Ajouter la lecture cardiaque uniquement après vérification de sa disponibilité dans Nolio et de son autorisation ; l’actuelle lecture de séance ne fournit pas ce flux.

## 4. Produire une projection TFCL commune
- Relier les données validées aux estimateurs canoniques, avec contrôle des unités, du sport, de la cohérence et des dates.
- Les records servent à comparer et, lorsque le modèle le permet, à ajuster les courbes ; un ajustement puissance–durée ne suffit pas à prouver que VO₂max et VLamax sont identifiées de manière unique.
- Une évaluation complète ne doit perdre aucune information calculable faute de records récents. Un résultat non enregistré, un modèle non disponible et une analyse complémentaire non réalisée doivent être explicitement distingués.
- Aucune valeur standard inventée pour remplir un écran ; aucun pourcentage de confiance mis en avant. Sources et limites accessibles discrètement.

## 5. Afficher le profil et relier les plans avec prudence
- Dashboard et 100%lab : mêmes valeurs, mêmes courbes personnelles, points réels datés, repères et courte pédagogie. Supprimer les derniers chemins d’affichage non étayés, sans supprimer les résultats de tests valides.
- Vitesse critique/D′ et CP/W′ : indicateurs complémentaires. Les valeurs confirmées et récentes peuvent proposer des réglages sur les séances pertinentes, appliqués seulement après accord du coach.
- Ne pas modifier silencieusement les classements des limiteurs, les domaines d’intensité TFCL, les plans sauvegardés ou les sorties Nolio. Le profil complet n’est pas une liste automatique de priorités.

## 6. Valider avant toute promesse d’équivalence
- Tests automatisés par règle : parcours complet sans manque calculable ; bilan importé sans fiche test ; Nolio absent ou lecture échouée ; sport séparé ; unités ; protocole incomplet ; valeurs contradictoires ; prescription critique non confirmée refusée.
- Vérification connectée sur Emanuela et Vincent, de la sélection d’efforts à l’enregistrement puis à la relecture dans les deux vues, ordinateur et téléphone. Corriger les cas réels de complétude sans fabriquer CP/W′ ou durabilité.
- Validation scientifique distincte par indicateur et par sport : comparer aux mesures directes disponibles, étudier biais, erreur, répétabilité et sensibilité aux entrées, puis vérifier sur des athlètes non utilisés pour le réglage.
- Ne pas annoncer une précision ni une équivalence INSCYD sans cette validation. L’étude Poffé 2024 concerne le calcul du MLSS vélo à partir de données physiologiques obtenues en laboratoire ; elle ne valide ni tous les indicateurs ni les modèles TFCL.

## Ordre de livraison
1. Contrat des résultats et audit de complétude, avec corrections des pertes de données existantes.
2. Parcours d’évaluation partagé et protocole vitesse critique course.
3. Sélection/import Nolio, traçabilité et calculs communs.
4. Profil complet Dashboard/100%lab et propositions contrôlées pour les plans.
5. Comparaisons scientifiques et extension des analyses cardiaques/durabilité.

Chaque lot termine par tests, parcours réel et compte rendu des indicateurs effectivement vérifiés. Aucun bilan ni plan existant réécrit sans validation.

## Détails techniques
Réutiliser les estimateurs canoniques et le choix de bilan `pickReferenceSnapshot`. Conserver les métriques critiques par snapshot dans `critical_metrics` avec estimate/confirmed ; course en distances et vélo en watts. Maintenir les sorties exploratoires Lab en lecture seule. Introduire un contrat d’évaluation partagé entre import, saisie, calculs et affichage plutôt qu’un nouveau moteur physiologique concurrent. Toute évolution des fonctions exige déploiement et relecture de la compatibilité des versions.

## Sources de cadrage
- [Poffé et al., 2024 — validation MLSS vélo](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1376876/full)
- [INSCYD — validation et sensibilité aux erreurs](https://inscyd.com/science/validation-verification)
- [INSCYD — articulation données terrain et laboratoire](https://inscyd.com/webinar/power-physiology-ppd)

Les protocoles détaillés vélo et vitesse critique course doivent faire l’objet d’une revue spécifique avant implémentation.
# Reprise V11 — DRAFT / NO-GO

Branche experiment/det-engine, dépôt Vinch11/tfclab, PR420 obligatoirement en brouillon. Baseline V10 :8c96fb3f81d0aa3d6955081268abc68f3738c912. Lire state.json, V11_RESULTS.md et WEEK_SCOPE_VALIDATION.md avant toute nouvelle action.

Le registre contient exactement dix unités et une échéance absolue, sans renouvellement implicite. Un statut passed signifie travail borné achevé, pas validation scientifique. Aucun daemon ni redémarrage automatique de développement n’est revendiqué. Une mission ultérieure nécessite un nouveau registre ; préserver preuves et essais rejetés.

## Reproduction et interruption

Les sources de cas sont v10-fixtures.ts et v11-contract.ts. Les profils restent fictifs, sous l’horloge de scénario V10/V11 explicitement figée au26octobre2026 à12:00UTC. Ce n’est pas l’heure d’exécution ni une observation réelle. Vérifier baseline-files.json, source-checksums.json, checksums.json, preregistration.json et la tête distante de PR avant reprise.

La commande de validation est `node scripts/det-engine/v11-run.mjs validation scripts/det-engine/v11-validate.mjs` uniquement lorsque l’unité est ouverte et le délai valide. Le contrôleur refuse une unité clôturée, une autre unité active, une mauvaise branche ou un délai dépassé. La reproduction de preuves sous un nouveau budget doit écrire dans un nouveau dossier, pas écraser evidence/final.

Un redémarrage d’environnement a interrompu U8 après les trois premières étapes réussies. Les processus ne subsistaient plus ; validation-resume.json conserve le diagnostic et les empreintes. La reprise `--resume` ne rejoue que les commandes non achevées, vérifie la stabilité des sources et des références, conserve les résultats précédents. Une interruption n’est pas un succès ni une régression sportive. Après interruption, vérifier l’absence de processus avant de libérer une réservation active ; ne jamais effacer les tentatives.

Les sorties finales sont mesocycles.json.gz, mesocycle-summary.json, feedback.json.gz, feedback-summary.json et trail-vertical.json. Leur rejeu indépendant doit être identique, avec un dossier distinct. Le générateur `python scripts/det-engine/v11-report.py` met en forme les preuves finales sans modifier une prescription.

## Pièges résolus et limites à conserver

- Ne pas déduire une obligation universelle de progression de minutes. Le seul changement du bloc aérobieS3 répond au plancher individuel natif, pas à une adaptation mesurée.
- Ne pas imposer une baisse dans chaque discipline lors de toute récupération : la natation est déjà minimale dans un cas. Conserver le plafond total existant et vérifier les doses, sans déclarer l’athlète récupéré.
- Les métadonnées génériques ne capturent pas toutes les exclusions écrites dans avoid : le vélo progressif V3 est interdit en récupération et ses anciens candidats restent archivés comme rejetés. La fiche A_BIKE_END_90_PRO est une source existante récupérée par un catalogue vélo ciblé, pas une séance inventée. La chronologie manquante reste inconnue.
- Une réduction locale90→65min du profil équilibré provoquait une alerte de reprise S3. Elle est rejetée. L’alternative75min vient du plafond ordinaire V10 déjà documenté et passe le contrôle du bloc entier. Aucune recherche des seuils d’alerte n’est autorisée.
- Une séance de position n’est pas une longue autonome. Ne lui attribuer aucun crédit de longue endurance ni une adaptation métabolique mesurée.
- Les sorties historiques restent brutes et non conformes sur le préfixe ; les ratios et répétitions ont une portée méthodologique réelle, distincte des erreurs liées à un plan incomplet.
- Trois routes trail restent sans preuve D+/D− ; ni absence ni titre facile ne valent zéro. Aucune tolérance excentrique n’est créée.
- Les réponses synthétiques produisent des propositions ; douleur, contradiction fiable, fatigue non récupérée ou manque de données retiennent la semaine pour revue. Une bonne réponse ne lève pas une suspension antérieure.

Travail suivant utile : revue sportive indépendante des deux blocs de base et de leurs précautions ; preuve de dose/chronologie des sources encore ambiguës ; extension vers les phases spécifiques Ironman avec données de réponse suffisantes ; parcours documentés pour le trail. Les limites de généralisation et les contrats candidats restent visibles avant toute éventuelle intégration.

Interdictions inchangées : fusion, déploiement, publication Lovable, données athlètes/Nolio, migrations, moteur/validateurs de production et appels payants. La V11 ne donne aucune autorisation de promotion scientifique ni de production.

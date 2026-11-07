# Registre des preuves scientifiques — retrouvé / encore nécessaire

## Niveaux de preuve

1. **Calibration** : coefficients ajustés sur des observations identifiées. Une erreur d'ajustement décrit ce jeu, pas automatiquement la généralisation.
2. **Validation interne** : cohérence, non-régression ou rééchantillonnage sur les données de développement ; dépendances et réutilisation des mêmes observations doivent être explicites.
3. **Validation hors échantillon** : paramètres figés, observations indépendantes de l'ajustement, séparation par athlète et non par lignes du même athlète.
4. **Preuve expérimentale individuelle** : comparaison répétable pour un athlète, un sport, un protocole, un état et une date ; ne se déduit pas du seul RMSE de groupe.

La mission n'a créé aucune observation de calibration, aucun coefficient ou nouveau résultat expérimental. Les nouvelles valeurs de test sont des **fixtures synthétiques d'ingénierie**, explicitement marquées comme telles.

## Archives recherchées

| Objet | Preuve effectivement retrouvée | Ce qui ne l'est pas encore | Statut |
| --- | --- | --- | --- |
| Mader α=1,98, N=44, RMSE 3,7 % annoncé | Code actuel, aller-retour inverse, protections et tests ; ajout du coefficient retrouvé dans `af3fae770c36fd1a350b8bf8604725bc0905c328` du **04/05/2026** : un fichier de code, 19 ajouts/8 suppressions | Les 44 observations appariées, leur origine, protocole, unités, exclusions, pondérations, ajustement et test séparé | Calibration **annoncée**, non reproduite expérimentalement ici ; équation conservée |
| Sprint P4, N=15, RMSE 0,073 annoncé | Régression du protocole dans `612cf7153e1a8acd92d9d5f8a31e70de9209f559` du **25/06/2026** ; réutilisation Profil Express dans #310 ; source et tests conservés | 15 paires terrain/référence, protocole exact (lancé/arrêté), corrections, origine et variance de référence | Documentation de calibration retrouvée, pas archive observationnelle indépendante |
| Modèle C, N=14+3, RMSE 2,64 annoncé | Introduction du prédicteur dans `767fdaf89b9a88c201918cd3d3f2403644892014` du **04/05/2026** ; fixture 17 et garde introduits dans `648208b4…` | Provenance primaire des 14 lignes dites labo, justification des 3 cas limites/poids 0,3, données d'ajustement originales, jeu tenu à l'écart | Validation logicielle interne retrouvée ; validation indépendante non établie |
| Recalcul de la fixture Modèle C | V1 : RMSE 1,5607 point non pondéré, 1,4654 pondéré, différent du 2,64 historique ; même prédicteur et fixture conservés | Explication de la différence entre jeu de calibration et fixture publiée | Aucune régression de formule démontrée ; aucune correction de coefficient autorisée par cet écart |
| Références scientifiques externes | Registre littérature existant, Poffé/Hommel/Fleckenstein et références de physiologie | Démonstration de transférabilité exacte des protocoles/coefficients TFCL, puis comparaisons propres à TFCL sur observations indépendantes | Appuis bibliographiques conservés, pas assimilation TFCL=INSCYD |
| Outils de cohorte/calibration continue | Import CSV, `calibration_evidence`, pages de cohortes, RMSE/biais, traces | Archives de données autorisées et auditables qui permettraient de les alimenter/rejouer sans fiction | Présence d'un outil ≠ existence d'une cohorte validée |

## Traçabilité de la recherche

[Historique structuré](evidence/calibration-history.json), patches historiques archivés `calibration-history-*.txt.gz`, et [recherche locale de références](evidence/calibration-reference-search.txt). Recherche dans les fichiers du dépôt, migrations et historique Git accessible ; inspection des commits d'introduction et des chemins de calibration/cohortes. Les recherches GitHub de code ont rendu des listes vides, y compris pour une chaîne présente localement : **résultat non concluant d'indexation**, pas preuve d'absence. Un appel de recherche de commits non accepté par le connecteur n'est pas compté comme recherche réussie ; l'historique local a été utilisé.

Les références `mem://logic/mader-alpha-calibration-n44` et `mem://logic/run-mlss-predictor-modele-c` ne sont pas des archives Git consultables. Les commentaires « Nov 2026 » ne deviennent pas dates d'acquisition parce que le code les contient ; les commits ci-dessus datent l'ajout de code, pas les mesures. Aucune mémoire privée ou table d'athlètes réelle consultée.

## Incohérences documentaires à ne pas transformer en recalibration

Certains mini-rapports/Essentiels attribuent N=44 au Modèle C alors que son fichier décrit 14+3 ; la section Essentiels raccordée dans V2 a été clarifiée, les lecteurs parallèles restent listés pour revue. Les variantes de sprint ou de mini-profil ne doivent pas être fusionnées simplement parce qu'elles partagent le nom P4. Ni un coefficient présent dans le code, ni son intitulé « validé », ni une bonne erreur sur données synthétiques n'établit l'origine expérimentale des observations.

## Preuves à demander ensuite

Pour chaque archive existante : version/source, observations anonymisées autorisées, unité et discipline, date, protocole primaire, méthode de référence, étalonnage, incertitude de référence, répétitions, critères d'exclusion et séparation ajustement/validation. Préserver les originaux ; documenter toute correction dans un registre distinct. Ne pas demander de nouveaux essais avant d'avoir déterminé si l'archive satisfait déjà la question.

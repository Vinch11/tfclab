# Trail V3.60 — fondement scientifique et limites

Date de revue documentaire : 3 novembre 2026. Cette note concerne trois
**références synthétiques**. Elle ne constitue ni un accord humain, ni la
validation expérimentale des séances complètes, ni une autorisation de
prescription à un athlète réel.

## Aucune recette supplémentaire nécessaire

Les 800 recettes historiques et les deux suppléments RUN_201/RUN_202 restent
inchangés. Les témoins trail réutilisent leurs blocs structurés. Deux adaptations
sont explicitement approuvées dans les fixtures : RUN_136 passe à quatre blocs de
6 minutes MLSS (51 minutes totales, dont 24 MLSS) pour les témoins montagne/ultra ;
RUN_085 utilise 90 puis 77 minutes faciles pour le témoin ultra, avec ses pauses,
son échauffement et son retour au calme inchangés, soit 190 minutes au total.
Ces changements respectent les bornes de la source et sont contre-calculés en
Python. Ils sont des choix originaux de programmation, pas des protocoles
publiés dont l'efficacité aurait été démontrée sous cette forme exacte.

## Études primaires consultées

| Étude | Résultat pertinent | Application autorisée ici | Extrapolation exclue |
| --- | --- | --- | --- |
| [Barnes et al., 2013, PMID 23538293](https://pubmed.ncbi.nlm.nih.gov/23538293/) — DOI 10.1123/ijspp.8.6.639 ; 20 coureurs entraînés, cinq programmes de côtes sur six semaines | Des intervalles en côte peuvent améliorer des paramètres de course et la performance sur 5 km ; dose optimale non déterminée | Justifier l'intérêt d'un travail en montée et conserver des domaines d'effort individuels | Présenter RUN_167/169, les doses MLSS ou les trois calendriers trail comme les protocoles validés par cette étude |
| [Khassetarash et al., 2022, PMID 34098176](https://pubmed.ncbi.nlm.nih.gov/34098176/) — DOI 10.1016/j.jshs.2021.06.001 ; dix hommes, deux descentes de 30 minutes à −20 %, espacées de trois semaines | Une exposition préalable peut atténuer courbatures et perte de force lors d'une répétition ; conséquences neuromusculaires distinctes du coût métabolique | Exiger une histoire de descente documentée, comptabiliser le D− séparément, contrôler le délai fin-début et prévoir une nouvelle évaluation de disponibilité | Copier une pente/durée expérimentale exigeante comme dose par défaut ; garantir une récupération complète en 48 heures ; inférer l'habituation du niveau général |
| [Shaw et al., 2018, PMID 29561245](https://pubmed.ncbi.nlm.nih.gov/29561245/) — DOI 10.1080/17461391.2018.1449892 ; 19 athlètes, descente −5 % ou plat, deux fois par semaine pendant huit semaines | Pas d'amélioration démontrée de l'économie de course par ce programme de descente | Conserver des objectifs techniques et de tolérance observée pour les descentes | Promettre automatiquement une meilleure économie ou une performance accrue grâce aux séances de descente |

Les domaines et leurs zones descriptives restent ceux de `tfclDoctrine.ts`.
Aucun pourcentage de VMA ni une nouvelle équivalence RPE/LT1/MLSS de population
n'est introduit. Le RPE de chaque domaine est une **consigne synthétique revue
sur le terrain**, liée à l'athlète, à la source et au parcours. Ce repère n'est pas
une mesure biologique du seuil. Un domaine manquant interdit le recours implicite
à l'allure sur plat, même lorsqu'une allure seuil sur route est disponible.

## Ce qui est effectivement contrôlé

Chaque source de course possède un parcours préalablement déclaré : durée,
distance, D+, D−, minutes de descente, technicité et rôle. L'empreinte du parcours
et celle de la source doivent correspondre au contexte revu. D− n'est jamais
rempli à partir de D+. Les parcours plats portent une observation synthétique
explicite de zéro dénivelé ; une valeur inconnue reste bloquante.

Les plafonds de dénivelé, augmentations entre semaines de charge, durées longues
et délais de récupération sont des **contraintes individuelles déclarées par le
coach synthétique**. Ils ne sont pas présentés comme des seuils universels de
sécurité établis par la littérature. Le témoin possède huit semaines d'exposition
antérieure documentée et ne dépasse pas sa plus grande descente déjà tolérée.
Les 48 heures utilisées après les sorties longues et la qualité sont un plancher
revu dans ces contextes, jamais une garantie de récupération physiologique.

Les semaines de récupération doivent réellement réduire d'au moins 30 % le temps,
le D+ et le D− par rapport à la semaine précédente. Le dénominateur de polarisation
inclut toutes les minutes d'endurance, y compris les intervalles non classés.
Les domaines primaires sont vérifiés dans les blocs : VO2 pour le court, MLSS
avec au moins 20 minutes pour TTE montagne/ultra. La spécificité du peak repose
sur une sortie longue, un parcours et un exercice de ravitaillement réellement
sélectionnés, pas sur le mot « allure course ».

## Limites de l'acceptation

Trois témoins ne couvrent pas tous les terrains, niveaux, objectifs de performance,
limiteurs, charges ou antécédents. Les séances de renforcement existantes ne sont
pas déclarées équivalentes à un protocole de force maximale publié. Les témoins
conservent l'affûtage allégé du contrat natif ; ils ne démontrent pas l'optimalité
d'une stratégie individuelle de rappel d'intensité. Les doses de ravitaillement,
la chaleur, l'altitude, le sommeil, la douleur, la disponibilité réelle avant
chaque séance et la récupération après l'épreuve nécessitent une revue humaine.

Les temps de course 210/540/1200 minutes sont des estimations explicites du coach
synthétique, pas des performances prédites ou observées. L'événement reste dans
le calendrier physique ; il est séparé du plafond horaire d'entraînement.
La planification ne certifie pas la capacité à terminer l'épreuve.

`humanReviewRequired=true`, `sportingRelevance=not_attested`,
`scientificSessionValidation=false`, `prescriptionAllowed=false`,
`productionAllowed=false`.

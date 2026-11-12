# Revoir le TFCL Compass sans déstabiliser les plans

## Principe

Les limiteurs alimentent les plans : une modification de leur calcul peut modifier les futurs plans. La première étape conserve donc les identifiants, règles de classement, priorités du coach et parcours IA/DET existants. Aucun plan enregistré ni bilan athlète n'est réécrit.

Le compass présente les priorités du diagnostic ; il ne recalcule pas une hiérarchie concurrente. Une correction future du diagnostic reste possible, mais exige une revue d'impact et une validation séparées.

## 1. Auditer et figer le comportement actuel

- Cartographier diagnostic, compass, ordre coach, configuration IA/DET, rapports et exports.
- Relever pour Emanuela et Vince les données utilisées, leur provenance, les priorités calculées et celles transmises aux plans, sans génération payante ni écriture athlète.
- Ajouter des tests de référence protégeant l'ordre et les valeurs prescriptives contre les changements de présentation.

## 2. Corriger la lecture du compass uniquement

- Afficher le classement fourni par le diagnostic, et distinguer l'ordre coach lorsqu'il est applicable à la préparation du plan.
- Séparer « Priorités du diagnostic » et « Informations complémentaires » : W′/D′ et les autres indicateurs ne doivent pas paraître être des priorités s'ils ne le sont pas dans le diagnostic.
- Si W′ est actuellement classé comme limiteur, conserver cette priorité à cette étape et la signaler « interprétation à revoir » ; ne pas le retirer silencieusement du plan.
- Remplacer les verdicts trompeurs par « cible interne atteinte », « à développer », « à confirmer » ou « données insuffisantes ». Une absence de donnée n'est pas une faiblesse démontrée ; un score de cible n'est pas une probabilité de réussite.
- Harmoniser les valeurs affichées, unités et mentions mesuré/estimé entre compass, détails, impression et rapports, sans modifier les données enregistrées ni les calculs de prescription.

## 3. Séparer TTE et durabilité dans la présentation

- Afficher distinctement le temps tenu au seuil et les observations de résistance à l'effort prolongé, avec vélo et course séparés.
- Ne plus présenter une conversion du TTE comme une mesure de robustesse. Si aucune observation exploitable n'existe : « durabilité non évaluée ».
- Présenter les données Nolio existantes selon ce qu'elles prouvent : test jusqu'à épuisement validé, durée minimale tenue, découplage sur une séance documentée, ou simple indice issu des records.
- La revue des deux vrais tests TTE d'Emanuela dépend de l'identification et de la validation du protocole par le coach. Aucun record, TSS ou arrêt planifié ne sera requalifié automatiquement en mesure.

## 4. Proposer séparément une évolution scientifique du diagnostic

Livrer un tableau avant/après, sans activer les règles candidates :

- Place de W′ selon les exigences de l'épreuve et la validité de ses tests ; pas de retrait global sans vérifier les sports concernés.
- Distinction endurance au seuil / durabilité prolongée, sans double comptage.
- Pertinence et provenance des cibles ; éviter les conclusions issues d'indicateurs corrélés ou de données incertaines.
- Effets sur les priorités, séances, récupération et contrats IA/DET.

Les nouvelles règles ne seront activées qu'après validation du coach. Les plans existants restent historiques ; une nouvelle hiérarchie n'enclenche aucune régénération automatique.

## Vérifications

- Emanuela et Vince : cohérence des valeurs visibles et provenance, absence de priorité artificielle pour une donnée manquante, aucun changement des entrées transmises au plan lors de la refonte visuelle.
- Tests représentatifs : 5 km, 10 km, semi, marathon, trail, Half-Ironman et Ironman ; les résultats distingueront présentation, invariance des contrats et qualité sportive restant à vérifier.
- Vérifier l'aperçu, l'impression et les rapports ; aucune publication, export Nolio réel, génération payante ou modification des bilans dans cette étape.

## Détails techniques

- Réutiliser le résultat de `@/engines/diagnostic` et la politique coach existante ; ne pas créer un second moteur de classement dans le compass.
- Séparer les modèles de présentation des contrats de prescription et couvrir leur invariance par tests.
- Toute évolution structurelle approuvée sera documentée dans `AGENTS.md`.
- Actualiser la déclaration de version après les modifications de source et redéployer les fonctions du générateur concernées pour préserver la cohérence de version ; vérifier les tests et l'état de compilation avant conclusion.
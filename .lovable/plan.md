# 100%lab — "Load Characteristics" façon INSCYD

## Objectif
Faire de la page 100%lab un écran de laboratoire sombre et dense : une grille de 6 graphiques connectés, tirés d'un seul bilan TFCL, lisible d'un coup d'oeil sur ordinateur et tablette.

## Les 6 graphiques (vélo et course séparés)
1. **Demande métabolique et VO₂** : besoin en oxygène selon l'intensité, plafond VO₂max.
2. **Production et élimination du lactate** : courbe de production, courbe d'élimination, point d'équilibre (MLSS).
3. **Lactate à l'état stable** : courbe lactate selon l'intensité, LT1 et LT2 marqués.
4. **Graisses et glucides** : g/h de graisses et glucides, bande FatMax en surbrillance.
5. **Part aérobie / anaérobie** : surface pleine (bleu/rouge) de la contribution énergétique selon la durée.
6. **Glucides et graisses en énergie** : surface pleine (vert/rouge) de la part des carburants selon l'intensité.

Sous chaque graphique : une ligne de repères (watts ou allure, FC, lactate) et le petit texte pédagogique déjà présent, replié discrètement.

## Présentation
- Thème sombre dédié à la page 100%lab uniquement (le reste de l'app garde le thème Bevel).
- En-tête : athlète, date du bilan, sport, mention discrète « valeurs TFCL ».
- Grille 2 colonnes ordinateur/tablette, 1 colonne téléphone.
- Un curseur d'intensité commun : survoler un graphique met en évidence la même intensité sur les 6.
- Repères partagés (LT1, MLSS/LT2, FatMax, VO₂max) en lignes verticales identiques partout.

## Ce qui ne change pas
- Calculs TFCL existants réutilisés tels quels, aucun nouveau modèle.
- Compass, Dashboard, plans et bilans intacts.
- Course : pas de lactate inventé à partir des watts vélo ; natation : CSS seulement.
- Valeurs manquantes : graphique affiché vide avec « Données insuffisantes ».

## Étapes
1. Préparer les 2 nouvelles courbes (production/élimination du lactate, part aérobie/anaérobie) depuis le modèle Mader déjà calibré.
2. Construire la grille sombre et les 6 cartes.
3. Ajouter le curseur synchronisé et les repères partagés.
4. Vérifier sur Emanuela et Vince (ordinateur, tablette, téléphone), tests des nouvelles courbes.

## Technique
- `src/lib/lab/labProfile.ts` : ajout `labLactateBalance` et `labEnergyContribution` (lecture seule, `maderMetabolicModel`).
- Nouveau `LabLoadCharacteristics.tsx` (Recharts, `syncId` pour le curseur), tokens sombres scopés à la page.
- Tests unitaires : pas de transfert vélo→course, absence de données → pas de courbe.

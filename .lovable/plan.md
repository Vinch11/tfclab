# Plan — Compass fiable : cibles justifiées, ambition précise, conclusions croisées

## Objectif
Le Compass doit dire si un facteur (VMA, seuil, endurance…) **limite vraiment** la préparation, en distinguant ce qui est prouvé, ce qui est une hypothèse et ce qui manque. Aucun changement des plans IA/DET dans ce plan.

## Étape 1 — Audit des cibles (sans rien changer à l'affichage)
- Inventaire de toutes les cibles utilisées par le Compass (VMA, seuil, VO₂max, TTE, CP/W′, CS/D′, VLamax, FatMax…), par sport, objectif et ambition.
- Pour chacune : source, population, protocole, hypothèses, et usage réel (affichage seul, classement des limiteurs, plans).
- Classement en trois catégories : **justifiée** (mesure de cohorte comparable), **extrapolée** (calcul à partir d'une autre population ou épreuve), **non justifiée** (valeur de coaching sans source).
- Livrable : un tableau lisible que tu valides, cible par cible.

## Étape 2 — Préciser l'ambition
- Dans la configuration de l'athlète : remplacer ou compléter l'ambition générique (finir, compétiteur, podium…) par un **objectif concret** facultatif : chrono visé, ou classement visé dans une catégorie et une épreuve.
- Le repère se calcule alors depuis ce chrono (ex. allure marathon visée → VMA et seuil compatibles), avec la fourchette d'incertitude.
- Sans objectif concret : on garde l'ambition actuelle, signalée comme scénario approximatif.

## Étape 3 — Conclusion croisée par facteur
Un facteur n'est déclaré **limitant** que si plusieurs observations concordent :
- Course : VMA, seuil (% VMA), performances récentes (records Nolio), endurance spécifique ; en triathlon, la course après le vélo.
- Vélo : PMA/VO₂max, FTP/CP, W′, durabilité.
- Trois verdicts affichés : « limitant probable » (≥2 indices concordants), « écart au scénario, à confirmer » (un seul indice), « pas de déficit apparent » ; plus « à mesurer » si les données manquent.
- Chaque verdict montre ses indices (dépliables), conformément au Compass « visuel d'abord ».

## Étape 4 — Recalibrage des cibles
- Corriger ou retirer les cibles « non justifiées » selon ta décision de l'étape 1.
- Âge et sexe pris en compte uniquement là où une source le justifie, jamais par coefficient général.

## Étape 5 — Vérification
- Contrôle sur Emanuela et ton compte : lecture des verdicts, ordinateur et téléphone.
- Tests sur les règles de verdict (concordance, données manquantes, triathlon).

## Ensuite, seulement après ton accord
Décider si et comment ces verdicts alimentent les plans IA/DET. Les plans existants ne sont jamais réécrits automatiquement.

## Détails techniques
- Audit : `src/lib/coachingCompass/*`, `physiologicalTargets.ts`, `vmaReference.ts`, détection des limiteurs ; tableau dans `docs/compass-targets-audit.md`.
- Ambition concrète : champs facultatifs sur l'objectif (migration additive), lecture seule pour le Compass.
- Verdicts : module pur `coachingCompass/factorVerdict.ts`, display-only, sans effet sur `unifiedLimiterDetection` ni sur les contrats IA/DET.

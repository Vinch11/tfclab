# Durées, contrats de prescription et copie PDF

## Défauts reproduits et corrections

- `postProcessParsedPlan` comptait 150 minutes pour « Sortie 90min. Version courte alternative 60min si fatigue. ». Le calcul écarte désormais les alternatives explicitement nommées, conserve la somme des étapes principales et privilégie toujours `durationMin` enregistré. Une durée absente reste inconnue ; le fallback vélo à 90 minutes n'est pas rétabli.
- Le résolveur arrondissait une dose fixe hors de sa propre plage (42–42 devenait 40). Les doses fixes, y compris décimales, sont conservées.
- L'impression omettait `durationMin` lorsque la description ne le répétait pas. Les vues portrait et paysage affichent maintenant la durée enregistrée, sans emprunter une durée à la bibliothèque et sans modifier le plan.

Le parseur de durée historique reste une heuristique pour les anciens textes. Cette correction des alternatives ne certifie pas toutes les formulations libres, les distances sans allure ni les blocs à dose ouverte.

## Explication des 100 conflits

Le premier cas de la matrice (`703:untrained:finisher:unknown`) comptabilisait 100 occurrences de `catalogue_sport`. La fixture fabriquait des séances de sport `mixed` à partir de fiches de mobilité/récupération. Le contrat accepte leurs occurrences en récupération ou renforcement, et les fiches multi-sport d'intention brique en `brick`. Aucune règle du contrat de production n'a été assouplie.

Le montage de la fixture corrigé supprime ces faux conflits dans les 600 configurations. Ce nombre désigne des configurations de préparation hors ligne, pas 600 plans générés ni une validation sportive.

## Référence comparative, sans effacer les alertes

L'ancienne empreinte datait de `1651a453` (octobre), avant les décisions sur les heures Auto, les courses B et les ajouts au catalogue. Elle ne pouvait plus prouver l'invariance du correctif courant.

Un checkout séparé de **`6bb104cd81377870765a971e2da58b85271c7b0c`**, sans changement de production, a rejoué les 600 cas avec seulement la même correction de fixture `mixed`. Les **600 lignes complètes sont strictement identiques** à celles du correctif, y compris les limites, les doses, les phases, les catalogues et les avertissements.

La référence `planningContractBaseline.json` conserve ce résultat. L'ancienne `catalogueCountingBaseline.json` reste inchangée pour ses relectures historiques. Les rapports sont désormais écrits avant les assertions afin qu'un échec conserve ses preuves.

Alertes conservées, et non converties en succès sportif :

| Observation | Nombre dans les 600 cas |
| --- | ---: |
| Configurations avec capacité calendaire insuffisante | 56 |
| Occurrences hebdomadaires de diversité limitée | 51 |
| Occurrences de dose minimale de catalogue au-delà du budget | 86 |
| Créneaux sans durée de catalogue disponible | 292 |

Ces comptes ne désignent pas des séances prescrites incorrectes. Ils restent visibles pour l'étude de faisabilité et la revue du coach.

## Tests actualisés selon les décisions existantes

- Charge, calendrier et dépassements quotidiens : l'alerte doit rester présente comme avertissement ; les contrôles de contenu incompatibles restent inchangés.
- Intensité : trois séances sont un repère, pas un plafond universel ni un quota obligatoire. Les règles de récupération demeurent testées.
- Course B : elle ne devient pas un deuxième pic A. La couverture des fenêtres reste complète ; les protections datées de la course et de la reprise sont vérifiées séparément.
- Catalogue : l'empreinte porte sur le catalogue réellement chargé et ses IDs uniques, pas sur un nombre fixe de 922 fiches.
- Approbation coach : elle ne remplace pas les prérequis vérifiés d'une séance avancée.
- Analyse : les nouveaux libellés de prudence n'altèrent pas le score et ne prétendent pas que l'athlète est « prêt ».

## Portée du contrôle sur le document reçu

Le PDF fourni couvre 32 semaines, avec marathon intermédiaire en S14 et Ironman en S32. Une copie annotée conserve les 95 pages originales et ajoute une revue des 32 semaines. Le document révèle notamment une reprise très abrupte, des doses non visibles, des consignes IM contradictoires et des totaux dont le périmètre varie.

Le dernier code comporte déjà des protections datées et un calcul partagé écran/impression. La revue du PDF ancien ne prouve pas qu'un nouveau plan complet a été généré correctement avec ces protections. Aucun plan enregistré, profil physiologique ou calendrier Nolio n'a été modifié. Aucun appel de génération payante ni déploiement n'a été effectué.

# Recette DET du 10 novembre 2026

La recette compare les mêmes 225 configurations synthétiques du formulaire coach au commit de référence `f01da7b`. Chaque ligne reprend le diagnostic issu du profil, le niveau et l’ambition saisis. Les contrôles examinent le calendrier et les blocs avant toute prescription.

Sur les 82 refus initiaux, 4 configurations produisent maintenant un calendrier complet. Sur les 118 projets initiaux, 118 sont toujours générés. Les 25 cas Start to Run empruntent leur protocole dédié.

| Objectif | Projets avant | Projets après | Refus après | Protocole distinct |
|---|---:|---:|---:|---:|
| IM | 11 | 15 | 10 | 0 |
| 703 | 15 | 15 | 10 | 0 |
| Marathon | 15 | 15 | 10 | 0 |
| Semi | 15 | 15 | 10 | 0 |
| 10K | 11 | 11 | 14 | 0 |
| StartToRun | 0 | 0 | 0 | 25 |
| TrailShort | 16 | 16 | 9 | 0 |
| TrailMountain | 19 | 19 | 6 | 0 |
| TrailUltra | 16 | 16 | 9 | 0 |

[Détail des 225 configurations](qualite-det-formulaire-20261110.csv)

## Motifs des refus actuels

| Premier obstacle rencontré | Cas |
|---|---:|
| Créneau sans dose admissible | 16 |
| Séance de qualité indisponible | 16 |
| Historique de reprise manquant | 15 |
| Combinaison de contraintes non résolue | 12 |
| Minimum supérieur au plafond | 9 |
| Diagnostic sans priorité | 5 |
| Enchaînement sans paire admissible | 4 |
| Recherche interrompue | 1 |

Un créneau ou une combinaison sans solution parmi les doses examinées laisse ouverte la possibilité d’un autre plan. Un minimum de durée supérieur au plafond se rapporte aux créneaux et aux fiches admissibles dans cette recherche. Le diagnostic et les données manquantes restent visibles.

## Preuve dans les blocs prescrits

Dans les semaines de charge sur route, les notes coach citent les séances clés ou longues dont les blocs répondent au critère du premier limiteur. La durée citée est celle de la séance entière. La rotation des fiches à durée équivalente préserve ce critère. Une correspondance avec un bloc ne démontre ni l’adaptation de l’athlète ni la suffisance du volume pour le chrono visé.

| Famille | Semaines de charge avec correspondance | Semaines de charge des projets |
|---|---:|---:|
| Route | 280 | 280 |
| Triathlon | 240 | 240 |
| Trail | 510 | 510 |

## Cas Ironman sur seize semaines

Le profil synthétique déclare un niveau entraîné, une ambition compétiteur et 14 h disponibles. Le diagnostic classe la durabilité, VLamax puis TTE. La recherche initiale refusait ce cas. DET peut maintenant réessayer sur toute la préparation avec des doses exécutables du catalogue V3 compatibles avec le profil. La nouvelle recherche exige une preuve sur séance clé ou longue à chaque semaine de charge applicable.

Les 9 semaines de charge présentent une composante vélo ou course pertinente. La première contient la fiche de course V3P_RUN_137. Après sauvegarde et relecture, le précontrôle Nolio prépare 175 opérations sur les seize semaines. Une semaine et une séance contrôlées isolément conservent les empreintes du plan complet.

Minutes de blocs chronométrés, de la première à la dernière semaine (certaines transitions et la course restent de durée inconnue) : 477, 522, 573, 308,5, 629, 688, 746, 344,5, 731, 721, 712, 344, 173, 178, 184, 155.

Le pic atteint 746 minutes. Les semaines 13 à 15 totalisent respectivement 173, 178 et 184 minutes. Cette baisse prolongée avant la course demande une revue du volume et de l’affûtage. Le précontrôle local vérifie le contenu préparé pour Nolio. La réception et le guidage sur montre restent à observer.

## Huit configurations complémentaires

Les essais utilisent le parcours de génération de la page avec le diagnostic d’origine. Les programmes dédiés réutilisent la référence triathlon de l’athlète synthétique et une cible explicite quand elle est demandée.

| Objectif | Niveau | Semaines | Résultat pour les entrées essayées |
|---|---|---:|---|
| 5K | trained | 8 | Hors du moteur DET |
| 10K | untrained | 12 | S1 : aucune combinaison V3 trouvée. Les créneaux exigent au moins 117 min de blocs pour un plafond de 72 min. Vérifier la fréquence et la disponibilité déclarées. |
| Semi | untrained | 16 | S1 : aucune combinaison V3 trouvée. Les créneaux exigent au moins 117 min de blocs pour un plafond de 96 min. Vérifier la fréquence et la disponibilité déclarées. |
| Sprint | trained | 8 | Limiteur principal non raccordé : FTP/kg. Aucune autre priorité n’est substituée. |
| Olympic | trained | 12 | S10 : aucune combinaison V3 trouvée. Aucune combinaison des doses examinées ne respecte ensemble le plafond de 540 min, la récupération et les exigences sportives de la semaine. |
| Cyclisme FTP | trained | 8 | S3 : aucune combinaison V3 trouvée. La continuité de charge ou la préparation de la décharge exige au moins 397.1 min pour un plafond de 371.8 min. |
| Cyclisme contre-la-montre | trained | 8 | Le calendrier commun ne fournit pas la semaine 1 ; aucun calendrier de remplacement n’est inventé. |
| Natation 1500m | trained | 8 | S1 : aucune séance de qualité V3 compatible avec le niveau, les restrictions et la phase de ce profil. L’ambition demandée ne peut pas être satisfaite avec les sources disponibles ; aucun niveau ni limiteur n’est modifié. |

# DET dans le parcours coach · recette du 10 novembre 2026

Sur les mêmes 225 configurations du formulaire, 124 donnent un plan complet à relire, contre 97 au commit de départ. Les 25 anciens refus de couverture VMA ou TTE donnent un plan. Les 97 plans déjà générés restent disponibles sur ces mêmes entrées. Les 76 refus restants sont détaillés individuellement dans la matrice. Les 25 configurations Start to Run relèvent du protocole de marche-course de TFCLab.

[Examiner les 225 cas, les priorités, les volumes et les motifs de refus](classement-det-225-profils-20261110.csv)

## Comparaison sur les mêmes entrées

Chaque objectif combine cinq réglages du niveau, dont le mode automatique, et cinq ambitions. Les charges, les contraintes et les profils sont synthétiques. Un refus du solveur laisse ouverte la possibilité qu’un autre plan soit faisable.

| Objectif | Plans avant | Plans après | Refus après | Protocole dédié |
|---|---:|---:|---:|---:|
| Ironman | 15 | 15 | 10 | 0 |
| Ironman 70.3 | 15 | 15 | 10 | 0 |
| Marathon | 10 | 15 | 10 | 0 |
| Semi-marathon | 15 | 15 | 10 | 0 |
| 10 km | 11 | 11 | 14 | 0 |
| Trail court | 11 | 16 | 9 | 0 |
| Trail montagne | 10 | 19 | 6 | 0 |
| Ultra-trail | 10 | 18 | 7 | 0 |
| Start to Run | 0 | 0 | 0 | 25 |

Sur les 76 refus, le premier obstacle concerne un créneau sans fiche admissible dans 16 cas, un historique de reprise trail manquant dans 15, une combinaison hebdomadaire non résolue dans 12, une séance de qualité indisponible dans 12, un minimum supérieur au plafond dans 9, une priorité absente du diagnostic dans 5 et un enchaînement vélo-course sans paire admissible dans 4. Deux cas d’ultra-trail peu entraîné restent sans dose compatible pour la VMA. Dans un cas, le solveur atteint son budget de recherche et la faisabilité reste indéterminée.

## Effet du classement du coach

Sur le même 70.3 de douze semaines, l’ordre VLamax → VO2max → TTE → FTP/kg devient VLamax → TTE → VO2max → FTP/kg. Les blocs changent en semaines 3, 4, 5, 6, 7, 8, 9. Le niveau, l’ambition, les données physiologiques et les disponibilités sont identiques.

Sur l’ultra-trail testé, le coach a remonté FatMax au premier rang. Le test retrouve le travail de ce rang dans chaque semaine de charge et dans les notes du plan sauvegardé. Pour un trail peu entraîné, la fiche V3P_RUN_206 propose deux fractions de cinq minutes au seuil, avec trois minutes de récupération. Le calcul attribue dix minutes de travail au TTE. Les prérequis de terrain, de tolérance et de seuil figurent sur la fiche.

La recette vérifie que treize libellés de TFCLab ont une correspondance avec un bloc principal du catalogue, dont FTP/kg, économie, robustesse, découplage et W′. La couverture sur un plan réel dépend de la discipline, des repères, des interdictions et des créneaux. Les rangs sans travail compatible sont signalés explicitement. La dose d’une répétition ne compte ni l’échauffement ni la récupération.

## Marathon 3 h 07 et Ironman sur seize semaines

Le marathon utilise un niveau entraîné, une ambition compétiteur, huit heures disponibles, une VMA de 18 km/h, une allure de seuil de 4 min/km et un objectif de 187 minutes. Le tableau rapporte les minutes de course. Pour l’Ironman entraîné compétiteur à quatorze heures disponibles, il rapporte tous les blocs chronométrés, renforcement compris. Les transitions inconnues et la compétition sont exclues des totaux. La charge des semaines de référence est celle du plan. Le coach peut la comparer à la charge réellement effectuée.

| Semaine | Marathon · course | Dont allure marathon | Sortie longue de course | Ironman avant | Ironman après |
|---:|---:|---:|---:|---:|---:|
| 1 | 276 | 0 | 90 | 477 | 480 |
| 2 | 281 | 0 | 95 | 522 | 526 |
| 3 | 180 | 0 | 75 | 573 | 574 |
| 4 | 295 | 0 | 110 | 308,5 | 314 |
| 5 | 298 | 12 | 120 | 629 | 627 |
| 6 | 191 | 0 | 84 | 688 | 688 |
| 7 | 335 | 30 | 110 | 746 | 751 |
| 8 | 360 | 45 | 120 | 344,5 | 350 |
| 9 | 219 | 0 | 84 | 731 | 765 |
| 10 | 400 | 60 | 132 | 721 | 736 |
| 11 | 397 | 60 | 145 | 712 | 724 |
| 12 | 251,5 | 0 | 101,5 | 344 | 344 |
| 13 | 434,5 | 60 | 159,5 | 173 | 393 |
| 14 | 243 | 10 | — | 178 | 363 |
| 15 | 202 | 10 | — | 184 | 357 |
| 16 | 114 | 10 | — | 155 | 234 |

L’Ironman compte 9 semaines de charge avec une dose attestée dans les blocs d’une séance clé ou longue. Le précontrôle du plan sauvegardé prépare 175 opérations Nolio. Les deux semaines d’affûtage du marathon et la semaine de course conservent du travail à l’allure visée. Aucune de ces vérifications ne prédit le chrono final.

Un essai distinct a fait varier le volume récent renseigné par le coach à disponibilités et ambition identiques. Pour le marathon, 282 minutes hebdomadaires récentes donnent une première semaine de 278 minutes, contre 338 sans cette donnée. Sur le 70.3, 384 minutes récentes donnent une première semaine de 384 minutes pour dix heures disponibles, contre 455,5 minutes sans ce renseignement. Ces totaux concernent les blocs chronométrés.

## Autres objectifs, horizons et export

Les programmes FTP et CSS utilisent une cible d’amélioration saisie. Pour chaque plan assemblé ci-dessous, la recette relit la version sérialisée, prépare le plan entier, puis compare les empreintes des opérations d’une semaine et d’une séance à celles du plan entier. Les identifiants de sport, de compétition et d’athlète Nolio sont simulés.

| Objectif | Semaines | Heures disponibles | Résultat | Opérations Nolio du plan |
|---|---:|---:|---|---:|
| 5 km | 8 | 4 | S6 : aucune combinaison V3 trouvée. Aucune combinaison des doses examinées ne respecte ensemble le plafond de 183.7 min, la récupération et les exigences sportives de la semaine. | — |
| 5 km | 12 | 6 | Plan à relire | 66 |
| 10 km | 12 | 3 | S1 : aucune combinaison V3 trouvée. Les créneaux exigent au moins 117 min de blocs pour un plafond de 72 min. Vérifier la fréquence et la disponibilité déclarées. | — |
| Semi-marathon | 16 | 4 | S1 : aucune combinaison V3 trouvée. Les créneaux exigent au moins 117 min de blocs pour un plafond de 96 min. Vérifier la fréquence et la disponibilité déclarées. | — |
| Triathlon sprint | 8 | 8 | Plan à relire | 62 |
| Triathlon olympique | 12 | 9 | Plan à relire | 105 |
| Triathlon sprint | 12 | 10 | Plan à relire | 105 |
| Triathlon olympique | 16 | 12 | Plan à relire | 162 |
| Cyclisme FTP | 8 | 7 | S5 : aucune combinaison V3 trouvée. Le budget de recherche est épuisé. La faisabilité reste indéterminée. | — |
| Cyclisme contre-la-montre | 8 | 7 | Contre-la-montre : ce formulaire ne fournit pas le calendrier vélo spécifique. Le parcours CLM dédié utilise la durée de course et les durées en position aéro tolérées, renseignées par le coach. | — |
| Natation 1500m | 8 | 4 | Plan à relire | 37 |
| Marathon | 40 | 8 | Plan à relire | 261 |
| Semi-marathon | 30 | 7 | Plan à relire | 165 |
| Cyclisme FTP | 12 | 9 | Plan à relire | 56 |
| Natation 1500m | 12 | 6 | Plan à relire | 68 |

Le cas Ironman vérifie aussi les trois sélections d’export. Les tests du parcours normal contrôlent le format des allures de course, de natation et les bornes en watts dans les blocs envoyables. Une PMA absente rend inéligible une prescription vélo qui en dépend. L’entraînement en côte conserve une revue de terrain, sans transposition d’une allure de plat. Le guidage sur une montre et la réception par le service Nolio restent à vérifier sur un compte de test dédié.

Le document d’impression du marathon a été généré depuis le plan synthétique. Le rendu PDF local par MuPDF comporte les seize semaines et la compétition en fin de document. La pagination de ce rendu peut différer de celle du navigateur du coach. Le protocole distinct Start to Run conserve ses tests de marche-course et de consolidation.

## Périmètre de la livraison

Le travail est livré sur une branche GitHub isolée, issue de d076c4e. Le moteur IA de génération et sa variante de test gardent respectivement les empreintes e131918efe12 et 063a8a29c479. Le formulaire commun, les fonctions serveur, le schéma de données, l’exporteur Nolio et le manifeste partagé de mise en production conservent leurs fichiers d’origine. La porte d’entrée DET ne reconnaît le 5 km que pour la génération DET. Les tests ont utilisé des athlètes synthétiques et la génération locale.

La publication actuelle de TFCLab recalcule un identifiant commun au frontend, à DET et aux fonctions IA. La branche de recette est disponible pour revue. La mise en service de ces changements demanderait une livraison de DET isolée de cette publication commune. La validation des effets sportifs et de la pertinence des doses sur des athlètes réels relève d’une relecture de terrain.

La recette inclut 20 tests du protocole débutant. La série de 33 tests d’intégration de la filière DET avec revue distincte comprend notamment un CLM accepté avec les données posturales du profil de test. Cette acceptation concerne cette filière, distincte du formulaire ordinaire.

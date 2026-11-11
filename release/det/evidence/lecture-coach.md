# DET 2.1 — lecture des plans de référence

## Décisions sur le formulaire

Le rejeu des mêmes 200 configurations DET conserve les 156 plans complets de référence. Il en assemble 164. Les huit gains sont les trois Ironman légers qui bloquaient en S9 et les cinq bilans 10 km exploitables sans déficit dominant. Les plans emploient 325 fiches V3 distinctes. Cette mesure porte sur les fiches présentes dans les semaines effectivement construites.

| Objectif | Plans assemblés | Données demandées ou limite rencontrée |
|---|---:|---|
| Ironman / 70.3 | 20 + 20 | 10 reprises demandent le volume hebdomadaire réellement pratiqué et la durée de vélo facile récemment tolérée. DET réutilise chaque valeur déjà renseignée. |
| Marathon | 20 | 5 reprises demandent le volume hebdomadaire récent et la durée de sortie longue à pied tolérée. |
| Semi-marathon | 23 | 2 reprises sur huit semaines gardent une limite moteur. Le coach voit les rangs sans dose admissible pour Durabilité et VO₂max. |
| 10 km | 21 | 4 reprises demandent le volume hebdomadaire récent et la tolérance réelle aux fractions de trois minutes au seuil. |
| Trail court / montagne / ultra | 20 + 20 + 20 | 15 reprises demandent le volume récent, la sortie longue tolérée et la durée maximale prévue. |

En dehors de la matrice, le calendrier trail distingue un conflit de dates d’une limite de placement. Une course avant le début ou après la fin des semaines choisies demande de modifier les dates ou la durée. Une course en S2 à l’intérieur d’une préparation de 12 semaines révèle une limite du calendrier DET, qui termine actuellement la préparation trail avec l’épreuve. Si les compléments laissent un seul créneau de course, DET indique que sa trame en demande deux. Si les compléments occupent tous les créneaux, le coach voit quels choix entrent en conflit.

Le parcours Start to Run dispose d’un protocole marche-course dans TFCLab. Les 25 combinaisons correspondantes sont essayées séparément. Le formulaire ouvre le parcours du protocole standard. Une demande directe au worker renvoie `outside_det`, y compris sans bilan physiologique. Aucun plan personnalisé DET n’est compté pour cet objectif.

## Rejeu après saisie de l’historique

Les 34 demandes initiales ont aussi été rejouées avec un historique précis. Chaque profil déclare trois heures par semaine sur quatre semaines. Le coach indique ensuite la sortie récente ou les fractions effectivement tolérées. Huit projets se construisent. Les 26 autres dossiers reçoivent une explication de limite moteur.

| Historique synthétique ajouté | Projets assemblés | Limite moteur après saisie |
|---|---:|---:|
| 75 min de vélo facile, Ironman / 70.3 | 0 / 0 | 5 / 5 |
| 65 min de sortie longue à pied, marathon | 2 | 3 |
| 2 × 3 min au seuil tolérées, 10 km | 4 | 0 |
| Sortie trail de 75 min, plafond futur 105 min, court / montagne / ultra | 2 / 0 / 0 | 3 / 5 / 5 |

Le premier calendrier de reprise demande dix créneaux sur Ironman et huit sur 70.3. Les doses V3 admissibles essayées en S1 totalisent au moins 243 et 191 min respectivement pour 180 min réellement pratiquées. Avec cinq heures récentes et la même sortie vélo de 75 min, deux des cinq profils Ironman vont au bout des 16 semaines. Le vélo facile peut se répéter sur deux jours non consécutifs. La semaine 6 contient 334 min, dans le plafond de 352 min résultant des 320 min de S5. Les trois autres profils indiquent les rangs sans dose sportive admissible.

En reprise marathon, les cinq montages atteignent 122 min sur les pieds en S13, dont 32 courues et 90 marchées. Deux arrivent jusqu’au précontrôle. Pour les trois autres, le coach voit les priorités sans dose. Dans les cinq cas, la part courue des 65 min récentes et la stratégie de course-marche en compétition restent à apprécier. [Doses par semaine et par ambition](marathon-reprise-3h65.json)

En reprise trail montagne et ultra, le coach voit que la sortie longue sur sentier n’a aucune fiche V3 admissible à son niveau dès le dimanche de S1. En trail court, le moteur accepte un plafond futur inférieur à une sortie passée et vérifie les durées résultantes. Un plafond explicite de **0 min** entre en conflit avec les sorties longues demandées par cet objectif. Un historique de **0 h** est une déclaration de reprise sans pratique. Une case laissée vide reste une demande de donnée. [Motifs et observations des 34 rejeux](coach-historiques-renseignes.json)

## Marathon en 3 h 07

Les trois profils ci-dessous déclarent cinq heures hebdomadaires récentes. Les minutes désignent les blocs réellement programmés, hors compétition. Une ambition chronométrique ne garantit pas que l’athlète atteindra le résultat.

| Profil synthétique | Disponibilité | Pic hebdomadaire à pied | Plus longue sortie | Dose à l’allure marathon en S13 |
|---|---:|---:|---:|---:|
| Peu entraîné | 8 h | 272 min | 132 min | 15 min |
| Entraîné | 8 h | 434,5 min | 159,5 min | 60 min |
| Entraîné | 6 h | 336 min | 137 min | 50 min |

Avec un seuil mesuré à 4 min 20 s/km, la même cible de 3 h 07 demande environ 4 min 26 s/km. Cette allure sort du domaine utilisé par les fiches spécifiques de TFCLab. Le coach peut garder le chrono comme objectif et examiner le seuil. DET indique que son catalogue ne permet pas de prescrire ces blocs avec le repère actuel. [Contrôles du chrono et du domaine d’allure](../../../src/lib/det/__tests__/normalPlanSportingQuality.test.ts)

Pour l’athlète entraîné à huit heures de disponibilité, le volume de course est de 235 min en S1. En S8, il atteint 360 min, dont 45 min à l’allure marathon. En S13, la sortie longue atteint 159,5 min. Les semaines S14 à S16 comptent ensuite 243, 202 et 114 min de course hors épreuve. Elles conservent chacune 10 min à l’allure marathon. Le coach peut confronter cette réduction et la dose spécifique au comportement de son athlète lors de préparations précédentes. [Semaines et séances du témoin marathon](marathon-3h07-coach.json)

## Ironman et reprises en course à pied

Les trois Ironman légers de 16 semaines franchissent S9. En S3, un seul rendez-vous comprend 19 min de vélo et 12 min de marche-course, avec cinq minutes pour la transition. En S11, les deux sorties longues atteignent 150 min à vélo et 100 min à pied. Quatre exemples de reprises plus longues produisent entre cinq et huit enchaînements avant l’affûtage. Deux autres reprises avec quatre priorités restent limitées par les doses compatibles pour FatMax, FTP/kg et VO₂max. [Témoins Ironman et 70.3](ironman-et-reprise-coach.json)

Pour les quatre 10 km de reprise, un exemple avec trois heures hebdomadaires réellement pratiquées et deux fractions tolérées de trois minutes produit huit semaines. Les séances de S5 et S6 contiennent six minutes de travail au seuil et réservent au moins 48 heures avant la course suivante. Une valeur de TTE estimée dans le bilan ne prouve pas que l’athlète a toléré ces fractions depuis sa reprise. [Doses, calendrier et raisons des deux refus en semi](route-10km-semi-reprise.json)

## Limiteurs et guidage

Sur le 70.3 de 12 semaines, permuter les rangs 2 et 3 change les blocs de S1 à S9. Sur la préparation de 24 semaines, permuter les rangs 3 et 4 change S13 à S21. Le plan consigne la dose des priorités travaillées et la date de réévaluation des priorités différées. [Comparaisons à données constantes et cas supplémentaires](coach-complements.json)

Sur les 164 plans assemblés, le précontrôle Nolio du plan complet aboutit pour 104 avec les données du scénario initial. Les 60 trails ont besoin de cibles d’effort associées au terrain observé. Trois tests supplémentaires couvrent le court, la montagne et l’ultra avec des observations synthétiques renseignées pour les fiches utilisées. Le précontrôle vérifie alors les étapes, les RPE et les trois portées d’export. L’envoi réel, la relecture Nolio et la réception sur montre font chacun l’objet d’une preuve distincte. [Matrice et raisons par configuration](coach-matrix.json)

## Recette sur le site et chez Nolio

Sur le domaine publié, Chromium a généré les deux témoins de 16 semaines. Les précontrôles du plan, de S1 et d’une séance ont préparé respectivement **103, 7 et 1** opérations pour le marathon et **166, 11 et 1** pour l’Ironman. [Recette Chromium des deux témoins](https://github.com/Vinch11/tfclab/actions/runs/42938333824)

Les trois fonctions d’export DET répondent **HTTP 404** sur le projet du site. Le workflow de déploiement s’est arrêté avant leur installation, faute de secret de déploiement Supabase. La migration des cinq tables et sept procédures a été vérifiée sur ce projet. L’identification du pilote, l’envoi suivi d’une relecture Nolio V2 avec le même identifiant, l’observation des étapes sur sa montre appairée et l’avis sportif indépendant restent ouverts. [Journal de recette](parcours-publie.json) · [Déploiement des fonctions](https://github.com/Vinch11/tfclab/actions/runs/42934250538)

# Qualité sportive de DET-ENGINE dans TFCLab

## Objectif produit

Dans le parcours coach qui propose IA ou DET, DET utilise le profil physiologique existant, les limiteurs classés par TFCLab, l’objectif, l’ambition effective, le niveau et les contraintes déclarées. Le travail porte sur les plans que le coach peut réellement générer. Le moteur IA, ses prompts, le diagnostic partagé et le comportement de son export sont hors périmètre.

Une donnée de charge ou d’assimilation absente reste inconnue. La construction initiale part des données disponibles au coach. L’adaptation ultérieure peut utiliser sa nouvelle évaluation et les retours d’entraînement. Une durée disponible et un chrono visé ne constituent pas une mesure de tolérance.

## Ordre des livraisons

| Ordre | Chantier DET | Résultat que le coach peut contrôler |
| --- | --- | --- |
| 1 | Tenir un inventaire par point d’entrée, objectif, niveau, ambition, limiteur et horizon. Comparer sur des profils anonymisés ou synthétiques deux plans en ne changeant qu’une donnée. | Une ligne par cas, avec les entrées effectivement retenues, le nombre de semaines, les fiches sélectionnées et le motif d’un éventuel refus. Premier relevé disponible pour le formulaire principal. |
| 2 | Raccorder le parcours trail court, montagne et ultra. Reprendre les calendriers et contrôles de terrain propres au trail. Traiter d’abord les priorités VLamax et TTE rencontrées sur le banc, en tenant compte du sens du diagnostic et du terrain effectivement disponible. | Un plan complet contrôlable dans chaque famille sur un profil compatible. Le coach peut relier les séances clés, le terrain, le dénivelé, la récupération et la progression au profil déclaré. Une donnée absente ou une combinaison irréalisable est identifiée. |
| 3 | Rendre la sélection accessible aux niveaux reprise et peu entraîné en course et triathlon. Distinguer un manque de fiche ou de dose, une contrainte de calendrier et une demande incompatible. Vérifier les combinaisons du haut niveau avec des volumes et des profils représentatifs. | Sur un même objectif, faire varier séparément le niveau, l’ambition et le volume habituel. Montrer les différences de première semaine, de sortie longue, de répétitions, de rappels et d’affûtage. Fournir des séances complètes au niveau déclaré ou expliquer la contrainte précise. |
| 4 | Étendre le lien entre limiteur prioritaire, chantiers de préparation et blocs prescrits à chaque discipline. Travailler les limiteurs secondaires et les enchaînements. Choisir parmi les fiches V3 compatibles et enrichir les manques identifiés. | Pour chaque bloc de préparation, afficher le chantier, les séances qui le servent, leurs cibles et leur dose. Vérifier la variété à stimulus comparable et la continuité des séances repères. La priorité du diagnostic reste visible quand aucune dose n’est établie. |
| 5 | Étendre la recette aux autres entrées et horizons de TFCLab. Inclure le 5 km du démarrage rapide, Start to Run et son protocole marche-course, les triathlons sprint et olympique, les programmes vélo/CLM et natation identifiés dans le dépôt, les objectifs intermédiaires et les plans longs. | Pour chaque objectif, documenter où le coach y accède, avec quels niveaux et ambitions, quelles données sont requises et quelles combinaisons ont réussi. Préserver la progressivité du protocole débutant. |
| 6 | Vérifier le parcours coach jusqu’à la séance reçue. | Pour les familles corrigées, relire le plan sauvegardé, ses chantiers, le PDF et les blocs Nolio au niveau séance, semaine et plan. Contrôler les allures en min/km, les watts, les zones personnelles et les bricks, puis le guidage sur montre sur un compte test. La revue sportive du coach porte sur les séances réellement retenues. |

À chaque livraison, publier le tableau avant/après, les refus attendus et inattendus, un exemple de séances modifiées et les limites des contrôles. Les régressions se comparent sur les mêmes entrées. Une ambition élevée peut rester irréalisable dans les conditions saisies. Dans ce cas, une explication vérifiable est un résultat attendu.

## Premier relevé du 9 novembre 2026

La base est la branche d’intégration de la PR #469 au commit `aed84c153e2e1130d2bc3b7405a7f10a14394762`. Le formulaire normal propose neuf objectifs, quatre niveaux déclarés et le mode Auto, ainsi que cinq ambitions. Les 225 combinaisons correspondent à un profil synthétique de référence par objectif, avec les heures et fréquences du scénario constantes. Le mode Auto utilise un TSS 7 j présent. Les ambitions peuvent être ajustées par l’application. Le tableau conserve valeurs saisies et effectives.

Le banc appelle le diagnostic et le constructeur de configuration utilisés par les tests d’intégration puis la fonction DET de la page coach. Il opère hors ligne et ne fournit aucune attestation de prescription, de déploiement, d’acceptation Nolio ou de guidage sur montre. Un refus peut être justifié. L’épreuve technique couvre un profil et un horizon par objectif et laisse ouvertes les variations physiologiques individuelles ainsi que les autres écrans de TFCLab.

| Objectif du formulaire | Plans construits | Refus DET | Hors générateur DET |
| --- | ---: | ---: | ---: |
| 10 km | 11 | 14 | 0 |
| Semi-marathon | 15 | 10 | 0 |
| Marathon | 15 | 10 | 0 |
| Ironman 70.3 | 15 | 10 | 0 |
| Ironman | 11 | 14 | 0 |
| Trail court | 0 | 25 | 0 |
| Trail montagne | 0 | 25 | 0 |
| Ultra-trail | 0 | 25 | 0 |
| Start to Run | 0 | 0 | 25 |
| **Total** | **67** | **133** | **25** |

Parmi les 75 refus trail, 70 concernent le raccordement du limiteur prioritaire et 5 l’absence du calendrier hebdomadaire dans ce parcours. Hors Start to Run, les 40 combinaisons au niveau de reprise ont refusé et 2 des 40 combinaisons au niveau peu entraîné ont produit un plan. Des refus concernent notamment le renforcement, la natation ou les bricks. Ces chiffres décrivent les configurations du banc.

### Premier correctif

Dans les semaines de charge des triathlons, DET examine les blocs vélo et course des séances clés et longues avec les critères existants de leur discipline. Lorsque plusieurs fiches de dose équivalente sont possibles, la rotation favorise une composante justifiée pour le premier limiteur et préserve une correspondance déjà établie. Le résultat par semaine identifie les sources retenues ou signale la vérification en attente. Cette vérification de composantes laisse ouvertes la natation, la pertinence de la dose totale, la récupération et l’évaluation sportive du plan entier.

Le test comparatif 70.3 conserve le même profil, le même objectif, le même niveau, la même ambition et les mêmes disponibilités. Il vérifie que promouvoir TTE devant VLamax dans la liste des limiteurs effectivement diagnostiqués modifie le contenu des séances clés ou longues et que le contrôle suit le nouveau premier limiteur.

Les 225 statuts de construction sont identiques avant et après. Dans les 26 plans de triathlon construits, chacune des 204 semaines de charge comporte au moins une composante vélo ou course répondant au critère individuel appliqué par le banc. Plusieurs sources peuvent apparaître dans une même semaine. Ce constat mesure une présence. Le temps total passé sur ce chantier et son dosage entre disciplines restent à apprécier.

La version DET enregistrée dans le plan inclut désormais le sélecteur de séances utilisé par la page coach. Un test modifie ce sélecteur dans une copie temporaire et contrôle le changement de version DET ainsi que les empreintes des deux composants IA.

[Détail des 225 combinaisons](qualite-det-formulaire-20261109.csv)

### Rejouer

Depuis la racine du dépôt, avec les dépendances du projet installées, lancer la commande suivante. La sortie JSONL peut être conservée en donnant à `DET_MATRIX_JSONL` le chemin d’un nouveau fichier. `DET_OBJECTIVES` accepte une liste de clés séparées par des virgules pour rejouer un groupe.

```sh
node_modules/.bin/vitest run --config scripts/quality/det/vitest.config.ts --maxWorkers=1
```

### Raccordement des trois objectifs trail au formulaire coach

Les 75 mêmes configurations trail donnent désormais 51 calendriers à relire et 24 refus. Trail court passe de 0 à 16 sur 25, montagne de 0 à 19, ultra de 0 à 16. Les 150 autres configurations ont été rejouées. Les neuf objectifs totalisent désormais 118 projets assemblés, 82 refus explicites et 25 parcours Start to Run distincts.

Dans ces 51 projets, 510 semaines de charge sur 510 contiennent une séance clé ou longue répondant au contrôle du premier limiteur. Ce décompte atteste une présence dans les blocs. Il ne mesure ni l’adaptation obtenue ni la suffisance de la préparation pour le jour de course. Le banc synthétique concentre plusieurs combinaisons sur le même profil physiologique.

Dans les trois exemples entraînés, la durée récente renseignée est de 100 minutes et le plafond de 150 minutes. Les sorties longues passent de 100 à 150 minutes avec des trajectoires distinctes. Les trois exemples gardent un affûtage à examiner, particulièrement sur les préparations longues. La course figure à sa date, hors du volume chronométré. Le coach retrouve dans chaque semaine les minutes de course, la sortie longue et les fiches associées au chantier.

Sur les 24 refus trail, 15 concernent le renforcement en reprise, 5 la combinaison des contraintes hebdomadaires et 4 l’absence de séance de qualité compatible. Le contrôle du terrain reste ouvert sur les 51 projets. L’écart entre terrain d’entraînement et parcours cible, la tolérance au dénivelé et aux descentes, la suffisance des doses selon l’ambition et le guidage terrain restent à valider. La représentation structurée destinée à la montre refuse explicitement les cibles de course en attente de cette vérification.

[Résultats des 75 profils trail](qualite-det-trail-20261109.csv) · [Trois plans synthétiques, calendrier complet et blocs de séances](exemples-trail-det-20261109.md)

### Premier cas de reprise avec historique déclaré

Deux fiches de renforcement de douze minutes au poids du corps et trois fiches de marche-course sur sentier court entrent dans la sélection DET. Elles ont des mouvements, des temps de récupération et des bornes propres au niveau de reprise. Leur statut reste candidat. Les fiches de marche-course sont réservées au trail court et les charges sont bornées par les paramètres du coach.

Le cas supplémentaire de 8 km et 150 m D+ produit douze semaines. Les sorties longues progressent de 40 à 60 minutes, avec deux semaines de récupération et un affûtage. Sans volume récent et sans repères de sortie longue, le formulaire retourne au coach la donnée à compléter. Dans la matrice de référence sans cet historique, les 15 combinaisons trail en reprise demandent désormais ces données. Le décompte global conserve 118 projets, 82 refus et 25 parcours distincts.

[Calendrier du cas de reprise](exemple-reprise-trail-20261109.md)

[Matrice des neuf objectifs après le travail sur la reprise — 225 combinaisons](qualite-det-formulaire-apres-reprise.csv)

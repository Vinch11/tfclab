# D1.10 — 70.3 : test de faisabilité conjointe par temps (sans nouvelle politique)

**Branche expérimentale uniquement ; aucune donnée réelle, aucune prescription, aucune activation.**

## Question scientifique/technique précise

D1.3 a révélé que la natation constituait 16,9–17,9 % des minutes d'endurance, et non 29 % des *séances*. Cela ne suffit pas à qualifier les distributions vélo et course. La bibliothèque V1 ne permet pas toujours de ventiler les bricks en minutes vélo/CAP/transition.

Le nouveau contrôle D1.10 répond à une question plus forte : « En autorisant **toute** répartition non négative des minutes non ventilées du brick entre vélo, course et transition, peut-on atteindre **simultanément** les trois plages de répartition natives, **SI** ces plages exprimaient des proportions de temps ? »

L'algorithme compare les secondes exactes structurées issues de `auditD14DurationRatios` à `SPORT_RATIO_TARGETS["703"]`. Les minutes du brick restent dans le dénominateur une seule fois, et aucune durée inconnue n'est interprétée comme zéro. Il teste conjointement les minima/maxima : deux intervalles marginaux apparemment possibles ne prouvent pas qu'une répartition commune existe. Si même une allocation **optimiste** des bricks est impossible, changer uniquement le validateur ne rendrait pas le plan sportivement cohérent.

## Portée des scénarios

- Plages natives à examiner : natation 15–20 %, vélo 40–50 %, CAP 30–40 %.
- Première comparaison **strictement hypothétique**, sans tolérance ; deux autres avec ±3 et ±8 points pour identifier l'origine des alertes historiques. Ni ces tolérances ni la lecture par durée ne sont activées dans le produit.
- Les trois candidats D1.2 (S1–S3) sont rejoués sans modification, avec statut par profil, intervalles des trois sports, temps de brick non ventilé et impossibilités prouvées.
- Une impossibilité établie peut justifier de revoir la construction des durées et l'organisation des séances, **pas** de supprimer des séances nécessaires, d'inventer du HIT ou de multiplier les entraînements sans contrôle de récupération.
- Un résultat « potentiellement compatible » avec brick inconnu ne signifie jamais conforme. Une durée absente bloque le calcul.
- Le même rapport est rendu visible dans l'interface QA de D1.9, sans modifier l'application active.

## Décision de produit

**NO-GO inchangé**. Avant toute fusion, le coach doit décider si les plages ciblent effectivement les *minutes d'endurance* et si elles sont réalistes pour l'objectif, le niveau et la phase. Ensuite, toute répartition envisagée exige une construction de séances V2 compatibles, un volume hebdomadaire conservé, les minima sportifs, l'évaluation de l'accumulation des séances exigeantes, une revue du limiteur, et les validateurs natifs.

Le moteur ne peut pas devenir « fiable » en faisant simplement passer un contrôle au vert. La prochaine correction doit agir sur l'allocation des minutes **à l'intérieur des limites de séance et de récupération**, avec comparaison de faisabilité avant d'engager un modèle supplémentaire.

## Vérification complémentaire — fiche Stage 1 historique (D1.10b)

La fiche réelle `BRICK_STAGE1_INTRO` contient seulement les deux blocs **45–60 min vélo Z2** et **15–20 min course Z1**, avec une plage totale de 60–90 min. Les candidats D1.2 des semaines S1–S3 sélectionnent chacun un brick de **60 min**. *Si cette durée prescrite désigne exactement la somme des blocs de la fiche*, une seule combinaison satisfait les bornes : 45 min vélo + 15 min course, sans temps de transition comptabilisé. C'est une déduction sur la **prescription écrite**, pas une observation d'exécution ni une durée de transition mesurée. Le module `d110V1BrickSourceProof.ts` refuse toute fiche différente, tout autre ID, et toute durée différente de 60 min.

En appliquant uniquement cette déduction conditionnelle aux trois profils synthétiques historiques :

| Profil | Natation | Vélo | Course | Comparaison hypothétique aux plages natives |
| --- | ---: | ---: | ---: | --- |
| Aérobie | 16,9 % | 51,6 % | 31,5 % | Vélo dépasse 50 % de 1,6 point |
| Glycolytique | 17,6 % | 52,7 % | 29,7 % | Vélo +2,7 points ; course −0,3 |
| Équilibré | 17,9 % | 48,2 % | 33,9 % | Trois parts dans les plages |

Si l'on **interprétait** les trois plages comme des proportions de minutes avec une tolérance hypothétique de ±3 points, ces résultats ne signaleraient **aucun dépassement**. Cela ne règle pas le problème du validateur actuel (qui compte les séances) et ne démontre ni la qualité de la sélection, ni l'adéquation de la dose, ni la validité sportive des plages choisies.

**Conséquence stratégique :** le blocage de ratio n'est pas une preuve que toutes les distributions par durée sont incohérentes. Le correctif doit d'abord définir clairement l'unité cible et le traitement des bricks, puis vérifier le contenu physiologique et les garde-fous sportifs indépendants. Toute transformation silencieuse des ratios de production reste interdite.

# D1.4 — Mesure du ratio par temps et preuve de stimulus (pilote isolé)

**Statut : DRAFT / NO-GO sportif, clinique, applicatif et production.**
Branche indépendante fondée sur la PR #428, SHA `4bca08f71b7e951c5167ebc4d02a438891e7a9c2`. Aucune politique modifiée.

## Résultat recherché

Ne plus confondre quatre objets différents :

1. Fréquence des séances, unité actuelle du contrôle `sport_ratio` dans `planValidator.ts`.
2. Durées totales structurées, unité du diagnostic expérimental `d14RatioEvidence.ts`.
3. **Composition effective des bricks**, qui exige le détail explicite et vérifié vélo/CAP/transition, non une répartition 50/50 supposée.
4. **Stimulus physiologique réel**, qui exige davantage qu'une étiquette `isKeySession`, `intentFamily` ou `mainZoneMax`.

Le calcul D1.3 donne 16,9 %, 17,6 % et 17,9 % de **natation seule** sur les trois blocs S1–S3. Cette observation ne prouve pas la conformité des ratios vélo/course : les bricks, de durée totale connue, n'ont pas de ventilation structurée disponible dans le candidat D1.2. La mesure D1.4 conserve leur durée **une seule fois** au dénominateur, publie le pourcentage de natation connu, mais indique `non_conclusive` pour les ratios vélo et course. Elle n'applique **aucune** tolérance ou cible sport en production.

## Contrats du diagnostic par durée

- Repos et renforcement exclus du dénominateur endurance.
- Toute durée d'endurance absente, nulle, négative, infinie, non représentable en secondes entières ou discipline inconnue : **non concluant**, tous pourcentages nuls au sens `null` (jamais 0 %).
- Brick non ventilé, non vérifié ou dont la somme vélo+course+transition diffère du total : **non concluant** sur vélo/course, avec extrema de parts possibles et natation observable si toutes les durées sont connues.
- Brick vérifié : fractions vélo, CAP et transition exactes en secondes ; la transition reste visible et n'est pas inventée comme charge vélo ou CAP.
- Même un ratio calculé intégralement n'est qu'une mesure. Les cibles 70.3 actuellement `swim 15–20 / bike 40–50 / run 30–40` ne sont **pas automatiquement réinterprétées** comme des plages horaires : décision de politique scientifique/coach encore requise.

## Contrats du diagnostic de séance-clé

- `key` indique une place dans la structure, **pas** un seuil/VO2 réellement effectué.
- `intentFamily=seuil/vo2/sprint/race_pace` signale une intention éditoriale, **pas** une prescription démontrée.
- Des segments chronométrés, une référence sportive vérifiée, une justification par limiteur et des compatibilités phase/récupération explicites sont nécessaires pour produire le statut `supported_pending_coach_review`.
- Même dans ce dernier cas, **pas d'insertion automatique** et **pas de GO sportif** : charge cumulée, séances proches, douleurs, interdictions et réponse individuelle doivent encore être validées par les garde-fous existants puis par le coach.
- Sur une semaine de décharge, le contrôle d'absence de séance-clé de charge est marqué `not_applicable`, sans transformer cela en permission de faire du HIT.

## Vérification

Fichiers : `experimental/workout-v2/d14RatioEvidence.ts`, `experimental/workout-v2/d14StimulusEvidence.ts`.
Tests : `src/lib/workout-v2/__tests__/d14RatioEvidence.test.ts`, `src/lib/workout-v2/__tests__/d14StimulusEvidence.test.ts`.

Cas couverts : durée manquante ; répartition de brick non vérifiée ou incohérente ; transition explicite ; exactitude à la seconde ; libellé « key » sur séance technique ; intention seuil sans structure de travail ; absence de preuve individuelle ; semaine de récupération ; trois profils D1.2 au complet pour S1–S4 en diagnostic.

**Pour lever le NO-GO**, étape suivante, distincte : proposer un contrat de répartition des temps approuvé sportivement, faire transiter des durées de segments V2 réellement structurées et des références physiologiques documentées, puis exécuter les validations natives et la recette sauvegarde/réouverture. L'audit D1.4 est délibérément en lecture seule : aucune correction forcée des candidats ou suppression d'alerte.

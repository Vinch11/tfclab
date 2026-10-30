# TFCLab — V32 : trois bricks V3 supplémentaires dans DET-ENGINE

**Date : 30 octobre 2026. Périmètre : PR #445 sur la branche DET-ENGINE expérimentale. DRAFT / NO-GO pour la prescription réelle et la production.**

## Témoin exécuté (fixtures 70.3 synthétiques uniquement)

À partir du vrai catalogue de 400 recettes V3, le pont V32 assemble trois **candidats** avec revue individuelle synthétique, sans inventer une 401e recette et sans modifier les sources :

| Nouveau ID de composition | Composant vélo | Transition | Composant course | Total | Phase |
|---|---|---:|---|---:|---|
| V3B_703_BUILD_180 | V3P_BIKE_090, 132 min | 6 min | V3P_RUN_041, 42 min | 180 min | build |
| V3B_703_BUILD_120 | V3P_BIKE_057, 74 min | 4 min | V3P_RUN_041, 42 min | 120 min | build |
| V3B_703_PEAK_150 | V3P_BIKE_085, 99 min | 9 min | V3P_RUN_041, 42 min | 150 min | peak |

Les paramètres de ces trois candidats correspondent aux **valeurs de base exactes** de leurs sources. Le changement de dose d'un composant exige un nouvel agrément de recette ; il n'est pas masqué par un simple changement de durée déclarée. Un refus est conservé pour : revue source manquante, objectif incompatible, transition non approuvée, source altérée ou durée différente du total exact.

### Avant/après issu de l'exécution CI ciblée au SHA 50184f2b

**31 tests V31/V32 ciblés réussis.** Le moteur a réellement reconstruit un candidat 70.3, sans déclarer les contraintes sportives satisfaites.

| État de sortie | Avant compositions build/peak | Après |
|---|---|---|
| Minutes de bricks historiques non ventilables | 750 | **180** |
| V3 base S1/S2/S3 | 3 × 105 min | identique |
| S5 | historique 180 min, non décomposé | V3 180 min exact |
| S6 | **historique IM 300 min**, non décomposé | V3 120 min exact — **changement de dose majeur, NON équivalent** |
| S7 | historique 120 min, non décomposé | historique **180 min**, toujours non décomposé |
| S9 | historique 150 min, non décomposé | V3 150 min exact |
| \`technicallyConstructed\` | true | true |
| \`constraintsSatisfied\` | false | **false** |

L'optimisation du catalogue a déplacé certains choix historiques : **le temps initial 300 min n'a pas été « expliqué » ou validé** ; il a été remplacé par une nouvelle proposition 120 min. S7 passe de 120 à 180 min : l'app ne doit pas transformer cette différence en progression approuvée. Aucun usage avec un vrai athlète n'est autorisé sur ces seuls résultats.

### Répartition en minutes du nouveau candidat (semaines de charge)

- Directement attribuables : **805 min natation, 1 185 min vélo, 1 276 min course**.
- **180 min** de brick historique restent non décomposées ; ne leur attribuer aucune part vélo/course fictive.
- Ratios conservateurs sur les minutes *planifiées*, et non sur l'exécution attestée : natation **23,36–24,65 %**, vélo **34,39–39,61 %**, course **37,03–42,25 %**.
- Même si les 180 min non résolues étaient entièrement des minutes de vélo/course sans aucune transition, la natation représente au moins **23,36 %**, alors que la cible historique tolérée s'arrête à **23 %**. **Ce nouveau calendrier précis ne pourra donc pas satisfaire le ratio natation en minutes sans modifier effectivement la distribution des volumes.** Il serait incorrect de présenter la ventilation du dernier brick comme une solution suffisante.

## Garde-fous

- Les sources V3 race-specific \`im_pace\`, \`703_pace\`, \`marathon_pace\`, \`semi_pace\` sont refusées en cas de destination incompatible ; un contenu explicitement Ironman ne devient pas une séance 70.3 parce qu'un champ objectif a été renommé.
- La nouvelle composition n'est ajoutée que si les **deux sources** ont une revue individuelle, sont compatibles avec l'objectif, le niveau et la phase, et donnent une durée entière calculable.
- Les bricks composés sont interdits hors **semaine \`load\`** : pas d'intensité spécifique en récupération, taper ou semaine de course via une phase mal étiquetée.
- Lorsqu'un composant V3 est partagé entre plusieurs compositions, il ne doit pas être utilisé plusieurs fois dans la même semaine, même sous des IDs de brick distincts.
- Le diagnostic des minutes confronte les métadonnées approuvées à la structure/durée réellement sélectionnée. Une simple chaîne ressemblant à « vélo + transition + course » ne vaut jamais preuve de répartition.
- Le maintien de la bibliothèque historique et de la revue humaine est obligatoire.

## Portée scientifique et reprise

Il reste à identifier/attester les durées et les intentions exactes des anciens bricks, corriger les **volumes** du calendrier et non les étiquettes, puis vérifier intensités par segment, décharges effectives, séances clés et date de compétition réellement déclarée. Les 400 recettes candidates ne sont pas 400 séances scientifiquement validées. Les tests de persistance Supabase et exports réels Nolio/PDF restent nécessaires.

Le prochain gate n'est **pas** « composer encore plus de bricks pour réduire un compteur ». Il est de proposer un calendrier 70.3 cohérent en minutes *sans violer les fréquences, la charge ni la récupération*, et de le rejeter explicitement si aucun assemblage admissible n'existe.

**Statut : NO-GO sportif 70.3 et NO-GO production. Aucun merge, aucune migration, aucun appel Nolio.**

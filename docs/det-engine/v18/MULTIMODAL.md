# Bricks et mixed

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

87 modèles couvrent exactement 55 fiches `brick` et 32 `mixed`. Un modèle n’équivaut pas à un brick admis ni à une occurrence de calendrier résolue.


Chaque partie conserve son ordre source, ses consignes, ses sous-nœuds, ses disciplines explicitement nommées, ses plages temporelles connues et les doses non attribuables. Les répétitions restent dans l’IR ; les mentions inline de discipline/transition sont des preuves littérales, sans fabrication d’un sous-calendrier.

- `BRICK_IM_Z2_RUN` conserve ses 90–150 minutes de vélo et 20–40 minutes de course. Sa transition absente reste `null`, jamais zéro.
- `ENR_BRICK_SWIM_BIKE` conserve sa transition `<5min` : maximum 300 secondes **strict**, minimum inconnu. Elle ne devient pas une transition fixe de cinq minutes.
- `ENR_RECUP_ACTIVE_MULTI` reste une fiche mixed ; sa phrase d’alternance n’est pas transformée en brick prescrit automatiquement.
- `REST_FULL_DAY` et les tâches mentales/restauratives restent des modèles descriptifs ; leur présence dans `mixed` ne leur attribue pas trois disciplines.

Les recettes de brick dont les sous-parties ou transitions manquent restent bloquées. Le rendu coach affiche les parties séparément et annonce les transitions inconnues. La sérialisation est du JSON expérimental TFCLab : elle ne constitue pas une API Nolio v2.

Le contrat local Nolio connu représente un événement avec un `sport_id`. Les 87 fiches brick/mixed sont refusées en transport événementiel mono-discipline ; elles ne sont ni aplaties en vélo/course ni éclatées silencieusement en faux événements datés. Un futur contrat doit préciser le regroupement, les identités d’occurrences, les transitions et le calendrier avant toute conversion machine fidèle.

[Brick](examples/BRICK_IM_Z2_RUN.md), [mixed de récupération](examples/ENR_RECUP_ACTIVE_MULTI.md).

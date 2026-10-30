# Décisions scientifiques restantes

Les refus ci-dessous ne prouvent pas qu'un athlète ne peut pas préparer son objectif.
Ils exposent les limites du contrat de prescription actuellement exécutable.
Aucun seuil n'a été abaissé pour les faire disparaître.

## Ironman continu : contrat de phase et de durée du brick long

La sonde reproduit les pools exacts de 31 configurations refusées pour domaine
vide. Dans chaque cas, le créneau bloquant est un brick long de 95 à 170 minutes.
Les deux fiches admissibles à la semaine ne couvrent que 60–90 et 30–50 minutes.
Exemple reproductible : `IM:untrained:finisher:known_synthetic`, S3, samedi,
plancher de 95 minutes ; `BRICK_STAGE1_INTRO` s'arrête à 90 minutes.

Ni les variantes strictement exécutables ni la suppression du plafond de 130
fiches ne résolvent ces 31 conflits. La reconstruction à 130 fiches est d'abord
vérifiée identique au pool historique ; le test à 10 000 conserve tous les autres
filtres. Le problème n'est donc pas une hypothèse de troncature du catalogue.

Décision requise avant d'étendre ce sous-chantier : fournir une prescription
éditoriale de brick long compatible avec la phase et le niveau, ou justifier une
révision du contrat de progression/placement. Étendre une fiche de 90 à 95 minutes,
changer sa phase ou supprimer le brick ne constitue pas une correction logicielle
neutre. Les neuf autres refus IM continus ont des causes distinctes et ne sont
pas couverts par cette conclusion.

Preuves : `ironman-probe.json`, `SPORTS.md` et la sonde opt-in versionnée.

## Trail : prescription dédiée, sans transfert des règles route

Les objectifs trail et leurs profils existent. La route de génération inspectée
ne fournit pas les quotas déterministes dédiés nécessaires au solveur actuel.
La présence de séances avec D+ ou tags musculaires ne détermine pas leur dose,
leur fréquence ni leur progression individuelle.

Une revue doit définir ou confirmer le contrat dédié de planification avant
implémentation : préparation au dénivelé, descente, charge musculaire et récupération
selon distance et terrain. Aucun quota de course sur route n'est transposé.
L'audit sépare la provenance des métadonnées de l'attestation d'une progression.

## Portée de la pertinence sportive

Les erreurs du validateur TFCL restent bloquantes dans l'expérience. Certaines
portent sur des conventions méthodologiques (par exemple les catégories Lorang),
pas sur une vérité physiologique universelle. Les avertissements restent visibles,
et leur importance doit être appréciée par le coach. Les corrections acceptées
ne sont attestées que sous les contrôles exécutés ; elles ne prouvent ni une
réponse biologique individuelle ni une dose optimale.

Les durées réelles des compétitions ne sont pas estimées par cette expérience.
La progression physiologique par discipline et la gestion complète des incertitudes
restent à expertiser. La revue experte ne constitue jamais une autorisation de
fusion, de déploiement, d'accès aux données ou de dépense.

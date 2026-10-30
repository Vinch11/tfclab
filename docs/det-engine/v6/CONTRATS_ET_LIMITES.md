# Contrats candidats et limites de validation

Aucun contrat V6 n'est promu en doctrine sportive. Aucun validateur de production n'est modifié et aucune alerte existante n'est supprimée ou déclassée.

## Ratios

Le défaut d'unité est étayé par le code TFCL : le validateur disciplinaire compte les séances, alors que la procédure de vérification de `sportRatioMatrix.ts` demande explicitement des minutes par bloc. Trois lectures sont donc archivées séparément : fréquence, minutes des semaines de charge et minutes de tout l'entraînement. Les bornes centrales sont testées strictement, sans élargissement opportuniste.

La procédure TFCL demande aussi un tableau pour **chaque bloc**. Le complément de diagnostic utilise les fenêtres réelles `prepareGenerationContracts().chunksForQuota`, sans se contenter d'une moyenne globale favorable. Un passage global ne vaut donc pas passage par bloc, ni passage des autres contrôles sportifs. Les bricks inconnus produisent des bornes et une limite de couverture, pas une répartition inventée.

Les règles de comptage nominal/effectif restent celles de `effectiveSessionQuota`. Les indicateurs de séance clé restent inchangés : être structurant, long ou technique ne prouve pas du temps passé à haute intensité. Le rapport d'intensité vient des métriques du validateur existant, qui estime les minutes des clauses et conserve une part inconnue.

## Réparation ciblée

Seules les erreurs de placement déjà constatées des fiches de jour J sont proposées à réparation. Les remplacements respectent sport, intention, phase, prérequis et plage du catalogue. La dose hebdomadaire de chaque discipline, les positions, fréquences, indicateurs de séance clé et composantes des bricks sont vérifiés indépendamment avant/après. Un éventuel transfert de minutes entre deux séances du même sport ne peut augmenter le total hebdomadaire ; les minima et obligations longues restent respectés. Aucune permutation massive.

Chaque proposition passe les gardes de qualité V3 et de plan entier V4, les contrôles existants et le contrôleur global V5. Les refus sont conservés. Aucun changement substantiel d'objectif ou d'ambition n'est autorisé.

## Ironman strict

Deux modèles sont étudiés : endurance autonome et brick peak à composantes explicites. Toutes les obligations de dose longue originales sont conservées, y compris en récupération. Les changements méthodologiques d'allégement étudiés en V5 ne sont donc pas utilisés pour faire construire V6. Les fiches dont la date source n'est pas respectée sont exclues ; les fiches spécifiques LCW ne deviennent pas silencieusement des fiches d'Ironman continu.

Seize plans techniques sont obtenus sur huit entrées de quatre niveaux. Cette sous-matrice n'atteste pas tous les couples niveau/ambition ni toutes les disponibilités. Les défauts de continuité et de prescription restent contrôlés, notamment en semaine de compétition. Une règle de continuité d'entraînement stricte n'est pas confondue avec la simple présence des disciplines dans l'épreuve.

## Trail et ultra

La récupération de deux fiches écartées par les caps éditoriaux passe par le pipeline existant ciblé sur ces rôles. Aucune limite sportive n'est levée. Le minimum de 210 minutes provient des parties écrites des fiches, pas d'un seuil physiologique inventé. Les contrôles de durée, zone, phase, budget et récupération restent exécutés.

Les deux nouveaux calendriers ultra ont vingt semaines et des erreurs sportives conservées. Leur construction ne prouve ni une adaptation à la descente ni la faisabilité de la durée cible de course. Les deux fixtures de niveau inférieur restent refusées sous leurs contrats de dose actuels. Le refus ne vaut pas impossibilité générale d'entraîner ces personnes.

Les champs de preuve requis sont décrits dans `evidence/trail-coverage/required-evidence.json` : D+ et D− séparés, provenance/date, durée, terrain/technicité/pente, expositions récentes en descente, réponse fonctionnelle et récupération, familiarisation au renforcement et incertitude. Une limite individuelle ne peut être utilisée que si elle est explicitement documentée. Aucun questionnaire quantitatif de charge ni interface de production n'est créé.

## Décisions restantes avant promotion

1. Réconcilier la période d'application des ratios et leur articulation avec les fréquences ; préciser l'applicabilité des bornes hautes au trail sans vélo et des obligations A/B en base sous les plafonds du coach. Le défaut technique d'unité et la perte de fiches aux caps sont déjà démontrés, pas soumis à une autorisation à chaque correctif.
2. Revoir les plans complets Ironman : rôle des séances clés, endurance/récupération et continuité en semaine de compétition. Ne pas ajouter des doses uniquement pour faire taire un contrôle.
3. Définir les preuves individuelles suffisantes pour la progression verticale/excentrique et l'adaptation des nouveaux ultras. Une tolérance ne peut être inférée du niveau déclaré ou du nombre de séances prévues.

Les références scientifiques et leurs limites déjà archivées en V3 restent applicables ; aucune source nouvelle ne justifie ici un seuil universel de sécurité. Aucun nouveau plan n'a reçu de revue experte.

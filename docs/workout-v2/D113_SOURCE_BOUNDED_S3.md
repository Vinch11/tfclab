# D1.13 — possibilité de réallouer S3 avec les fiches V1 réelles
Branche expérimentale uniquement, issue de #438.

Le contrôle lit les 3 S3 de D1, cherche les fiches exactes dans `WorkoutLibrary` et essaie **une seule paire** de changements de durées vélo→course à volume constant, par pas de 1 minute, en conservant date, jour, ID, sport et autres séances. L'absence de fiche source bloque plutôt que d'inventer des intervalles admissibles. La ventilation historique Stage1 du brick doit rester vérifiable. Il ne change aucun plan réel.

**Important :** le champ `durationMin` du catalogue V1 ne prouve pas qu'une structure de blocs est ajustable à une nouvelle durée. Tout succès est seulement un candidat de durée, jamais une prescription approuvée. Aucun résultat négatif ne démontre une impossibilité globale : plusieurs changements simultanés, V2 paramétrable, la récupération, les validateurs natifs et les catégories Lorang restent à examiner.

Résultat reproductible : `D113_SOURCE_BOUNDED_WEEK3` dans les logs CI. NO-GO production / sport.

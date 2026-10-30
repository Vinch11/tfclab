# D1.11 — vérification hebdomadaire des ratios 70.3
**Expérimental / DRAFT / NO-GO.** Branche issue de D1.10 (#436), sans production, Nolio, Supabase ou modification de règles sportives.

## Pourquoi
Le contrôle D1.10 agrège S1–S3. Une moyenne acceptable sur trois semaines peut dissimuler une semaine incompatible avec les plages natation / vélo / course. Une preuve de ratios agrégés ne suffit pas à autoriser une programmation hebdomadaire.

## Nouveau témoin
`examineD111WeeklyProfiles` rejoue les trois profils D1.2 inchangés et retourne **neuf diagnostics** (3 profils × S1–S3). Pour chaque semaine : volume, codes d'erreur sportive native, preuve stricte de ventilation de brick Stage1, trois pourcentages nominaux et avec **tolérance hypothétique ±3 points**. Si la ventilation n'est pas démontrable, les résultats restent **nuls**, jamais inventés.

Les tests produisent `D111_WEEKWISE_EVIDENCE` dans les logs CI. L'absence d'erreurs de ratio hebdomadaires ne valide **ni** fréquence, placement des séances intenses, dose de travail, récupération, limiteur, progression, ni événements de la semaine 12. S4 est volontairement exclue des ratios de semaines de charge S1–S3 ; elle exige sa propre règle de phase avant interprétation.

## Critère de continuation
Identifier les semaines précises incompatibles plutôt que déplacer arbitrairement des séances. Ensuite contrôler sélection physiologique V2, dosages et récupération sans masquer les erreurs natives. Ne pas faire de ratios une règle de production tant que l'unité, les plages et leur applicabilité par phase ne sont pas officiellement définies.

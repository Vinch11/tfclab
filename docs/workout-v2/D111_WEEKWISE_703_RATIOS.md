# D1.11 — vérification hebdomadaire des ratios 70.3
**Expérimental / DRAFT / NO-GO.** Branche issue de D1.10 (#436), sans production, Nolio, Supabase ou modification de règles sportives.

## Pourquoi
Le contrôle D1.10 agrège S1–S3. Une moyenne acceptable sur trois semaines peut dissimuler une semaine incompatible avec les plages natation / vélo / course. Une preuve de ratios agrégés ne suffit pas à autoriser une programmation hebdomadaire.

## Nouveau témoin
`examineD111WeeklyProfiles` rejoue les trois profils D1.2 inchangés et retourne **neuf diagnostics** (3 profils × S1–S3). Pour chaque semaine : volume, codes d'erreur sportive native, preuve stricte de ventilation de brick Stage1, trois pourcentages nominaux et avec **tolérance hypothétique ±3 points**. Si la ventilation n'est pas démontrable, les résultats restent **nuls**, jamais inventés.

Les tests produisent `D111_WEEKWISE_EVIDENCE` dans les logs CI. L'absence d'erreurs de ratio hebdomadaires ne valide **ni** fréquence, placement des séances intenses, dose de travail, récupération, limiteur, progression, ni événements de la semaine 12. S4 est volontairement exclue des ratios de semaines de charge S1–S3 ; elle exige sa propre règle de phase avant interprétation.

## Critère de continuation
Identifier les semaines précises incompatibles plutôt que déplacer arbitrairement des séances. Ensuite contrôler sélection physiologique V2, dosages et récupération sans masquer les erreurs natives. Ne pas faire de ratios une règle de production tant que l'unité, les plages et leur applicabilité par phase ne sont pas officiellement définies.

## Résultats CI 893 — observés, pas supposés
Sur 9 cas profil/semaine, 7 entrent dans les plages hypothétiques ±3 points et **2 restent hors plage en S3** :
- `aerobic_dominant` S3 (430 min) : natation 15,6 %, vélo 53,2 %, course 31,2 %.
- `glycolytic_dominant` S3 (430 min) : natation 14,5 %, vélo 57,8 %, course 27,7 %.

Les codes critiques natifs `lorang_categories` apparaissent dans **8 des 9 cas**, y compris lorsque le ratio par minutes serait dans la plage. **Ces erreurs ne sont pas corrigées par les ratios**. Le test de non-régression pointe désormais les 2 semaines et les 8 alertes natives.

### Correctif de programmation attendu (pas une règle automatique)
1. Pour S3 des deux profils, tenter d'abord de réallouer des **durées réellement admissibles** dans les créneaux existants, sans changer le total hebdomadaire (430 min), les limites de séances, la progression et la récupération. Ne jamais considérer un transfert purement arithmétique comme une prescription.
2. Réexaminer indépendamment la conformité `lorang_categories` des **neuf** semaines, avec des modèles V2 compatibles avec limiteur, objectif, phase, intensité, quantité et récupération, sans injection artificielle de HIT.
3. Rejouer les validations natives inchangées avant/après et exiger un retour au coach si aucun candidat ne passe. Conserver toute issue critique : aucune neutralisation de validation et aucune approbation implicite.
4. Ne pas activer une tolérance ±3 en production sans décision explicite sur les unités, les plafonds par phase et la justification sportive.

La programmation 70.3 n'est PAS approuvée : ces diagnostics sont des preuves de source historique sur des profils de QA synthétiques.

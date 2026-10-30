# D1.2 — Décisions mesurées après construction du candidat 4 semaines

**Statut : NO-GO sportif et produit.** Ce dossier ne change aucune politique ni fixture. Les trois profils de la PR #427 demeurent synthétiques et inchangés. Tous les résultats portent sur le moteur **expérimental** de la PR #428.

## Résultat factuel avant le correctif du contrôle de compétition

La variante « sortie longue vélo indépendante + brick Stage 1 court » a construit **quatre semaines pour chacun des trois profils**, mais les sorties ne sont pas des prescriptions validées. Référence des traces : workflow GitHub `41033030815`, SHA `7303dd9e7defa5924ce3b0eb8e4a252081463679`.

| Profil | Semaines de charge S1/S2/S3 | S4 décharge | Minutes par semaine | Erreurs critiques |
|---|---:|---:|---|---:|
| Dominante aérobie | 11/11/11 séances | 7 séances | 360 / 395 / 430 / 300 | 4 |
| Dominante glycolytique | 11/11/11 | 7 | 360 / 395 / 430 / 300 | 5 |
| Équilibré | 11/11/11 | 7 | 360 / 395 / 430 / 300 | 5 |

Les durées et fréquences ne démontrent pas la capacité ni la pertinence individuelle. Tous les modèles V2 ne sont **pas** exécutés dans ces plans ; la plupart des séances proviennent de V1.

## Trois causes distinctes — ne pas les masquer

### A — Compétition artificiellement exigée en semaine 4 (défaut de portée)

L'ancienne validation d'un plan **tronqué** à S1–S4 utilisait implicitement la dernière semaine de ce tronçon comme semaine de compétition, car le paramètre `raceWeekNumbers` était laissé à `undefined`. Or les entrées D1 conservent la course réelle datée en **S12**.

Le raccord expérimental `experimentalDeclaredRaceWeekNumbers` transmet maintenant la semaine issue des dates déclarées, **sans inventer un Jour J en S4 ni modifier la course**. Le validateur d'origine doit alors signaler *S12 absente de l'extrait* en **warning**, pas classer S4 en erreur de course manquante. Cette correction ne certifie pas le Jour J et ne valide pas la préparation entière de douze semaines.

### B — Règles de fréquences et ratios de sports mathématiquement incompatibles

`computeWeeklySessionQuota("703","age_group",10,"load")` impose **3 nages, 3 vélos, 3 courses, 1 brick**. Sur les trois semaines S1–S3, la règle `validateSportRatio` **compte les séances, pas les minutes**, et alloue la moitié de chaque brick à vélo et course.

Les effectifs de trois semaines sont : 9 nages, 9 vélos, 9 courses et 3 bricks → après attribution des briques, 9 nages / 11 vélos / 11 courses = **29 % de natation** après arrondi. La cible native est **15–20 %**, avec erreur critique au-delà de 28 %. **Changer les durées ou le contenu des 20 modèles V2 ne peut corriger ce conflit de comptage.**

Preuve exécutable : `experimental/workout-v2/d12RatioCertificate.ts`, `src/lib/workout-v2/__tests__/d12RatioCertificate.test.ts`.

**Décision sportive distincte à documenter :** s'agit-il d'une cible de *temps d'entraînement*, auquel cas le validateur doit être reformulé sur les durées structurées, ou d'une cible de *fréquence*, auquel cas les quotas/surfaces doivent être réconciliés ? Modifier automatiquement un des deux serait un contournement.

### C — Aucune catégorie Lorang A/B certaines semaines

Le sélecteur expérimental choisit des séances de récupération ou technique, même sur des emplacements marqués « clés ». Le validateur signale l'absence de séance Lorang A/B sur certaines semaines de charge : S1 et S3 pour le profil aérobie, S1–S3 pour les deux autres. L'étiquette `isKeySession` ne garantit pas un véritable stimulus seuil/haute intensité. C'est une vraie insuffisance de sélection/provenance.

**Une règle visant à forcer mécaniquement du HIT pour obtenir un meilleur score serait dangereuse.** Le prochain correctif doit examiner les séances réellement admissibles et la compatibilité avec récupération, profil, interdictions et charge cumulée. Le moteur ne devra pas fabriquer une intensité pour faire disparaître une alerte.

## Critères de sortie du NO-GO (inchangés)

1. Les trois profils produisent un **véritable** calendrier de 28 jours depuis le parcours applicatif, sans appel IA.
2. Toutes les séances affichées comme candidates possèdent des doses et références exécutables, sans emprunt trompeur à un ID V1.
3. Zéro erreur sportive critique sur les contrôles réellement applicables ; aucune règle désactivée ou pondération diminuée sans arbitrage explicite.
4. Les trois profils démontrent des adaptations causales aux limiteurs, pas seulement des rotations de séances.
5. Sauvegarde et réouverture indépendantes sur environnement de test autorisé, puis seulement GO technique / revue coach.

**État courant : aucun GO sur les points 1–5.** Les issues documentées ici sont des défauts distincts ; une CI verte ne change pas ce verdict.

## Restrictions

Aucune fusion, déploiement, modification de production, migration, action Nolio, lecture/écriture de données réelles ou changement des contrats sportifs. La PR #428 reste un pilote isolé. Les 37 profils physiologiques et 600 configurations existantes ne sont pas déclarés certifiés par cette preuve.

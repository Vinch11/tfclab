# Reprise — politique coach après V25

Baseline `ec72f8808f47c64f9f7361ac8e31108351348fdc`; branche `experiment/det-engine`; PR #420 DRAFT / NO-GO. Nouveau registre indépendant `state.json`, départ 2026-10-29 17:25:06 UTC, délai absolu 18:25:06 UTC, maximum dix unités. Le budget ne se renouvelle pas et aucune relance n'est installée.

Résultats : `evidence/validation-1`, `evidence/independent-validation.json`, politique `COACH_POLICY.json`, preuves avant/après et reprise des quinze cas V25. Les unités V25 clôturées ne sont pas relancées; seules leurs fonctions/tests sont réutilisés dans ce nouveau registre.

API expérimentale : `applyCoachFloorPolicy(baselineV25, profile, caseId, true)`. Sans opt-in explicite, l'alternative est absente et V25 inchangé. Le résultat `authorized_experimental_planning_only` ne vaut jamais `approved_by_coach` pour une séance individuelle. Les refus de A et la suspension défavorable restent en place.

La politique source est une instruction coach explicitement transmise dans l'échange, pas une signature fabriquée ni une nouvelle preuve physiologique. Ne pas demander à nouveau la même permission de floor. Tout élargissement à une autre source, un autre minimum ou une autre capacité nécessite une nouvelle décision de politique.

Le contrôleur refuse clôture/expiration, mauvaise branche, plus de dix unités, plus de trois validations ou un dossier déjà existant. Il borne Node à 2 Go, chaque processus à 180 s au maximum, les logs à 12 Mo et tous les processus au délai restant. Les sources Node réellement exécutées sont épinglées; les outils documentaires possèdent leurs empreintes d'exécution séparées. La consommation exacte des crédits n'est pas exposée.

Pour une nouvelle mission : confirmer la tête distante, préserver les preuves, obtenir un nouveau budget explicite et créer un nouveau registre. Ne jamais relancer automatiquement cette session clôturée. Les décisions encore nécessaires concernent les références, la tolérance et la récupération individuelles, puis la prescription coach, pas la dérogation déjà autorisée.

# Ironman — faisabilité et contrôles de plans complets

**Expérimental — DRAFT / NO-GO.** Aucune qualification scientifique automatique, prescription individuelle approuvée ou revue humaine déclarée.

Les cohortes sont séparées : deux microcycles V10 archivés, puis deux calendriers prospectifs V14 de 16 semaines. Aucune campagne nocturne ni recherche massive n’est relancée. Les calendriers archivés et toutes leurs conditions restent intacts.

| Microcycle | Minutes | Correspondance de candidat à dose identique | Erreurs / avertissements |
| --- | --- | --- | --- |
| IM_aerobic_history | 480 | C_IM_AERO_HOLD@v19:after_each_repetition:18ae8b1932ab | 5 / 7 |
| IM_balanced_history | 480 | C_IM_AERO_HOLD@v19:between_repetitions:5a9daecc4fac | 5 / 7 |

Ces correspondances précisent une chronologie C_IM_AERO_HOLD de 75 ou 80 minutes sans changer la réservation ; elles supposent encore une approbation explicite de la politique de récupération. Elles ne valident pas le microcycle.

## IM_aerobic_history — 16 semaines

| Modèle | Changements | Erreurs / avertissements historiques | Nouveau défaut critique / avertissement |
| --- | --- | --- | --- |
| Archive intacte | Aucun candidat complet du même ID déjà présent | 2 / 129 | Sans objet |
| between_repetitions | 9 créneaux aéro ; 85 → 75 min | 2 / 129 | false / false |
| after_each_repetition | 9 créneaux aéro ; 85 → 80 min | 2 / 129 | false / false |

Les deux erreurs bloquantes restent celles du ratio historique de fréquences. Les témoins en minutes par bloc sont calculés séparément, sans supprimer ou reclassifier les alertes. Le contrôle technique conserve `weeks.15.sessions.7:invalid_union` : la réservation de compétition ne fournit pas une durée numérique admissible au schéma actuel ; aucune durée fictive n’est ajoutée.

Les neuf substitutions gardent les 60 minutes écrites d’effort aéro, mais passent de six blocs de 10 min à quatre de 15 min, et réduisent le volume réservé de 5 ou 10 min. Cela change le stimulus, la densité et potentiellement la fatigue. Les restrictions anciennes et nouvelles restent dans les dossiers de liaison ; les conditions de posture, de récupération et d’interaction restent présentes ; aucune condition n’est déclarée satisfaite. Les autres séances et les trois disciplines sont conservées.

Les contrôles globaux ne détectent pas de nouvelle violation exécutée ; ils n’attestent pas la fatigue réelle, la nutrition, la technique ou une adaptation obtenue. Les variantes restent des dossiers de comparaison, même si les contrôles de non-régression passent.

## IM_balanced_history — 16 semaines

| Modèle | Changements | Erreurs / avertissements historiques | Nouveau défaut critique / avertissement |
| --- | --- | --- | --- |
| Archive intacte | Aucun candidat complet du même ID déjà présent | 2 / 129 | Sans objet |
| between_repetitions | 9 créneaux aéro ; 85 → 75 min | 2 / 129 | false / false |
| after_each_repetition | 9 créneaux aéro ; 85 → 80 min | 2 / 129 | false / false |

Les deux erreurs bloquantes restent celles du ratio historique de fréquences. Les témoins en minutes par bloc sont calculés séparément, sans supprimer ou reclassifier les alertes. Le contrôle technique conserve `weeks.15.sessions.7:invalid_union` : la réservation de compétition ne fournit pas une durée numérique admissible au schéma actuel ; aucune durée fictive n’est ajoutée.

Les neuf substitutions gardent les 60 minutes écrites d’effort aéro, mais passent de six blocs de 10 min à quatre de 15 min, et réduisent le volume réservé de 5 ou 10 min. Cela change le stimulus, la densité et potentiellement la fatigue. Les restrictions anciennes et nouvelles restent dans les dossiers de liaison ; les conditions de posture, de récupération et d’interaction restent présentes ; aucune condition n’est déclarée satisfaite. Les autres séances et les trois disciplines sont conservées.

Les contrôles globaux ne détectent pas de nouvelle violation exécutée ; ils n’attestent pas la fatigue réelle, la nutrition, la technique ou une adaptation obtenue. Les variantes restent des dossiers de comparaison, même si les contrôles de non-régression passent.

Les 96 candidats complets ne contiennent aucune nage chronométrée complète. Ils ne résolvent donc pas à eux seuls les blocages de temps individuel des séances de natation, ni les conditions futures, ni les ratios historiques. Cela décrit la couverture de ce catalogue candidat, pas une impossibilité physiologique globale des profils.

[Résultats et calendriers examinables](evidence/validation-2/build/ironman/results.json).

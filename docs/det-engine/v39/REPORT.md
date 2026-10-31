# TFCLab DET V3.9 — Décisions sportives et preuves (31 octobre 2026)

## Périmètre
Branche expérimentale basée sur la PR #453, non fusionnée. Données d'athlètes et revues intégralement synthétiques ; aucun appel Supabase, aucune transmission Nolio, aucune publication ni manipulation de la production.

## Admission source ≠ sélection ≠ conformité du plan
- 800/800 séances peuvent satisfaire les contrôles individuels synthétiques, et les 800 atteignent une vérification de créneau sous objectif/phase/sport compatibles (CI spécialisée #452 : 119 tests réussis, 7 ignorés).
- V3.8 : deux athlètes synthétiques 10 km, même ensemble de 11 sources V3 sélectionnées dans les semaines 1–11 d'un calendrier **total de 14 semaines**, intensités calculées distinctes selon allure de seuil 240 et 300 s/km, 0 erreur bloquante dans ces scénarios, mais **pas** de différence de structure de séance entre limiteurs. CI spécialisée : 124 tests réussis, 7 ignorés.
- V3.9 ajoute un test strict de **choix effectivement différent de séance clé** entre un limiteur de seuil (« fractional_utilization ») et un limiteur de plafond aérobie (« aerobic_ceiling ») pour un même athlète, sans influencer manuellement la réponse. **Critère démontré techniquement au SHA `51f2979`** : dans le vrai calendrier 10 km construit pour le même athlète synthétique, dimanche S5, `fractional_utilization` sélectionne `V3P_RUN_008` (60 min) alors que `aerobic_ceiling` sélectionne `V3P_RUN_009` (60 min). La CI spécialisée a réussi : 124 tests réussis, 7 ignorés. **Cela ne prouve pas la conformité sportive du calendrier complet** : la récupération interséances et la polarisation refusent encore les deux scénarios.

## Diagnostic V3.9 — blocage précédent à la comparaison des limiteurs
L'assemblage 10 km compétiteur a été refusé avant sélection physiologique : le programme initial possédait un créneau facultatif **bike** le mardi S1, mais **zéro séance vélo admissible** dans le catalogue réellement présenté à cet athlète/objectif. Les contrôles ont remonté `det_empty_catalogue_slot` avec `allInCatalog:0`, `eligibleSportMatches:0`. Cela n'établit PAS l'absence d'utilité des séances seuil ou VO2.

Correctif expérimental en essai : retirer uniquement un créneau **facultatif** (`quota[sport].min===0`), si la prévalidation individuelle atteste zéro candidat éligible pour ce sport ; préserver les créneaux obligatoires/compétitions et recalculer toute la prévalidation. Aucun quota minimum, plafond horaire ni contrôle de récupération supprimé. Sa CI et le test de sélection différentielle restent à vérifier sur le dernier SHA.

## V3.9 — audit multisport synthétique (sans date de course déclarée)
| Élément | 70.3 | Ironman |
|---|---|---|
| Calendrier | 12 semaines construites | 16 semaines construites |
| Plafond imposé | 600 min/semaine | 840 min/semaine |
| Dépassements des plafonds | 0 | 0 |
| Traces de séances/compositions V3 | 14 | 4 |
| Conformité native globale | **NON** | **NON** |

Blockers 70.3 : récupération horaire inconnue (7 semaines), polarisation S5/S6/S7/S9, charge/décharge, ratio sportif, catégories Lorang, séances clés et jour J. Ironman : polarisation S3/S6/S7/S9–S11, charge/décharge, ratio sportif, catégories Lorang, interdiction S8 et récupération S6.

## Compétition explicitement déclarée : contradiction de quota 70.3 reproduite
Scénario 70.3 synthetic race : départ 2026-10-26, dimanche de course 2027-01-17 (S12), objectif A correctement transporté.
- La réservation `requiredEvents` demande `dimanche : brick`.
- Semaine de course S12 : `weekType=race`, mais le quota brick calculé est `min:0,max:0` ; aucune course ne peut être posée.
- Refus immédiat `declared_event_unplaced`. **Il est correct de refuser et incorrect de prétendre que le plan est conformant.**
- L'événement de compétition est une entité distincte d'un entraînement brick ; la correction devra réserver le jour J **sans** ajouter un entraînement brick et sans affaiblir les validateurs de calendrier, de quota ou de charge.

Scénario Ironman course déclarée 2027-02-14 (S16) : `brick min=max=1`, l'épreuve est effectivement réservée le dimanche, le plan reste non conforme à d'autres contrôles. La comparaison montre que la contradiction du 70.3 est spécifique au quota race du format, pas à l'algorithme général de date.

## Exécution V3.9 complémentaire (31 octobre)
- **Preuve 1 — OBTENUE pour la décision différenciée observable**, non pour la conformité intégrale des plans 10 km. Remplacement du scénario expérimental contradictoire « 1 vélo obligatoire, 0 vélo admis » par un profil entraîné/objectif finisher où le vélo est réellement facultatif. Aucune limite physiologique ou de charge n'a été supprimée. Le classement privilégie le limiteur déclaré sur les vrais créneaux clés seulement après les filtres d'admissibilité. Sélection effective différente observée S5 dimanche.
- **70.3, étape de construction** : avant isolement du correctif, l'audit réel construit 12/12 semaines, ≤600 min/semaine, réserve une compétition le dimanche S12 sous quota brick d'entraînement 0–0 ; toutes les validations du plan demeurent refusées (notamment polarisation, ratios, charge, catégories et récupération). L'événement officiel est distinct d'un brick d'entraînement supplémentaire. Cette observation est **antérieure au dernier refactoring opt-in** et doit être revalidée sur sa CI.
- **Protection non-régression V30** : un premier branchement de la réservation de course a fait échouer un test historique de replay V30, parce qu'il modifiait le comportement natif du générateur. Le code est maintenant isolé derrière `officialRaceOutsideTrainingQuota`, activé uniquement lors d'une reconstruction expérimentale d'une course officiellement déclarée et introuvable sous quota brick nul ; le comportement natif ne doit plus changer. Le test V30 et les tests spécifiques de compétition restent obligatoires.
- **Interdits permanents** : pas de séance fictive, pas de récupération supposée entre deux horaires inconnus, pas d'assouplissement automatique des ratios, de la charge, de la polarisation ni des contraintes de jour J ; pas de fusion en production.

## V3.9.2 — nouvelle preuve chronologique et décharges mesurées

Exécution spécialisée PASS au SHA `7b37ce03` : **138 tests réussis, 7 ignorés**.

- **70.3 : 12/12 semaines construites**, minutes d'entraînement connues sous plafond strict de 600 min/semaine ; l'épreuve 70.3 est bien réservée le dimanche S12, sans autoriser un second brick d'entraînement. Trois échanges de créneaux d'entraînement déjà présents ont suffi pour obtenir **zéro domaine V3 sans récupération conservatrice admissible**. Aucun horaire de séance n'a été inventé. Les tests d'absence de dépassement, sécurité et de course officielle passent. Plan global **NON CONFORME** : S4 n'est pas une décharge mesurée de 30 %, plus `load_pattern`, polarisation S5/S6/S7/S9, catégories Lorang et ratios.
- **Ironman : 16/16 semaines construites**, minutes sous plafond strict de 840 min ; **zéro refus `v3_recovery_hours_unverified`**. Les semaines S4/S8/S12 sont reconnues décharges uniquement après réduction de minutes effectivement constatée, respectivement environ 42 %, 61 %, 42 % par rapport à leur semaine précédente. Le blocage global `load_pattern` a disparu, mais polarisation S6/S7/S9–S11, ratio, catégories Lorang et une interdiction en S8 demeurent.
- **Mécanisme** : filtre candidat `calendarOnlyRecoverySafe` fondé sur le minimum horaire garanti entre jours, puis recherche bornée `improveCalendarRecoveryByExistingSlotSwaps` ne déplaçant que des créneaux déjà existants, sous quotas, jours interdits, repos, capacité et compétition inchangés. L'audit final d'origine `auditSourceRecoveryTiming` et tous les validateurs sportifs restent actifs. Un résultat qui nécessite des horaires coach non fournis reste refusé ; aucune heure fictive.
- **Nouveau contrôle exploratoire** : `auditVerifiedMultisportMinutes` s'appuie sur le décompte minute par minute déjà développé en V31, avec décomposition uniquement des bricks V3 dont la provenance et la somme exacte sont vérifiées. Toute durée de brick non attribuable est un refus, jamais un partage inventé à 50/50. Ce contrôle ne remplace **aucune** règle historique ; son CI reste à constater sur le dernier SHA.
- La différenciation physiologique réellement observée du dimanche S5 (seuil V3P_RUN_008 contre plafond aérobie V3P_RUN_009) reste un critère de non-régression. La preuve 2 de **conformité multisport complète** demeure **NON OBTENUE**.

## V3.9.3 — admissibilité physiologique hebdomadaire, certificat de ratios (CI spécialisée 138/7)

Dernier SHA de code vérifié `4dd9fc5fa` : **138 tests V3 réussis / 7 ignorés**, ESLint, Deno, Chromium verts. CI générale Vitest distincte à ne pas déduire de ce résultat ; les empreintes de référence et attestation restent verrouillées.

- **Séances clés** : sur les semaines de charge des profils multisport non finisher, le solveur exige une véritable prescription clé Z4+ admise et sélectionnée ; retour arrière obligatoire si aucune affectation sûre. Les refus Lorang A/B sont passés de S1–S4 à **S4 uniquement** pour le 70.3, et de S2/S5 à **aucun** pour l'Ironman. La semaine de récupération S4 du 70.3 reste volontairement NON qualifiée : seulement 20,25% de réduction de temps par rapport à S3 (315 min contre 395). Pas de changement du validateur Lorang.
- **Sprint Ban** : les candidats portant une famille de mots-clés sprint/pmax/neuromusculaire sont exclus avant l'assemblage si le coach a explicitement déclaré Sprint Ban. L'Ironman est resté construit 16/16 semaines ; le blocage `prohibition_compliance` S8 n'est plus observé. Les règles d'interdiction natives restent actives.
- **70.3, impossibilité du plan actuel sur minutes sportives** : dans les semaines de charge, 760 min nage, 758 min vélo, 1 018 min CAP attribuées directement, mais 750 min de bricks non vérifiables sport par sport. Même si la totalité des 750 min alimentait uniquement vélo/CAP, la nage représenterait **au minimum 23,13%** de l'endurance, au-dessus de la borne 20% ; ce déficit ne peut pas être résolu par une supposition sur le contenu des bricks. Le verdict est `det_multisport_minute_ratio_provably_out_of_bounds`.
- **Ironman, ratio attestable et hors limites** : 1 420 min natation, 2 786 min vélo, 1 710 min CAP, zéro brick non décomposable en semaines de charge ; natation **24,00%**, cible **15–20%**. Vélo 47,09%, CAP 28,90% dans leurs plages. Le verdict est le même : non conforme, pas une donnée manquante.
- **Restes bloquants vérifiés** : polarisation 70.3 S5/S6/S7/S9 et Ironman S6/S7/S9/S10/S11 ; ratios natation excessifs dans les deux ; 70.3 S4 non-décharge et décharge globale associée. Le test de vraie sélection différenciée selon le limiteur demeure vert. Les 12 semaines 70.3 (600 min/sem max) et 16 semaines Ironman (840 min/sem max) restent construites en mode synthétique, avec J placé et sans récupération V3 non prouvée.

**Prochain facteur limitant prioritaire : allocation réelle des minutes natation/vélo/course à partir des sources vérifiées (brick compris), en respectant périodisation, fatigue, zone et plafond d'heures.** Ne jamais réduire les cibles officielles pour obtenir une CI verte ; une nouvelle affectation doit réussir tous les contrôles ensemble. **Preuve 1 PASS technique ; preuve 2 NON OBTENUE ; NO-GO production.**

## V3.9.4 — dette minimale de réallocation, deux validations de ratio distinctes

Audit du dernier calendrier exécuté avant le certificat (SHA `6322efa`, CI spécialisée **138 réussis / 7 ignorés**). Ce ne sont pas des semaines supplémentaires attestées : le 70.3 construit **12/12**, plafonnées à **600 min**, et l'IM construit **16/16**, plafonnées à **840 min**, sans refus `v3_recovery_hours_unverified` ; les deux plans échouent toujours à la validation finale.

| Contrôle réel | 70.3 | Ironman |
|---|---:|---:|
| Sessions, validation native (répartition en **nombre**) | natation **42%**, vélo **22%** | natation **40%**, vélo **30%** |
| Minutes, audit V31 sur semaines de charge | natation au moins **23,13%** même avec 750 min de bricks supposées 100% hors nage | natation **24,00%** avec zéro brick non décomposable |
| Cible natation inchangée | **15–20%** | **15–20%** |
| Déficit minimal pour entrer sous 20% **en minutes** | **514 min** hors natation additionnelles | **1 184 min** hors natation additionnelles |

**Démonstration du déficit, pas de faisabilité :** 70.3 : 760 min natation / (760 + 758 + 1 018 + 750 min bricks non décomposées) = au mieux 23,13% ; pour atteindre 20%, total d'endurance requis 3 800 min, contre 3 286 min dans l'hypothèse la plus favorable, soit **514 min supplémentaires**. Ironman : 1 420 min natation / 5 916 min attribuées = 24,00% ; total requis 7 100 min, soit **1 184 min** supplémentaires. Une transition ou une autre restriction peut rendre ces besoins encore plus élevés ; ne jamais allouer les 750 min de bricks 70.3 à une discipline réelle sans sa composition attestée.

Code expérimental ajouté aux commits `56a7fc6`, `ff09b07` et `68c6fe7` : le nouveau `v39-ratio-capacity-certificate.ts` est relié au véritable audit complet et testé sur déficit, marge horaire théorique, durée inconnue et excès de plafond. Il expose `minimumAdditionalNonSwimMinutes`, `capOnlyAdditionalMinutesMaximum`, et `provablyImpossibleUnderWeeklyCaps`. Si la marge horaire n'est pas prouvable, résultat **null** ; si elle est suffisante mathématiquement, résultat **non bloquant sans jamais déclarer qu'une séance source/une récupération/une polarisation existe**. L'état CI final doit être vérifié sur le SHA, non déduit de ce texte.

**Autre contradiction structurante** : le validateur historique `validateSportRatio` mesure la proportion en **nombre de séances** (brick partagé approximativement entre vélo et CAP), tandis que V31 mesure les **minutes effectivement attribuées** sans partage inventé. Une réallocation de minutes ne corrigera pas le défaut *historique de fréquence* : il faut une allocation du nombre de séances qui respecte déjà la matrice de quotas et les règles de bricks, puis un choix de doses approuvées satisfaisant la cible **en minutes**. Ces deux validations restent obligatoires ; aucune plage cible n'est abaissée.

**Autres refus conservés** : semaine de décharge S4 du 70.3 à **24,1%** de réduction contre **30%** exigés (315 contre 415 min) ; polarisation 70.3 S5/S6/S7/S9, Ironman S6/S7/S9/S10/S11 (ex. 70.3 S6 : **34%** Z1–Z2 contre **≥75%**). Prochaine modification sportive : reconstruire l'allocation *quotas + phases + sports + doses* avant de chercher à satisfaire le solveur ; ne pas maquiller ces échecs avec le calcul de déficit.

**Preuve physiologique 1 : PASS observé sur le 10 km. Preuve sportive multisport 2 : NO-GO. Production : NO-GO.**

## Critères de décision indépendants et non négociables
1. **Différenciation physiologique** : deux plans pour le même athlète où seule la priorité de limiteur change, deux séances clés réellement sélectionnées au même créneau avec leurs stimuli distincts, objectifs/phase/sécurité vérifiés. Échec si seuls les scores de classement changent.
2. **70.3** : date/jour J placés, 12 semaines complètes, chaque budget coach ≤600 min, vraie décharge, ratios sportifs sur minutes attribuées, récupération à partir d'horaires coach authentifiés (ou refus), polarisation et séances clés conformes, toutes les validations natives sans blocage.
3. **Ironman** : mêmes garanties sur 16 semaines, ≤840 min/semaine dans le cas synthétique, sans éléments de charge fictifs.
4. **GO production** : hors de ce chantier ; exige attestation Lovable et CI générale, persistance Supabase réelle, réouverture/édition, exports et validation sportive humaine. 

**Verdict en cours : NO-GO sportif multisport et production.** Ce dossier est une preuve d'exécution et de refus utiles, pas une attestation scientifique indépendante.

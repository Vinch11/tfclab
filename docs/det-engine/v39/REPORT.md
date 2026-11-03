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

**Résultat réellement exécuté, SHA `68c6fe7` :** CI spécialisée **143 réussis, 7 ignorés**, 35 fichiers de tests passés (1 ignoré). Sur les semaines de charge, la marge horaire *au mieux* sous les plafonds vérifiés est **639 min (70.3)** et **1 344 min (Ironman)**. Par rapport au minimum nécessaire de **514 / 1 184 min**, il ne reste théoriquement que **125 / 160 min**. Le certificat retourne `provablyImpossibleUnderWeeklyCaps:false`, ce qui signifie strictement *« impossibilité par les seuls plafonds non prouvée »*, et jamais « plan faisable ». Sources éligibles, bricks indivisibles, règles de charge, fréquence par sport et polarisation peuvent épuiser cette marge et imposent toujours NO-GO.

**Démonstration du déficit, pas de faisabilité :** 70.3 : 760 min natation / (760 + 758 + 1 018 + 750 min bricks non décomposées) = au mieux 23,13% ; pour atteindre 20%, total d'endurance requis 3 800 min, contre 3 286 min dans l'hypothèse la plus favorable, soit **514 min supplémentaires**. Ironman : 1 420 min natation / 5 916 min attribuées = 24,00% ; total requis 7 100 min, soit **1 184 min** supplémentaires. Une transition ou une autre restriction peut rendre ces besoins encore plus élevés ; ne jamais allouer les 750 min de bricks 70.3 à une discipline réelle sans sa composition attestée.

Code expérimental ajouté aux commits `56a7fc6`, `ff09b07` et `68c6fe7` : le nouveau `v39-ratio-capacity-certificate.ts` est relié au véritable audit complet et testé sur déficit, marge horaire théorique, durée inconnue et excès de plafond. Il expose `minimumAdditionalNonSwimMinutes`, `capOnlyAdditionalMinutesMaximum`, et `provablyImpossibleUnderWeeklyCaps`. Si la marge horaire n'est pas prouvable, résultat **null** ; si elle est suffisante mathématiquement, résultat **non bloquant sans jamais déclarer qu'une séance source/une récupération/une polarisation existe**. L'état CI final doit être vérifié sur le SHA, non déduit de ce texte.

**Autre contradiction structurante** : le validateur historique `validateSportRatio` mesure la proportion en **nombre de séances** (brick partagé approximativement entre vélo et CAP), tandis que V31 mesure les **minutes effectivement attribuées** sans partage inventé. Une réallocation de minutes ne corrigera pas le défaut *historique de fréquence* : il faut une allocation du nombre de séances qui respecte déjà la matrice de quotas et les règles de bricks, puis un choix de doses approuvées satisfaisant la cible **en minutes**. Ces deux validations restent obligatoires ; aucune plage cible n'est abaissée.

**Autres refus conservés** : semaine de décharge S4 du 70.3 à **24,1%** de réduction contre **30%** exigés (315 contre 415 min) ; polarisation 70.3 S5/S6/S7/S9, Ironman S6/S7/S9/S10/S11 (ex. 70.3 S6 : **34%** Z1–Z2 contre **≥75%**). Prochaine modification sportive : reconstruire l'allocation *quotas + phases + sports + doses* avant de chercher à satisfaire le solveur ; ne pas maquiller ces échecs avec le calcul de déficit.

**Preuve physiologique 1 : PASS observé sur le 10 km. Preuve sportive multisport 2 : NO-GO. Production : NO-GO.**

## V3.9.5 — preuve d'incompatibilité des ratios *en nombre*, et essai de doses V3 réellement choisies

**Preuve exécutée CI spécialisée, SHA `a3c4866` : 149 tests réussis / 7 ignorés.** Nouveau certificat `v39-native-count-quota-bound.ts`, calculé sur **toutes les semaines non-race susceptibles d'être comptées par le validateur historique (charge, récupération, affûtage)** et conservateur même si celui-ci en exclut certaines par thème. Il accorde tous les créneaux possibles aux sports autres que la natation et un avantage supplémentaire dû à l'arrondi historique des bricks impairs.

| Scénario | Ratio natation minimal possible dans le validateur historique en nombre de séances | Seuil d'erreur historique natation | Conséquence |
|---|---:|---:|---|
| 70.3 | **33,33 %** | **28 %** (borne 20 % + tolérance d'erreur 8 points) | **Erreur native inévitable avec ces quotas** |
| Ironman | **40,00 %** | **28 %** | **Erreur native inévitable avec ces quotas** |

Le constat ne dépend ni des 800 recettes ni de leur durée : augmenter la bibliothèque ne peut pas réparer cette impossibilité par quota. Ne pas affaiblir les cibles **15–20 %** ni supprimer les quotas sportifs : le chantier ultérieur doit rendre la **validation de ratio** cohérente avec les **minutes exactes / compositions attestées**, et contrôler la fréquence séparément. Pendant ce diagnostic, le validateur natif défectueux **reste actif et bloquant** : pas de faux GO.

**Essai de préférence des sources déjà admissibles**, à structure et intensité non modifiées : base 70.3 ~29,97 % de natation en minutes directement attribuées (borne favorable bricks : 23,13 %) contre 17,19 % sous préférence *toutes disciplines* (borne favorable bricks : 13,39 %). Ironman : 24,00 % en base contre **11,96 %** en préférence *toutes disciplines*, sous la cible minimale de **15 %**. Tous les plafonds horaires et la construction 12/12, 16/16 sont conservés, mais les deux plans restent **NON CONFORMES**. Le mode « toutes disciplines » **surcorrige**, donc n'est pas promu en solution.

**Variante `bike` isolée au SHA `651a971`** : préserve la sélection natation/CAP historique, oriente uniquement les candidats vélo déjà individuellement admissibles. Une comparaison sur le vrai moteur 70.3/IM doit encore confirmer son résultat CI et ses garde-fous ; aucune conformité présumée.

**Décision de conception** : les ratios de *volume* doivent dépendre des minutes et compositions de bricks **certifiées** ; les *quotas de fréquence* doivent rester une obligation séparée. L'ancienne méthode compte arbitrairement un brick pour une demi-séance vélo et une demi-séance course, avec arrondi ; elle ne mesure pas la distribution physique du volume. La correction du validateur nécessite une migration explicite avec tests de non-régression et refus si une provenance de brick manque.

## V3.9.6 — progrès sportif observé avec préférence ciblée natation, sans toucher aux sources

**Preuve exécutée SHA `3742839` : 149 tests spécialisés réussis, 7 ignorés.** Sous les mêmes athlètes synthétiques, les mêmes 800 fiches sources de la bibliothèque (seules les fiches individuellement approuvées sont candidates), les mêmes contraintes coach et les mêmes garde-fous, la préférence `preferSourceBackedMultisportBalance:'swim'` modifie uniquement **l'ordre des séances natation admissibles** ; aucun bloc, durée, heure ni dose ne sont inventés. Le ranking du limiteur sur une séance clé reste prioritaire.

| Volume de natation (semaines de charge, minutes attribuées) | Mode natif | Préférence vélo seule | Préférence natation seule | Préférence toutes disciplines |
|---|---:|---:|---:|---:|
| 70.3 — % des minutes connues | 29,97 % | 27,93 % | **20,39 %** | 17,19 % |
| 70.3 — borne basse favorable incluant 750 min bricks inconnus | 23,13 % | 21,70 % | **15,26 %** | 13,39 % |
| Ironman — % réellement attribués | 24,00 % | 20,72 % | **15,35 %** | 11,96 % |

**Ironman** : 16/16 semaines ; sous **840 min/sem**, sans récupération V3 non prouvée ; ratio minute `det_multisport_minute_ratio_provably_out_of_bounds` **absent** en mode natation seule. Le nouveau ratio natation **15,35 %** est dans la plage 15–20 %. Le moteur maintient toutefois les erreurs de polarisation et de `sport_ratio` **historique en nombre**, lui-même prouvé incompatible avec les quotas.

**70.3** : 12/12 semaines ; sous **600 min/sem**, sans récupération V3 non prouvée ; la préférence natation seule supprime les bloqueurs de décharge `det_scheduled_deload_not_proven`, de progression `load_pattern` et de catégories `lorang_categories` observés au départ. Restent `det_multisport_minute_ratio_unverifiable` (bricks non décomposés), polarisation et ratio historique en nombre. Une plage **15,26–20,39 %** n'est PAS un volume attesté : les 750 min de bricks ont encore une attribution indéterminée.

**Décision** : la préférence natation seule est un **candidat test-only prometteur**, non une règle universelle ni un plan validé. La preuve de conformité totale demeure NON OBTENUE. Les deux urgences vérifiées sont (a) retirer mathématiquement le faux blocage d'un ratio de volume mesuré en nombre de séances, **sans supprimer le contrôle de fréquence** ; (b) faire passer les échecs de polarisation à partir de vraies séances et minutes de zones, sans inventer de temps Z1/Z2 ni de source de brick.

## V3.9.7 — préférence Z1/Z2 non-clé refusée après preuve négative

CI spécialisée du SHA `23f0201` : **149 tests réussis, 7 ignorés**, et essais comparatifs du vrai `constructDeterministicPlan`. La tentative `preferCertifiedEasyOnNonKeySlots` n'a **réduit aucune semaine bloquée pour polarisation** :
- 70.3 : polarization S5/S6/S7/S9 **inchangée** ; refus de décharge S4, `load_pattern` et `lorang_categories` **réintroduits** alors qu'ils avaient disparu avec la préférence natation seule.
- Ironman : polarization S6/S7/S9/S10 **inchangée** ; la natation varie de 15,35 % à 15,50 %, sans avantage pertinent.

**Décision : REJET** de cet ordre de sélection « easy non-key ». Les modifications ont été annulées (moteur au commit `24551b5`, test au commit `f41dc6b`) et la variante natation seule retrouve le statut de meilleur candidat test-only. L'essai rejeté reste documenté, mais non actif. Pour corriger la polarisation, il faut caractériser les minutes Z1/Z2 réelles et leurs séquences dans les sources approuvées, et trouver des affectations compatibles **avec la décharge, les séances clés, les ratios sportifs et la récupération simultanément** ; ne pas augmenter artificiellement les minutes faciles.

## V3.9.8 — migration expérimentale des ratios en minutes strictes, enfin attestée sur l'IM

**Exécution réelle SHA `87077fe`, CI spécialisée : 159 tests réussis, 7 ignorés** (Deno, ESLint, Playwright et DET spécialisés verts ; CI frontend reste rouge sur les deux empreintes Lovable et la matrice globale). Production et validateur historique inchangés.

Nouveau contrat expérimental `applyReviewedMinuteSportRatio` : l'ancien contrôle `sport_ratio` (calculé en **nombre** de séances, incompatible avec les quotas) ne peut être remplacé que SI (a) toutes les séances d'endurance des semaines de charge possèdent des durées vérifiables, (b) tout brick a une composition bike/transition/run **individuellement approuvée et exacte**, (c) les trois proportions **en minutes** sont dans leurs cibles strictes, (d) les quotas de fréquence restent contrôlés, (e) aucun sport exclu ou ambigu ne nécessite une redistribution de cible. Les interdictions autres qu'une exclusion de sport, notamment `Sprint Ban`, passent toujours les validateurs natifs correspondants. Les anciennes erreurs ne disparaissent pas : elles deviennent des avertissements **historisés** avec leur sévérité et message d'origine, uniquement après substitution par une preuve plus stricte. Les contrôles natifs des autres dimensions restent inchangés.

**Résultat IM, variante natation seule** : **15,3455 % natation**, **52,4572 % vélo**, **32,1973 % CAP** sur les minutes attribuées. Les cibles strictes sont respectivement **15–20 %, 45–55 %, 25–35 %** : **trois sur trois PASS simultané**, zéro brick non décomposable et zéro quota en dérive. Le moteur remplace effectivement **deux** erreurs count-only par deux diagnostics explicites ; le journal inscrit `det_strict_minute_sport_ratio_verified`. **Résultat sportif global : NO-GO** : quatre semaines demeurent bloquées pour polarisation (S6, S7, S9, S10). Le remplacement ne dispense **jamais** d'un contrôle de charge, de récupération, de sécurité ou de polarisation.

**Résultat 70.3, variante natation seule** : migration **REFUSÉE** parce que quatre bricks ne disposent pas d'une chronologie vélo/course individuelle certifiée ; 750 minutes de bricks au total :
- S5 `B_703_BRICK_RACE_PACE` — **180 min** ;
- S6 `B_IM_BRICK_LONG_MARATHON_PACE` — **300 min** (la présence d'une fiche nommée IM dans un plan 70.3 mérite vérification d'équivalence sportive, sans en déduire seule une erreur) ;
- S7 `B_BRICK_RACE_PACE_SHORT_703` — **120 min** ;
- S9 `V3_BRICK_703_RACE_PACE` — **150 min**.

**Origine des blocages de polarisation, selon le parseur NATIVE du plan (diagnostic ≠ qualification indépendante des zones)** :
- 70.3 S6 : brick S6 de 300 min dont environ **223 min Z3 estimées** ; S9 : brick 150 min évalué à **143 min Z4+ estimées** + vélo V3P_BIKE_089 évalué à **120 min Z3**.
- IM S7 : `B_LCW_BIKE_LONG_RACE_SAT` évalué à environ **148 min Z4+**, plus `V3P_BIKE_057` à **74 min Z3** ; S9/S10 : long runs A_IM_RUN_PACE (100 min Z3 estimées) et V2_RUN_SORTIE_LONGUE_STRUCTUREE (93 min Z3 estimées) combinées avec vélo V3P_BIKE_057 (74 min Z3).
- Ces calculs sont des **attributions de l'heuristique native** à partir des textes et zones : ils identifient les sources à réexaminer, et ne doivent jamais se substituer à une décomposition des blocs certifiée.

Un nouveau mode de recherche bornée `requireNativePolarizationOnLoadWeeks` est en **essai**, pour demander au DFS une distribution native Z1–Z2 ≥75 % par semaine de charge avec inconnus ≤30 %, sans abaisser les règles ni inventer du temps facile. Un échec de budget de recherche devra être rapporté comme *recherche épuisée*, jamais comme preuve d'impossibilité ; résultat CI complet non présumé.

**Priorité restante** : (1) décomposer ou refuser les quatre bricks 70.3 selon leurs **sources réelles** ; (2) sélectionner des calendriers sous 75 % minimum de volume facile **attesté** et non simplement reconnu par un regex ; (3) confronter les alertes natives au contenu structuré V3/mesuré puis exiger une revue humaine. Aucun GO sportif multisport ou de production.

## V3.9.9 — recherche de polarisation, limites démontrées sans faux GO

Le mode **opt-in exploratoire** `requireNativePolarizationOnLoadWeeks` a été testé sur les deux scénarios à **18 000 nœuds maximum et 8 secondes de recherche** chacun. La première version du DFS refusait avec `search_budget_exhausted` en **S5 (70.3)** et **S3 (Ironman)** : ni plan complet conforme, ni preuve d'infaisabilité.

Le moteur dispose ensuite d'une **borne supérieure optimiste par domaine de séances**. Pour chaque créneau restant, elle suppose simultanément le maximum de minutes Z1–Z2 et le minimum de minutes non faciles parmi des séances pouvant être différentes, **ignore** les plafonds, interdictions et récupérations qui réduiraient encore les solutions : une borne sous 75 % est donc une preuve locale de non-admissibilité des sources considérées, jamais un faux rejet d'une solution réelle. Une borne suffisante ne vaut pas preuve de faisabilité et les validateurs natifs restent obligatoires. Les durées de renforcement non mesurées n'ajoutent aucune minute aérobie fictive.

**Nouvelle exécution réelle, SHA `331ed94` (résultat spécialisé extrait des logs, bilan CI global encore à confirmer)** : l'élagage n'obtient toujours PAS de programme entier sous les budgets de recherche fixés : **70.3 S5, 18 001 nœuds**, **Ironman S7, 18 001 nœuds**. Il progresse jusqu'à S7 sur l'Ironman mais ne démontre pas de faisabilité complète ; verdict `det_native_polarization_target_search_unresolved`, **NON CONFORME**. Cela interdit de présenter cette optimisation seule comme une résolution de polarisation. Prochaine étape nécessaire : intégrer une sélection structurée de temps par zone réellement attesté et élargir les familles faciles/appropriées admises sur les créneaux sportivement admissibles, **avant** d'augmenter arbitrairement le budget de recherche.

## Critères de décision indépendants et non négociables
1. **Différenciation physiologique** : deux plans pour le même athlète où seule la priorité de limiteur change, deux séances clés réellement sélectionnées au même créneau avec leurs stimuli distincts, objectifs/phase/sécurité vérifiés. Échec si seuls les scores de classement changent.
2. **70.3** : date/jour J placés, 12 semaines complètes, chaque budget coach ≤600 min, vraie décharge, ratios sportifs sur minutes attribuées, récupération à partir d'horaires coach authentifiés (ou refus), polarisation et séances clés conformes, toutes les validations natives sans blocage.
3. **Ironman** : mêmes garanties sur 16 semaines, ≤840 min/semaine dans le cas synthétique, sans éléments de charge fictifs.
4. **GO production** : hors de ce chantier ; exige attestation Lovable et CI générale, persistance Supabase réelle, réouverture/édition, exports et validation sportive humaine. 

**Verdict en cours : NO-GO sportif multisport et production.** Ce dossier est une preuve d'exécution et de refus utiles, pas une attestation scientifique indépendante.

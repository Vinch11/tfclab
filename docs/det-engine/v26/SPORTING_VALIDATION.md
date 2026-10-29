# Validation sportive et technique

DRAFT — NO-GO. Cas synthétiques. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée. Quatre semaines ne constituent pas une préparation Ironman complète.

| Vérification exécutée | Résultat / portée |
|---|---|
| build | code 0 ; 32 passed (32) |
| replay | code 0 ; 32 passed (32) |
| types | code 0 ; compilation TypeScript sans émission |
| coach_floor_non_regression | code 0 ; 29 passed (29) ; reçu validation-3 réutilisé, anciens modules inchangés |
| v25_non_regression | code 0 ; 40 passed (40) ; reçu validation-3 réutilisé, anciens modules inchangés |
| v24_non_regression | code 0 ; 23 passed (23) ; reçu validation-3 réutilisé, anciens modules inchangés |
| v23_non_regression | code 0 ; 25 passed (25) ; reçu validation-3 réutilisé, anciens modules inchangés |
| v22_non_regression | code 0 ; 27 passed (27) ; reçu validation-3 réutilisé, anciens modules inchangés |
| multiobjective_non_regression | code 0 ; 175 passed | 5 skipped (180) ; reçu validation-3 réutilisé, anciens modules inchangés |

Contrôle indépendant Python stdlib : {"version": "det-v26-independent-1", "passed": true, "previousFilesUnchanged": 4920, "originalCasesUnchanged": 8, "sensitivityCases": 10, "coachDossiers": 2, "sessionsDetailed": 60, "independentlyCheckedRecipeWitnesses": 26, "historicalRawResultsUnchanged": true, "individualRefusalsUnchanged": 42, "A_runRefusals": 7, "newPhysicalSubstitutions": 0, "individualApprovals": 0, "humanSportingReviews": 0, "knownSourceTextNolioMocks": 60, "sourceTextRefusals": 0, "structuredCalendarWorkouts": 0, "separate425TransferProbes": 5, "historicalFixturesPreservedNotRerun": 600, "preservedIds": 920, "preservedVariants": 2425, "preservedNolioFixtures": 15, "verifierSha256": "16ba916b6c3f3a09ce6fc6ab150c496ef37c2801a81a848ab5c553709e8405e4"}.

Les quatre semaines sont vérifiées avec les validateurs historiques inchangés et `validateFourWeekScopeV23`. Les huit calendriers conservés et leurs issues brutes sont exactement ceux du précédent dossier coach-floor, pas seulement les mêmes compteurs. Les floors, quotas, alertes de répétition et conflits course restent présents. A garde sept refus, C ses refus, et l’observation défavorable la suspension S2 sans compensation.

Les sensibilités restent distinctes des huit références :

| Cas | Leviers calculés | Budget S1 | Refus individuels | Bloqueurs de contexte de dose |
|---|---|---:|---:|---|
| A_original | force_max, threshold_work, vo2_intervals | 480 | 7 | 0 |
| B_original | z2_volume, force_max | 480 | 0 | 0 |
| C_missing | z2_volume | 480 | 26 | 0 |
| B_limiter_changed | force_max, threshold_work, vo2_intervals | 480 | 0 | 0 |
| B_availability_reduced | z2_volume, force_max | 336 | 24 | 0 |
| B_adverse | z2_volume, force_max | 480 | 1 | 0 |
| B_missing_anchor | z2_volume, force_max | 480 | 7 | 0 |
| B_insufficient_capacity | z2_volume, force_max | 480 | 1 | 4 |
| B_missing_science | z2_volume, force_max | 480 | 0 | 0 |
| B_favorable_insufficient | z2_volume, force_max | 480 | 0 | 0 |

Le cas disponibilité réduite conserve une réservation native en défaut : ce défaut est signalé, jamais renommé admissible. Son alternative de floor rejetée reste proposée séparément ; elle n’est plus retenue par sa seule présence. Retirer le contexte scientifique retire le dossier mécanistique, sans réécrire le calendrier. Un compte rendu favorable sans preuve d’adaptation laisse capacités et calendrier inchangés. Les 600 références ne sont pas rejouées ; la non-régression multiobjectifs disponible est exécutée.

Deux essais initiaux attendaient à tort que la longue vélo franchisse tous les filtres. Le prérequis `ventilateur` les a fait échouer. Il est conservé ; une liste documentaire séparée, explicitement non admissible, remplace cette attente incorrecte. Les logs rouges sont archivés. Un contrôle indépendant supplémentaire a ensuite détecté l’adoption d’une alternative refusée dans le nouveau contrefactuel de disponibilité. Témoin rouge indépendant et test rouge conservés ; la composition exige maintenant le statut autorisé ET la validation complémentaire sans erreur. Les huit références restent identiques. Aucune règle sportive n’est assouplie.

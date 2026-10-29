# V26 — prescription physiologique prospective

DRAFT — NO-GO. Cas synthétiques. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée. Quatre semaines ne constituent pas une préparation Ironman complète.

Baseline `013489126054a94d4c5395e0b5e49d457d25ab47`, #425 lu à `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`. Les deux têtes ont été vérifiées avant écriture. Les archives V2–V25 restent intactes.

La nouvelle capacité exécutée est une recherche de recettes pilotée par les leviers calculés avant le calendrier. Elle parcourt la bibliothèque canonique complète, exige une intention physiologique explicite dans la source et une discipline étayée, réutilise les filtres et l'instanciateur existants, puis expose les raisons d'exclusion. Ni titre ni score pondéré caché ne pilotent le choix.

A obtient un dossier de deux chronologies VO₂ vélo structurées de B_BIKE_VO2_3MIN, 60,5 et 64,5 minutes comme témoins techniques. Elles restent interdites/différées dans ce bloc : phase, prohibition historique, tolérance, intensité Z5 et convention du repos final. B obtient la longue vélo continue déjà présente comme recette pertinente à examiner. Son prérequis historique `ventilateur` reste non confirmé. Le TTE frais n'est pas requalifié en durabilité Ironman.

**Aucune nouvelle substitution de séance n'est retenue.** Les calendriers et volumes V25 avec dérogation coach restent exactement identiques ; les propositions physiologiques sont différentes et les raisons de leur non-insertion sont exécutées. Aucune preuve ne permet actuellement d'ajouter le VO₂ à A ni de rendre la dose de B individuellement approuvée.

| Cas figé | Recettes structurées à examiner | Franchissent tous les filtres connus | Erreurs / avertissements historiques | Refus individuels |
|---|---:|---:|---|---:|
| A_aerobic | 2 | 0 | [5, 36] | 7 |
| B_sustainability | 1 | 0 | [5, 34] | 0 |
| C_uncertain | 0 | 0 | [4, 37] | 26 |
| B_changed_relevant_limiter | 2 | 0 | [5, 36] | 0 |
| B_missing_bike_reference | 1 | 0 | [5, 35] | 7 |
| B_lower_run_capacity | 1 | 0 | [4, 34] | 1 |
| B_adverse_recovery | 1 | 0 | [5, 34] | 1 |
| B_insufficient_differentiation | 2 | 0 | [5, 36] | 0 |

La liste pour examiner les preuves n’est pas une liste de prescriptions admissibles. Le prérequis de ventilation est conservé, pas transformé en avis de diversité. Les sept refus course A, les 26 refus C, les autres refus et la suspension vélo S2 restent identiques. L’exception 95→90 est déjà autorisée pour la programmation expérimentale et ne doit pas être redemandée pour son périmètre existant. Elle n’approuve pas la dose individuelle.

Vérification indépendante : 4920 fichiers antérieurs inchangés, 920 IDs, 2 425 variantes, 600 références historiques recomptées et préservées (pas rejouées intégralement), 15 fixtures Nolio conservées. Deux dossiers de 30 séances, dix sensibilités et cinq sondes de contrat #425. 26 témoins de recettes contrôlés indépendamment ; sept artefacts identiques au rejeu.

Les études V21 sont du contexte documentaire, pas une validation de ces doses. Les modèles #425 ne sont pas importés, et aucun coût 200 de la fixture de transfert distincte n’est injecté dans A/B/C. C8 et la persistance réelle Supabase restent non résolus. Voir les journaux de tests et les dossiers complets ci-dessous.

**Correction fonctionnelle de composition :** la présence d’une alternative 90 minutes ne suffit plus pour la retenir. Le cas disponibilité7h a exposé une proposition rejetée par la validation du bloc ; V26 conserve désormais le calendrier natif en échec et la proposition séparée, sans l’approuver. Son conflit natif95/90 reste visible. Le témoin indépendant et le test rouges avant correction sont conservés, ainsi que le contrôle vert après correction. Les trois validations générales clôturées ne sont pas relancées ; une seule validation de sécurité a utilisé le budget initial restant.

Tests finaux V26 : **32 réussis**, puis rejeu identique ; **319 tests de non-régression réussis**, 5 anciens skips conservés, TypeScript sans émission réussi. Les six reçus de non-régression de validation-3 sont réutilisés après la correction ciblée car leurs anciens modules et configurations sont inchangés ; les nouveaux tests, le rejeu et TypeScript ont été réexécutés après correction.

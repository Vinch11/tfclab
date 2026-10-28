# Validation sportive : portées, contraintes et inconnues

Les validateurs historiques et V11 ne sont ni modifiés ni désactivés. validateWeek reçoit le vrai contexte de chaque semaine ; les contrôles de bloc portent sur les quatre semaines. Les sorties historiques de préparation16 semaines sont archivées brutes, parallèlement. Le classement ci-dessous ne change aucune sévérité ni aucun statut de conformité historique.

## IM_aerobic_history

| Code historique | Sévérité | Interprétation avec témoin | Nombre |
|---|---|---|---|
| layout_drift | warning | programming_warning | 19 |
| sport_ratio | error | sporting_or_methodological_incompatibility | 2 |
| race_day | error | scope | 1 |
| title_format | error | technical_format_scope | 1 |
| anti_repetition | warning | programming_warning | 11 |
| calendar_coverage | error | scope | 1 |
| triathlon_discipline_continuity | error | scope | 1 |
| triathlon_training_frequency | error | scope | 1 |

| Discipline | Séances physiques | Minutes prescrites | Part en nombre | Part en minutes |
|---|---|---|---|---|
| swim | 8 | 320 | 36.4% | 20.3% |
| bike | 7 | 870 | 31.8% | 55.2% |
| run | 7 | 385 | 31.8% | 24.4% |

Aucun brick : il n’existe ici aucune composante supposée. Soutien/mobilité exclu du dénominateur d’endurance. Ces minutes sont des prescriptions ; le temps réellement passé dans chaque domaine reste inconnu.

## IM_balanced_history

| Code historique | Sévérité | Interprétation avec témoin | Nombre |
|---|---|---|---|
| layout_drift | warning | programming_warning | 19 |
| sport_ratio | error | sporting_or_methodological_incompatibility | 2 |
| race_day | error | scope | 1 |
| title_format | error | technical_format_scope | 1 |
| anti_repetition | warning | programming_warning | 11 |
| calendar_coverage | error | scope | 1 |
| triathlon_discipline_continuity | error | scope | 1 |
| triathlon_training_frequency | error | scope | 1 |

| Discipline | Séances physiques | Minutes prescrites | Part en nombre | Part en minutes |
|---|---|---|---|---|
| swim | 8 | 355 | 36.4% | 22.6% |
| bike | 7 | 680 | 31.8% | 43.3% |
| run | 7 | 535 | 31.8% | 34.1% |

Aucun brick : il n’existe ici aucune composante supposée. Soutien/mobilité exclu du dénominateur d’endurance. Ces minutes sont des prescriptions ; le temps réellement passé dans chaque domaine reste inconnu.

## Témoins et limites

- Les contrôles de couverture attendent16 semaines et en observent4. Dans les audits originaux de continuité/fréquence, les déficits des semaines couvertes sont vides ; le code échoue aussi sur le calendrier complet manquant. Ce témoin établit la portée, sans annuler l’erreur brute.
- Le titre de bloc ne satisfait pas le H1 d’un plan complet ; c’est un écart de format conservé. La sérialisation technique du bloc, les sept jours et les sources sont contrôlés indépendamment.
- Les erreurs sport_ratio restent des divergences méthodologiques ; elles ne sont pas assimilées à de simples erreurs de portée. Les fréquences et minutes diffèrent, sans que cela démontre l’optimalité des nouvelles parts. Les quatre semaines ne couvrent pas tout le premier bloc natif de génération.
- Les avertissements de layout et de répétition sont réels. Leur diminution éventuelle ne suffit pas à choisir un modèle. Aucun avertissement significatif nouveau n’est accepté par simple reclassement.
- Les plages source, planchers, plafonds individuels, disponibilités, jours de repos, espacement candidat, domaines et contrôles de charge existants restent actifs. Les bornes de programmation ne deviennent pas des certificats de sécurité.
- Fatigue réelle, charge interne, chronologie de certaines fiches et faisabilité individuelle du protocole complet dans les créneaux restent inconnues. La force et nutrition réelles manquent ; voir la revue de spécificité.

Les deux versions n’ajoutent aucune erreur critique ni avertissement historique par rapport à V11. Elles conservent chacune7 erreurs et 30 avertissements bruts (V11 :7 et31). La réduction d’un avertissement de répétition correspond à une source effectivement différente en S1, pas à une réécriture de l’indicateur. Cette variation n’est pas une preuve d’efficacité.

Typage et tests logiciels passent ; conformité sportive aux contrôles candidats exécutés, pertinence générale et validation experte sont des niveaux différents. Aucune adaptation physiologique obtenue, sécurité individuelle générale, préparation Ironman complète ou validation experte n’est attestée.

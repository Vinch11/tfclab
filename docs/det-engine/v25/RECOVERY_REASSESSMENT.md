# Suspension, réévaluation et reprise conditionnelle

La machine `det-v25-recovery-reassessment-1` représente `planned_conditional`, `suspended_due_to_recovery`, `awaiting_reassessment`, `candidate_for_coach_review`, `not_admissible` et la frontière réservée `approved_by_coach`. Le journal est limité à 32 événements; il n'existe aucune boucle de reprise automatique.

La réévaluation exige même slot/source/hash, dates cohérentes, validité au moment simulé, récupération favorable déclarée, absence explicitement déclarée de douleur/symptôme/restriction, observation de tolérance à la séance précédente, référence exploitable, capacité déjà documentée et compatibilité du microcycle. Les dates d'expiration sont des données de preuve explicites, pas un délai de récupération universel.

| Trajectoire prospective figée | État après réévaluation | Capacité initiale inchangée | Suspension opérationnelle conservée |
|---|---|---|---|
| unknown | awaiting_reassessment | 180 | True |
| adverse | suspended_due_to_recovery | 180 | True |
| favourable_insufficient_capacity | not_admissible | 120 | True |
| favourable_missing_reference | not_admissible | 180 | True |
| persistent_pain | not_admissible | 180 | True |
| favourable_documented | candidate_for_coach_review | 180 | True |

Ces trajectoires sont **prospectives synthétiques** : suspension le 9 novembre 2026 à 08 h, demande de réévaluation à 09 h et observation éventuelle à 18 h. Elles sont figées avant exécution; elles ne constituent pas des observations actuellement obtenues. Le scénario de capacité 120 minutes est une fixture distincte préenregistrée, pas une diminution produite par la récupération. La cible reste 130 minutes.

Le cas favorable documente synthétiquement une séance précédente de 120 minutes. Cette observation est une entrée synthétique nouvelle, jamais déduite de la présence d'une séance au calendrier. Elle ne prouve pas la tolérance à la dose cible 130, ni une adaptation. Le plafond déclaré 180 minutes reste inchangé. La cible, l'ancre FTP et la compatibilité structurelle du microcycle sont confrontées indépendamment au résultat TFCLab réellement calculé pour B et aux contrôles quatre semaines exécutés; ces contrôles ne prouvent pas une récupération physiologique ni la validation de toutes les conditions du bloc.

Le résultat est seulement `candidate_for_coach_review`, avec hash du paquet de réévaluation; la suspension opérationnelle reste active. Aucun statut approuvé n'est atteint en simulation, même si un vérificateur permissif est injecté dans le test négatif.

Dans les huit cas V23/V24, la suspension vélo S2 est conservée. Son observation d'origine ne possède pas de date explicite : V25 n'en invente aucune. Le paquet signale `observedAt: null`, et une réévaluation ultérieure exige d'abord une provenance temporelle suffisamment documentée. Les trajectoires nouvelles ne sont pas fusionnées dans ce cas historique.

Aucun volume n'est déplacé ou compensé, aucune capacité n'augmente après disparition de symptômes, aucun défaut de référence ou de calendrier n'est annulé par un ressenti favorable. La machine ne modifie pas le calendrier ni ses validateurs.

# DET-ENGINE V4 — résultats vérifiés

**NO-GO. PR #420 en brouillon.** Aucun contrat candidat n'est promu dans la méthodologie de production.

## Référence V3/V4

Les 600 configurations sont préparées et diagnostiquées ; les 167 plans V3 sont revalidés deux fois avec leur contexte complet. Les 433 refus ne sont pas transformés en erreurs physiologiques globales. Il ne s'agit pas d'une nouvelle construction intégrale des 600 plans : le bundle V3 reste la référence retenue.

| Mesure | V3 | V4 retenue historique |
|---|---:|---:|
| Construits | 167 | 167 |
| Sans erreur bloquante exécutée | 11 | 11 |
| Occurrences bloquantes | 1109 | 1109 |
| Avertissements | 7092 | 7092 |
| Schéma technique | 167/167 | 167/167 |

Aucune nouvelle erreur ni alerte des contrôles existants ; les sorties du rejeu sont identiques. Le contrôle global V4 est une instrumentation supplémentaire et ne réécrit pas les sévérités historiques. Aucun plan globalement impossible n'est affirmé sans preuve.

## Diagnostic structurel

Le graphe distingue données manquantes, contradiction de contrat, domaine catalogue vide, comptage nominal/effectif, couplage au calendrier et limites du solveur. Le premier audit repère 160 cas trail sans géométrie explicite et 60 cas triathlon avec une discipline interdite dans un contrat exigeant sa présence. Les 91 témoins introduction/plancher long sont des incompatibilités fiche/créneau, pas la preuve que tout leur domaine est vide.

La classification finale prioritaire est : `{"remaining_fixed_layout_or_solver_conflict": 42, "candidate_contract_constraint_conflict": 60, "assembled_with_executed_controls": 160, "current_catalogue_domain_conflict": 72, "existing_prevalidation_conflict": 50, "inconclusive_search": 16, "unsupported_static_adaptation": 40, "insufficient_data": 160}`. Ces catégories précèdent parfois le statut d'assemblage : 160 dans la catégorie primaire « assemblé » ne remplacent pas les 167 effectivement construits, car sept assemblés ont aussi une contradiction de contrainte. Les certificats sont limités au catalogue et au placement courants ; une recherche inconclusive reste inconnue.

[Architecture et graphe](ARCHITECTURE.md) · [Diagnostic final détaillé](evidence/reference-final/diagnostics.json).

## Contrats Ironman

| Modèle Ironman | Cas | Construits | Sans erreur sportive | Conforme témoin |
|---|---:|---:|---:|---:|
| reference | 40 | 0 | 0 | 0 |
| v3_phase_recovery | 40 | 26 | 0 | 0 |
| components_keep_long_endurance | 40 | 0 | 0 | 0 |
| components_recovery_relief | 40 | 0 | 0 | 0 |

Chaque modèle est rejoué exactement sur les 40 mêmes cas continus. Les contrats explicites contrôlent la somme vélo/course, distinguent transition et endurance longue, conservent les bornes du catalogue et utilisent les dates des compétitions. La conversion du brick d'affûtage conserve le comptage physique via `effectiveSessionQuota`.

Les deux contrats stricts n'assemblent toujours aucun plan complet. Ils exposent notamment les créneaux d'endurance autonome absents, les domaines de dose/phase incompatibles et les obligations de récupération. Dix cas sont refusés par leur contrat de continuité face à une interdiction de discipline. Le modèle V3 assemble 26 candidats mais aucun n'est conforme sportivement. Ce résultat n'est pas une raison d'affaiblir les contrats stricts.

## Générateur trail complet, cohorte distincte

Trois modèles × douze fixtures nouvelles : **36 résultats, 12 calendriers complets et techniquement valides, zéro candidat sans erreur sportive exécutée**. Les six constructions du premier prototype validé sont préservées ; six constructions supplémentaires apparaissent après réservation d'une affectation de fiches distinctes. Aucun des six plans préexistants ne reçoit une correction globale acceptée sans gain sûr démontré.

Les douze constructions se répartissent en **six trail court et six montagne** ; aucun ultra complet. Elles sont des résultats de modèles, pas douze configurations indépendantes. Le modèle back-to-back ne construit aucun plan ; ses échecs restent publiés. V3 produisait des enveloppes, V4 produit des calendriers entiers ; les fixtures et contrats diffèrent, donc aucun taux comparatif causal V3/V4 n'est prétendu.

Distance, durée cible, D+, D−, technicité et historique synthétique sont séparés. Course/marche, excentrique, sortie longue, récupération et affûtage ont des rôles explicites. Les doses inconnues restent inconnues. Les fiches proviennent du catalogue réel ; aucune séance n'est créée pour réussir le test. Les 160 cas historiques trail ne reçoivent aucune géométrie inventée.

L'affectation de dose minimale tient compte de l'interdiction de réutiliser une fiche : programmation dynamique bornée à huit rôles, pas recherche massive de remplacements. La reconstruction complète est comparée au précédent avec contrôle des fenêtres de charge ; les candidats bruts rejetés restent visibles.

[Tableau de bord séparé par objectif, niveau et modèle](final/dashboard.md).

## Contrôleur et limites

Les fenêtres de 2, 3 et 4 semaines exposent minutes par discipline, sorties longues et doses verticales connues. Les composantes de brick ne sont allouées que si elles sont explicitement quantifiées. Le contrôleur refuse de corriger un saut en gonflant une semaine antérieure. La présence d'un stimulus ne prouve ni assimilation, ni tolérance musculaire, ni pertinence de la progression.

La cohérence complète des durées de toutes les parties des fiches trail, la faisabilité vitesse/terrain, la réponse physiologique et la calibration excentrique restent non attestées. Les erreurs sportives empêchent toute utilisation directe. [Hypothèses et décisions restantes](HYPOTHESES_ET_LIMITES.md).

## Tests, régressions et traçabilité

Suite historique : **2999 réussites, 1 ignoré, 6 TODO**. Suite expérimentale globale : **40 réussites**, scénarios opt-in documentés séparément. Garde-fous Node : **50 réussites**. La dernière modification locale d'appariement est postérieure à cette suite globale : TypeScript, tests ciblés du générateur et 36 scénarios rejoués sont exécutés ensuite. Aucun composant de production ne dépend de cette modification.

Les échecs sont conservés : rôles/phase incompatibles, durées fractionnaires refusées par le schéma, première classification de domaine avec métadonnées résumées remplacée par un diagnostic complet. Un timeout fractionnaire a été rejeté avant lancement ; sa réservation a été reprise sans remettre à zéro le budget ni les tentatives.

Le plafond est de **60 minutes et 10 unités de travail nommées**, chacune bornée à trois tentatives. Les raffinements et reprises restent dans leur unité, avec historique des preuves, sans multiplication cachée des unités. Aucune boucle permanente ou relance future automatique n'est annoncée.

## Décision

**NO-GO maintenu.** Les décisions avant promotion concernent la compatibilité des activations avec le contrat d'affûtage, les contrats d'endurance longue/récupération Ironman et la calibration verticale/excentrique trail. Les problèmes logiciels ordinaires ont été traités sans demander d'autorisation intermédiaire.

Aucune fusion, aucun déploiement, aucune donnée réelle ou Nolio modifiée, migration, dépendance ajoutée ou API payante.

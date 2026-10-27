# DET-ENGINE AUTONOMOUS V2 — résultats vérifiés

**Recommandation : NO-GO pour intégration.** La branche et la PR restent expérimentales et en brouillon. Aucun résultat ne vaut autorisation de fusion ni de déploiement.

## Progrès démontrés

| Indicateur | Baseline comparable | Dernière version acceptée |
|---|---:|---:|
| Configurations | 600 | 600 |
| Plans construits | 167 | 167 |
| Sans erreur bloquante exécutée | 7 | 11 |
| Occurrences bloquantes sur les plans construits | 1403 | 1151 |
| Avertissements sur les plans construits | 7026 | 7118 |
| Reproductibilité finale | Baseline V1 identique au rejeu | 600 / 600 identiques |
| Régression critique comparable connue | — | 0 sur les transitions acceptées |

245 remplacements de séances acceptés sur 13 808 propositions enregistrées ; 252 occurrences bloquantes retirées. Les occurrences ne sont pas des défauts physiologiques indépendants : un même problème peut être observé par plusieurs règles. Aucun plan antérieurement conforme ou construit n’est perdu.

L’augmentation de 92 avertissements n’est pas masquée. Elle comprend des changements de gravité et des alertes de répétition, de séances déclarées clés ou de cohérence de limiteur. Une réduction des erreurs bloquantes ne démontre pas une amélioration sportive générale. Les avertissements sont consultables par plan dans les matrices.

La baseline publiée f933ced2 est conservée et rejouée à l’identique (167/7). Pour comparer les réparations, ses candidats sont réévalués avec le même contexte complet V2 : clés de limiteurs, ordre transmis, audit ambition et historique lorsqu’il existe. Cette baseline comparable est aussi à 167/7. Aucune nouvelle instrumentation n’est assimilée silencieusement à une régression.

## Résultats par objectif et format

| Objectif | Format | Cas | Construits | Sans erreur exécutée |
|---|---|---:|---:|---:|
| 703 | continuous | 40 | 2 | 0 |
| IM | continuous | 40 | 0 | 0 |
| Sprint | continuous | 40 | 20 | 0 |
| Olympic | continuous | 40 | 12 | 0 |
| Marathon | continuous | 40 | 21 | 1 |
| Semi | continuous | 40 | 26 | 6 |
| 5K | continuous | 40 | 23 | 1 |
| 10K | continuous | 40 | 23 | 3 |
| StartToRun | continuous | 40 | 0 | 0 |
| Trail | continuous | 40 | 0 | 0 |
| TrailShort | continuous | 40 | 0 | 0 |
| TrailMountain | continuous | 40 | 0 | 0 |
| TrailUltra | continuous | 40 | 0 | 0 |
| 703 | lcw_3day | 40 | 20 | 0 |
| IM | lcw_3day | 40 | 20 | 0 |

Les tableaux par ambition demandée/effective, niveau coach et profil physiologique figurent dans [le tableau de bord](final/dashboard.md). Les succès running ne compensent pas les échecs triathlon/trail.

## Refus et diagnostic initial

Les 433 refus sont distingués : 200 routes/adaptateurs non couverts (160 trail, 40 StartToRun contraints), 29 recherches inconclusives, 204 rejets du contrat courant (58 prévalidations, 92 domaines vides, 38 doses minimales incompatibles avec le plafond, 16 affectations absentes du placement/pool retenus). Aucun de ces décomptes ne prouve une impossibilité sportive globale.

La sonde de 31 refus IM continus identifie un conflit précis : un brick long de 95–170 minutes est obligatoire, mais les fiches admissibles dans la phase couvrent 60–90 ou 30–50 minutes. Ni variantes exécutables ni catalogue non tronqué ne le corrigent. Aucun étirement de fiche ou changement de phase n’a été inventé. Les neuf autres refus IM sont distincts.

## Cycles réellement exécutés

| Cycle | Décision | Occurrences retirées | Rejeu |
|---|---|---:|---|
| 02 | accepted — retain_experimental_change | 85 | identique |
| 03 | rejected — development_rejected_no_progress | 0 | baseline inchangée uniquement |
| 04 | accepted — retain_experimental_change | 11 | identique |
| 05 | accepted — retain_experimental_change | 58 | identique |
| plan-repair-05 | accepted — retain_experimental_change | 36 | identique |
| plan-repair-06 | accepted — retain_experimental_change | 23 | identique |
| plan-repair-07 | accepted — retain_experimental_change | 21 | identique |
| plan-repair-08 | accepted — retain_experimental_change | 18 | identique |
| plan-repair-09 | rejected — validation_failure | non mesuré | non attesté |

9 cycles lancés : 7 acceptés, un essai de variantes rejeté sans progrès et une dernière passe rejetée parce que sa validation n’a pas fini dans le budget. Les 92 cas de l’essai de variantes ont été exécutés une fois : le rejeu déclaré dans son enregistrement concerne uniquement la baseline inchangée déjà rejouée, pas une seconde exécution de la proposition rejetée.

Budget du superviseur : 1800071 ms, soit 30 minutes plus 71 ms de clôture. Le dernier sous-processus a été interrompu avec ETIMEDOUT (code 143), pas validé en vert. La raison brute du contrôleur est `validation_failure` ; sa cause observable est l’épuisement du budget. La dernière référence acceptée est `det-v2-plan-repair-08-9680f75bb5ea`. Aucun résultat partiel du cycle 09 n’est retenu.

Le superviseur impose 12 cycles maximum, 3 tentatives consécutives sans progrès par cause, réévaluation après deux globaux sans progrès, budgets de durée/heap/workers et zéro USD API. Les tentatives totales restent conservées ; un progrès mesuré remet seulement le compteur d’échecs consécutifs à zéro. Il ne s’agit pas d’un service permanent.

Une régression logicielle ordinaire de l’essai de variantes (masquage de variable) a été corrigée puis l’hypothèse entière rejetée sans supprimer les corrections indépendantes. Le stderr temporaire initial n’avait pas été conservé ; l’incident est déclaré, et une copie isolée reconstruite reproduit maintenant exactement les deux échecs attendus. Aucun test échoué n’est présenté comme réussi.

## Contrôles et limites

- Validation existante de préconditions exécutée pour 560 configurations ; la route statique refuse les 40 autres avant cette préparation.
- Validation complète des quotas, du plan et B13/B14/B15 sur les 167 candidats ; les refus ne sont pas inventés comme plans invalides.
- Schéma existant zPlanChunk, calendrier, jours/index et provenance de références : 167/167 vérifiés séparément ; 433 refus non applicables. Ce n’est pas le respect de toutes les contraintes sportives.
- Absence de codes structurels bloquants : 159/167, indicateur distinct du schéma ; les huit autres restent bloqués par des contraintes déclarées.
- Continuité et fréquences triathlon vérifiées sur chaque semaine contre les minima existants, récupération et compétitions distinguées ; doses des bricks jamais artificiellement réparties. 74 plans tri construits audités, tous restent non conformes à d’autres règles.
- Progression biologique, pertinence musculaire/D+ trail, optimalité de prescription et réponse individuelle aux incertitudes : non attestées. Les preuves physiques descriptives ne les remplacent pas.
- Les conventions méthodologiques TFCL restent appliquées ; leur sévérité existante n’est pas présentée comme une loi physiologique universelle.
- Durées des compétitions non estimées ; charge totale avec compétition non attestée. Chaque candidat reste soumis à revue humaine.
- Le runner fixe hérite aussi de la suite historique via la configuration Vitest. Cette couverture large a un coût d’exécution ; elle explique une part importante du budget consommé. Aucune relance payante ou masquage de test.

Validation réelle finale complète : 387 fichiers réussis + un fichier opt-in ignoré ; 3 018 tests réussis, 3 ignorés et 6 TODO. Suite historique seule : 382 fichiers, 2 999 réussites. 30 tests du superviseur réussis avec un vrai cycle CLI application/restauration ; tests diagnostics et TypeScript réussis. La passe interrompue finale est publiée séparément comme incomplète.

## Décision et suite

**NO-GO expérimental pour intégration.** La construction admissible complète, la spécificité longue distance, la progression physiologique et le trail ne sont pas démontrés. Les prescriptions sans erreur restent des candidats à revoir.

La décision humaine indispensable porte sur les contrats phase × durée des bricks longs Ironman et la prescription trail dédiée, détaillés dans [DECISIONS_REQUISES.md](DECISIONS_REQUISES.md). Un nouveau budget d’exécution explicite est nécessaire pour reprendre des cycles ; l’état épuisé ne doit pas être réinitialisé silencieusement.

Aucune modification des sources de production, donnée athlète/Nolio, migration, fusion, déploiement, API payante, dépendance ajoutée ou push forcé.

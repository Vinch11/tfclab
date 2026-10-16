# P1 — Préservation de l’intention sportive pendant les réparations

## Périmètre

Cette correction ne change ni le diagnostic, ni le Strategy Engine, ni le prompt Gemini, ni le Pilot Cockpit. Elle intervient uniquement après génération, dans les réconciliateurs serveur et client.

Le catalogue affiché à Gemini reste strictement inchangé. Le client transmet désormais, dans des champs séparés du payload, les métadonnées complètes nécessaires aux réparations : sport, intention physiologique, objectifs compatibles, phases, plage de durée, zone principale maximale, contexte particulier, prérequis, nécessité, conditions de placement, contre-indications, tags, structure et zones.

## Comportement avant

Le serveur reconstruisait les candidats depuis le tableau Markdown compact et tronqué du prompt. Une structure non reconnue était classée `unknown`, puis `unknown` était accepté comme joker. Le client utilisait principalement le sport, la phase, la durée, les goals et une famille d’intensité à trois niveaux. Selon le chemin de réparation, la famille d’origine n’était pas toujours conservée. Le caractère recovery/deload dépendait d’une note libre `weeklyNotes`.

Ces règles permettaient notamment les chaînes constatées dans l’export `2026-10-15_B-5K-BEGINNER_run1.json` :

- sortie longue facile → 6 × 1 000 m Z4 ;
- séance build → protocole lactate norvégien ;
- endurance facile → allure Ironman post-vélo ;
- séance initiale → seuil 70.3 ;
- progression longue → allure semi-marathon ;
- semaine recovery → fartlek, côtes ou 4 × 1 000 m ;
- deuxième ouverture d’affûtage identique → remplacement sans preuve d’un rôle équivalent.

## Comportement après

Tous les sélecteurs génériques de remplacement et d’insertion utilisent la même règle structurée :

1. le sport doit correspondre ;
2. un remplacement doit conserver la famille d’intention fine (`endurance_fondamentale`, `seuil`, `vo2`, `sprint`, `technique`, `force`, `recuperation`, `test`, `race_pace`, `brick`, `fatmax`) ;
3. une fiche explicitement réservée à un objectif doit inclure l’objectif courant dans ses goals ; une distance citée dans le nom ne suffit pas à l’interdire ;
4. le candidat doit être compatible avec la phase ;
5. il ne peut introduire ni contexte particulier ni prérequis absent de la séance d’origine ;
6. une insertion sans séance d’origine ne peut introduire de contexte ou prérequis non confirmé ;
7. une semaine `recovery`/`deload` est plafonnée à Z2 et refuse les intentions qualité, même si `weeklyNotes` est absent ; le `weekType` des quotas est prioritaire ;
8. une intention ou des métadonnées inconnues ne valent jamais accord implicite.

Les seules différences d’intention autorisées sont déclarées par le chemin qui
répare précisément cette dimension : réduction d’un excès de séances VO2 vers
seuil/endurance, retrait d’un second contexte à jeun vers endurance/récupération,
et progression interne Start-to-Run entre technique et endurance facile. Elles
ne s’appliquent pas aux remplacements génériques.

Le serveur applique cette règle aux gardes trail hors objectif, au plancher de sortie longue, aux insertions de quota, au dédoublonnage, au plafond des séances à jeun, aux signatures LCW et au plancher quotidien. Le client l’applique aux réparations de phase, durée et discipline, aux insertions de quota, aux deux dédoublonnages, aux réductions d’accumulation intense, au remapping vers un voisin et aux remplacements Start-to-Run spécialisés.

## Réparations volontairement non résolues

Quand aucun candidat ne prouve une équivalence suffisante, la séance initiale reste en place et le chemin existant émet une anomalie explicite (`*_unresolved`, `reconcile_conflict`, `catalog_id_no_safe_neighbor`, `duplicate_catalog_id_unresolved`, ou équivalent spécialisé). Le système ne choisit plus un candidat `unknown` pour faire disparaître artificiellement l’anomalie.

Ce comportement est attendu pour les sept chaînes de non-régression lorsque le catalogue restreint ne contient aucune alternative réellement équivalente. Pour S11, deux ouvertures identiques restent visibles avec une anomalie de doublon si aucune autre ouverture 5 km, taper et `race_pace` n’est disponible.

## Validation sans Gemini

- TypeScript client : `tsc --noEmit`.
- Tests Vitest ciblés : équivalence sportive, famille d’intensité, recovery/deload, remapping et dédoublonnage client.
- Tests Deno ciblés : plancher de sortie longue, réconciliateur serveur, recovery sans `weeklyNotes`, doublon d’ouverture S11 et compatibilité structurée.
- Test d’enchaînement : la sortie serveur conservée en cas de réparation incompatible est passée au réconciliateur client, qui doit à son tour la conserver et maintenir l’anomalie au lieu d’introduire une nouvelle incompatibilité.
- Aucun appel Gemini n’est nécessaire : les plans, catalogues structurés et quotas sont des fixtures locales déterministes.

## Revue finale — fermeture du contrat et validation

Le parcours de production n’utilise plus le tableau Markdown comme source de
candidats de réparation. Chaque métadonnée est validée à l’exécution, puis son
`id` est recoupé avec les IDs du catalogue réellement envoyé au chunk. Une
métadonnée partielle, d’une ancienne version, incohérente avec le dump ou
absente du catalogue courant est ignorée. Un candidat d’un autre chunk reste
utilisable uniquement si son propre chunk fournit le couple dump + métadonnée
cohérent. Les anciennes fixtures Markdown utilisent des wrappers exportés sous
le préfixe `testOnly`; le handler de production ne peut pas les activer par
omission.

La régénération directe d'une semaine transmet désormais le même catalogue
structuré au serveur. Elle conserve aussi les warnings SSE et les traces du
réconciliateur client jusqu'à la validation du plan complet après remplacement
de la semaine.

Les traces serveur et client sont maintenant données à
`computeFinalValidationIssues`. Les problèmes encore présents sur le plan final
sont exposés dans `finalValidationIssues` avec semaine, séance et motif issus de
la trace. Les incohérences de phase et les doublons sont recalculés sur le plan
final par B14/B13, ce qui élimine les alertes devenues obsolètes et évite un
double signalement. Les planchers de sortie longue, signatures LCW, conflits de
discipline et autres problèmes de sécurité ou de faisabilité restent critiques ;
un simple conflit de durée ou de phase reste un avertissement.

| Scénario | Avant la revue finale | Après la revue finale |
|---|---|---|
| Payload sans métadonnées | Réparation Markdown permise implicitement | Réparation non résolue explicite |
| Métadonnée partielle/ancienne | Pouvait participer au pool | Rejet avant classement |
| ID métadonnée absent du dump | Candidat accepté depuis le payload | Rejet par recoupement du chunk |
| Repli inter-chunks | Compatibilité parfois non prouvée | Dump et métadonnée complets requis dans le chunk source |
| Phase incompatible conservée | Trace du réconciliateur seulement | `phase_unresolved` visible dans la validation finale |
| Plancher SL non satisfait | Warning SSE séparé du résultat validé | `sl_upgrade_unresolved` critique dans le résultat final |
| Doublon sans alternative | Trace serveur/client et risque de doublon | Une seule issue finale critique, recalculée sur le plan livré |
| Réparation finalement réussie | Ancienne trace pouvait rester visible | Trace non résolue supersédée par la réparation réussie |

## Finalisation — propagation des anomalies non résolues jusqu’au résultat final

Constat (audit de la chaîne serveur → réconciliateur client → fusion des
chunks → validation finale → résultat visible coach) : les anomalies
`*_unresolved`/`reconcile_conflict` existent bien à l’émission (serveur via
SSE `"warning"`, client via `runReconciler().logs`), mais n’étaient **jamais**
attachées au plan final sous forme structurée — seulement aplaties en chaînes
de caractères (`semanticRepairs`) consommées uniquement par la télémétrie QA
(`logPlanStat`/`/debug/plan-qa`), jamais par `AIPlanViewer.tsx`. Le seul
contrôle qui bloque réellement une action (`handleSaveToPlan`,
`AITrainingPlanPage.tsx`) ne reprend que `validatePlan` + B11 + B12 + B13 : une
violation critique de plancher hebdo (`quota_floor_violation` —
`validateWeeklyQuotas.ts`, qui redétecte indépendamment l’état laissé par un
`sl_upgrade_unresolved`/`insert_unresolved`/`rest_floor_breached` non résolu
côté serveur) n’était reprise que dans le bandeau informatif de génération,
jamais dans ce contrôle bloquant — un plan portant une incompatibilité
critique persistante pouvait donc être sauvegardé sans la moindre
confirmation du coach.

**Correctif** : `quotaIssuesToValidationIssues` (nouveau, dans
`validateWeeklyQuotas.ts`, même mécanique que `checkB13ToValidationIssues`/
`checkB12ToValidationIssues`) convertit les violations `severity: "critical"`
de `QuotaIssue` au format `ValidationIssue` déjà utilisé par B11/B12/B13.
`handleSaveToPlan` les ajoute désormais à `criticalIssues`, sans aucun nouveau
mécanisme d’interface : même dialogue de confirmation dérogeable que tout
autre problème critique existant (seule `objective_sport_conflict` reste non
dérogeable, inchangé). `weeklyQuotaIssues` est la valeur déjà calculée par
`useAITrainingPlan.ts` à la génération — pas une deuxième vérité recalculée.

## Dernière vérification avant fusion — anomalies résiduelles côté réconciliateur client

Vérification ciblée (lecture du code de `planReconciler.ts`, pas seulement
des messages de logs) des anomalies `*_unresolved` réellement émises côté
client, pour chacune : circonstance exacte, nature (incompatibilité sportive
réelle vs limitation technique bénigne), survie après fusion des chunks,
détection redondante existante, visibilité coach, prise en compte à la
sauvegarde.

- **`week_duplicate_unresolved`** (`dedupeWithinWeek`) : doublon de
  catalogId **au sein de la même semaine** (pas inter-semaines), aucune
  alternative trouvée. Déjà **entièrement couvert** : `checkB13` redétecte
  tout catalogId dupliqué dans une semaine sur le plan FINAL fusionné,
  indépendamment du mécanisme qui a échoué à le corriger (serveur ou
  client) — critique, visible au bandeau de génération ET repris dans
  `handleSaveToPlan`. Aucune correction nécessaire ; vérifié par un test
  dédié (pas de double alerte avec B5 non plus).
- **`catalog_id_no_safe_neighbor`** (`neighborRemapPass`) : le catalogId
  d’une séance n’appartient pas au catalogue réellement injecté pour ce run
  (stale, retiré en aval, réservé à un autre objectif, ou hallucination) et
  aucun voisin sportivement équivalent (`evaluateRepairSportingEquivalence`,
  même fonction que côté serveur) n’a pu être prouvé — **incompatibilité
  sportive réelle**, pas une limitation technique anodine. **Corrigé dans
  cette vérification** : l’invariant est exactement celui que `checkB5`
  vérifie (sévérité `critical`), mais B5 ne tournait jusqu’ici que dans le
  harnais QA (`usePilotCockpit`/`useQARunner`), jamais sur le plan réel
  généré/sauvegardé par un coach. `checkB5ToValidationIssues` (nouveau,
  même convention que `checkB13ToValidationIssues` — filtre les lignes par
  séance, exclut naturellement les lignes de diagnostic QA) est maintenant
  branché à la fois dans `useAITrainingPlan.ts` (bandeau de génération,
  `parsed.catalogIdIssues`) et dans `handleSaveToPlan` (contrôle bloquant,
  même dialogue dérogeable que B11/B12/B13).
- **`phase_unresolved`** : fiche dont les phases autorisées n’incluent pas
  la phase actuelle de la semaine, aucune alternative trouvée. Limitation
  de classement, pas un risque d’entraînement direct (la séance reste un
  contenu valide). Déjà couvert par `checkB14` (avertissement, par
  conception) — bandeau de génération, volontairement non bloquant à la
  sauvegarde. Aucune correction nécessaire.
- **`duration_unresolved` / `reconcile_conflict` (surplus)** : durée hors
  plage déclarée par la fiche, ou surplus de séances d’un sport au-delà du
  quota max, sans alternative. Limitation de dimensionnement, pas une
  incompatibilité sportive (la fiche/l’intention d’origine reste inchangée).
  Couvert par `validateWeeklyQuotas` (`quota_range_drift`, avertissement) —
  correctement non critique, visible au bandeau de génération.
- **`quota_floor_unresolved`** : plancher de sport requis non atteint,
  aucune fiche catalogue trouvée pour combler. Redétecté sur le plan final
  par `validateWeeklyQuotas` (`quota_floor_violation`, critique) — déjà
  branché dans `handleSaveToPlan` depuis la correction précédente de cette
  PR. Aucune correction supplémentaire nécessaire.
- **discipline_unresolved** : le sport de la fiche ne correspond pas au
  sport de la séance, sans alternative sûre. Le réconciliateur l’émet sous
  le code existant reconcile_conflict avec le motif discipline ; la
  validation finale conserve cette trace et la classe critique. Aucun
  nouveau code parallèle n’est créé.

Tests de non-régression ajoutés (`checkB5ToValidationIssues.test.ts`) :
anomalie critique transmise au format bloquant ; anomalie non critique
(B14) reste avertissement ; anomalie résolue (catalogId réintégré au
catalogue injecté) n’est plus signalée ; anomalie déjà détectée par B13
(doublon) n’est pas dupliquée par B5 ; substitution sportivement
équivalente reste autorisée ; les lignes de diagnostic QA de B5 ne fuient
jamais dans les messages coach.


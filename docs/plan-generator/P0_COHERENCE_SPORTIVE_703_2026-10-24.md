# P0 — cohérence sportive du programme 70.3 / 33 semaines après #401

Base vérifiée : `38a59ead1fbb610fe9095a5e597332657ad6df74` (`origin/main`).
Branche indépendante : `fix/p0-sporting-coherence-703`.
Le rapport [de #401](P0_REPRISE_703_2026-10-24.md) reste la référence historique ;
ce document ne transforme pas ses hypothèses ouvertes en causes prouvées.

## Sources et limites

PDF accessible : **151 pages**, export Safari du 24/10/2026 à 20:26:39 UTC.
Relecture des prescriptions p.12 (brique S2), p.48 (10 km S9), p.119–123
(S24) et du texte extrait. Trois captures disponibles, également déjà analysées
et transcrites dans le rapport #401 : 6 critiques, 7 avertissements, 66 écarts,
SL vélo nominale 120 min en S1 et course officielle S9 ciblée comme SL CAP.
Aucun JSON de configuration, aucune réponse brute ni trace complète du run
historique ne sont disponibles. Aucun accès aux données d'athlètes.

Les fixtures de cette PR sont des transcriptions ciblées ou des scénarios
synthétiques : elles ne sont **pas** une reconstruction du payload historique.
Les références catalogue sont celles du dépôt, sans modification de leurs phases,
structures, zones, objectifs ou autres métadonnées.

## Matrice obligatoire

| Incident | Cause racine | Correction | Test | État |
|---|---|---|---|---|
| 1 — 10 km officiel / `V3_RUN_10K_RACE_SIM` | Contrat JSON accepte une compétition avec ID d'entraînement ; prompt ratio catalogue sans exception événement. Réconciliateur client traite ensuite l'événement comme une fiche remplaçable : avec titre S9 et ID réel, transformation reproductible en séance Canova. Serveur SL prend aussi l'événement comme cible si le quota est `load`. | Contrat événement `custom=true, catalogId=null` explicite dans le prompt et validé par Zod serveur/client ; protection des événements contre les réparations d'entraînement impliquées ; conflit catalogue détecté dans le plan final, y compris ID dans le texte, et non dérogeable à la sauvegarde. Aucun effacement automatique d'ID/consignes historiques. | `real703RaceIdentity`, `criticalBlockingGate`, tests Deno `real703SportingIdentity` : génération à transport entièrement mocké, schéma, SL, réconciliation, chargement textuel, simulation légitime, activation/allure course distinctes. | Défauts de construction/transformation démontrés corrigés. Attribution **initiale historique** de l'ID et prescription sportive du 10 km restent à vérifier avec les états du run. |
| 2 — `BR_HALF_RACEPACE_PRO` en Fondation S2 | Incompatibilité finale démontrée, mais pas son introduction. Sur main actuel, fiche `phase=[build,peak]`, `when=Build/Peak`, contenu SST/tempo intact ; catalogue initial S1–S5 / 33 semaines **exclut déjà** cet ID. | Aucun patch conjectural de sélection ; aucune métadonnée élargie. | `workoutCatalogBuilder.real703Phase` : vraie bibliothèque, phases effectives et structure, vrai constructeur de catalogue 130 fiches. | Ouvert : catalogue réellement injecté, version, phase brute et ID avant/après mutations nécessaires. |
| 3 — 66 écarts / quotas / clés | Défaut reproductible indépendant des 66 : absence de tag clé côté client → insertion même lorsque quota sport/total plein → trim d'une séance existante. Serveur possède aussi une insertion de qualité sans vérifier les plafonds. Le réparateur utilisait aussi les plafonds nominaux là où le validateur déduit un slot vélo et total par brick. Le comptage S1 3 vélos autonomes + brick = réellement 11 séances ; pas une simple double lecture du brick. | Avant insertion, lire les mêmes plages effectives et le même comptage que le validateur via un helper partagé, sans modifier la convention du brick ; si pleins, conserver séances et signaler conflit non résolu. Aucun relèvement de quota, retrait arbitraire, fabrication de tag clé ni baisse de sévérité. | `reconcilerKeySessionFloor` (échec avant), Deno quota plein (alerte critique maintenue), `real703QuotaAccounting` : squelette → 2 vélos autonomes + 1 brick / 10 séances → zéro écart ; transcription des comptes PDF → écarts bike/total et critiques conservés, validation sans mutation. | Mutation inutile corrigée. Pertinence sportive du quota historique et attribution des 66 écarts ouvertes. |
| 4 — 120 min S1 | Après #401, pas de nouveau consommateur nominal post-individualisation trouvé. Quota nominal 120 min reste possible si rampe absente/no-op ; fallback validateur si floor absent. Rien ne prouve lequel a servi au run. | Aucun changement de floor/validateur ; réutilisation des régressions de #398/#401 et proposition de trace minimale ci-dessous. | Tests existants `computePlan.authoritativeSlFloors`, `weekQuotaTransport`, individualisation : plan synthétique 95 min conservé dans texte final ; 120 min sans rampe ; contrôles critiques toujours présents. | Origine historique **non résolue**. |
| 5 — thème S24 | Texte suspect confirmé, pas de seconde compétition réelle démontrée. Calendrier déclaré synthétique 19/12 et 06/06 produit exactement deux ancrages de course S9/S33. Le prompt mentionne S24 comme ligne de calendrier, pas comme course. | Aucun effacement de thème ni invention/retrait de compétition. | Deno calendrier 33 semaines et test existant `real703RaceIdentity` (thème S24 ne crée pas d'événement ; course non déclarée bloquée). | Origine du thème/affûtage historique **non résolue**. |

## 1 — Parcours de la compétition réelle

1. **Objectifs** : pour le scénario daté connu, `buildUserPrompt` ancre le
   10 km au samedi 19 décembre / S9 et le 70.3 au dimanche 6 juin / S33.
   Les deux restent des courses déclarées, même si le 10 km est un jalon.
2. **Catalogue** : `isRaceSimIncompatibleWithObjective` traite la compatibilité
   de distance des entraînements. Une simulation 10 km reste légitime pour
   préparer un 10 km : la bannir globalement confondrait besoin d'entraînement
   et identité d'événement. Cette règle n'a pas été changée.
3. **Génération** : le premier trou démontré est le contrat `custom/catalogId`.
   Avant : titre de compétition + ID autorisé de simulation accepté. Après :
   Zod refuse la combinaison, sans la réécrire ; le retry existant demande une
   sortie conforme. Test à deux réponses locales, `fetch` entièrement remplacé,
   clé/modèle factices, aucun appel réseau IA. Si le modèle ne corrige pas sa
   sortie, l'échec de génération reste un échec ; pas de plan faussement réparé.
   Le JSON Schema de transport ne suffit pas à exprimer cette règle de titre :
   Zod serveur demeure le contrôle effectif avant émission du chunk.
4. **Mutations serveur** : une compétition ne sert plus de cible SL,
   déplacement ordinaire ou dédoublonnage de fiches/jeûne. Le test avec un
   candidat d'endurance complet et admissible prouve qu'une course pourrait
   sinon être remplacée, au-delà du cas où l'équivalence sportive bloque déjà
   la substitution de la fiche de simulation.
5. **Client** : avant, scénario titre S9 / durée 60 min / ID réel, phase
   numérique Fondation → remplacement par `CANOVA_RUN_INTRODUCTIVE_PHASE`,
   perte du titre/consignes de course. Après, événement intact ; les quotas,
   incompatibilités et conflits de contraintes ne sont pas déclarés résolus.
   L'hydratation des zones ne doit pas lui importer l'intensité d'une fiche
   d'entraînement. Les réparations ordinaires n'en changent pas la date pour
   satisfaire une disponibilité hebdomadaire ; conflit journalisé si nécessaire.
6. **Affichage / sauvegarde** : une ancienne association incorrecte reste
   lisible mais produit `race_catalog_conflict` de sévérité `error`, sans
   bouton de dérogation. L'ID est extrait également du texte Markdown.
   Le moteur ne supprime pas le lien pour prétendre avoir réparé le contenu.

Le PDF prescrit bien une **course de 10 km** en negative split ; la fiche jointe
prescrit **6–8 km** de simulation à S-2. La correction ne remplace pas
arbitrairement la prescription historique par l'une ou l'autre. Il faut encore
valider les consignes réelles de cette compétition. Son attribution initiale
par modèle, mutation ou autre chemin n'est pas déterminable sans logs.

L'identité événement utilisée pour ces gardes se fonde sur les marqueurs
explicites du **titre**, avec exclusion simulation/activation/allure course.
Elle réutilise le détecteur partagé de #401, déplacé sans changer son API.
Une mention de compétition dans les consignes d'un entraînement ne suffit pas.
Limite : un événement sans marqueur explicite dans son titre peut échapper à
ce garde ; aucun nouveau champ d'événement ni réécriture de schéma générale
n'est introduit ici.

## 2 — Première apparition inconnue de la brique S2

La prescription PDF : vélo 80 min Z2 avec 2×10 min Z3 bas + CAP 20 min Z2.
La fiche : vélo 60–90 min Z3–Z4a SST + CAP progressive finissant Z3,
Build/Peak. Sport et durée sont compatibles ; phase, intensité, structure et
finalité ne le sont pas.

`phasesForWeekRange(1,5,33)` donne `[base]` ; `buildWorkoutCatalog` exclut
cette fiche avec les options ordinaires de génération, sans strict override.
`phaseWidener` ne lui ajoute pas base. Les remplacements passent déjà par
l'équivalence sportive de #395–#398, qui ne permet pas de convertir une brique
SST en brique aérobie par simple changement de texte. Le test ne prouve pas
qu'un autre chunk, un autre total de semaines ou une autre version n'a jamais
exposé cette fiche ; le catalogue réel du run reste manquant. Aucun changement
sportif n'est inventé pour fermer cet incident.

## 3 — Quotas, séances combinées et clés

La matrice 703 age_group en charge utilise bike=3, run=3, swim=3, brick=1,
strength=1, total=11 avant alternance. Le squelette remplace une sollicitation
vélo autonome par le brick long : 2 vélos autonomes, un brick, 10 séances.
Le validateur décale de même bike et total quand un brick est présent.
Le nouveau test fait consommer au validateur les séances exactes du squelette,
avec mêmes floors/durées minimales/flags : aucun écart. Ce résultat ne constitue
pas une validation de la pertinence sportive de la matrice pour cet athlète.

Un brick est une séance `sport=brick`. Une journée vélo + natation contient
**deux** séances ; `sport="bike+swim"` ne fait pas partie du schéma JSON.
Le contrôle des disciplines par jour et le booléen `isKeySession` sont
indépendants. Leur divergence ne prouve ni absence d'entraînement ni besoin
d'ajouter une séance. Les tags manquants ne sont pas fabriqués par cette PR.

Autre reproduction directe avec le **vrai quota/squelette S1** : 10 séances,
2 vélos autonomes + brick, flags vélo non clés → avant, insertion d'un
3e vélo `Sortie Z2 progressive` (11 séances) ; après, aucune insertion,
conflit de qualité conservé. Le réparateur lisait bike.max=3 et total.max=11,
alors que les plages effectives sont bike.max=2 et total.max=10 avec un brick.
`effectiveSessionQuota` et `countQuotaSessions`, partagés serveur/client/
validateur, extraient la convention **existante** du validateur ; ils ne
changent ni minima/plafonds nominaux ni son résultat de validation. Un minimum
vélo autonome devenu nul après brick ne provoque plus une insertion de vélo.
C'est un mécanisme capable de produire les comptes visibles de S1, mais pas
une preuve qu'il est à l'origine de CE run sans ses flags et mutations.

Le défaut d'insertion/trim est prouvé par le test client avec deux séances
Z2, `isKeySession=false`, quota natation 2–2, total 2–2 : avant, remplacement
indirect d'une séance par une nouvelle insertion ; après, séances identiques,
compteur/conflit non résolu. Le test serveur utilise deux séances techniques
Z1, sans séance de qualité reconnue, et conserve une alerte `insert_unresolved`
critique plutôt que créer une troisième séance.
Les insertions quand il reste une place et les protections sportives existantes
restent testées. Les trims préexistants de vrais surplus ne sont pas réécrits.

Points ouverts : payload exact de quotas, 60 écarts non lisibles dans les
captures, flags bruts, disciplines après parsing et réconciliation. Le seuil
brick SL repose toujours sur une durée globale `floor vélo +20` ; sans durées
structurées de ses composantes, ce seuil ne prouve pas à lui seul la durée de
la partie vélo. Aucune nouvelle doctrine de comptage vélo/CAP n'est inventée.

## 4 — Trace minimale proposée pour le seuil historique S1

Aucun nouvel appel nominal post-individualisation trouvé dans `src/`.
Les tests #401 sont rejoués ; le resolver texte ne change toujours pas le
quota utilisé par la validation structurée. Un export PDF n'indique ni version
cliente/Edge Function active à la génération, ni présence de `volumeRamp`.

Les traces existantes `[sl_floor_individualization]` n'apparaissent que si des
raisons de réduction existent : leur absence ne permet pas de distinguer
fonction non exécutée et no-op attendu. Pour une prochaine investigation
**autorisée séparément**, proposer une seule trace par semaine contrôlée,
sans données nominatives :

```json
{
  "event": "sl_floor_pipeline", "runId": "identifiant local anonyme",
  "clientVersion": "sha", "serverVersion": "sha",
  "localWeek": 1, "globalWeek": 1, "weekType": "load",
  "volumeRampPresent": true, "injuryRiskPresent": false,
  "nominal": {"bike": 120, "run": 90},
  "individualized": {"bike": 95, "run": 70},
  "serialized": {"bike": 95, "run": 70},
  "validation": {"bike": 95, "run": 70}, "reason": "ramp"
}
```

Valeurs ci-dessus purement illustratives. Lire les mêmes quotas à chaque
étape, sans les recalculer, inclure aussi le cas no-op/rampe absente. Réutiliser
les snapshots `weeklyQuotas` conservés depuis #401. Instrumentation proposée,
**pas installée dans cette PR**, aucun nouvel historique prétendument récupéré.
Les JSON/traces réels déjà listés dans #401 restent nécessaires.

## 5 — Thème et affûtage S24

Première manifestation vérifiable : PDF p.119, thème « Régénération &
Activation Objectif Intermédiaire » ; séances d'activation/affûtage ensuite.
La recherche du libellé n'identifie pas de constante moteur qui le fabrique.
`mergePlanChunks` transporte `week.theme` du chunk ; la normalisation peut
nettoyer les références de semaine hors plage et affecter les phases, mais ne
crée pas ce libellé. Le thème est donc déjà présent au plus tard dans le
contenu transporté ou l'état chargé ; la réponse brute n'est pas disponible
pour en attribuer l'origine au modèle.

Pour les deux dates connues, le prompt construit exactement deux ancrages
absolus S9/S33. Il contient une ligne calendaire S24, comme pour les autres
semaines : sa présence textuelle **n'est pas** une instruction de course.
Le prompt conserve aussi les rappels globaux du jalon 10 km dans la
configuration multi-objectifs ; leur présence dans une fenêtre ultérieure
ne prouve pas un nouvel objectif, puisque leurs dates restent S9/S33. C'est
un contexte à comparer au prompt exact de S23–S25, pas une preuve de création
d'une course en S24. Aucun rappel n'est retiré au hasard.
Ni le thème ni une activation ne prouvent un troisième événement. Les tests
conservent l'absence d'événement inventé en S24 et la barrière bloquante si une
course explicite non déclarée y est introduite. Il manque `raceGoals` du run,
le prompt exact et les contenus S23–S25 avant/après transformations.

## Validation et risques

Validation locale du code final :

- Vitest complet : **340 fichiers, 2555 tests verts, 6 todo non exécutés**
  (`npx vitest run --maxWorkers=2`, 168 s).
- TypeScript : `npx tsc --noEmit -p tsconfig.app.json`, **aucune erreur**.
- Deno complet : **306 tests verts par miroir**, type-check inclus,
  `deno test --node-modules-dir=none --allow-env --allow-read
  supabase/functions/ai-training-plan/` (puis miroir `ai-training-plan-test`).
- Dernier ciblage des deux miroirs : **16 tests verts** ; transport réseau IA
  entièrement mocké pour le test d'orchestration de génération.
- Preuve avant correction sur une extraction de `origin/main` : **7 échecs /
  1 succès** pour les huit nouveaux tests serveur ; le succès préexistant est
  le calendrier S9/S33. Les tests client reproduisent également le remplacement
  de la course, l'insertion/trim et l'ajout du 3e vélo au vrai squelette S1.
- ESLint fichiers frontend modifiés : **154 erreurs avant/après**, dette
  préexistante, **aucune nouvelle erreur** ; nouveaux tests à zéro erreur.
- `git diff --check` sans erreur ; handlers, schémas, prompts et nouveaux tests
  serveur identiques dans les deux miroirs.

Le [workflow CI complet](https://github.com/Vinch11/tfclab/actions/workflows/ci.yml)
est déclenché par l'ouverture de la PR brouillon : Vitest/TypeScript, Deno,
ESLint différentiel et Playwright Chromium. Le verdict du HEAD proposé et le
lien de run sont consignés dans la description et les checks de cette PR.
La suite Playwright n'a pas été exécutée localement en doublon.

Le correctif peut refuser une sortie précédemment acceptée et déclencher le
retry existant pour une course liée au catalogue. Aucun retry supplémentaire
ni appel IA n'est effectué pendant cette mission. Les plans anciens avec ce
conflit restent bloqués tant que leur prescription n'est pas corrigée ; pas
de migration ni de modification automatique des données réelles.

La protection d'un événement empêche les réparations d'entraînement de le
faire disparaître, mais ne résout pas une contradiction objectif/disponibilité,
un quota sportif inadapté ou une mauvaise prescription initiale. Les alertes
peuvent rester ou devenir plus visibles. Les tests déterministes ne certifient
pas la cohérence sportive générale des 33 semaines. Le PDF existant n'est pas
modifié ni régénéré.

Aucune fusion, aucun déploiement Lovable/Supabase, aucun appel Gemini,
aucune donnée d'athlète modifiée, aucun envoi ni changement Nolio.

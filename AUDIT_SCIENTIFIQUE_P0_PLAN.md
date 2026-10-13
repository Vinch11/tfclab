# Plan d'implémentation — Audit scientifique P0 (phase 2)

**Statut : tests de reproduction écrits et confirmés rouges. Aucune règle de
prescription n'a été modifiée.** Une seule extraction PURE (zéro changement
de comportement) a été faite pour F10, par nécessité technique — détaillée
plus bas. Ce document attend validation avant d'écrire les correctifs.

---

## 1. F10 — fallback VLamax vélo→course interdit

### Test de reproduction
`src/hooks/__tests__/useDerivedTrainingZones.vlamaxFallback.test.ts` — **🔴 rouge aujourd'hui** :
`resolveRunVlamaxInput({ vlamax_run: null, vlamax: 0.40 })` retourne `0.40`
au lieu de `null`.

Pour écrire ce test, une extraction pure et sans changement de comportement
a été nécessaire (`useDerivedTrainingZones.ts` n'exposait aucune fonction
testable — convention du projet : tester des fonctions pures, pas des hooks
rendus). La fonction `resolveRunVlamaxInput()` a été créée avec EXACTEMENT
le même corps que l'expression inline existante (`vlamax_run ?? vlamax`),
puis les deux usages internes du hook ont été redirigés vers elle. Le
comportement du hook est strictement inchangé — c'est un renommage/extraction,
pas une correction.

### Correctif proposé (minimal)

```ts
export function resolveRunVlamaxInput(
  snap: { vlamax_run?: number | null; vlamax?: number | null } | null | undefined,
): number | null {
  return snap?.vlamax_run ?? null; // plus de repli sur vlamax (vélo)
}
```

Une seule ligne change. Conformément à la politique déjà écrite dans
`vlamaxResolver.ts`, l'absence de `vlamax_run` doit produire `null`, pas une
valeur empruntée au vélo.

### Conséquences attendues sur les plans générés
- Carte `DerivedTrainingZonesCard.tsx` (seul consommateur confirmé) :
  pour un coureur sans `vlamax_run` connu, la ligne "allure seuil estimée"
  bascule sur le repli existant `estimateRunThresholdPaceSecPerKm` sans
  `mlssPct` (repli générique déjà codé, cf. signature de la fonction) au lieu
  d'une estimation Modèle C silencieusement biaisée par la VLamax vélo.
  Résultat : zones course moins "précises" en apparence, mais honnêtes.
- Aucun impact sur la génération de plan elle-même (ce hook n'alimente que
  l'affichage, pas le générateur) — confirmé par le grep de consommateurs.

### Régressions potentielles
- Aucune régression de comportement pour les athlètes qui ONT `vlamax_run`
  renseigné (majorité probable des coureurs suivis).
- Pour les athlètes SANS `vlamax_run` : la carte affichera un repli plus
  générique qu'avant — un changement d'affichage visible, pas une
  régression fonctionnelle (l'ancien affichage était trompeur).

---

## 2. F4 + F6 — densité des stimuli durs, indépendamment du calendrier et des intitulés

Ces deux constats partagent la même cause profonde : `validatePolarization`
et `validateWeeklyHardDayDensity` raisonnent **par semaine isolée**, avec des
exemptions basées sur le **nombre de séances** ou le **texte du thème** —
jamais sur le contenu réel jour par jour à l'échelle du plan entier.

### Tests de reproduction
- `src/engines/plan/__tests__/planValidator.calendarIndependentHardStimulus.test.ts`
  - F4 — **🔴 rouge** : une semaine à 3 séances 100% Z5/Z6, thème "Chantier
    spécifique" (aucun mot-clé décharge), n'est pas signalée par la Règle #1
    — exemptée uniquement parce que `activeSessions.length <= 3`.
  - F6 — **🔴 rouge** : Sam(S3)+Dim(S3)+Lun(S4)+Mar(S4) = 4 jours durs
    consécutifs sur le calendrier réel, mais chaque semaine prise isolément
    n'en a que 2 — rien n'est détecté.
  - Test de référence (vert) : la même densité à 6 séances est bien
    détectée aujourd'hui — confirme que le mécanisme sous-jacent fonctionne,
    seule l'exemption/le découpage par semaine fait défaut.

### Correctif proposé — refonte unifiée, pas un patch par cas

Construire **une seule timeline chronologique jour par jour sur tout le
plan** (pas de reset aux frontières de semaine), et faire porter la
détection "jours durs consécutifs" + "jours protégés" sur cette timeline :

```ts
// Esquisse — remplace la boucle par-semaine de validateWeeklyHardDayDensity
function buildHardDayTimeline(plan: ParsedPlan): boolean[] {
  // index global = (weekNumber - 1) * 7 + dayIndex, séquence continue.
  // true = jour avec un stimulus modéré/dur (> HARD_DAY_THRESHOLD_MIN),
  // calculé depuis le contenu réel des séances de ce jour — jamais depuis
  // le thème de la semaine ni le nombre de séances.
}

function longestHardStreak(timeline: boolean[]): { length: number; startIdx: number } { /* ... */ }
```

Pour F4 (Règle #1, ratio polarisation) : retirer `activeSessions <= 3` du
calcul d'exemption `isDeload` **utilisé par cette règle spécifiquement**
(`DELOAD_PATTERNS`/`scheduledWeekType === "recovery"` restent les seuls
signaux légitimes — l'un est un contenu explicite, l'autre est le planning
réel calculé à la génération). Une semaine courte mais réellement facile
(peu de séances, toutes Z1-Z2) continuera de passer la Règle #1 normalement,
puisque son `lowPct` sera naturellement élevé — il n'y a pas besoin d'une
exemption de comptage pour ça.

### Conséquences attendues sur les plans générés
- Des semaines courtes (contrainte, sport banni retiré, config atypique)
  mais entièrement composées de séances dures seront désormais signalées —
  cas probablement rare mais réel (confirmé reproductible).
- Des enchaînements de jours durs à cheval sur deux semaines seront
  détectés pour la première fois — impact potentiellement plus large :
  à valider sur un corpus de plans réels avant de décider si le seuil
  `MAX_CONSECUTIVE_HARD_DAYS=3` reste pertinent à l'échelle du plan entier
  ou doit être reconsidéré (il a été calibré en pensant "intra-semaine").

### Régressions potentielles — la plus sensible de ce lot
- **Le test existant `planValidator.weeklyHardDayDensity.test.ts` ligne 76-80**
  (*"n'applique pas ce contrôle à une semaine trop courte... <5 séances
  actives"*) verrouille EXACTEMENT le comportement que F4 remet en question
  pour la Règle #1. Il faudra réexaminer ce test : soit il reste valide tel
  quel pour `validateWeeklyHardDayDensity` (qui, avec la timeline unifiée,
  n'aura plus besoin de ce garde-fou de toute façon, puisque 3 séances ne
  peuvent jamais générer 6 jours durs), soit il doit être ajusté. **Ce test
  doit être relu avec le coach avant toute implémentation**, pour confirmer
  qu'aucun cas réel connu ne dépend du comportement actuel.
- La timeline continue suppose des `weekNumber` contigus et sans trou. Pour
  une régénération partielle (fenêtre, cf. commentaires B1 déjà présents
  dans `planReconciler.ts` sur ce sujet), `chunks`/`plan.weeks` peut ne
  couvrir qu'une fenêtre — le raccord avec les semaines hors fenêtre n'existe
  pas aujourd'hui. Pour une première version, la timeline se limitera aux
  semaines reçues (comme aujourd'hui), ce qui couvre déjà 100% du cas F6
  cité (deux semaines consécutives dans le même appel) sans sur-complexifier.

---

## 3. F12 — validation finale après toutes les mutations (pas un second dédoublonnage)

### Test de reproduction
`src/lib/plan/__tests__/reconcilerTaperReorderInteraction.test.ts` — **🔴 rouge** :
après dédoublonnage (`BUILD_ALT_RUN` placé pour la phase "build") puis
reclassement de la semaine en "taper" par `enforceTaperWeeks`, aucun signal
(compteur ou log) n'existe pour détecter que ce remplaçant n'est valide que
pour une phase qui n'est plus la bonne.

### Correctif proposé

Conformément à la demande explicite ("une validation finale après toutes
les mutations, pas uniquement un second dédoublonnage") : ajouter, en toute
dernière étape de `runReconciler()` (après `enforceAthleteConstraints`,
donc après absolument tout), une passe de **validation pure** (lecture
seule, aucune ré-assignation automatique) qui vérifie les invariants que
les filets intermédiaires ont établis :

```ts
// Esquisse — dernière étape de runReconciler(), après enforceAthleteConstraints
function validateFinalInvariants(chunks: PlanChunk[], counters: ReconcilerCounters, logs: string[]): void {
  for (const chunk of chunks) {
    for (const wk of chunk.weeks ?? []) {
      // 1) Pas de catalogId dupliqué dans la semaine (re-vérifie ce que
      //    dedupeWithinWeek a pu défaire plus loin dans le pipeline).
      // 2) Pas de 2+ séances à jeun dans la semaine (idem pour dedupeFastedWithinWeek).
      // 3) NOUVEAU — chaque session non-custom a une fiche dont `phase[]`
      //    contient (ou dont `when` couvre, via ficheAllowedPhases) la
      //    phase ACTUELLE de la semaine (après tout reclassement, ex.
      //    enforceTaperWeeks). Une incohérence ici est tracée
      //    (`counters.final_phase_mismatch_detected`), jamais corrigée
      //    silencieusement par cette passe — la demande explicite du coach
      //    est "une validation", pas une troisième couche de substitution
      //    automatique qui pourrait elle-même introduire un nouveau doublon.
    }
  }
}
```

Ce choix de conception (**détecter et signaler, ne pas re-corriger
automatiquement à cette étape**) répond directement à l'instruction : une
passe de correction supplémentaire à cet endroit recréerait exactement le
problème structurel (une correction tardive qui peut elle-même être défaite
par une mutation encore plus tardive). Une validation finale, elle, ne peut
plus être défaite par construction — elle tourne en tout dernier.

Si l'on souhaite aller plus loin qu'un simple signalement (corriger
réellement F12), la correction de fond à envisager séparément serait de
réordonner le pipeline : exécuter `enforceTaperWeeks` (et tout ce qui peut
changer `week.phase`) **avant** `dedupeWithinWeek`/`dedupeFastedWithinWeek`,
plutôt qu'après. Cette option est plus invasive (elle touche l'ordre
global établi ce jour en PR #369/#370) — à décider séparément, après avoir
vu l'ampleur réelle du phénomène via `final_phase_mismatch_detected` sur un
corpus de plans réels.

### Conséquences attendues sur les plans générés
- Dans l'immédiat (signalement seul) : aucun changement de plan généré —
  seulement un nouveau signal en log/compteur, consultable par le coach ou
  en tests. Zéro risque de régression fonctionnelle.
- Permet de mesurer la fréquence réelle du phénomène avant de décider s'il
  justifie le réordonnancement plus invasif.

### Régressions potentielles
- Aucune si limité au signalement pur (pas de nouvelle mutation ajoutée).
- `fixEarlyConsolidationSessions` et le trio Start-to-Run (non audités en
  détail dans la passe précédente, cf. §5 du rapport d'audit) seraient
  couverts par la même passe de validation finale — bénéfice correctif
  gratuit si des problèmes similaires s'y cachent, sans travail
  d'investigation supplémentaire pour les découvrir un par un.

---

## 4. F7 — Architecture de propagation de l'incertitude physiologique

### Constat de départ
`computeConfidenceScore()` (`vlamaxV2Engine.ts`) distingue déjà explicitement
5 niveaux de preuve :

| Tier existant | Correspond à | Confiance de base |
|---|---|---|
| `test_labo` | **Mesuré** (lactate sanguin labo) | 0.92 |
| `semaine_reference` | **Estimé** (protocole TFCL dédié) | 0.78 |
| `test_terrain` | **Estimé** (test terrain protocolaire) | 0.75 |
| `estimation` | **Inféré** (dérivé d'autres proxys : VMA, allure, sprint...) | 0.50 |
| `unknown` | **Manquant** | 0.15 |

C'est exactement la distinction mesuré/estimé/inféré/manquant demandée —
elle existe déjà, il ne faut pas la réinventer. Le problème confirmé par
l'audit n'est pas l'absence de cette taxonomie, mais son **arrêt avant la
sélection de séance** : `resolveVlamaxForGoal()` expose un `confidence`
(float 0-1) ET pourrait exposer le tier lui-même, mais aucune des deux
valeurs n'est lue par `workoutCatalogBuilder.ts`/`planReconciler.ts`.

### Pourquoi éviter les seuils arbitraires (comme demandé)
Un seuil numérique (`if (confidence < 0.3) ...`) reproduirait exactement la
même faiblesse méthodologique déjà identifiée ailleurs dans l'audit (ex. le
`+25%/-15%` fixe de `TRAINABILITY_TARGETED_BOOST`, ou le `activeSessions<=3`
de F4) : un point de coupure choisi sans justification statistique, qui crée
une discontinuité brutale (confidence 0.29 vs 0.31 ne devraient pas produire
des décisions qualitativement différentes).

### Proposition : propagation par TIER catégoriel, effet continu sur la largeur de prescription

Plutôt qu'un seuil binaire, l'incertitude doit élargir ou resserrer la
**tolérance de correspondance** utilisée par le scoring de séance — un
effet continu, proportionnel au tier, jamais un "tout ou rien" :

1. **Faire remonter le tier (pas seulement le float)** jusqu'au scoring :
   étendre `VlamaxResolution` (`vlamaxResolver.ts`) pour exposer `sourceTier:
   VLamaxV2Source` en plus de `confidence`, y compris pour la branche
   vélo/tri (combler le gap "undefined aujourd'hui" documenté — même la
   branche vélo peut distinguer mesuré/estimé/manquant si `vlamax_source`
   est renseigné, exactement comme le fait déjà `isLabMeasuredVlamaxRun`
   pour la course).
2. **Scoring de séance (`findReplacement`/`intentScore`, `workoutCatalogBuilder.ts::scoreWorkout`)** :
   quand une décision dépend d'une valeur VLamax à faible tier
   (`estimation`/`unknown`), élargir la fenêtre de durée/zone acceptée pour
   la fiche candidate plutôt que de resserrer sur un point précis — ex. un
   "gap" de tolérance proportionnel à `(1 - confidence)` appliqué à
   `ficheDurationContains`/aux bornes de zone, jamais un rejet binaire de
   candidats. Concrètement : avec `test_labo` (0.92), la correspondance
   reste stricte (comportement actuel inchangé) ; avec `unknown` (0.15), la
   fenêtre de tolérance s'élargit sensiblement — le système choisit une
   fiche plus généraliste/robuste plutôt qu'une fiche hyper-spécifique
   calée sur une valeur qu'on ne connaît pas vraiment.
3. **Traçabilité (vérifiable, pas une boîte noire)** : chaque substitution
   influencée par un tier bas doit logguer `[session_selection_low_confidence]`
   avec le tier et la fiche choisie — condition explicitement demandée
   ("vérifie les effets sur les séances réellement sélectionnées") : sans
   ce log, impossible de prouver que la propagation a un effet réel plutôt
   que théorique.
4. **adaptationPredictor.ts** : afficher la largeur de la bande `[deltaMin,
   deltaMax]` déjà calculée (elle existe déjà !) de façon visuellement
   proportionnelle au tier de la VLamax sous-jacente — pas de nouveau calcul,
   juste arrêter de présenter une bande d'incertitude "physiologique" sans
   jamais mentionner que l'incertitude sur l'INPUT (la VLamax elle-même)
   n'est, aujourd'hui, pas incluse dans cette bande.

### Ce que cette proposition NE fait PAS (délibérément)
- Elle ne bloque jamais une génération de plan — une VLamax `unknown` élargit
  la tolérance, elle ne fait jamais échouer la sélection.
- Elle ne invente pas de nouvelle échelle de confiance — elle réutilise le
  tier déjà calculé par `computeConfidenceScore`.
- Elle ne fixe aucune constante numérique nouvelle sans la dériver d'une
  règle déjà continue (`confidence` lui-même, déjà un float 0-1 calculé).

### Validation proposée
Un test qui construit deux athlètes identiques sauf pour leur tier VLamax
(`test_labo` vs `unknown`) et vérifie que (a) la fiche sélectionnée peut
différer en largeur de tolérance de durée/zone, (b) un log
`[session_selection_low_confidence]` apparaît uniquement pour le second —
preuve directe que l'incertitude atteint la décision, pas seulement l'UI.

---

## 5. F11 — Investigation complémentaire (AUCUN remplacement effectué)

### Ce que l'audit initial avait sous-estimé

En relisant `computeFatMaxAnchorPctFTP` (`fatmaxTFCL.ts:199-227`), un fait
change la nature du problème : cette fonction retourne une valeur en
**%FTP** — une unité de PUISSANCE vélo, obtenue via `computeMLSS()` (modèle
Mader ancré puissance/CP) puis `LT1_TO_MLSS_RATIO`. Elle est appelée
correctement côté vélo (`deriveTrainingZones.ts:359`), où le résultat
alimente `deriveBikePct(fatMaxPctFtp, ...)` — un système de zones déjà en
%FTP. Côté course, `deriveRunPct()` retourne des zones en **% de la VITESSE
SEUIL** — une unité de PACE, pas de puissance.

**Brancher directement `computeFatMaxAnchorPctFTP` dans `deriveRunPct`
serait donc une erreur d'unité**, pas une correction : on injecterait un
nombre en %FTP (ex. 65) dans un slot qui attend un %allure-seuil (ex. 85) —
le mélange produirait des zones course incohérentes, probablement pires que
la formule actuelle.

### Ce qui est confirmé, et ce qui ne l'est pas

| Aspect | Formule vélo (`computeFatMaxAnchorPctFTP`) | Formule course (`deriveRunPct`, ligne 314) |
|---|---|---|
| Domaine de sortie | %FTP (puissance) | % allure seuil (vitesse) |
| Fondement | Chaîné via `computeMLSS` (Mader) + `LT1_TO_MLSS_RATIO` — coefficients documentés ailleurs dans `fatmaxTFCL.ts` | Formule linéaire autonome `86 - 22×(vlamax-0.45)`, aucune citation, aucun lien avec un modèle existant |
| Utilise VO2max | Oui | Non (ignoré) |
| Validation terrain disponible | Indirecte, via `trainabilityCaps.ts`/MLSS bike | Aucune identifiée dans ce fichier |

**Confirmé** : la formule course est non sourcée et ignore le VO2max.
**Non confirmé** (et probablement faux, suite à cette investigation) :
que la solution soit de "copier" la formule vélo.

### Piste candidate identifiée, à évaluer (pas encore recommandée)

Le dépôt possède déjà un modèle RUN-spécifique, dans le bon domaine
(%VO2max, pas %FTP) : `predictRunMLSSPctFromVLaCE` (`runMLSSPredictor.ts`,
"Modèle C", N=14+3, cf. F8). Il prend VLamax run + économie de course en
entrée et sort un %VO2max au seuil — un pas de calcul plus proche du domaine
course que la chaîne vélo. Mais :
- Il nécessite l'économie de course (`runningEconomy`) en entrée, une donnée
  qui n'est pas forcément disponible partout où `deriveRunPct` est appelé
  aujourd'hui (actuellement, seul `vlamax` + `vVo2maxPctThreshold` lui sont
  passés).
- Son propre fondement (N=14) est lui-même limité (cf. F8) — le "mieux
  sourcé" n'est pas encore "bien sourcé".
- Le passage de %VO2max-au-seuil à "%-de-l'allure-seuil-utilisée-par-
  `deriveRunPct`" nécessite une étape de conversion supplémentaire
  (vitesse ≠ %VO2max linéairement) qui n'existe pas encore et doit être
  vérifiée, pas supposée.

### Recommandation à ce stade
Ne pas corriger F11 dans ce lot. Avant de proposer un remplacement :
1. Vérifier auprès du coach si une donnée de validation terrain existe pour
   la position relative FatMax/allure-seuil en course (ex. tests de
   durabilité/dérive déjà loggés dans `runMLSSCohortValidation.ts` ou
   ailleurs) qui permettrait de comparer les deux candidats empiriquement.
2. Si aucune donnée de validation n'existe, documenter au minimum la
   formule actuelle (citer sa dérivation ou admettre qu'elle est une
   approximation experte non sourcée) plutôt que de la remplacer par un
   calcul emprunté à un domaine différent sans preuve que c'est mieux.

---

## 6. F1 / F2 / F3 / F8 / F9 — Second chantier : calibration & validité prédictive

Périmètre proposé pour un chantier séparé (non commencé) :

1. **Tests de non-régression** — verrouiller le comportement ACTUEL de
   `adaptationPredictor.ts`/`runMLSSPredictor.ts` avant toute recalibration,
   pour qu'un futur changement de coefficient soit un choix explicite et non
   une dérive silencieuse (aucun test de ce type n'existe aujourd'hui pour
   les valeurs numériques de `LEVER_EFFECTS`).
2. **Validation interne** — pour chaque levier non cité de `LEVER_EFFECTS`
   (F1), soit retrouver/documenter une source, soit le marquer explicitement
   "estimation experte non publiée" dans le code (traçabilité honnête,
   cf. "Évite les affirmations de validation scientifique sans données et
   méthode vérifiables" déjà demandé). Décider aussi, pour F2, si TTE/
   durabilité/économie doivent recevoir un plafond de plausibilité même
   approximatif (à défaut d'une source comme INSCYD pour vo2max/vlamax/lt2/
   fatmax) plutôt qu'aucune borne.
3. **Validation indépendante** — pour F8/F9 (Modèle C MLSS course) :
   s'appuyer sur l'infrastructure déjà existante et bien conçue
   (`runMLSSCohortValidation.ts`) mais la RELIER à une action (alerte coach
   visible, pas seulement un badge sur une page admin) quand
   `generalizationVerdict === "incoherent"`. Documenter aussi la provenance
   exacte du N=14+3 de calibration (F8) — qui sont ces profils, quel
   protocole — avant de pouvoir juger si l'échantillon est indépendant des
   cohortes utilisées pour calibrer d'autres sous-modèles (VLamax CAP,
   FatMax).

Aucun code n'a été écrit pour ce chantier — seul le périmètre est posé, en
attendant que les P0 ci-dessus soient traités.

---

## Récapitulatif des fichiers touchés dans cette phase 2 (tests uniquement)

- `src/hooks/useDerivedTrainingZones.ts` — extraction pure `resolveRunVlamaxInput` (zéro changement de comportement).
- `src/hooks/__tests__/useDerivedTrainingZones.vlamaxFallback.test.ts` (nouveau, 🔴)
- `src/engines/plan/__tests__/planValidator.calendarIndependentHardStimulus.test.ts` (nouveau, 🔴×2 + référence verte)
- `src/lib/plan/__tests__/reconcilerTaperReorderInteraction.test.ts` (nouveau, 🔴)

Aucun fichier de logique de prescription (`planValidator.ts`, `planReconciler.ts`,
`deriveTrainingZones.ts`, `adaptationPredictor.ts`, `vlamaxResolver.ts`) n'a
été modifié.

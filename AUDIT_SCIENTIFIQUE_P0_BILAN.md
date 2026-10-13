# Bilan — Audit scientifique P0 (phase 3 : implémentation)

**Rien n'a été déployé.** Tout ce qui suit est sur la branche de travail,
non pushé, en attente de ton accord avant toute mise en production.

---

## 1. F10 — fallback VLamax vélo→course supprimé

**Avant** : `resolveRunVlamaxInput()` retournait `snap.vlamax` (vélo) en
repli quand `snap.vlamax_run` était absent.
**Après** : retourne `null`. Plus aucune donnée vélo n'entre dans un calcul
course.

### Vérification du comportement des zones (demandée explicitement)
Nouveau test confirmé vert : `deriveTrainingZones({ sport: "run", vlamax:
null, paceThresholdSecPerKm: 240, vma: 18 })` produit toujours des zones
**dérivées** (pas de repli sur la grille générique tant que l'allure seuil
est connue) — seule l'ancre FatMax retombe sur sa valeur générique interne
(85%) au lieu d'être modulée par une VLamax qui n'est pas la bonne
discipline. Deux athlètes identiques sauf en VLamax vélo obtiennent
désormais des zones course **strictement identiques** (test ajouté).

### Tests
- `src/hooks/__tests__/useDerivedTrainingZones.vlamaxFallback.test.ts` :
  7 tests (3 sur la fonction pure, 3 sur le comportement zones end-to-end,
  1 de non-régression confirmant que la modulation VLamax fonctionne
  toujours quand elle est réellement connue).

### Fichiers touchés
`src/hooks/useDerivedTrainingZones.ts` (1 ligne de logique changée + doc).

---

## 2. F4 + F6 — timeline chronologique continue pour la densité de stimuli durs

### Ce qui a changé
`validateWeeklyHardDayDensity()` (`planValidator.ts`) a été réécrite autour
d'une timeline chronologique (`buildHardDayTimeline`) couvrant tout le plan
reçu, indexée par `weekNumber × 7 + dayIndex` — plus de reset implicite aux
frontières de semaine pour la recherche de séquence.

**Distinction conservée** (demande explicite) :
- **Densité de stimuli difficiles** (jours consécutifs durs) → calcul
  CONTINU sur toute la timeline (corrige F6).
- **Charge globale de récupération d'une semaine** (jours protégés/7,
  ratio Règle #1) → reste un calcul **par semaine** (c'est une vraie unité
  de mesure hebdomadaire, pas un artefact de frontière), mais son
  exemption ne dépend plus jamais du texte du thème ni du nombre de
  séances — seulement de signaux réels (`scheduledWeekType`, texte
  explicite de décharge).

Nouveau champ `WeekMetrics.isContentOrScheduleDeload` ajouté, utilisé
**uniquement** par la Règle #1 (`validatePolarization`) — `isDeload`
(incluant son proxy de comptage `activeSessions<=3`) reste **inchangé**
pour toutes les autres règles qui en dépendaient déjà (Rule 2, Rule 3,
etc.), pour ne rien casser côté calibration existante.

### Vérifications demandées
| Cas | Résultat |
|---|---|
| Semaine courte (≤3 séances), aucun mot-clé décharge, 100% intense | **Désormais signalée** (Règle #1) — avant, exemptée à tort |
| Vraie semaine de décharge (peu de séances, contenu réellement léger) | Toujours exemptée — aucun faux positif (test ajouté) |
| Enchaînement à cheval sur 2 semaines (Sam-Dim-Lun-Mar) | **Désormais détecté** — avant, invisible |
| Plan partiel (régénération fenêtrée) | La timeline se limite aux semaines reçues dans l'appel — comportement identique à l'existant pour ce cas, pas de régression (aucune hypothèse de continuité avec des semaines hors fenêtre) |
| Jours à séances multiples (doubles/triples) | Agrégation par jour déjà correcte (somme des minutes mid+high de TOUTES les séances du jour) — vérifié, inchangé |

### Régression délibérée, documentée et corrigée
Deux tests existants (`planValidator.weeklyHardDayDensity.test.ts`)
faisaient **exactement** ce que F4 identifie comme le risque : faire
confiance au thème ("Décharge") plutôt qu'au contenu réel (6-7 jours Z4
continu). Je les ai remplacés par :
- Un test "vraie décharge" (contenu réellement léger) → toujours exempté.
- Un test "étiquette trompeuse" → **désormais signalé**, avec une note
  expliquant pourquoi l'ancien comportement était le problème, pas une
  protection légitime.

Je n'ai pas supprimé la couverture, je l'ai réalignée sur le comportement
que tu as demandé.

### Tests
- `src/engines/plan/__tests__/planValidator.calendarIndependentHardStimulus.test.ts` (nouveau, 5 tests)
- `src/engines/plan/__tests__/planValidator.weeklyHardDayDensity.test.ts` (2 tests remplacés, 10 tests au total, tous verts)

### Fichiers touchés
`src/engines/plan/planValidator.ts` (nouveau champ `WeekMetrics`, fonction
`validateWeeklyHardDayDensity` réécrite, exemption de `validatePolarization`
corrigée).

---

## 3. F12 — validation finale, visible dans les résultats de validation

### Décision d'architecture (importante, à valider)
Le dépôt a déjà un système de "résultats de validation" structurés et
distincts des logs techniques : `src/lib/plan/qa/checks.ts` (`CheckResult`
typé `{id, label, level, pass, details}`, checks B1 à B12, orchestré par
`runAllChecks`). C'est l'exact équivalent de ce que `planValidator.ts` fait
pour le chemin Markdown — mais côté JSON/réconciliateur.

J'ai donc ajouté **`checkB13`** à ce système, plutôt que d'ajouter des
`counters`/`logs` de plus dans `planReconciler.ts` (qui restent, par
nature, des logs techniques même bien formatés). `checkB13` tourne sur le
`MergedPlan` **final**, construit après que `runReconciler()` a terminé
**toutes** ses passes (dédoublonnage, `enforceTaperWeeks`,
`ensureRaceDaySession`, `enforceAthleteConstraints`, etc.) — exactement la
"validation après toutes les mutations" demandée.

**Lecture seule, confirmé par test dédié** : `checkB13` ne modifie jamais
une séance — il ne fait que lire `MergedPlan` et produire un rapport.

Trois invariants vérifiés :
1. Aucun `catalogId` dupliqué dans une semaine (re-vérifie que rien n'a
   défait `dedupeWithinWeek` après coup).
2. Aucune semaine à 2+ séances "à jeun" (idem pour `dedupeFastedWithinWeek`).
3. **Nouveau** : chaque séance non-custom a une fiche dont les phases
   autorisées couvrent la phase ACTUELLE de sa semaine — détecte
   précisément le cas `enforceTaperWeeks` identifié dans l'audit (un
   remplaçant choisi pour "build" qui se retrouve dans une semaine
   reclassée "taper").

### Limite à ta connaissance (point à trancher)
`runAllChecks`/`checkB13` ne tournent aujourd'hui que dans le harnais QA
(`useQARunner.ts`, profils synthétiques) — **pas automatiquement sur
chaque plan réel généré pour un athlète**. Le réconciliateur, lui, tourne
sur tous les plans réels. Pour que `checkB13` voie aussi les vrais plans
(pas seulement les profils QA), il faudrait appeler `runAllChecks` (ou au
moins `checkB13`) depuis `useAITrainingPlan.ts` après le merge — un
changement d'intégration supplémentaire, pas encore fait, pour rester dans
le périmètre "ajoute la validation, ne modifie rien d'autre". À valider
avec toi si tu veux que je fasse ce branchement maintenant ou plus tard.

### Tests
- `src/lib/plan/qa/__tests__/checkB13.test.ts` (nouveau, 6 tests, dont le
  scénario F12 exact : fiche "build" survivant dans une semaine reclassée
  "taper").
- Ancien test de reproduction (`reconcilerTaperReorderInteraction.test.ts`,
  écrit en phase 2) **supprimé** : il testait un signal dans
  `planReconciler.ts` que je n'ai finalement pas ajouté là (décision
  d'architecture ci-dessus) — son scénario exact est maintenant couvert,
  plus proprement, par `checkB13.test.ts`.

### Fichiers touchés
`src/lib/plan/qa/checkB13.ts` (nouveau), `src/lib/plan/qa/checks.ts`
(enregistrement du check + extension du type `CheckResult.id`).

---

## 4. Validation globale

```
npx tsc --noEmit         → 0 erreur
npx vitest run           → 233 fichiers, 1731 tests, TOUS VERTS
npx eslint <fichiers modifiés + nouveaux>
  → fichiers modifiés (planValidator.ts, useDerivedTrainingZones.ts, checks.ts) :
    mêmes 18 problèmes (11 erreurs, 7 warnings) qu'AVANT mes changements
    (vérifié par git stash/pop) — 0 nouvelle erreur, dette préexistante
    inchangée.
  → fichiers nouveaux (checkB13.ts, et les 3 nouveaux fichiers de test) :
    0 erreur, 0 warning.
```

### Récapitulatif des fichiers
| Fichier | Statut |
|---|---|
| `src/hooks/useDerivedTrainingZones.ts` | modifié (F10) |
| `src/engines/plan/planValidator.ts` | modifié (F4/F6) |
| `src/lib/plan/qa/checks.ts` | modifié (F12 — enregistrement) |
| `src/lib/plan/qa/checkB13.ts` | **nouveau** (F12) |
| `src/hooks/__tests__/useDerivedTrainingZones.vlamaxFallback.test.ts` | nouveau |
| `src/engines/plan/__tests__/planValidator.calendarIndependentHardStimulus.test.ts` | nouveau |
| `src/engines/plan/__tests__/planValidator.weeklyHardDayDensity.test.ts` | modifié (2 tests remplacés) |
| `src/lib/plan/qa/__tests__/checkB13.test.ts` | nouveau |
| `src/lib/plan/__tests__/reconcilerTaperReorderInteraction.test.ts` | **supprimé** (obsolète, remplacé) |

**Aucun déploiement, aucun push, aucune PR — en attente de ton accord.**

---

## 5. F7 — étude (pas d'implémentation) : pondération par fiabilité, pas élargissement de tolérance

Conformément à ta demande, je n'ai PAS implémenté l'élargissement
automatique des tolérances proposé en phase 2. Voici l'étude demandée à sa
place.

### Le vrai problème à résoudre
`resolveVlamaxForGoal()` ne retourne **qu'une seule valeur finale** — déjà
le résultat d'un choix interne (mesure labo > estimateur CAP > valeur
terrain brute). Si une VLamax EST mesurée en labo, elle est déjà utilisée
telle quelle (verrouillée, cf. commentaire "Bug réel corrigé... Cluster 1"
dans `vlamaxResolver.ts`) — le "privilège aux données observées" existe
donc déjà pour CE cas précis. Le vrai trou est différent : quand la
VLamax utilisée est de tier **`estimation`** (inférée depuis VMA/allure/
sprint, confidence ~0.50) MAIS qu'une donnée MESURÉE existe par ailleurs
pour une métrique CORRÉLÉE (ex. un test seuil réel récent, un TTE observé)
qui pourrait AJUSTER cette estimation — ce signal n'est aujourd'hui
jamais réconcilié avec l'estimation VLamax elle-même.

### Piste à étudier (pas encore conçue en détail, à valider avant tout code)
Une pondération BAYÉSIENNE simple entre deux sources quand les deux
existent pour la même fenêtre temporelle :
- VLamax "inférée" courante (tier `estimation`, confidence ~0.50)
- Un signal "observé" corrélé et plus récent (ex. `tte_observed_min`,
  `pace_threshold_sec_per_km` mesuré) qui, via `crossValidateRunMLSS`
  (déjà existant dans `runMLSSPredictor.ts`), révèle un écart significatif
  avec ce que la VLamax actuelle prédirait.

Concrètement : si `crossValidateRunMLSS` renvoie `severity: "critical"`
(écart >10 points), c'est un signal fort que la VLamax actuellement
retenue est probablement fausse dans un sens connu (le signe de l'écart
l'indique déjà, cf. l'explication générée par cette fonction) — ajuster la
VLamax effective d'une fraction de cet écart (pondérée par la confidence
respective des deux sources), plutôt que de la remplacer intégralement
par l'estimation dérivée de l'écart (qui serait elle-même une nouvelle
estimation non mesurée).

### Pourquoi "doit être justifiée et testée" avant tout code
Cette piste introduit une boucle de correction qui n'existe pas
aujourd'hui (la VLamax n'est jamais "recalibrée" par un signal postérieur
à sa résolution) — un vrai changement de comportement, pas une extension
mineure. Avant d'écrire une ligne de code :
1. Vérifier sur des cas réels (pas seulement théoriques) si
   `crossValidateRunMLSS` déclenche effectivement des écarts `critical`
   en pratique, ou si c'est un cas rare qui ne justifie pas la complexité.
2. Définir le test de non-régression AVANT le code : un athlète avec
   VLamax mesurée en labo ne doit JAMAIS être affecté (le privilège aux
   données mesurées doit rester absolu, pas une pondération) — seule la
   VLamax de tier `estimation`/`unknown` serait concernée.
3. Décider avec toi du facteur de pondération (pas un chiffre inventé) —
   candidat le plus défendable : proportionnel aux confidences relatives
   des deux sources (`confidence_observée / (confidence_observée +
   confidence_estimée)`), jamais une constante fixe choisie à l'oeil.

**Je n'ai rien codé pour ce point.** Dis-moi si tu veux que j'aille plus
loin dans la conception avant tout test/code, ou si cette piste ne
correspond pas à ce que tu avais en tête.

---

## 6. F11 — aucune modification (confirmé, comme demandé)

Rien n'a été touché. Le constat de la phase 2 reste : les deux formules
(vélo %FTP, course %allure-seuil) sont dans des domaines d'unités
différents — une validation scientifique spécifique à la course (pas un
simple portage de la formule vélo) reste nécessaire avant tout correctif.

---

## 7. Préparation du TFCLab Performance Validation Lab™ (scoping uniquement, rien développé)

### Ce qui existe déjà et peut servir de socle
Le dépôt a déjà une infrastructure QA synthétique fonctionnelle :
- `src/lib/plan/qa/syntheticProfiles.ts` — 12 profils couvrant les 13
  objectifs exposés en UI × les 5 paliers d'ambition.
- `src/lib/plan/qa/useQARunner.ts` — fait tourner une vraie génération
  pour chaque profil et collecte les résultats.
- `src/lib/plan/qa/checks.ts` + `verdict.ts` — les checks B1-B13
  structurés (dont le nouveau B13 de ce lot) + un verdict agrégé
  🟢/🟠/🔴.

**C'est déjà, concrètement, une ébauche du Lab.** Ce qui manque pour que
ce soit le "TFCLab Performance Validation Lab™" tel que tu le décris :

### Écart principal identifié
Les 12 profils `QA_PROFILES` partagent **tous la même physiologie**
(`commonAthlete` : VLamax 0.55, VO2max 58, etc. — identique partout) ;
seul l'objectif/l'ambition varie. Le Lab a besoin, en plus, d'une
**diversité physiologique réelle** : VLamax basse/haute, VO2max
atypique, données incomplètes (certains champs `null`), tiers de
confiance variés (mesuré/estimé/inféré/manquant — cf. F7), âges
master/jeune, pour pouvoir répondre à la question posée ("vérifier les
conséquences des modifications du moteur sur une batterie de profils de
référence").

### Ce que je propose de préparer ensuite (pas dans ce lot)
1. Étendre `QAProfile` avec une dimension physiologique indépendante de
   l'objectif (ex. matrice profils × physiologies, pas un profil par
   objectif).
2. Un mode "diff" : faire tourner la même batterie de profils AVANT/APRÈS
   un changement de moteur (ex. ce lot F10/F4/F6/F12) et comparer les
   verdicts `checks.ts` plan par plan — aujourd'hui `useQARunner` donne un
   verdict instantané, pas une comparaison avant/après.
3. Décider si le Lab vit comme extension de `useQARunner.ts` (réutilise
   l'existant) ou comme nouvel outil séparé — à ton avis, la première
   option évite de dupliquer une infrastructure qui fonctionne déjà.

Rien de tout cela n'a été développé — seulement posé, comme demandé.

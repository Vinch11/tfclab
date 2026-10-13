# ÉTAPE 1 — Corrections du validateur (rapport avant/après)

**Rien n'est déployé, rien n'a été pushé.** Les 4 anomalies confirmées par
l'audit précédent sont corrigées dans `src/engines/plan/planValidator.ts`,
avec tests de régression. Aucune règle physiologique existante n'a été
supprimée — seulement les 4 points de fragilité textuelle identifiés, plus
un correctif de cohérence du score global (demandé au point 8).

---

## F1 — phase_coherence (taper) confond "%VMA" (référence d'allure) et vraie séance VMA

**Avant** : `PHASE_SESSION_SIGNATURES[5].forbidden` matchait le mot "VMA"
partout, y compris dans le tag `"[Z2 · endurance 65-75% VMA]"` injecté par
`validatePlanPaces` — une séance d'affûtage exemplaire ("35min Z2 facile")
était flaguée `error` (bloque la confirmation de sauvegarde réelle).

**Après** : `stripPaceReferenceDenominators()` retire les formes `N[-N]%
VMA/VO2max/FTP` du texte avant le test `forbidden`. Une vraie séance VMA
(sans cette forme de référence d'allure) reste flaguée normalement.

**Impact mesuré** (test dédié) :
- "EF allégée, [Z2 · 65-75% VMA] 35min facile" en taper → **avant : error ;
  après : aucune issue**.
- "Fractionné VMA, 8x400m à VMA" en taper → **inchangé : error** (contenu
  réel, pas une référence d'allure).

---

## F2 — classification d'intensité : "unknown" explicite au lieu de "low" par défaut

**Avant** : `classifySessionIntensity`/`clauseTier` retombaient sur `"low"`
pour tout texte sans mot-clé reconnu — y compris un contenu réellement dur
mal formulé. Risque : masquer une semaine non polarisée plutôt que de la
signaler.

**Après** : nouvel état `SessionTier = "low"|"mid"|"high"|"unknown"`.
- `classifySessionIntensity` : priorité aux `zones` structurées (si
  présentes), puis mots-clés HIGH/MID/renfo/LOW (explicite, pas un
  défaut), puis `"unknown"`.
- `clauseTier` : une clause avec du contenu descriptif non reconnu devient
  `"unknown"` (zones structurées consultées en priorité comme repli) ;
  une clause réduite à un simple repère de durée nue (ex. "10min WU")
  reste `"low"` — repli physiologiquement fondé, **volontairement
  préservé** (point 1, "ne pas modifier les comportements corrects").
- `WeekMetrics.intensityProfile` : nouveau champ `unknownPct` (% du temps
  TOTAL) ; `lowPct/midPct/highPct` restent des % du temps **classifiable**
  uniquement (pas d'effet sur une semaine déjà 100% classifiée).
- `validatePolarization` : avertissement explicite si `unknownPct > 30%` ;
  semaine exclue du calcul de conformité (ni numérateur ni dénominateur) si
  `unknownPct >= 100%` (sinon un faux "0% low" se lisait comme une
  violation confirmée).

**Impact mesuré** (test dédié) :
- Séance "50 min à l'intensité la plus élevée soutenable, format répété"
  (×3/semaine, aucun mot-clé reconnu) → **avant : aucune issue (silencieux,
  compté low) ; après : avertissement explicite "n'a pas pu être classé",
  toujours aucune fausse erreur de polarisation**.
- Séance avec mot-clé low explicite ("récupération") → **inchangé**.
- Séance sans mot-clé mais avec `zones: ["Z2"]` structuré → **nouveau :
  correctement classée low via les zones**, aucun avertissement.

---

## F3 — prohibition_compliance : négation au niveau clause, vocabulaire élargi

**Avant** : la négation ne reconnaissait que 3 tournures EXACTES
immédiatement adjacentes au mot-clé ("pas de ", "sans ", "aucun(e) ").
"Jamais de sprint" déclenchait une fausse violation sous Sprint Ban.

**Après** : `isProhibitedPrescription()` analyse au niveau de la CLAUSE
entière (découpage `splitIntoClauses`, déjà utilisé par Rule #1), avec un
vocabulaire élargi (`jamais`, `interdi*`, `proscri*`, `évit*`, `exclu*`,
`banni*`, `prohib*`, en plus des 3 tournures d'origine) et une exclusion
explicite du simple rappel du nom de l'interdiction ("Sprint Ban").

**Impact mesuré** (test dédié, 5 cas) :
- "Jamais de sprint cette semaine" → **avant : error ; après : aucune
  issue**.
- "Rappel : Sprint Ban actif cette semaine" → **nouveau cas couvert :
  aucune issue** (rappel du nom, pas une prescription).
- "10x15s sprint all-out" (vraie prescription, sans négation) →
  **inchangé : error**.
- Négation sur une clause ≠ prescription sur une autre clause de la même
  séance → **nouveau cas couvert : la prescription réelle reste
  détectée**, la négation ne "protège" pas toute la séance.
- "Pas de sprint" (tournure déjà couverte) → **inchangé : aucune issue**.

---

## F4 — lorang_categories : zones structurées prioritaires sur le préfixe-lettre du catalogId

**Avant** : `classifyLorang` lisait `LORANG_CATALOG_PREFIX_RX` sur
`title+details` — jamais sur `session.catalogId` (champ structuré déjà
disponible). Un plan réel ne répète jamais l'ID catalogue dans le texte
envoyé à l'athlète → cette étape ne matchait quasiment jamais, et le
"tagged%" retombait à 0% même pour un plan 100% catalogue.

**Découverte en cours de correction** (vérifiée sur `workoutLibrary.ts`,
186 fiches) : la lettre de catalogId (`A_`/`B_`/`C_`/`D_`) encode une
**priorité/nécessité** (Obligatoire/Recommandé/...), **pas** la catégorie
Lorang — 0/50 fiches `cat:"A"` n'ont de zone haute (`A_RUN_Z2_EASY` est
`zones:["Z1","Z2"]`, un Lorang C, pas un Lorang A/HIT). Mapper
catalogId→Lorang par la lettre aurait donc **introduit un nouveau bug**
(masqué jusqu'ici uniquement parce que ce chemin n'était jamais exercé).

**Après** :
1. `tagged%` (traçabilité) : simple présence de `session.catalogId`
   suffit — corrigé, fiable, sans dépendre de la lettre.
2. `classifyLorang` (catégorie A/B/C/D) : priorité à `session.zones`
   (numérique, sans ambiguïté — Z5-Z7→A, Z4→B, Z1-Z2→C), **pas** au
   préfixe-lettre du catalogId. Le préfixe-lettre reste utilisé en
   **dernier recours** (ni zones, ni mot-clé) plutôt que de renvoyer
   "unknown" pur — préserve la couverture déjà testée (8 préfixes réels,
   test pré-existant `planValidator.lorangCatalogPrefixCoverage.test.ts`,
   toujours vert).

**Impact mesuré** (test dédié, 3 cas + le test pré-existant) :
- Plan 10K (catalogId + zones cohérents) → **avant : "0% tagué" (faux
  négatif) + mauvaise distribution A/B/C ; après : 100% tagué, aucune
  fausse distribution**.
- Séance "A_RUN_Z2_EASY" (catalogId lettre "A", zones Z1-Z2 réelles) →
  **test de non-régression ajouté : classée C (zones), jamais A
  (lettre)** — ce cas aurait été MAL classé si on avait simplement fait
  primer le catalogId sur le texte sans vérifier contre le catalogue réel.
- `B_LCW_BIKE_LONG_RACE_SAT` sans zones ni mot-clé → **dernier recours
  préservé : classée B** (comportement du test pré-existant, inchangé).

---

## Point 8 — Cohérence du score global avec des erreurs critiques

**Constat** (Tâche 2 du lot précédent) : le score global est une moyenne
pondérée de 17 sous-scores (`PLAN_VALIDATION_WEIGHTS`, poids **inchangés**
dans ce lot). `phaseCoherence` ne pèse que 8% : même 2 erreurs critiques de
phase ne pouvaient faire bouger le score global que de ≤8 points — un plan
avec 2 erreurs critiques (phase_coherence) notait 92/A, AU-DESSUS d'un plan
sans aucune erreur critique (91/A), par simple effet de bruit favorable sur
d'autres règles sans rapport.

**Correctif appliqué** : plafond de score à **69** (sous le seuil "B") dès
qu'AU MOINS UNE erreur critique ("error") existe, quelle que soit la règle
d'origine. **Aucun poids modifié** ; chaque sous-score individuel reste
inchangé et visible tel quel dans `summary`. Seul le score AGRÉGÉ d'un plan
ayant ≥1 erreur critique est concerné, et seulement s'il dépasserait sinon
ce plafond.

**Impact mesuré** :
- `BAD_PLAN` (2 erreurs critiques phase_coherence) → **avant : 92/A ;
  après : 69/C**.
- `GOOD_PLAN` (0 erreur critique) → **inchangé : 91/A**.
- Test dédié : tout plan avec ≥1 erreur critique ne peut plus atteindre
  les grades A ou B.

---

## Modification de comportement sur les règles CRITIQUES — signalée explicitement

Trois des quatre corrections changent le comportement d'une règle qui
peut **bloquer la confirmation de sauvegarde réelle** (`handleSaveToPlan`,
`criticalIssues[]`) :
- **F1** (phase_coherence, taper) : un plan AUPARAVANT bloqué (faux
  positif %VMA) ne le sera plus. Aucun plan auparavant NON bloqué ne
  devient bloqué par ce correctif (vérifié : la vraie séance VMA reste
  bloquée, le cas ambigu "%VO2max + fractionné" aussi).
- **F3** (prohibition_compliance, Sprint Ban) : un plan AUPARAVANT bloqué
  (faux positif "jamais de sprint") ne le sera plus. Les vraies violations
  restent bloquées (testé explicitement, y compris le cas clause-distincte
  pour écarter un risque de régression inverse : négation masquant une
  vraie prescription ailleurs dans la séance).
- **Point 8** (score global) : un plan avec ≥1 erreur critique note
  désormais toujours ≤69 — aucun plan sans erreur critique n'est affecté
  (vérifié : score de `GOOD_PLAN` inchangé).

F2 et F4 n'affectent PAS directement le blocage de sauvegarde (polarisation
et lorang_categories restent des `warning`, jamais `error`) — impact
uniquement sur la fiabilité des avertissements affichés au coach.

---

## Fichiers modifiés (ce lot)

| Fichier | Nature |
|---|---|
| `src/lib/aiPlanParser.ts` | ajout champ `zones?: string[]` à `ParsedSession` |
| `src/lib/plan/jsonPlanToParsedPlan.ts` | propagation `zones` depuis `MergedSession` |
| `src/engines/plan/planValidator.ts` | F1, F2, F3, F4, point 8 — détail ci-dessus |
| `src/engines/plan/__tests__/planValidator.textHeuristicFalsePositives.test.ts` | réécrit : 6 tests d'origine adaptés au comportement corrigé + 10 nouveaux cas (positifs/négatifs/ambigus), 16 tests au total |

Fichier NON modifié, vérifié toujours vert : `src/engines/plan/__tests__/planValidator.lorangCatalogPrefixCoverage.test.ts` (verrouille le dernier-recours catalogId préservé par F4).

## Validation globale

```
npx tsc --noEmit  → 0 erreur
npx vitest run    → 241 fichiers, 1804 tests, TOUS VERTS (+16 vs avant ce lot)
eslint (planValidator.ts, aiPlanParser.ts, jsonPlanToParsedPlan.ts,
        avant/après git stash) → 11 problèmes avant, 11 après, EXACTEMENT
        les mêmes (lignes décalées par les ajouts) — 0 nouveau
eslint (fichier de test réécrit) → 0 erreur, 0 warning
```

## Ce qui n'a PAS été touché

Aucune règle de prescription/physiologie (F7/F11, moteur métabolique,
catalogue d'entraînement) — hors périmètre de cette demande. Aucun des 17
poids de `PLAN_VALIDATION_WEIGHTS` n'a été modifié. Aucune refonte
générale du moteur de classification textuelle : les corrections sont
ciblées sur les 4 points confirmés + le plafond de score, comme demandé.

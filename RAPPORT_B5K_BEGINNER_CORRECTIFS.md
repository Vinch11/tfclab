# B-5K-BEGINNER — Correctifs ciblés (rapport avant/après)

**Rien n'est fusionné, rien n'a été généré en IA payante.** Ce rapport
documente les 4 correctifs demandés par le coach suite au diagnostic du
plan B-5K-BEGINNER (2026-10-13 : objectif "premier 5 km dans 12 semaines"
généré avec 0 séance de course, 35 vélo, 12 renfo, noté 69/100 sans aucun
signal bloquant). Aucune refonte : chaque correctif cible précisément la
cause démontrée par preuve empirique (scripts d'exécution réelle des
fonctions concernées), sans toucher au reste du moteur.

---

## 1. Parseur de contraintes — faux positifs par simple co-occurrence

**Cause démontrée** : `parseAthleteConstraints` (`src/lib/plan/
constraintRules.ts` + miroir edge `supabase/functions/ai-training-plan/
constraintsBlock.ts`) détectait une interdiction GLOBALE dès qu'une
négation et un mot-clé sportif apparaissaient n'importe où dans le même
fragment de texte libre. Le profil B-5K-BEGINNER contenait "Profil distinct
du template Start-to-Run statique (**jamais** généré par IA en
production)" — "jamais" portait sur "généré par IA", sans aucun rapport
avec le sport, mais `\brun\b` matchait dans "Start-to-Run" (le tiret crée
une frontière de mot). Résultat : `bannedSports: ["run"]` fictif, propagé
tel quel dans `buildAthleteConstraintsBlock()` ("❌ course à pied : 0
séance... Redistribue le volume") — le modèle a fidèlement obéi à une
contrainte jamais saisie par le coach.

**Correctif** : remplacement de la détection par co-occurrence par une
exigence de **proximité grammaticale directe** négation↔sport — soit juste
avant lui (± un connecteur court réel : article/préposition), soit juste
après lui comme adjectif prédicatif (± un verbe de liaison court). Couvre
toutes les formulations réelles ("pas de vélo", "jamais de natation",
"aucune course à pied", "sans renforcement", "vélo interdit", "natation
exclue", "course à pied est interdite") sans plus jamais laisser une
négation sans rapport, ailleurs dans la phrase, "adopter" un mot-clé qui
n'est qu'une sous-chaîne d'un nom de programme/fonctionnalité. Appliqué
uniquement à la branche d'interdiction GLOBALE (sans jour précisé) ; la
branche de ban de JOUR (ancrée par un jour explicite, risque de faux
positif bien plus faible) est **inchangée**.

**Fichiers modifiés** : `src/lib/plan/constraintRules.ts`,
`supabase/functions/ai-training-plan/constraintsBlock.ts` (copie manuelle
synchronisée — le runtime Deno ne peut pas importer depuis `src/`).

**Tests** : `src/lib/plan/__tests__/constraintRules.test.ts` (nouveau — 16
cas : texte réel du bug, noms de programme, descriptions historiques,
mentions sans négation, 4 sports × forme pré/post, bans de jour inchangés,
blessures, combinaisons) + `constraintsBlock.parseAthleteConstraints.test.ts`
(nouveau, Deno, miroir des mêmes cas).

---

## 2. Normalisation de l'objectif — "5 KM" non reconnu

**Cause démontrée** : trois copies indépendantes d'un normaliseur
d'objectif (`src/lib/normalizeObjectiveKey.ts`, `supabase/functions/
ai-training-plan/sportRatioMatrix.ts::normalizeObjKey`, `src/engines/plan/
sessionSizingMatrix.ts::normalizeSizingObjective`) reconnaissaient "10 km"
(avec espace) mais, juste en dessous, ne reconnaissaient "5 km" que sous
la forme substring "5k" ou exacte "5km" — jamais avec l'espace, pourtant la
façon naturelle de le saisir ("5 KM"). Conséquences vérifiées
empiriquement :
- `SPORT_RATIO_TARGETS["5 KM"]` (planValidator.ts) → `undefined` : le
  contrôle de ratio par sport devenait totalement muet.
- `computeWeekQuotaEntry("5 KM", ...)` → `null` : le moteur de quota/layout
  hebdomadaire déterministe côté client ne s'engageait JAMAIS pour cet
  objectif — la cause la plus sévère des trois, car elle désactive le
  garde-fou structurel avant même la génération IA.

**Correctif** : ajout de `|| lower.includes("5 km")` sur la ligne "5k"
des trois fichiers.

**Fichiers modifiés** : `src/lib/normalizeObjectiveKey.ts`,
`supabase/functions/ai-training-plan/sportRatioMatrix.ts`,
`src/engines/plan/sessionSizingMatrix.ts`.

**Mutualisation client/edge** : une vraie fusion de code n'est pas
praticable sans refonte disproportionnée (le fichier edge n'a aucun import
— runtime Deno distinct — une fusion forcerait un bundling supplémentaire
au build ou un `require()` Node incompatible). À la place : un test de
**parité mécanique** (`src/lib/__tests__/normalizeObjectiveKey.
edgeParity.test.ts`, nouveau) exécute les deux fonctions côte à côte sur
une table commune d'objectifs et échoue au premier retour divergent — le
garde-fou qui aurait détecté ce bug avant la mise en prod s'il avait
existé. Deux clés sont *intentionnellement* différentes (Sprint/Olympic
côté client vs TriSprint/TriOlympique côté edge) et sont testées
séparément pour ne jamais masquer une vraie divergence future.

**Tests** : `normalizeObjectiveKey.test.ts` (variantes 5K ajoutées),
`normalizeObjectiveKey.edgeParity.test.ts` (nouveau), `sessionSizingMatrix.
test.ts` (variantes 5K + régression `computeWeekQuotaEntry` ajoutées),
`sportRatioMatrix.normalizeObjKey.test.ts` (nouveau, Deno).

---

## 3. Validation déterministe — incompatibilité objectif/contenu

**Cause démontrée** : `validateSportRatio` (planValidator.ts) reste muet
sur "0 séance tout court" d'un objectif mono-discipline — son garde-fou
`primaryTotal < 10` (données insuffisantes) et ses seuils de déviation de
ratio ne couvrent pas ce cas limite. Aucune autre règle existante ne
reliait objectif↔contenu réel : un plan "5 km" à 0 séance de course pouvait
noter 69/100 sans un seul signal visible.

**Correctif** : nouvelle fonction `validateObjectiveSportCoherence`
(planValidator.ts, "hors score pondéré" — même traitement que
`sportObjective`/`injuryRiskCompliance`, règle `objective_sport_conflict`) :
- Ne s'applique qu'aux objectifs dont `SPORT_RATIO_TARGETS` n'a **qu'une
  seule** discipline (Marathon/Semi/10K/5K/Trail* — non-négociable, pas un
  triathlon où un déséquilibre reste tolérable).
- Déclenche une **erreur bloquante** (severity `"error"`, donc
  `CRITICAL_SCORE_CEILING = 69` s'applique via `allIssues`) si 0 séance
  réelle de cette discipline sur tout le plan, pour un plan non vide.
- Distingue deux cas pour la décision du coach : une contrainte explicite
  bannit vraiment la discipline (`parseAthleteConstraints` le confirme) →
  message d'**incompatibilité objectif/contraintes à trancher par le
  coach**, texte coach cité ; aucune contrainte ne le justifie → message
  d'**anomalie de génération**. Dans les deux cas : jamais de substitution
  silencieuse d'une autre discipline, toujours un signal visible dans
  `allIssues` et dans `overallComment` (nouvelle branche prioritaire,
  juste après les violations de prohibition).

**Fichier modifié** : `src/engines/plan/planValidator.ts`.

**Tests** : `planValidator.objectiveSportConflict.test.ts` (nouveau — 8
cas : erreur bloquante sans contrainte, incompatibilité avec contrainte
réelle, plafonnement du score à 69, absence de signal quand la course est
présente, exemption des objectifs multi-discipline IM/703, exemption d'un
plan entièrement vide, variantes 5K/5km/5 km).

---

## 4. Quotas — fonctionnement existant conservé

Aucune modification, par consigne explicite du coach. `sessionSizingMatrix.
ts::applyBannedSportsRedistribution` (redistribution de quota vers les
disciplines restantes) et la sémantique `sessionsPerWeek` = cardio
uniquement, additive avec `strengthSessionsPerWeek`, restent inchangées.

---

## 5. Polarisation — anomalie S10 documentée, non corrigée

Par consigne explicite du coach : **pas de modification du moteur de
polarisation dans ce correctif.** Documentation pour investigation
séparée :

**Anomalie confirmée (lecture de code, `planValidator.ts`)** :
`extractWeekMetrics`/`validatePolarization` accumulent les minutes par
zone (`estimateSessionZoneMinutes`) sur **toutes** les séances non-repos
de la semaine, sans aucun filtre par sport. Sur une semaine S10
intégralement composée de séances vélo (conséquence du bug §1/§2 — aucune
course dans un plan "5 km"), le % de polarisation calculé agrège donc de
l'intensité vélo sous une étiquette "polarisation" censée qualifier la
charge de l'objectif course — un résultat numériquement valide mais
physiologiquement dénué de sens pour cet objectif précis. Une fois les
correctifs §1/§2/§3 appliqués, ce cas particulier ne devrait plus se
produire silencieusement (le contrôle §3 bloque le plan avant que son
score de polarisation soit pertinent) — mais le mécanisme sous-jacent
(absence de filtre par sport dans l'agrégation de zone-minutes) reste
présent et pourrait réapparaître sur un plan multi-discipline déséquilibré
sans déclencher §3 (ex. triathlon avec une discipline sous-représentée
sans être totalement absente).

**Action proposée pour l'investigation séparée** : évaluer si
`extractWeekMetrics` doit pondérer ou filtrer les zone-minutes par
discipline pertinente à l'objectif avant de les faire remonter dans
`validatePolarization`, et si oui, avec quel impact sur les plans
multi-sport (IM/703/Sprint/Olympic) où la polarisation s'évalue
légitimement sur l'ensemble de la charge. **Non traité ici.**

---

## 6. Résultats des tests

```
bunx tsc --noEmit -p tsconfig.app.json   → OK (0 erreur)
bunx vitest run (suite complète)         → 249 fichiers, 1909 tests, 0 échec
  (inclut les 5 fichiers de ce correctif — 1 nouveau test manquait un
   WeekType valide à la première passe, corrigé avant validation finale —
   et confirme AUCUNE régression sur les 244 fichiers de tests existants)
  - constraintRules.test.ts (nouveau)
  - normalizeObjectiveKey.test.ts (étendu)
  - normalizeObjectiveKey.edgeParity.test.ts (nouveau)
  - sessionSizingMatrix.test.ts (étendu)
  - planValidator.objectiveSportConflict.test.ts (nouveau)
bunx eslint <fichiers touchés>           → 0 erreur, 0 avertissement sur
  tout fichier nouveau/modifié par ce correctif. 7 erreurs lint PRÉ-
  EXISTANTES détectées dans planValidator.ts/sessionSizingMatrix.ts (confirmé
  identiques sur la base non modifiée via `git stash` — hors scope de ce
  correctif ciblé, non introduites par ces changements).
```

Tests Deno (edge function, `sportRatioMatrix.normalizeObjKey.test.ts` +
`constraintsBlock.parseAthleteConstraints.test.ts`, nouveaux) : exécution
locale bloquée par la politique réseau du sandbox (egress vers
`deno.land` refusé, comme constaté précédemment dans cet audit) — chaque
assertion a été vérifiée empiriquement en important directement les
fonctions edge via un script Bun jetable (fichiers edge sans aucun
`import`, donc chargeables hors runtime Deno) ; validation finale
attendue via GitHub Actions CI après push.

---

## Ce qui n'a PAS été fait (hors scope de cette demande)

- Aucune génération IA payante déclenchée.
- Aucune fusion de PR.
- Moteur de polarisation non modifié (§5).
- Redistribution de quotas non modifiée (§4).

# Bilan — Priorités 1 à 4 (Performance Validation Lab V1)

**Rien n'est déployé, rien n'a été pushé, aucun appel IA payant n'a été
lancé.** Tout ce qui suit est sur la branche de travail.

---

## Priorité 1 — Anomalies visibles + tests d'intégration du rendu

### Rendu coach
`sportObjectiveIssues` et `weeklyQuotaIssues` (calculés depuis longtemps,
jamais affichés — seulement loggués en console, confirmé en lisant le code)
sont maintenant attachés à `ParsedPlan` et rendus dans `AIPlanViewer.tsx`,
même pattern que le bandeau `incompletePhaseWeeks` déjà existant.

### Langage corrigé (ta remarque)
Le bandeau B13 disait *"ce plan ne doit PAS être considéré comme validé"*
— un langage de blocage alors que ce bandeau ne bloque RIEN. Reformulé en
*"vérifie ce point avant d'utiliser ce plan (recontrôlé à la sauvegarde)"*
— honnête sur ce qu'il fait réellement.

### Vrai blocage identifié et utilisé (pas inventé)
En cherchant où un blocage RÉEL existe déjà, j'ai trouvé
`handleSaveToPlan` : à la sauvegarde, `validatePlan` + B11 + B12 alimentent
déjà un `criticalIssues[]` qui, si non vide, ouvre un dialogue de
confirmation AVANT la sauvegarde — un vrai blocage fonctionnel. J'y ai
ajouté B13 (critique), à côté de B11/B12, selon le même mécanisme —
cohérent, pas un nouveau système.

### Tests d'intégration du rendu (nouveau)
`src/components/__tests__/AIPlanViewer.finalValidationBanners.test.tsx` —
5 tests avec rendu React réel (`@testing-library/react`), pas seulement les
fonctions pures : bandeau critique, bandeau avertissement, absence de
bandeau si aucune issue, rendu de `sportObjectiveIssues`, rendu de
`weeklyQuotaIssues`. Tous verts.

**Limite assumée** : pas de test bout-en-bout simulant un vrai parcours de
génération SSE (réseau mocké en profondeur, hors périmètre raisonnable pour
ce lot) — seulement le rendu et le calcul, qui sont les deux points
réellement en cause ici.

---

## Priorité 2 — Batterie de 20 scénarios à 5 dimensions indépendantes + 3 ciblés

### Infrastructure réutilisée (pas de système parallèle)
`src/lib/plan/qa/syntheticProfilesV2.ts` étend `QA_PROFILES`
(`syntheticProfiles.ts`) — même type `QAProfile`, mêmes checks B1-B14, même
`useQARunner.ts`. 23 nouveaux profils, 0 nouveau mécanisme.

### Les 5 dimensions, vérifiées indépendantes (pas juste affirmées)
Un test dédié (`syntheticProfilesV2.test.ts`) vérifie mécaniquement que
chaque archétype physiologique apparaît exactement 4×, chaque niveau de
qualité de données 5×, chaque profil de contraintes 5×, sur les 20
scénarios — et qu'aucun archétype n'est figé à un seul niveau d'ambition.
Tableau complet dans le docstring de `syntheticProfilesV2.ts`.

### Scénarios ciblés ajoutés
- **Marathon flagship** (world_class + données complètes) — aucune des 2
  occurrences marathon dans les 20 n'avait cette combinaison.
- **Cyclisme pur** — **finding confirmé en lisant le code** :
  `src/lib/normalizeObjectiveKey.ts` n'a **aucune branche** reconnaissant
  un objectif cyclisme pur (vélo/cyclisme/FTP/Gran Fondo). Ce scénario est
  une sonde délibérée d'un gap réel du moteur, pas un cas normal — à
  confirmer par une vraie génération (Mode B) avant d'agir.
- **Ultra longue distance extrême** (170km, 28 semaines) — stress-test au
  delà du seul TrailUltra des 20 (20 semaines).

### Câblage B4 — un vrai bug trouvé et corrigé en cours de route
`checks.ts::checkB4For` a un switch exhaustif gardé par
`assertNeverProfileId` censé faire échouer la COMPILATION si un profil
n'est pas câblé. **Ce garde-fou ne fonctionne pas sur ce dépôt** —
`tsconfig.app.json` a `"strict": false"`, donc TypeScript ne détecte pas
l'incohérence. Sans l'avoir vérifié par un test d'exécution, mes 23
nouveaux profils seraient passés par le `default` et auraient levé une
exception à l'exécution (silencieusement absorbée par le try/catch de
`useQARunner.ts`, produisant un faux B1 critique masquant les vrais
résultats). Corrigé par une table de correspondance + test d'exécution
dédié (`checkB4For ne lève jamais pour un profil V2`). **Je signale ce
garde-fou cassé, je ne l'ai pas réparé (hors périmètre de cette demande)**.

---

## Priorité 3 — `planValidator.ts` branché sur le harnais QA

`useQARunner.ts` appelle maintenant `validatePlan()` — **la même fonction**
qu'utilise `handleSaveToPlan` à la sauvegarde réelle — sur le `parsed` réel
produit par la génération (pas une structure recalculée séparément pour la
QA). `computeVerdict` compte désormais aussi ses critiques.

### Limite de couverture honnête (pas masquée)
Les profils synthétiques n'ont pas de contexte diagnostic coach
(`prohibitions`, `identifiedLimiters`, `injuryRisk`, `coachLimiterOrder`)
— ces paramètres sont passés `undefined`, **pas simulés**. Les règles de
`validatePlan` qui dépendent spécifiquement de ces champs ne seront jamais
testées par le Lab tel qu'il est aujourd'hui. À signaler si ça devient un
point bloquant pour la suite.

### Compatibilité JSON/Markdown
Le harnais QA force `_outputFormat: "json"` sur chaque génération — le
chemin Markdown legacy n'est **jamais exercé** par le Lab. `validatePlan`
fonctionne sur les deux (il prend un `ParsedPlan`, produit par
`jsonPlanToParsedPlan` dans un cas, par le parseur Markdown dans l'autre)
mais seul le premier est couvert ici. Limite de couverture à connaître, pas
un défaut de l'intégration elle-même.

### Double comptage
Les critiques `validatePlan` (polarisation, pattern charge/décharge,
catalogue, race day...) et les critiques B1-B14 (structure JSON/
réconciliateur) sont des domaines de règles distincts — comptés en PLUS
l'un de l'autre dans `computeVerdict`, jamais une deuxième passe sur la
même chose. Si une vraie redondance apparaît sur un corpus réel, le point
exact où la dédupliquer est documenté dans le code (`verdict.ts`).

---

## Priorité 4A — Mode déterministe (fait, exécuté, résultats ci-dessous)

`src/lib/plan/qa/__tests__/modeA.deterministicFixtures.test.ts` — deux
fixtures de plan "enregistré" (construites à la main, pas une capture
réelle — à remplacer par un vrai export si tu en fournis un) : une propre,
une avec 2 incohérences délibérées (doublon catalogId + fiche phase-
incohérente). 6 tests, tous verts, **aucun appel IA, exécution < 1
seconde**.

### Finding inattendu, révélateur
Même la fixture "propre" déclenche des règles `validatePlan` basées sur une
analyse TEXTUELLE fine (parsing de durée dans "2x15min Z4", wording jugé
non caractéristique d'une phase taper). **Ce n'est pas un défaut** du
travail de ce lot (B13/B14, les deux checks visés, restent verts) — c'est
une limite réelle de Mode A avec des fixtures construites à la main : les
heuristiques texte de `validatePlan` sont calibrées sur la prose RÉELLE de
l'IA, pas sur un texte de test minimal. **Un vrai plan exporté donnerait un
signal plus fiable** — c'est le point de couverture le plus important à
retenir de ce lot.

### Verdict explicite à 3 niveaux (demandé)
`explainRun()` (`verdict.ts`) retourne pour CHAQUE plan : `"conforme"` /
`"nécessite une validation coach"` / `"non conforme"` + la liste précise
des problèmes (check par check, règle par règle). Pas de seuil de
fiabilité global inventé — chaque libellé décrit un ÉTAT CONSTATÉ, pas un
score de confiance.

---

## Priorité 4B — Campagne pilote : ESTIMATION DE COÛT (aucun appel lancé)

### Ce que je peux affirmer avec certitude : le nombre d'appels
Chaque "chunk" de génération = 1 appel réel au modèle configuré
(`google/gemini-3.7-flash`, `supabase/functions/ai-training-plan/
jsonPlanHandler.ts:52`). En comptant `expectedChunks` par scénario (table
complète dans `syntheticProfilesV2.ts`) :

| Lot | 1 répétition | 3 répétitions (pilote demandé) |
|---|---|---|
| 20 scénarios numérotés | 50 appels | 150 appels |
| 3 scénarios ciblés | 12 appels | 36 appels |
| **Total (23 scénarios)** | **62 appels** | **186 appels** |

Ces chiffres n'incluent pas les retries (un chunk qui échoue la validation
Zod en relance un autre — taux de retry réel non mesuré sur ce dépôt à ma
connaissance, donc non inclus ; ajoute une marge, pas quantifiée ici pour
ne pas inventer un chiffre).

### Ce que je NE PEUX PAS affirmer de façon responsable : le coût en €/$
Je n'ai pas de données de tarification fiables et à jour pour
`google/gemini-3.7-flash` sur la passerelle utilisée par ce projet — tout
chiffre que je donnerais serait inventé, exactement ce que tu as demandé
d'éviter ("ne fixe pas de seuil arbitraire"). Deux options pour avancer :
1. Tu me donnes le tarif €/1M tokens (ou €/requête) de la passerelle
   utilisée, et je calcule un coût réel à partir du nombre d'appels
   ci-dessus + une estimation de tokens/requête (que je peux dériver du
   code du prompt, séparément).
2. Tu as déjà un tableau de bord de consommation (Supabase/passerelle LLM)
   — je peux t'indiquer où regarder plutôt que d'estimer à l'aveugle.

**Aucun appel IA n'a été lancé pour ce pilote. J'attends ton accord ET,
idéalement, un ordre de grandeur de coût/requête avant de lancer quoi que
ce soit — même la version 1 répétition (62 appels).**

---

## Récapitulatif des fichiers (ce lot)

| Fichier | Statut |
|---|---|
| `src/lib/aiPlanParser.ts` | modifié (champs sportObjectiveIssues/weeklyQuotaIssues) |
| `src/hooks/useAITrainingPlan.ts` | modifié (attache les 2 champs avant setParsedPlan) |
| `src/components/AIPlanViewer.tsx` | modifié (2 nouveaux bandeaux + wording B13 corrigé) |
| `src/pages/AITrainingPlanPage.tsx` | modifié (B13 dans le blocage réel à la sauvegarde) |
| `src/lib/plan/qa/syntheticProfiles.ts` | modifié (nouvelles dimensions, append V2) |
| `src/lib/plan/qa/syntheticProfilesV2.ts` | nouveau (23 profils) |
| `src/lib/plan/qa/checks.ts` | modifié (câblage B4 pour V2) |
| `src/lib/plan/qa/useQARunner.ts` | modifié (validatePlan branché) |
| `src/lib/plan/qa/verdict.ts` | modifié (validatorResult + `explainRun`) |
| Tests nouveaux/modifiés | `AIPlanViewer.finalValidationBanners`, `syntheticProfilesV2`, `verdict`, `modeA.deterministicFixtures` |

## Validation globale
```
npx tsc --noEmit  → 0 erreur
npx vitest run    → 239 fichiers, 1786 tests, TOUS VERTS
eslint (avant/après git stash, fichiers modifiés) → 0 nouvelle erreur
  (3 erreurs introduites puis corrigées en cours de route — détail ci-dessus)
eslint (fichiers nouveaux) → 0 erreur, 0 warning
```

---

## F7 / F11 — inchangés, comme demandé

Aucune règle de prescription touchée pour ces deux chantiers dans ce lot.

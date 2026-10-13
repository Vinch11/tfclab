# Rapport — Fiabilité du validateur, corpus réel, pilote Mode B

**Rien n'est déployé, rien n'a été pushé, aucun appel IA payant n'a été
lancé.** Tout ce qui suit est sur la branche de travail. Ce rapport répond
aux 3 vérifications prioritaires demandées avant toute campagne complète.

---

## Tâche 1 — Fiabilité du validateur

Audit ciblé (pas de réécriture du moteur) + tests de reproduction. **4 faux
positifs/négatifs confirmés** par des tests qui passent aujourd'hui (donc
qui documentent l'état RÉEL, pas un comportement souhaité) :
`src/engines/plan/__tests__/planValidator.textHeuristicFalsePositives.test.ts`
(6 tests, tous verts).

### Root cause commune

`ParsedSession` (type consommé par `validatePlan`) n'expose pas le champ
structuré `zones: string[]` qui existe pourtant déjà sur `MergedSession`,
peuplé depuis le schéma Zod de génération (`planSchema.ts:148`,
`zones: z.array(z.string()).default([])`) — `jsonPlanToParsedPlan.ts` ne le
propage jamais. Résultat : les règles critiques de `validatePlan` n'ont
aucune donnée fiable à préférer au texte libre, même quand elles le
voudraient. Un second cas (finding #4) montre que même quand le champ
structuré existe déjà sur `ParsedSession` (`catalogId`), certaines règles
l'ignorent quand même et ne lisent que le texte.

### Finding 1 (CRITIQUE) — `phase_coherence` confond "%VMA" (référence
d'allure) avec une séance VMA

`validatePlanPaces` (déjà en prod) injecte des tags du type `"[Z2 ·
endurance 65-75% VMA]"` dans `details` — une référence d'ALLURE.
`PHASE_SESSION_SIGNATURES[5].forbidden` (semaine d'affûtage) contient
`\bvma\b` sans exception pour ce contexte. Une séance d'affûtage
exemplaire ("35min Z2 facile") est donc flaguée `severity: "error"` —
c'est-à-dire qu'elle **alimente `criticalIssues[]` dans `handleSaveToPlan`
et peut réellement bloquer la sauvegarde** d'un plan parfaitement
conforme. Confirmé avec une séance contrôle identique sans le tag → pas
flaguée : c'est bien le mot "VMA", pas le contenu, qui déclenche.

### Finding 2 (angle mort, faux négatif) — `classifySessionIntensity`
classe par défaut en "low"

Rule #1 (polarisation) ne reconnaît une séance "high" que via
`HIGH_INTENSITY_PATTERNS` (liste de mots-clés). Une séance réellement
quasi-maximale décrite sans ces mots-clés (formulation atypique, langue
différente) est silencieusement comptée "low" — **inversion du risque** :
ça masque une semaine non polarisée plutôt que d'en signaler une à tort.
Moins visible qu'un faux positif, mais plus dangereux (rien n'alerte le
coach).

### Finding 3 (CRITIQUE, zone non couverte par le Lab QA) —
`prohibition_compliance` : négation trop étroite

La détection "mentionsSprintFamily" (Sprint Ban) exclut seulement 3
tournures exactes immédiatement adjacentes : `"pas de "`, `"sans "`,
`"aucun(e) "`. "Jamais de sprint cette semaine" déclenche une fausse
violation. **Plus grave que le pattern lui-même** : cette règle dépend du
diagnostic coach (`prohibitions`), paramètre que les profils synthétiques
du Performance Validation Lab passent toujours `undefined` (limite déjà
documentée dans `useQARunner.ts`) — **cette règle n'a donc jamais été
exercée par le Lab avant aujourd'hui**, malgré son statut critique en
production réelle (diagnostic VLamax élevé → Sprint Ban).

### Finding 4 (faux négatif confirmé) — `lorang_categories` ignore
`catalogId` pourtant déjà disponible sur `ParsedSession`

`classifyLorang` et le calcul de `taggedPct` ne lisent que `title`+
`details` via `LORANG_CATALOG_PREFIX_RX` (qui attend l'ID catalogue
littéralement DANS le texte, ex. `"A_RUN_EF_45"` écrit en toutes lettres).
Un plan JSON réel ne répète jamais l'ID catalogue dans le texte envoyé à
l'athlète — c'est un champ interne séparé. Résultat : même un plan dont
**100% des séances ont un `catalogId` structuré renseigné** est compté
"0% tagué", déclenchant un avertissement de traçabilité méthodologique
infondé. Confirmé par test ET par le Mode A réel (Tâche 2 ci-dessous, où
`GOOD_PLAN` — catalogId renseigné sur 12/16 séances — ressort à 0% tagué).

### Ce qui n'a PAS été fait (conformément à la consigne)

Aucune règle de `planValidator.ts` n'a été modifiée. Les 4 findings sont
documentés et reproduits, pas corrigés. Piste de correction minimale pour
discussion (à valider avant implémentation) :
- Finding 1 : exclure de `forbidden` les occurrences de `vma`/`vo2max`
  précédées de `%` ou suivies de `)`/`]` (pattern de référence d'allure),
  ou plus robuste : propager `zones` jusqu'à `ParsedSession` et détecter
  le tag `[Z_ · ...]` structurellement plutôt que par regex sur le texte
  entier.
- Finding 3 : élargir la liste de négations (`jamais`, `interdit`,
  `éviter`, `proscri`...) ou inverser la logique : chercher d'abord un
  marqueur positif de prescription plutôt qu'une négation en amont.
- Finding 4 : ajouter `|| !!session.catalogId?.match(/^([ABCD])_/)` à la
  condition `tagged`/`classifyLorang`, en plus du texte — change minimal,
  n'affecte aucun autre test (vérifié : le préfixe catalogue réel suit
  déjà la convention `[ABCD]_...`).

Aucune de ces corrections n'a été appliquée — elles attendent ton accord.

---

## Tâche 2 — Corpus de vrais plans

### Résultat le plus important : **aucun plan réel n'existe dans le
dépôt**

Recherche exhaustive (tests, fixtures, JSON committés, `__snapshots__`,
historique git, commentaires mentionnant un export réel) : zéro capture
d'une vraie génération IA n'est stockée nulle part dans ce dépôt. Toutes
les fixtures de `validatePlan`/`mergePlanChunks` sont construites à la
main via des helpers (`makeSession`/`makeWeek`/`makePlan`), avec du texte
minimal ("45min Z2", "2x15min seuil") — confirmé explicitement par un
commentaire du code lui-même
(`modeA.deterministicFixtures.test.ts` : *"pas une capture d'un export
réel, faute d'en avoir une sous la main"*).

La seule fixture multi-semaines/multi-phases suffisamment développée pour
être testée de façon utile est `GOOD_PLAN`/`BAD_PLAN` — **4 semaines, un
seul sport (course), un seul objectif (10K)**. Rien d'équivalent n'existe
pour marathon, triathlon, trail ou débutant. Le fichier
`mergeTests.ts` (8 cas) ne couvre que des cas limites de fusion de chunks
(doublons, trous, ordre), pas des plans représentatifs.

**Conséquence directe** : le corpus "plusieurs sports, ambitions et
structures hebdomadaires" demandé ne peut PAS être constitué à partir du
dépôt seul. Les deux seules voies responsables sont : (a) une vraie
génération IA (Tâche 3, soumise à ton accord), ou (b) un export réel que
tu fournirais toi-même. Je ne fabrique pas de nouvelles fixtures pour
masquer ce manque — c'est un résultat d'audit en soi, pas un échec
d'exécution.

### Mode A exécuté sur ce qui existe (`GOOD_PLAN`/`BAD_PLAN`, 0 appel IA)

Nouveau fichier `src/lib/plan/qa/__tests__/task2CorpusModeA.report.test.ts`
(additif, ne modifie aucun fichier existant) — extrait la liste COMPLÈTE
des issues `validatePlan` (le test source ne vérifiait que B13/B14).

**GOOD_PLAN** (propre, visée) — score **91/A**, 11 issues, 0 critique :
- 1 avertissement : phase "build" trop courte (1 sem, minimum 2) — réel,
  pas un artefact du validateur (la fixture a vraiment une phase build
  d'1 semaine).
- 1 info : bloc Fondation sans intensité détectée.
- 1 avertissement `lorang_categories` : "0% tagué" — **Finding 4
  ci-dessus, confirmé en conditions réelles**.
- 1 avertissement `rest_day_coherence` : 4/4 semaines sans jour de repos
  complet — réel (la fixture n'a aucun jour off).
- 8 avertissements `anti_repetition` : séances S2/S3 identiques à la
  semaine précédente — réel (la fixture répète volontairement le même
  gabarit). Note : ce N'est PAS un faux positif — c'est la fixture qui
  est répétitive, le validateur a raison de le signaler.

**BAD_PLAN** (3 incohérences injectées : doublon catalogId + fiche seuil
en semaine reclassée taper) — score **92/A**, 11 issues, **2 critiques**
(`phase_coherence`, S3 ×2).

### Anomalie de notation à signaler

Le score numérique global de `validatePlan` (**92 pour BAD_PLAN vs 91
pour GOOD_PLAN**) n'est PAS monotone avec la gravité injectée — un plan
avec 2 erreurs critiques note légèrement PLUS HAUT qu'un plan sans aucune
erreur critique. Ce n'est pas une anomalie du verdict réellement utilisé
en prod : le blocage réel (`handleSaveToPlan`) et le verdict explicite
(`explainRun`) passent par B13/B14 (checks structurels), qui eux
détectent correctement BAD_PLAN comme "non conforme". Mais **le nombre
`score`/`grade` renvoyé par `validatePlan` lui-même, utilisé comme
indicateur affiché ailleurs, peut donc induire en erreur si lu seul** —
distinction importante entre "conformité technique" (B13/B14/verdict,
fiable ici) et un score global agrégé (pas fiable comme signal unique).

---

## Tâche 3 — Qualification pilote de Mode B (préparation, AUCUNE exécution)

### Configuration fournisseur IA (vérifiée dans le code, pas supposée)

- Gateway : `https://ai.gateway.lovable.dev/v1/chat/completions`
  (OpenAI-compatible), clé `LOVABLE_API_KEY` (crédits workspace Lovable,
  pas une clé Google directe).
- Modèle : `google/gemini-3.7-flash` (`jsonPlanHandler.ts:52`).
- Retries : 1 seul retry Zod par chunk (erreurs injectées dans le
  prompt) ; à l'intérieur de chaque tentative, jusqu'à 2 retries courts
  sur erreurs transitoires (`RATE_LIMIT`, `GATEWAY_ERROR`, `TRUNCATED`),
  délais 1s puis 3s (`generateChunkJSON.ts:758-759`). Pire cas théorique :
  jusqu'à 6 requêtes HTTP pour 1 chunk ; cas normal : 1.
- Limites : aucun plafond de requêtes/quota n'est configuré côté code de
  ce dépôt — seuls les codes 429/402 renvoyés PAR le gateway sont gérés
  réactivement. Toute limite réelle (crédits, rate limit) est côté
  compte Lovable, invisible depuis ce dépôt.

### Les 5 profils du pilote — mappés sur des profils QA existants

| Demande | Profil réutilisé | Semaines | Ambition | Chunks (1 génération) |
|---|---|---|---|---|
| Débutant course | `B-STARTTORUN` | 8 | finisher | 2 |
| 10 km confirmé | `B-10K` | 10 | competitor | 3 |
| Marathon ambitieux | `B-MARATHON` | 16 | world_class | 4 |
| Triathlon longue distance | `B-IM` (Ironman) | 16 | elite | 4 |
| Trail | `B-TRAIL-MOUNTAIN`* | 14 | elite | 3 |

*Trail : la demande ne précise pas le niveau — j'ai choisi Trail Montagne
(60km, elite) comme profil médian entre Trail Court et Trail Ultra déjà
définis. À confirmer ou changer avant exécution.

**Total pour 1 génération par profil (le pilote demandé, pas ×3)** :
**16 appels réels au modèle** — calcul dérivé directement de
`computeChunkSizing`/`computeTotalChunks` (`useAITrainingPlan.ts:49-63`),
pas une estimation. Marathon et Triathlon (4 chunks chacun) dépassent
`MAX_CHUNKS_PER_WINDOW=3` : côté client, leur génération se fait en 2
requêtes séquentielles ("fenêtres"), mais le nombre d'appels modèle réels
reste 4 chacun — la fenêtre ne change que le découpage côté client, pas
le coût.

### Coût en €/$ — toujours non déterminable depuis ce dépôt

Aucune information de tarification Lovable/Gemini n'est présente dans le
code ou la documentation du dépôt. Comme pour le lot précédent, deux
options pour avancer sans inventer de chiffre : tu me donnes un tarif
€/requête ou €/1M tokens, ou tu me pointes vers le tableau de bord de
consommation Lovable.

**Aucun appel IA n'a été lancé. J'attends ton accord explicite — et si
possible un ordre de grandeur de coût — avant de lancer même 1 des 5
générations.**

---

## Rapport final consolidé

- **Plans examinés** : 2 (les seules fixtures de plan complet disponibles
  dans le dépôt, `GOOD_PLAN`/`BAD_PLAN`, 10K/course uniquement, Mode A,
  0 appel IA). **Aucun plan réel** n'a pu être examiné — c'est le
  résultat central de la Tâche 2. Le pilote de 5 générations réelles
  (Tâche 3) est préparé mais pas exécuté, en attente de ton accord.
- **Erreurs critiques et avertissements** : GOOD_PLAN → 0 critique,
  3 avertissements de fond (phase build courte, 0% tracé Lorang —
  faux négatif Finding 4, pas de jour de repos). BAD_PLAN → 2 critiques
  (`phase_coherence`, injectées délibérément), détectées correctement.
- **Faux positifs/négatifs identifiés** : 4 (détail Tâche 1) — 2 faux
  positifs critiques (`phase_coherence`/VMA-taper, `prohibition_compliance`
  /négation étroite), 2 faux négatifs (polarisation par défaut "low",
  `lorang_categories` ignore `catalogId`).
- **Progression/récupération/périodisation/spécificité** : sur le seul
  corpus disponible (10K, 4 semaines), le validateur détecte correctement
  une phase build trop courte et une absence de jour de repos — ce sont
  de vrais défauts de la fixture, pas des artefacts. Aucune donnée
  disponible pour juger progression/récupération/périodisation sur
  marathon, triathlon, trail ou profil débutant — nécessite le pilote
  Tâche 3.
- **Conformité technique vs qualité sportive** : le verdict explicite
  (B13/B14 + `explainRun`) distingue bien les deux et reste fiable. Le
  score numérique global de `validatePlan` (`score`/`grade`), lui, n'est
  PAS un indicateur fiable pris seul — BAD_PLAN (2 critiques) note plus
  haut que GOOD_PLAN (0 critique). Ne pas afficher ce score comme seul
  signal de qualité sans le replacer à côté du verdict B13/B14.
- **Décision de qualification par sport et niveau** :
  - **10K / competitor (proxy via GOOD_PLAN)** : qualification
    **conditionnelle** — structure validée (B13/B14 verts), mais sur une
    fixture artificielle, pas une vraie génération IA. À confirmer par le
    pilote Tâche 3.
  - **Marathon, Triathlon longue distance, Trail, Débutant course** :
    **aucune qualification possible à ce stade** — zéro plan réel ou
    même fixture représentative examiné. C'est une conclusion honnête,
    pas une lacune de ce lot de travail : le dépôt ne contient
    simplement rien à examiner pour ces catégories avant une vraie
    génération.

---

## Récapitulatif des fichiers (ce lot)

| Fichier | Statut |
|---|---|
| `src/engines/plan/__tests__/planValidator.textHeuristicFalsePositives.test.ts` | nouveau (6 tests, 4 findings) |
| `src/lib/plan/qa/__tests__/task2CorpusModeA.report.test.ts` | nouveau (rapport Mode A, additif, ne modifie aucune fixture existante) |
| Aucun fichier de `planValidator.ts` ou autre moteur modifié | — |

## Validation globale

```
npx tsc --noEmit  → 0 erreur
npx vitest run    → 241 fichiers, 1794 tests, TOUS VERTS
eslint (fichiers nouveaux) → 0 erreur, 0 warning
```

---

## Décisions nécessaires de ta part avant de continuer

1. Les 4 pistes de correction minimale (Tâche 1) : les implémenter
   maintenant, ou attendre une vraie génération (Tâche 3) pour les
   recalibrer sur de la prose réelle avant de coder ?
2. Le profil Trail du pilote (Tâche 3) : Trail Montagne (proposé) ou un
   autre niveau (court/ultra) ?
3. Lancer le pilote de 5 générations réelles (16 appels, modèle
   `google/gemini-3.7-flash` via Lovable AI Gateway) — accord explicite
   requis, aucun appel n'a été fait.
4. Un ordre de grandeur de coût €/requête (ou l'accès au tableau de bord
   Lovable), pour chiffrer le pilote avant de le lancer.

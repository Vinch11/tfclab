# ÉTAPE 2 — Préparation du pilote (5 profils)

**Aucun appel IA payant n'a été lancé.** Ce document prépare le pilote
demandé : protocole d'évaluation, correctif de confiance Lorang,
dispositif de mesure de consommation, format d'archivage. Rien n'est
exécuté sans ton accord explicite.

---

## 0. Correctif appliqué avant toute chose : confiance Lorang de secours

Tu as demandé de vérifier que le mécanisme de secours (préfixe-lettre du
catalogId quand zones et mots-clés sont absents) ne soit pas présenté
comme certain. C'est fait :

- `classifyLorang` renvoie maintenant `{ category, uncertain }` — `uncertain:
  true` uniquement pour les séances classées via ce dernier recours.
- `LorangCategoryDistribution` expose `uncertainTagging`/`uncertainTaggingPct`.
- `validateLorangCategories` émet un avertissement dédié dès qu'au moins une
  séance est concernée : *"N séance(s) (X%) classée(s) A/B/C/D uniquement
  via le préfixe-lettre du catalogId (zones et mots-clés absents) —
  catégorie NON certaine, vérification manuelle recommandée"*.
- 2 tests de régression ajoutés (18 tests au total dans le fichier
  d'audit, tous verts) : confirme que ce signal se déclenche bien quand le
  dernier recours est seul disponible, et jamais quand zones/mots-clés
  suffisent.

Validation : `npx tsc --noEmit` → 0 erreur ; `npx vitest run` → 241
fichiers / 1805 tests verts ; eslint → 0 nouvelle erreur (6 problèmes
pré-existants inchangés, vérifiés par git stash).

---

## 1. Protocole d'évaluation physiologique — exigeant, par profil

### Principe directeur

Un plan peut être **techniquement irréprochable** (0 erreur Zod, 0 erreur
critique `validatePlan`) et **physiologiquement médiocre** (progression
dangereuse, spécificité absente, affûtage mal conçu). Ce protocole évalue
les deux dimensions **séparément et explicitement** — jamais l'une comme
proxy de l'autre. La relecture humaine (moi, une fois les plans générés)
est **obligatoire** sur la dimension B : aucun des checks ci-dessous n'est
automatisable avec confiance totale, y compris après les corrections de
l'Étape 1.

### Dimension A — Fiabilité technique (rapide à vérifier, automatisable)

| # | Critère | Source |
|---|---|---|
| A1 | 0 échec Zod définitif, pas de fallback Markdown silencieux | `PlanGenerationStat` |
| A2 | B13 : 0 catalogId dupliqué/semaine, plafond séances à jeun respecté | `checks.ts` |
| A3 | B14 : cohérence phase/fiche catalogue | `checks.ts` |
| A4 | `validatePlan()` : 0 erreur critique (score ≤69 sinon, cf. Étape 1 point 8) | `planValidator.ts` |
| A5 | Zones/allures individualisées : les %FTP/%VMA affichés correspondent aux données réelles du profil (FTP/VMA/allure seuil fournies), pas des valeurs génériques | lecture manuelle croisée avec `athleteData` du profil |
| A6 | Respect des interdictions coach | **non évaluable sur ce pilote** — profils synthétiques sans diagnostic coach (`prohibitions` undefined), limite déjà documentée dans `useQARunner.ts`. À signaler, pas à ignorer. |
| A7 | Traçabilité catalogue : `taggedPct`, et désormais `uncertainTaggingPct` (doit être bas — sinon la distribution Lorang affichée au coach est peu fiable) | `lorangCategories` |
| A8 | Jour J présent et bien placé (dernière semaine si objectif daté) | `validateRaceDayPresence` |
| A9 | Quotas hebdo du profil respectés (sessionsPerWeek/maxSessionsPerDay) | `validateSessionDensity` |

### Dimension B — Qualité d'entraînement (exigeante, relecture humaine)

**B1 — Progression de charge**
- Charge hebdo (volume) : pas de hausse > ~10%/semaine hors reprise
  post-décharge (repère classique, pas une loi absolue — à documenter
  comme tel si invoqué).
- Décharges à une cadence cohérente avec l'âge/l'ambition — et surtout
  **réellement appliquées** dans le contenu, pas seulement nommées dans le
  thème de semaine.
- Progression du bloc clé hebdomadaire (ex. seuil 2x15min base → 3x15min
  chantier → 2x20min pic) cohérente avec la phase — pas un plateau
  artificiel, pas un bond incohérent.

**B2 — Répartition réelle des intensités**
- Relecture MANUELLE de chaque semaine (pas seulement le signal
  `validatePlan`, qui peut encore avoir des angles morts malgré l'Étape 1)
  pour confirmer que le volume dur est réellement concentré, pas dilué
  dans une formulation ambiguë qui échapperait à la classification.
- Présence de vraies semaines de récupération (volume ET intensité
  réduits, pas seulement moins de séances).

**B3 — Gestion de la fatigue et récupération**
- Espacement réel des jours qualité (relecture manuelle en complément de
  `validateWeeklyHardDayDensity` — le validateur peut sous-estimer la
  difficulté réelle d'une séance).
- ≥1 jour de repos complet/semaine, sauf doctrine haute-densité
  explicitement justifiée (triathlon/Ironman haut volume) — dans ce cas,
  vérifier qu'un jour de récupération PASSIVE existe quand même.
- Fatigue cumulative sur tout le cycle : la semaine de pic de charge
  doit-elle être suivie d'une vraie décharge avant l'affûtage ?

**B4 — Pertinence des stimuli physiologiques**
- Alignement avec le format de course (ex. marathon → allure spécifique +
  endurance glycogène/lipides ; 10K → VO2max/seuil proportionnellement
  plus présents ; Ironman → endurance extrême + nutrition ; trail
  montagne → D+ et descente technique).
- Allures/puissances dérivées des données individuelles du profil, pas de
  valeurs génériques (cf. A5, vérifié ici sous l'angle physiologique
  plutôt que technique).

**B5 — Cohérence avec les limiteurs individuels**
- **Non évaluable sur ce pilote** (même limite qu'A6) — à signaler
  explicitement dans chaque rapport de profil, pas à ignorer.

**B6 — Spécificité de l'objectif**
- Reverse Periodization Lorang : la spécificité course doit être
  concentrée PRÈS de la course, pas diluée sur tout le plan — vérifier
  manuellement que les dernières semaines concentrent effectivement plus
  de travail spécifique (allure course, simulation, gut training) que les
  premières.

**B7 — Progression des séances clés**
- Suivre semaine par semaine la séance clé type (ex. sortie longue) : sa
  durée/distance doit progresser de façon cohérente vers l'objectif.

**B8 — Qualité de l'affûtage**
- Réduction de volume significative (≥30-50%, repère littérature) **avec**
  maintien d'une touche d'intensité courte (pas une semaine 100% molle qui
  désentraîne).
- Jour J complet et bien placé (recoupe A8, sous l'angle qualité ici :
  cohérence avec le reste de l'affûtage).

**B9 — Faisabilité pour le profil ciblé**
- Volume hebdo réaliste compte tenu du temps déclaré (`weeklyHours`).
- Débutant (Start to Run) : progression EXTRA prudente, cohérente avec la
  doctrine "0 séance clé" déjà codée pour ce niveau — toute dérive est une
  **décision d'entraînement dangereuse**, pas une simple imperfection.

### Grille dédiée — mauvaises décisions d'entraînement (demande explicite)

Distincte des erreurs techniques. À chercher activement dans chaque plan :
- Séances clés consécutives sans récupération suffisante (ex. seuil mardi,
  VO2max mercredi).
- Affûtage qui supprime TOUTE intensité (désentraînement) ou qui ne réduit
  pas assez le volume (fatigue résiduelle le Jour J).
- Spécificité de course absente ou mal placée.
- Progression de volume trop agressive sur un profil débutant/finisher.
- Intensité maximale prescrite en pleine semaine de décharge.
- Triathlon/Ironman : déséquilibre disciplinaire manifeste non justifié
  par le profil.
- Trail : D+ absent ou insuffisant compte tenu de l'objectif.
- Variation de façade sans vraie variation pédagogique (ex. "2x15min Z4"
  → "2x16min Z4" d'une semaine à l'autre, formellement différent pour
  `anti_repetition` mais sans progression réelle).

### Décision de qualification (par profil)

- **Qualifié** : dimension A sans erreur critique ET aucune mauvaise
  décision d'entraînement identifiée en B (avertissements mineurs
  documentés tolérés).
- **Qualifié avec réserve** : dimension A ok, mais ≥1 décision de coaching
  discutable en B nécessitant un ajustement avant usage réel.
- **Non qualifié** : ≥1 erreur critique en A OU ≥1 mauvaise décision
  d'entraînement objectivement dangereuse en B.

### Format du rapport par profil (gabarit prêt à remplir)

1. Résumé exécutif + décision de qualification
2. Dimension A (tableau pass/fail + détail)
3. Dimension B (détail par point B1-B9, références précises semaine/séance)
4. Forces principales
5. Anomalies détectées (gravité + référence précise)
6. Décisions de coaching discutables
7. Conformité technique vs qualité sportive — écart constaté, explicite

---

## 2. Dispositif de mesure de consommation Lovable + plafond

### Instrumentation ajoutée (code, additive, sans impact sur la génération)

`supabase/functions/ai-training-plan/generateChunkJSON.ts` capture
désormais `data.usage` (format OpenAI-compatible standard :
`prompt_tokens`/`completion_tokens`/`total_tokens`) à chaque appel réel au
gateway, et le logue (`console.info`) — visible dans les logs Supabase
Edge Function pendant l'exécution réelle du pilote. Champ optionnel, rien
n'est inventé si le gateway ne le renvoie pas.

**Limite de validation à signaler honnêtement** : je n'ai pas pu exécuter
`deno test` sur ce fichier dans cet environnement (accès réseau à
`deno.land` refusé par la politique du proxy — confirmé via le statut du
proxy, erreur 403 systématique, pas une erreur transitoire). Le
changement est minimal, additif, isolé (un seul fichier, un champ
optionnel) et relu manuellement avec soin, mais n'a pas été validé par la
suite de tests CI dédiée (`deno test -A`). À revalider en CI normale avant
fusion si tu veux une garantie supplémentaire.

### Nombre d'appels — exact, pas une estimation

Recalculé depuis `computeChunkSizing`/`computeTotalChunks`
(`useAITrainingPlan.ts:49-63`, formule déjà vérifiée au lot précédent) :

| Profil | Semaines | Chunks (1 génération) |
|---|---|---|
| Débutant course (Start to Run) | 8 | 2 |
| 10 km confirmé | 10 | 3 |
| Marathon ambitieux | 16 | 4 |
| Ironman élite | 16 | 4 |
| Trail Montagne élite 60km | 14 | 3 |
| **Total** | — | **16 appels réels** |

Retries (hors ce total, non quantifiables à l'avance) : jusqu'à 1 retry
Zod par chunk + jusqu'à 2 retries transitoires par tentative — pire cas
théorique ×6, cas normal ×1.

### Plafond de consommation — dispositif PROCESS, pas un seuil $ codé en dur

Je n'ai aucun moyen fiable de coder un plafond en **euros** dans ce
pilote : aucune donnée de tarification n'est présente dans le dépôt, et
construire un plafond arbitraire en tokens sans base de coût réelle
inventerait un chiffre — exactement ce qu'il ne faut pas faire. Le
plafond que je propose est **opérationnel** :

1. Exécution **profil par profil**, jamais en lot.
2. Ordre proposé (du moins coûteux au plus coûteux, pour détecter tôt un
   problème avant d'engager le plus gros) : Débutant (2) → 10K (3) → Trail
   Montagne (3) → Marathon (4) → Ironman (4).
3. Après **chaque** profil : je rapporte la consommation réellement
   mesurée (nombre d'appels effectifs, retries survenus, tokens si le
   gateway les a renvoyés) et j'attends ton accord explicite avant de
   lancer le profil suivant.
4. Si un problème survient (erreur, retry en boucle, coût visiblement
   anormal), j'arrête immédiatement et je rapporte avant de continuer.

### Point bloquant à lever avant toute exécution

Je n'ai **aucune clé `LOVABLE_API_KEY` ni accès Supabase configurés dans
cet environnement** (vérifié, aucune variable d'environnement présente) —
je ne peux donc pas déclencher moi-même un vrai appel au gateway depuis ce
bac à sable, même avec ton accord. Deux options, à ta décision :
- Tu lances les 5 générations toi-même depuis l'app déployée (Lovable),
  avec le harnais QA existant (`useQARunner`, filtré sur les 5 profils
  correspondants) ou directement depuis l'interface coach, et tu me
  transmets les plans générés (JSON) + les logs de consommation — j'en
  fais l'analyse complète (dimensions A et B, qualification).
- Tu me donnes un accès (clé/environnement) pour que je les lance
  moi-même depuis une session avec accès réseau au gateway — seulement si
  c'est ton choix explicite, avec le plafond ci-dessus respecté.

Soit un ordre de grandeur de coût €/requête ou €/1M tokens (ou l'accès à
ton tableau de bord Lovable) reste nécessaire pour chiffrer le pilote
avant de le lancer, quelle que soit l'option choisie.

---

## 3. Archivage anonymisé et reproductible — corpus de référence TFCLab

### Ce qui est archivé (par run)

Un fichier JSON par génération, ex.
`docs/qa-corpus/mode-b-pilot/2026-10-XX_B-STARTTORUN_run1.json` :

```json
{
  "meta": {
    "profileId": "B-STARTTORUN",
    "timestamp": "2026-10-XXThh:mm:ssZ",
    "model": "google/gemini-3.7-flash",
    "totalWeeks": 8,
    "totalChunks": 2,
    "validatorCommit": "<sha court du commit planValidator.ts utilisé>",
    "retries": 0,
    "usage": { "promptTokens": null, "completionTokens": null, "totalTokens": null }
  },
  "input": { "athleteData": "...", "planConfig": "..." },
  "output": { "mergedPlan": "... (MergedPlan complet) ..." },
  "validation": {
    "validatePlanResult": "... (score, grade, issues, lorangCategories avec uncertainTagging) ...",
    "checksB1toB14": "..."
  }
}
```

### Anonymisation

Les 5 profils du pilote sont des profils **synthétiques** déjà existants
dans `syntheticProfiles.ts` (athlète fictif, aucune donnée personnelle
réelle) — aucune anonymisation supplémentaire n'est nécessaire pour CE
pilote précis. Règle générale posée pour une réutilisation future de ce
corpus avec de vraies données coach : ne JAMAIS archiver `coach_id`/
`user_id`/email/nom réel — uniquement le contenu du plan et les
diagnostics structurés.

### Aucun secret archivé

Ni clé API, ni en-têtes HTTP bruts, ni jeton d'authentification — le
fichier d'archive ne contient que le plan généré et les diagnostics déjà
publics dans ce rapport (scores, issues, usage agrégé).

### Reproductibilité

Chaque fichier porte le commit court de `planValidator.ts` utilisé au
moment du run (pour savoir exactement quelle version des règles a produit
ce verdict) et les `athleteData`/`planConfig` exacts en entrée — un run
peut être repris à l'identique (modulo la non-déterminisme propre au LLM
lui-même, inévitable).

### Décision à prendre

Je propose de committer ces fichiers dans le dépôt (`docs/qa-corpus/...`,
JSON texte, pas de binaire, taille raisonnable) puisque l'objectif est
explicitement de constituer "le premier corpus de référence TFCLab" — donc
un artefact persistant du projet. Dis-moi si tu préfères un autre
emplacement (hors dépôt, stockage séparé) avant que je crée le dossier.

---

## Récapitulatif — ce qui est prêt, ce qui attend ton accord

| Élément | Statut |
|---|---|
| Correctif confiance Lorang de secours | **Fait**, testé, validé |
| Protocole d'évaluation A/B exigeant | **Prêt** (ce document) |
| Instrumentation mesure de consommation | **Fait** (code additif, non testé par `deno test` — réseau bloqué) |
| Plafond de consommation | **Process défini** — profil par profil, accord à chaque étape |
| Format d'archivage | **Conçu**, en attente de ton choix d'emplacement |
| Exécution des 5 générations | **En attente** : accord explicite + décision sur qui/où exécute (cf. point bloquant ci-dessus) + tarif ou accès tableau de bord |

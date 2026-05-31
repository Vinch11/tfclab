# Refonte des paliers d'ambition (5 niveaux — Option A)

## Objectif

Remplacer les 4 paliers actuels (`finisher` / `age_group` / `competitor` / `elite`) par 5 paliers ancrés sur des **percentiles AG réels**, afin d'éviter le cas Quentin (classé "competitor" mais visant un slot Mondial qui correspond en réalité au top 3%).

## Nouvelle grille

| Clé technique | Label | Icône | Percentile AG cible |
|---|---|---|---|
| `discovery` | Découverte | 🌱 | Finisher dans les temps officiels |
| `confirmed` | Confirmé | 🎯 | Top 50% AG |
| `competitor` | Compétiteur | 🏆 | Top 25% AG |
| `qualifiable` | Qualifiable | 🎟️ | Top 10% AG — slot National/Européen accessible |
| `elite` | Elite | 👑 | Top 3% AG — slot Mondial / podium overall |

## Stratégie de migration des athlètes existants

Auto-remap silencieux par mapping déterministe (pas de re-sélection forcée) :

```
finisher    → discovery
age_group   → confirmed
competitor  → competitor   (inchangé — clé conservée)
elite       → qualifiable  (plus juste : "elite" actuel ≈ slot National, pas Mondial)
```

Le palier `elite` réel (top 3%) reste vide par défaut — sélection manuelle requise pour les rares athlètes concernés. Justification : l'ancien `elite` était sur-utilisé et trompeur (cas Quentin).

## Périmètre v1

Déploiement sur **tous les objectifs running + triathlon** simultanément (IM, 70.3, Marathon, Semi, 10K, 5K, Trail, TrailShort, TrailMountain). Pas de feature flag — refactor complet d'un coup pour éviter incohérences entre composants.

## Changements techniques

### 1. Source unique — `src/types/ambitionLevel.ts`
- `AmbitionLevel` : nouveau union type (5 clés)
- `AMBITION_DEFINITIONS` : 5 entrées avec icônes/couleurs/descriptions
- `AMBITION_LEVELS_ORDERED` : ordre `[discovery, confirmed, competitor, qualifiable, elite]`
- `DEFAULT_AMBITION` : `confirmed` (au lieu de `age_group`)
- `AMBITION_ALIASES` : ajout des anciennes clés pour rétrocompatibilité auto-remap (`finisher → discovery`, `age_group → confirmed`, `elite → qualifiable`)
- `RUNNING_TIME_HINTS` : recalibrer les 5 lignes par objectif (utiliser les chronos issus de la grille Quentin/Mondial 70.3 et benchmarks marathon/semi/10K/5K France 2024)

### 2. Seuils physiologiques — `src/lib/physiologicalTargets.ts`
- `getTargetsForAmbition` : ajouter les valeurs FTP/kg, VMA, TTE, VO2max pour les 5 paliers par objectif
- `getVLamaxRange` : idem (5 plages par objectif)
- Calibrer `qualifiable` ≈ ancien `elite`, et `elite` ≈ +1 cran (top 3%)

### 3. UI sélecteurs (rétrocompatibles automatiquement via `AMBITION_DEFINITIONS`)
- `src/components/QuickAmbitionSelector.tsx` — aucune modif (boucle sur `AMBITION_LEVELS_ORDERED`)
- Onboarding ambition screens (si présents) — vérifier la grille

### 4. Seuils Potentiel Physiologique — `src/lib/ambitionThresholds.ts`
- `evaluateReadiness` : étendre `potentielThresholds` aux 5 clés
  - `discovery: { ok: 55, warning: 35 }`
  - `confirmed: { ok: 70, warning: 50 }`
  - `competitor: { ok: 80, warning: 62 }`
  - `qualifiable: { ok: 86, warning: 70 }`
  - `elite: { ok: 92, warning: 78 }`

### 5. Moteurs en aval (vérification + extension)
- `src/lib/v2/unifiedLimiterDetection.ts` — `getVo2maxTarget(objectif, ambition, age)` : étendre à 5 paliers
- `src/lib/coachingCompass/` — vérifier scoring
- `supabase/functions/ai-training-plan/vlamaxTargets.ts` — étendre matrice cibles VLamax
- `src/lib/eliteReferences.ts` — vérifier mapping

### 6. Persistence DB
- Aucune migration de schéma : champ `ambition` est déjà `text` libre dans `athletes`/`refs`
- Les anciennes valeurs sont auto-remappées à la lecture via `normalizeAmbitionLevel`
- Pas d'écriture batch — la nouvelle clé sera écrite au prochain save manuel

### 7. Prompt IA (no token bloat)
- `planConfigBuilder` injecte uniquement le label résolu + les 3 cibles physio numériques (FTP/kg, VMA, VLamax-max) issues de `getTargetsForAmbition` — pas la grille complète
- Aucune dégradation tokens attendue (déjà la pratique actuelle pour 4 paliers)

### 8. Memory update
- Créer `mem://logic/ambition-tiers-5-levels-percentile-based` documentant la grille + mapping legacy
- Mettre à jour l'index mémoire

## Tests

- `src/lib/__tests__/` : ajouter test `ambitionLevel.normalize.test.ts` couvrant le remap legacy (`finisher → discovery`, etc.)
- Vérifier `physiologicalTargets` : 5 paliers × N objectifs renvoient des cibles monotones croissantes
- Smoke test : générer un plan IA pour un athlète `qualifiable` 70.3 → vérifier que les cibles physio sont plus exigeantes que `competitor`

## Hors périmètre v1

- Refonte du screen onboarding "choix d'ambition" (juste textes/hints mis à jour, pas de refactor visuel)
- Distinction "Slot National" vs "Slot Continental" vs "Slot Mondial" → reportée v2 si besoin
- Recalibrage des benchmarks Trail (utilise pour l'instant les valeurs courantes ajustées)

## Risques & mitigations

- **Athlètes anciennement `elite` rétrogradés en `qualifiable`** : c'est volontaire (réaliste), aucune perte de données, le coach peut promouvoir manuellement vers `elite` si justifié
- **Tests existants** sur 4 paliers : ajouter cas pour `discovery`/`qualifiable`, garder rétrocompat via aliases

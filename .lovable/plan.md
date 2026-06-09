# Refonte Simulation LCW 70.3 — 3 épreuves indépendantes

## Objectif
Quand `raceFormat === "lcw_3day"`, l'onglet Simulation présente **3 simulations distinctes** (Natation J-2 / Vélo J-1 / Course J0), chacune calculée comme une **épreuve solo fraîche** (pas d'enchaînement, pas de fatigue cumulée, pas de carry-over glycogène).

## Architecture cible

```text
RaceSimulationPage
└── détecte raceFormat === "lcw_3day"
    └── <LCWSimulationTabs>
        ├── Tab "🏊 Natation 1.9km (Ven)" → cartes solo natation
        ├── Tab "🚴 Vélo 90km (Sam)"      → cartes solo vélo
        └── Tab "🏃 Course 21.1km (Dim)"  → cartes solo course
            (chaque tab réutilise les 5 cartes existantes
             mais en mode discipline-unique, fresh-start)
```

## Modifications par fichier

### 1. `src/pages/RaceSimulationPage.tsx`
- Détecter `raceFormat` depuis `athleteRaceGoals` (objectif courant)
- Si LCW : encapsuler le bloc 5 cartes dans `<Tabs>` à 3 onglets (swim/bike/run)
- Passer un nouveau prop `lcwDiscipline?: "swim" | "bike" | "run"` à chaque carte
- Banner explicatif en tête : "Format LCW détecté — chaque épreuve simulée comme effort solo frais"

### 2. `src/lib/v2/raceSimulationTFCL.ts`
- Ajouter paramètre `lcwSoloMode?: { discipline: "swim"|"bike"|"run", distanceKm: number }`
- Quand actif :
  - Forcer la distance à 1.9 / 90 / 21.1 km selon discipline
  - Réinitialiser glycogène/fatigue de départ à 100% (pas de carry-over)
  - Ajuster `envelope_constraints` : règles "course courte" (max 1er tiers ↑, zone rouge autorisée >40%)
  - Pour run : retirer la pénalité fatigue post-vélo dans le calcul d'allure

### 3. `src/components/RaceStrategyPlanCard.tsx`
- Prop `lcwDiscipline?` ; quand fourni :
  - TSS, NP, durée recalculés pour discipline seule
  - Plan A/B reformulés pour effort solo
  - Cardio drift sans baseline post-bike pour le run

### 4. `src/components/TriathlonFullRaceSimulationCard.tsx`
- Prop `lcwDiscipline?` ; quand fourni : masquer transitions/enchaînement, n'afficher que la discipline active comme course autonome
- Glycogène départ = 100%

### 5. `src/components/ObjectiveStrategyCard.tsx`
- Prop `lcwDiscipline?` ; pour run en LCW : retirer pénalité fatigue −3 à −5% → allure semi pure

### 6. `src/components/PacingEnvelopeCard.tsx`
- Prop `lcwDiscipline?` ; basculer sur enveloppe "course courte indépendante" (semi seul pour run, 90km TT pour vélo, 1.9km OWS pour swim)

### 7. Nutrition (cartes carbLoading/hydration/gut/caffeine)
- Détecter LCW : afficher 3 protocoles de carb-load consécutifs (J-3→J-2 swim, J-2 PM→J-1 bike, J-1 PM→J0 run) + refeed glycogène entre étapes

## Hors scope
- Pas de modif de la logique de génération de plan IA (déjà OK via `computePlan.ts`)
- Pas de migration DB
- Pas de modif des autres formats (continu standard inchangé)

## Validation
- Cas test : athlète Cath 70.3 LCW → 3 tabs visibles, chacun cohérent solo
- Cas test : athlète 70.3 continu standard → comportement inchangé (1 simulation enchaînée)
- Pas de régression sur Ironman / Marathon / 10K

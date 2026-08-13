# Zones d'entraînement dérivées de la physiologie

Objectif : ne plus prescrire à partir d'une grille de pourcentages figée, mais calculer les bornes de zones à partir des seuils physiologiques réels de l'athlète (LT1/FatMax, MLSS/LT2, VO₂max), avec repli automatique sur la grille standard quand la confiance des données est insuffisante.

## Ce qui change pour le coach

- Chaque zone affiche sa **condition physiologique** ("Zone 2 = autour de FatMax", "Zone 4 = MLSS ±3 %") et pas seulement un pourcentage.
- Les bornes sont **propres à l'athlète** : un athlète dont le seuil est à 80 % de sa VMA n'a plus les mêmes zones qu'un athlète à 90 %.
- Un badge indique toujours la source : **« Zones calculées »** ou **« Grille standard (données insuffisantes) »**, avec le niveau de confiance.
- Passage de 7 zones (Z1…Z7) à **6 zones** lisibles, alignées sur le modèle métabolique.

## Modèle 6 zones

| Zone | Condition physiologique | Ancien équivalent |
|---|---|---|
| Z1 Récupération | < LT1 − marge | Z1 |
| Z2 Endurance / FatMax | LT1 → FatMax haut | Z2 |
| Z3 Tempo | FatMax haut → MLSS − 5 % | Z3 |
| Z4 Seuil (MLSS) | MLSS ±3 % | Z4a + Z4b + Z5 |
| Z5 VO₂max | > MLSS jusqu'à vVO₂max | Z6 |
| Z6 Neuromusculaire | > vVO₂max | Z7 |

La correspondance ancienne→nouvelle est figée dans une table de mapping unique, utilisée partout (UI, PDF, plans IA, Nolio).

## Travail technique

**1. Moteur de zones (nouveau)** — `src/lib/zones/deriveTrainingZones.ts`
- Entrées : VMA / seuil course (sec/km), FTP, VLamax, VO₂max, CE, MLSS calibré (`maderMetabolicModel`), FCmax, CSS.
- Sorties : 6 zones avec bornes en % de référence **et** en valeurs absolues (W, km/h, min/km, bpm, sec/100m), plus `source: "derived" | "standard"`, `confidence`, et la liste des ancrages utilisés.
- Règle de repli : si le score de confiance (DRE) est sous seuil, ou si seuil/MLSS manquant, on renvoie la grille standard convertie en 6 zones.
- Garde-fous : monotonie des bornes, largeur minimale par zone, clamps physiologiques.

**2. Mapping et compatibilité** — `src/lib/zones/zoneMapping.ts`
- Table figée Z1–Z7 ↔ Z1–Z6 dans les deux sens, plus canonicalisation des libellés (`Z4a`, `Z4B`, `Z4`).
- `trainingZonesDefinition.ts` conservé comme grille de repli, plus comme source de prescription.

**3. Affichage** — `TrainingZones.tsx`, `TrainingZonesCard.tsx`, mini-rapport, exports PDF
- Rendu des 6 zones dérivées + condition physiologique + badge de source/confiance.

**4. Plans IA** — `src/lib/plan/renderIntensities.ts`, `targetTable.ts`, mirror edge
- `targetTable` calcule les bornes depuis le moteur de zones au lieu du mirror statique.
- Le JSON du plan reste relatif (Z1…Z6) ; l'injection des valeurs absolues utilise les zones dérivées.
- Le mirror edge (`supabase/functions/_shared/trainingZonesDefinition.ts`) est mis à jour en 6 zones et le test d'égalité client/edge est adapté.
- Le prompt et le validateur acceptent Z1–Z6 et rejettent Z7/Z4a/Z4b en sortie IA.

**5. Export Nolio** — `supabase/functions/nolio-send-plan/index.ts`
- Les cibles envoyées (W, allure, FC) proviennent des zones dérivées, avec mention de la référence dans la description de bloc.

**6. Tests**
- Bornes monotones et non chevauchantes sur profils types (débutant ratio 0,78 / élite 0,92 / master).
- Repli standard quand VLamax ou seuil manquent.
- Mapping 7↔6 réversible ; mirror client ↔ edge strictement égal.
- Non-régression du rendu d'intensités dans les plans existants.

## Ordre d'exécution

1. Moteur + mapping + tests unitaires (aucun impact visible).
2. Affichage zones et badge de source.
3. Bascule `targetTable` / `renderIntensities` + mirror edge + validateur IA.
4. Export Nolio.

## Points à valider

- Les plans **déjà enregistrés** en Z1–Z7 restent lisibles grâce au mapping ; ils ne sont pas réécrits.
- Le seuil de confiance de bascule est configurable ; départ conservateur (repli fréquent), à durcir ensuite.

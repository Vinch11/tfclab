# Pilote Nolio — 20 séances + lancement manuel par lots

## Objectif
Tester la génération automatique de structures Nolio sur 20 séances, puis permettre au coach de lancer manuellement les lots suivants (10 ou 20 séances à la fois) depuis une UI dédiée. Aucun cron, aucun batch massif automatique.

## 1. Base de données

Nouvelle table `nolio_structures_generated` (persiste le résultat IA, séparé des overrides manuels) :
- `workout_id` (text, unique) — ID de la séance dans la bibliothèque TFCL
- `sport_id` (int) — ID Nolio (2, 14, 18, 19, 20, 52)
- `structured_workout` (jsonb) — JSON Nolio strict
- `source_text_hash` (text) — hash du texte source au moment de la génération (détecte les changements)
- `status` (text) — `pending` | `ok` | `error` | `needs_review`
- `error_message` (text, null)
- `model` (text) — ex. `google/gemini-2.5-pro`
- `tokens_in`, `tokens_out` (int)
- `cost_usd` (numeric)
- `reviewed_by` (uuid, null) — coach qui a validé
- `reviewed_at` (timestamptz, null)

RLS : lecture/écriture pour `authenticated`, all pour `service_role`.

## 2. Edge Function `nolio-batch-generate`

Nouvelle fonction qui prend en input :
```json
{ "workout_ids": ["...", "..."], "force_regenerate": false }
```

- Max 20 IDs par appel (rejet 400 sinon).
- Pour chaque ID :
  1. Charge la séance depuis `enrichedWorkouts*` (texte source).
  2. Skip si déjà `ok` et `source_text_hash` inchangé et pas de `force_regenerate`.
  3. Appelle Lovable AI Gateway (`google/gemini-2.5-pro`) avec le prompt Nolio strict déjà rodé dans `nolio-generate-structure`.
  4. Parse + validation Zod (sport_id ∈ liste, steps non vides, durées > 0).
  5. Upsert dans `nolio_structures_generated` avec status `ok` ou `error`.
  6. Délai `await sleep(1500)` entre chaque appel pour éviter 429.
- Retourne un récap `{ processed, ok, error, skipped, total_cost_usd }`.

## 3. UI — Page `WorkoutLibraryBrowserPage`

Nouveau panneau **« Génération Nolio batch »** (collapsible, repliable par défaut) au-dessus de la liste :

- Filtres pour sélectionner les séances à traiter :
  - Sport (multi)
  - Statut Nolio : `non généré` / `ok` / `error` / `needs_review` / `tous`
  - Recherche texte
- Compteur live : `X séances sélectionnées` (ex. 14/700).
- Boutons :
  - **« Générer 10 prochaines »** → appelle l'EF avec les 10 premiers IDs non générés
  - **« Générer 20 prochaines »** → idem 20
  - **« Regénérer la sélection »** (force_regenerate=true, max 20)
- Indicateur de progression pendant l'appel + toast récap (✅ 18 ok, ⚠️ 2 erreurs, coût $0.04).

Sur chaque ligne de la bibliothèque, badge statut :
- ⚪ Non généré
- ✅ Généré
- ⚠️ Erreur (avec tooltip message)
- 🔧 Override manuel actif (priorité sur le généré)

Clic sur le badge → modale d'inspection (JSON + bouton « Marquer validé » qui set `reviewed_by/at`).

## 4. Priorité dans `nolio-send-plan`

Ordre de résolution pour chaque séance d'un plan envoyé à Nolio :
1. `nolio_workout_overrides` (correction manuelle coach) — priorité max
2. `nolio_structures_generated` avec status `ok`
3. Fallback : parsing texte actuel

## 5. Étapes d'implémentation (ordre)

1. Migration table `nolio_structures_generated`
2. Edge Function `nolio-batch-generate` (réutilise le prompt de `nolio-generate-structure`)
3. Hook `useNolioGenerationStatus(workoutIds)` pour charger les statuts en masse
4. Panneau batch + badges dans `WorkoutLibraryBrowserPage`
5. Mise à jour `nolio-send-plan` (priorité)

## 6. Test pilote — déroulé

1. Sélectionner 20 séances variées (5 bike, 5 run, 5 swim, 5 strength/trail).
2. Cliquer **« Générer 20 prochaines »**.
3. Mesurer : taux de succès, coût réel, temps total, qualité du JSON (validation manuelle des 20 via la modale d'inspection).
4. Si > 90% ok → lancer 10/20 à la fois jusqu'à couvrir la bibliothèque.
5. Si < 90% → ajuster le prompt avant d'élargir.

## Notes techniques
- Pas de cron, pas de queue, pas de pg_cron : 100% piloté par le coach.
- Limite 20/appel évite les timeouts Edge Function (max 150s, ici ~30-45s pour 20 appels).
- Le coût indicatif (Gemini 2.5 Pro) pour 700 séances est de l'ordre de quelques dollars.
- Détection de drift via `source_text_hash` : si tu modifies une séance source plus tard, elle réapparaît comme « à regénérer ».

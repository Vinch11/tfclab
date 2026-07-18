
# Reco 3 — Substitution automatique des catalogId B5 vers voisin réel

## Objectif
Transformer le check B5 d'un simple diagnostic (log "catalogId hors catalogue") en un **filet non silencieux** qui, quand c'est sûr, remplace l'ID fantôme par le voisin le plus proche du catalogue *effectivement injecté* pour ce chunk. Même philosophie que l'hydratation de zone et la réparation JSON : décision loggée, seuils explicites, opt-out possible.

## Portée — ce qu'on substitue, ce qu'on ne substitue jamais

**Éligibles à substitution** (les 3 catégories déjà diagnostiquées) :
- `retiré_par_filtre_phase` — l'ID existe mais a été retiré du chunk par le filtre de phase.
- `retiré_aval_filtre` — retiré par cap sport/cat, dédup, prohibitions, etc.
- `existe_autre_objectif` — ID d'un autre objectif (ex : trail dans un plan semi).

**Jamais substitués** :
- `pur_hallucination` — l'ID n'existe nulle part → on ne peut rien inférer, on laisse le FAIL B5 remonter (visible dans le rapport).
- Séances `custom: true` — pas d'ID catalogue par définition.

## Règles de similarité (garde-fous stricts)

Un candidat de substitution DOIT satisfaire **toutes** ces conditions :
1. **Même discipline normalisée** — swim/bike/run/strength/mobility (via `normSp` existant). Cross-sport interdit.
2. **Même famille d'intention** — via `intentFamily.ts` déjà présent (endurance / seuil / vo2 / sprint / technique / récup). Un fartlek ≠ une sortie longue.
3. **Écart de durée ≤ 25 %** — comparaison de la médiane `durationMin` de la fiche fantôme vs candidate.
4. **Phase compatible** — la fiche candidate doit avoir la phase du chunk dans ses `phase` autorisées (ou aucune contrainte).
5. **Score de recouvrement tags/goals ≥ 2** — au moins 2 tags communs (déjà calculé dans le neighbor engine actuel).

Si aucun candidat ne satisfait ces 5 conditions → **pas de substitution**, le FAIL B5 remonte tel quel (mieux vaut un check rouge qu'un mauvais mapping).

## Emplacement dans le pipeline

**Nouvelle passe `substituteHallucinatedCatalogIds`** dans `src/lib/plan/planReconciler.ts`, exécutée **après** `hydrateDilutedZones` et **avant** le retour du plan réconcilié — donc avant les checks QA. La substitution muterait `session.catalogId` uniquement (jamais le texte de la séance : c'est un remapping de référence, pas de contenu).

## Observabilité (non négociable)

À chaque substitution :
- `session.catalogIdOrigin = "<ancien>"` — trace conservée sur la session pour audit.
- `session.catalogIdSubstituted = true`.
- Ligne `semanticRepairs` : `"catalog_id_substituted: S{w} {day} {oldId} → {newId} [reason={cat}, score={n}, Δdur={x}%]"`.
- Compteur `catalogSubstitutions=N` ajouté au `[summary]` dans `useAITrainingPlan.ts`, à côté de `jsonRepairs`.
- Nouveau champ dans `PlanGenerationStat` : `catalogSubstitutions?: number` (mirroré Cloud pour /debug/plan-qa comme le reste).

## Impact sur les checks QA

- **B5** : les IDs substitués sortent naturellement du "hors catalogue" (leur nouvel ID est dans `allowedIds`). Le check restera FAIL uniquement sur les `pur_hallucination` et les cas où aucun voisin sûr n'a été trouvé.
- **B10/B11** : la substitution respectant discipline + intention + phase, ces checks ne doivent pas se dégrader. Un test unitaire le vérifiera.

## Livrables

1. `src/lib/plan/planReconciler.ts` — nouvelle fonction `substituteHallucinatedCatalogIds(plan, injectedCatalogIds, planPhases)` + intégration dans la passe principale.
2. `src/lib/plan/__tests__/reconcilerSubstitute.test.ts` — 4 cas :
   - Substitution réussie (retiré_par_filtre_phase, voisin idéal).
   - Refus (discipline différente).
   - Refus (écart durée > 25 %).
   - Pas de touche sur `pur_hallucination`.
3. `src/hooks/useAITrainingPlan.ts` — compteur `catalogSubstitutions=N` dans le summary + push des lignes dans `semanticRepairs`.
4. `src/lib/plan/planGenerationStats.ts` — champ `catalogSubstitutions?: number` + colonne miroir Cloud (best-effort).

## Non-buts (pour cadrer le scope)

- On ne modifie pas le prompt IA (pas de re-génération, pas d'appel supplémentaire).
- On ne touche pas au moteur de génération de chunks.
- On ne remappe pas les `pur_hallucination` (les FAIL B5 restants seront le vrai signal résiduel à traiter dans une itération future).
- On ne mute jamais le texte de la séance — juste l'ID de référence.

## Validation

- Typecheck vert + 4/4 tests unitaires.
- Un QA N=3 après merge doit montrer :
  - `catalogSubstitutions=N` visible dans les 9 summaries.
  - Baisse nette du taux de FAIL B5, ne laissant que les `pur_hallucination`.
  - Aucune régression B10/B11.

---
Si tu valides, j'implémente les 4 fichiers en une passe.

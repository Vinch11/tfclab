# TFCLab — résultats expérimentaux de la recette RLS et stockage QA (01/11/2026)

**Environnement :** projet Lovable **TFCLab DET QA isolé — 2026-11-01**, ID `c3941303-40d2-447e-9b87-867d82727fd1`, base Supabase Cloud distincte du projet Live, **non publié**.

**Verdict :** SQL RLS/contraintes et stockage dans la base QA : **preuves positives**. **NO-GO production** et **NO-GO certification end-to-end** tant que des sessions JWT réelles via PostgREST et le parcours navigateur ne sont pas passés. Aucun accès à la base Live pendant les actions de ce rapport ; aucun appel Nolio.

## Conditions et fixtures

- Comptes Auth : 2 ; profils `STAFF_COACH` avec onboarding terminé : 2.
- Athlètes fictifs uniquement : `QA_DET_A` (objectif 70.3) et `QA_DET_B` (marathon), liés à leurs coachs respectifs, `nolio_id=NULL`, `refs.qa_fixture=true`.
- Avant la recette, aucune ligne dans `plans`, `plan_versions`, `tests`, `snapshots`, `nolio_records`, `cron.job`.

## 1. Démonstration d'une faille de référence, AVANT correction

Sous le rôle PostgreSQL `authenticated` et une revendication de session `request.jwt.claim.sub` correspondant au Coach B (simulation SQL, **pas un vrai JWT PostgREST**), des insertions `coach_id=B`, `athlete_id=A` ont été **acceptées** dans :

- `plan_versions`,
- `plans`,
- `tests`,
- `snapshots`.

Elles ont été exécutées chacune dans `BEGIN ... ROLLBACK`. Contrôle indépendant immédiatement après : aucune ligne supplémentaire persistée. Le schéma source avait des politiques qui limitaient `coach_id` mais pas la propriété de `athlete_id`.

## 2. Correction candidate réellement appliquée à la SEULE base QA

Le SQL préparé dans `docs/qa/DET_RLS_ATHLETE_OWNER_CANDIDATE.sql` (PR #455) a été exécuté sur le projet QA isolé, après précontrôles des RLS et des références. Les vérifications SQL suivantes ont confirmé le déploiement :

- 4 politiques restrictives supplémentaires sur `plans`, `plan_versions`, `tests`, `snapshots` ;
- FK `plan_versions.athlete_id -> athletes.id`, pour refuser les versions orphelines ;
- contrainte unique composite `snapshots(id,athlete_id,coach_id)` et FK composite différable depuis `athletes(active_snapshot_id,id,coach_id)`, pour garantir l'appartenance du profil physiologique actif.

**Aucune de ces modifications n'a été appliquée à la production**, et aucune migration n'a été fusionnée. Rollback préparé : `docs/qa/DET_RLS_ATHLETE_OWNER_QA_ROLLBACK.sql`. Vérifier soigneusement sa portée avant tout usage.

## 3. Résultats des essais après correction (tous dans des transactions annulées)

| Essai SQL avec rôle `authenticated` simulé | Résultat |
| --- | --- |
| Coach B écrit `plan_versions` pour athlète A | Refus `42501` |
| Coach B écrit `plans` pour athlète A | Refus `42501` |
| Coach B écrit `tests` pour athlète A | Refus `42501` |
| Coach B écrit `snapshots` pour athlète A | Refus `42501` |
| Coach B écrit une version sur UUID athlète inexistant | Refus `42501` ; FK ajoutée pour le refus référentiel indépendant |
| Coach B écrit son propre `plan_versions` | Autorisé |
| Coach B écrit son propre `plans` | Autorisé |
| Coach B écrit son propre `tests` | Autorisé |
| Coach B écrit son propre `snapshots` | Autorisé |
| Coach A tente d'activer le snapshot du coach B | Refus composite FK `23503` |
| Coach A active son propre snapshot puis supprime ce snapshot | Fonctionne ; `active_snapshot_id` devient `NULL` |
| Coach B tente un UPDATE du plan A persistant | 0 ligne modifiée |
| Coach B tente un DELETE des versions A persistantes | 0 ligne supprimée |
| SQL RLS SELECT sous A puis sous B | 1 athlète propre visible et 0 athlète adverse à chaque fois |

**Précaution méthodologique :** ces essais utilisent `SET LOCAL ROLE authenticated` et `set_config('request.jwt.claim.sub', ...)` en SQL. Ils valident les prédicats RLS du moteur Postgres avec identité simulée, **pas la sécurité du transport JWT / PostgREST**, ni les sessions réelles du navigateur. Aucun test ne doit être présenté comme une certification RLS globale avant exercice HTTP Auth A/B.

## 4. Persistance durable sur la base isolée

Pour `QA_DET_A`, deux plans **non prescriptifs** marqués `_recipeId = TFCL_QA_P0_STORAGE_20261101` ont été créés au travers de deux transactions SQL distinctes sous rôle `authenticated` simulé :

- V1 historique : une séance fictive de **40 minutes**.
- V2 historique : la même séance fictive éditée à **45 minutes**.
- `plans` : courant 45 minutes, JSONB **exactement égal** à V2.
- V1 conservée intacte, `_coachLimiterOrder` et `_raceGoals` préservés.

**Ces écritures sont conservées volontairement** pour poursuivre les contrôles de réouverture et nettoyage, et ne sont pas une prescription sportive. Elles ne prouvent pas le comportement de la sauvegarde via React, les pannes réseau, ni un export PDF.

## 5. Audit de résidus et d'intégrité après essais

- `athletes=2`, `plan_versions=2`, `plans=1`, `tests=0`, `snapshots=0` ;
- `nolio_records=0`, `cron.job=0` ;
- 0 version orpheline ou rattachée au mauvais coach ;
- 0 plan courant rattaché au mauvais coach ;
- 0 référence `active_snapshot_id` incohérente ;
- les quatre politiques QA et trois contraintes QA sont toujours en place.

## 6. Critères restants (toujours NO-GO production)

1. **Authentification effective** : clients PostgREST distincts réellement connectés via JWT A/B, sans admin ni service_role. L'approbation de création de session par Lovable était indisponible dans le contexte de cet essai.
2. **Application** : ouverture du plan courant et des deux versions depuis l'interface QA, modification, reconnexion, panne réseau, PDF et texte Nolio sans envoi.
3. **Nolio** : empêcher toute invocation des fonctions copiées visant le service externe ou des URL anciennes.
4. **DET réel** : intégrer sur une branche candidate la version exacte du moteur #454 ; les plans stockés dans cette recette sont uniquement des fixtures, pas des sorties certifiées DET.
5. **Revue externe** : validation sportive indépendante, attestations des artefacts réellement déployés et rollback avant promotion.
6. **Nettoyage final QA** : après preuve UI, supprimer exactement les 2 versions et le plan courant marqués, puis les 2 athlètes synthétiques, enfin les comptes Auth selon procédure confirmée ; vérifier l'absence de résidus. Aucune suppression globale.

**Protection de production inchangée : DRAFT / NO-GO.**

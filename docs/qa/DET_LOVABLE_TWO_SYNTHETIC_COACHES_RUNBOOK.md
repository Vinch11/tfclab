# TFCLab DET — création contrôlée des 2 comptes Auth de recette (01/11/2026)

## Préconditions — confirmé le 01/11/2026

- [x] Copie QA **indépendante, non publiée** : Lovable `c3941303-40d2-447e-9b87-867d82727fd1`.
- [x] Base QA active avec zéro utilisateur, zéro athlète et zéro plan à l'initialisation de la recette.
- [x] L'utilisateur a **vérifié dans More → Users la présence des commandes de création ET de suppression**. Il ne s'agit pas encore d'une preuve de suppression effective d'un compte de recette.
- [ ] Les deux comptes synthétiques ont été réellement créés.
- [ ] Ils sont vérifiés en lecture seule via `auth.users` sur **la copie QA uniquement**.

## Action manuelle dans le projet QA uniquement

Éditeur : https://lovable.dev/projects/c3941303-40d2-447e-9b87-867d82727fd1

1. Vérifier visuellement le nom `TFCLab DET QA isolé — 2026-11-01`, pas le projet publié `TFCLab v2.1`.
2. Dans `More → Users`, choisir **Add user → Create new user** (jamais Send invitation).
3. Créer deux utilisateurs *fictifs* avec des adresses distinctes sous `example.invalid` (ex. `tfcl-det-a-20261101@example.invalid` et `tfcl-det-b-20261101@example.invalid`), si le validateur Lovable accepte ce domaine réservé.
4. Générer pour chacun un mot de passe fort **dans l'interface Lovable seulement**. Ne pas le copier dans Git, ChatGPT, une issue, une capture ou un log.
5. Vérifier que les deux comptes apparaissent dans **CE projet QA** ; ne modifier aucun rôle pour contourner la sécurité (pas de `service_role`, pas de promotion STAFF_COACH).
6. Si la création refuse le domaine fictif, **s'arrêter**, ne pas mettre d'adresses réelles et demander un autre parcours de provisionnement sécurisé.
7. **Ne pas encore utiliser le login/preview, générer de plans, envoyer Nolio ou supprimer les utilisateurs** : la prochaine étape est l'inspection read-only des lignes Auth et des profils créés.

## Contrôle indépendant via l'intégration Lovable

Avec `mcp__Lovable__query_database`, sur le seul projet QA, en SQL lecture seule :

```sql
SELECT
  count(*) AS total_auth_users,
  count(*) FILTER (WHERE lower(email) IN (
    'tfcl-det-a-20261101@example.invalid',
    'tfcl-det-b-20261101@example.invalid'
  )) AS matched_synthetic_users
FROM auth.users;

SELECT count(*) AS profiles_count FROM public.profiles;
SELECT count(*) AS athletes_count FROM public.athletes;
SELECT count(*) AS plans_count FROM public.plans;
SELECT count(*) AS version_count FROM public.plan_versions;
```

**Avant d'aller plus loin :** exactement 2 utilisateurs synthétiques, pas de comptes inattendus, aucune ligne athlète/plan. Relever en interne leurs UUID (pas de mots de passe/JWT) pour générer des sessions A/B avec une approbation explicite. Le verdict ne peut être `GO exécution des tests` sans session Auth réelle, protections RLS et audit SQL.

## Revenir à zéro

Supprimer les utilisateurs exactement identifiés depuis `More → Users`, seulement après nettoyage et validation des IDs de données de recette. La FK `profiles.user_id → auth.users.id ON DELETE CASCADE` est présente dans la QA, mais cela ne suffit pas à garantir l'absence de toute autre ligne dépendante. Après la suppression, exécuter les compteurs SQL et inspecter les logs / résidus exacts. **Aucun nettoyage global.**

Ce protocole ne vaut pas autorisation de publication, de migration, de nettoyage en production ni d'appel à Nolio.

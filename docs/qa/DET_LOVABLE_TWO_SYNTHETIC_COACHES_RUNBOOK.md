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
3. **Résultat observé** : Lovable a rejeté `tfcl-det-a-20261101@example.invalid` avec `Email address not allowed`. Ne pas réessayer avec `.invalid`, `.test`, `example.com`, ni inventer le domaine d'un tiers.
4. Employer deux adresses **réellement valides, privées et exclusivement contrôlées par le propriétaire du projet**, idéalement deux alias de test d'une même boîte détenue par lui. Si son fournisseur prend en charge les sous-adresses `+`, utiliser par exemple la forme `boite+tfcl-det-a@domaine-que-vous-controlez.tld` et `boite+tfcl-det-b@domaine-que-vous-controlez.tld` (exemples de format uniquement, pas de vraies adresses). Autre possibilité : deux alias distincts d'un domaine administré par le propriétaire. Vérifier que la réception fonctionne si une confirmation ou un reset est requis. Ne jamais utiliser d'adresse appartenant à un tiers.
5. Dans `More → Users`, choisir **Create new user** (pas invitation). Mot de passe unique et fort pour A et B, saisi **dans Lovable uniquement**. Ne jamais communiquer l'email complet, le mot de passe ou le JWT au chat, à GitHub ou aux logs de recette.
6. Vérifier que seuls ces deux comptes sont créés dans **CE projet QA**. Ne modifier aucun rôle pour contourner les politiques (pas de `service_role`, pas de promotion STAFF_COACH).
7. **Ne pas encore utiliser le login/preview, générer de plans, envoyer Nolio ou supprimer les utilisateurs** : la prochaine étape est l'inspection read-only des lignes Auth et des profils créés.
8. Si Lovable refuse aussi les alias contrôlés, arrêter les créations et documenter seulement le code erreur, sans chercher à contourner la validation.

## Contrôle indépendant via l'intégration Lovable

Avec `mcp__Lovable__query_database`, sur le seul projet QA, en SQL lecture seule :

```sql
SELECT count(*) AS total_auth_users,
       count(DISTINCT lower(email)) AS distinct_auth_emails
FROM auth.users;

SELECT count(*) AS profiles_count FROM public.profiles;
SELECT count(*) AS athletes_count FROM public.athletes;
SELECT count(*) AS plans_count FROM public.plans;
SELECT count(*) AS version_count FROM public.plan_versions;
```

**Avant d'aller plus loin :** exactement 2 utilisateurs synthétiques avec deux emails distincts et contrôlés par le propriétaire, pas de comptes inattendus, aucune ligne athlète/plan. Ne pas afficher ni exporter les valeurs email, seulement le résultat des compteurs. Relever en interne leurs UUID (pas de mots de passe/JWT) pour générer des sessions A/B avec une approbation explicite. Le verdict ne peut être `GO exécution des tests` sans session Auth réelle, protections RLS et audit SQL.

## Revenir à zéro

Supprimer les utilisateurs exactement identifiés depuis `More → Users`, seulement après nettoyage et validation des IDs de données de recette. La FK `profiles.user_id → auth.users.id ON DELETE CASCADE` est présente dans la QA, mais cela ne suffit pas à garantir l'absence de toute autre ligne dépendante. Après la suppression, exécuter les compteurs SQL et inspecter les logs / résidus exacts. **Aucun nettoyage global.**

Ce protocole ne vaut pas autorisation de publication, de migration, de nettoyage en production ni d'appel à Nolio.

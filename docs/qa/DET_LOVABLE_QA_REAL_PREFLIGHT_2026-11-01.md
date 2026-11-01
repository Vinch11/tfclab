# TFCLab DET — recette Lovable Cloud isolée : préflight réel (01/11/2026)

**Statut : GO pour inspection en lecture seule ; NO-GO pour la recette authentifiée et toute promotion de DET.**

## Environnement inspecté

- Projet source **TFCLab v2.1**, Lovable ID `52d2faa6-bd08-4b80-84d8-20e93ad76bb7`, **publié** — ne pas modifier.
- Un **Remix QA** neuf créé le 01/11/2026 dans le même espace, sous le nom **TFCLab DET QA isolé — 2026-11-01**, Lovable ID `c3941303-40d2-447e-9b87-867d82727fd1`. **Non publié.**
- L'identifiant de projet `supabase/config.toml` est distinct du projet source ; le connecteur Lovable indique `stack=supabase`, `enabled=true` pour les deux. **Il ne s'agit pas d'une preview du projet source.**
- La PR #455 et la branche expérimentale DET #454 restent distinctes ; le Remix reprend le code de l'application source, pas le moteur DET V3.23 expérimental. **La réussite de la recette du stockage ne certifierait donc pas la génération DET sur cette copie.**

## Résultats réellement obtenus par requêtes SQL de lecture seule

| Contrôle | Résultat |
| --- | --- |
| `auth.users` | 0 |
| `athletes`, `tests`, `snapshots` | 0 dans chaque table |
| `plan_versions`, `plans` | 0 dans chaque table |
| `profiles`, `nolio_records` | 0 dans chaque table |
| `cron.job` | 0 tâches planifiées, 0 actives |
| Tables `athletes`, `tests`, `snapshots`, `plan_versions`, `plans` | 5/5 présentes, RLS activée |

**Politiques RLS constatées :** quatre politiques permissives par table (SELECT, INSERT, UPDATE, DELETE) basées sur `coach_id = auth.uid()`. Elles ne vérifient pas toutes l'appartenance de l'athlète à ce coach.

**Contraintes constatées :** `tests`, `snapshots`, `plans` ont une clé étrangère `athlete_id -> athletes(id)` avec cascade ; `plan_versions` n'a aucune FK d'athlète dans les contraintes inspectées. Un plan versionné orphelin ou lié à un athlète d'un autre coach doit être considéré comme un risque à tester et à bloquer.

**Limitation :** ces lectures SQL administratives ne prouvent aucun comportement effectif RLS entre deux JWT utilisateurs. Aucun compte QA n'a été créé et aucune requête de mutation n'a été lancée.

## Sécurité Nolio

Le Remix possède le code des fonctions Nolio : l'absence de données et de cron ne démontre pas l'absence de fonctions capables d'appeler Nolio ou des URLs figées de l'ancien projet. **Ne jamais appeler de fonction Nolio pour tester le blocage.** Avant un test navigateur, contrôler et bloquer les appels réseau externes Nolio et vérifier les éventuelles références au backend Live, y compris au niveau serveur.

## Suite indispensable

1. Vérifier les réglages Auth et **le parcours de suppression des deux comptes synthétiques**, sans créer d'utilisateur avant de pouvoir confirmer le nettoyage.
2. Préparer des sessions Auth A/B distinctes **avec autorisation** : ne pas confondre SQL administrateur et PostgREST sous JWT utilisateur. Ne jamais exposer les JWT.
3. Préparer des protections SQL candidat uniquement sur ce Remix, avec examen RLS/FK et tests de régression ; demander autorisation avant d'appliquer une migration. Ne pas présumer que le script candidat #455 est déployé.
4. Préparer les écritures réversibles : `plan_versions` v1/v2 et `plans` v1/v2, lectures croisées, modifications, refus de création orpheline/croisée, relecture après reconnexion, réseau coupé.
5. Audit SQL indépendant avec visibilité complète, nettoyage exact de tous les UUID, puis vérification de la suppression Auth.
6. Recette UI/PDF et revue sportive sur la **version DET exacte** que l'on envisage de promouvoir ; aucun envoi Nolio et aucune publication.

**Décision : aucun GO produit / pilote tant que ces preuves ne sont pas intégralement obtenues. Le site publié et ses 12 athlètes sont restés intacts.**

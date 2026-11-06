# TFCLab — recette P0 avec backend géré par Lovable (01/11/2026)

**Statut : expérimental / NO-GO production.** Ce document adapte la PR #455 au fait que l'application est exploitée dans Lovable. Il n'autorise **aucune écriture, migration, action Auth, changement RLS ou test navigateur sur la base de production**.

## 1. Identifier le backend avant d'agir

Depuis l'éditeur du projet, vérifier le panneau Cloud/Database/Supabase :

- **Lovable Cloud (backend intégré)** : tables, Auth, RLS et SQL consultables via l'interface Lovable. Aucune URL/clé Supabase externe ne doit être présumée accessible.
- **Supabase externe relié à Lovable** : relever séparément le projet lié (sans copier les secrets) et vérifier si une base de **recette distincte** existe déjà. Lovable peut gérer des migrations sur le projet lié ; ne jamais approuver une migration sur la production pour réaliser cette recette.

**Ne pas lancer** `scripts/qa/isolated-supabase-recette.mjs` sur Lovable Cloud : il attend un endpoint Supabase distinct, des identifiants synthétiques et une autorisation explicite ; ne pas l'assouplir pour pointer vers la production.

Documentation publique (consultée le 01/11/2026) :
- https://docs.lovable.dev/features/database — More → Database → Manage → SQL editor
- https://docs.lovable.dev/integrations/supabase — projet Supabase externe vs backend intégré
- https://docs.lovable.dev/features/environments — Test / Live (ancien mode, fermé aux nouveaux projets depuis le 24/03/2026)

## 2. Séparation obligatoire

La recette exige une **base distincte** et un jeu de données strictement synthétique. Les aperçus/drafts Lovable ne garantissent pas, à eux seuls, l'isolement de la base.

**Cas particulier documenté par Lovable :** des projets anciens peuvent disposer du mode intégré **Test / Live** avec deux bases séparées. Ce mode n'est plus activable sur de nouveaux projets depuis le **24 mars 2026**. Un environnement Test préexistant n'est admissible pour cette recette qu'après preuve qu'il est réellement séparé de Live, et qu'aucune donnée d'athlète réelle n'y sera utilisée : lors de la création historique de Test, Lovable pouvait copier une fois les données Live vers Test. Ne jamais vider la base Test par défaut ni en déduire qu'elle est anonyme. Si ce mode n'existe pas, utiliser un **projet Lovable distinct avec backend Cloud propre** ou une base Supabase externe distincte et prouvée.

Conditions à prouver avant tout test :
1. URL/identité du projet de **recette** explicitement nommée (sans secrets).
2. Backend/base de recette **distincts** de Live (preuve dans la configuration Lovable, pas seulement deux URLs frontend), que ce soit Test préexistant ou projet séparé.
3. Aucun utilisateur, athlète, test, plan ou clé réelle recopié. Deux coachs fictifs et deux athlètes synthétiques uniquement.
4. Schéma, politiques RLS et fonctions Edge nécessaires revus pour compatibilité ; première étape **read-only**.
5. Plan de retour arrière et validation des opérations de nettoyage ciblé ; ne jamais effacer globalement une table.
6. Aucune connexion Nolio active vers un athlète réel dans la recette, ni appels externes non nécessaires.

Si l'isolement backend n'est pas prouvé, **arrêt immédiat : NO-GO**. Ne jamais tester dans le draft ou l'application publiée.

## 3. Ordre des preuves sur le backend de recette

**Étape A — inspection sans modification :** relever l'existence des tables `athletes`, `tests`, `snapshots`, `plan_versions`, `plans` ; leurs politiques RLS actives, contraintes d'appartenance et clés étrangères. Vérifier la date/version du schéma; confronter aux types TypeScript du dépôt. Les outils SQL intégrés à Lovable peuvent aider, mais seulement sur le projet de recette.

**Étape B — deux identités synthétiques :** coach A et coach B. Exécuter des tentatives de lecture, création, modification et upsert avec **leur vraie session Auth non privilégiée**, jamais avec la session administrateur du SQL editor. Aucun accès aux données d'autrui ni aux athlètes absents ne doit être possible. Un SQL admin seul ne prouve PAS les RLS applicables aux clients.

**Étape C — durabilité réelle :** effectuer la même édition et réouverture de JSON via les deux chemins actuels (`plan_versions` insert, `plans` upsert), reconnecter A dans une nouvelle session et prouver :
- v1 existe et est inchangée après création de v2 ;
- `plans` contient bien v2, pas un contenu local seulement ;
- données de séance, date, durée, intensité, limiteurs et objectifs identiques entre écran et stockage ;
- une perte réseau ne transforme pas un échec de sauvegarde en succès affiché.

**Étape D — inspection SQL indépendante :** après chaque exercice, exécuter `docs/qa/DET_RLS_INDEPENDENT_POSTRUN_AUDIT.sql` seulement sur la base de recette et avec la visibilité SQL adéquate. Les compteurs de résidus, absence de RLS et incohérences d'appartenance doivent tous être nuls. Investiguer les UUID synthétiques si nécessaire.

**Étape E — parcours coach :** test terrain → profil → limiteurs → génération DET → sauvegarde → réouverture → modification → PDF/texte Nolio **sans émission externe**. Faire analyser la sécurité sportive par un réviseur indépendant et attester la version de code réellement exécutée.

## 4. Adaptation aux capacités Lovable Cloud

Si les clients Auth ou l'exécution `node` externe sur une instance isolée ne sont pas possibles, remplacer le harnais Node **uniquement** par des tests équivalents qui utilisent deux sessions Auth synthétiques dans le projet Lovable de recette ; conserver la preuve des effets réellement observés en base et l'audit SQL indépendant. **Ne jamais** déclarer la recette A/B `PASS` en se fondant seulement sur la revue statique, les tests mocks, un SQL avec privilèges ou un aperçu visuel.

Le correctif `docs/qa/DET_RLS_ATHLETE_OWNER_CANDIDATE.sql` est un candidat de revue, **pas une migration à appliquer automatiquement**. En cas de politique insuffisante, faire corriger **dans le projet isolé**, vérifier les politiques effectives et les interactions d'autres policies, puis rejouer toute la recette.

## 5. Critère de sortie

Le statut reste **NO-GO** jusqu'aux preuves cumulatives : backend isolé, essais authentifiés A/B, invariants SQL, stockage v1/v2 durable, cas d'échec réseau, UI/PDF, revue sportive, artefacts déployés/rollback. Une CI entièrement verte ne remplace aucun de ces contrôles.

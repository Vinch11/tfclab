# Nolio v2 — Phase 1 implémentée : développement simulé

## Verdict et périmètre livré

**GO technique pour une revue de fusion de la phase 1 simulée**, sous réserve de la revue humaine et de la CI de la PR. **NO-GO pour un pilote réel ou la production.** La PR d'implémentation reste en brouillon et n'est pas fusionnée automatiquement. Aucune phase 2 n'est commencée.

La PR documentaire #400 a été contrôlée (un seul document, aucun code, CI réussie), passée Ready for review puis fusionnée par squash : `6f9ace6e528d63239797cd349e7c048edafc2188`. La branche `feat/nolio-v2-phase1-mocked` part de ce `main` actualisé.

Le connecteur traite les routes v2 de lecture par un transport **simulé exclusivement côté serveur**. Aucun transport HTTP Nolio réel n'est câblé. Les tests manipulent des requêtes/réponses en mémoire ; la migration est exécutée uniquement dans un PostgreSQL en mémoire jetable. Aucun PAT ou application Nolio créé, aucune donnée d'athlète réelle lue, aucun appel Gemini, aucune migration de production et aucun déploiement.

## Architecture réellement codée

- Deux Edge Functions : `nolio-v2-read` pour les consultations et `nolio-v2-links` pour les liens **locaux TFCLab**. Leur méthode RPC POST n'est jamais relayée à Nolio. Les seules opérations de protocole Nolio sont des GET sur douze routes explicitement autorisées.
- Le runtime exige `NOLIO_V2_ENABLED=true`, `NOLIO_V2_ENV=development`, `NOLIO_V2_MODE=mock` et une URL Supabase locale. Le flag est désactivé par défaut ; un domaine `*.supabase.co` est refusé **avant lecture de la clé service-role et avant appel auth/DB**. Le provider de PAT est codé et testé, mais le runtime mock n'en a pas besoin et ne lit jamais `NOLIO_V2_PAT`.
- L'appelant est vérifié avec Supabase `auth.getUser`, puis comparé à l'unique responsable configuré. L'appartenance de l'athlète local est vérifiée avant toute lecture distante. Les traitements sont distincts de la v1.
- Le service contrôle `/app/` (nom attendu configuré, `type=personal`, scope requis `planned:read`, budgets heure/jour) et `/me/` (propriétaire attendu), puis récupère tous les candidats dans la limite bornée de pagination. Ces identités sont **simulées**, pas attestées pour un compte réel. Le contrat ne fournit pas d'ID d'application : le nom attendu est un contrôle opérationnel (nom mutable), pas une identité cryptographique.
- Association : choix confirmé, ID public opaque, candidat revalidé et `has_api_access=true`, puis lecture de contrôle du calendrier de cet athlète avant insertion locale. Aucun matching de nom, aucune conversion/transmission de l'ID v1. Une collision n'écrase pas l'ancien lien : retrait local explicite puis nouvelle association. Le retrait local reste possible sans accès Nolio.
- Calendrier : six collections distinctes (`trainings`, `competitions`, `cycles`, `notes`, `messages`, `quizzes`), dates civiles et période de 90 jours maximum. Les listes commencent à 28 jours dans l'UI. Maximum 100 lignes/page, 20 pages/collection ; curseur et état incomplet remontés si une limite ou une erreur interrompt la lecture.
- DTO de consultation propres : quantités nulles conservées, restrictions visibles, IDs texte, types d'événement explicites. Aucune alimentation des snapshots, de la charge, des plans ou du moteur physiologique.
- Zones : le contrat officiel déclare un objet ouvert pour `zones/final`. L'adaptateur conserve les contenus par clé/stream pour une restitution neutre ; il **n'invente pas un schéma de bornes ni une correspondance physiologique**. La forme de la fixture est synthétique, pas une garantie de payload réel.
- Interface ajoutée comme panneau frère dans la configuration, derrière `import.meta.env.DEV`, puis un contrôle d'URL Supabase locale. État d'application, quotas simulés, candidats accessibles/refusés, association explicite, sports/zones et six familles du calendrier. Données complètes/partielles/refusées/indisponibles distinguées. Pas de bouton d'envoi/modification de séance.

Le client ne possède pas de méthode POST/PATCH/DELETE ni de route libre. Les headers de quotas sont relus après chaque réponse, y compris avant un retry. HTTP 401/403/404/409/429 ne sont pas rejoués ; HTTP 503/réseau ont au plus deux nouvelles tentatives bornées. Les refus ne sont pas contournés via une autre identité. Aucun journal contenant les réponses ou les secrets.

## Fichiers créés ou modifiés

| Groupe | Fichiers |
|---|---|
| Serveur commun nouveau | `supabase/functions/_shared/nolio-v2/{contracts,errors,config,auth,client,pagination,adapters,mock,store,supabaseStore,service,http,runtime}.ts` |
| Fonctions nouvelles | `supabase/functions/nolio-v2-read/index.ts`, `supabase/functions/nolio-v2-links/index.ts` |
| Tests/typage Edge nouveaux | `nolio-v2-read/index.test.ts`, `nolio-v2-read/runtime.test.ts`, `nolio-v2-links/index.test.ts`, configurations Deno locales des deux fonctions |
| Exemple sans secret | `supabase/functions/nolio-v2-read/development.env.example` : flag false, identités locales/synthétiques, aucune valeur de PAT ou clé Supabase |
| Migration additive | `supabase/migrations/20261024210000_nolio_v2_athlete_links.sql` |
| Interface nouvelle | `src/components/nolio-v2/NolioV2DevelopmentPanel.tsx`, `NolioV2ReadOnlyPanel.tsx`, `NolioV2ReadOnlyPanel.test.tsx` |
| Client produit | `src/hooks/useNolioV2Read.ts`, `useNolioV2Read.test.ts`, `src/lib/nolio-v2/types.ts` (réexport de types uniquement, aucun runtime serveur importé par Vite) |
| Points de montage existants | `src/components/ConfigurationPage.tsx` : seulement un import et un rendu DEV supplémentaire ; `supabase/config.toml` : seulement deux nouveaux blocs avec `verify_jwt=true` |
| Dossier de revue | Ce document |

Aucun fichier des fonctions v1, composant `Nolio*` historique, modèle physiologique, algorithme de génération ou de charge n'est modifié. Les deux blocs préexistants de `supabase/config.toml` restent identiques. Aucune modification de dépendance, lockfile, workflow ou système QA global.

## Migration SQL proposée et validée localement

La table additive `public.nolio_v2_athlete_links` contient : UUID primaire, `coach_id`, `athlete_id`, `connection_key`, `nolio_user_id:text`, statut et dates de vérification/création/mise à jour. Aucun token, secret, payload de calendrier ou résultat sportif.

- FKs sur `auth.users` et `athletes`, suppressions locales en cascade.
- Unicité `(coach_id,connection_key,athlete_id)` et `(coach_id,connection_key,nolio_user_id)` : l'identité ne peut pas entrer en collision silencieusement.
- Préfixe `usr_` contrôlé sans conversion, découpage ou contrainte de caractères alphanumériques seuls ; casse et ponctuation conservées. Borne locale 512 caractères, espaces/contrôles refusés.
- RLS activée ; `authenticated` n'a que SELECT de ses propres liens et uniquement si l'athlète lui appartient encore. Aucun droit d'écriture client ou droit `anon`.
- Le rôle service dispose des opérations locales nécessaires mais un trigger supplémentaire refuse un couple coach/athlète étranger. Le handler vérifie également le propriétaire ; il ne compte pas sur la RLS que le service-role contourne.
- Un transfert d'athlète ne transfère pas l'ancien lien à un autre coach. Les contrôles empêchent la réutilisation du lien devenu périmé.

**La migration n'a pas été appliquée à Supabase, local ou production.** Son SQL a été exécuté dans une instance PGlite (PostgreSQL en mémoire), avec rôles, `auth.uid()` et tables de référence synthétiques. Les hypothèses de schéma sont explicites dans ce test. L'intégration avec l'ensemble des politiques réelles du projet et PostgREST reste à vérifier sur une base locale dédiée avant élargissement.

## Tests exécutés et résultats

| Vérification | Résultat |
|---|---|
| Deno, client/service/HTTP/permissions | 41 tests réussis ; réseau et variables d'environnement refusés au niveau de chaque test |
| Deno, garde de runtime | 1 test réussi ; URL Supabase distante et URL avec identifiants refusées avant lecture de secrets ou accès DB/auth |
| Deno, migration PostgreSQL | 1 test réussi avec assertions SQL sur RLS, privilèges, collision, IDs opaques, contrôle service-role, transfert et cascade |
| Vitest React + hook | 8 tests réussis ; transport navigateur remplacé par un spy qui interdit les accès réseau |
| Deno check strict | Réussi sur les deux points d'entrée et leur graphe de dépendances |
| TypeScript application | `tsc --noEmit -p tsconfig.app.json` réussi |
| ESLint ciblé sur les nouveaux fichiers front | Réussi sans erreur ni avertissement après correction des dépendances des hooks |
| Build Vite de production | Réussi ; avertissements existants de chunks volumineux/imports mixtes. Recherche dans les assets : aucun provider PAT, sentinel mock, appel `nolio-v2-read/links` ou panneau v2 inclus |
| Diff et isolation | `git diff --check` réussi ; aucun diff sur v1, doctrine, modèles ou génération ; ajouts de montage explicitement inspectés |

**51 tests ciblés réussis au total.** Ils couvrent les erreurs 401/403/404/409/429/503, quotas heure/jour et Retry-After, pagination complète/partielle/stagnante, dates impossibles et civiles, six types d'événements, refus de propriétaire/athlète, association explicite, absence de fuite dans erreurs/statut et absence de méthode d'écriture Nolio. Les tests SQL vérifient les contraintes effectives, pas une simple reproduction de leur logique en mémoire JavaScript.

Reproduction depuis la racine avec Deno 2 et les dépendances frontend installées :

```sh
# Préchargement des seuls outils/SDK de test (registre npm, aucun appel Nolio).
deno cache --config supabase/functions/nolio-v2-read/deno.json supabase/functions/nolio-v2-links/index.test.ts supabase/functions/nolio-v2-read/index.ts supabase/functions/nolio-v2-links/index.ts
# Ensuite, aucun réseau permis pendant l'exécution des tests.
deno test --cached-only --config supabase/functions/nolio-v2-read/deno.json --deny-net --deny-env --allow-read supabase/functions/nolio-v2-read/ supabase/functions/nolio-v2-links/index.test.ts
deno check --cached-only --config supabase/functions/nolio-v2-read/deno.json supabase/functions/nolio-v2-read/index.ts supabase/functions/nolio-v2-links/index.ts
npx vitest run src/components/nolio-v2/NolioV2ReadOnlyPanel.test.tsx src/hooks/useNolioV2Read.test.ts
npx tsc --noEmit -p tsconfig.app.json
npx eslint src/components/nolio-v2 src/hooks/useNolioV2Read.ts src/hooks/useNolioV2Read.test.ts src/lib/nolio-v2
npm run build
```

Les tests Deno sont découverts par le workflow existant ; leurs permissions de test restent restrictives même lorsque celui-ci utilise `-A`. Le test SQL ajoute seulement un outil de test Deno épinglé (`npm:@electric-sql/pglite@0.5.11`), sans dépendance frontend. Les modules serveur utilisent `@supabase/supabase-js@2.89.0`.

Note de reproductibilité du dépôt : `npm ci` échoue déjà sur l'incohérence entre le package.json de main et son ancien package-lock. Pour ces vérifications locales, dépendances installées avec `npm install --package-lock=false` ; aucun lockfile ou package.json modifié. La CI existante utilise ses commandes/lockfiles habituels et doit confirmer les résultats sur la PR. La suite historique complète n'a pas été relancée localement ; aucun harnais de génération IA n'a été exécuté.

## Exécution locale simulée et contrôles de sécurité

Le mode par défaut est arrêté. Pour un essai intégré local **ultérieur**, utiliser un Supabase de développement jetable, un utilisateur et un athlète locaux dont la propriété est connue. Le frontend doit cibler cette instance locale (`VITE_SUPABASE_URL` local et clé publique locale) ; il refuse le projet distant même en mode Vite dev. Les fonctions doivent disposer uniquement des paramètres de la même instance locale.

L'exemple `development.env.example` peut servir de base à un fichier `*.local` ignoré par Git : remplacer le responsable par l'UUID du testeur local, puis activer le flag uniquement dans cet environnement simulé. Aucun PAT Nolio n'est nécessaire. Ne jamais recopier de clé de production dans cette configuration. Aucune configuration ou instance locale Supabase n'a été déployée/démarrée pour ce livrable ; les handlers, le SQL et le panneau sont testés sans cela.

**Ne pas rejouer aveuglément l'historique global des migrations pour monter cette démo** : certaines migrations historiques v1 contiennent des déclencheurs cron ou URLs de production. Préparer un schéma local contrôlé avant d'appliquer seulement la migration additive ; ce chantier de bootstrap global n'est pas inclus dans la phase 1. Les tests en mémoire évitent précisément tout déclencheur historique.

Les gardes se cumulent : JWT de plateforme, utilisateur réellement vérifié, responsable unique, propriété de l'athlète, revalidation des accès simulés, environnement local, allowlist de GET et transport sans fallback réseau. Le PAT réel n'est jamais lu par le runtime livré ; le futur provider de secret ne prend que la variable serveur `NOLIO_V2_PAT`. Il n'existe aucun formulaire, variable `VITE_*`, stockage ou réponse contenant ce secret. Les seules chaînes ressemblant à un PAT dans les tests sont des sentinelles synthétiques explicitement nommées.

Les réponses HTTP sensibles utilisent `no-store`, les caches Nolio sont en mémoire du panneau et invalidés au changement d'identité, de lien, de dates ou de refus d'accès. Les erreurs SDK ne sont pas affichées brutes. CORS utilise uniquement les origines configurées. Aucune journalisation de payload, donnée personnelle ou secret.

## Limites connues et prérequis avant un pilote réel

1. **Aucun live transport** : activer un flag ou fournir un PAT réel ne suffit pas à connecter Nolio. Un lot ultérieur explicitement autorisé devra introduire et faire revoir ce transport, ses restrictions de déploiement et le provisionnement des secrets.
2. Connexion mono-responsable, pas de délégation multi-coachs ni OAuth fonctionnel. Les quotas sont observés par consultation, pas régulés par un scheduler global ; cela suffit au mock manuel, pas à un produit multi-utilisateurs.
3. Pas de reprise inter-requêtes par curseur dans l'UI : l'API expose le dernier curseur/état partiel, le panneau demande de restreindre la période. La borne de 20 pages ne devient jamais une fausse complétude.
4. Les zones finales restent génériques car le contrat n'en spécifie pas la forme détaillée. Les workouts complexes, récurrences en écriture, transitions multisports et leurs fidélités ne sont pas traités dans cette phase.
5. Pas d'essai intégré d'un stack Supabase complet (Auth + PostgREST + toutes RLS historiques) ni d'attestation des permissions, quotas, abonnements ou données Nolio réels. Un tel essai local contrôlé est requis avant extension.
6. Fin d'accès : refus immédiat des nouvelles lectures, suppression locale du lien possible ; pas de webhook ou réconciliation automatique `app/users` dans ce lot. Avant toute conservation réelle de données, approuver et réaliser arrêt/réconciliation/purge conforme sous 30 jours, y compris liens et copies. Ce point reste un bloqueur pour un pilote réel.
7. Revalider auprès de Nolio les parties ouvertes du contrat et la politique d'accès ; nouvelle application personnelle v2 et PAT minimal seront à créer manuellement **seulement lors d'un futur GO pilote**, hors chat. La v1 doit rester intacte.
8. La migration SQL attend une revue puis validation sur schéma local contrôlé ; son exécution en production est interdite à ce stade. Aucun bouton ne publie des séances, aucune activité réalisée n'est importée et aucun mécanisme de webhook n'est ajouté.

La PR peut donc être examinée comme un connecteur de développement simulé et isolé. **Elle ne constitue ni un déploiement, ni une autorisation de fusion automatique, ni un GO de passage en phase 2 ou de connexion à des athlètes réels.**

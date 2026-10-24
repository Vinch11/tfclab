# TFCLab — Proposition de phase 1 Nolio v2, lecture seule

**Statut : proposition à valider avant codage fonctionnel.** L'accord architectural donné après la PR #399 n'est pas interprété comme une autorisation d'implémenter, de provisionner des secrets ou d'appeler Nolio.

Base : `main` au commit `786b82c6031d9392f22139ecf0b5a516dcd932cc`, après fusion squash de la PR #399. Contrat : OpenAPI 3.1.0, Nolio 2.0.0, fichier transmis `api-1.json`, SHA-256 `db58f8670ff82d9f93a16bd645f39ed6a7e81aa107c89bde9622bf3b6222e853`. Les références détaillées et réserves figurent dans la [matrice](NOLIO_V1_V2_MIGRATION_MATRIX.md) et l'[architecture](NOLIO_V2_ARCHITECTURE.md).

## 0. Clôture de l'audit et limite de la nouvelle étape

Contrôle préalable à la fusion : `main` était toujours exactement `d736e4763da33eda21c9e56a27d587dbecf546b6`, le commit audité. Aucun changement applicatif intervenu à réévaluer. La PR #399 avait un seul commit, cinq fichiers ajoutés sous `docs/nolio-v2/`, aucune suppression ni modification d'un autre fichier. Les fichiers étaient exactement : matrice, architecture, opportunités, plan d'implémentation et synthèse exécutive. La CI attachée au head `4f96e14e…` était terminée avec succès (run `40125422904`). PR passée Ready for review puis fusionnée par **squash**, conformément à l'autorisation du propriétaire. Le squash n'ajoute que ces cinq documents.

La présente proposition est isolée sur `docs/nolio-v2-phase1-proposal`, créée depuis le résultat de fusion. Elle ajoute seulement ce document. Elle ne crée aucun module, test exécutable, migration SQL, secret, application Nolio ou déploiement.

**Périmètre de codage proposé après validation :** un accès Nolio v2 exclusivement serveur, limité aux lectures ci-dessous, une association locale explicite et un écran de consultation. Développement et validation exclusivement avec réponses simulées. Aucune connexion réelle ne fait partie de ce lot. L'association future constitue une écriture **dans TFCLab**, pas une écriture dans Nolio ; elle n'est pas réalisée maintenant.

Exclus : publication et simulation de publication (y compris batch/dry_run), PATCH/POST/DELETE Nolio, import des réalisés/records/HRV, écriture de zones, OAuth fonctionnel, webhooks même minimaux, cron, file de jobs, migration automatique des IDs v1, moteur physiologique et appels IA. Pas de système QA généraliste.

## 1. Fichiers existants réutilisables

Les chemins suivants existent dans le code de référence ; réutiliser leurs responsabilités ou composants ne signifie pas copier les faiblesses de l'authentification v1.

| Existant | Réutilisation proposée | Frontière à respecter |
|---|---|---|
| `src/components/ConfigurationPage.tsx` | Point d'entrée d'une section Nolio v2 distincte ; chargement de l'athlète local sélectionné | Ne pas modifier boutons, état, connexion ou déconnexion v1. Ne pas lire de PAT dans ce composant |
| `src/contexts/AuthContext.tsx` | `useAuth`, session Supabase pour invoquer le serveur | La session client ne suffit pas : contrôle JWT/sujet et propriétaire côté Edge |
| `src/contexts/AthleteContext.tsx`, `src/hooks/useCloudData.ts` | Sélection et identité locale des athlètes, types locaux existants | Ne pas changer la source des snapshots, plans, charges ni les règles de diagnostic |
| `src/integrations/supabase/client.ts` | Client navigateur existant pour appeler les nouvelles Edge Functions | Fichier généré à laisser intact ; aucune requête directe navigateur→Nolio, aucun secret `VITE_*` |
| `src/components/NolioLinkAthletesDialog.tsx` | Composants Dialog/Select, présentation des candidats et confirmation de sélection comme référence UX | Nouveau composant v2 séparé ; ne pas copier `Number(nolio_id)`, l'écriture client de liens ni le matching automatique par nom |
| `supabase/functions/nolio-list-athletes/index.ts` | Référence du parcours JWT→athlète local→appel distant et de la restitution UI | Pas de réutilisation de son refresh OAuth, du client ID, des routes v1 ou de sa table de tokens |
| `supabase/functions/_shared/cors.ts` | Compréhension du mécanisme OPTIONS et des headers Supabase | Le helper actuel autorise `*` et plusieurs méthodes ; créer une politique locale v2 sur origines configurées, sans changer les consommateurs v1. CORS ne remplace jamais l'authentification |
| `src/components/ui/*`, TanStack Query déjà initialisé dans `src/App.tsx` | Cartes, états chargement/erreur, sélection de période, cache mémoire | Aucun nouveau provider général, aucune persistance locale des réponses Nolio |
| `src/integrations/supabase/types.ts` | Types DB générés après la future migration locale | À régénérer uniquement lors de l'implémentation approuvée ; aucune modification maintenant |
| `.github/workflows/ci.yml`, `vitest.config.ts` | Suites existantes Vitest et découverte des tests Deno Edge | Les autres fonctions Deno sont exécutées avec `--no-check` : prévoir un contrôle de types ciblé des nouveaux modules, pas une refonte de la CI |

Ne pas réutiliser `nolio_tokens`, les fonctions de refresh dupliquées ni le state OAuth historique. `NolioSendPlanCard`, `AIPlanViewer`, `NolioSessionButton` et les générateurs de structures ne sont pas des points d'intégration pour cette phase.

## 2. Nouveaux modules nécessaires et interface fonctionnelle

Tous les chemins de cette section sont **proposés**, pas créés.

| Module | Responsabilité limitée |
|---|---|
| `supabase/functions/_shared/nolio-v2/contracts.ts` | DTO nécessaires au périmètre ; types du contrat et validations minimales de réponse, champs absents/null conservés. Pas de modèle inventé des workouts complexes |
| `_shared/nolio-v2/config.ts` | Configuration serveur, activation par défaut désactivée, propriétaire local autorisé, références d'identité attendues ; contrôle de présence des secrets sans en afficher la valeur |
| `_shared/nolio-v2/auth.ts` | Provider PAT serveur, contrôle de l'appelant TFCLab et de son athlète ; interface interne extensible vers OAuth, sans implémentation OAuth ou refresh |
| `_shared/nolio-v2/client.ts` | Base URL fixe, méthode GET uniquement, routes autorisées, timeout, erreur normalisée, lecture des quotas, `fetch` injectable |
| `_shared/nolio-v2/pagination.ts` | `limit`, `starting_after`, `has_more`, contrôle d'avancement, bornes et reprise explicite d'une consultation interrompue |
| `_shared/nolio-v2/adapters.ts` | Quantités et IDs opaques, athlètes, sports, zones et événements planifiés → DTO de consultation séparés des modèles scientifiques |
| `_shared/nolio-v2/cors.ts` | Origines configurées, OPTIONS, headers nécessaires ; pas de modification du helper v1 |
| `supabase/functions/nolio-v2-read/index.ts` | Actions applicatives de consultation et métadonnées de connexion ; authentification avant tout appel distant |
| `supabase/functions/nolio-v2-links/index.ts` | Gestion future des seules correspondances locales : lecture, association explicitement confirmée et retrait du lien. Validation de propriété locale et de présence/accès dans les candidats Nolio |
| `src/lib/nolio-v2/types.ts` | DTO d'affichage expurgés, sans secrets ou payloads de debug |
| `src/hooks/useNolioV2Read.ts` | Appels Edge via session Supabase, annulation des lectures, cache mémoire partitionné par utilisateur/athlète/période et invalidé à la déconnexion |
| `src/components/nolio-v2/NolioV2ReadOnlyPanel.tsx` | Statut, scopes/quota, athlète associé, catalogue sports/zones et calendrier en consultation |
| `src/components/nolio-v2/NolioV2LinkDialog.tsx` | Association explicite, identité des deux côtés, refus d'accès visible ; aucun choix fondé seulement sur la similarité du nom |

Modifications applicatives envisagées : uniquement montage du panneau dans `ConfigurationPage`, types DB générés et configuration des **nouvelles** fonctions. Pas de nouvelle route obligatoire dans `App.tsx`, pas de changement du callback v1. L'interface « connectée » v2 signifie PAT serveur présent et identité/app/scopes vérifiés ; elle ne sera pas déduite de l'existence d'un token v1.

### Lectures distantes autorisées après une éventuelle activation ultérieure

Toutes les routes sont relatives à `https://www.nolio.io`, slash final requis. L'implémentation de ce lot les exercera seulement par mocks.

| Route GET | Finalité et contraintes |
|---|---|
| `/api/v2/app/` | `type`, `scopes`, `quota.hourly_limit/hourly_remaining/daily_limit/daily_remaining`; attendre `type=personal`. `name` n'est pas un identifiant stable ; ce schéma ne fournit pas d'ID d'application |
| `/api/v2/me/` | Confirmer l'identité du propriétaire Nolio attendu ; empêche qu'un PAT d'un autre compte soit accepté par erreur |
| `/api/v2/me/athletes/` | Tous les athlètes coachés, `id:usr_…`, `name`, `has_api_access`; toutes pages avant déclaration de liste complète |
| `/api/v2/sports/` | Catalogue `spt_…` pour interpréter les disciplines, sans anciennes constantes numériques |
| `/api/v2/settings/sports/?athlete=usr_…` | Profils sportifs de l'athlète et sports actifs ; `spu_…` est un profil, seul son champ `sport:spt_…` désigne la discipline |
| `/api/v2/settings/zones/final/?athlete=usr_…` | Zones finales en lecture ; filtre sport si utile ; conserver streams, bornes et unités. Aucune activation ni synchronisation des zones |
| `/api/v2/planned/trainings/`, `/planned/competitions/`, `/planned/cycles/`, `/planned/notes/` | Consultation des quatre types principaux ; fenêtre `date_from/date_to`, athlète, curseurs séparés par collection. La liste trainings ne suffit pas à décrire le calendrier |
| `/api/v2/planned/messages/`, `/planned/quizzes/` | Compléter les autres objets du calendrier planifié ; lire les métadonnées utiles à l'affichage, pas de conversations ni résultats. Aucune programmation/envoi de message |

Les deux dernières lignes utilisent toutes le préfixe `/api/v2/`. Charger les collections à la demande, pas toute l'histoire. Proposition de borne produit : période initiale de 28 jours, consultation maximale de 90 jours par requête utilisateur, limite 100 éléments par page et plafond de 20 pages par collection et consultation. Si la borne est atteinte, marquer **incomplet**, proposer de restreindre la période ou poursuivre explicitement ; ne jamais présenter une troncature comme complète. Ces bornes sont des choix TFCLab à valider, pas des limites Nolio.

Les détails de workouts ne sont pas nécessaires à l'acceptation de cette phase. Afficher `has_structured_workout` si disponible ; ne pas transformer un arbre libre en prescription interne. Un détail en lecture pourrait être ajouté ensuite sur demande explicite, sans bloquer la connexion et les listes.

### Scopes et erreurs

Scope minimal demandé pour le PAT : **`planned:read`**. Le contrat autorise les lectures de référence d'athlètes, sports, profils sportifs et zones finales avec ce scope ; `settings:read` n'est donc pas demandé d'office. Aucun `planned:write/delete`, `real:*`, `metrics:*`, `app:manage` ou scope de messagerie n'est nécessaire ici. Le schéma de sécurité PAT avec liste vide n'enlève pas les contrôles de scopes effectifs.

Contrôler `/app/` au démarrage d'une consultation et mettre à jour le budget avec les quatre headers RateLimit après chaque réponse. Réutiliser brièvement en mémoire les résultats de référence dans le même contexte d'appel, sans prétendre qu'un cache en mémoire d'une instance Edge régule globalement l'application. Sérialiser les pages d'une consultation, pas de fan-out illimité. Pas de scheduler distribué tant qu'il n'y a qu'un pilote manuel ; le serveur Nolio reste arbitre du quota partagé.

- 401 PAT : arrêt de la consultation, état « accès à reconfigurer » ; aucun refresh OAuth.
- 403 : différencier `wrong_api_version`, `pat_required`, `missing_scope`, `athlete_api_access_denied`, `team_scope_forbidden`, `team_membership_required`, `api_access_denied`. Aucun retry aveugle ni tentative via une autre identité.
- 404 : inconnu ou non visible, pas une preuve que l'athlète ou la séance a été supprimé.
- 409 : restituer un conflit normalisé, sans retry automatique, même si non attendu pour les lectures du périmètre.
- 429 : exposer `Retry-After` et les budgets connus ; interrompre proprement, conserver le curseur dans le contexte autorisé, permettre une reprise explicite. Pas de boucle longue en Edge ni de job cron.
- 503/réseau : GET seulement, deux nouvelles tentatives au maximum, backoff+jitter bornés et respect d'un timeout global ; échec final avec couverture partielle visible.
- Réponse invalide : erreur de contrat localisée ; pas d'acceptation silencieuse d'une liste vide. Champs restreints/null ne deviennent jamais zéro.

Les quotas sont dynamiques par application, pas par onglet ou coach. Ne pas supposer les budgets à partir de l'abonnement. Une clé à portée plus large ne donne pas le droit d'activer d'autres routes : allowlist GET stricte dans le client.

## 3. Éventuelles migrations Supabase

**Une seule migration additive proposée**, pour l'association locale explicite. Aucun changement de type de `athletes.nolio_id` et aucune migration ou révocation du stockage v1.

Table proposée `public.nolio_v2_athlete_links` :

| Champ / contrainte | Utilité |
|---|---|
| `id uuid` primaire | Identité locale du lien |
| `coach_id uuid` → `auth.users`, `athlete_id uuid` → `athletes` | Propriétaire du lien et athlète TFCLab ; suppression locale en cascade à la suppression de ces entités |
| `connection_key text` | Alias serveur fixe du PAT personnel, sans secret ; par exemple un alias TFC administré côté serveur, jamais choisi librement par le navigateur |
| `nolio_user_id text` | ID public `usr_…` complet ; aucun cast en integer |
| `access_status text`, `last_verified_at timestamptz` | État du dernier contrôle, sans le traiter comme une autorisation permanente |
| `created_at`, `updated_at timestamptz` | Traçabilité minimale du lien, pas historique des données sportives |
| Uniques `(coach_id, connection_key, athlete_id)` et `(coach_id, connection_key, nolio_user_id)` | Une correspondance de chaque côté dans ce périmètre ; collision = erreur explicite à résoudre |

Le lien d'appartenance `athletes.coach_id = coach_id` est revérifié sur chaque action serveur et dans la politique SELECT RLS par `EXISTS` sur l'athlète. RLS activée, SELECT uniquement pour son propriétaire local ; pas de SELECT global. Aucune mutation de la table accordée à `anon`/`authenticated` : seules les actions Edge contrôlées écrivent, après validation JWT, propriétaire configuré, propriété de l'athlète et identité distante. La clé service-role contourne RLS : les contrôles applicatifs restent donc impératifs. Si un athlète change de coach, l'ancien lien ne devient pas accessible au nouveau coach automatiquement.

Pas de `nolio_v2_connections`, coffre multi-tokens, journal contenant des réponses, cache de calendrier en DB, snapshots, file, inbox ni table d'observations dans ce lot. Le PAT reste un secret Edge. L'alias et le provider permettent d'introduire plus tard une vraie table de connexions OAuth sans exposer le secret aujourd'hui.

Les réponses d'athlètes, zones et calendrier restent transitoires : mémoire de requête et cache React non persistant, pas de localStorage/IndexedDB/exports automatiques ; réponses HTTP sensibles `Cache-Control: no-store`. Les erreurs et états ne stockent pas le contenu distant. Le retrait d'un lien ne touche ni la colonne v1 ni les données chez Nolio.

## 4. Modèle de sécurité

1. **Un seul responsable TFCLab autorisé pour le pilote.** Configuration serveur proposée `NOLIO_V2_ENABLED` (désactivé par défaut), `NOLIO_V2_OWNER_USER_ID`, `NOLIO_V2_EXPECTED_NOLIO_USER_ID`, `NOLIO_V2_CONNECTION_KEY`, origines permises et secret `NOLIO_V2_PAT`. Noms proposés, aucune valeur créée ou lue pendant cette préparation. Aucun partage implicite du PAT avec d'autres comptes TFCLab, même staff. Une équipe de coachs délégués est une extension à valider séparément.
2. Toute Edge vérifie le JWT Supabase réellement, présence d'un sujet utilisateur valide et adéquation au responsable configuré avant d'obtenir le PAT. Un Bearer présent ou une clé anon JWT ne suffit pas. Le statut de connexion lui-même est protégé.
3. Le serveur résout l'athlète à partir de son ID local. Le navigateur n'impose ni un `usr_…` arbitraire pour la lecture, ni un compte, une route distante ou des headers. La sélection d'un candidat lors de la liaison est seulement une intention : le serveur la revalide via la liste Nolio autorisée et `has_api_access` avant sauvegarde locale.
4. Aucun auto-matching sur nom et aucun transfert automatique depuis `athletes.nolio_id`. Afficher les deux identités, le contexte de connexion et demander une confirmation explicite. Un candidat `has_api_access=false` est visible comme refusé mais ne peut être activé ; refus ultérieur suspend les lectures et efface le cache correspondant.
5. Le PAT et sa valeur ne figurent jamais dans le bundle, les réponses, erreurs, logs, tables publiques, localStorage ou formulaires navigateur. Ne pas demander de le copier dans le chat. Le serveur appelle une origine fixe et refuse redirections vers d'autres origines ; pas de téléchargement de fichiers dans cette phase.
6. Logs techniques limités : ID de corrélation interne, action, statut/code stable, durée, compteurs et budgets. Pas de noms, listes d'athlètes, IDs personnels en URL loggée, contenu de séance, bornes de santé, token même partiel ou réponses brutes Nolio.
7. UI strictement consultative pour Nolio. L'association/retrait local n'est pas un bouton d'autorisation ou de révocation Nolio. Ne jamais faire croire que déconnecter TFCLab révoque automatiquement le PAT chez Nolio.
8. Les zones Nolio ne deviennent pas la doctrine ou des entrées de recalibration du moteur. Leur consultation ne modifie ni snapshots, ni FTP/VMA/CSS/VO2max, ni modèles scientifiques.

**Fin d'accès et activation réelle :** les webhooks sont explicitement hors périmètre demandé, même si l'architecture d'ensemble prévoit `access.ended`. Les tests simulés doivent couvrir le refus d'accès, l'invalidation du cache et la suppression du lien local. Avant toute exploitation réelle avec conservation d'identifiants ou données personnelles, une procédure vérifiable de réconciliation `/app/users/`, d'arrêt et de suppression sous 30 jours devra être approuvée et opérationnelle, ou une limitation sans conservation devra être explicitement retenue. Ce n'est pas une autorisation d'ajouter maintenant webhooks/cron/import. La seule absence d'une personne dans `/me/athletes/` sur une page incomplète n'autorise pas une purge automatique. Le lancement réel fera l'objet d'un point de contrôle distinct.

## 5. Tests simulés et critères d'acceptation

Les noms suivants sont proposés pour les futurs tests : tests Deno dans le dossier `supabase/functions/nolio-v2-read/` et `nolio-v2-links/` avec handlers séparés de `Deno.serve`, tests du client/adaptateurs par dépendances injectées, tests Vitest du panneau et du dialogue. Réutiliser l'infrastructure existante ; pas de harnais QA global.

Le mock HTTP accepte uniquement les URLs attendues et échoue sur tout appel non prévu. Le fake de DB ne contient que des UUID et profils synthétiques. Aucun test ne charge un PAT réel ou ne dépend d'un abonnement Nolio. Ajouter un garde d'interdiction de l'egress réseau pendant l'exécution des tests ciblés ; l'éventuel téléchargement préalable des dépendances Deno est distinct d'un appel API. Les tests n'importent ni handlers IA ni déclencheurs de production. Aucun de ces tests n'est créé ou exécuté dans cette préparation documentaire.

| Groupe de tests | Critères d'acceptation vérifiables |
|---|---|
| Authentification et secrets | JWT absent/invalide/anon/sans sub, autre coach et autre athlète refusés avant tout appel Nolio ; secret absent ou flag désactivé = état contrôlé ; PAT absent de toutes réponses/logs rendus |
| Identité et scopes | `/app/` personal et planned:read validés ; mauvais type ou scope absent bloque le périmètre ; compte `/me/` inattendu refuse la connexion ; aucune demande d'OAuth/refresh |
| Quotas | Les quatre valeurs de quota et headers sont lus ; budget jour et heure pris en compte ; 429 produit attente explicite sans perdre le curseur ; pas de plafond horaire inventé |
| Liaison locale | Confirmation explicite, candidat revalidé, accès refusé bloqué, collision d'unicité explicite ; aucune mutation de `athletes.nolio_id` ou `nolio_tokens` ; retrait local n'appelle aucun DELETE Nolio |
| Accès DB | Une session coach A ne lit pas les liens B ; mutations directes client interdites ; perte de propriété de l'athlète invalide accès au lien ; service-role non utilisé avant contrôle métier |
| Pagination | Jeux 0/1/100/plus de 100, même date, curseur répété, limite de pages atteinte, interruption puis reprise ; complète seulement après has_more=false sur chaque collection |
| Sports et zones | spt/spu distingués ; unités/valeurs texte de zones préservées ; absence ou refus partiel visible sans faire échouer les autres lectures permises ; aucune écriture de zones |
| Calendrier | Trainings, compétitions, cycles, notes, messages et questionnaires planifiés distingués ; bornes de dates inclusives, passage de mois/année et absence de décalage de date civile ; aucune course omise par lecture de trainings seul |
| Erreurs et restrictions | 400/401/403 par cause/404/409/429/503/réseau/JSON invalide ; null et restriction ne deviennent ni zéro ni liste vide certaine ; état partiel affiché ; retry borné aux GET transitoires |
| Interface / coexistence | Un panneau v2 sans effet sur le parcours v1 ; lien v1 conservé ; changer d'utilisateur ou de lien efface les caches v2 ; aucune indication « synchronisé » fondée sur le seul token v1 |
| Interdictions du lot | Spy HTTP : GET Nolio uniquement ; aucune route batch, token OAuth, real, messaging conversations, webhook ou IA appelée ; aucun stockage d'activités ou de calendrier en DB |

Acceptation globale proposée : les fixtures multi-athlètes et multipages sont consultables avec bon destinataire, contexte de droits, couverture explicite et aucune fuite de PAT ; le contrôle de types ciblé et les suites ciblées passent ; le diff d'implémentation futur reste limité aux modules et migrations validés. **La réussite des mocks ne vaut pas validation du compte, abonnement, quota ou consentement réel.**

## 6. Actions manuelles futures dans Nolio

Aucune action à effectuer pour examiner cette proposition ou pour développer les tests simulés. Pour un pilote réel, seulement après autorisation distincte :

1. Se connecter au compte responsable Two For Coaching qui coache effectivement les athlètes du périmètre ; vérifier son droit d'accès API/abonnement.
2. Créer une **nouvelle application API v2 personnelle**, sans réutiliser l'application v1 ; noter localement son usage et son responsable. L'audit n'en crée aucune.
3. Configurer l'application et son PAT avec le seul besoin `planned:read`. Si la création fournit par défaut davantage de scopes, les restreindre au minimum disponible et vérifier les scopes effectifs via le futur diagnostic serveur. Aucun scope d'écriture demandé.
4. Transmettre le PAT uniquement au gestionnaire de secrets serveur autorisé, hors chat et hors navigateur TFCLab ; configurer l'identité locale autorisée, le compte Nolio attendu et les origines. Cette configuration Supabase future n'est ni une création de secret ni un déploiement autorisé aujourd'hui.
5. Vérifier que les athlètes choisis autorisent l'accès API et sont réellement coachés par ce compte. Les refus doivent rester respectés ; aucune demande de lever les restrictions d'écriture d'une équipe n'est nécessaire pour cette phase de lecture.
6. Conserver v1 inchangée. Plus tard, sélectionner explicitement les correspondances dans le dialogue v2 ; ne pas déduire un ID usr à partir d'un integer v1.
7. Définir responsable de rotation/révocation et procédure de retrait dans les réglages Nolio, ainsi que le contrôle des fins d'accès avant activation. Aucune révocation/rotation/création automatique par TFCLab dans ce lot.

Les écrans exacts de configuration et les quotas disponibles devront être confirmés dans le compte Nolio lors de cette étape ultérieure ; ils ne sont pas vérifiés par cet audit sans connexion réelle.

## 7. Risques de coexistence avec v1

| Risque | Mesure proposée |
|---|---|
| Confondre les deux connexions ou déconnecter la mauvaise | Sections/statuts/libellés séparés ; clés serveur v2 distinctes, aucun accès à nolio_tokens depuis v2 |
| Associer automatiquement un mauvais athlète à partir du nom ou de l'integer v1 | Lien v2 indépendant, choix confirmé et validé côté serveur ; ne jamais écrire dans nolio_id |
| Prendre le PAT du responsable pour une délégation à tous les coachs | Un responsable local autorisé en phase 1 ; extension multi-coachs/OAuth séparée |
| Polling des deux intégrations et budgets méconnus | Lectures v2 manuelles bornées, pas d'import périodique ; quotas par app lus réellement, ne pas supposer un budget commun ou indépendant de la v1 |
| Modifier indirectement la génération de plan par nouvelles données | DTO de consultation isolés ; aucune injection dans snapshots, daily_training_load, références ou moteurs |
| Bibliothèque/workout v1 pris pour un arbre v2 compatible | Aucun export ni compilation de workout ; simple indicateur de structure en lecture |
| Risque historique de tokens/logs/state v1 non corrigé | Les défauts restent documentés ; ne pas les recopier ni prétendre que la phase 1 sécurise rétroactivement la v1 |
| Confondre fin d'accès, panne ou pagination incomplète | Blocage de lecture et état explicite ; procédure d'accès/purge à valider avant exploitation réelle, sans webhook ajouté dans ce lot |
| Retour arrière difficile | Désactiver le flag v2 et retirer son panneau ; données et fonctionnement v1 intacts ; aucune donnée Nolio à annuler puisque client GET uniquement |

## Décision sollicitée avant implémentation

Valider ce périmètre : **provider PAT serveur à responsable unique, lectures listées, une table additive de liens locaux, panneau distinct, tests entièrement simulés ; aucun appel réel, déploiement, publication, webhook ou import réalisé.** Les bornes proposées de consultation et la couverture des six types d'objets planifiés sont incluses dans cette décision.

Après validation seulement, une branche fonctionnelle pourra être créée depuis le `main` alors courant, en recontrôlant ses instructions et les écarts au code de référence. Le passage aux données réelles restera une décision ultérieure avec secrets fournis hors chat et traitement des fins d'accès vérifié.

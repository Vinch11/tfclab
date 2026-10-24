# TFCLab — Plan progressif de migration Nolio v2

**Aucune phase d'implémentation autorisée par ce document.** La phase 0 est documentaire. Les autres phases nécessitent validation explicite du propriétaire du projet ; l'ouverture d'une PR documentaire ne vaut pas autorisation d'appeler Nolio, de créer une application, d'importer des athlètes ou de publier. Référence : main `d736e4763da33eda21c9e56a27d587dbecf546b6`, OpenAPI 2.0.0 transmis, empreinte dans la [matrice](NOLIO_V1_V2_MIGRATION_MATRIX.md).

## Règles de réalisation

- Conserver les handlers, endpoints, secrets et chemins v1 pendant la coexistence. Aucun changement de génération de plan ni de doctrine physiologique embarqué dans les PR de migration.
- Commencer avec PAT personnel si un responsable Two For Coaching couvre le périmètre ; reporter OAuth partenaire à l'ouverture externe. Choisir OAuth équipe plus tôt seulement si besoin multi-coachs réellement établi. Confirmer accès Nolio actif, scopes, options d'équipe et rôle du propriétaire avant utilisation.
- Une connexion en lecture seule signifie aucune écriture **Nolio métier**, mais implique persistance protégée TFCLab et suppression conforme. La gestion des fins d'accès n'attend pas la dernière phase : garde minimal en phase 1, synchronisation événementielle complète en phase 4.
- Contrat v2 incomplet pour workout : obtenir le complément avant certification d'export complexe. Ni renommage mécanique `structured_workout→workout`, ni suppression automatique des structures.
- Exécuter d'abord tous tests avec fixtures synthétiques et HTTP mocké. Tests réels uniquement dans un environnement autorisé séparément, sans activer les parcours Gemini. Ne pas lancer un test ou harnais qui appelle réellement une IA.
- Nouvelle configuration sans bascule globale : drapeaux serveur par tenant/connexion pour lecture v2, import, export, webhook. Les libellés de flags sont des propositions, pas des variables existantes.
- Prévoir un seul écrivain pour une occurrence : ne jamais utiliser v1 et v2 simultanément sur la même séance. Une marche arrière vers v1 ne doit pas recréer les séances v2 par l'ancien mécanisme id_partner.
- Définir le calendrier de bascule avant le **30 juin 2027** (arrêt v1 et fin du convertisseur d'IDs) ; viser un pilote terminé plusieurs semaines avant, marge à fixer selon disponibilité Nolio.

## Phase 0 — Audit et spécification (livrables présents)

**But :** décider sur preuves de code et contrat, sans toucher au produit.

**Livrables :** [matrice](NOLIO_V1_V2_MIGRATION_MATRIX.md), [architecture](NOLIO_V2_ARCHITECTURE.md), [opportunités](NOLIO_V2_OPPORTUNITIES.md), ce plan et [synthèse exécutive](NOLIO_V2_EXECUTIVE_SUMMARY.md), uniquement dans `docs/nolio-v2/`.

**Travail effectué :** cartographie des chemins atteignables, endpoints et stockage ; inventaire des 301 opérations et 311 schémas ; analyse des réserves contractuelles, quotas, consentements, batch, reprise et purge ; architecture et backlog de tests proposé. Références de code figées au SHA, aucun audit d'activité en production présumé.

**Vérifications documentaires :** JSON chargé intégralement, OpenAPI/version/empreinte calculés, références locales résolues, inventaires couvrant chaque opération/schéma ; liens entre documents et chemins réels contrôlés ; diff limité aux cinq documents. Les tests applicatifs ne sont pas exécutés pour ce changement documentaire.

**Critères d'acceptation :** responsable TFCLab valide les dix décisions, choisit mode d'application pour le pilote, décide périmètre de données et politique de purge ; questions bloquantes envoyées à Nolio par une personne autorisée. L'audit lui-même n'envoie aucun message externe.

**Pré-requis de sortie :** accord explicite d'implémentation ; dossier de réponses Nolio ou limitations de pilote acceptées ; accès à un environnement de test adapté fourni ultérieurement. Le schéma workout complet est bloquant pour export complexe, pas pour développement de lectures mockées.

## Phase 1 — Connexion v2 en lecture seule

**But :** démontrer l'identité, les droits, les unités et la complétude avec un périmètre limité. Au début, fixtures seulement ; tout accès Nolio réel sera un acte ultérieurement autorisé.

**Créer :**

- `_shared/nolio-v2/{client,auth,pagination,contracts}.ts`, adaptateurs athlete/sport/zones/metrics/real/planned.
- `supabase/functions/nolio-v2-read/index.ts` : statut de connexion, profil, athlètes, sports/zones, calendriers, listes de métriques ; aucun POST métier distant.
- Migrations nouvelles pour connexions privées, liens d'athlètes/ressources, sync_state et provenance minimale, RLS et statut public expurgé. Aucun changement de type de `athletes.nolio_id`, aucune suppression de `nolio_tokens` v1.
- `src/hooks/useNolioV2Connection.ts`, section v2 de configuration, sélecteur de lien avec confirmation des ambiguïtés ; idéalement composant dédié importé par `ConfigurationPage`.
- Réconciliation complète `/app/users/` et fonction de purge ; récepteur minimal `access.ended` avant persistance de données réelles. Obtenir clarification PAT admin si OAuth choisi.
- Contrat épinglé dans un emplacement documentaire ou de test approuvé, avec empreinte ; génération de types limitée à cette intégration. Son ajout au dépôt se fera après accord d'implémentation, pas dans cette PR à cinq livrables.

**Modifier à terme :** types/vues de connexion côté UI ; `src/integrations/supabase/types.ts` après migration ; `supabase/config.toml` pour nouvelles fonctions seulement ; `src/App.tsx` / redirection si nécessaire pour retour OAuth futur. Le callback v1 défectueux est un sujet distinct, pas corrigé dans le présent audit.

**Migration IDs prévue :** exporter un inventaire local des IDs legacy sans données superflues ; convertir users/sports puis metric_item/value et planned/real event selon besoin via `/migration/ids/` (≤100 IDs, coût N+1). Sauvegarder correspondence et statut ; vérifier visibilité et type ; `not_found` → traitement manuel, pas remplacement par ID calculé. Comparer les liens au résultat de `/me/athletes/`; nom seul interdit comme preuve. Pour les séances dont l'ID distant v1 n'est pas conservé dans une table fiable, les logs de publication ne constituent qu'un indice : réconciliation manuelle ou absence de mapping, jamais adoption d'un événement homonyme sans validation.

**Tests ciblés :**

- JSON fixtures conforme aux schémas ; client PAT ne rafraîchit jamais ; JWT absent/anon/sujet invalide ; accès croisé entre deux coachs refusé avant service-role ; destinataire tiré du mapping serveur.
- Pagination 1/100/>100, dernière page, même date, curseur bloqué, crash après page et reprise sans doublon ; fenêtres inclusives ; training **et** competition ; sport spt/spu.
- 401/403 par cause/409/429/503, Retry-After, budgets heure/jour ; 204 streams ; quantités null et restrictions ; HRV plafonds et records sans curseur.
- Secrets indisponibles via REST Supabase client, statut expurgé et absence de données sensibles dans logs ; purge end-to-end avec dérivés simulés, jobs et restauration.

**Acceptation :** toutes les pages d'un jeu synthétique multi-athlètes récupérées, zéro donnée d'un autre coach, refus d'athlète respecté sans retry ; status de couverture visible ; aucun secret livré au navigateur ; nouveau pipeline incapable d'écrire un calendrier. Sur pilote ultérieur, compte/app/scopes identifiés et quotas observés, écarts de mapping revus par coach. Fin d'accès suspend et purge dans le délai démontrée.

**Pré-requis :** validation phase 0, provisionnement ultérieur par personne autorisée d'une nouvelle app/token, accès API actif et règles d'équipe connues, politique stockage/purge opérationnelle. **OAuth partenaire n'est pas nécessaire** pour terminer cette phase en situation 1.

## Phase 2 — Export contrôlé et fidèle

**But :** publier uniquement la prescription prévisualisée et approuvée, en conservant structure et éditions Nolio.

**Créer :**

- `adapters/planned.ts` et compilateur workout versionné, mapping d'occurrences et de nœuds ; `publication.ts` avec différentiel, approbation immuable, états d'opération et résultat ambigu.
- `nolio-v2-preview`, `nolio-v2-publish` ; tables publications/opérations et worker durable Postgres si chunks/quotas dépassent un appel borné.
- UI de prévisualisation par séance, totaux/date/discipline, conflits et avertissements ; résultat par opération avec options de reprise/annulation réellement disponibles.

**Modifier à terme :** `AIPlanViewer` et `NolioSessionButton`, `DiagnosticPage` pour pointer vers le nouveau flux **sous flag** ; adaptateurs à partir de `testingWeekNolioSessions` et structures existantes. `NolioSendPlanCard` non utilisé ne doit pas devenir le point principal par commodité. Ne pas déclencher `nolio-batch-generate`, ni toucher aux règles du moteur pour « faire passer » l'export.

**Sous-étapes :**

1. Certifier les cas simples sur contrat complémentaire ; enrichir sans mutation la représentation interne, garder unités et références. Dates et athlète dérivés côté serveur.
2. Tester entraînements course/vélo/natation/repos/récupérations/doubles séances, compétitions et cycles ; tests séparés pour start-to-run/RPE, renforcement, répétitions imbriquées, cibles absolues/% et enchaînements. Un cas non spécifié reste bloqué.
3. Générer opérations ≤100, relire revisions et état partagé ; dry_run, inspection de tous résultats, résumé coach.
4. Approuver hash et version, puis publier exactement le contenu approuvé ; PATCH avec révision ; mapper IDs par succès. Zéro delete-before-create.
5. Résultats partiels, traitement unknown, contrôles post-publication et inspection recovery ; annulation seulement quand déclarée possible. Aucune écriture de compensation automatique après erreur ambiguë.

**Tests requis :** fidélité sémantique et conservation de durée/distance/répétitions/récupérations/cibles ; conversion d'unités et zones, aucune valeur de référence inventée ; dates DST/semaine incomplète/fin d'année, deux séances même jour et réexport d'une sous-sélection ; ID occurrence indépendant du numéro de fiche et date d'envoi ; double clic concurrent ; lot N+1, dry+commit 2N+2 ; 101 opérations découpées ; HTTP 200 avec échec interne ; échec après premiers succès, après commit avant réponse, après réponse avant écriture mapping ; 409 entre aperçu et publication ; approbation expirée/modifiée/rejouée ; update non annulable, refus undo de team-owned, droit perdu.

**Acceptation :** un plan synthétique multidisciplinaire puis un petit pilote ultérieurement autorisé est reproduit avec dates/unités/contenu conformes ; aucune séance sans approbation ; succès partiels identifiés un à un ; aucun doublon certain dans réessais/double clic ; résultat ambigu bloqué pour résolution, aucune promesse d'exactly-once distante. Édition Nolio entre lecture et mise à jour → 409/conflit visible, sans écrasement. Zéro ajout automatique de récupérations ou conversion de prescription cachée. Aucun plan IA auto-publié.

**Pré-requis :** phase 1 acceptée ; scopes planned:write et éventuellement delete approuvés ; options multi-coachs accordées ; forme structurée complète validée avec Nolio ; portée REST des confirmations/conflits clarifiée ou stratégie compensatoire explicite et limitation du pilote acceptée. Pas de dépendance à la création d'une bibliothèque distante pour publier directement des événements.

## Phase 3 — Réalisés, métriques et retours

**But :** tableau prévu/réalisé fiable, sans transformer les indicateurs en diagnostic.

**Créer :** `nolio-v2-import-real`, adaptateurs observations/debrief/quiz/records/HRV, store minimal d'observations, écran prévu/réalisé et indicateurs de couverture. Relier événements par `planned`; plusieurs résultats possibles et non rapprochés visibles. Job reprenable si plusieurs athlètes/fenêtres.

**Modifier à terme :** `TrainingLoadPage`, `NolioFitPickerDialog`, `RecordsTransparencyView`, configuration d'import ; ajouter un adaptateur vers les consommateurs historiques (`daily_training_load`, snapshots) **seulement avec sémantique et source explicites**. Aucun remplacement des calculs dans `src/lib/v2` ni des algorithmes de diagnostic. Si le modèle historique ne peut représenter Foster vs TSS/nulls, garder la nouvelle donnée dans sa couche dédiée jusqu'à décision séparée, plutôt que fausser la colonne tss.

**Tests :** courses incluses, multisports sans double comptage, planned null/multiples, time_in_zones absent ou incomplet, capteurs absents, fichier interdit/expiré/204, RMSSD restrictions et plusieurs protocoles, questionnaires sans réponses, catalogue de records et s/km vs s/100m vs m/s ; Coggan source rpe pas double preuve ; aucun zéro pour erreur/absence/restriction ; suppression/modification retirant correctement une charge précédente ; couverture partielle conservée ; purge dérivés et non-régression des consommateurs existants sur fixtures approuvées.

**Acceptation :** chaque chiffre porte unité/source/date/couverture ; activité manuelle identifiée comme telle ; absence de réalisé affichée « à vérifier » et non annulation certaine ; CTL/ATL/TSB identifiés « modèle Coggan Nolio » et non diagnostic ; données restreintes non reconstruites. Le coach sait comparer prescription publiée, prévu courant, résultat et retour subjectif. Imports historiques et journaliers ne s'écrasent pas entre deux pipelines.

**Pré-requis :** phases 1 et 2 pour comparaison au plan effectivement publié (lecture seule des plans existants possible indépendamment), mapping des métriques, rétention/purge fonctionnelles, scopes real/metrics read. Les streams ne sont pas indispensables au premier dashboard.

## Phase 4 — Synchronisation événementielle complète

**But :** absorber changements, suppressions et interruptions avec conflits explicites.

**Créer/étendre :** `nolio-v2-webhook`, `webhookSignature.ts`, inbox unique app+event_id, worker, réconciliation `app/users` et calendriers, tombstones, leases et suivi de livraison/désactivation. Étendre le récepteur minimal access.ended de phase 1 plutôt que déployer un second callback (un seul par application).

**Modifier à terme :** `supabase/config.toml` pour récepteur public exempt de JWT **avec HMAC obligatoire**, statut d'intégration et UI de conflits ; cron de réconciliation distinct de v1 et authentifié. Configuration/abonnements webhook effectués seulement après autorisation opérationnelle.

**Tests :** signature correcte sur corps brut, espaces/ordre JSON modifiés, UTF-8, mauvaises longueur/hex/secret, timestamp ancien/futur, replay même event_id ; crash après inbox avant ack puis redelivery ; double événement, événement ancien après nouveau, delete avant update, restauration puis vieux delete, écho d'une publication locale ; inconnu ignoré ; conflit à trois versions ; accès perdu avant traitement ; 20 livraisons épuisées et reprise sans présumer de replay ; pause d'athlète ≠ purge ; access.ended après plusieurs voies d'accès ; scan app/users incomplet sans purge et complet avec absence confirmée ; backlog pendant scan initial, budget épuisé et reprise.

**Acceptation :** aucune perte après redémarrage simulé, aucun événement appliqué deux fois, aucune édition Nolio écrasée silencieusement ; tous IDs inbox contextualisés ou en quarantaine ; réconciliation récupère événements manqués et suppressions hors fenêtre récente via rotation ; alerte sur webhook désactivé ; délai de purge ≤30 jours démontré y compris caches/journaux/dérivés et restauration. Délais d'exploitation choisis (par exemple signal visible en quelques minutes lorsque service actif, scan accès quotidien) validés comme SLO internes, pas garantis par Nolio.

**Pré-requis :** PAT administration disponible, consentement/scopes vérifiés, traitement durable et budget de quota. Aucun besoin d'un broker externe tant que Postgres/Edge tient les volumes mesurés.

## Phase 5 — Intelligence adaptative sous contrôle coach

**But :** utiliser la réalité d'entraînement pour proposer une action explicable et réversible au niveau de la décision.

**Créer :** services de comparaison/qualité des données et propositions `src/lib/nolio-v2/` ou espace d'analyse adapté, UI d'écarts et justification ; trace de décision coach, provenance et version des inputs. Réutiliser les moteurs existants au travers de leurs interfaces ; ne pas ajouter des « diagnostics Nolio ».

**Modifier à terme :** écrans de suivi et flux de proposition de révision du plan ; toute proposition acceptée crée une nouvelle version puis repasse par phase 2. Aucun webhook, job cron ou génération IA n'a droit de publier directement.

**Tests :** observations restreintes/incomplètes → confiance réduite ou absence de recommandation ; TSS issu de RPE ≠ signal indépendant ; protocoles HRV différents non comparés sans contrôle ; retours tardifs ; proposition devenue périmée après modification Nolio ; rejet coach = aucune mutation ; acceptation ≠ publication immédiate ; tests de non-régression des rampes/individualisation existantes sur les mêmes entrées.

**Acceptation :** proposition limitée à une décision sportive définie, observations/hypothèses/manques lisibles ; revue de cas par coach ; mesure des faux positifs et utilité avant généralisation ; aucune décision clinique, aucun automatisme de surcharge fondé sur CTL seul. Aucun changement des modèles physiologiques sans demande et validation distinctes.

**Pré-requis :** preuve de qualité/continuité phases 3–4, historique suffisant défini par méthode, politique de confiance et validation scientifique des règles de proposition.

## Ouverture future à d'autres coachs (lot produit distinct)

Préparer les identifiants de connexion et isolation dès phase 1, implémenter OAuth partenaire seulement quand le besoin est confirmé. Modules `nolio-v2-oauth` et transactions de state, stockage multi-tokens privé, refresh sérialisé, grants partiels et reconnexion. Demander à Nolio passage application bloquée → développement (≤5 comptes) → production ; aucun contournement de limite par plusieurs apps. Tests cross-tenant, coach appartenant à plusieurs équipes, même athlète visible par plusieurs grants, révocation d'un grant sans fin de toutes voies, départ d'équipe et pause. Faire réapprouver les connexions et revalider mappings lors du changement d'application.

## Bascule, retour arrière et acceptation globale

1. Durant lectures comparatives, comparer seulement les champs sémantiquement équivalents, les écarts d'unités et les compétitions ; pas de double écriture pour « tester ».
2. Avant export v2 d'un périmètre, convertir/adopter les séances v1 existantes avec validation ; figer l'écrivain v1 pour ces occurrences. Conserver IDs legacy et trace de décision. L'absence de remote_id fiable est un cas de rapprochement explicite.
3. Ouvrir pilote petit groupe, puis élargir selon exactitude des exports, absence de doublons, conflits compris, respect accès/purge, budget de quota et charge support. La validation coach du rendu complexe est obligatoire avant généralisation.
4. Incident : désactiver les **nouvelles écritures v2**, conserver journal et lecture si autorisée, terminer réconciliation des opérations en vol. Ne pas retirer webhook access.ended ni mécanisme de purge. Annulation distante seulement si récupérable et confirmée, sinon correction manuelle contrôlée.
5. Ne pas revenir simplement sur le flag v1 en réexportant des événements v2 : la clé id_partner v1 ne connaît pas ces objets. Après mapping et contrôle des doublons, toute reprise d'écriture est une décision opératoire explicite.
6. Archiver la v1 uniquement dans un lot ultérieur approuvé après bascule complète. **Ce plan n'autorise aucune suppression actuelle d'endpoint v1.**

## Questions à transmettre à Nolio et gates associés

| Question précise | Impact / gate |
|---|---|
| Fournir schéma machine des nœuds step/repeat/exercise/superset/emom/for_time/amrap, toutes cibles, IDs, unités, bornes et règles de remplacement | Bloque certification export complexe phase 2 |
| Comment spécifier stream d'une zone, cible absolue ou % de métrique, récupération sans cible, double cible et rampe ? | Bloque fidélité intensité/récupération |
| Existe-t-il un brick multisport planifié natif et une relation d'ordre/transition exposée ? | Sinon représentation séparée à faire accepter par coach |
| confirm_token est-il retourné/supporté par REST, obligatoire hors MCP ? Comment stale_preview lie-t-il une requête REST au dry_run ? | Bloque revendication de protection globale aperçu/publication ; contrôle TFCLab et révisions requis de toute façon |
| POST dispose-t-il d'une idempotency key documentable, et comment reconnaître un commit dont la réponse a été perdue ? | Bloque retry automatique de créations ambiguës |
| Procédure PAT d'administration /app/users et webhook pour app partenaire et surtout équipe OAuth-only ? | Bloque exploitation persistante tant que reconciliation/purge non possibles |
| Corriger schéma streams required/omitted, raw RR HRV, confirm_token, RPE zéro, securityScheme OAuth équipe | Tests de contrat ciblés, pas contournement global de validation |
| Quelles restrictions des connecteurs s'appliquent aux records, agrégats, computed et PMC ? | Limite des promesses analytics ; interdire reconstitution de mesures interdites |
| Quotas attendus selon profil Two For Coaching, modalités de changement d'offre, restauration de team-owned, révocation OAuth et portée suppression des copies/derivés/backups | Capacité opérationnelle et conformité de conservation ; aucun plafond inventé |

Ces questions ne sont pas adressées automatiquement à Nolio ; aucune communication externe n'a été envoyée par cet audit.

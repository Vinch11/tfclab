# TFCLab — recette QA et préparation du pilote

Mise à jour du 3 novembre : la connexion manuelle de Vince n'est pas transmise au navigateur du service de test (signed_out). Une [recette Coach A à lancer dans son propre navigateur](COACH_A_SELF_RECIPE_2026-11-03.md) est prête au SHA QA `1a43da93f4b4c61519deb6644eff4fc9d6358bf5`. Aucun test A ni rapport n'a encore été exécuté ; les données A/B de référence sont inchangées. La recette doit être déclenchée par le bouton dans la session A de Vince.

Suivi du 2 novembre 2026. Ce document distingue les preuves existantes des vérifications encore nécessaires. Il n'accorde aucun GO de prescription ni de production.

## Décision produit confirmée par Vincent le 2 novembre 2026

Une fois DET Engine opérationnel, le coach doit pouvoir choisir, dans un premier temps, entre **Générer avec DET Engine** et **Générer avec l’IA**. DET s'ajoute au parcours existant. Le raccordement QA ne supprime ni ne remplace le générateur IA.

Critères de réalisation du futur choix :

- Le choix est explicite avant de lancer la génération, à partir du même contexte athlète et des contraintes saisies par le coach.
- Le plan conserve son moteur d'origine, sa version et les entrées/confirmations nécessaires à sa reproduction. Une version sauvegardée, restaurée ou exportée conserve cette provenance.
- Une ancienne version sans provenance est présentée comme « moteur non renseigné » ; son origine n'est pas déduite arbitrairement.
- Un refus DET reste visible avec sa cause. L'application ne bascule pas silencieusement vers l'IA et ne relâche pas un contrôle pour produire un résultat.
- Choisir un moteur ne vaut ni validation sportive ni autorisation de diffusion. Les contrôles communs, l'isolement des comptes et la revue du coach s'appliquent aux deux parcours.
- Un export restitue le plan effectivement choisi et sauvegardé. Le choix du moteur ne déclenche aucune écriture Nolio.
- DET reste identifié comme expérimental dans QA tant que les étapes ci-dessous ne sont pas acceptées. L'activation du choix dans le pilote suit la validation de DET.

Recette du choix : générer séparément avec chaque moteur ; constater une provenance correcte ; vérifier l'absence de bascule automatique lors d'un refus DET ; sauvegarder, rouvrir, restaurer et exporter les deux plans sans perte de provenance ; ouvrir une ancienne version sans lui inventer un moteur.

## Périmètre et sources épinglées

| Élément | Source / environnement | Ce que cette source ne prouve pas |
|---|---|---|
| DET V3.57 | `d2d7d2f8ac6a3cdccd09a3b1a741d484ea01289a`, PR #454 | Intégration UI et pertinence individuelle |
| Reçus d'archivage/adaptation | `aa858b2471442e51e5be66273dca0615b404f260`, PR #457 | Persistance réelle sur JWT coach et atomicité des deux écritures |
| Fidélité des plans / PDF | `944628bf7464afb58346668a4ff3ec9b66bb4a08`, PR #459, incluant #458 | PDF d'un plan DET complet sauvegardé dans QA |
| QA existante avant assemblage | projet Lovable `c3941303-40d2-447e-9b87-867d82727fd1`, SHA `a5fefaa93315c24e3eb3b3eab52cfdac15912d9f` | Présence du moteur DET dans l'app |
| Backend QA | `lkjesdacgpolrwfxulbo` | Le backend production n'est pas concerné |

Les modifications append-only déjà présentes dans QA sont conservées. Les fichiers de connexion, les clés, les identités de projet et les migrations RLS QA ne sont jamais remplacés par ceux du dépôt source.

## Les cinq étapes et leurs preuves attendues

| Étape | Travail concret | Condition d'acceptation | État vérifié / travail restant |
|---|---|---|---|
| 1. Candidate QA commune | Réunir le vrai DET, les reçus exacts, les protections append-only et les correctifs PDF ; raccorder les données coach | SHA QA identifié, provenance des fichiers, compilation et contrôles ciblés verts, manifeste recalculé sans attestation | Moteur, reçus et labo QA raccordés ; saisie/revues coach présentes, mais acceptation de cette voie et contrôles généraux finaux encore à prouver |
| 2. Persistance réelle | Générer, sauvegarder, modifier, fermer, reconnecter, rouvrir et restaurer ; provoquer des réponses perdues et des refus | JWT réels A/B, relecture exacte, aucun faux succès, aucune lecture inter-coachs, versions antérieures intactes, comportement des doublons vérifié après fermeture | Archives, édition, courant, pannes et parcours coach B exercés ; accès A et nouveau login restent à prouver |
| 3. Revue sportive | Examiner les quatre calendriers complets ; borner les objectifs/profils du pilote ; identifier les estimations | Décision humaine signée pour la version examinée ; réserves et exclusions conservées | Calendriers CI disponibles ; aucune revue humaine attestée |
| 4. Sorties fidèles | Comparer plan courant, version restaurée, PDF et payload Nolio ; traiter les relances | Dates, durées, répétitions, récupérations, cibles et provenance conservées ; absence de doublons ; recette réelle Nolio sur environnement de test autorisé | 16 PDF Chromium rendus ; mapper V2 testé hors réseau, mais contre-exemples de concurrence/réconciliation/validation à corriger ; WebKit et envoi réel non prouvés |
| 5. Pilote limité | Définir utilisateurs volontaires, version candidate, suivi et retour arrière | Étapes précédentes acceptées ; périmètre explicite ; désactivation du parcours DET possible ; données et historique préservés | Préparation seulement, non activé |

## Preuves déjà acquises

### Assemblage QA vérifié au SHA `c7a30dde5873f8774e8bd1ca03357007f7efbefa`

Le moteur est présent dans le projet QA. Une comparaison directe de `experimental/det-engine/engine.ts` avec le fichier épinglé de PR454 confirme leur identité exacte. La page du plan et le module append-only sont identiques à la version QA de départ : les protections existantes ont été conservées.

Résultats rapportés par l'environnement QA : compilation TypeScript moteur et application, build aperçu, 178 tests ciblés sauvegarde/reçus/PDF/phases/RLS et 368 tests serveur `ai-training-plan` réussis. La suite DET élargie conserve des échecs : deux fixtures historiques absentes et la baseline protégée `v320 IM-reduced-hours`, également reproduite sur la source PR454 intacte. Ces écarts ne sont pas déclarés acceptables du seul fait qu'ils précèdent l'assemblage.

L'import initial a nécessité une fusion sur la vraie base commune `3a2ba77`, et non le remplacement de fichiers de main par ceux d'une branche expérimentale plus ancienne. Trois fichiers serveur `_shared` ont changé ; leur déploiement QA n'est pas encore confirmé. Aucune génération DET n'est encore raccordée à l'interface à ce SHA. L'étape 1 reste donc ouverte.

Il est autorisé de reprendre uniquement les deux petites familles de données de test manquantes, à leurs chemins exacts, sans importer l'ensemble des rapports historiques. La baseline IM doit être diagnostiquée sans supprimer son assertion positive. Le raccordement UI doit également étendre le périmètre de la déclaration de source aux modules moteur et catalogues V3 réellement embarqués : le calcul antérieur ne couvrait que `src`, `_shared` et le catalogue historique IA.

### Preuves antérieures conservées

- DET : quatre scénarios synthétiques acceptés par les contrôles stricts, et quatre scénarios historiques incompatibles toujours refusés. Tous restent `syntheticOnly:true`, `prescriptionAllowed:false` et sans attestation sportive.
- Couverture TTE stricte : age group 16 semaines `19/49` (38,78 %), age group 40 semaines `53/135` (39,26 %), compétiteur avec placement revu 16 semaines `19/62` (30,65 %), compétiteur 40 semaines `53/171` (30,99 %).
- Les heures, placements et configurations « confirmés coach » de ces fixtures sont artificiels. Ils ne doivent jamais être appliqués comme validations à un athlète réel.
- CI de la candidate de reçus : 37 tests ciblés plus CI générale verts. Ces tests simulent le transport et ne prouvent pas une écriture authentifiée réelle.
- Auth/RLS QA : lectures réelles A et B attestées par captures. Ne pas demander de les refaire sans changement pertinent. A voit son athlète, quatre versions et un plan courant ; B voit son athlète et aucune version ni plan courant ; aucun ne voit les données de l'autre.
- État QA avant assemblage : quatre versions, un plan courant, aucun enregistrement Nolio. Empreintes de contrôle : versions `543e381a32500dfcf59bc1e384d3e752`, courant `34230fb711707b19d9766814105f0a33`.

## Dossier pour la revue sportive

Source : [exécution CI 41460441508](https://github.com/Vinch11/tfclab/actions/runs/41460441508), artefact `13149380218` / `marathon-source-evidence`.

Le script `scripts/det-engine/render_marathon_coach_review.py` transforme exclusivement les deux JSON de cet artefact en un dossier HTML local. Il n'ajoute pas de séance, ne change aucune dose et n'autorise aucune prescription. Il reprend les 112 semaines des quatre calendriers et leurs 938 lignes, repos et course compris.

```sh
python3 scripts/det-engine/render_marathon_coach_review.py \
  marathon-review-calendars.json marathon-evidence.json \
  marathon-coach-review.html
```

La revue doit examiner : progression réelle, cohérence avec l'objectif et le niveau, quantité/intensité, répétition des sources, allègements mesurés, fatigue, force et course le même jour, récupération entre disciplines, horaires réalistes et affûtage. Le passage de contrôles arithmétiques ne remplace pas ce jugement.

À enregistrer par le relecteur pour chaque scénario : nom et date, SHA et identifiant du scénario, décision (accepté pour le périmètre / à corriger / refusé), réserves, changements demandés et profils auxquels cette décision s'applique. Aucun nom, signature ou accord n'est prérempli.

Les ancres terrain, les paramètres estimés et les cibles issues d'un modèle restent identifiables comme tels. Les valeurs artificielles de la fixture ne deviennent jamais des mesures de l'athlète. Les quatre marathons ne valident pas automatiquement 5 km, 10 km, semi, trail, triathlon ou les profils atypiques.

## Recette réseau et isolement

La preuve doit utiliser des sessions Supabase Auth réelles sur le seul backend QA. Une requête administrateur, une simulation SQL de rôle ou un faux JWT n'est pas une preuve du parcours coach.

Tester au moins : réponse perdue après écriture, panne avant écriture, relecture impossible, double clic, rechargement, fermeture réelle de l'onglet, changement d'athlète, changement de compte et réessai du même contenu. Relever les identifiants et empreintes, jamais de jeton ni de contenu sensible dans les logs. L'absence de reçu ne vaut ni échec certain ni succès. La protection historique sessionStorage était limitée au même onglet pendant 24 h. La candidate suivante dérive désormais l'identité du contenu complet ; la preuve distante après fermeture reste nécessaire.

Reproduction du 2 novembre sur le module QA `a5fefaa9` : deux instances de `AppendOnlyPlanVersionSaver`, deux stockages d'onglet distincts et exactement le même payload synthétique donnent deux identifiants, deux lignes et deux statuts `CONFIRMED`. Le transport était exclusivement en mémoire ; aucune écriture cloud. Le défaut après fermeture est donc reproduit et reste à corriger, même si les tests de rechargement du même onglet passent.

Disponibilité Nolio vérifiée en lecture seule dans QA le 2 novembre : zéro connexion, zéro `nolio_records`, zéro journal de synchronisation et zéro structure générée. Un contrôle de payload hors ligne est possible ; un envoi réel ne peut pas être déclaré validé sans un compte de test raccordé au QA.

### Correction candidate et contre-vérifications au SHA `911f727e26b45e5d80c4caa4ab496c9786ec8f09`

Le module append-only dérive désormais un UUID v8 du SHA-256 du payload canonique complet. Le stockage d'onglet et le TTL ne déterminent plus cette identité. Les 23 tests de durabilité et les contrôles ciblés de l'environnement QA passent ; une contre-vérification indépendante avec le module exact confirme une seule ligne pour deux nouvelles instances sur un même payload ordinaire, et un refus de NaN avant envoi. Les anciennes lignes à UUID aléatoire ne sont pas réconciliées.

Deux contre-exemples ont été reproduits dans cette candidate, puis corrigés dans le lot ciblé cde5b1a6 décrit dans l'état courant ci-dessous :

- Deux valeurs différentes sous une clé JSON `__proto__` donnent le même identifiant et une comparaison positive, car la canonicalisation construit un objet avec le prototype normal. Toutes les clés JSON doivent être conservées.
- Le premier contrôle d'export cherche les doses dans le document entier. Échanger dates, durées et instructions entre deux séances lui fait encore rendre zéro anomalie. La preuve PDF doit relier et comparer chaque bloc à sa séance source, avec contrôle de cardinalité ; la présence globale de tous les chiffres ne suffit pas.

Le contrôle hors ligne a également repéré des chaînes absentes du PDF compact et l'absence de structure exploitable dans une sortie DET 10 km non acceptée par le moteur. Ce cas ne valide pas l'export des quatre marathons. Aucun contrôle HTML n'est présenté comme une impression PDF effectivement vérifiée.

### Nouvelle référence Nolio V2 fournie par Vincent

Le [contrat V2 courant et les écarts avec le guide](nolio-v2/CONTRACT_REVIEW_2026-11-02.md) ont été examinés et versionnés. Le schéma officiel récupéré le 2 novembre décrit désormais les structures de force et RPE, contrairement au guide du 9 octobre qui les disait non détaillées. Le raccord en préparation doit utiliser ce schéma courant, le calendrier planifié, de nouvelles autorisations V2 et une protection propre aux envois Nolio contre les doublons. Le futur choix coach **DET Engine ou IA** est conservé. Aucune migration applicative V2, validation serveur `dry_run` ni création Nolio n'est encore attestée.

## Préparation du pilote et retour arrière

Périmètre proposé pour la première revue : marathon course à pied uniquement, profils correspondant aux quatre scénarios, sous contrôle du coach. Cette proposition n'est pas une validation sportive. Les autres objectifs restent hors de ce premier périmètre tant que leur propre recette n'est pas terminée.

Avant ouverture : consigner version QA acceptée, version UI/moteur, backend, jeux de tests et leurs preuves, relecteur sportif, personnes du pilote et procédure de signalement. L'écran doit indiquer le caractère pilote et l'origine des estimations.

Retour arrière : désactiver l'entrée DET et restaurer la version applicative préalablement épinglée ; conserver IA disponible et l'historique des versions ; ne supprimer aucune version et ne relâcher aucune politique RLS. Une restauration d'un ancien plan suit la voie normale avec une nouvelle confirmation. Aucun retour arrière de données n'est exécuté automatiquement.

## Candidate QA vérifiée — 2 novembre 2026

Source éditeur finale : `de454207973d8a3e3592e76a8f623a60622b4f48`, projet QA `c3941303-40d2-447e-9b87-867d82727fd1`, backend `lkjesdacgpolrwfxulbo`, non publié. Release `3e3ae35670fa41daf1a8ce85c7c98dfbdafc7be65182bf1f13b69d76e3ae2175`, recalculée et fonctions QA réalignées, **attested:false / deploymentAttested:false**. Il ne s'agit pas d'un GO production.

### Parcours réellement exercé avec Coach B

Génération depuis des entrées coach SYNTHÉTIQUES,87 sources qualifiées par clics de recette, revue enregistrée,75 séances sauvegardées avec créneaux. Changer une entrée ou le mode d'ordre périme la revue. Historique rouvert, profil Chromium fermé puis relancé sans réinjection, version coach restaurée comme courant. C'est une continuité de la même session, **pas un nouveau login**. Aucun réordonnancement de plusieurs limiteurs n'est revendiqué dans le navigateur : le cas n'en détecte qu'un.

Les sauvegardes/retours réseau utilisent le vrai HTTP/JWT B. Pannes avant commit, ACK perdu, absence de relecture, double clic, reprise et nouveaux contextes ont été exercés. Le renommage ajoute une version sans modifier la source. La restauration archive l'ancien courant puis écrit/revérifie le nouveau ; les états confirmé, partiel et incertain sont distingués sans faux succès. PATCH B→A valide :200/0ligne, aucune mutation A.

L'archivage de `usePlanAdaptation` utilise désormais le même saver déterministe. UNKNOWN/BLOCKED/nonconfirmé bloque le courant ; échec du courant après archive produit « état partiel ». L'essai B de ce module a fait un insert HTTP réel avec ACK perdu simulé après commit, puis une nouvelle instance a retrouvé une seule archive et le premier generatedAt. L'échec du courant de ce sous-test était simulé sans requête ; le parcours UI d'adaptation IA n'a pas été exercé. Les adaptations DET non recalculées depuis les sources sont explicitement refusées avant mutation/IA/archive. La voie IA est conservée.

L'identité ignore uniquement `_provenance.generatedAt` ; dose, horaire, ordre, moteur et raison restent discriminants. Les anciennes identités/archives aléatoires ne sont ni réconciliées ni supprimées. L'actualisation textuelle ne peut plus modifier silencieusement un plan DET à cibles structurées.

Preuves : [archive/réseau](DET_COACH_B_REAL_JWT_RECIPE_2026-11-02.json), [édition/courant/entrées coach](DET_COACH_B_EDIT_RESTORE_COACH_INPUTS_2026-11-02.json), [adaptation et dry-run](ADAPTATION_ARCHIVE_DRYRUN_PROOF_2026-11-02.json).

### Nolio V2 : code raccordé, aucun compte connecté

Le vrai adaptateur GET utilise le [contrat complet de lecture](nolio-v2/READ_CONTRACT_2026-11-02.md) : pagination puis détail, erreurs/JSON invalide/timeout refusés sans inventer une liste vide. Les tests HTTP sont simulés, pas des lectures Nolio réelles.

La concurrence est prouvée contre la vraie RPC Postgres depuis deux requêtes serveur : PIDs156545/156546, les deux voient0initialement ; leurs transactions se chevauchent et une seule réserve. La seconde attend puis renvoie nonréservée. La ligne de test est fermée enrejected. Le premier probe administrateur sérialisé reste distinct et ne sert pas de preuve concurrente. Les deux lignes techniques restent conservées, sans remoteid et sans envoi Nolio.

Le magasin V2 est séparé de V1, vide, inaccessible àanon/authenticated ; le chargeur lie coach/athlète vérifiés, scopes/expiration/consentement/références. L'Edge vérifie getClaims et la propriété avant service-role. B→sonplan reste BLOCKED sans connexion ; B→A est refusé. Aucun jeton ou connexion n'a été créé, aucune configuration OAuth effectuée.

Le faux dry-run positif local est corrigé. Une contre-vérification indépendante sur les modules finaux donne **DRY_RUN_NOT_VALIDATED**,0fetch pour le refus HTTP0 ; elle ne vaut pas une validation serveur Nolio. Dates impossibles, doses négatives/multi-axes, métrique inconnue et durée incohérente sont refusées ; une séance distante de même nom/date mais autre contenu n'est pas déclarée exacte. Une heure confirmée09:00 reste09:00.

Preuves : [code durable](NOLIO_V2_DURABLE_SENDER_PROOF_2026-11-02.json), [GET/concurrence/magasin](NOLIO_V2_READS_CONCURRENCY_STORE_PROOF_2026-11-02.json), [audit indépendant final](DET_FINAL_INDEPENDENT_AUDIT_2026-11-02.json). La sonde QA est encore déployée et doit être exclue/retirée avant production.

### Vérifications et intégrité finales

Types/lint ciblé passent. Le lot rapporte plus de3400 tests frontend réussis, puis deux erreurs du nouveau test dry-run corrigées et8 tests ciblés relancés avec succès ; aucun second passage complet n'est revendiqué ici. Tests hook24/24 et modulearchive6/6. Les suites Nolio99, coach33, plan/impression130 fichiers et édition152 fichiers ont été exécutées dans leurs lots respectifs.

Le Deno du bac à sable ayant planté, les9 fichiers serveur finaux ont été copiés à l'identique avec leurs empreintes sur une branche CI isolée. **[Deno check final réussi](https://github.com/Vinch11/tfclab/actions/runs/41521748335)**, snapshot de la source finale, sans exécution de module, déploiement ni Nolio. Ce contrôle est distinct de la suite frontend et d'une attestation des octets servis.

WebKit a vérifié l'aperçu d'impression. Un PDF Chromium75 séances/17pages a été contrôlé par séance sans écart ;16 PDF des quatre scénarios avaient été rendus dans un lot antérieur. Aucun contrôle visuel humain page par page ni recontrôle de tous les modes sur la dernière source n'est revendiqué.

Audit SQL indépendant à20:43UTC : A4 archives conserve `543e381a32500dfcf59bc1e384d3e752`, courantA `34230fb711707b19d9766814105f0a33`. B11 versions,1 courant,1 revue ; courant B et version coach042b sont exactement égaux (`e46b4b279c0ca2b1f4f4ddda257be5c9`). Les6 premières archives B conservent `ba7680aa1111f9966c9ead97df3f6749`.75 créneaux coach sont présents, aucune incohérence de propriété. JournalNolio :2 lignes techniques rejetées ;0 connexion V2.

### Conditions encore ouvertes

- Accès/écritures Coach A et nouveau login réel : l'outil de session A a refusé l'action faute d'approbation disponible dans ce contexte. Aucun contournement n'a été fait. Une connexion manuelle reste nécessaire pour terminer cette partie.
- Connexion V2/OAuth et essais Nolio réels sur un compte/athlète de test explicitement autorisés ; aucun dry-run réel n'a eu lieu.
- Revue sportive humaine des plans et décisions de périmètre, puis identification/attestation/promotion de la version du pilote et retour arrière. Les confirmations de recette ne sont pas cette revue.
- Seul marathon 16 sem./age_group/TTE seul est prouvé accepté depuis les entrées coach. Le profil240s/km reste refusé Lorang ; les autres profils/objectifs ne sont pas validés par ce cas.

**Pilote NON ACTIVÉ / NO-GO production.** Aucune fusion dansmain ni publication de production. Le choix futur **DET Engine ou IA**, sans repli silencieux, reste requis.

## Dernier arrêt documenté — crédits Lovable

Vincent a validé l'invite dans Lovable : la première pause a été levée et deux lots supplémentaires ont terminé. Le dernier lot de réparation est resté partiel, puis une tentative explicite de finalisation a été refusée par le connecteur : **« Your workspace is out of credits, so Lovable can't send this message. »** Il n'existe aucune nouvelle carte d'approbation en attente. La demande de réparation n'a pas été acceptée. Aucun achat ni changement d'abonnement n'est effectué.

| Référence QA | Résultat vérifié ou rapporté |
|---|---|
| `29bbc487d01966a95fd482f4d771635f0e80a3fa` | Lot V2/lecteur terminé : 3 287 tests frontend réussis, 1 ignoré et 6 todo ; 368 tests de génération sous Deno local et 21 tests V356/V357. Seize PDF Chromium réellement rendus, titres/bandeau extraits ; 6 tests d'impression Chromium. Réécriture vélo remplacée par un avertissement. Quatre erreurs lint, WebKit et vérification visuelle/dose de chaque PDF restaient ouverts. |
| `fe3dbb80c4316d24d3016ba01de505f544af6b81` | Dernière candidate qui compilait. Ordre coach transmis au contexte commun, inclus au hash et à la provenance, conservé après sauvegarde/restauration mémoire et affiché. 30 tests coach et 7 tests DST. Types/build et contrôles des fichiers modifiés réussis. Sur 150 fichiers ciblés, un test 70.3 échoue sous charge et passe seul. Release QA `25ee44dc5620743207dd74f537ecb2dafaaad6c7771d27e30f8f25376ead5715`, non attesté. |
| `6c45fd912a1310b7184d071a7a558440167488a5` | **Candidate actuelle qui ne compile pas.** Réécritures partielles de plannedClient/plannedMapper et nouveau localTime, non testées. Erreurs de types dans plannedClient.ts et nolioV2PlannedMapper.test.ts. Aucune fonction déployée, aucune modification de base, aucun appel Nolio, aucune preuve de ce lot. Aucun retour arrière n'a été exécuté ; les changements restent conservés à ce SHA. |

### Preuve du parcours coach : portée limitée

Le profil synthétique initial à 240 s/km reste refusé : automatique `[VLamax,TTE]`, puis priorité coach `[TTE,VLamax]` avec blocage Lorang en semaine 14. Il n'a pas été transformé en GO.

Un **profil synthétique distinct**, saisi à 220 s/km avec les autres entrées identiques, n'a que TTE comme limiteur éligible et est accepté par le vrai solveur en mode automatique et priorité coach `[TTE]`. Les assertions positives sont désormais non conditionnelles, sans mock du solveur ni import de fixture. Cela prouve une branche acceptée pour **marathon 16 semaines age_group / TTE seul**, pas la prise en charge de tout profil. La sauvegarde/restauration de ce test utilise un transport mémoire et ne prouve aucune écriture JWT réelle.

La correction DST a été contre-vérifiée indépendamment : Europe/Brussels 01:00 aux deux changements d'heure est conservé, 02:30 au printemps est inexistant et 02:30 à l'automne est ambigu. Une limite de périmètre reste reproduite : `coachObjectiveKey('Marathon de trail')` retourne encore `marathon` via le wildcard « de/du/d.* ». La correction doit séparer objectif canonique route et nom libre de l'événement ; elle est consignée dans les instructions QA.

### Export V2 et compilation : travaux indispensables à reprendre

Les 22 tests V2 du premier mapper ne couvraient pas les contre-exemples indépendants : deux POST concurrents après lecture vide du journal ; confirmation d'un autre contenu de même nom/date/sport ; acceptation d'une date impossible et d'une dose négative à deux axes ; absence d'heure dans le payload. Ils sont versionnés dans `NOLIO_V2_INDEPENDENT_COUNTEREXAMPLES_2026-11-02.json` et n'ont utilisé qu'un transport mémoire synthétique, aucun réseau Nolio.

La réécriture partielle vise un claim atomique, la réconciliation complète avec pagination/détail, l'arrêt sans resend après une lecture vide incertaine, les horaires fidèles et la validation runtime. **Aucun de ces correctifs n'est encore prouvé.** Il manque l'adaptateur durable et sa réservation en base, le client HTTP concret et la fonction Edge V2. Une interface TypeScript seule ne prouve ni atomicité ni chaîne réelle.

À reprendre dans cet ordre : réparer le build ; terminer ces mécanismes et leurs tests de sabotage/concurrence ; aligner le manifeste officiel et les fonctions QA ; finir lint, WebKit et inspection des PDF ; seulement ensuite poursuivre la recette UI. L'absence de connexion V2 autorisée bloque toute requête Nolio authentifiée, même un dry_run serveur.

### Sessions A/B et état des données

Coach B avait une session légitime ouverte : lecture réelle de son athlète et refus de visibilité sur les lignes A. La demande officielle `lovable auth-session --json --user` de Coach A a été refusée parce que l'approbation était indisponible dans ce contexte. Aucun --self, mot de passe ou contournement n'a été utilisé ; aucune carte n'est en attente pour A.

Les écritures fictives de recette sont déjà autorisées dans les cinq étapes. La suite B demande de tester le parcours UI et les pertes de réponse avec sa session existante, puis de rapporter les limites de fermeture/reconnexion sans inventer une session A. Cette demande reste en file, suspendue avec `queue_pause_reason=stop`. Les écritures JWT restent **NON PROUVÉES**.

Au dernier contrôle rapporté : quatre versions historiques, un plan courant, zéro revue coach enregistrée, zéro opération Nolio et zéro token. Le lot fe3 a comparé les contenus sans reproduire leurs empreintes cryptographiques ; la suite doit reproduire les empreintes exactes et compter séparément toute nouvelle version fictive B.

Le choix futur **DET Engine ou IA** reste requis, sans repli silencieux et avec provenance conservée. La revue sportive humaine est absente. **Pilote NON ACTIVÉ / NO-GO production.** Aucune fusion dans main ni publication de production n'est réalisée par cette recette.

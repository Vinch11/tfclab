# TFCLab — recette QA et préparation du pilote

État initial du 2 novembre 2026. Ce document distingue les preuves existantes des vérifications encore nécessaires. Il n'accorde aucun GO de prescription ni de production.

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

| Étape | Travail concret | Condition d'acceptation | État initial |
|---|---|---|---|
| 1. Candidate QA commune | Réunir le vrai DET, les reçus exacts, les protections append-only et les correctifs PDF ; raccorder les données coach | SHA QA identifié, provenance des fichiers, compilation et contrôles ciblés verts, manifeste recalculé sans attestation | Assemblage lancé ; pas encore accepté |
| 2. Persistance réelle | Générer, sauvegarder, modifier, fermer, reconnecter, rouvrir et restaurer ; provoquer des réponses perdues et des refus | JWT réels A/B, relecture exacte, aucun faux succès, aucune lecture inter-coachs, versions antérieures intactes, comportement des doublons vérifié après fermeture | SELECT réel A/B prouvé ; écritures et chaîne complète à faire |
| 3. Revue sportive | Examiner les quatre calendriers complets ; borner les objectifs/profils du pilote ; identifier les estimations | Décision humaine signée pour la version examinée ; réserves et exclusions conservées | Calendriers CI disponibles ; aucune revue humaine attestée |
| 4. Sorties fidèles | Comparer plan courant, version restaurée, PDF et payload Nolio ; traiter les relances | Dates, durées, répétitions, récupérations, cibles et provenance conservées ; absence de doublons ; recette réelle Nolio sur environnement de test autorisé | Correctifs PDF QA existants ; chaîne DET et Nolio à prouver |
| 5. Pilote limité | Définir utilisateurs volontaires, version candidate, suivi et retour arrière | Étapes précédentes acceptées ; périmètre explicite ; désactivation du parcours DET possible ; données et historique préservés | Préparation seulement, non activé |

## Preuves déjà acquises

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

Tester au moins : réponse perdue après écriture, panne avant écriture, relecture impossible, double clic, rechargement, fermeture réelle de l'onglet, changement d'athlète, changement de compte et réessai du même contenu. Relever les identifiants et empreintes, jamais de jeton ni de contenu sensible dans les logs. L'absence de reçu ne vaut ni échec certain ni succès. La protection sessionStorage actuelle est limitée au même onglet pendant 24 h ; la fermeture ou un autre appareil demande encore une preuve et éventuellement une garantie durable supplémentaire.

## Préparation du pilote et retour arrière

Périmètre proposé pour la première revue : marathon course à pied uniquement, profils correspondant aux quatre scénarios, sous contrôle du coach. Cette proposition n'est pas une validation sportive. Les autres objectifs restent hors de ce premier périmètre tant que leur propre recette n'est pas terminée.

Avant ouverture : consigner version QA acceptée, version UI/moteur, backend, jeux de tests et leurs preuves, relecteur sportif, personnes du pilote et procédure de signalement. L'écran doit indiquer le caractère pilote et l'origine des estimations.

Retour arrière : désactiver l'entrée DET et restaurer la version applicative préalablement épinglée ; conserver IA disponible et l'historique des versions ; ne supprimer aucune version et ne relâcher aucune politique RLS. Une restauration d'un ancien plan suit la voie normale avec une nouvelle confirmation. Aucun retour arrière de données n'est exécuté automatiquement.

Statut de lancement : **NON ACTIVÉ**. Les preuves manquantes restent ouvertes ; ce document ne les remplace pas.

# Nolio V2 — contrat vérifié et adaptation de TFCLab

Relevé du 2 novembre 2026. Préparation QA ; aucun compte Nolio consulté et aucune écriture Nolio.

## Sources effectivement récupérées

- OpenAPI officiel : <https://www.nolio.io/api/v2/openapi.json>, API `2.0.0`, OpenAPI `3.1.0`.
- Guide officiel : <https://media.cdn.nolio.io/api/migration-v1-to-v2.md>, en complément du PDF fourni par Vincent, daté du 9 octobre 2026.
- Exécution de capture réussie : <https://github.com/Vinch11/tfclab/actions/runs/41477388821>, artefact `13156674594`.
- La capture contient 181 chemins et 301 opérations. Les empreintes et l'heure de récupération sont dans `source-manifest-2026-11-02.json`.

Le point d'accès nommé `openapi.json` renvoie du YAML avec la négociation par défaut. L'en-tête `Accept: application/vnd.oai.openapi+json` fournit le JSON ; les deux formats ont été récupérés et parsés. L'échec du premier job venait du parseur JSON appliqué au YAML, et non d'une indisponibilité de Nolio. Le job corrigé réussit.

Le contrat courant est plus récent que le guide sur un point déterminant : `workout.items` référence désormais `WorkoutNode`, avec 21 schémas `Workout*` détaillés. L'affirmation du guide selon laquelle l'OpenAPI ne décrit que des objets libres n'est donc plus applicable. Il ne faut pas considérer le renforcement comme non documenté en V2.

`planning-contract-2026-11-02.json` conserve 38 schémas et leur fermeture de références, pour préparer les tests hors réseau. Les descriptions et exemples éditoriaux ont été retirés ; les noms des propriétés et les contraintes machine sont conservés. Cet extrait n'est ni un client HTTP ni une preuve d'acceptation par le serveur.

## Correspondances utiles au parcours DET et IA

| Usage | TFCLab / ancien contrat V1 | Contrat V2 à utiliser |
|---|---|---|
| Planifier une séance | `POST /api/create/planned/training/` | `POST /api/v2/planned/trainings/` |
| Planifier la course objectif | Traitement à vérifier dans l'expéditeur | `POST /api/v2/planned/competitions/`, ressource distincte |
| Historique réalisé | Routes V1 de synchronisation | `/api/v2/real/trainings/` et `/api/v2/real/competitions/`, séparées du planifié |
| Structure de séance | `structured_workout`, étapes et champs V1 | `workout`, nœuds typés `step`, `repeat`, `exercise`, `superset`, `emom`, `for_time`, `amrap` |
| Quantités | Durées et distances numériques avec conventions implicites | Objets `value` / `unit`, conversion contrôlée |
| Répétitions | `type:repetition`, `value` | `kind:repeat`, `times`, `steps` ; `skip_last` booléen omet le repos final |
| Cibles | Une cible et types V1 | Tableau `targets`, cibles `raw`, `metric`, `zone`, `rpe`, `rir`, `no_target` |
| Force | Conversion V1 limitée | `WorkoutExercise` et `WorkoutSet` décrits ; identifiant d'exercice réel requis pour `exercise` |
| RPE | Texte ou conversion spécifique | `rpe` et, pour une plage, `rpe_max` |
| Athlète destinataire | Identifiant entier V1 | Identifiant opaque `usr_…`, dans `athletes` pour une création planifiée ; un athlète par création pour conserver chaque id retourné |
| Identifiant distant | Entiers et `id_partner` | Chaînes opaques retournées par Nolio ; migration explicite des identifiants V1 |
| Modification | Anciennes routes `POST update` | `PATCH` par id distant enregistré, avec contrôle de révision si disponible |
| Validation serveur | Non disponible sous cette forme | `dry_run:true` sur la création planifiée, sans sauvegarde |

Le code source main `e31ffaba` confirme que `nolio-send-plan/index.ts` appelle actuellement la route V1 et décrit `id_partner` comme sa déduplication. Un simple changement d'URL ne peut donc pas migrer cet expéditeur.

## Contraintes à conserver dans l'adaptateur

- Partir des blocs V3 effectivement configurés et approuvés, avec leurs cibles individuelles résolues. Ne pas reconstruire une structure chiffrée à partir du texte ni reprendre les doses par défaut.
- Préserver ordre, répétitions, repos et unités. Le `skip_last` documenté permet de représenter l'absence de repos après la dernière répétition sans ajouter de dose.
- Pour les allures, la représentation `/km` utilise une chaîne `m:ss`. Une conversion doit rendre visible la précision imposée. Le schéma décrit aussi les valeurs de vitesse en `m/s` ; toute représentation choisie doit conserver le sens et les bornes de la cible source.
- Une borne zéro est prévue pour exprimer un plafond dans `WorkoutTargetRaw` ; ne pas transformer cette cible en `no_target` ni inventer un plancher positif.
- Sur une création, ne pas fabriquer d'identifiant de nœud. Sur une modification, conserver les identifiants des nœuds réellement lus.
- Pour `exercise`, obtenir l'identifiant d'un exercice via la bibliothèque autorisée, sans deviner un `exf_…`. Le choix d'une fenêtre de temps, d'un nombre de répétitions et d'un objectif RPE doit rester celui de la prescription source.

Le JSON Schema ne remplace pas les contraintes sémantiques du protocole. Par exemple, `WorkoutStep` interdit de cumuler durée et distance dans son descriptif, mais n'encode pas ce XOR en JSON Schema ; `WorkoutSet` exige sémantiquement un seul axe parmi répétitions, durée et distance. Ces règles demandent des vérifications supplémentaires.

Autre écart à conserver dans les tests : la description de la route accepte explicitement `dry_run:true`, alors que le champ de contrôle n'apparaît pas dans les propriétés de `PlannedTrainingCreateRequest`. Le schéma seul ne suffit donc pas à certifier une requête.

## Déduplication et réponses perdues

Le guide courant confirme la disparition de `id_partner` et l'absence de déduplication des créations. La clé déterministe de `plan_versions` protège une sauvegarde Supabase ; elle ne rend pas un POST Nolio idempotent.

Prévoir une correspondance durable entre l'opération locale, la version de plan, la séance source, le compte/athlète destinataire, l'empreinte du payload, la version API et l'id distant retourné. Après une réponse perdue, conserver un état non confirmé et réconcilier le calendrier avant toute relance. Une correspondance ambiguë ne doit déclencher ni nouvel envoi automatique ni modification d'un événement dont l'origine n'est pas établie. Les PATCH/DELETE ne visent que les ids distants enregistrés par l'intégration.

## Authentification et séparation des environnements

Les identifiants d'application et jetons V1 ne sont pas réutilisables en V2. Le contrat courant distingue les applications personnelles (clé API), partenaires (OAuth2 multi-utilisateur) et d'équipe (OAuth2 limité à l'équipe). Les autorisations effectivement accordées, les restrictions d'équipe et le refus d'accès de l'athlète doivent être traités explicitement.

Le source OAuth V1 lu dans main contient un callback vers le backend de production. Le raccord QA V2 doit avoir sa configuration et son callback propres, un état OAuth vérifié et à usage unique, et ne jamais réutiliser ce callback de production. Les secrets passent uniquement par la configuration sécurisée du service, jamais par le chat ou les fichiers de preuve.

## Critères restant à remplir

1. Inventaire complet des routes V1 et des colonnes d'identifiants stockés ; chemin de migration explicite et versionné, sans conversion destructive des données de production.
2. Module pur réellement partagé avec l'expéditeur V2, structures sérialisées issues du DET et tests de fidélité sur les quatre marathons ; comportement également défini pour la génération IA.
3. Contrôles locaux du schéma et des règles sémantiques, refus précis des mappings incomplets et contrôle par séance des sorties PDF.
4. Configuration V2 QA autorisée, puis `dry_run` serveur, lecture du détail, contrôle des doses et récupération après réponse perdue sur un compte de test. Aucun de ces appels authentifiés n'a encore été fait.
5. Revue coach, choix explicite DET ou IA conservé, pilote limité à une version et un périmètre acceptés.

État : **contrat courant récupéré et préparation engagée ; migration applicative et acceptation Nolio non validées**.

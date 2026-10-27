# État de reprise V3

Statut : NO-GO. Douze unités de correction consommées ; validation finale réussie. L'ancien registre V2 n'est pas réinitialisé. Aucun processus permanent n'est lancé.

Dernier bundle : `final/candidate.json.gz`.
Version : `det-v3-progression-1-strict-next-strict-next-strict-next-strict-next-strict-next`.
SHA-256 du fichier gzip : `bf250168cc05779e5b1d0e2814c1372101c4dad89165b664ab5bd87cc901370a`.
Empreinte JSON sérialisé : `aa82d231e1bec457630eb2174cc5072b8020aabbfb4c9b78e3702346f755176e`.
La provenance distingue cette empreinte du hash à clés triées utilisé par le comparateur V2.

Le registre conserve les chemins temporaires d'origine et leur correspondance avec `runs/`. `persistentLastAccepted` pointe vers la copie durable. Les matrices candidate/replay sont toutes deux conservées ; la reprise vérifie leurs empreintes. Le test d'idempotence réel n'a créé ni nouveau résultat ni cycle.

Pour examiner sans corriger :

```sh
gzip -dc docs/det-engine/v3/final/candidate.json.gz > /tmp/det-v3-last-accepted.json
```

Les fonctions du moteur utilisées jusqu'à strict-03 correspondent au commit `1b8aad02` ; les dernières passes et leurs journaux détaillés au commit `e88d37e4`. Le formateur des rapports peut évoluer indépendamment des prescriptions. Les commandes exactes, dates figées, versions et paramètres sont dans les artefacts d'exécution et provenance.json.

Une reprise doit ouvrir un nouveau registre explicitement autorisé, référencer celui-ci et le hash du bundle final, et vérifier les processus avant toute récupération d'étape interrompue. Aucun budget ou rejet antérieur ne doit être effacé. Le plafond de cycles actuel reste atteint, même si une partie de la durée initialement autorisée n'a pas été utilisée.

Les dépendances installées sont celles de l'environnement de travail documenté ; aucun lockfile n'a été modifié. La désynchronisation npm ci déjà signalée en V2 reste une limite de reconstruction de l'environnement, distincte des rejeux identiques observés.

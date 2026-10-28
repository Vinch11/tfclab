# Reprise V17

Baseline V16 `42a0ca0993a479d6d2f7498287ed855fdfa0dd5a`, branche experiment/det-engine, PR #420 en brouillon — NO-GO. Lire README, COMPILATION_RESULTS, SCIENTIFIC_QUALIFICATION, VALIDATION et state.json.

Budget : 60 minutes, 10 unités ; début le 28/10/2026 à 20:31:36 UTC, échéance à 21:31:36 UTC. Node 2 Go, étape 180 s, processus de validation à un worker. Aucune permanence ou relance automatique. Ne pas réinitialiser ce registre ni relancer les dix unités V16.

Entrée immuable : canonique final V16. `v17-build.mjs` ajoute l'IR dans un dossier neuf et refuse l'écrasement. `v17-independent-audit.py` vérifie le source et les témoins sans importer le compilateur JS. `v17-output-study.mjs` produit les trois niveaux de sortie localement. `v17-qualify.py` tient la matrice scientifique avec trois annotations documentaires explicites. `v17-run.mjs` supervise la validation et les comparaisons, avec état persistant et protection des fichiers antérieurs.

Sorties de référence : evidence/final, replay, outputs-final, outputs-replay, qualification-final et qualification-replay, selection-final et selection-replay. Les compléments de contrôle restent liés dans VALIDATION. Vérifier baseline-files, source-checksums, checksums et le vérificateur V17 avant toute reprise.

À préserver : 67 cœurs génériques chronométrés ; variantes spécifiques encore à résoudre ; 67/67 témoins vérifiés ; 0 prescription automatiquement approuvée ; 0 validation scientifique individuelle ou revue experte ; nage/brick non déclarés complets faute de données ; force reconnue comme modèle distinct ; avis coach optionnel non assimilé à une récupération observée ; API v2 refusée ; aucun accès réel Nolio ou athlète.

Une exécution interrompue conserve ses sorties et diagnostics ; vérifier le processus actif avant de libérer son verrou. Ne pas compter une sortie partielle comme succès, ne pas écraser les preuves acceptées et utiliser un nouveau chemin de sortie.

Une nouvelle session nécessite un nouveau mandat/budget et un registre séparé. Les choix de science ou de méthodologie restent candidats à revue indépendante ; aucune fusion, déploiement, migration, écriture réelle ou dépense n'est autorisée par ce dossier.

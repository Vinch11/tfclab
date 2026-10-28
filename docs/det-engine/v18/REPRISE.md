# Reprise V18

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

Baseline V17 `13e5d334d221b11317cbe4a84793890b6936dcde`, branche `experiment/det-engine`. Début 2026-10-28T21:44:37Z, limite 2026-10-28T22:44:37Z, maximum 10 unités, 2 Go par processus Node, 180 secondes par étape et un worker de validation. Aucun coût externe ni tâche permanente.

Preuves acceptées : `docs/det-engine/v18/evidence/validation-3`. Lire README, V18_RESULTS, ROOT_CAUSES, VALIDATION et state.json. Les sources V16/V17, 600 références et les registres V2–V17 ne doivent pas être modifiés.

Le compilateur V18 et ses modèles sont des fonctions pures réutilisables. `v18-build.mjs` écrit seulement dans un nouveau chemin V18 et refuse les registres clos/expirés ; le superviseur n’accepte que ses commandes fixes, trois tentatives et la branche expérimentale. Une relance ne doit pas écraser un sous-dossier existant ni compter une sortie partielle comme acceptée. Vérifier le PID et le reçu avant de libérer un verrou interrompu.

Pour la session suivante : nouveau mandat/budget et registre séparé, vérifier les empreintes et l’état distant, réutiliser les preuves sans rejouer les unités closes comme nouveau travail. Le vérificateur final de dépôt reste lisible sans modifier le registre. Les champs de réaction réellement observée restent inconnus ; aucune progression attendue ou conversion technique ne prouve une adaptation.

Priorités : clarification source des occurrences de repos et du périmètre des variantes ; poursuivre les grammaires dont des témoins écrits existent ; renforcer les modèles techniques sans inventer une dose ; revue scientifique individuelle progressive et contrat Nolio officiel avant tout transport multidisciplinaire.

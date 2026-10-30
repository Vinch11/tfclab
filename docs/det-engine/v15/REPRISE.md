# Reprise V15 — DRAFT / NO-GO

Baseline `1d04718d16b2cba990bbe726a21d7cfc7af720e0`, branche `experiment/det-engine`, PR #420 brouillon. Lire COACH_PACKET.md, V15_RESULTS.md, CONDITION_CLASSIFICATION.md, PRESCRIPTION_READINESS.md, VALIDATION.md et state.json.

V15 est une revue en lecture seule des preuves V14. Aucun calendrier n’a été généré, aucune condition supprimée/résolue et aucune valeur individuelle inventée. La revue scientifique prépare un examen indépendant, sans qualification ou signature humaine prétendue. Les 600 configurations et preuves V2–V14 sont protégées par le manifeste de tous les fichiers suivis.

## Registre borné

Dix unités, échéance absolue de 60 minutes, processus Node limité à 2 Go et tests de schéma à un worker. Une unité passée signifie travail borné achevé, pas admissibilité sportive. Aucun workflow de production, service permanent ou relance automatique de développement. Une reprise doit préserver ce registre et disposer d’un mandat/budget explicite distinct.

`v15-run.mjs` contrôle branche, unité, réservation active unique, nombre de tentatives et délai. `v15-validate.mjs` contrôle le typage, les 16 tests Node du dossier et le test de schéma sur six variantes. `v15-proof.mjs` compare deux processus de revue indépendants et refuse les répertoires déjà présents. Le runner de revue n’importe aucun générateur ni client d’API.

Les sorties finales sont `review.json.gz`, `conditions.jsonl`, `summary.json`. Ce sont des diagnostics et données de revue, pas de nouveaux plans. Ne pas écraser les preuves ; une exécution interrompue ne devient pas un succès. Vérifier les processus et conserver le diagnostic avant de libérer une réservation interrompue. Les sorties EPERM du sandbox sont explicitement rejetées et conservées ; la preuve acceptée utilise deux processus terminés sans erreur.

## Vérifications à la reprise

Vérifier `baseline-files.json`, `source-checksums.json`, `checksums.json`, `evidence/schema-audit.json` et `evidence/reproducibility.json`. Les 2989 fichiers suivis avant V15 doivent être inchangés. Les ajouts sont limités aux préfixes V15 des répertoires expérimental, scripts et documentation.

Les tests V15 sont ceux du dossier et du schéma. Les 132/2999/62 résultats expérimentaux/historiques/gouvernance V14 sont des références préservées, pas des suites réexécutées ici. La projection S1–4 réutilise les semaines archivées ; aucun export ni génération de séances.

## Conclusions à préserver

- 104 représente des créneaux conditionnels, pas des examens indépendants. Les modèles natifs ont 318/317 occurrences ; 98 concernent le suivi courant obligatoire. Le premier bloc aérobie a 26 séances, 69 occurrences, 19 suivis et aucune cible au-dessus de l’enveloppe actuelle.
- Classer «suivi courant» ne lève pas un garde-fou. Les catégories secondaires préservent les dépendances individuelles des conditions composées. Un identifiant/type incohérent reste non mappé, jamais routinisé pour améliorer les chiffres.
- Aucune contre-indication médicale permanente n’est établie par ces profils fictifs. Une contradiction de recette/configuration et une insuffisance de capacité à échéance ne sont pas de simples incertitudes de suivi ; une réaction adverse conserve une suspension.
- Nages complètes, posture, circuit et fenêtres quotidiennes restent les manques proches. Le circuit25 min conserve 15 min15 chronométrées et 282 répétitions/repos/transitions non chronométrés : aucune capacité ou vitesse d’exécution n’est fabriquée.
- Un plafond générique de vélo ou soutien ne prouve ni compétence posturale ni capacité de force. Le statut logiciel admissible du vendredi S1 ne démontre pas sa récupération réelle après jeudi.
- Les 98 réactions futures n’ont pas à être observées avant S1 ; il faut un mécanisme de suivi et une décision avant l’exposition concernée. Les cibles90/95/100 restent à réévaluer à leur date.
- Les six préfixes passent le schéma technique, l’ensemble16 semaines garde son échec de durée de compétition. Une projection de schéma ne doit pas perdre les conditions dans un futur export ; aucun export opérationnel n’est autorisé.
- Les deux profils/trois modèles sont comparés sans promotion. Bricks absents, nutrition individualisée et force maximale non attestées, intensités spécifiques et affûtage demeurent des questions de préparation complète.

Les quatre résumés publics scientifiques relus ont leurs métadonnées, URL, empreinte et bref extrait conservés ; les réponses intégrales du cache ne sont pas publiées. Aucun texte intégral ou achat d’article revendiqué. Les principes documentés de Lorang restent distincts des hypothèses et nombres TFCL.

Prochaine décision : revue par un coach qualifié, sur les preuves pertinentes, avec portée/version, réserves et suivi consignés. Le formulaire reste vierge. Aucune fusion, production, migration, donnée réelle/Nolio, déploiement, publication Lovable, API payante ou promotion automatique de contrat.

Clôture : dix unités V15 achevées, état completed_no_go ; source 1bf745ff3dcd61891446e62446b8a90ac7d6238d. PR420 vérifiée brouillon et non fusionnée. Le point de contrôle distant précède la clôture documentaire ; voir publication-proof.json. Aucun processus permanent ou relance automatique n’est lancé.

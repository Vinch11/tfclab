# Physiological Validation V1 — résultats

**DRAFT — NO-GO.** Confirmation des acquis et consolidation des preuves ; aucune activation de candidat, fusion ou mise en production. Base indépendante `main` : `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. DET #420 lu séparément au SHA `0f5079d93c03fb5d3c488ea11a3ba3253460068a`.

## Réponse aux six critères

| Critère | Résultat étayé |
| --- | --- |
| Déjà documenté et testé | Bibliographie et méthodes explicites, formules partagées, calibrations annoncées, séparation des sports, verrou labo, bornage/lissage, qualité CP, ancre MLSS/FatMax, tests des profils et limiteurs. [Inventaire](EXISTING_SCIENTIFIC_VALIDATIONS.md) |
| Mathématiquement/techniquement vérifié | **35 fichiers / 332 tests existants verts**. Cohérence Mader/seuils, inverse MLSS, CP/W′, CAP, TTE, diagnostic, exports et transmission. **55 tests expérimentaux verts**, dont conservation de quatre blocs diagnostiques sur les 37 profils QA. [Matrice](CALCULATOR_EVIDENCE_MATRIX.md) |
| Comparaisons indépendantes physiologiques | Références publiées déjà présentes, notamment INSCYD vs MLSS vélo Poffé N=29. Leur portée est attribuée au système étudié. Pas de nouvelle validation expérimentale TFCL, ni extrapolation automatique à la course. |
| Incertitudes restantes | Archives N=44/N=15 non retrouvées ici ; fixture Modèle C de 17 profils sans provenance observationnelle complète ; 2,64 historique différent du RMSE actuel 1,5607 non pondéré. Marges heuristiques, proxies et dispersion populationnelle distincts. [Audit](SCIENTIFIC_UNCERTAINTY_AUDIT.md) |
| Fonctionne mais contrat DET incomplet | Valeurs/limiteurs et conversions W/km/h/m/s préservés dans V20 ; objets effectifs disponibles, incertitudes des ancres non entièrement consommées ; coût O₂ à séparer du score. [Interface](DET_ENGINE_INTERFACE_AUDIT.md) |
| Vrais défauts | **4 défauts reproduits**, localisés à validation/provenance/contrat : bornes du profil, libellé snapshot, import VLa course, score économie→CE. Candidats isolés et patch non appliqué. [Détails](CONFIRMED_DEFECTS.md) |

**Aucun défaut d'équation physiologique démontré nécessitant de la remplacer.** Les quatre défauts de raccord ne permettent pas de qualifier globalement les calculateurs de non fiables. Le NO-GO concerne l'activation de cette expérimentation et la portée insuffisante pour certifier toute la chaîne en conditions réelles.

## Exécutions et traçabilité

| Exécution | Résultat | Artefact |
| --- | --- | --- |
| Suite existante sélectionnée, sans modification | 35 fichiers, 332 PASS | [existing-tests.txt](evidence/existing-tests.txt) |
| Reproduction F1–F3 sur production | 6 FAIL attendus, 5 PASS | [confirmed-defects-before.txt](evidence/confirmed-defects-before.txt) |
| Reproduction F4 sur production | 3 FAIL attendus | [economy-contract-before.txt](evidence/economy-contract-before.txt) |
| Candidats initiaux + chaîne | 15 PASS puis 18 PASS après ajout F4 | `experimental-tests.txt`, `experimental-tests-final.txt` conservés |
| Candidats finaux + 37 profils QA | 3 fichiers, **55 PASS**, retry=0 | [experimental-tests-final-expanded.txt](evidence/experimental-tests-final-expanded.txt) |
| Cohérence patch F4 | `git apply --check` sans application | [patch](../../../experimental/physiology-validation/v1/economy-contract.patch) |
| Sources production et DET | Contrôle des identités et des fichiers inchangés | `evidence/det-source-comparison.json`, `evidence/integrity.json`, `evidence/SHA256SUMS` |

Un essai de configuration du harnais a inclus involontairement la sélection de base ; arrêté et conservé (`harness-selection-attempt.txt`), il n'entre pas dans les PASS annoncés. Un premier chargement F4 a été refusé par le garde de substitutions ; périmètre de transformation resserré au helper, essai conservé (`economy-loader-attempt.txt`). Ce sont des erreurs de harnais, pas des échecs scientifiques masqués. Exécutions suivantes déclenchées manuellement après correction, aucune boucle de relance.

Le clone shell initial était bloqué par le proxy du sandbox ; accès réseau autorisé utilisé pour cloner. `npm ci` a refusé le lockfile désynchronisé de `package.json`. Une installation contrôlée `--package-lock=false --ignore-scripts` a permis les tests, **sans modification des manifestes suivis** ; Vitest effectif 4.1.12 et Node 24.19.0. La résolution de dépendances n'est pas déclarée identique au lock historique ; ce problème d'environnement n'est pas une défaillance de calcul physiologique.

## Périmètre et garde-fous

Pas de formule, fichier `src/`, fonction Edge, migration, catalogue ou payload de production changé. Pas de donnée athlète réelle, de base Supabase interrogée, d'appel Nolio, d'API payante, de génération IA, de fusion, de déploiement ou d'automatisation. Tests unitaires/contrats synthétiques et lecture des résultats DET archivés uniquement. Aucun nouveau résultat de laboratoire inventé. Les parcours React/DB, le rendu visuel complet et les essais physiologiques hors échantillon restent non vérifiés.

Budget : dix unités bornées, moins de 60 minutes ; journal et reprise dans [REPRISE](REPRISE.md). Aucun budget reconduit.

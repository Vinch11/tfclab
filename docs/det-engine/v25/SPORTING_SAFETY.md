# Validation et sécurité sportive

| Exécution | Tests réussis | Tests ignorés | Code sortie |
|---|---|---|---|
| build | 40 | 0 | 0 |
| replay | 40 | 0 | 0 |
| v24_non_regression | 23 | 0 | 0 |
| v23_non_regression | 25 | 0 | 0 |
| v22_non_regression | 27 | 0 | 0 |
| multiobjective_non_regression | 175 | 5 | 0 |
| types | TypeScript | 0 | 0 |

40 tests V25, puis rejeu des mêmes 40; 250 tests pertinents V24/V23/V22 et multiobjectifs réussis, 5 anciens tests ignorés. TypeScript sans émission réussi. Le vérificateur Python indépendant compare les huit résultats V24 complets, les hashes des sources, les revendications, les bornes de recettes, les 15 fixtures et les journaux d'états. Quatre artefacts de rejeu sont logiquement identiques.

Un test négatif sur la liaison valeur/source a d'abord échoué : ce résultat et la première validation à 37 tests sont conservés. La seconde validation teste le correctif; la troisième ajoute le refus structurel des sujets de récupération invalides. Aucun seuil sportif ou calculateur n'a été modifié pour rendre un test vert.

Les erreurs brutes du plancher restent critical dans leurs contrôles d'origine. Le complément V25 ne les remplace ni ne les reclasse; il les identifie comme objets exacts de la dérogation à examiner et conserve tout défaut supplémentaire. Des tests empêchent une erreur vélo/quota étrangère ou une source modifiée d'être couverte par cette dérogation.

Les rejets portent aussi sur capacité inconnue ou insuffisante, recette tronquée, variante Ironman trop courte, score/coût confondus, source non vérifiée, revendication altérée, mauvaise identité, référence périmée/future, récupération inconnue/défavorable, douleur, tolérance antérieure absente, microcycle incompatible, document coach non authentifié et toute approbation simulée.

Les 4742 fichiers antérieurs sont inchangés : archives V2–V24 et preuves V21, 920 IDs, 2 425 variantes, 600 configurations recomptées mais non rejouées ici, 96 chronologies / 51 IDs, 418 vues et 15 fixtures Nolio. Aucune écriture/export Nolio, donnée réelle, migration, fusion, déploiement, API payante, modification de production, de catalogue, de calculateur ou de validateur.

Les seuils historiques ne deviennent pas des lois physiologiques du seul fait d'exister dans le code. Inversement, les qualifier de conventions ne les désactive pas. La revue humaine reste obligatoire; aucun plan ou dose n'est sportivement approuvé.


## Correction documentaire versionnée

Après la validation Node finale, deux chemins d’archives dans les vérificateurs Python ont été corrigés : V24 et V20 conservent leurs dossiers `validation-2`, sans création de faux dossiers `validation-3`. L’échec initial, les deux versions originales, leurs hashes, les diffs et les versions corrigées sont conservés dans `evidence/auxiliary-path-correction/`. Les sources TypeScript, tests, contrôleur et assertions sur les résultats restent inchangés. Le contrôle final vérifie les sources moteur/tests actives et les deux versions auxiliaires séparément ; aucune exception ne peut couvrir un moteur ou un test.

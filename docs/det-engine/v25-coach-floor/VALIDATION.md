# Validation et preuves

| Exécution | Tests réussis | Tests ignorés | Code sortie |
|---|---|---|---|
| build | 29 | 0 | 0 |
| replay | 29 | 0 | 0 |
| v25_non_regression | 40 | 0 | 0 |
| v24_non_regression | 23 | 0 | 0 |
| v23_non_regression | 25 | 0 | 0 |
| v22_non_regression | 27 | 0 | 0 |
| multiobjective_non_regression | 175 | 5 | 0 |
| types | TypeScript | 0 | 0 |

29 tests propres à la dérogation et leur rejeu, plus 290 tests de non-régression V25/V24/V23/V22/multiobjectifs. Les 5 tests anciens ignorés restent explicitement comptés. TypeScript sans émission : réussi. Le vérificateur Python indépendant contrôle sources, politique, isolation, deltas complets, budgets, doses, états et quatre artefacts de rejeu logiquement identiques.

Les quinze fixtures V25 (5 floor, 4 physiologiques, 6 récupération) sont effectivement réexécutées et comparées à leurs résultats archivés. L'autorisation de politique ne transforme pas un scénario favorable en approbation individuelle.

Le premier essai négatif a révélé une aliasation de cibles numériques entre référence et alternative. La correction copie ces données et lie la référence par hash. Le second essai a révélé qu'un helper ancien suppose un graphe complet; le nouveau précontrôle refuse la suppression d'une séance avant son appel. Les échecs et corrections sont archivés, sans modifier le helper historique ni les assertions pour masquer le défaut.

La dernière version refuse aussi les caches de résultats altérés, les sidecars absents, les vues d'exécution contradictoires, les demandes opt-in falsifiées et un état individuel relabellé admissible.

Pour chaque alternative, le résultat brut historique passe de **4 à 5 erreurs**, car le floor 95 reste appliqué par ses validateurs d'origine. Le nombre d'avertissements reste inchangé. Les trois témoins par cas sont conservés et la lecture complémentaire indique seulement qu'ils relèvent de l'autorisation expérimentale du plancher. Aucun autre défaut n'est couvert ou supprimé.

Les 4850 fichiers antérieurs restent inchangés, avec archives V2–V25, 920 IDs, 2 425 variantes, 600 configurations historiques recomptées mais non réexécutées ici et 15 fixtures Nolio conservées. Aucun calculateur, validateur, catalogue de production ou moteur actif n'est modifié. Aucun appel Nolio, dépense, migration, fusion, déploiement ou donnée réelle.

La preuve temporelle étroite de la source est distincte de certaines limites anciennes de parsing conservées dans le brut. Elle établit la construction complète à 90 minutes, sans attester une exécution individuelle observée. Aucun ancien indicateur de parsing n’est effacé pour simuler une validation sportive.

# Tests, régressions et limites

Expérimental — DRAFT / NO-GO. Sources préservées, propositions non approuvées. Aucun appel réel Nolio, aucune donnée athlète.

Validation acceptée : [evidence/validation-2/commands.json](evidence/validation-2/commands.json). Douze contrats de modalités, cinq tests de traçabilité rejoués, typage du périmètre expérimental et source, deux constructions intégrales, deux audits indépendants Python et six mutations rejetées. Catalogue, audits d’événements et résultats physiologiques/calendaires sont identiques au rejeu. Les 920 objets du premier cycle sont inchangés ; ses fichiers et 19 sources exécutées sont contrôlés par empreintes.

Non-régression ciblée : [186 tests historiques, 31 fichiers](evidence/historical-regression.txt), [30 tests expérimentaux, 8 fichiers, trois exclusions préexistantes](evidence/experimental-regression.txt). Ce n’est pas la suite entière de l’application ni un nouveau rejeu des 600 configurations : leurs sources, résultats et preuves restent inchangés.

Le premier essai de validation du cycle 2 a échoué au typage du nouveau lecteur JSON (Map inférée unknown et division optionnelle pouvant produire NaN). La correction porte sur le type du lecteur et l’expression explicite de l’absence de témoin. Aucun validateur sportif ou test de prescription n’a été retiré. [Échec conservé](evidence/validation-1/failure.json). Les tentatives et leurs journaux ne sont pas écrasés.

Le vérificateur indépendant réanalyse les quantités littérales, reconstitue les distances par répétition et contrôles de récupération, vérifie l’arithmétique, les rendus/payloads inchangés et les origines scientifiques. La sémantique des sources et l’applicabilité individuelle restent des limites de revue. Il ne délivre pas une qualification scientifique.

## Validation consolidée et réparation bornée

La preuve finale est [`validation-3-repair-1`](evidence/validation-3-repair-1/repair-provenance.json). Le troisième essai complet a retrouvé les tests, le typage et les deux constructions valides, puis a échoué dans la sélection d’un mutant de force : aucune dose ne se trouvait sur le premier bloc (échauffement). Les 920 contrôles de données avaient passé avant cette recherche. [Échec conservé](evidence/validation-3/failure.json), [vérificateur avant correction](evidence/mutation-fixture-before-repair.py).

Une seule reprise diagnostique a corrigé le choix du bloc à altérer, sans changer les neuf assertions de mutation ni aucun moteur, dose, contrat sportif ou test TypeScript. Les contrôles déjà réussis sont réutilisés avec leurs empreintes inchangées ; les deux audits indépendants et les deux tests de chaîne sont réellement exécutés à nouveau. Les deux builds sont byte-identiques à la validation 2. Le nombre maximal de trois essais complets et l’échéance restent inchangés, avec une seule reprise explicitement tracée. Aucun quatrième essai complet.

Les vérifications supplémentaires couvrent 920 dossiers (qualification scientifique et sources inchangées), 920 vues source et 418 vues candidates effectivement affichées, huit contrats des fonctions pures Nolio et quatre contrats du sérialiseur public. Les études des dossiers, du chemin Nolio et du format public ont des rejeux identiques. Les audits indépendants Nolio vérifient 15 fixtures et distinguent quatre pertes de cible, onze arrondis documentés et le sérialiseur public conservant les valeurs exactes. Voir [compatibilité détaillée](NOLIO_SOURCE_PATH.md).

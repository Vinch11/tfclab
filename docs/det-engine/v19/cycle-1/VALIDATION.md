# Validation et preuves

Expérimental, DRAFT — NO-GO. Les variantes éditoriales ne sont ni des preuves historiques, ni des prescriptions sportivement approuvées. Aucun accès réel Nolio ou athlète.

Les commandes acceptées sont archivées dans [commands.json](evidence/validation-2/commands.json), avec limites de temps, taille de logs, mémoire Node et un worker. Les sources exécutées ont une empreinte avant/après. Les deux sorties complètes et les contrôles indépendants sont identiques au rejeu.

Contrats V19 : 25 tests. Mutations indépendantes : huit, avec vérification préalable que le jeu original passe. Non-régression ciblée : 32 contrats V18 et neuf tests de sélection V18, sans relancer son registre clos. Typage réussi. Les quatre tests de réévaluation vérifient notamment qu’un ajout après le dernier effort ne change pas le travail ni les repos avant cet effort. Aucun statut « dose sélectionnée » du contrôleur V9 n’est fabriqué pour faire progresser un candidat.

Le code prototype et les artefacts sont strictement V19. Les 3 635 fichiers suivis antérieurs, 920 sources et références V2–V18 restent byte-identiques. Le vérificateur CLI V18, limité par conception aux chemins V18, refuse les nouveaux fichiers V19 ; cela n’est pas une régression de ses règles. Le contrôle de préservation V19 reprend l’ensemble des empreintes.

Deux échecs ciblés ont été conservés : comparaison mémoire undefined/JSON null d’un groupe regex, résolue par comparaison intégrale de la forme sérialisée ; et détection de « sans D+ » comme une exposition, corrigée avant validation. Aucune règle sportive historique ou assertion de dose n’a été assouplie.

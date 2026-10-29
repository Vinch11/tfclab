# Exécution, réservation et marge : trois durées différentes

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

Les champs sont `executionDurationSeconds`, `reservedSlotSeconds`, `unallocatedSlotSeconds`, `timelineEvents`, `durationAccounting`, `legacyCompatibility` et `individualApprovalStatus`. Pour catch/pull :2755s d’exercice,3300s réservées,545s non attribuées. Aucun de ces545s n’est ajouté à la chronologie, à un échauffement ou à une récupération.

Chaque événement garde son contenu complet V28, son occurrence, un identifiant lié au scénario/source/index/contenu, son temps entier et sa position relative. Les occurrences ne sont pas dédupliquées par leur texte : deux répétitions identiques demeurent deux événements distincts. Les identités dupliquées, suppressions et changements de séquence sont refusés contre la séquence source enregistrée.

Les durées incluses sont des annotations d’un parent additif explicite. Le test600s de continu avec deux annotations60s d’échauffement/retour au calme reste600s, pas720s. Un parent absent, des bornes incompatibles ou un chevauchement inclus non documenté sont refusés. Les onze recettes V28 utilisées ici ont des événements additifs déjà développés ; aucune nouvelle périphérie n’est inventée.

Les secondes et leurs sommes doivent être des entiers sûrs. Sous-secondes, dépassement de capacité arithmétique, réservations historiques fractionnaires et somme différente du total sont refusés. Une chronologie partielle garde ses événements connus, mais sa durée totale et ses positions absolues non démontrées restent inconnues.

Si l’exécution dépasse la réservation, la marge non attribuée vaut0 et un dépassement explicite est rapporté : aéro90min dans85min donne300s de dépassement. Une durée inconnue ne devient pas zéro. Les plages d’intensité peuvent rester décimales ; elles ne servent jamais à arrondir le temps.

Le registre vérifie les fichiers V28 par SHA256 réel, la ligne exacte, les paramètres, le contexte, le profil et la séance d’origine. Les vues renvoyées sont des copies ; les preuves privées ne suivent pas une mutation de leur vue publique. Un hash fourni par l’appelant ne remplace pas la comparaison avec la source enregistrée. L’ancre FTP/allure est exigée lorsqu’elle pilote le stimulus ; elle n’est pas inventée comme préalable au gainage poids du corps.

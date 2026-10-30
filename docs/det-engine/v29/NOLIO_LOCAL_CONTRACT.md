# Nolio : chronologie interne et texte local exacts

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

Sept chronologies connues produisent une représentation interne versionnée : date synthétique du calendrier, source/version, événements, intensités, consignes, secondes d’exécution, réservation et marge distinctes. Le rejeu JSON conserve l’objet et sa somme entière. Ce schéma interne n’est pas une API Nolio.

Cinq scénarios sans nouveau défaut complémentaire produisent un payload texte local vérifié par le contrat V1 existant : aéro5100s, nages2755/2860s et gainages1834/1924s. Le champ `duration` reçoit les secondes d’exécution exactes, jamais le créneau5100/2100s par assimilation. La description conserve les consignes source, les segments, tempos, côtés, tours, charge poids du corps et conventions de repos, ainsi que les marges explicitement non attribuées. Un garde indépendant et un test rouges ont détecté l’omission initiale de la charge ; le rendu corrigé est testé sans changer les paramètres. L’ID athlète1 reste une fixture, pas un destinataire réel.

Les nages sont des fixtures55min uniquement ; aucun payload n’est préparé pour les créneaux natifs35min. Les scénarios refusés (aéro90min, variante2K inconnue, recettes partielles) gardent seulement leur représentation interne de revue lorsque possible. Une recette partielle ne devient pas un workout complet. Source/profil altéré après le pont : refus.

Aucun `structured_workout` officiel Nolio n’est émis. La représentation des nages, éducatifs et exercices musculaires n’est pas démontrée par le seul miroir local ; la voie structurée de cette nouvelle couche reste refusée explicitement, même en vélo. Les travaux publics V19/V20 sont conservés sans inventer de contratV2. Le sender courant peut normaliser des cibles, ajouter des pauses natation ou retirer une structure de force ; aucun passage par cette voie n’est activé ou revendiqué fidèle par ce test.

La validation texte porte sur la sérialisation locale, pas sur l’acceptation distante ou une autorisation d’export.0 appel Nolio,0 écriture,0 export réel,0 approbation individuelle. Les15 fixtures antérieures sont conservées ; aucun sender n’a changé.

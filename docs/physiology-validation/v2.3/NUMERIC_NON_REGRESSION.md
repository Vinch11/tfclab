# Non-régression numérique et différences documentées

## Référence indépendante des 37 profils

Avant modification runtime, la référence `4d8c788f…` a été capturée dans `qa-reference-4d8c788f.json.gz`. Les 37 empreintes de ses effectifs correspondent aux archives V2 existantes : la capture contient bien les anciens labels et aucune qualification V2.3. Les sources QA ne sont pas modifiées.

`qualificationV23Compatibility` compare chaque chemin avec cette référence complète : tous les nombres, booléens, alertes, limiteurs, readiness, cibles et objets MLSS doivent rester exactement identiques. Seuls les chemins de label/détails/journal textuel explicitement listés et les nouveaux blocs de qualification peuvent différer. Les nouvelles qualifications des profils historiques restent unknown, sans validation/dose individuelle.

Les anciens tests de hash ont d'abord échoué, comme attendu : leur objet `effectifs` contenait aussi les labels fautifs à corriger. Ces échecs restent dans `regressions-first.txt`. Ils sont remplacés par une comparaison structurelle plus précise, **pas par une nouvelle baseline ajustée aux corrections**. Les empreintes historiques de la référence restent vérifiées. Tous les chemins hors liste autorisée restent comparés sans exception.

[Différences par profil](evidence/qa-semantic-differences.json) : **37 profils, zéro différence numérique ou décisionnelle**. Les nouvelles valeurs dans les champs de qualification ne sont que des copies du contexte existant, pas de nouvelles estimations. Les 25 suppressions de prédictions MLSS de V2 restent celles déjà documentées ; aucun nouveau statut favorable n'est créé.

## Mathématiques et protections

Le vérificateur `scripts/physiology-validation/v2.3/verify-preservation.mjs` compare les objets Git de la référence avec le code courant :

- Six fonctions de clamp, EWMA, sélection du lissage, calcul de confiance, marge et variation **identiques**.
- Treize initialisations mathématiques/constantes de la chaîne V2 **identiques**, dont bornes, lissage, confiance, erreur, plage et verrou.
- Parmi les douze fichiers de cœur précédemment suivis : **onze identiques octet par octet** ; `vlamaxCapEstimator.ts` ne change que « mesurée » en « référence déclarée, méthode à qualifier » dans une chaîne de détail. Le reste du fichier est comparé exactement.
- Les règles de pacing ne changent qu'un libellé ; le scénario ne change qu'un nom de variable de catégorie interne et un libellé. Le vérificateur impose l'égalité du reste de ces fichiers. Aucun refus, plafond, coefficient ou seuil modifié.

[Preuve structurée](evidence/scientific-numeric-preservation.json), [sortie du vérificateur](evidence/preservation-check.txt). Le premier lancement dans le sandbox a rencontré une restriction de sous-processus Git ; le même contrôle en lecture seule a ensuite réussi dans l'environnement autorisé. Aucun garde n'a été désactivé.

## Oracles et fixtures positifs

Le cas positif V2.1 de déclaration coach reçoit désormais les informations explicitement exigées par le nouveau contrat (sujet, quantité, méthode, date, nature et source documentaire synthétique). Ses assertions positives sont conservées. Le cas V2.2 d'une estimation sans provenance complète attend maintenant unknown, tout en conservant son assertion de non-héritage de la déclaration coach. Les tests V2.3 vérifient séparément les modèles/terrains documentés : l'inconnue n'est pas obtenue en supprimant ces voies.

Un test de rendu staff a rencontré deux occurrences légitimes du même score heuristique ; son sélecteur vérifie la présence des occurrences, sans modifier le comportement ni masquer un défaut métier. Aucun skip/TODO nouveau, aucune règle ESLint désactivée.

Les déclarations de release sont régénérées avec l'outil normal ; attestation et déploiement restent false. Les locks, paramètres sportifs et historiques restent conservés. Les passes logicielles ne constituent pas une nouvelle validation physiologique.

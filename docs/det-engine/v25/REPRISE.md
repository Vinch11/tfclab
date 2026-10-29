# Reprise V25

Baseline `24024f6f9f7bc91b4c9a8bdce676d21625eff29b`, branche `experiment/det-engine`, PR #420 DRAFT / NO-GO. #424 lu au SHA `36a8f2f69c07248aa4e08bbc4bb322e9ae4c759d`; aucun fichier fusionné et aucun calculateur modifié.

Le nouveau registre `state.json` fixe le départ à 15:39:05 UTC et la limite absolue à 16:39:05 UTC le 29 octobre 2026, avec dix unités maximum. Il ne renouvelle pas le budget et n'installe aucune relance. La consommation exacte des crédits n'est pas exposée par l'environnement.

Résultat retenu : `evidence/validation-3`, `evidence/independent-validation.json`, `registered-contract-fixtures.json` et `contract-results.json`. La validation 1 et le test négatif de liaison valeur/source sont conservés. Les entrées complètes sont archivées avant l'exécution des nouveaux contrats. Les observations de novembre sont des trajectoires futures simulées, pas des données actuelles.

Réutiliser `v25-prescription.ts` pour la composition V24 et les paquets complémentaires, `v25-floor.ts` pour l'exception limitée, `v25-physiology.ts` pour le transfert typé, `v25-recovery.ts` pour les événements et `v25-coach.ts` pour la frontière humaine. Aucun de ces modules ne remplace les règles historiques ou n'active une prescription.

Le contrôleur refuse une session clôturée/expirée, mauvaise branche, plus de dix unités, plus de trois validations ou un dossier de sortie déjà existant. Node est borné à 2 Go de tas, chaque processus à 180 secondes au maximum et les logs à 12 Mo; le délai restant raccourcit ces limites. Le journal de récupération est limité à 32 événements.

Pour toute mission ultérieure, confirmer les têtes distantes, lire le statut de clôture, créer un nouveau budget explicitement autorisé et préserver ces preuves. Ne pas relancer les unités V25 clôturées. Ne jamais transformer `technically_receivable_for_explicit_floor_review` ou `candidate_for_coach_review` en approbation individuelle. Une signature humaine authentifiée et les preuves sportives restent indispensables.


Les correctifs de chemins documentaires post-validation sont versionnés dans `evidence/auxiliary-path-correction/manifest.json`. Les sources auxiliaires correspondant aux anciens pins sont conservées, et les versions réellement exécutées sont hachées séparément. `v25-final-check.py` contrôle cette transition limitée à deux outils documentaires et tous les autres pins actifs. Aucun quatrième cycle global ni assouplissement du budget n’a été exécuté.

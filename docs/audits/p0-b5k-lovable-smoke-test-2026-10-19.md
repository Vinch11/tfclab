# TFCLab — recette Lovable avant publication (P0 débutant)

**Statut : procédure préparée, NON exécutée.** Branche : `test/p0-b5k-safety-gates-20261018`, PR #388 vers `main` (brouillon). Aucun merge, aucune publication et aucun nouvel appel Gemini ne sont autorisés par cette recette.

## 0. Vérifier la version réellement prévisualisée
- Confirmer dans Lovable que l'aperçu contient le commit de la PR #388 et la route `/debug/plan-qa`. Un aperçu de `main` seul ne suffit pas pour tester cette branche.
- Si Lovable ne peut prévisualiser que `main`, **arrêter la recette** : ne pas fusionner pour « voir si ça marche » sans validation explicite.
- Noter la référence du commit, l'URL d'aperçu, l'heure, le compte utilisé et le résultat de chaque contrôle (sans consigner de données personnelles).

## 1. Contrôle des accès
- Session déconnectée : `/debug/plan-qa` doit demander l'authentification.
- Compte ATHLETE (profil existant de test) : après connexion, afficher « Accès réservé aux coachs TFCLab », sans monter le Pilot Cockpit.
- Compte STAFF_COACH de test : la page et le Pilot Cockpit doivent s'afficher.
- Erreur de lecture de profil : accès refusé, pas de « fail-open ».
- Vérifier dans Supabase que la migration `20260827065948_1d750d6f-f847-4a06-90d8-7dada25abbdd.sql` est appliquée. Vérifier côté serveur/RLS qu'un ATHLETE ne peut pas modifier `profiles.role` en `STAFF_COACH`.
- **Limite** : la protection UI n'est pas une autorisation serveur pour tous les appels edge. Auditer les politiques RLS et endpoints sensibles avant d'affirmer que la console est sécurisée de bout en bout.

## 2. Audit et export sans coût IA
- **Ne pas cliquer** « Lancer » / « Lancer malgré tout » : ces actions peuvent facturer une génération.
- Le bouton « Exporter audit P0 + plan complet » apparaît uniquement si `lastResult.profileId === "B-5K-BEGINNER"` et `lastResult.merged` est présent.
- La console actuelle ne dispose **ni d'import JSON historique ni d'un mode de démonstration injectant un plan**. Par conséquent, sans résultat déjà présent dans la session, **l'export ne peut pas être testé manuellement sans nouvelle génération**. Marquer ce contrôle « non testé », ne pas contourner par un appel payant.
- La chaîne hors ligne est couverte par les tests `b5kHistoricalOfflineExport.integration.test.ts`, `buildPilotSafetyExport.test.ts` et `auditBeginnerRunSafety.test.ts` ; ces tests ne remplacent pas une recette navigateur.
- Si un dernier résultat valide est déjà présent : laisser les plafonds vides, sélectionner risque « Inconnu », exporter ; vérifier `schemaVersion=1`, `mode=diagnostic_only`, `finalMergedPlan`, `safetyIssues`, `coachSuppliedContracts.highRunInjuryRiskAssessment="unknown"`. Refaire avec les contrats CAP explicitement confirmés par le coach.
- Vérifier le téléchargement iPhone/iOS Safari, le nom du fichier, le contenu JSON et l'absence d'appel réseau IA au clic d'export. **Ne pas partager le fichier complet publiquement**.

## 3. Critères de décision
- **GO pour diagnostic uniquement** : CI verte sur le commit candidat, contrôles d'accès validés en aperçu, migration et RLS vérifiées, export testé ou limite explicitement acceptée, plan de rollback connu.
- **NO-GO** : aperçu sur une mauvaise branche, rôle auto-élévable, accès athlète à la console, génération payante non intentionnelle, fichier contenant des données personnelles exposé, ou erreur de téléchargement non résolue.
- L'audit P0 reste heuristique et ne bloque aucune génération ; les six `it.todo` empêchent toute prétention de blocage de sécurité complet.

## 4. Autorisations finales
1. Obtenir l'accord explicite du propriétaire avant **fusion** de #388 vers `main`.
2. Recontrôler la CI sur le commit fusionné et l'aperçu Lovable de `main`.
3. Obtenir l'accord explicite du propriétaire avant **publication** ; l'utilisateur clique lui-même sur « Publier ».
4. Après publication : tester `/debug/plan-qa` ATHLETE et STAFF_COACH, contrôler les erreurs et conserver une procédure de retour arrière.

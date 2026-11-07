# Persistance réelle — NON VALIDÉE

Aucun projet Supabase de test **explicitement désigné et autorisé** n'a été identifié. Le contexte cloud courant expose zéro identité sortante, secret ou variable runtime configurée ; aucun connecteur Supabase n'est disponible. Le dépôt contient une configuration Supabase d'application, qui n'établit aucune autorisation de test sur ce projet. Aucun secret ni fichier `.env` n'a été ouvert pour découvrir des accès ; aucune requête n'a été envoyée à Supabase.

**Sauvegarde, fermeture, réouverture, restauration, RLS et erreurs réseau sur un vrai projet Supabase : NON VALIDÉES.** Les tests mémoire et le smoke localStorage antérieur restent des preuves logicielles séparées, jamais une réussite réseau simulée.

## Ce que la lecture et les tests démontrent

Les migrations décrivent `snapshots_select_own`, `snapshots_insert_own`, `snapshots_update_own`, avec `coach_id = auth.uid()` et contrôle d'écriture. Elles n'attestent pas l'état effectivement déployé. Pour confirmer la sauvegarde par retour de ligne, la session authentifiée doit disposer de SELECT et INSERT/UPDATE autorisés par RLS sur sa ligne ; une autre session coach ne doit ni la lire ni la modifier. Aucun service-role n'est nécessaire au client.

L'oracle logiciel est : **sans ligne exacte acquittée, aucun succès ni mutation locale**. Les cas exécutés couvrent : erreur serveur, rejet de promesse réseau, zéro ligne visible, ligne supprimée entre lecture et écriture, insert sans reçu, récupération exacte par UUID, notes de 2 000/2 001 caractères, éditions successives, retour à l'ancienne valeur, remontage et historiques illisibles. Les succès utilisent les données canoniques retournées, pas les seules valeurs envoyées.

Ces scénarios utilisent un transport synthétique ; ils ne prouvent pas les permissions RLS. Un timeout après commit peut laisser une écriture distante effective : l'absence de reçu **ne prouve pas l'absence d'écriture**. Le client indique une opération non confirmée, sans retry automatique ni résultat local fictif. La réconciliation distante et les écritures concurrentes entre onglets restent non validées.

## Protocole à exécuter seulement avec une autorisation future

1. Épingler projet test, session coach A et coach B, schéma/RLS et engagement de non-production ; données entièrement synthétiques.
2. Importer score et coût explicitement distincts ; noter UUID, valeurs, unités, discipline, méthode/date, origine, confiance/fondement/marge et notes sérialisées.
3. Sauver, fermer réellement le client, rouvrir et relire depuis la base. Éditer un paramètre sans modifier les autres, puis revenir à sa valeur initiale : sa preuve périmée ne doit pas réapparaître.
4. Vérifier limites de notes, enveloppes malformées et historique sans migration ; vérifier la référence exacte récupérée après absence de reçu.
5. Avec B : lecture/écriture de A refusées ; avec A : UPDATE+SELECT retourne exactement sa ligne. Tester ligne supprimée, session expirée, refus RLS et coupures avant/après commit.
6. Vérifier l'absence de succès local après erreur ; réconcilier par UUID l'état indéterminé d'un timeout. Archiver preuves expurgées et comparaison canonique, puis appliquer le protocole de nettoyage explicitement autorisé du projet test.

Ce protocole est **préparé, non exécuté**. Il ne donne aucune autorisation de connexion, migration ou nettoyage à la production.

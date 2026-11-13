# Coach A — recette dans le navigateur du coach

3 novembre 2026. Source QA `1a43da93f4b4c61519deb6644eff4fc9d6358bf5`, non publiée. Le navigateur de Vince et celui du service de test sont séparés ; rester connecté dans le premier ne transmet pas la session au second. Aucun autre login ni impersonation n'a été tenté.

Ouvrir [la page dans l'éditeur QA](https://lovable.dev/projects/c3941303-40d2-447e-9b87-867d82727fd1?preview-path=%2F__qa%2Fcoach-a-recipe), vérifier « Coach A vérifié par getUser serveur », puis cliquer « Lancer les vérifications Coach A ». Les résultats sont affichés et enregistrés dans `qa_coach_recipe_reports` (SELECT/INSERT propriétaire, append-only). Le téléchargement/copie JSON est disponible si la relecture du rapport échoue. Ne jamais partager de jeton ou mot de passe.

La page refuse un contexte non DEV/non QA, un compte déconnecté ou différent de A. Elle ne lance aucun test sans clic. Recette technique synthétique/non prescriptive : archivage, reprise, ACK perdu simulé après véritable insert, indisponibilité de relecture, édition, isolement A→B et cycle du courant seulement après référence sauvegardée/revérifiée. Le bouton de reprise « Rétablir le plan courant de référence » est disponible si une interruption empêche la restitution. Les nouvelles archives sont conservées séparément, sans effacer ni modifier les quatre anciennes. Aucun appel IA/Nolio ni avis sportif.

15 tests ciblés, types/lint/build et garde signée-out vérifiés. Le service de test a vu le bouton inactif et zéro écriture ; cela n'est pas une preuve d'exécution sous A. [Preuve de préparation](COACH_A_RECIPE_PAGE_PROOF_2026-11-03.json).

Audit indépendant avant clic : A4versions/empreinte `543e381a32500dfcf59bc1e384d3e752`, courant `34230fb711707b19d9766814105f0a33` ; B11versions, courant JSON `e46b4b279c0ca2b1f4f4ddda257be5c9` ; zéro rapport. Ces valeurs serviront au contrôle après exécution. Ce SELECT admin est une preuve d'intégrité, pas un test JWT A. Pilote non activé, aucune production.

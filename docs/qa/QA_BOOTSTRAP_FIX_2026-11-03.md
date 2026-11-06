# QA — démarrage et connexion Nolio, preuve du 3 novembre 2026

Source finale QA `bf97605ba24a5db68e4527122c9e28e319ce743f`, non publiée, non attestée. Le coach a confirmé l'ouverture de la page et la lecture réelle de Nolio. Une projection SQL indépendante confirme maintenant **1 connexion active**, avec 97 sports dont 27 utilisables et 242 exercices.

## Démarrage

Le splash HTML pouvait rester affiché si le module App échouait avant l'installation de son ancien timer. Le chargement dynamique dispose maintenant d'une limite de 25 s et d'un affichage d'erreur ; un watchdog indépendant dans index.html couvre un module principal absent ou bloqué après 35 s. Les réponses tardives ne remplacent pas l'erreur. Les accès au stockage du thème sont protégés.

L'incident exact du navigateur utilisateur n'a pas été reproduit. Le redémarrage de Vite pendant un chargement reste une hypothèse. Les tests navigateur ci-dessous portent sur l'application DEV complète dans Chromium local, sans session du coach.

## Vérifications rapportées

- Route QA visible dans le test Chromium, splash retiré au relevé à 8 s.
- Import App rejeté, bloqué ou tardif : erreur visible avec bouton Recharger.
- Module principal rejeté ou bloqué : erreur HTML visible.
- Méthodes de stockage qui jettent : thème par défaut et ouverture de la page.
- Stockage entièrement inaccessible : erreur visible, ouverture encore empêchée par le client Supabase généré.
- Routes protégées sans session redirigées vers /auth.
- Aucun appel Nolio et aucun appel functions/v1 durant ces tests navigateur.
- 218 tests de la sélection QA/Nolio/bootstrap réussis, 1 ignoré ; types, lint sans erreur et build valides. Les 10 nouveaux tests sont détaillés dans le JSON.
- Les fichiers serveur Nolio n'ont pas été modifiés par ce lot ; le contrôle Deno précédent reste distinct de ces tests frontend.

## État Nolio réel

L'activation manuelle est confirmée séparément : [preuve de lecture et activation](NOLIO_V2_REAL_REFS_ACTIVATION_2026-11-03.md). Le statut pending_refs de la première capture à 14:40 est historique ; la capture suivante et la projection SQL indiquent active, génération 1, refresh idle, 1 connexion active. L'activation ne crée aucune séance chez Nolio.

La simulation serveur d'une séance, l'envoi calendrier, le renouvellement réel et la validation sportive restent à prouver.

## Limites de la revue

Le watchdog de démarrage utilise un rechargement manuel. La récupération historique des anciens chunks et les mises à jour PWA restent présentes dans main.tsx ; ce lot ne prétend pas les supprimer. La capture des erreurs asynchrones de rendu reste assurée par les boundaries React existantes. La cause exacte du blocage utilisateur n'est pas établie.

Aucun jeton, identifiant d'athlète Nolio, capture privée, envoi réel, publication, main ou production modifié dans cette preuve.

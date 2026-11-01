# TFCLab — Recette P0 DET-ENGINE : Supabase, RLS et exploitation (01/11/2026)

**Statut : NO-GO production.** Cette PR contient une recette optionnelle sans changer DET-ENGINE, ses règles sportives, les fonctions Edge ou les déploiements.

## Diagnostic GitHub confirmé

- PR #454 (https://github.com/Vinch11/tfclab/pull/454) : expérimentale et DRAFT, HEAD audité 50b7c2ff2588492860f8a3bbadfc875be9d6bc18. Sa base est une branche expérimentale, pas main.
- CI #1484 (https://github.com/Vinch11/tfclab/actions/runs/41290557313) : DET spécialisé, Deno, ESLint et Playwright verts ; Vitest rouge, trois tests en échec.
- Deux échecs dans lovableBuild.test.ts : PLAN_RELEASE_DECLARATION_STALE:releaseId ; un dans globalPlanningMatrix.test.ts : SHA des invariants différent de la référence.
- Résultats DET communiqués : cinq calendriers synthétiques conformes ; 70.3 à 10 h résolu ; 9 h et 9 h 30 non résolus dans le budget de recherche. Il n'est pas démontré que 10 h est un minimum. Ne jamais affaiblir qualité hebdomadaire, volume, polarisation ni récupération pour contourner ce blocage.
- Le frontend sauvegarde dans deux circuits distincts : AITrainingPlanPage.tsx archive dans plan_versions (insert) ; useCloudData.ts enregistre dans plans (upsert). Tester un seul circuit serait insuffisant.

## Recette Supabase : prérequis absolus

Le script scripts/qa/isolated-supabase-recette.mjs doit être exécuté MANUELLEMENT depuis la racine du dépôt, après installation des dépendances. Il refuse de démarrer sans :

- Projet Supabase isolé, distinct du projet de production, avec schéma et RLS attendus.
- Deux vrais comptes Auth coach SYNTHÉTIQUES A et B habilités selon les politiques du produit ; aucun privilège admin ni service_role.
- Aucun athlète réel, aucun mot de passe dans GitHub, les logs ou les conversations.

Variables d'environnement obligatoires (injectées localement ou par un gestionnaire de secrets, jamais commitées) :

| Variable | Valeur |
| --- | --- |
| TFCL_RECETTE_SUPABASE_URL | URL du projet isolé |
| TFCL_RECETTE_APPROVED_URL | URL de recette approuvée séparément ; doit correspondre |
| TFCL_PRODUCTION_SUPABASE_URL | URL de production ; doit être différente |
| TFCL_RECETTE_ANON_KEY | Clé publique du projet isolé |
| TFCL_RECETTE_COACH_A_EMAIL et TFCL_RECETTE_COACH_A_PASSWORD | Compte test A |
| TFCL_RECETTE_COACH_B_EMAIL et TFCL_RECETTE_COACH_B_PASSWORD | Compte test B |
| TFCL_RECETTE_WRITE_ACK | I_AUTHORIZE_SYNTHETIC_ISOLATED_WRITES |

Commande : node scripts/qa/isolated-supabase-recette.mjs

Le script effectue de vraies opérations PostgREST sous les identités coach : création de deux athlètes synthétiques ; ajout test et profil actif A ; sauvegarde version 1 dans plan_versions et plans ; nouveau client authentifié A et comparaison JSON ; version 2 sans écrasement de la première ; essais de lecture et de modification par B sur les données A ; refus d'une écriture invalide ; nettoyage limité aux ID créés. Tout échec ou résidu de nettoyage est signalé.

Le script réserve désormais tous ses UUID avant la première écriture, tente également un upsert adversarial du plan du coach A depuis B et imprime les identifiants synthétiques en sortie pour permettre une inspection après toute réponse réseau perdue. Le test d'un refus SQL n'est PAS une preuve qu'aucune ligne cachée n'a été insérée.

**Contrôle indépendant obligatoire après chaque exécution :** exécuter `docs/qa/DET_RLS_INDEPENDENT_POSTRUN_AUDIT.sql` depuis l'éditeur SQL du **projet isolé approuvé**, avec visibilité de toutes les lignes. Les trois séries de compteurs (résidus synthétiques, tables sans RLS active et incohérences de propriété des athlètes) doivent être à zéro. Inspecter aussi les UUID `syntheticIds` du résultat si un refus est suspect ; un simple `SELECT` avec le JWT d'un coach ne permet pas de prouver l'absence de lignes cachées par RLS. Si cet audit SQL n'est pas possible ou si un compteur est non nul : **NO-GO**. Ne jamais exécuter cet audit sur la production.

Un PASS du script, même suivi d'un audit SQL vide, ne valide QUE la conservation des JSON et les RLS couvertes par la recette. Il ne certifie ni le parcours UI, ni la panne réseau, ni la génération DET, ni la revue sportive, ni un PDF, ni Nolio, ni la production.

## Recette UI indispensable, même environnement et SHA figé

1. Coach A : saisir un test, sélectionner un profil actif, vérifier fiabilité et hiérarchie des limiteurs. Reconnexion et contrôle.
2. Générer un plan avec le moteur réellement choisi, en conservant absolument tous les contrôles sportifs : durée, intensité, récupérations, ratios, séances qualité, jours J et exigences de la bibliothèque.
3. Sauvegarder dans plan_versions, fermer le navigateur, se reconnecter, charger explicitement la version. Comparer SQL et écran : jours, durationMin, zones, catalogue, modifications custom, dates, objectifs A/B/C, ordre coach des limiteurs.
4. Éditer une séance et créer la version 2 ; la version 1 demeure disponible, identique.
5. Débrancher le réseau pendant une nouvelle sauvegarde, vérifier échec clair et préservation de la dernière version durable après reconnexion.
6. Produire un PDF lisible : première semaine, dernière semaine, toutes les séances avec les mêmes doses. Vérifier le texte Nolio SANS envoi à un athlète.
7. Coach B : aucun accès, lecture ou modification possible sur les données de A, y compris en naviguant entre profils.
8. Confirmer que Restaurer calendrier et Sync DB dangereuses sont réellement suspendues sur la version publiée ; ne jamais essayer sur les athlètes réels.

## CI : ne pas contourner les preuves

- Déclaration périmée : comparer la déclaration du manifeste planReleaseManifest.ts aux composants réels. Seulement après gel d'une release candidate revue, régénérer la déclaration non attestée avec la commande node scripts/preproduction/plan-release-source.mjs --write et relancer la CI. La régénération ne prouve pas que la version est publiée. Ne pas élargir les exclusions.
- Empreinte matrice : comparer les invariants et les lignes sources avant/après, corriger toute dérive non intentionnelle. Ne mettre à jour la baseline qu'après justification et revue indépendante, jamais uniquement pour que le test passe.
- Préparer une promotion bornée vers main depuis la branche expérimentale, avec nouvelle validation, pas de fusion implicite de #454.
- Sauvegarde/rollback : établir les empreintes des artefacts réellement déployés (frontend et deux fonctions Edge) et tester la restauration d'une sauvegarde ; une CI verte ne prouve pas ce point.

## Critères décisionnels

**GO pilote coach supervisé** seulement si la recette distante A/B et l'audit SQL indépendant sans résidus ont réellement réussi, le cycle graphique complet a été testé, toutes les CI sont vertes au SHA candidat, les artefacts déployés et le rollback sont attestés, et une revue sportive indépendante confirme les profils utilisés. Aucun envoi Nolio sans revue et validation.

**NO-GO** si l'un de ces critères manque. L'ajout du script et du protocole ne réalise pas ces vérifications distantes et ne change pas le statut du moteur.

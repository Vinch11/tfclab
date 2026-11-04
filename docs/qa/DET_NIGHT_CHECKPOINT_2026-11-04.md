# DET — checkpoint de fin de journée, 4 novembre 2026

Ce document actualise les diagnostics antérieurs du même jour. Il ne constitue ni une publication de production ni une attestation sportive.

## Les cinq points du plan

| Point | Résultat vérifié | Limite restante |
| --- | --- | --- |
| 1. Isoler le raccordement | Candidat PR #462 et QA Lovable isolée ; production inchangée. | Fusion et publication non effectuées. |
| 2. Réutiliser le profil et les limiteurs | Le parcours normal transmet l'entrée figée de l'app à IA/DET ; aucun diagnostic reconstruit. Comparaison des modules protégés avec production : aucune modification. | Des combinaisons famille/limiteur peuvent toujours être refusées ; aucune substitution silencieuse. |
| 3. Compléter les capacités DET | Semi 8/30 semaines, marathon 16 semaines, 70.3 12 semaines ; nouveaux IM 16 semaines à 13/14 h acceptés sur données synthétiques. IM 14 h accepté aussi depuis le vrai pipeline de l'app, priorité automatique VLamax conservée. | Ce n'est pas une validation de tous les profils, des trails, des 10 km, des multi-objectifs ou des marathons 40 semaines dans le parcours normal. |
| 4. Réutiliser affichage, sauvegarde, réouverture, export | Mécanismes communs conservés. Affichage/PDF convertissent les secondes V3 en durées lisibles sans modifier l'archive. | Le mapper Nolio actuel refuse les nouvelles compositions structurées multisports : pas de dégradation en séance monosport et pas d'envoi réel revendiqué. |
| 5. Recette authentifiée | Coach A : rapport réel 14/14 PASS, sauvegarde/relecture, doublons, perte d'accusé simulée, réouverture, restauration et isolation. Compte B inchangé. Profil fictif enregistré puis repris par l'écran normal. | Génération normale authentifiée après revue humaine réelle et export complet de sa sortie encore à faire. Aucune fausse attestation coach enregistrée. |

## Ironman : correction et preuves

Composition candidate distincte `V3B_IM_TAPER_096` : vélo `V3P_BIKE_180` 57 min, transition explicitement revue 5 min, course de récupération `V3P_RUN_110` 34 min. Total 96 min, uniquement pendant une semaine d'affûtage. Les deux sources et la composition doivent avoir leur propre revue. Aucun transfert de l'approbation 70.3 vers IM.

Les structures exactes des deux sources sont conservées dans la séance sauvegardée. La preuve spécifique IM utilise le composant vélo réellement admis, avec sa dose exacte ; elle ne déduit pas la spécificité du seul titre.

Deux écarts concrets ont été corrigés sans changer les règles sportives :

- Le scénario horaire synthétique laissait moins de 24 h entre les courses du mercredi et du jeudi en semaine 16. Un horaire synthétique compatible a permis le passage du contrôle, sans inventer d'horaire pour un athlète réel.
- Le profil normal de l'app, au risque modéré, impose un long vélo de 150 min. Le pool IM proposait la dose historique 139 min d'un autre contexte de risque. Le pool propose désormais 150 min pour la même source `V3P_BIKE_016` : 15 min d'échauffement, 125 min sous LT1, 10 min de retour au calme, dans les bornes déjà déclarées. Cette dose doit être relue ; elle n'est pas automatiquement approuvée.

Le budget de recherche triathlon par défaut reprend celui du banc de familles : au plus 200 000 nœuds / 120 s. Les deux IM synthétiques utilisent 28 749 nœuds. Le budget course reste 25 000 nœuds / 15 s. Les sorties incomplètes ne deviennent jamais des plans acceptés.

Une correction du replay empêche qu'une branche exploratoire interdisant elle-même la seule source soit présentée comme une revue manquante dans le contrat initial. Une revue réellement absente continue à produire son refus explicite dès la racine.

## QA connectée et CI

Projet QA : `c3941303-40d2-447e-9b87-867d82727fd1` ; backend existant `lkjesdacgpolrwfxulbo`.

Rapport Coach A : `05b622f3-78c6-41ce-9001-501103c69cbc`, run `f2237686-b438-495e-b19e-9c8405ba0ec4` : 14/14 PASS, écrit et relu. Les plans de recette sont techniques et fictifs.

La CI QA du commit `cff7f8a0c9fef2c93cd427b5774f7f5ec98ec5ce` est entièrement verte : frontend, Playwright, Deno et ESLint. Ce résultat concerne le checkpoint QA antérieur aux nouveaux changements IM de ce document.

L'adresse explicite du serveur Playwright a été fixée à `127.0.0.1` et les traces/rapports conservés. Aucune assertion d'authentification ni aucun délai de test n'a été assoupli.

Le serveur DEV Lovable peut s'arrêter après inactivité et répondre « Lovable proxy error (404) ». Le bouton Actualiser de l'éditeur l'a relancé ; la session Coach A et les données étaient toujours présentes. L'ancien aperçu statique a encore montré `supabaseUrl is required` : ne pas confondre cette anomalie de build avec des clés QA manquantes partout.

Le marathon synthétique déjà enregistré le 3 novembre a été rouvert via l'historique normal : 16 semaines / 75 séances, dates d'origine conservées. Le dépliage affiche la prescription sauvegardée. La présence d'un avertissement de correspondance au catalogue historique ne vaut ni perte des données ni validation de cette correspondance.

## Validation locale du candidat

- 63 tests frontend ciblés passent, dont les deux IM, l'IM par le pipeline normal, les familles antérieures, affichage/PDF et sauvegarde/réouverture.
- Banc expérimental : 117/118 dans un lancement concurrent à forte charge ; seul échec = délai de 5 s du test disponibilité 70.3. Ce test passe immédiatement lors d'une exécution isolée ; aucune assertion ni durée n'a changé. Attendre la CI hébergée pour la conclusion globale.
- La première compilation TypeScript simultanée a été arrêtée par manque de ressources. Sa relance séparée passe ; ne pas présenter l'arrêt comme une erreur de types.
- 22 contrôles build/déclaration passent, ainsi que les 5 tests ciblés de présentation/revue réutilisable. ESLint comparé à la base sur 22 fichiers : aucune régression d'erreur ni d'avertissement (le grand écran existant conserve ses erreurs historiques).

Les revues scientifiques, l'approbation du programme par le coach, l'autorité de prescription et l'autorisation d'export sont distinctes. Elles ne sont jamais obtenues à partir des données synthétiques de ces tests.

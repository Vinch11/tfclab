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

## Actualisation après la CI et la vérification navigateur

La première CI du candidat IM (`ba3151b`, run `41924907641`) a passé TypeScript puis 3 809 tests frontend ; quatre tests PDF ont échoué car leur contrôle comparait les secondes brutes au nouveau texte lisible. Les autres jobs (Deno, Playwright et ESLint), le workflow de raccordement et le banc expérimental sont verts. Ce résultat remplace le simple diagnostic de délai local indiqué plus haut : le banc expérimental hébergé complet est réussi.

Le contrôle PDF compare désormais chaque bloc à la présentation déterministe de la prescription archivée. Il conserve les contrôles d'identité, de durée, de répétitions, de récupération et de cibles. Un test dans les quatre formats prouve qu'une minute de travail modifiée ou une cible d'allure altérée reste détectée. Les 22 tests PDF/conformité/présentation passent, dont les quatre marathons et les sabotages de blocs ; ESLint des deux fichiers corrigés passe. La CI du correctif doit encore conclure.

Dans la nouvelle QA `e9bd456`, Coach A a rouvert le marathon déjà sauvegardé, déplié une séance puis ouvert « PDF condensé ». Le document contient 16/16 semaines, 128 lignes de calendrier, dont exactement 75 séances actives. L'écran et le document montrent 10 min d'échauffement et 2 h 37 min de durée totale pour la source V3P_RUN_084, avec ses cibles archivées intactes. C'est une preuve de génération du document HTML imprimable depuis une archive authentifiée, pas un reçu d'impression PDF ni une nouvelle génération après revue humaine.

Une reprise ponctuelle du travail a été programmée pour la nuit du 5 novembre vers 03 h, fuseau Europe/Brussels, afin de reprendre les contrôles à partir de GitHub. Elle conserve les limites de ce document et ne vaut pas garantie de clôture des validations humaines.

## Reprise du 5 novembre 2026 — CI vérifiées et blocage restant

Le candidat `5d22a833d97108be8e6bcd4d2fd54a854e0b4a33` a ses quatre jobs de CI générale verts (run 41926266912) : frontend et TypeScript, Deno, Playwright, ESLint. Les contrats DET sont verts (41926266898 : 118 tests) et le raccordement diagnostic aussi (41926266870). Les quatre anciens échecs PDF de ba3151b sont donc corrigés dans la CI hébergée ; ils ne sont plus un blocage courant.

La QA `04e11810d8a4ac2faed2d83a7bf1605914f2e019` passe frontend/TypeScript, Deno et ESLint (41926328966). Playwright échoue encore après une relance ciblée : le test de connexion Chrome attend le formulaire alors que le splash charge encore le graphe initial. La trace conservée montre 432 requêtes, notamment les modules d'analyse du tableau de bord. Le candidat de cette reprise charge désormais `Index` à l'ouverture de sa route protégée via `React.lazy`, sous le Suspense existant. Aucun test, délai, contrôle d'authentification ou profil n'est modifié. La nouvelle CI doit confirmer l'effet de ce changement. Playwright local est indisponible dans ce runtime (binaire Chromium absent) ; cela n'est pas un échec fonctionnel démontré de l'app.

Le mapper Nolio a été examiné : une opération planned V2 possède un seul sport et les nœuds workout n'ont pas de sport confirmé. Une composition vélo/transition/course n'est donc pas représentable fidèlement dans ce contrat. Le mapper refuse maintenant explicitement `multisport_contract_unconfirmed` plutôt que le simple champ `composition` inconnu. Deux tests couvrent la composition de 96 minutes et la tentative de la renommer en vélo, même avec des références sport fictives disponibles : aucune opération, aucune modification des blocs. Le découpage en plusieurs envois reste non implémenté : il exigerait un choix coach explicite et un protocole de groupe gérant ordre, transition et réussite partielle sans doublon. Aucun envoi, dry_run serveur ou calendrier Nolio n'a été utilisé pendant cette reprise.

Validation locale du changement : 25/25 tests mapper (dont les quatre marathons préexistants et les deux nouveaux refus), TypeScript et ESLint des fichiers modifiés passent. Les déclarations de source du candidat et de la QA sont recalculées séparément, sans attestation sportive.

Les cinq points restent au niveau décrit dans le tableau : raccordement isolé ; profil/limiteurs et choix IA/DET figés préservés sans fallback ; preuves IM synthétiques et pipeline pur conservées ; sauvegarde/PDF établis et Nolio multisport bloqué ; recette authentifiée historique 14/14 conservée, mais aucune nouvelle génération normale authentifiée après revue humaine réelle. Cette dernière revue et la validation scientifique restent à effectuer par leurs responsables. Ni fusion, ni production, ni modification de clé/base, ni agent Lovable payant.


## Reprise du 5 novembre — confirmation QA et protection du parcours Nolio historique

La relance du job frontend QA 41955443382 est terminée avec succès. Les quatre jobs de cette QA sont maintenant verts, sans changement d'assertion ni de délai. Le dépassement calendrier précédent ne s'est pas reproduit.

L'inspection du parcours normal a identifié une autre voie : AIPlanViewer, NolioSessionButton et NolioSendPlanCard pouvaient préparer l'envoi historique en reconstruisant des blocs depuis le catalogue, sans reprendre detStructuredWorkout. Le parcours historique est désormais désactivé pour un plan déclarant une provenance DET (même incomplète), contenant une structure/refus DET ou des identifiants V3. Un plan mixte est bloqué en entier. Le contrôle est exécuté avant la projection vers l'ancien payload ; aucune dose ni instruction n'est modifiée. Les actions devenues périmées sont également bloquées à la confirmation. Un message indique la nécessité du parcours V2 et de la revue coach.

Validation : 29 tests ciblés (dont quatre tests du parcours UI, un changement IA vers DET avec athlète lié et aucun appel d'envoi), 10 tests existants du lecteur/sauvegarde/PDF et 17 tests de déclaration réussis. Ceci ferme une voie frontend de dégradation ; ce n'est ni l'implémentation de l'export multisport V2, ni une nouvelle validation sportive/authentifiée. Aucun envoi réel ni déploiement backend.


## Reprise du 5 novembre — raccordement marathon long et 70.3 complet

Les trois workflows du candidat 1e255ca2 et les quatre jobs de la QA 884e072c sont terminés avec succès. Les protections Nolio historiques sont donc confirmées dans les deux CI.

Le marathon 40 semaines / 9 h passe désormais un test strict du vrai pipeline pur de l'app : profil fictif au format des enregistrements existants, diagnostic figé inchangé, priorités Durabilité/TTE conservées, 188 séances, preuves de périodisation et de couverture Durabilité vérifiées. Aucun changement moteur n'a été nécessaire pour ce cas ; il manquait sa preuve dans ce parcours. Cela n'est pas une génération authentifiée après revue humaine.

Le 70.3 avec diagnostic complet de l'app bloquait sur une composition de base trop courte pour le créneau requis. Une nouvelle composition candidate distincte V3B_703_BASE_EASY_180 réutilise les deux doses V3 existantes déjà admises pour l'enchaînement de développement : V3P_BIKE_016 (139 min), transition 6 min, V3P_RUN_001 (35 min), total 180 min. Leurs métadonnées autorisent la phase base ; la composition conserve uniquement cette phase et demande sa propre revue explicite. Aucun nouveau contenu de séance, aucune approbation humaine créée, aucune modification du diagnostic ou des contraintes sportives.

Les trois tests du pipeline complet 70.3 à 9 / 9,5 / 10 h sont acceptés : 12 semaines, 96 séances chacun, priorités brutes conservées et composition structurée exacte retrouvée dans les séances choisies. Les tests de famille et du pipeline complet passent ensemble : 42/42. Les tests isolés de composition vérifient aussi qu'une revue de développement ne vaut pas revue de base, et refusent composant manquant, dose modifiée, transition modifiée ou objectif incompatible.

Restent ouverts : familles 5/10 km et trail dans le parcours coach, limiteurs primaires non pris en charge selon la famille, multi-objectifs, revue humaine/scientifique et génération authentifiée après celle-ci, export Nolio multisport fidèle avec traitement durable des réussites partielles. La revue de cette composition est candidate, et ne vaut pas validation scientifique.

Validation finale locale de cette reprise : 121/121 tests du banc expérimental ciblé (v35/v359/v360/v404/v405), 42/42 tests du pipeline et des familles, TypeScript et ESLint des trois fichiers de code/test modifiés passent. Le workflow DET inclut maintenant explicitement v405 pour conserver les sabotages de composition en CI. Un lancement trop large du fichier de configuration expérimental avait aussi inclus la suite frontend ; il a été arrêté et n'est pas revendiqué comme validation complète. Les nouvelles CI hébergées doivent conclure sur le commit publié.


## Reprise du 5 novembre — 10 km et représentation Nolio multisport

Candidat précédent fb563302 : trois workflows verts. QA précédente 2a47c44a synchronisée dans Lovable (projet ready, non publié).

10 km : le refus historique citant uniquement V36 était obsolète, car V358 comporte déjà des acceptations sportives strictes. La famille coach 10k est raccordée sur 8–12 semaines / 7 h, avec les sources V3 exactes et les doses déjà prouvées. L'app fournit sur le profil fictif testé Durabilité puis TTE ; aucune réécriture ni permutation n'est effectuée. Le levier documenté increase_tte de Durabilité passe le même audit strict de dose et couverture seuil (au moins 30 %, zéro séance clé inconnue) et garde son audit distinct de couverture en semaine de charge. Un limiteur primaire non défini reste refusé. Résultats pipeline complet : 8 semaines / 38 séances, 10 / 47, 12 / 57. Provenance DET reconnue après sérialisation.

Nolio : le contrat un sport par activité reste respecté. Le nouveau choix explicite deux activités liées + transition neutre est sauvegardé dans une NOUVELLE version immuable, via le saver commun et relecture exacte. La structure parent reste intacte ; l'approbation de représentation est liée au SHA-256 complet de la séance et à l'horaire course affiché (fuseau et offset inclus). Sans ce choix, l'ancien refus multisport persiste. La transition ne devient jamais un exercice vélo/course. Les opérations restent ordonnées, liées par leur clé parent et leurs descriptions, avec exactement les blocs sauvegardés des deux composants.

Le même preparePlan est utilisé pour contrôle, simulation, envoi et vérification. Un changement du parent ou des horaires invalide le choix et tout reçu antérieur. Aucun consentement d'envoi ni revue humaine/scientifique n'est déduit de ce choix. Le sender existant arrête après refus, incertitude ou quota ; le test d'une réponse vélo perdue vérifie sa réconciliation exacte avant de poursuivre la course, sans deuxième POST vélo. Deux créations Nolio ne constituent jamais une transaction atomique : la relecture de toutes les opérations reste nécessaire à une preuve complète.

Les tests couvrent aussi passage à minuit, changement d'heure, absence de choix, choix périmé, blocs modifiés, refus 400, quota 429, erreur 500 et absence de reprise automatique. Interface : aucune sélection/confirmation initiale ; nouvelle archive seulement après deux actions explicites ; archive initiale intacte ; aucune invocation Nolio. Le snapshot officiel du contrat de lecture déjà utilisé par les tests est restauré depuis une copie existante du dépôt, inchangé et vérifié par son empreinte.

Validation locale : TypeScript et ESLint ciblé passent. 75 tests de lecture/journal/mapping/UI/runner passent, puis 18 tests ciblés (multisport et page QA) passent. La suite élargie limitée à deux workers a 361 réussites et un ancien chargement du libellé « 10 km route » pendant une édition ; le correctif d'alias exact et ses cinq tests canoniques passent séparément. La nouvelle CI doit établir le résultat consolidé. Un lancement concurrent précédent a subi une sortie de worker et le test V35 un timeout de 5 s ; aucune assertion ni délai n'a été changé.

Blocage de vérification réelle : le navigateur a pu afficher le chargement de l'éditeur QA, puis son observation a été refusée par la politique de sécurité du navigateur. Aucun contournement ni agent Lovable payant. L'activation backend de la nouvelle préparation Nolio n'est donc pas confirmée. Aucun envoi Nolio réel n'a été effectué.

Points encore non clos : activation et recette authentifiée du nouveau code backend QA ; génération normale après revue humaine réelle ; trails (observations de terrain/D+/D−/tolérance/horaires réels nécessaires, le banc existant porte explicitement une provenance synthétique) ; multi-objectifs (estimations de durée d'épreuve explicites à transmettre par le formulaire) ; limiteurs primaires sans branche démontrée ; fusion/déploiement de production non autorisés. Aucune de ces conditions n'est remplacée par une approbation synthétique.

Actualisation avant publication : les 120 autres contrats expérimentaux passent ; le test V35 de plafond horaire passe ensuite seul en 3,90 s, sans changement du test, du budget ou des assertions. Le contrôle canonique « 10 km route » passe (5 tests) après correction ; TypeScript et ESLint passent. Le navigateur ne permet toujours pas de confirmer l'activation backend QA.


Dernier contrôle horaire Nolio : le contrat PlannedTrainingCreateRequest confirmé porte date_start + time, sans champ d'offset UTC. Une occurrence d'heure d'hiver choisie dans l'archive n'est donc pas exprimable de manière confirmée dans ce corps fournisseur. La représentation split refuse maintenant une heure locale ambiguë sur l'un ou l'autre composant. Le passage à l'heure d'été (instants locaux uniques), le changement de jour et l'intervalle neutre exact restent testés. 10 tests ciblés du split et de son interface passent après ce contrôle.

Avant ce dernier garde d'horaire, le candidat 24617abad a ses trois workflows entièrement verts, dont la CI frontend complète. La construction de la copie QA d746811c passe localement, PWA incluse. Le garde d'horaire ne change ni diagnostic, ni plan, ni autorité d'envoi ; sa nouvelle CI est à confirmer.

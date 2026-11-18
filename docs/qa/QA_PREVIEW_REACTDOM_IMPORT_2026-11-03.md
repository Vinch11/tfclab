# Aperçu QA — échec d'import ReactDOM, réparation serveur

Le serveur DEV du projet QA a été remis en état : suppression du seul cache Vite `node_modules/.vite`, puis un redémarrage supervisé. **Aucun code applicatif modifié.**

## Observations et limite du diagnostic

Vite 5.4.19 a journalisé un redémarrage à 18:22:31 UTC après une réécriture de configuration d'environnement, puis une régénération des dépendances à 18:22:34. Un dossier temporaire d'optimisation inachevé daté de 18:12 était présent.

Une interruption pendant le redémarrage/réoptimisation est une cause **probable**, pas établie. Le statut HTTP et l'empreinte de la requête échouée du coach restent inconnus ; le message de bootstrap masque volontairement les paramètres d'URL. Le cache du navigateur n'est pas établi comme cause.

L'hôte externe Lovable répond 401 sans session : il n'a pas été reproduit dans le contexte authentifié du coach.

## Vérifications après réparation

Application complète, Chromium local sur `localhost:8080/__qa/pilot-review`, sans connexion :

- ouverture à froid et recharge : splash retiré, vraie page et garde « Non connecté » visibles ;
- module ReactDOM : HTTP 200, `text/javascript` ;
- téléchargement ReactDOM interrompu : erreur lisible et bouton manuel « Recharger », sans recharge automatique observée pendant 3 secondes ;
- module rétabli puis clic manuel : l'application s'ouvre ;
- accès au stockage bloqué : l'application s'ouvre.

Aucune session injectée, aucun appel Nolio ou fonction Edge par ces vérifications. Les mécanismes globaux préexistants de stale chunks/PWA n'ont pas été modifiés ; l'observation sans recharge automatique concerne le cas de panne simulé consommé par le bootstrap.

## Preuve d'envoi distincte

Pendant cette réparation, le coach a exécuté son essai réel et confirmé le résultat dans son écran. Les reçus relus indépendamment prouvent HTTP 201 puis une lecture exacte unique pour le 4 novembre. Ce résultat est distinct des tests locaux déconnectés : voir [la preuve d'envoi réel](NOLIO_V2_SINGLE_REAL_TRIAL_SUCCESS_2026-11-03.md).

La source finale sauvegardée `46a9fe5793b07230894d8090feb161db6cedc837` diffère de `e71a70c15ffbd87958dd85f60304e42ca75260f0` uniquement par deux documents de preuve. Les sources applicatives et Nolio sont inchangées ; les contrôles précédents restent distincts des vérifications navigateur de cette réparation. V1, main/production, base, fonctions Nolio et publication intacts.

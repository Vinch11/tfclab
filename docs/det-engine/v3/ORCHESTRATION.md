# Reprise autonome V3

Autorisation utilisateur : nouveau budget maximal de 60 minutes, exclusivement expérimental. Le registre V2 épuisé reste immuable. `state.json` V3 référence son dernier candidat et son commit ; son horloge propre inclut le travail de cette reprise, sans effacer le passé.

Le superviseur `scripts/det-engine/v3-supervisor.mjs` utilise des commandes fixes : audit des réparations, variantes Ironman, enveloppes trail, progression, transpositions de séances, continuation stricte et validation. Aucun shell arbitraire, patch automatique de source, accès Nolio, déploiement ou client de modèle.

Les cinq rôles sont des fonctions logiques dans cette session : diagnostic par reconstruction des réparations et classification des alertes ; développement des variantes isolées ; validation par tests et rejeu indépendant ; réparation sous garde-fou ; supervision par registre persistant et budgets. Aucun agent ni service n'est annoncé comme actif après la fermeture de la session.

## Limites et décisions

- 3600 secondes depuis l'ouverture du registre ; maximum 12 cycles enregistrés.
- Trois tentatives consécutives sans progrès par cause ; après deux globaux sans progrès, une réévaluation de stratégie est exigée et journalisée.
- Un worker Vitest par commande supervisée ; heap Node 2048 Mo par processus, timeout de commande au plus 15 minutes et jamais supérieur au budget restant. Ce n'est pas une garantie de RSS par l'OS.
- Un seul cycle supervisé actif. Les vérifications techniques ciblées indépendantes peuvent utiliser un second processus ; leurs logs sont conservés.
- Zéro appel à un modèle ou API payante. Les lectures scientifiques sont séparées des moteurs, dont les tests bloquent `fetch`.

Une réservation est écrite avant le lancement. Une interruption laisse une étape active : la reprise refuse de lancer un second cycle avant vérification des processus. Le budget repose sur une échéance absolue ; fermer puis relancer ne recrée pas du temps disponible.

La clé d'idempotence lie commande, source et entrée. Les preuves terminées sont vérifiées par empreinte lorsqu'elles sont disponibles ; un résultat absent ou modifié n'est pas un succès rejouable. Une nouvelle source ou entrée est une nouvelle mesure, pas une réutilisation de résultat.

Une matrice candidate est conservée uniquement après commande réellement réussie, comparaison au dernier accepté, second résultat produit indépendamment identique et amélioration mesurable sans régression critique. Les assertions sportives V3 interdisent une nouvelle alerte, l'aggravation des alertes numériques d'intensité suivies et celle des progressions descriptives contrôlées. Les résultats de progression ne peuvent pas allonger une séance passée pour faire disparaître une alerte future.

Les variantes méthodologiques Ironman et trail sont publiées comme évaluations séparées. Elles ne sont pas promues dans la matrice des 600 et ne peuvent pas produire un GO implicite.

## Commandes

Depuis la branche expérimentale, après inspection de l'état et du budget :

```sh
node scripts/det-engine/v3-supervisor.mjs continuation docs/det-engine/v3/state.json /tmp/v3-next /tmp/last-accepted.json.gz
node scripts/det-engine/v3-supervisor.mjs validation docs/det-engine/v3/state.json /tmp/v3-validation
```

`reassess` reçoit une justification textuelle de changement d'approche et journalise la réévaluation. Il ne réinitialise ni budget, ni tentatives, ni décisions antérieures. Le nombre de passes sans progrès reste visible.

La configuration Vitest V3 reprend les alias, setup et environnement existants avec une liste expérimentale explicite. Cela évite de relancer implicitement les 382 fichiers historiques à chaque simulation. La suite historique reste une vérification séparée obligatoire, sans changement ni exclusion de ses tests.

## Incidents conservés

Les premières erreurs TypeScript de discrimination d'union trail sont conservées dans `preliminary/`, puis corrigées. Une première réservation d'audit a rencontré `EPERM` dans la capture des sous-processus malgré un code de sortie zéro : le superviseur l'a refusée. Le champ descriptif ancien disait `passed` alors que `ok:false` et l'erreur étaient conservés ; ce classement est corrigé pour les passages suivants. Le rejeu accepté utilise une exécution dont la capture et les assertions sont vérifiables.

L'essai initial de progression augmentant certaines durées antérieures est rejeté : supprimer une alerte ne justifie pas d'ajouter de la charge. Ses preuves préliminaires ne sont pas intégrées au résultat retenu. Les corrections et les sources de production restent séparées.

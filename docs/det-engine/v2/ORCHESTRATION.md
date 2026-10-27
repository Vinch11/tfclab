# Orchestration expérimentale V2

Le superviseur est un processus local explicite, pas un service permanent. Il ne
fusionne, ne pousse et ne déploie rien. Il ne lit ni n'écrit les bases athlètes ou
Nolio. Son seul budget externe autorisé est zéro. Les décisions scientifiques ne
sont pas déléguées à un modèle payant.

## Cinq fonctions logiques

| Fonction | Réalisation | Preuve produite |
|---|---|---|
| Diagnostic | `v2-diagnostic.mjs` : classification, fréquences, exemples ; séparation preuve/hypothèse et refus local/global/inconclusif | diagnostic versionné et tableau par objectif/ambition/niveau |
| Développement | manifeste de correction précis : cause, hypothèse falsifiable, chemins expérimentaux, hash avant, contenu après | snapshot avant/après et empreinte du manifeste |
| Validation | commandes locales fixes (TypeScript, suite expérimentale), règles sportives existantes, matrice V2 et rejeu | logs `.txt`, bundles baseline/candidate/replay et comparaison |
| Réparation | restauration des seuls octets appartenant au manifeste rejeté | décision, snapshot conservé, liste des restaurations/conflits |
| Supervision | état JSON atomique, événements ordonnés, budgets, acceptation/rejet et reprise idempotente | journal des cycles et dernier baseline accepté |

Les corrections sont développées par la session de développement dans le mandat
accordé. Un manifeste peut être exécuté sans lancer de commande arbitraire : le
superviseur autorise uniquement la substitution exacte de fichiers TypeScript
existants sous `experimental/det-engine/`, hors tests et configuration Vitest.
Il ne génère pas seul une nouvelle méthodologie ni une correction scientifique.

## Comparaison et acceptation

Chaque bundle porte `version`, `controls: [{id, version}]`, `rows`. Chaque ligne
porte `executedControls`. Les problèmes portent `control`, `code`, `severity`,
`week` et éventuellement `message`. Un contrôle n'est comparable que si sa version
et son exécution dans les deux lignes sont attestées. Les nouvelles instrumentations
sont rapportées séparément ; elles ne sont pas appelées régressions mesurées.
L'absence d'applicabilité empêche néanmoins l'acceptation automatique de la
correction lorsque de nouveaux problèmes critiques ne peuvent être attribués.

Le superviseur sépare :

- perte de construction ou de conformité d'un cas antérieur ;
- nouveau problème critique sous un contrôle comparable, y compris sa multiplicité ;
- défaut nouvellement exposé sur un plan auparavant non construit ;
- défaut sous une instrumentation non comparable ;
- couverture perdue, couverture supplémentaire et différence au rejeu.

Les règles sportives restent inchangées. Aucun problème n'est supprimé des
artefacts. Accepter une correction expérimentale ne rend pas valides les nouveaux
plans encore défectueux. Une amélioration du nombre de plans assemblés ne certifie
jamais une pertinence sportive générale. Le champ `scientificGoAttested` reste
faux. Les critères non démontrés d'une discipline ne sont pas compensés par
les réussites d'une autre.

Une correction n'est retenue que si les contrôles unitaires/non-régression/sportifs
et le rejeu sont attestés, sans régression critique comparable ni attribution
inconnue. Le bundle accepté devient la référence suivante : comparer un nouveau
cycle à une ancienne baseline pour effacer une régression est refusé.

## Budgets et reprise

Politique immuable : 12 cycles, 3 tentatives par cause, réévaluation stratégique
après 2 cycles globaux consécutifs sans amélioration, 30 minutes d'exécution
cumulée, 2 workers, heap Node 2048 Mo par processus, 15 minutes par commande,
0 USD API. Le heap n'est pas une limite RSS OS. Les causes ayant épuisé leurs
3 tentatives sont écartées de la priorisation ; les causes indépendantes restent
éligibles. Deux cycles globaux sans progrès imposent une réévaluation documentée.
Les refus sportifs ne comptent pas automatiquement comme des erreurs réparables.

L'état est écrit par remplacement atomique et contient les hashes, budgets,
cycles, causes tentées, dernier bundle accepté et événements. Un identifiant de
cycle rejoué avec la même provenance ne compte pas deux tentatives ; la même
identité avec un autre manifeste est refusée. Un cycle terminé ne peut pas être
réécrit avec de nouvelles preuves.

Le snapshot est écrit avant application. Si une application est interrompue,
`apply-recipe` vérifie que chaque fichier correspond à l'avant ou à l'après
attendu, puis reprend seulement les fichiers manquants. Une modification tierce
provoque un conflit explicite. Le retour arrière vérifie le hash après avant de
restaurer le hash avant ; aucune commande `git reset`, `checkout`, `restore` ou
suppression générale de travail n'est utilisée. Les correctifs indépendants
acceptés ne font pas partie du snapshot rejeté.

Un seul superviseur écrit dans un fichier d'état donné ; il n'y a pas de verrou
multi-processus distribué. Des expérimentations parallèles doivent employer des
états et branches séparés. Une validation interrompue conserve une réservation
persistante ; `recover-validation` consomme cette réservation plutôt que rendre
le budget artificiellement disponible. Il ne tue pas des processus orphelins :
l'opérateur doit vérifier leur fin avant une reprise.

## Commandes

Toutes les commandes vérifient la branche réelle, qui doit être
`experiment/det-engine` ou une branche dérivée de ce préfixe.

```sh
# Initialisation idempotente, bundle initial immuable.
node scripts/det-engine/v2-supervisor.mjs init /tmp/det-v2/state.json /tmp/baseline.json

# La session peut journaliser une unité qu'elle a appliquée et validée.
node scripts/det-engine/v2-supervisor.mjs begin /tmp/det-v2/state.json /tmp/cycle.json
node scripts/det-engine/v2-supervisor.mjs finish /tmp/det-v2/state.json /tmp/evaluation.json
node scripts/det-engine/v2-supervisor.mjs status /tmp/det-v2/state.json

# Un manifeste enregistré peut aussi être appliqué/validé/restauré automatiquement.
node scripts/det-engine/v2-supervisor.mjs execute-recipe /tmp/det-v2/state.json /tmp/recipe.json /tmp/cycle-output /tmp/last-accepted.json
```

`cycle.json` : `id`, `cause`, `sourceHash`, `recipeId`, `scope` (`global` ou
`targeted`). `evaluation.json` : `id`, chemins `baseline`, `candidate`, `replay`,
et `tests: {unit, nonRegression, sporting, replay}` issus des commandes réellement
exécutées. L'API d'enregistrement ne remplace pas leur exécution ; la commande
`execute-recipe` exécute elle-même le plan fixe et exige ses artefacts.

`recipe.json` : `id`, `cycleId`, `cause`, `hypothesis`, `scope`, et
`modifications: [{path, beforeSha256, afterContent}]`. Les manifestes contenant
une modification de production, de tests ou une base périmée sont refusés.
Les refus et erreurs du contrôleur sont persistés et le manifeste est rejeté,
sans supprimer son diagnostic.

La matrice V2 réelle reçoit `TFCL_DET_V2_OUT`, puis écrit
`baseline.json`, `candidate.json`, `replay.json`. La reprise n'active aucune
récurrence automatique. Toute nouvelle session doit relancer explicitement le
superviseur après lecture de l'état.

## Validation du superviseur

`node scripts/det-engine/v2-supervisor.test.mjs` : 17 tests d'orchestration.
Ils couvrent contrôles incomparables, nouveaux défauts exposés, vraie régression
critique sous contrôle identique, multiplicité, couverture, non-déterminisme,
limites, idempotence, preuve périmée, reprise et retour arrière préservant les
travaux indépendants. Le test du cycle complet utilise un double explicitement
nommé ; il prouve l'orchestration, pas les qualités du moteur sportif. Les
résultats sportifs exigent les simulations réelles publiées séparément.

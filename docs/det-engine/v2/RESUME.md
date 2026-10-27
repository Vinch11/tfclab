# Reprise explicite et idempotente

Dernière référence acceptée : `det-v2-plan-repair-08-9680f75bb5ea`.
Bundle : `final/candidate.json.gz` ; hash canonique du superviseur :
`fa3dd0394bf82154b969719bf93eb059e7dbe27a3457fa4b8732b82fd26943ff`.

Le registre `supervisor-state.json` conserve neuf cycles et leurs décisions.
Il n'a ni cycle actif ni réservation encore active. Son budget est épuisé
(1 800 071 ms, dont 71 ms de clôture). La dernière validation a été interrompue
par ETIMEDOUT ; elle n'a pas remplacé la référence acceptée.
Aucun worker de cette exécution ne reste actif. Aucun service permanent ou
redémarrage après fermeture de session n'est promis.

Pour inspecter sans lancer de nouvelle correction :

```sh
gzip -dc docs/det-engine/v2/final/candidate.json.gz > /tmp/det-v2-last-accepted.json
node scripts/det-engine/v2-supervisor.mjs status docs/det-engine/v2/supervisor-state.json
```

Une reprise des cycles exige une autorisation explicite de nouveau budget.
Ne pas éditer le registre pour effacer sa consommation, ses rejets ou ses causes.
Un éventuel nouveau registre doit référencer ce registre et le hash du dernier
bundle accepté ; le précédent reste une preuve immuable.

Pour un cycle interrompu dans un futur budget autorisé, conserver les snapshots,
vérifier la fin des processus, puis utiliser la récupération documentée dans
ORCHESTRATION.md. Une réservation interrompue est imputée de manière conservatrice.
Les identifiants et hashes empêchent de compter deux fois un même cycle ou de
remplacer la baseline par un état plus ancien. Une modification tierce des sources
bloque le retour arrière plutôt que supprimer un travail indépendant.

Les matrices complètes sont compressées sans perte. Les fichiers replay-proof
lient chaque candidat accepté à un second résultat identique ; ce second JSON
identique n'est pas dupliqué dans le dépôt. Les sorties originales des cycles
restent dans le workspace temporaire de cette session tant qu'il existe.

Les métriques finales viennent de sept passes acceptées de réparation de la
baseline construite et rejouée, pas d'un appel unique à la fonction V2.
La sonde de variantes rejetée n'est pas une preuve de couverture supplémentaire.
Le schéma technique est audité séparément et joint au dashboard par hash de plan.

Reproduction de l'audit de schéma seul (sans nouvelle génération) :

```sh
TFCL_DET_V2_AUDIT_INPUT=/tmp/det-v2-last-accepted.json TFCL_DET_V2_AUDIT_OUT=/tmp/technical-audit.json npx vitest run --config experimental/det-engine/vitest.config.ts --maxWorkers=1 experimental/det-engine/v2-technical-validation.test.ts
node scripts/det-engine/v2-consolidate.mjs /tmp/det-v2-last-accepted.json /tmp/technical-audit.json /tmp/det-v2-report
```

Installation locale antérieure : npm sans modification du lockfile, car `npm ci`
est bloqué par la désynchronisation préexistante. La CI historique utilise Bun.
Les versions réellement exécutées et les hashes sont dans provenance.json ; aucun
manifeste de dépendances n'a été changé. Cette différence reste une limite de
reproduction bit à bit de l'environnement, distincte du rejeu identique des plans.

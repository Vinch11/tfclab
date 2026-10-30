# Expérience DET-ENGINE

Prototype hors production : [architecture, inventaire et critères](ARCHITECTURE.md).

Exécution après installation des dépendances :

```sh
npx tsc --noEmit -p experimental/det-engine/tsconfig.json
node --test scripts/det-engine/gates.test.mjs
npx vitest run --config experimental/det-engine/vitest.config.ts --maxWorkers=2
TFCL_DET_MATRIX_OUT=/tmp/det-evidence npx vitest run --config experimental/det-engine/vitest.config.ts --maxWorkers=1
node scripts/det-engine/loop.mjs /tmp/det-loop /tmp/ancienne-matrix.json
```

La matrice opt-in reprend exactement `planningCases()` et
`supplementaryPlanningCases()` (600 configurations). Les tests bloquent `fetch` :
aucun appel Gemini, OpenAI, Supabase ou Nolio. Aucun nouveau workflow GitHub.

Les tests de contrat peuvent être verts avec des résultats sportifs négatifs :
ils attestent le rejeu, la provenance, le déterminisme et les refus explicites.
Ils ne changent aucun critère sportif pour améliorer le taux de conformité.
La matrice contient les candidats complets, leurs traces et les problèmes restants.

Les fichiers sous `experimental/` n'entrent pas dans le bundle ni l'empreinte
Lovable de `src`. Aucun fichier existant de production n'est modifié.
Le manifeste publié et les migrations restent intacts.

Résultats : [tableaux par objectif/ambition et limites](RESULTATS.md).
Les matrices complètes sont compressées sans perte dans `evidence/matrix.json.gz`
(première instrumentation) et `evidence-final/matrix.json.gz` (prototype final).
`gzip -dc docs/det-engine/evidence-final/matrix.json.gz > /tmp/det-baseline.json`
permet de les utiliser comme référence du contrôleur. Les checksums et la
provenance distinguent la base Git, l'empreinte du moteur et les preuves.

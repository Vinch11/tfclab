# Validation technique et d'intégration

## Parcours exécuté

`createEmptyLabExtract → extractToValidationFields → applyFieldEdits → mapExtractToSnapshot → snapshotSchema → useCloudData.addSnapshot → transport simulé → édition notes → destruction/réouverture du hook → snapshotPhysiologyEvidence → computeDiagnostic / prepareTrainingPlanContext → rapport staff HTML + composant React → savePlan → nouvelle réouverture`.

Les appels sont ceux de l'application ; seules l'authentification et la couche réseau Supabase sont remplacées. La sérialisation JSON du plan est explicite. Aucune base réelle n'est contactée.

| Contrôle | Couverture |
| --- | --- |
| Saisie/validation d'import | Champ CE existant édité, valeur 200 explicitement en ml O₂/kg/km ; VLamax run 0,42 ; date et confiance d'extraction conservées |
| Sauvegarde snapshot | Schéma Zod réel ; distinction vélo/course ; rejet d'une sauvegarde simulée défaillante sans snapshot local fictif |
| Réouverture | Même provenance, valeur et coût après destruction/recréation du hook ; notes coach éditables sans effacer l'enveloppe |
| Diagnostic et limiteurs | Mêmes moteurs ; absence de CE ne casse pas le proxy seuil/VMA ; paramètres de plan/trace gardent leurs marges et inconnues |
| Rapport HTML / React | Constructeur MLSS staff réel ; coût/date/source/confiance affichés ; JSON technique masqué ; confiance nommée heuristique ; proxy explicitement nommé |
| Plan sauvegardé | JSON de contexte, paramètres et provenance relus après nouvelle réouverture |
| Unités invalides | NaN/infini, chaînes, score3/65, hors domaine, métadonnées malformées/incompatibles refusés pour la prédiction |
| Valeur modifiée | Provenance d'un ancien scalar invalidée ; repli profil attribué au profil |
| LAB liés | Mauvaise discipline ou mélange/inconnu ne devient pas VLa course/vélo ; données brutes restent disponibles |
| Traces | Nouvelle version/unité ; anciennes prédictions CE ambiguës exclues des dérives, VLa et proxies observés admissibles conservés |

## Commandes reproductibles

```sh
bash scripts/physiology-validation/v2/run-existing-tests.sh
./node_modules/.bin/vitest run physiologyValidationV2
./node_modules/.bin/vitest run src/lib/plan/__tests__/lovableBuild.test.ts src/lib/plan/__tests__/lovableRelease.test.ts
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
npm run build
```

La capture de référence QA utilise `scripts/physiology-validation/v2/baseline.config.ts` avec `PHYSIOLOGY_BASELINE_ROOT` pointant vers un checkout immuable du SHA main et `PHYSIOLOGY_V2_CAPTURE_BASELINE=1`. Ne pas capturer la baseline avec les sources corrigées. Le fichier figé `qa-before.json` est conservé ; le test normal ne le réécrit pas. `PHYSIOLOGY_V2_EVIDENCE=1` produit les sorties après et les artefacts synthétiques.

## Résultats et essais intermédiaires

- Suite existante : **332 PASS** ; nouveaux tests V2 : **54 PASS** ; contrôle final incluant les protections build/release : **76 PASS**. Les ensembles se recouvrent partiellement avec les contrôles apparentés : ne pas additionner tous les logs comme des tests distincts.
- Avant correction : 9 FAIL F1–F4 attendus ; 4 FAIL supplémentaires pour le routage des tests LAB liés. Ils restent archivés.
- Premier test de sauvegarde : deux échecs du mock, qui retournait toutes les anciennes lignes après un insert au lieu des seules lignes insérées. Mock corrigé, pas le moteur pour satisfaire le test.
- Le typage a signalé le passage d'une interface de contexte à une API attendue `Json` dans le test ; sérialisation de frontière rendue explicite, sans cast de contournement. Logs d'échec conservés, typage final passe.
- Premier build : garde normal `PLAN_RELEASE_DECLARATION_STALE:releaseId`. Déclaration régénérée par **`node scripts/preproduction/plan-release-source.mjs --write`**, puis build vert. Le manifeste reste `attested:false`, `deploymentAttested:false`, `provenance:declared-source` ; catalogue, contrats et empreintes Edge inchangés. Aucun garde désactivé.

Les dépendances disponibles de V1 ont été réutilisées par lien local, sans nouvelle installation ni modification des lockfiles. Les versions effectives et codes de sortie sont dans le reçu de clôture. Avertissements de taille de bundles et de dépréciation des outils conservés, sans optimisation étrangère à la mission.

## Limites

Pas de PDF réel, OCR réel, parcours complet de la boîte de dialogue dans un navigateur, RLS réseau réelle, impression native ou génération d'un plan IA. Le test de rapport couvre la section MLSS effectivement modifiée, pas les dix mille lignes de l'export staff. Les tests ne démontrent ni efficacité d'entraînement, ni précision expérimentale individuelle, ni non-régression de tout DET.

Les logs texte et la vue HTML archivée ont leurs blancs finaux normalisés ; les patches historiques sont compressés sans perte (`.txt.gz`). Aucun résultat numérique ou message d’échec n’est retiré.

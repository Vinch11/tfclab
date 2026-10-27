# Post-#419 — calcul physiologique et prévalidation coach

Référence : `3a2ba77a71b8177dc1ed841c488cd79b55f3eeb6`, release déclarée `bc1e537ac0d0087f04c64804b745858445975b69f6e7bcf2c8647ace654261e3`. Mission limitée au moteur actuel ; aucun travail DET-ENGINE, Nolio, déploiement, migration ou appel modèle. Branche `fix/prevalidation-real-coach-p0`.

## Preuves et attribution

Le fichier `DIAGNOSTIC_RECUPERE_419.json` a été lu dans les artefacts locaux. Il contient des preuves **synthétiques offline**, pas la stack ni le payload de la recette Lovable. Aucune attribution de cette recette à une fixture n'est faite sans ces traces.

| Incident | Cause démontrée / limite | Correction | Preuve |
|---|---|---|---|
| Exception `optimal` | Le normaliseur local de `tfclDecisionMatrix` laisse passer `10K`, `10 KM`, `IRONMAN 70.3`, `SEMI-MARATHON`, etc. ; `normalizeFatMax` lit ensuite `FATMAX_TARGETS[objectif].optimal` sur `undefined`. Stack **reproduite**, pas récupérée de Lovable. | Réutiliser `normalizeObjectiveKey`, traduire les clés vers les tables déjà existantes et vérifier leur présence. Aucun nouveau chiffre physiologique. | `tfclDecisionMatrix.objectiveAliases.test.ts` et `prevalidation.physiologicalFailure.test.ts` : ensemble, 13 échecs / 2 succès au premier passage avant correction, dont les alias et le traitement explicite des objectifs non couverts ; log rouge synthétique conservé hors dépôt. |
| Repli physiologique silencieux | `computeStrategyFromDiagnostic` absorbe une exception de la matrice ; `_matrixResult=null`, focus absent et repli Lorang/diagnostic. Le calcul principal `detectUnifiedLimiter` est distinct et exécuté avant cette matrice. | Codes techniques minimaux dans la trace existante. Une **erreur de calcul** Lorang/matrice ou un diagnostic explicitement incomplet bloque la prévalidation client et serveur avant le modèle. Les messages d'exception ne sont pas transportés. | Injection d'une panne dans le calcul, tests du hook réel et des deux handlers Deno : aucun appel réseau/modèle ; classement principal, provenance et incertitudes préservés. |
| Matrice complémentaire non couverte | 5 km, Start-to-Run et certains trails ont un diagnostic unifié, mais pas de table dédiée dans cette matrice complémentaire. Leur donner les cibles d'un 70.3/10 km serait une invention. | Ne pas appeler la matrice absente ; afficher un avertissement `decision_matrix_not_supported` et conserver le diagnostic unifié. Les deux vues de la carte affichent cette limite. Une absence de couverture déclarée n'est pas une exception de calcul masquée. | Tests 5K, TrailMountain, TrailLong, StartToRun, objectifs inconnus et vues React ; avertissement non bloquant, aucune cible ajoutée. |
| Messages coach | Certains codes, dont `prevalidation_input_invalid`, étaient affichés tels quels. | Messages français, durée invalide identifiable, anomalie de portée plan affichée comme « Plan » au lieu de S0 ; codes inchangés dans les objets diagnostiques. | Test rouge de rendu avant correction ; tests positifs des messages et du hook sans appel HTTP. |
| Répartition 70.3 `0/4/4/2/1` | Retrouvée dans `703:light:competitor:unknown`, 16 semaines, `age_group`, avec **natation interdite** et mardi indisponible. Trois créneaux natation sont réaffectés. La recette réelle n'est pas attribuée à cette fixture. | **Aucun changement des quotas ou règles de redistribution.** Clarification de la lecture des bornes et des bricks dans le panneau. | Test du cas exact et comparaison avec le même cas sans interdiction : la natation est alors présente. Ce test ne prouve pas la pertinence sportive du cas interdit. |
| Corrida B | Aucun défaut de transmission démontré. Le parcours conserve les courses supplémentaires et réserve leur jour. | **Pas de correctif spéculatif.** | Configuration → préparation de 12 semaines → fenêtre S5–S8 → transport : événement CAP le samedi **19/12/2026 en S8** pour un début le 26/10/2026 ; course A conservée au 17/01/2027. Cela ne prouve pas les paramètres de la recette réelle. |
| Plafond/progression/récupération | Un plafond interne n'est ni une dose prescrite ni une tolérance mesurée. La validation compare déjà à la dernière semaine de charge réellement prescrite. | **Aucun coefficient ni règle modifié.** | Contrôles négatifs : 100 → 70 → 110 min acceptés pour cette seule règle ; 100 → 71 → 121 refusés en récupération/reprise. Fragments de dose fictifs, pas plans générés validés sportivement. Tests existants des quatre niveaux avec/sans heures conservés. |

## Portée commune et spécifique

Les corrections de normalisation, de visibilité des erreurs et du verrou sont communes. Les alias utilisent exclusivement les tables existantes de chaque famille ; aucune cible, taxonomie, zone, fréquence, périodisation ni règle de récupération n'est redéfinie. Les règles de natation, de bricks, de renforcement et de compétitions restent inchangées.

Un contexte historique dépourvu de trace physiologique reste soumis aux contrôles mécaniques existants ; son absence de trace n'est pas une attestation scientifique. Une trace explicitement en échec ne peut plus aboutir à un résultat admissible. Un avertissement de matrice complémentaire non couverte ne prétend pas que le classement unifié a échoué.

Le filtre de fraîcheur du TSS, la provenance `MANUAL`, le statut de charge `unknown`, les priorités coach et les niveaux de fiabilité restent intacts. Les tests injectent des exceptions synthétiques et vérifient qu'aucun message libre n'apparaît dans le rapport de prévalidation ; aucun nouveau journal de paramètres, santé ou profil n'est ajouté.

## Reproduction

```sh
node node_modules/vitest/vitest.mjs run \
  src/lib/v2/__tests__/tfclDecisionMatrix.objectiveAliases.test.ts \
  src/lib/plan/__tests__/prevalidation.physiologicalFailure.test.ts \
  src/lib/plan/__tests__/post419Contracts.test.ts \
  src/hooks/__tests__/useAITrainingPlan.prevalidation.test.tsx \
  src/components/__tests__/PlanPrevalidation.test.tsx \
  src/components/__tests__/TFCLDecisionMatrixCard.objectives.test.tsx
TFCL_PREVALIDATION_MATRIX=/tmp/post419-matrix node node_modules/vitest/vitest.mjs run \
  src/qa/sports-plan-lab/__tests__/prevalidationMatrix.test.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/vitest/vitest.mjs run
# Deno : même runtime/configuration que la CI ; aucun secret ni accès réseau modèle.
deno test --allow-read --allow-env supabase/functions/ai-training-plan/
deno test --allow-read --allow-env supabase/functions/ai-training-plan-test/
node --test scripts/preproduction/verify-plan-release.checks.mjs
```

La déclaration de release est régénérée par `node scripts/preproduction/plan-release-source.mjs --write`. Le catalogue et les verrous restent inchangés ; le contrat et les composants modifiés reçoivent de nouvelles empreintes. Aucun contrôle de compatibilité n'est désactivé. La reproductibilité et le build Lovable restent des validations offline, jamais une publication.

## Résultats offline

Comparaison des mêmes 600 cas synthétiques avec la sortie enregistrée #419 ; détail par objectif et ambition dans [matrix-comparison.json](post419-evidence/matrix-comparison.json).

| Indicateur | Avant #419 | Après correctif |
|---|---:|---:|
| Préparation admissible aux contrôles disponibles | 101 | 77 |
| Revue coach | 441 | 465 |
| Refus bloquants | 58 | 58 |
| Nouveaux blocages / refus historiques perdus | — | 0 / 0 |
| Quotas, phases, types de semaines, plafonds, pools, priorités modifiés | — | 0 pour chacun |
| Occurrences d'avertissement de charge inconnue | 310 | 310 |
| Occurrences d'avertissement de diversité | 14 | 14 |

La différence de statut vient exclusivement de `decision_matrix_not_supported` : 120 cas possèdent cette limite désormais explicite, dont 24 auparavant sans autre avertissement. Ce n'est ni une perte de construction démontrée ni un nouveau refus mécanique. Les 11 contrats historiques de diversité sont aussi rejoués sans blocage. Les 600 cas couvrent les objectifs et ambitions existants, dont running, trails, Sprint, Olympic, 70.3, Ironman et LCW ; **aucun nouveau plan complet de modèle n'est attesté**.

Contrôles locaux : 32 tests ciblés passent ; typage TypeScript sans erreur ; ESLint différentiel 8 erreurs préexistantes avant/après, aucune nouvelle. Suites Deno production/test : 355 / 351 tests verts. Le premier passage global local a détecté la déclaration de release périmée pendant le développement ; elle a été régénérée et les cinq tests du build Lovable repassent. Les quatre jobs CI et la reproductibilité doivent être examinés sur le HEAD final de la PR avant fusion.

## Limites et décision

- Stack, objectif sélectionné et classement réels de l'erreur Lovable : **non attestés**. Le défaut du code est reproduit, son attribution à cette exécution reste ouverte.
- Contraintes réellement utilisées dans la recette 70.3 et présence effective du payload Corrida : **non attestées**. Les tests démontrent le contrat, pas les données de cette recette.
- Aucun nouveau plan complet issu d'un modèle n'est fabriqué ou annoncé. Un précontrôle réussi ne prouve ni la qualité sportive d'un futur plan ni sa validation scientifique.
- La fréquence et la première dose sous charge inconnue exigent toujours la revue du coach. Les simulations de dose ne remplacent pas un historique mesuré.
- En cas d'erreur de calcul effective, le verrou est volontairement plus strict : résolution du défaut avant tout nouvel appel payant. Les avertissements de diversité, de charge inconnue et de matrice complémentaire absente restent des avertissements.

**Fusion : GO pour revue seulement si les quatre contrôles CI et la reproductibilité sont verts sur le HEAD proposé ; aucune fusion autorisée ici. Nouvelle génération réelle : NO-GO immédiat sur le seul fondement de ces tests.** Elle nécessite la validation humaine de la PR, une autorisation distincte de mise à jour coordonnée, la confirmation des paramètres/compétitions de la fixture choisie et une prévalidation sans erreur de calcul. Les premières prescriptions finales demandent une revue sportive du coach.

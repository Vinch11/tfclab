# Compatibilité DET V22 — vérifiée au dernier état V23

PR [#420](https://github.com/Vinch11/tfclab/pull/420) **strictement en lecture seule**. Au démarrage : `efa50b520d993a32de95d609eadb5e0001e0ebca`, titre encore V22 avec premiers fichiers V23. Actualisation : **`4ec5547875768f8430606401bb750445e381f71f`**, livraison V23 clôturée. Les trois changements entre ces SHA sont des reçus/états documentaires ; les contrats examinés sont identiques. V1 n'est donc pas utilisé comme substitut à V22.

Sources : `experimental/det-engine/v22-evidence.ts`, `v22-profiles.ts`, `v22-intensity.ts`, `v22-prescription.ts`, `v23-conflict.ts`, et `docs/det-engine/v23/RUN_REFERENCE_HANDOFF.json`. [Empreintes](evidence/det-contract-source-comparison.json), [provenance des cas copiés](evidence/det-input-provenance.json).

## Comparaison des contrats

| Contrat | Compatibilité et constat | Adaptation nécessaire, non appliquée à DET |
| --- | --- | --- |
| TTE observé | L'adaptateur V22 traduit `observed` en `OBSERVED` et injecte un effectif précalculé | **Conserver cette traduction** : V2 n'a pas modifié l'énumération du moteur TTE |
| VLamax terrain | V22 conserve le type terrain et l'objet effectif plutôt qu'une étiquette labo | Compatible ; conserver source/date/confiance/marge et discipline |
| Score économie 3 | Valeur de fixture figée, jamais établie comme coût O₂ | Ne plus l'utiliser dans un appel effectif au prédicteur CE. Aucun score converti et aucune valeur favorable injectée |
| Nouveau coût explicite | V22 ne renseigne pas `runningEconomyCostMlKgKm` | Champ optionnel : absence → prédiction/cross-validation indisponibles ; conserver l'inconnue |
| Cas A / B | Le proxy reste 82,8 / 85,1 ; les comparaisons à 95 % issues de score3 disparaissent | Distinguer **unknown** et **cohérent**. La disparition d'un conflit invalide ne vaut ni approbation de l'ancre ni levée de toutes les conditions de prescription |
| Cas C sans références | Pas de coût, pas d'ancre course inventée, TTE unknown/0 inchangé | Continuer de refuser l'usage de zéro comme observation de durabilité |
| Reproduction V23 | `traceRunReferenceConflictV23` appelle encore directement le prédicteur avec le score pour reproduire le défaut historique | Garder l'archive comme reproduction legacy ; ne pas la présenter comme diagnostic corrigé ni la réinjecter comme preuve scientifique |
| Unités d'intensité | V22 intersecte source et doctrine puis convertit km/h→m/s pour la course ; W vélo conservés | Compatible ; aucune nouvelle formule ou plage. Les plages de domaine ne sont pas des marges d'erreur des ancres |
| Confiance/marge des paramètres | Objets effectifs disponibles mais références centrales largement aplaties | Consommer `physiologicalEvidence` / `trace.parameters` lorsqu'ils existent ; ne pas transformer une confiance heuristique en certification |
| Provenance scientifique/stockage | `snapshot`/`profile` ne suffisent pas pour qualifier une mesure | Lire origine, méthode, date du test, unité et discipline séparément ; inconnues explicites |
| Traces MLSS | V2 porte une nouvelle version et l'unité du coût ; dérives legacy ambiguës filtrées | Ne pas agréger score ancien et coût nouveau comme évolution physiologique. Aucun historique à réécrire automatiquement |
| Calendriers et capacités | Conditions V22/V23, variantes, technique nage/force et plafonds indépendants de la correction F4 | Ne lever aucune contrainte à partir du seul retrait d'une cross-validation erronée |

## Sonde exécutée, sans écrire DET

Les entrées synthétiques V22 A/B/C et le handoff V23 sont copiés **à l'identique** dans les preuves V2, avec SHA. Le test appelle le diagnostic V2 sur les cas figés, sans modifier leurs entrées : [résultat](evidence/det-contract-probe.json). A/B conservent leur valeur effective issue du seuil/VMA ; C reste sans ancre. Aucun CE200 de remplacement n'est ajouté à ces trois cas.

Cette sonde n'est pas un rejeu du moteur complet DET, de ses calendriers, de ses réservations ou de ses tests de recette. Les tests V22/V23 qui attendent le conflit historique devront être distingués des nouveaux tests de consommation. Aucun fichier, validateur, catalogue, donnée ou ref de #420 n'a été modifié.

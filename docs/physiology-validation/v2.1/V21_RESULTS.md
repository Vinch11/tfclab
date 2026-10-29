# V2.1 — résultats de stabilisation — DRAFT / NO-GO

La revue de #425 confirme huit familles d'anomalies techniques et de provenance, corrigées sur sa branche, sans remplacement d'équation ni recalibrage. [Rapport et preuves](REVIEW.md).

| Vérification locale finale | Résultat |
| --- | --- |
| ESLint comparé à la base PR | **245 ≤ 246**, contre 258 initialement ; aucune règle supprimée |
| V2 et nouvelles non-régressions | **75 tests / 10 fichiers passent** |
| Suite scientifique V2 existante | **332 tests / 35 fichiers passent** |
| Build et release | **22 tests passent** ; build et TypeScript réussis |
| Suite complète | Exécution locale avant le dernier complément de confiance : 399 fichiers passent / 1 échoue sur délai ; 3 130 assertions passent, 1 échec, 1 skip, 6 TODO. Le fichier non modifié concerné passe isolément : **11/11**, délai intact. |
| 37 profils QA | Fixtures inchangées ; sorties V2 MLSS, alertes et empreintes effectifs/limiteurs/readiness/cibles conservées |
| Audit des 25 retraits MLSS | Coût absent reste inconnu ; aucun statut de comparaison favorable créé ; alerte blessure et catégorie critical du débutant conservées |
| Sauvegarde/réouverture | Tests hook avec transport simulé ; plafond 2 000 / 2 001 et absence d'écriture sur rejet contrôlés |
| Navigateur synthétique | **1 smoke Chromium passe**, import/édition/localStorage/reload/rapport réels ; aucun réseau Supabase revendiqué |
| Reproduction sur SHA initial | **17 échecs / 5 passes** sur 22 assertions ; corrections vérifiées ensuite, pas de modification de la référence |
| Préservation scientifique | 12 empreintes de cœur identiques ; fixtures QA V2 et locks intacts ; seuls fingerprint frontend et releaseId de déclaration actualisés |

Les ensembles de tests se recouvrent et ne doivent pas être additionnés. Le compte rendu final des **quatre checks du SHA publié** est sur [la PR #425](https://github.com/Vinch11/tfclab/pull/425/checks) ; les artefacts GitHub initiaux sont conservés. Les passes locales ne sont pas présentées comme résultats de CI.

Les coûts explicites et leurs inconnues traversent les tests de provenance, le diagnostic, le contexte de plan et le rapport. Les données historiques restent consultables ; aucune migration ni réécriture automatique. Une VLamax de discipline inconnue ne qualifie ni un champ spécifique ni un profil métabolique importé. Une valeur changée puis restaurée ne retrouve pas une ancienne provenance périmée.

**NO-GO maintenu.** Le retrait d'une comparaison invalide ne valide pas l'ancre restante, une dose, une capacité ou une performance individuelle. Les archives scientifiques indépendantes manquantes, la persistance réseau et les adaptations DET restent à décider. [Risques et critères](GO_NO_GO.md), [reprise et budget](REPRISE.md).

Complément de clôture : **97 tests passent** en une commande (75 V2/revue + 22 protections). La confiance globale du snapshot reste disponible à sa source ; elle ne remplit plus la confiance scientifique d’un paramètre sans métadonnée valide. [CI de stabilisation et observation finale](CI_RESULTS.md).

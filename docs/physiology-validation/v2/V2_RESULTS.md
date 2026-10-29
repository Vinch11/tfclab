# Physiological Validation V2 — DRAFT / NO-GO

## Résultat

F1–F4 sont corrigés dans les sources de la branche **`experiment/physiology-validation-v2`**, issue du dernier `main` observé, `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. Aucun changement intégré à #424 ou #420, aucune fusion ni activation en production.

La priorité est un profil TFCLab fiable et traçable à partir de tests sportifs. Il ne s'agit ni de reproduire INSCYD, ni de remplacer les équations existantes. Les douze fichiers de cœur scientifique/fixtures contrôlés sont **identiques octet par octet** à la baseline : [empreintes](evidence/preserved-scientific-core.json).

- F1 : références de profil soumises aux mêmes bornes et à la finitude que les références snapshot.
- F2 : stockage en snapshot affiché « Stocké », sans affirmation de mesure directe.
- F3 : VLamax importée affectée selon la discipline explicite ; ambiguïté conservée sans affectation ; protection des tests LAB liés dans les deux directions vélo/course.
- F4 : coût O₂ explicite en ml O₂/kg/km séparé du score ; coût absent/invalide → seule la prédiction dépendante et sa cross-validation sont indisponibles. Le proxy seuil/VMA reste prioritaire et les autres calculateurs admissibles sont conservés.

## Acquis démontrés

| Vérification | Résultat / preuve |
| --- | --- |
| Reproductions de #424 sur main, avant correction | **9 échecs attendus**, couvrant F1–F4 ; [log](evidence/defects-before.txt) |
| Extension F3 : LAB lié vélo/tri/nage/inconnu vers course | **4 échecs reproduits**, puis corrigés ; [avant](evidence/linked-lab-before.txt) |
| Suite existante sélectionnée | **35 fichiers, 332 tests verts** ; [log final](evidence/existing-suite-final.txt) |
| Nouveaux tests V2 | **8 fichiers, 54 tests verts**, dont boucle sur les **37 profils QA** ; [log](evidence/v2-verification-complete.txt) et contrôle de clôture `validation-final.txt` |
| QA indépendante avant/après | Empreintes effectifs/limiteurs/readiness/cibles identiques sur 37 profils ; **25 sorties MLSS et 1 ensemble d'alertes changent**, conformément au défaut corrigé ; proxies disponibles conservés |
| Import/édition/sauvegarde/réouverture/diagnostic/plan/rapport | Réelles fonctions de l'application, transport DB simulé ; métadonnées, coût, marges connues et inconnues conservés ; [artefact](evidence/import-save-diagnostic-report.json) |
| DET au dernier état consulté | V22 + V23 final au SHA **`4ec5547875768f8430606401bb750445e381f71f`** ; cas A/B/C figés testés sans changer leurs entrées ; [sonde](evidence/det-contract-probe.json) |
| Typage et build | Typage final contrôlé ; résultat du build et rafraîchissement normal de déclaration dans les logs de validation. Aucun garde contourné ; aucune attestation de déploiement |

Les synthèses chiffrées et codes de sortie de clôture sont dans [le reçu](evidence/CLOSURE.json). Les passes ne constituent pas une validation physiologique expérimentale ou une preuve d'efficacité de dose.

## Ce qui reste incertain

Les archives des observations N=44, N=15 et des références originales du Modèle C ne sont pas reconstituées à partir de commentaires ou de fixtures. L'historique Git retrouve les ajouts des coefficients et du protocole, pas les paires permettant de reproduire les erreurs annoncées. Le registre sépare [calibration, validation interne, hors échantillon et preuve individuelle](SCIENTIFIC_EVIDENCE_REGISTER.md).

Le rapport vitesse seuil/VMA reste un **proxy**, distinct du pourcentage de VO₂max prédit. Une cross-validation interne ne prouve pas l'équivalence des deux grandeurs. La correction retire une comparaison alimentée dans la mauvaise unité ; elle ne certifie pas l'ancre restante.

Les 37 fixtures et les tests d'import sont synthétiques. Aucun PDF athlète réel, base réelle ou mesure nouvelle utilisé ; l'extraction OCR, un parcours navigateur complet, l'impression native et une persistance réseau réelle ne sont pas validés par ces tests. Les contrats DET restent conditionnels et ses calendriers ne sont pas approuvés.

## Décision

**NO-GO de publication/activation**, PR indépendante en brouillon. Les corrections sont prêtes pour revue technique et scientifique ciblée ; pas de GO global des profils ni des prescriptions. [Critères explicites](GO_NO_GO.md), [reprise](REPRISE.md).

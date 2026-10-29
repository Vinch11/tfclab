# Relais physiologique #424 — lecture seule

DET baseline `4ec5547875768f8430606401bb750445e381f71f`. PR #424 consultée au commit `36a8f2f69c07248aa4e08bbc4bb322e9ae4c759d`, branche `experiment/physiology-validation`, brouillon non fusionné. Ses fichiers ne sont ni appliqués ni exécutés comme une dépendance distante.

Neuf fichiers ont été récupérés par le connecteur GitHub. Leur contenu UTF-8 est conservé dans `evidence/pr424-retrieval.json`, avec SHA Git et SHA-256 effectivement calculé. Le vérificateur indépendant recalcule les neuf objets Git. Les snapshots des deux PR sont archivés séparément. Le diff de contexte `pr424-diagnostic-source.diff` montre deux autres écarts de base liés à `canGuidePrescription`; **la fonction de frontière étudiée est textuellement identique** et le prédicteur est identique entre les branches. Cela ne prouve pas l'équivalence des deux branches entières.

## Fixture commune et unités

| Fixture | VLamax course | Score transmis | CE explicite | VMA | Allure seuil | Sortie native | Rejeu candidat #424 |
|---|---|---|---|---|---|---|---|
| A V22 inchangé | 0.3 | 3 | absent | 15 km/h | 290 s/km | observé 82,8%; prédiction 95%; écart −12,2 points, critical | observé 82,8%; prédiction et comparaison nulles |
| QA #424 distincte | 0.5 | 65 | 200 ml O₂/kg/km synthétiques | 18 km/h | absente | prédiction 93,7% | prédiction 83,2% |
| QA #424 sans CE | 0.5 | 65 | absent | 18 km/h | absente | score encore interprété comme CE par le chemin natif | runMLSS nul; aucun ancrage inventé |

Les entrées complètes, unités, traces du prédicteur, sorties et hashes réels sont dans `validation-2/build/physiology-handoff.json`. La valeur 200 n'est jamais substituée au profil A. Le natif borne le score reçu à 150 dans une fonction attendant un coût énergétique; l'écart dimensionnel précède toute interprétation sportive du désaccord.

## Contrat de transport expérimental

Le loader de test reproduit **en mémoire seulement** les deux substitutions d'arguments du patch candidat #424. Il échoue si les deux sites ne correspondent plus. Aucun fichier calculateur n'est réécrit. Le champ CE n'est ajouté qu'à la fixture distincte explicitement documentée.

`assessRunReferenceV24` exige une vitesse positive en km/h, une provenance, deux empreintes au format SHA-256 et une date. Une référence candidate corrigée peut être présentée au coach; une référence incertaine, absente, mal dimensionnée ou conflictuelle retourne une suspension sans vitesse utilisable. Ce contrôle de transport n'est ni une certification scientifique des données ni une approbation de dose.

Pour A, l'ancre reste `12.413793 km/h` dans les deux lectures : elle provient de l'allure initiale. Retirer la comparaison fautive ne fournit aucune mesure CE ni une nouvelle preuve de validité de l'allure. **Les sept refus course natifs sont conservés dans le calendrier retenu.** Le relais n'annonce ni correctif fusionné ni validation des tests terrain. La décision sur le calculateur appartient au chantier #424.

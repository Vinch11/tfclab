# Matrice de provenance physiologique

## Contrat explicite

[PhysiologicalEvidence](../../../src/lib/physiologyEvidence.ts) porte valeur, unité, discipline, méthode, date du test, origine scientifique, source/date de stockage, confiance **avec son fondement**, et marge. Une information non établie reste `null`/`unknown`. Une date de stockage n'est jamais substituée automatiquement à une date de test.

| Paramètre | Valeur/unité/discipline | Méthode/date/origine conservées | Confiance et marge | Stockage / transmission |
| --- | --- | --- | --- | --- |
| VO₂max | ml O₂/kg/min ; discipline explicite du rapport si connue | Date rapport ; méthode de mesure inconnue si non extraite ; import PDF seul ne signifie pas mesure directe | Confiance d'extraction identifiée ; marge inconnue si absente | Snapshot + enveloppe ; input diagnostic, plan/trace |
| VLamax vélo | mmol/L/s / bike | Source VLa originale ; date rapport ; champ vélo seulement pour segment explicite | Extraction séparée de la confiance heuristique du moteur ; marge effective du moteur conservée | `vlamax`, métadonnées, effectif et trace |
| VLamax course | mmol/L/s / run | Source labo explicite permet le verrou existant ; champ course distinct | Convention moteur 0,95 et marge ±0,02 sur la fixture labo ; **pas une probabilité 95 %** ni un IC expérimental | `vlamax_run`, objet complet du diagnostic, paramètres effectifs du plan |
| VLamax non assignée | mmol/L/s / unknown | Valeur/source récupérables ; segment à préciser | Inconnues conservées | `unassignedVlamax` dans l'enveloppe, aucun pivot inventé |
| FTP, VMA, CSS | W/bike ; km/h/run ; s/100 m/swim | Origine inconnue pour un scalar legacy sans preuve ; date rapport conservée après import | Pas de précision individuelle inventée | Références effectives ; repli profil attribué à `athlete.refs`, pas au snapshot rejeté |
| Poids, masse grasse, FCmax | kg, %, bpm | Date/contexte d'import si connus ; aucune filière aérobie inférée | Extraction ou unknown | Snapshot, provenance d'entrée |
| Puissances terrain | W / bike | Champs Pmax, P30, P60, MAP disponibles ; méthode/date inconnues sans preuve structurée | Unknown si aucune marge mesurée | Snapshot et données sources ; pas transformation en mesure VLa directe |
| TTE vélo/course | min ; disciplines séparées | Source `observed`, `records`, `estimated`, `unknown` ; date scientifique inconnue si seule date snapshot | Convention de confiance existante, marquée heuristique ; pas de plage inventée | Objets effectifs conservés ; TTE unknown/0 ne devient pas observation |
| Score économie | score/100 / run | Score qualitatif ou inférence existante ; aucune équivalence automatique à un coût | Unknown/heuristic selon preuve disponible | Champ historique conservé pour limiteurs/UI |
| Coût O₂ | ml O₂/kg/km / run | Valeur explicitement éditée/importée ; date rapport ; méthode/origine restent inconnues si non documentées | Confiance d'extraction distincte de précision physiologique ; marge null si absente | Enveloppe notes → diagnostic → plan/trace → rapport et nouvelles traces MLSS |
| MLSS observé | Ratio vitesse seuil/VMA (%) | **Proxy**, pas mesure sanguine de MLSS ; entrées conservées | Pas de garantie expérimentale créée | Prioritaire même sans coût O₂ |
| MLSS prédit | % VO₂max | Modèle C existant ; dépend uniquement d'un coût explicite admissible et de VLa | Confiance heuristique ; RMSE historique distinct d'une marge individuelle | Null si coût absent ; trace versionnée, rapport explicite |
| LT1/LT2, FatMax, substrats, CP/W′ et durabilité | Unités des modules existants conservées | Équations et sources de V1 conservées ; aucune prétention que leurs sorties deviennent mesures directes | Incertitudes détaillées seulement quand les moteurs les fournissent | Audit et tests existants conservés ; pas de nouveau protocole empirique exécuté |

## Conservation et limites

L'enveloppe `TFCL_PHYSIOLOGY_V1` est un format de provenance, pas le numéro de cette mission. Elle est conservée dans `coach_notes`, champ déjà existant. Le schéma Zod et la sauvegarde réelle du hook sont exercés avec transport simulé. Le JSON est masqué dans l'édition/affichage des notes et conservé lors de l'édition du texte coach ; le rapport en rend une lecture utile du coût O₂.

Une modification de valeur scalaire invalide sa métadonnée périmée : la nouvelle valeur ne conserve pas la méthode/confiance de l'ancienne. Un fallback profil reçoit sa propre provenance. Le diagnostic reste accessible avec ses entrées et ses objets effectifs ; `PlanAthleteData.physiologicalEvidence` et `TrainingPlanPhysiologicalTrace.parameters` gardent les preuves disponibles, y compris marges effectives VLa/TTE et leurs inconnues.

La confiance globale d'un snapshot importé décrit ici l'extraction, pas l'erreur du laboratoire. La confiance du limiteur peut décrire la complétude ; elle n'est pas transformée en probabilité de causalité ou d'efficacité d'entraînement. Les bandes graphiques et percentiles de population ne sont pas rebaptisés IC individuels.

Limites : anciens champs sans métadonnées restent scientifiquement inconnus ; notes limitées à 2000 caractères à l'insertion par le schéma existant ; aucune troncature silencieuse. Le rapport staff MLSS est testé, pas l'ensemble des surfaces historiques. Les lecteurs legacy du résolveur CE simplifié et les libellés de cohortes des mini-rapports restent à auditer sans modifier leurs formules dans ce lot.

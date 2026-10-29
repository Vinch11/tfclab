# Confrontation aux calculs physiologiques TFCLab

**Expérimental — DRAFT / NO-GO.** Aucune qualification scientifique automatique, prescription individuelle approuvée ou revue humaine déclarée.

| Cas préenregistré | VLamax effectif | FTP transmise | Référence seuil course | Limiteurs | Cible vélo candidate |
| --- | --- | --- | --- | --- | --- |
| low_vlamax | 0.2 | 280 | 16.363636363636363 | TTE, FTP/kg, VO2max | {"unit":"W","min":0,"max":154} |
| high_vlamax | 0.9 | 280 | 16.363636363636363 | VLamax, TTE, FTP/kg, VO2max | {"unit":"W","min":0,"max":154} |
| ftp_sensitivity | 0.2 | 320 | 16.363636363636363 | TTE, VO2max | {"unit":"W","min":0,"max":176} |
| missing_anchors | 0.2 | inconnu | inconnu | TTE, VO2max | refus : référence absente |

Les résultats terrain sont des estimations stockées synthétiques. computeVLamaxEffectif, prepareTrainingPlanContext, le diagnostic et buildWorkoutCatalog sont réellement appelés, hors réseau. Les entrées complètes sont enregistrées avant les calculs ; dates, objectif, ambition, niveau et disponibilité sont fixes. FTP reste une entrée synthétique transmise, pas une nouvelle mesure calculée. Le diagnostic calcule les références et leur cohérence selon ses modèles ; une explication interne « validée » ne vaut pas validation scientifique indépendante.

La variation VLamax vélo change les limiteurs ; elle ne change pas artificiellement la référence course issue de données course inchangées. Passer de 280 à 320 W change la cible vélo de 154 à 176 W selon le domaine TFCL existant, sans changer les 30 minutes de source. La course conserve 20 minutes de source. La conversion de la référence seuil en m/s n’est pas une nouvelle formule de dose optimale. Les anciennes ancres de fixture 250 W / 12 km/h ne sont pas présentées comme individualisées pour ces nouveaux cas.

La liaison Z1 → récupération est une convention de coach synthétique préenregistrée, pas une inférence scientifique par titre. Sans cette liaison ou sans référence, la prescription reste non résolue. Les six fixtures prospectives gardent exactement leurs nouvelles cibles dérivées des références TFCL et leurs consignes à travers la couche Nolio expérimentale. Leur disponibilité individuelle et leur capacité à la dose ne sont pas attestées.

Le contrôle d’avis coach « résistance élevée » ne lève ni plafond de capacité ni créneau insuffisant et ne devient pas une assimilation observée. Aucune donnée quantitative de charge nouvelle n’est demandée.

Limite réelle : les limiteurs atteignent le catalogue, mais les leviers stratégiques transmis et le catalogue ne démontrent pas encore une causalité physiologique précise pour chacune des 96 doses. La trace TFCL conserve le statut `prescriptionIntent: not_verified`. Deux doses de récupération correctement calibrées ne résolvent pas ce lien général.

[Entrées préenregistrées](inputs-physiology.json), [liaison de domaines](inputs-domain-binding.json), [entrées complètes avant calcul](evidence/validation-2/build/physiology/registered-inputs.json), [résultats complets](evidence/validation-2/build/physiology/results.json).

Dans la cohorte des 51 IDs, une seule source (`B_BIKE_VO2_3MIN`) porte une métadonnée physiologique explicite dans la matrice héritée ; aucune ne possède de lien bibliographique exact vérifié dans ce registre. Ce constat de traçabilité n’est ni une preuve d’inefficacité des autres séances ni une validation de cette seule source. Il empêche de prétendre que les 96 prescriptions sont déjà reliées causalement à un limiteur individuel.

Le catalogue tronqué à 160 offres contient trois IDs à variantes complètes dans chacun des quatre cas : `C_BIKE_FORCE`, `TPL_IM_BIKE_FORCE_K3`, `C_10K_STRIDES_SPEED`. Leur présence dans une offre ne prouve ni l’intention optimale pour Ironman ni l’admissibilité de leur dose. Elle persiste même dans le témoin sans ancre, alors que le résolveur de prescription refuse les cibles. L’absence d’un autre ID de ce catalogue tronqué n’est pas un refus global de la bibliothèque ; les alternatives aéro ont été vérifiées séparément avec leurs métadonnées complètes.

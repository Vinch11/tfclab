# Surfaces et consommateurs C8

| Surface / contrat | Protection |
| --- | --- |
| Résultat `computeVLamaxEffectif`, résultat V2 | Catégorie/valeurs internes conservées ; qualification séparée et label scientifique recalculé. |
| Dashboard, jauges et ScoreEnvelope | Aucune promotion snapshot→MEASURED. Les enveloppes historiques sont requalifiées à la lecture, sans mutation de leur objet. |
| Cartes VLamax unifiées / staff | Qualification explicite, score et marge heuristiques, incertitude scientifique inconnue ou rapportée séparément ; onglet course ne réutilise pas la qualification vélo. |
| Essentiels | Qualification ajoutée à l'interprétation ; stockage et modèle ne deviennent pas mesure labo. |
| Rapports et exports staff | Graphique, synthèse et tables utilisent les labels qualifiés. Les anciens rapports scalaires sans provenance structurée restent conservativement inconnus. |
| Recommandations, Compass, templates, sélecteurs de semaine | Labels historiques de stockage neutralisés ; aucun LAB ou snapshot présenté isolément comme preuve. |
| Graphiques et scénarios | Plages et nombres conservés ; scores de scénarios/fiabilité explicitement internes, pas probabilités individuelles ni précisions démontrées. |
| Formulaires et contenus méthodologiques | Le mode Staff est une convention de stockage/verrou, pas une méthode ; lactate sanguin primaire et VLamax dérivée distingués. |
| Paramètres de planification / trace | Origines VLamax brutes et effectives requalifiées ; claims raw conservés pour audit mais non autoritaires pour l'admissibilité. |
| Badges scientifiques génériques pour VLamax | Une étiquette MEASURED héritée ne suffit plus ; provenance structurée requise, VLamax jamais affichée comme flux directement mesuré. |

Tests rendus : carte staff, cache ScoreEnvelope, export réel du graphique, contexte documentaire/incertitude rapportée. Smoke Chromium : historique inconnu → documentaire lactate → reload → discipline incompatible, valeur 0,42 conservée ; destinations externes bloquées. Le transport mémoire et localStorage ne prouvent pas la persistance Supabase.

L'inventaire lexical restant est archivé dans `surface-review-remaining.txt` : commentaires et noms historiques de modèles/champs ne sont pas des qualifications scientifiques. Les clés de stockage, colonnes et anciens payloads ne sont pas renommés ni migrés. Les fichiers DET ne sont pas modifiés.

La revue vise C8 et ses consommateurs identifiés. Elle ne certifie pas les modèles, toutes les surfaces de l'application au-delà de ce contrat, ni l'impression native réelle. Les nouvelles contraintes de qualification ne changent aucune dose, limite individuelle ou règle de récupération.

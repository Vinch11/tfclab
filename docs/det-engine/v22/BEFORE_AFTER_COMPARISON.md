# Comparaison avant / après V22

Trois lectures sont séparées : ancien bloc strict V11, moteur prospectif V14 initial au même préfixe de quatre semaines, puis extension V22. Le V14 initial complet16 reste également archivé. Aucun résultat16 n’est comparé directement à un résultat4 pour améliorer artificiellement les statistiques.

| Profil | Ancien bloc strict | Microcycle après option technique | Minutes V14 initiales S1–S4 | Minutes V22 S1–S4 | Erreurs historiques avant → après | Avertissements avant → après | Statut V22 |
|---|---|---|---|---|---|---|---|
| A_aerobic | Refus : distinct_catalogue_capacity_conflict | constructed | [510, 530, 580, 305] | [465, 485, 505, 285] | 8 → 4 | 36 → 36 | incomplete_or_refused |
| B_sustainability | Refus : distinct_catalogue_capacity_conflict | constructed | [510, 530, 580, 305] | [465, 485, 505, 285] | 8 → 4 | 36 → 35 | complete_conditional_candidate |
| C_uncertain | Refus : distinct_catalogue_capacity_conflict | constructed | [500, 528, 560, 285] | [455, 465, 480, 265] | 6 → 4 | 37 → 37 | incomplete_or_refused |

« constructed » dans la colonne microcycle désigne uniquement l’assemblage technique V10. C reste refusé par la couche physiologique V22 ; aucun assemblage technique n’est présenté comme prescription admissible.

## Comportements nouveaux vérifiables

1. Les observations TTE65/28 n’étaient pas consommées : les deux devenaient38 min estimées. La normalisation d’énumération permet aux vraies fonctions TFCLab de les distinguer, sans modifier les nombres d’entrée. La VLamax terrain n’est plus étiquetée labo.
2. Trois rôles de nage ne pouvaient être couverts par deux sources d’endurance distinctes. L’option explicite d’un rôle technique, avec contenu technique réellement écrit, construit le premier microcycle sans réduire la fréquence. Le yoga ou une nage facile ne sont pas requalifiés en stimulus de force/technique pour faire passer le test.
3. Le prospectif16 existant dépassait le budget des premières semaines (A/B510>480 puis530>528). Réserver d’abord les minima de sources et les floors natifs produit465≤480 et485≤528. Pas de séance supprimée, composant tronqué ou seuil de validateur modifié.
4. Un horizon explicite4 produit un objet ParsedPlan.totalWeeks=4 et28 jours, au lieu de devoir appeler16 puis découper un résultat. Les défauts de portée du validateur complet restent exposés.
5. L’ancien convertisseur d’intensité refusait globalement les pourcentages spécifiques d’une source. V22 peut fournir une intersection candidate documentée pour l’endurance vélo55–72%FTP : à FTP265,145,75–190,8W, sans élargir à75%FTP ni résoudre silencieusement les consignes FC/terrain.
6. Le levier brut de C assimilait TTE unknown/0 à un déficit100%. Le pont de consommation V22 refuse cette interprétation. Les sorties brutes restent visibles.
7. Le contrat canonique V18 est exécuté pour chaque réservation : les recettes partielles, variantes et repos finaux non arbitrés restent des conditions avant prescription, même si la durée numérique passe le catalogue historique.

Les sept séances course A restent refusées et C garde26 refus physiologiques. B garde30 réservations conditionnelles, pas30 approbations. Les volumes et sources A/B sont identiques : aucune individualisation des durées par une loi VO₂/TTE n’est démontrée. Les différences de décision et de refus sont réelles, explicites et testées.

Aucune erreur/alerte historique nouvelle au même préfixe. La disparition de certains avertissements de cohérence du limiteur résulte du TTE observé effectivement relayé, pas d’une suppression ou reclassification de l’alerte. La conformité brute reste négative.

# Réévaluation scientifique et modèles de progression

La chaîne reste **profil → limiteur → adaptation prioritaire → stimulus → dose candidate → récupération → réévaluation**. Les données sont celles des deux cas synthétiques V10, avec la seule réconciliation de budget V13 réutilisée : 10 h, même ambition finisher, même niveau qualitatif trained et mêmes disponibilités. Les enveloppes actuelles vélo/course restent180/75 et150/90 min. Les tests terrain et incertitudes sont conservés ; un TTE frais ou une estimation de VLamax ne démontre pas la durabilité sous fatigue.

## Fondements et limites

- **M21, Maunder et al.2021** : la durabilité concerne la dégradation lors d’un effort prolongé. Cela justifie d’examiner une exposition prolongée et sa réponse ; cette revue ne valide aucune progression75→90,90→95 ou95→100 min.
- **I20, Impellizzeri et al.2020** : une règle universelle de progression ou un ratio de charge ne constitue pas un certificat causal de sécurité. Aucune règle10% n’est créée ici. Les plafonds natifs configurés restent contrôlés comme conventions de programmation.
- **L175/L417, Lorang** : besoin du moment, historique, feedback, capacités individuelles et équilibre entre séances. Sources de coaching/shownotes selon V8, pas des essais contrôlés prouvant ces minutes ni une loi VLamax→dose.
- **W23, Wang et al.2023** : diminution de volume et conservation possible de rappels d’intensité/fréquence dans les populations étudiées. Ni un pourcentage universel, ni une activation obligatoire à chaque semaine n’en découle.
- **LL24** : des méthodes de force peuvent améliorer l’économie dans certaines conditions ; le circuit de stabilité proposé ne démontre ni une force maximale prescrite, ni un gain individuel d’économie.

Voir la [matrice scientifique V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md), sa bibliographie et les [limites d’attribution à Lorang](../v8/LORANG_METHODOLOGY.md). Aucune nouvelle revue systématique ni lecture intégrale supplémentaire n’est revendiquée en V14.

## Trois variantes bornées, aucune supériorité démontrée

| Modèle | Cible | Avantage prospectif | Limite |
|---|---|---|---|
| native_floor_conditional | Conserver les minima individualisés natifs comme cibles, soumises aux réévaluations | Relie calendrier, objectif et points de décision sans inventer de capacité | Minutes exactes = convention TFCLab, pas minimum physiologique prouvé |
| hold_current_envelope | Rester dans l’enveloppe actuellement documentée | Repli explicite lorsque la progression n’est pas confirmée | Conserve les écarts historiques de plancher et ne garantit pas la spécificité Ironman |
| blockwise_reassessment | Examiner la cible maximale du bloc en début de bloc, puis maintien | Permet de comparer une consolidation sans hausse hebdomadaire automatique | Cible plus forte plus tôt ; aucune preuve qu’elle soit préférable ou tolérable, non promue comme défaut |

La natation, les sources, disponibilités et garde-fous sont comparés à cohorte constante. Les variantes ne sont pas des athlètes supplémentaires. Le modèle par bloc conserve une alerte historique de progression supplémentaire pour l’aérobie ; cet essai reste candidat avec son incertitude, jamais promu au motif qu’il est assemblable.

| Profil/modèle | Course longue S1/S2/S3 | S5/S6/S7 | S9/S10/S11 | Écarts de plancher conservés |
|---|---|---|---|---|
| IM_aerobic_history / native_floor_conditional | 60/65/75 | 90/95/100 | 100/100/100 | 0 |
| IM_aerobic_history / hold_current_envelope | 60/65/75 | 75/75/75 | 75/75/75 | 6 |
| IM_aerobic_history / blockwise_reassessment | 60/75/75 | 100/100/100 | 100/100/100 | 0 |
| IM_balanced_history / native_floor_conditional | 90/90/90 | 90/95/100 | 100/100/100 | 0 |
| IM_balanced_history / hold_current_envelope | 90/90/90 | 90/90/90 | 90/90/90 | 5 |
| IM_balanced_history / blockwise_reassessment | 90/90/90 | 100/100/100 | 100/100/100 | 0 |

La hausse60→65→75 min initiale de l’aérobie est issue des planchers natifs sous l’enveloppe75, pas d’une adaptation présumée. L’autre profil privilégie une exposition course90 min déjà documentée dans sa fiction d’historique. Les différences de répartition en S1 sont expliquées par ces priorités et enveloppes, avec le même budget480 min natif ; seules les recettes chronométrées réellement flexibles peuvent être réduites pour tenir ce budget. Les nages inconnues ne sont pas raccourcies pour équilibrer le total.

**75→90 en S5,90→95 en S6 puis100** deviennent des décisions de réévaluation, pas des doses libérées. Il faut une nouvelle enveloppe explicitement argumentée par le coach, des efforts comparables, une exécution complète et une récupération compatible avec toute la semaine. Si la capacité reste75 ou90, le témoin de maintien reste disponible avec ses manques ; en cas de symptôme/récupération adverse, l’action est une suspension, pas une réduction automatiquement réputée sûre.

## Périodisation, récupération et affûtage

Les phases et types natifs sont conservés, identiques entre profils de même objectif/niveau mais avec doses et priorités différentes. S4/S8/S12 réduisent fréquences et réservations ; cette réduction ne prouve pas une récupération obtenue. La semaine S13 est de phasebuild mais de typetaper, suivie de trois semaines de phasetaper. Ce chevauchement et la longueur de l’allègement restent visibles ; les résultats W23 ne démontrent pas que ces quatre semaines natives sont optimales.

L’affûtage de ce prototype reste essentiellement facile. Aucun rappel intense n’est ajouté pour satisfaire un quota, et aucun principe n’interdit universellement de tels rappels. Leur place, la fatigue résiduelle, la préparation spécifique et la proximité de compétition nécessitent une revue indépendante. Les sources de position gardent leurs répétitions/repos ; une prescription répétée ne prouve ni confort ni adaptation posturale. Les justifications par créneau et tous les changements sont archivés dans `study.json.gz` sous `rationale`.

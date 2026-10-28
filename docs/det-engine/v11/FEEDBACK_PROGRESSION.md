# Feedback et progression entre semaines

Chaque observation est une fiction explicite, liée par empreinte au bloc de référence et à la prochaine séance. Aucun résultat n’est une adaptation observée. Le mécanisme de décision V9 reste réutilisé. Les modifications acceptées sont des propositions candidates, jamais des calendriers libérés automatiquement.

| Profil | Réponse synthétique | Décision | Modification S2 |
|---|---|---|---|
| IM_aerobic_history | assimilation | accepted_candidate_proposal | A_RUN_Z2_EASY :70→70 min |
| IM_aerobic_history | fatigue_recovered | accepted_candidate_proposal | A_RUN_Z2_EASY :70→65 min |
| IM_aerobic_history | pain | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_aerobic_history | contradictory_response | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_aerobic_history | objective_improvement | accepted_candidate_proposal | A_RUN_Z2_EASY :70→70 min |
| IM_aerobic_history | insufficient | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_aerobic_history | fatigue_unrecovered | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_balanced_history | assimilation | accepted_candidate_proposal | A_RUN_Z2_EASY :90→90 min |
| IM_balanced_history | fatigue_recovered | accepted_candidate_proposal | A_RUN_Z2_EASY :90→75 min |
| IM_balanced_history | pain | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_balanced_history | contradictory_response | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_balanced_history | objective_improvement | accepted_candidate_proposal | A_RUN_Z2_EASY :90→90 min |
| IM_balanced_history | insufficient | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |
| IM_balanced_history | fatigue_unrecovered | held_for_coach | Semaine retenue pour revue, aucune adaptation appliquée |

La bonne assimilation et l’amélioration objective synthétique conservent les doses. L’amélioration simulée est un exemple de deux relevés submaximaux comparables (protocole fictif documenté dans responseEvidence) ; elle n’établit ni durabilité, ni réserve de charge supplémentaire, ni modification du limiteur.

La fatigue ressentie plus forte mais récupération déclarée complète autorise une recherche bornée parmi des doses déjà étayées : plafond ordinaire de course V10 ou plancher natif réel S2. Cela conduit à70→65 min pour le profil aérobie et90→75 min pour l’équilibré, même ID source. Les autres doses et placements restent inchangés. Les quatre semaines, les fenêtres globales, les quotas, les sources et l’absence de nouveaux diagnostics critiques **et avertissements** historiques sont revérifiés.

Le premier essai équilibré 90→65 min est conservé comme rejet : le retour S3 à90 min ajoutait une alerte historique de progression. Le contrôle global a donc empêché qu’une réduction locale dégrade la suite. La nouvelle hypothèse75 min vient du plafond ordinaire préinscrit, pas d’une recherche du seuil numérique de l’alerte. Les substitutions V9 rejetées ne sont pas répétées.

Le seul passage de feedback testé est S1→S2 ; les autres transitions du bloc ne sont pas adaptées automatiquement. Douleur, test fiable contradictoire, données manquantes ou récupération incomplète sans douleur retiennent la prochaine prescription pour revue. Une réponse favorable ultérieure ne lève pas une suspension symptomatique : test de verrouillage dédié. Aucun diagnostic physiologique ni capacité n’est réécrit.

Preuves :evidence/final/feedback.json.gz, feedback-summary.json ; rejet initial dans evidence/attempt-2. Sept réponses par profil, soit quatorze situations ; seules deux propositions réduisent réellement une dose, quatre maintiennent, huit retiennent la prescription. Ce décompte ne constitue pas un taux de guérison ou de validation sportive.

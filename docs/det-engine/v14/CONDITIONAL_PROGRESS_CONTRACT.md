# Contrat de progression conditionnelle — candidat V14

Les trois états portent sur un créneau et son périmètre de preuve. Aucun ne vaut approbation opérationnelle ou revue experte. `actualApprovedPlan=null` demeure pour tous les calendriers.

| État | Signification | Conséquence |
|---|---|---|
| currently_admissible | Dose compatible avec les données et éléments de source actuellement étayés dans le périmètre testé | Revue coach toujours nécessaire ; aucune autorisation globale de plan |
| conditional_pending_reassessment | Cible prospective avec au moins une preuve manquante : capacité future, temps complet, prérequis, compétence, récupération ou interaction | Ne pas exécuter comme prescription approuvée ; satisfaire les conditions avant le créneau ou replanifier |
| not_admissible | Dose actuelle au-delà de l’enveloppe, contre-indication/défaut dur, réponse adverse non résolue ou donnée numérique/portée invalide | Refus ou suspension ; ne pas maquiller le défaut en simple condition future |

Une dose future dépassant une enveloppe actuelle peut devenir une **intention conditionnelle**, jamais une capacité acquise par le passage du temps. À échéance, une nouvelle évaluation doit documenter la capacité pertinente, le protocole complet, les symptômes et la récupération, ainsi que les interactions du microcycle. Une dose déjà excessive aujourd’hui est refusée. Les contre-indications et incohérences de catalogue démontrées restent bloquantes.

Chaque condition enregistre identifiant, nature, semaine limite, preuves requises et repli. Chaque créneau conserve capacité actuelle, minutes envisagées, source inchangée, dose de recette lorsqu’elle est connue, état et justification. Les champs sont un contrat offline de preuve ; aucune interface, questionnaire de charge ou donnée athlète de production n’est créé.

La résolution synthétique exige une preuve explicitement fictive, datée et applicable à la bonne source, au bon créneau et à la bonne semaine. Une recette tronquée, une réponse inconnue, un protocole différent, une preuve future/périmée ou une capacité insuffisante ne résout pas la condition. Une réponse adverse reste en suspension, y compris si un enregistrement favorable est ajouté ensuite. Une réévaluation valide explicitement insuffisante refuse la dose à échéance ; absence de preuve et refus établi restent distincts. Le simulateur n’est pas un mécanisme d’approbation réelle. Ses observations sont des assertions de scénario, sans mécanisme d’authentification ou d’ingestion de mesures individuelles réelles ; elles testent uniquement la décision logicielle sous ces hypothèses.

La validation recalcule les états, les bornes, la source originale et la correspondance calendrier/créneau ; une promotion falsifiée de conditional vers currently est détectée. Aucun contrat historique n’est supprimé, ni son niveau de sévérité modifié.

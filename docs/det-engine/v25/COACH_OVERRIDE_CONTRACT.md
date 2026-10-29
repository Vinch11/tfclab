# Contrat de dérogation coach — limité au plancher

Une dérogation ne peut concerner que `planning_floor_only`. Elle ne change ni `source_recipe_minimum`, ni `goal_variant_minimum`, ni capacité, intensité, tolérance ou récupération. Le paquet conserve l'objectif Ironman, la semaine, le slot, l'ID historique et son hash, la dose proposée, le floor et le contexte de profil. Un hash complémentaire lie le paquet à tous les contrôles du bloc.

Le statut actuel des six propositions est `pending_explicit_decision`. Elles sont présentables au coach avec leur lecture historique intégrale et l'évaluation complémentaire V25. Aucune dérogation n'est activée et la réservation principale de 95 minutes n'est pas remplacée.

La frontière future exige un document : identifiant, sujet haché, portée exacte, décision, acteur coach qualifié, date, motif, signature, et contrôle d'authenticité par un vérificateur externe. Le prototype ne dispose d'aucun vérificateur humain authentifié ni de décision réelle. Il refuse les simples déclarations d'approbation, les sujets/portées incorrects et tout document synthétique ou contexte simulé, avant même d'appeler un vérificateur permissif.

Les tests adversariaux contiennent des demandes d'approbation volontairement non fiables pour démontrer leur rejet. Ce ne sont ni des décisions humaines enregistrées ni des validations de dose.

Même une future décision authentique sur le floor ne constituerait pas une approbation `session_prescription`. La dose, l'ancrage d'intensité, les conditions individuelles et le microcycle nécessitent une décision distincte. Aucun connecteur d'export ou de production ne consomme ces statuts.

Réversibilité : retirer ou refuser cette proposition laisse le calendrier V24 intact. Tout changement de source, de capacité, de profil ou de contexte doit conduire à une nouvelle évaluation; les anciens paquets ne constituent pas un droit général à réduire les séances.

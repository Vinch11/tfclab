# Validation réellement exécutée

Complétude prospective, admissibilité actuelle, conformité historique, conditions et revue humaine sont mesurées séparément. Les historiques sont évalués sur les réservations candidates avec événement de durée inconnue ; les résultats ne deviennent pas un certificat d’exécution.

| Profil/modèle | Calendrier prospectif complet | Créneaux admissibles actuellement | Conditionnels | Refus de créneau | Erreurs historiques | Avertissements historiques | Écarts de plancher |
|---|---|---|---|---|---|---|---|
| IM_aerobic_history/native_floor_conditional | True | 1 | 104 | 0 | 2 | 129 | 0 |
| IM_aerobic_history/hold_current_envelope | True | 1 | 104 | 0 | 8 | 129 | 6 |
| IM_aerobic_history/blockwise_reassessment | True | 1 | 104 | 0 | 2 | 130 | 0 |
| IM_balanced_history/native_floor_conditional | True | 1 | 104 | 0 | 2 | 129 | 0 |
| IM_balanced_history/hold_current_envelope | True | 1 | 104 | 0 | 7 | 129 | 5 |
| IM_balanced_history/blockwise_reassessment | True | 1 | 104 | 0 | 2 | 129 | 0 |

## Lectures et limites

- **Structure prospective** :16 semaines,112 jours, sources et doses candidates associées à tous les rôles requis, disponibilités, repos, budget et espacement des longues vérifiés. Aucun trou n’est transformé en repos pour prétendre compléter un rôle absent.
- **Sources** : identités/contenus, durées originales, bornes ciblées, niveaux, phases et contextes testés ; aucun défaut de source détecté par les contrôles exécutés sur la sélection finale. La chronologie inconnue reste une condition, pas un contrôle passé.
- **Projection technique historique** : le schéma d’export réclame une durée numérique à l’événement ; sa durée inconnue n’est pas fabriquée en0. Il reste donc une erreur de portée d’export par calendrier. Le calendrier prospectif peut être complet sans être un payload opérationnel techniquement valide.
- **Historique sportif** : deux erreurs de ratio par fréquence demeurent pour les modèles à cible native/par bloc. Natation et vélo sont chacun33% des séances d’endurance, en conflit avec les proportions historiques ; ces alertes ne sont ni retirées ni changées de sévérité. Les observations de minutes réservées sont calculées séparément par les vrais blocs de génération, sans prétendre mesurer la dose interne ou résoudre automatiquement le débat méthodologique.
- **Maintien** : conserve en plus les six/cinq erreurs de plancher. Le repli n’est pas présenté conforme au contrat Ironman historique.
- **Avertissements** : dérive du gabarit de placement, répétition, prescription non entièrement vérifiée, auto-déclaration des séances clés, cohérence de phase/quota restent consultables dans historical-issues.json. Le modèle par bloc ajoute une alerte de progression pour l’aérobie ; aucune supériorité ne lui est attribuée.
- **Global** : budgets coach et contrôles de continuité/charge configurés sont exécutés sur toute la chronologie, ainsi que l’audit candidat de diminution d’affûtage. Leurs passages ne prouvent ni récupération réelle ni adaptation ni préparation à la compétition.
- **Réponse réelle et revue experte** : non effectuées. Les scénarios synthétiques ne sont jamais agrégés aux résultats actuels ni aux600 configurations historiques.

| Suite | Passés | Ignorés | Todo |
|---|---|---|---|
| Gouvernance | 62 | 0 | 0 |
| experimental | 132 | 50 | 0 |
| historical | 2999 | 1 | 6 |
| targeted | 6 | 0 | 0 |

Typage réussi. Les tests ciblés de preuve recouvrent la suite expérimentale et son opt-in : ils ne s’additionnent pas comme couverture indépendante. Les600 références ne sont pas régénérées en nouveaux plans V14. Deux processus offline indépendants produisent trois artefacts identiques ; les empreintes de source et références sont conservées.

Une correction finale de contexte relatif a suivi la validation initiale complète : typage et toute la suite expérimentale ont été rejoués ; les sources/entrées historiques sont byte-identiques. Les fiches «lendemain» ne peuvent plus être placées après un jour de repos connu, et une source exigeant une séance clé n’est pas utilisée si cette séance est absente. Leurs échecs intermédiaires sont conservés.

La correction de contexte ajoute un avertissement net layout_drift en S13 par calendrier (trois messages ajoutés/deux retirés), sans nouvelle erreur critique. Le coût de gabarit, ses messages et les inconnues de récupération restent visibles dans evidence/relative-context-comparison.json ; ce compromis technique ne vaut pas validation sportive.

Une dernière régression sémantique a été reproduite avant correction : le scénario sans gain traitait une enveloppe réévaluée insuffisante comme simple attente. Il refuse désormais explicitement la dose à échéance, sans modifier les capacités ou le calendrier prospectif. Le témoin rouge est conservé, puis typage et suite expérimentale entière rejoués.

Les essais rejetés restent archivés : créneaux de nage absents dans certains contextes, duplications puis incompatibilité de cible/source en S13, erreur intermédiaire de typage du témoin incomplet. Les corrections ont porté sur sélection, réservation compatible et typage, sans modifier les validateurs ni leurs seuils.

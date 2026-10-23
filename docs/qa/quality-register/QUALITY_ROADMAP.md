# Feuille de route qualité

Cette feuille de route trie les interventions par risque athlète, impact sur le plan, exposition probable, facilité de détection et coût/risque du correctif. Elle ne modifie aucun moteur.

## Dix interventions à meilleur rapport impact/effort

| Rang | Intervention | Pourquoi maintenant | Dépendance | Effort / risque | Critère de sortie |
|---:|---|---|---|---|---|
| 1 | Fusionner après revue les garde-fous 70.3 de `8bc61949` | Deux P0 démontrés : discipline obligatoire absente et mauvais pic final. | **Attend Claude** et CI/revue de sa branche. | S / faible | Fixture réelle ou fidèle : 0 swim et pic final 10 km bloqués ; vrai 10 km accepté. |
| 2 | Ajouter l'export structuré réel du plan 70.3 32 semaines au corpus QA anonymisé | Rend les assertions 0/7/163 et la compétition finale rejouables. | Indépendant du moteur ; dépend de la disponibilité de l'export. | S / faible | Hash/source documentés et analyse locale reproductible. |
| 3 | Propager `durationMin` et les blocs structurés jusqu'à l'analyse d'intensité | Corrige un défaut démontré : S8 95/165 min, S11 30/65 min. | **Attend Claude** si ses fichiers de validation changent. | M / moyen | Les fixtures historiques utilisent 100 % des durées fiables sans inventer celles absentes. |
| 4 | Revue coach des 40 divergences objectif↔stimulus | Fort impact potentiel, lot limité, aucune correction automatique risquée. | Indépendant de Claude et du moteur. | M / faible | Chaque fiche : confirmé cohérent, corrigible ou `not_verified`, avec preuve. |
| 5 | Revue coach des 70 candidats avancés non encore nommément protégés | PR #393 protège 29 cas ; le reste ne doit pas être supposé sûr. | Indépendant ; recalcul exact requis depuis l'audit et `main`. | L / moyen | Prérequis machine-readable ou justification d'absence pour chaque fiche retenue. |
| 6 | Contrôle déterministe prescription finale↔fiche source | Détecte répétitions, récupérations et durées contradictoires sur la séance réellement livrée. | Peut utiliser la traçabilité #385 ; attendre la fin des mutations P0 de Claude. | M / moyen | Le contrôle cite source, adaptation et différence ; `not_verified` si parse incomplet. |
| 7 | Décider des plafonds TTE/durabilité/économie | Risque de projections +50 % démontré ; nécessite une décision scientifique. | Revue coach/scientifique avant code. | M / élevé | Bornes justifiées, testées sur valeurs limites et exposées comme hypothèses. |
| 8 | Traiter les 84 ambiguïtés prioritaires et 16 libellés hors référentiel | Améliore l'interprétation sans convertir automatiquement Z4–Z6. | Indépendant ; revue discipline par discipline. | L / moyen | Chaque libellé relié à une grille explicite ou laissé `not_verified`. |
| 9 | Exposer et consommer la fiabilité VLamax/MLSS dans les décisions | Évite qu'une estimation faible soit traitée comme une mesure. | Revue produit/scientifique ; **attend Claude** pour éviter conflit moteur. | M / élevé | Aucune valeur faible confiance ne pilote silencieusement une séance/dose. |
| 10 | Mesurer la réutilisation sur un corpus longitudinal de plans | La répétition inter-plans est aujourd'hui une hypothèse sans fréquence réelle. | Indépendant si exports disponibles. | M / faible | Rapport par ID/famille/objectif, sans données d'athlète identifiantes. |

## Travaux indépendants de la branche P0 de Claude

- Ajouter des exports réels anonymisés et leurs manifestes de provenance.
- Revoir manuellement les 40 divergences candidates et les prérequis avancés restants.
- Clarifier les zones/libellés de la bibliothèque sans migration automatique.
- Construire un rapport longitudinal de réutilisation si plusieurs exports existent.
- Maintenir ce registre et lier chaque anomalie à une preuve stable.

## Travaux à différer jusqu'à stabilisation de Claude

- Toute modification de `planValidator.ts`, `finalValidation.ts`, du reconciler ou des chemins de sauvegarde.
- La propagation de dose dans les validateurs si les contrats changent dans le sprint P0.
- La consommation de confiance VLamax/MLSS dans la sélection/génération.
- Une correction à la source de la classification multiobjectif ; le garde-fou de Claude peut être revu sans réécrire cette hiérarchie.

## Séquence recommandée

1. Préserver le commit P0 actuel et sa CI.
2. Rendre l'incident 70.3 rejouable avec un export structuré.
3. Valider le laboratoire sportif sur cet export et sur des contrôles négatifs 5/10 km.
4. Fermer les lots de revue bibliothèque par preuve humaine, puis seulement ouvrir des correctifs ciblés.
5. Reprendre les projections physiologiques après décision scientifique sur les bornes et la confiance.


# RésultatsV9 — NO-GO

## Résultats vérifiés

La V9 implémente une décision prospective, une sélection catalogue bornée, un placement postérieur à la dose et un contrôleur de feedback synthétique. Elle ne se limite pas à une justification rétrospective : les intentions sont calculées sans catalogue/calendrier, puis leurs empreintes sont conservées dans les quatre étapes.

26intentions calculées sur deux pilotes et deux témoins de sensibilité ;8doses catalogue proposées et18refus. Les8choix de dose ont une justification opérationnelle explicite ; aucune dose optimale ni relation dose-réponse n’est validée scientifiquement. Les refus ont parfois plusieurs motifs : les occurrences par raison sont séparées dans dashboard.json.

| Profil synthétique | Intentions | Doses proposées | Refus | Minutes proposées | Microcycle complet | Plan de course complet |
|---|---:|---:|---:|---:|---|---|
| IM_reference | 7 | 5 | 2 | 210 | False | non |
| IM_glycolytic | 7 | 0 | 7 | 0 | False | non |
| Trail_known_history | 6 | 3 | 3 | 120 | False | non |
| Trail_unknown_history | 6 | 0 | 6 | 0 | False | non |

Les calendriers proposés passent les contrôles mécaniques exécutés : budgets, disponibilités, séances par jour, séparation disciplinaire et espacement candidat des longues. Ils restent incomplets et ne passent pas les contrôles sportifs historiques. Les doses proposées ne sont pas des prescriptions autorisées pour un athlète réel.

Ironman : deux doses vélo ne rentrent pas dans les contraintes opérationnelles actuelles ; aucune continuité de trois disciplines n’est acquise. Trail : la longue exposition verticale et le seuil ciblé restent refusés ; un autre besoin ne trouve pas de source distincte admissible. Les témoins sans limiteur classable ou sans historique récent ne sont pas rendus admissibles par le niveau qualitatif.

## Feedback réellement exécuté

56scénarios indépendants sur les8doses, plus deux trajectoires séquentielles de3observations :62évaluations synthétiques. Deux substitutions sont proposées par le contrôleur local, puis rejetées par les contrôles historiques avant/après. Aucune réparation n’est acceptée ou appliquée. Les décisions effectives restent maintien initial ou avis coach ; la douleur et les tests contradictoires priment sur les signaux positifs.

IM : une substitution crée duplicate_catalog_id_unresolved. Trail : une substitution crée key_sessions et key_sessions_per_sport. Les alertes intégrales et décisions effectives sont conservées dans rejected-feedback-proposals.json. Le refus de ces réparations est un résultat de sécurité du contrôleur, pas une dégradation d’un plan réel.

La trajectoire toléré → symptôme → retour positif maintient la pause jusqu’à une décision explicite du coach. Aucune valeur physiologique n’est mise à jour depuis ces simulations.

## Comparaison aux témoins existants

Les témoins proviennent des archivesV6 conservées, avec mêmes entrées athlète et diagnostic pour chaque pilote principal. Les variantes de sensibilité ne sont pas présentées comme le même profil. Les différences de contraintes, courses et historique sont enregistrées. Le préfixe de semaine1 du témoin est réévalué dans le contexte du pilote, indépendamment des erreurs du plan archivé complet. Il n’existe pas de comparaison trompeuse de taux entre une semaine et16semaines.

V8 : audit de332séances archivées, sans preuve causale complète. V9 :8doses choisies après8intentions préalables ; ce progrès de traçabilité n’atteste ni bénéfice physiologique ni qualité sportive générale. Les600références et contratsV8 sont conservés ; ils ne sont pas régénérés. Les dix unitésV8 ne sont pas relancées.

## Tests et reproductibilité

Typage final réussi. SuiteNode :62tests réussis. Suite expérimentale :78réussis,36opt-in ignorés dans l’invocation ordinaire. TestsV9ciblés :9réussis, dont la simulation end-to-end activée séparément. Suite historique :2999réussis,1ignoré et6àfaire. Les tests ignorés ne sont pas comptés comme contrôles exécutés.

Les dernières corrections ont été suivies de vérifications ciblées, d’un nouveau typage et d’une suite expérimentale complète. Les sources de production n’ont pas changé ; le résultat historique reste séparé. Le rejeu complet reconstruit indépendamment les quatre contextes, intentions, sélections, calendriers et feedbacks : sorties gzip et résumés identiques. Empreintes et logs dans evidence/reproducibility.json.

## Corrections et essais conservés

-Transport du niveau corrigé vers ambitionMeta ; échecs de typage initiaux conservés.
-Mauvais contexte de témoinIronman : sélection explicite du cas connu_synthétique avant comparaison, sans modification des mesures. Les résultats intermédiaires restent archivés.
-Placement corrigé pour éviter deux séances d’une même discipline le même jour.
-Fiches techniques/récupération et activationJ−1 mal admises dans les premières simulations : essais rejetés. Réutilisation du placementV6 et des métadonnées physiologiques structurées, sans reclassification.
-Le premier filtre lexical rejetait aussi une véritable ficheZ2 dont le titre mentionne récupération ; priorité corrigée vers son intention moderate_lt1 structurée. Test négatif et positif sur les fiches réelles.
-Une variante de répétition mécaniquement permise créait une alerte de doublon du validateur final : rejetée ; source distincte exigée sans affaiblir le validateur.
-Deux substitutions plus courtes examinées, non conservées car elles ajoutent des erreurs historiques. Aucun effacement des traces.

## Limites et décision

NO-GO. Un microcycle et huit doses ne constituent pas deux plans complets. L’allocation égale du temps est une convention de prototype ; les contrats de dose sont prudents et révisables, mais non validés cliniquement. Les volumes vélo, la tolérance verticale/excentrique, le dosage au seuil et la récupération réelle restent ouverts.

Les variantes méthodologiques doivent rester candidates et passer une revue sportive avant promotion. Les travaux techniques réversibles et comparaisons futures restent autorisés dans une exécution bornée ; aucune permission supplémentaire n’est demandée pour des corrections ordinaires. Aucune CoachPreview applicative, migration, écriture athlète/Nolio, fusion, dépense ou publication de produit.

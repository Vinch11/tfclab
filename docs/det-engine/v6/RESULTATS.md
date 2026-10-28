# DET-ENGINE V6 — comparaison vérifiée, NO-GO

**Les objectifs d'un candidat Ironman et d'un candidat trail sans blocage de tous les contrôles exécutés ne sont pas atteints. Aucun plan n'est validé par un expert.** Les progrès ci-dessous ne changent pas ce statut.

## Cohorte constante : les 76 candidats V5

| Mesure | V5 | V6 |
|---|---:|---:|
| Variantes techniques complètes | 76 | 76 |
| Entrées synthétiques/QA distinctes | 29 | 29 |
| Occurrences bloquantes, mêmes contrôles et suppléments V5 | 698 | 676 |
| Avertissements | 5 383 | 5 381 |
| Variantes ayant une réparation acceptée par les gardes | — | 17 |
| Entrées distinctes améliorées | — | 6 |
| Sans blocage existant et global | 0 | 0 |
| Revue experte | 0 | 0 |

22 réparations sont acceptées sur 28 propositions ciblées. Les mauvais placements de fiches réservées à la compétition passent de 41 à 19 occurrences. Les gardes interdisent une nouvelle alerte protégée ou une progression dégradée. Aucun indicateur de séance clé n'est réécrit, aucune obligation longue n'est supprimée, aucune dose de brick n'est répartie arbitrairement.

Les 676 occurrences comprennent trois émissions supplémentaires V5 de continuité ; le seul validateur existant en émet 673, et le contrôleur global rend les défauts de continuité visibles séparément. Ce changement de périmètre de comptage n'est pas présenté comme une amélioration.

## Diagnostic dimensionnel

Les ratios disciplinaires actuels du validateur sont fondés sur des nombres de séances, alors que les instructions TFCL demandent des minutes. Les fréquences nominales, effectives, physiques et les expositions par discipline sont séparées. Le temps d'intensité reste une estimation du validateur par clauses, avec sa part inconnue ; les zones de séance ne sont pas réparties uniformément en minutes.

Sur les plans V5 inchangés : aucune variante ne respecte toutes les bornes centrales en fréquences ; quinze variantes Ironman les respectent en minutes sur les semaines de charge, huit sur l'ensemble de l'entraînement. Aucun trail course seule ne résout son conflit de ratio par ce changement d'unité. Ces mesures portent **uniquement sur le contrat de ratio**, jamais sur la conformité sportive du plan complet.

Les bornes algébriques des quotas exposent une contradiction avec les bornes centrales de ratio dans les 76 calendriers sous les mêmes plages et le même patron de bricks. Le complément sur les fenêtres réelles de génération donne zéro variante satisfaisant les bornes centrales strictes dans tous les blocs. Il ne réimplémente pas la tolérance source ±3 % : ce zéro n’est pas une réévaluation des alertes historiques. Une moyenne globale ne suffit pas à établir la conformité de chaque bloc. Les alertes originales ne sont pas déclassées.

## Ironman : contrats stricts séparés

Deux modèles × huit entrées de quatre niveaux donnent seize plans complets, tous techniquement valides. Les obligations originales d'endurance longue sont conservées même en récupération. Les dates explicites des fiches et leur spécificité de format sont contrôlées. Les composantes des bricks viennent de leurs plages sources, pas d'un partage proportionnel.

Quatorze plans passent les contrats globaux exécutés ; deux gardent un défaut de continuité signalé. **Zéro** passe l'ensemble des contrôles sportifs existants et globaux. Les problèmes d'intensité, de ratios et de rôles clés restent visibles. Ce sous-ensemble ne valide pas toutes les ambitions ni l'ensemble des 40 entrées Ironman historiques.

## Trail : deux nouveaux ultras techniques

Le diagnostic distingue la bibliothèque entière du catalogue réduit : deux fiches longues nécessaires étaient écartées par les caps éditoriaux de sport/catégorie. Une récupération de couverture de rôle via le pipeline existant produit deux calendriers ultra complets sur les fixtures entraînée et très entraînée ; les niveaux non entraîné et léger restent explicitement refusés. Les contrôles trail court et montagne sont inchangés.

Les minima réels des fiches récupérées sont réservés à 210 minutes, somme de leurs composantes écrites. Aucune séance artificielle ni nouvelle capacité verticale n'est créée. Les deux nouveaux ultras passent le schéma et les contrats globaux exécutés, mais chacun garde quatre erreurs : trois obligations de catégorie A/B en base et une de ratio disciplinaire. **Aucun n'est une prescription sportivement validée.**

Les quatre calendriers construits de cette sous-matrice comprennent deux contrôles court/montagne déjà connus et deux nouveaux ultras. Ils ne sont pas ajoutés au taux historique des 600 cas. L'augmentation de deux entrées couvertes est technique, pas une augmentation du nombre de prescriptions conformes.

## Historique et tests

Les 600 références sont conservées ; les 167 prescriptions historiques ont été revalidées sans nouvelle erreur ou alerte de référence. Les onze dossiers sans blocage existant restent inchangés. Les 433 refus ne sont ni régénérés artificiellement ni tous déclarés impossibles.

Les matrices finales et validations de cohortes sont rejouées à l'identique. La suite complète passe : TypeScript, 56 tests Node, 62 tests expérimentaux (27 opt-in ignorés, exécutés séparément lorsqu’applicables) et 2 999 historiques (un ignoré, six à compléter ; 382 fichiers). Les commandes sont consignées dans `evidence/validation/commands.json`. Après cette suite, seul le diagnostic analytique par bloc a été ajouté : ses tests ciblés passent et son contrôle TypeScript final est consigné séparément dans le registre. Le moteur sportif est inchangé. Le contrôle complémentaire des ratios par bloc est identifié séparément dans le journal.

## Preuves et revue

- [Contradictions et témoins](CONTRADICTIONS.md)
- [Contrats et limites](CONTRATS_ET_LIMITES.md)
- Plans complets avec leurs alertes : [ultra entraîné](plans/ultra-entraine.md), [ultra très entraîné](plans/ultra-tres-entraine.md), [Ironman strict](plans/ironman-strict.md), [Ironman réparé](plans/ironman-repare.md).
- `comparison.json` : comparaison à cohorte constante ; `evidence/cohort/` : validation indépendante, intensités et limites par candidat ; `evidence/ratios-final/` et complément par bloc : modèles de ratio.

La PR demeure en brouillon. Pas de fusion, déploiement, migration, écriture athlète/Nolio ou appel payant. Les décisions scientifiques restantes sont exposées dans le document de contrats ; le registre clos ne promet aucune reprise automatique.

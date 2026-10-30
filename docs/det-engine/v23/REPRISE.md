# Reprise après V23

**DRAFT — NO-GO.** Baseline : `e449 f302 f4 ebd8 d7 c5713 bafe0596 d4 e61 d70 aae`. Branche `experiment/det-engine`, PR420 brouillon. Vérifier le head distant avant de reprendre.

## État retenu

Calendriers A/B/C et doses V22 conservés. Les priorités sont désormais transmises à la programmation, mais les trois essais de longue vélo isolée ajoutent une alerte et sont rejetés. Aucun bénéfice ni dose optimale revendiqué. A garde7 refus, C26, B30 réservations conditionnelles. Dans le contrefactuel défavorable, S2 vélo est mise en arrêt et le bloc devient incomplet/refusé.

95 min course S3 contre90 reste hors capacité actuelle. Alternative90 refusée car floor95 inchangé et preuve temporelle complète insuffisante. Les9 alternatives de la cohorte sont conservées, jamais appliquées. La réévaluation ne crée pas d’adaptation.

## Artefacts et contrôles

- `inputs.json` : cinq deltas contrefactuels fixes ; SHA des entrées V22 conservé.
- `evidence/validation-1/build/results.json.gz` et `replay` : version retenue, traces initiales, essais rejetés, états, contrôle4 semaines et sorties historiques intégrales.
- `evidence/development-*`, `qualified`, `final-probe` : essais antérieurs conservés, à ne pas additionner comme de nouveaux cas. Un test intermédiaire supposait à tort un levier Z2 dans le cas estimé ; le contrat a été corrigé pour vérifier les décisions réellement calculées, sans changer l’entrée.
- `decision-chains.jsonl`, `case-summary.json`, `RUN_REFERENCE_HANDOFF.json` : traces, bilan et paquet pour la revue physiologique parallèle.
- `evidence/independent-1.json`, `commands.json`, `source-pins.json` : audit et empreintes du code exécuté.
- `state.json`, `CYCLE_LOG.jsonl`, `final-integrity.json` : budget fixe et clôture.

## Prochain travail utile

1. Clarifier score/coût énergétique dans le chantier physiologique ; ne pas modifier concurremment les calculateurs et ne pas insérer une référence favorable.
2. Revue de la variante de placement et de son avertissement ; aucune désactivation de l’alerte ou variation artificielle de séances.
3. Preuve source-spécifique de capacité, récupération et recette pour une adaptation de dose acceptable. Si la capacité ne permet pas le floor, conserver le refus ou demander un arbitrage méthodologique explicite.
4. Étendre les demandes admissibles seulement avec données pertinentes : pas de VO₂/TTE→minutes universelles ni de HIIT imposé.

## Reprise idempotente

Budget V23 unique60 min/10 unités, sans renouvellement ni relance automatique. Ne pas relancer les unités clôturées V2–V23. Le contrôleur exige des sorties neuves et épingle le code ; une nouvelle session demande un nouveau registre autorisé. Audit en lecture : `PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v23-independent.py /tmp/v23-recheck.json` sur un chemin neuf.

Aucun changement production/catalogue/validateur historique, donnée réelle, migration, Nolio ou appel payant. Le quota exact de crédits n’est pas visible ; aucun coût externe engagé. La PR reste brouillon et NO-GO.

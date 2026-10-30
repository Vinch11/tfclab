# Validation exécutée

| Commande | Sortie | Erreur processus | Durée ms |
| --- | --- | --- | --- |
| types | 0 | None | 42394 |
| recipe_contracts | 0 | None | 9857 |
| independent_mutation_tests | 0 | None | 917 |
| selection_final | 0 | None | 3766 |
| selection_replay | 0 | None | 3979 |
| historical_regression | 0 | None | 22073 |
| experimental_guards | 0 | None | 49866 |
| v16_contract_regression | 0 | None | 5744 |
| output_final | 0 | None | 3582 |
| output_replay | 0 | None | 3416 |
| qualification_final | 0 | None | 532 |
| qualification_replay | 0 | None | 528 |


- Typage du périmètre expérimental : réussi.
- 25 tests Node dans la validation principale, puis **27** après les deux contrôles complémentaires de présentation/versions ; [reçu](evidence/contracts-final-supplement.json).
- **8 tests V17 de sélection**, deux processus identiques au rejeu.
- **3 tests de mutation du vérificateur Python** : altération d'un littéral, perte d'une partie et faux total détectés.
- **67/67 recettes complètes** avec contrôles Python de source, structure, plages et somme.
- Régression historique ciblée : **186 tests**,31 fichiers ; gardes expérimentaux : **30 tests**,8 fichiers,3 archivages conditionnels préexistants non exécutés.
- Régression de contrat V16 ciblée : **27 tests**. Les dix unités V16 ne sont pas relancées.

[Reproductibilité](evidence/validation-3/reproducibility.json) : deux compilations intégrales, deux études de sorties, deux sélections et deux qualifications indépendantes. La vérification complémentaire de sortie confirme l'identité après le support optionnel d'intensité coach et le refus des versions inconnues.

Les 3206 fichiers suivis avant V17, dont les 600 références et tous les registres V2–V16, sont inchangés. La suite applicative entière et les constructions de600 plans ne sont pas revendiquées comme rejouées. Aucun validateur historique ou moteur de production n'est modifié.

## Corrections et limites

Le premier audit d'inventaire utilisait une sortie git échappant les noms accentués ; le manifeste est désormais lu avec séparateurs NUL. Un contrôle de typage a rejeté map(JSON.parse) dans le nouveau harnais : remplacé par une fonction explicite, sans modifier le parser ni ses assertions sportives. Le résultat rejeté reste dans validation-2.

Le premier essai de sorties texte passait NaN pour les recettes sans témoin, à cause d'une expression optionnelle divisée avant le fallback. La correction restaure les833 contrats texte prévus, sans changer le nombre de recettes complètes ni les refus structurés. Les premiers artefacts sont conservés.

Le comptage des scopes cognitifs et des Main incomplets a été corrigé pour ne pas fabriquer des contradictions. Les répétitions gardent un paramètre source commun. Aucun repos final n'est inventé, aucune minute n'est ajoutée pour faire passer un total. Les tests de syntaxe utilisent des snippets ; aucune séance fictive n'est ajoutée au catalogue.

Compilation technique, encodage, pertinence scientifique et validation par un coach qualifié restent des preuves distinctes. Aucun test ne démontre une adaptation réellement obtenue.

# Transfert physiologique #424 → DET-ENGINE, sans fusion

PR #424 examinée en lecture seule au SHA `36a8f2f69c07248aa4e08bbc4bb322e9ae4c759d`, inchangé par rapport à V24. La PR #420 commence à `24024f6f9f7bc91b4c9a8bdce676d21625eff29b`. Les SHA distants sont archivés. Trois fichiers pertinents sont récupérés et leurs objets Git/SHA-256 effectivement recalculés; le dossier V24 de reproduction reste intact.

## Frontière typée

Le contrat `det-v25-run-cost-1` distingue `running_oxygen_cost` / `ml_O2/kg/km` de `run_economy_score` / `score_0_100`. Il exige valeur explicite, provenance versionnée, artefact vérifié, liaison aux entrées brutes, dates d'application, méthode, statut et incertitude documentée. Un intervalle individuel inconnu reste `null`, pas un intervalle inventé.

La méthode et la revendication sont liées au contenu vérifié : quantité, unité, valeur, identifiant de méthode, hash des entrées et caractère synthétique. Le seul contexte positif de V25 provient de la valeur **200 explicitement écrite dans le test synthétique #424**. Ce n'est ni une mesure individuelle ni une preuve scientifique. Le registre en permet uniquement cet usage documentaire/simulé.

Un test négatif a démontré qu'un hash de fichier seul était insuffisant : la valeur 65 pouvait être réétiquetée comme coût contre le même fichier. Ce comportement exploratoire a été rejeté. La version retenue vérifie la revendication exacte et refuse aussi une réattribution à un autre sujet, même avec un nouveau hash auto-calculé. Le log de l'échec est conservé dans `evidence/claim-binding-negative-before.txt` ou son archive sans perte.

## Trois situations exécutées

| Situation | Décision V25 | Conséquence |
|---|---|---|
| coût typé documenté, fixture distincte | typed_context_consumed_for_review | prédicteur existant : 83,2%; natif : 93,7%; sorties séparées |
| valeur incertaine | hold_typed_reference | pas de prédiction expérimentale; données et refus natifs conservés |
| coût absent | hold_typed_reference | aucun score, coût moyen ou coefficient de remplacement |
| score fourni comme coût | hold_typed_reference | erreur de dimension et de revendication explicites |

Les huit cas historiques n'ont reçu aucun coût supplémentaire. L'absence de coût bloque ce contexte Modèle C; elle n'est pas assimilée à l'absence d'une allure seuil déjà transmise. Les ancres existantes et refus restent inchangés, notamment **les sept refus course de A**. La valeur 200 du cas #424 n'est jamais transférée à A.

V25 appelle uniquement le prédicteur et le contrôle croisé existants avec ce coût explicitement typé dans une sortie séparée. Aucun fichier de #424 n'est fusionné, aucun calculateur n'est modifié, aucun seuil ou donnée VLamax/VO₂max/VMA/FTP n'est remplacé. Les bornages et libellés du modèle historique restent ceux du modèle, pas des attestations de validité individuelle. Son « observedPct » est une valeur dérivée allure/VMA, pas une mesure directe de MLSS.

Le contrat est prêt pour examen entre responsables #424/#420. Il ne raccorde aucune donnée réelle ni aucune approbation à la production. Une future valeur mesurée/estimée devrait disposer de ses propres preuves et revendications vérifiées; le registre synthétique actuel ne l'autorise pas.


Le coût 200 provient du littéral vérifié de la fixture #424, jamais de la constante de référence du modèle ou d’une moyenne utilisée pour combler une absence.

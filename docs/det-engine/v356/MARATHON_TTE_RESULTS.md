# DET V3.56 — marathon TTE: périmètre démontré, 2 novembre 2026

La CI ciblée au commit `84168ae8b98c0496d7033e39234ace29a208cd96`
a construit et validé sportivement deux nouveaux calendriers synthétiques.
Ils utilisent le véritable `constructDeterministicPlan`, sans mock du solveur
et sans changement des validateurs sportifs.

| Scénario distinct | Plafond | Cardio déclaré | TTE exact | Mésocycles Build | Verdict |
| --- | --- | --- | --- | --- | --- |
| Marathon age_group 16 semaines | 7 h/sem | 4 séances/sem, renforcement séparé | 19/49 clés = 38,78 % | 2 | Contraintes strictes satisfaites |
| Marathon age_group 40 semaines | 7 h/sem | 4 séances/sem, renforcement séparé | 53/135 clés = 39,26 % | 8 | Contraintes strictes satisfaites |

Les fréquences de récupération et d'affûtage sont modulées par les règles
existantes. Les clés faciles, sorties longues et éventuelles autres
disciplines restent dans le dénominateur: aucun drapeau clé n'a été retiré
pour améliorer le pourcentage. Zéro clé à dose source inconnue dans ces deux
preuves. Les contrôles de qualité V3 de chaque semaine de charge, récupération,
décharges mesurées d'au moins 30 %, polarisation, plafonds horaires, sources
distinctes, périodisation, spécificité et jour J restent obligatoires.

## Ce qui a rendu ces deux cas possibles

Le calendrier, la fréquence et l'ambition sont des déclarations synthétiques
distinctes, pas un changement rétroactif des scénarios historiques.
`sessionsPerWeek` désigne les séances cardio; le renforcement est séparé.
Les déclarations sont préparées avant de calculer les métadonnées dérivées.

Une seconde source de base existante, `V3P_RUN_136`, est approuvée pour cet
athlète synthétique à 51 minutes: 4 × 6 min MLSS, échauffement 10 min,
3 récupérations de 3 min non classées, retour au calme 8 min.
Cette variante reste dans les bornes V3 d'origine; le changement du nombre
de répétitions reçoit une approbation distincte. Aucune intensité, récupération
ou séance n'est inventée. Les exigences de 48 h de récupération sont conservées.

## Refus conservés et limites

Les deux anciens scénarios denses restent NO-GO, avec 0 séance TTE exacte
admissible: les candidates sont éliminées par leurs 48 h de récupération.
Les deux scénarios competitor à cinq séances cardio et deux renforts restent
NO-GO: une position de renforcement ne dispose pas d'une source admissible
avec les horaires et récupérations déclarés.

Ces résultats ne valident ni tous les marathons, ni les autres sports,
ni une prescription individuelle réelle. `sportingRelevance=not_attested`
et `humanReviewRequired=true` restent inchangés. Backend Lovable, persistance
réelle et Nolio ne sont pas testés par ces scénarios. La PR #454 reste DRAFT,
sans fusion ni déploiement.

## Reproduction et revue

Le workflow `.github/workflows/det-marathon-evidence.yml` exécute les six
témoins distincts et exige deux réussites strictes et quatre refus de sécurité.
Les tests positifs de `v356-marathon-tte-capacity.test.ts` échouent sur un NO-GO;
ils recomptent les clés et les doses sources sélectionnées.

L'artefact `marathon-source-evidence` fournit le résumé, les journaux et
`marathon-review-calendars.json`: les deux calendriers synthétiques avec
prescriptions et minutes exactes par domaine. Ils sont réservés à la revue
(`prescriptionAllowed=false`), sans accès aux athlètes réels.

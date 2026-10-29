# V2.3.1 — cinq corrections C8 — DRAFT / NO-GO

Base examinée : `9f67b70240d21f4d07ef29828a64d01b2060fadf`. Même branche expérimentale et PR #425. Les archives V2/V2.1/V2.2/V2.3 sont conservées. Aucune modification DET, équation, calibration, plafond, refus sportif ou règle de récupération ; aucune connexion Supabase, migration ou activation.

## Résultat des cinq corrections

1. La recherche de mots-clés/type laboratoire est remplacée par une provenance structurée cohérente pour la priorité lactate CAP. Les vraies références documentaires conservent leur voie ; les autres calculs restent disponibles.
2. La requalification exige le sujet courant externe et une discipline concordante ; aucune identité du cache ne se substitue au contexte affiché. A→B, B→A, absence d'identité et historique sont testés.
3. L'origine scientifique est dérivée de la méthode qualifiée, indépendamment de la nature : un modèle estimated demeure model_inference jusque dans la planification.
4. Les formes JSON invalides sont normalisées vers une vue conservatrice consultable, sans mutation historique et sans catch générique de calcul.
5. Le formulaire laboratoire accessible distingue mesure du lactate, VLamax calculée/estimée, déclaration/import et validation individuelle.

## Preuves

| Vérification | Résultat |
| --- | --- |
| Rouge indépendant sur V2.3 | **8 échecs d'assertion / 2 succès** ; cinq causes ciblées couvertes, I1/I10 doublonnent une cause et R1/R2 sont des voies héritées distinctes |
| Nouvelles régressions C8 | **45 tests**, scénarios indépendants, rendus réels, contextes de planification et sources documentaires positives |
| Périmètre V2/V2.1/V2.2/V2.3 + release | **147 tests / 17 fichiers passent**, mêmes filtres qu'annoncés |
| Run ciblé combiné final | **192 tests / 18 fichiers passent** ; ne pas additionner aux lignes précédentes |
| Protections de prescription | **412 tests / 44 fichiers passent**, périmètre identique |
| Suite globale locale stable | **406 fichiers, 3 227 tests passent**, 1 skip historique et 6 TODO inchangés |
| QA | **37 profils conservés** ; parcours indépendant : **5 133 feuilles numériques et 539 booléens identiques**, aucun champ historique absent |
| TypeScript / build | Passent après stabilisation des sources |
| ESLint | **276 ≤ 279**, zéro hausse par fichier, aucune règle supprimée ; périmètre élargi, pas comparaison directe des anciens totaux |
| Préservation | **6 fonctions, 13 initialisations numériques, 18 fichiers protégés et archives V2–V2.3 inchangés** |
| Chromium local synthétique | **2 tests passent** ; hôtes externes bloqués, aucune preuve Supabase/RLS |
| GitHub | Les **quatre checks du SHA final exact**, dont Deno, sont consignés dans le corps de #425 avec liens immuables à la clôture |

Les preuves et commandes sont dans [REPRISE](REPRISE.md). Les résultats intermédiaires et leurs échecs sont conservés ; aucun run interrompu n'est déclaré réussi. Aucun nouveau skip ou TODO n'est introduit dans les tests du dépôt.

## Différences numériques attendues

La mention négative « aucune mesure labo » faisait passer le diagnostic de 0,42 à 0,70, catégorie test_labo, confiance interne 0,95. Après correction : **0,42, estimation, confiance interne 0,50**, identiques au cas sans mention. Le résolveur et le cycle rejoignent aussi leur voie admissible ; le transfert de planification conserve 0,42 et une admissibilité individuelle non établie.

Dans ce cas synthétique, le limiteur passe **glycolytic → aerobic_engine**, et le score indicatif de préparation **41 → 61**. Cela ne constitue pas une validation physiologique ou une approbation de dose. Le [comparatif complet](BEFORE_AFTER.md) expose ces conséquences au lieu d'imposer une invariance au cas erroné. Elles ne concernent pas les 37 profils QA de référence, qui restent inchangés.

## Décision

**GO pour une nouvelle revue indépendante de C8**, avec examen du SHA, des cinq correctifs et des risques résiduels. **Ce n'est pas une clôture définitive de C8, ni un GO global ou une autorisation de fusion.** L'API V2 héritée R1 reste explicitement inventoriée ; aucun résultat vert ne la fait disparaître.

**NO-GO scientifique indépendant, NO-GO DET et NO-GO production maintenus.** Supabase réel/RLS NON VALIDÉS. #425 reste **DRAFT / NO-GO** ; aucune fusion, activation, migration, génération payante ou donnée réelle.

[Causes et correctifs](CAUSES_AND_FIXES.md) · [Avant/après](BEFORE_AFTER.md) · [Risques et critères de décision](RISKS_DECISION.md) · [Reproduction](REPRISE.md).

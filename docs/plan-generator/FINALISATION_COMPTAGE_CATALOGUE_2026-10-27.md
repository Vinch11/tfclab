# #418 — finalisation ciblée du comptage catalogue

Référence avant correction : `1651a4533d68ec03ac6f62c533a7c8c606066fe4`. Même branche et même PR brouillon. Cette reprise termine le seul défaut de comptage identifié ; elle ne rouvre pas l'audit sportif.

## Cause et correction commune

`catalogueForWeek` comparait les séances hebdomadaires requises au nombre de fiches distinctes admissibles. Le validateur final autorise pourtant les répétitions génériques, tout en reconnaissant les protocoles de test à usage unique et les plafonds explicites « Nx/semaine max ».

Les deux fonctions de lecture de ces limites sont déplacées, sans changement de règle, vers `supabase/functions/_shared/catalogueWeeklyFrequency.ts`. Le contrôle catalogue et le validateur final réutilisent cette même source :

- Fiche de test : capacité hebdomadaire 1.
- Plafond explicite : capacité plafonnée à cette valeur.
- Absence de plafond explicite : pas de limite numérique inventée ; cela ne prouve ni l'adéquation du rôle ni la sécurité d'une répétition.
- Identifiant dupliqué : une seule fiche comptée pour la capacité.
- Capacité insuffisante / sport absent : `catalogue_pool_insufficient` reste critique.
- Capacité non exclue mais fiches distinctes trop peu nombreuses : avertissement explicite `catalogue_diversity_limited`, dans les deux chemins serveur.

**Aucune répétition n'est sélectionnée ni créée par ce calcul.** Les critères d'admissibilité, le choix du catalogue, les doses, les intensités, les phases, les objectifs physiologiques, les variantes, les quotas et la récupération restent contrôlés comme auparavant. Le nouveau module est inclus dans l'empreinte de contrat et les déclarations de release sont régénérées.

## Preuves avant / après

| Vérification | Avant | Après |
|---|---|---|
| Trois tests reproduisant les faux refus de capacité/diversité | Rouges | Verts |
| Tests négatifs : usage unique, plafond explicite, doublon d'ID | Refus requis | Refus conservés |
| Les mêmes 600 entrées | Référence figée | Comparaison déterministe |
| Configurations mécaniquement refusées | 58 | Les mêmes 58 |
| Contradictions minima/plafond | 0 | 0 |
| Alertes critiques de cardinalité catalogue | 11 | 0 |
| Avertissements de diversité correspondants | Non distingués | 11, conservés comme signaux |
| Préparations déterministes sans aucun signal | 227 | 227 ; aucun GO artificiellement ajouté |

Le test de matrice compare à une empreinte figée au HEAD de référence les phases, types de semaine, ordre des limiteurs, ambitions effectives, sélection et exclusions catalogue, diagnostics de dose, layout et précontrôles hors du seul comptage corrigé. Il compare aussi les identifiants exacts des 58 configurations refusées et les 11 occurrences converties en avertissements. Les données de référence ne sont pas réécrites pour obtenir un succès.

Les 11 cas ont le même pool après retrait du plafonnement de sélection : sept occurrences base/récupération avec une fiche pour deux bricks ; trois base/charge avec deux fiches pour trois bricks ; une peak/récupération avec deux fiches pour trois bricks. Il ne s'agit ni de pools vides ni d'une preuve que leur répétition serait sportivement appropriée. Les besoins de rôle/dose demeurent distincts et non résolus par ce comptage.

Les refus par objectif sont inchangés : 5 km, 10 km, semi et marathon 12 chacun ; 70.3 3 ; Ironman 5 ; Olympic 2. Les formats continu/LCW sont distingués dans les preuves. 51 configurations ont uniquement une insuffisance de capacité quotidienne ; 7 combinent les contraintes de jours brick/CAP et/ou capacité quotidienne/structurelle.

## Validation et limites

- 222 tests offline ciblés ; les trois tests rouges sont inclus dans les cinq tests de capacité catalogue, complétés par sept tests de preuve calendaire.
- Deno : 347 tests production, 343 fonction test ; tests réels de refus de durée/intensité/intention et contrôles de plafonds conservés.
- Le test historique S12 qui attendait le faux manque de fiches distinctes est mis à jour : diversité limitée avant réservation de course, aucune alerte après ; un pool explicitement plafonné reste insuffisant sans cette réservation. Aucun contrôle de compétition n’est retiré.
- TypeScript et lint des ajouts vérifiés. Les résultats des quatre jobs CI et de reproductibilité du HEAD final sont liés dans #418.
- Matrice de 600 configurations et [classement des 58 refus et 11 alertes](global-p0-evidence/RESIDUAL_CLASSIFICATION.md) régénérés. Les bornes, candidats, plafonds et exclusions sont dans `residual-classification.json` ; `null` pour un plafond signifie absence de plafond explicite, pas tolérance physiologique démontrée.
- [Matrice objectif / ambition](global-p0-evidence/GO_NO_GO_BY_AMBITION.md) : préparation, construction complète, contrôles déterministes et revue humaine restent séparés. Aucun modèle, aucun nouveau plan inventé.

**GO technique pour fusion sous CI/reproductibilité vertes du HEAD exact ; NO-GO pour une approbation sportive ou une mise en production globale.** Les calendriers incompatibles exigent un choix coach ; les doses et rôles catalogue non couverts, les sorties complètes manquantes et la revue humaine des premières prescriptions restent nécessaires. La présente correction ne prétend pas les résoudre.

Aucun appel Gemini, accès ou modification de données athlètes, migration, changement Nolio, déploiement, publication ou fusion. #407 reste inactive.

## Reproduction

```sh
node scripts/quality/validate-planning-offline.mjs /tmp/tfcl-p418-final
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
node scripts/preproduction/plan-release-source.mjs
# La CI exécute la suite complète et les deux suites Deno.
# Le workflow preproduction-artifacts construit deux fois le même commit,
# compare les archives et teste le build Lovable standard avec/sans fichier injecté.
```

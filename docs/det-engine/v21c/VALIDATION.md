# Validation V21C

**DRAFT — NO-GO.** Les contrôles portent sur l’intégrité documentaire et les refus logiques. Ils ne constituent ni un essai clinique, ni une validation sportive individuelle, ni une revue experte humaine.

| Contrôle réellement exécuté | Preuve | Résultat |
|---|---|---|
| Vérificateur du handoff V21B | `evidence/v21b-handoff-verifier.txt` | PASS |
| Manifestes V21B et empreintes archivées | `evidence/v21b-integrity-replay.json` | 4 324 empreintes contrôlées |
| Vérificateur indépendant V21B rejoué | `evidence/v21b-independent-replay.json` | PASS, cohortes et fixtures conservées |
| Contrats de refus V21C | `evidence/unit-tests-release.txt` | 18 tests PASS |
| Audit V21C indépendant du générateur et de son filtre | `evidence/independent-validation-release.json` | PASS |
| Rejeu des comparaisons | `evidence/release-comparisons/` vs `evidence/release-replay/` | 10 fichiers identiques octet pour octet |
| Rejeu des contextes de récupération | `evidence/recovery-1/` vs `evidence/recovery-replay/` | 3 fichiers identiques octet pour octet |
| Empreintes de tous les fichiers suivis avant V21C | `baseline-files.json` et audit indépendant | 4 325 fichiers inchangés |
| Chronologies candidates / arithmétique des lignes | Audit indépendant | 96 objets égaux aux archives, totaux et repos cohérents avec leur témoin technique |

## Rejets scientifiques testés

- FTP fourni comme s’il était l’ancre VO2peak de l’étude : refus explicite, même si les indicateurs de concordance sont à tort tous vrais dans le témoin logiciel.
- Étude de course utilisée comme protocole exact cycliste : refus explicite, même dans ce témoin logiciel.
- Mesure aiguë transformée en gain chronique : refus.
- Repos final inventé, présent ou absent : refus des deux hypothèses automatiques.
- Métadonnées HTTP 200 ou résumé assimilés à un protocole intégral : refus.
- Revue secondaire assimilée à un protocole primaire exact : refus.
- Protocole contradictoire, provenance manquante, dimension non établie ou justification critique absente : refus.
- Les 102 lignes réelles passent par le filtre et ne produisent aucun rattachement exact_recipe_dose.

Le témoin tout-vrai teste uniquement le fonctionnement du contrat logiciel : il n’a ni ID de séance ni publication et n’est jamais exporté comme preuve. Même ce témoin n’approuve aucun individu et ne déclenche aucune promotion.

## Ce qui est conservé, sans réécriture ni nouvelle promesse

920 IDs, 2 425 variantes et 600 configurations historiques ; 96 chronologies sur 51 IDs ; 418 vues candidates ; 920 rendus coach ; 15 fixtures Nolio. Les dossiers coach V21C sont des annexes scientifiques séparées. Les charges, doses, intensités, récupérations, calendriers et sorties Nolio historiques sont identiques.

Les deux plans Ironman archivés conservent chacun leurs deux erreurs historiques bloquantes, leurs 129 avertissements et leur projection technique invalide. Aucun nouveau test ne les fait disparaître. Les refus et protections précédents sont préservés par les empreintes des sources et validateurs.

Les 600 plans ne sont pas reconstruits pour cette seule couche documentaire : la conservation est vérifiée, pas une nouvelle conformité sportive de 600 cas. Aucun sender Nolio ni moteur de production n’est exécuté ou modifié. Aucun appel réel Nolio ni validation d’un contrat API v2 supposé.

## Portée scientifique réelle

Huit XML récupérés, cinq textes principaux et leurs tableaux examinés entièrement : quatre primaires et une revue. Deux textes seulement par sections ; un texte récupéré non entièrement lu. Trois entrées supplémentaires restent au niveau résumé/accès incomplet. Les figures graphiques, suppléments externes et toutes les sources citées ne sont pas réputés lus automatiquement.

Sur 102 lignes, 24 concluent seulement que la recette entière n’est pas celle du protocole comparé ; 78 restent inconclues. Ces résultats ne sont ni 24 séances invalidées ni 78 doses validées. Les deux essais dont le contraste est précisément décrit n’établissent aucune dose individuelle TFCLab. Le conflit de récupération du texte basse cadence reste ouvert.

Les six écarts d’identité/date/type sont dans un registre correctif indépendant ; les trois collisions d’IDs du relais sont explicites. Aucun original n’est remplacé. Aucune référence n’est attribuée uniquement par le titre. Aucun rattachement exact ni approbation humaine ajouté.

## Essais techniques et transparence

Une première invocation du générateur a rencontré une erreur de syntaxe (`elseNone`), corrigée avant génération. Aucun échec sportif n’a été effacé ni seuil assoupli. Les comparaisons initiales et le premier rapport indépendant restent archivés. La seconde version renforce les refus sémantiques d’ancre et de discipline ; son résultat scientifique est identique : zéro rattachement de dose exacte.

Les scripts V21C n’importent aucun sender, client Nolio, service payant ou moteur de prescription. Les vérifications plus larges de l’application ne sont pas présentées comme exécutées. La clôture conserve l’état, les empreintes finales et la référence de publication Git ; aucune relance automatique.

Une révision éditoriale du registre remplace un champ « population » insuffisamment documenté par une inconnue explicite pour les deux articles sans texte intégral. Les artefacts précédents sont conservés ; aucun résultat de prescription ne change. Les dossiers de comparaison `final-*` sont des versions intermédiaires, `release-*` est la version retenue.

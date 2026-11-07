# V2.3 — qualification des références — DRAFT / NO-GO

Référence examinée : `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`. Nouvelle qualification sur la même branche expérimentale #425. Aucun changement DET, aucune donnée réelle ou connexion Supabase, migration, fusion ou activation.

## Résultat

C8 est reproduit, puis corrigé dans la chaîne et les consommateurs identifiés. Catégorie interne, stockage, méthode/nature, score heuristique et incertitude rapportée sont distincts. Une VLamax dérivée de lactate n'est jamais qualifiée comme mesure directe du flux glycolytique. Historiques et valeurs restent consultables ; labels/flags de cache ne font pas autorité.

| Vérification | Résultat / portée |
| --- | --- |
| Rouge sur référence immuable | **3 échecs métier attendus**, `C8-pinned-reference-red.txt` |
| Clôture ciblée V2/V2.1/V2.2/V2.3 + release | **147 tests passent / 17 fichiers** ; `publication-tests.txt` |
| Suite complète locale | **405 fichiers, 3 180 tests passent**, 1 ancien skip et 6 TODO ; les ultimes protections de cache/handoff sont également couvertes par le run ciblé et la CI publiée |
| QA | **37 entrées inchangées, zéro différence numérique ou décisionnelle** ; différences de présentation/qualification explicites |
| Navigateur synthétique | **2 tests Chromium passent**, rechargement local et discipline incompatible ; pas une preuve de persistance réseau |
| TypeScript / build | Passent ; garde de release normal et déclaration non attestée |
| Modèles / règles | Fonctions et constantes comparées ; 11 fichiers de cœur identiques, 1 chaîne de détail changée ; aucune équation ni dose modifiée |
| CI GitHub | Les quatre checks du dernier SHA sont consignés à clôture dans le corps de #425, avec liens immuables ; pas substitution des anciens résultats |

Les compteurs se recouvrent et ne doivent pas être additionnés.

## Verdicts séparés

| Domaine | Verdict |
| --- | --- |
| **Technique relatif à C8** | **GO pour réexamen technique ciblé de C8**, sous réserve de revue du SHA et des preuves : les surfaces identifiées ne déduisent plus une mesure scientifique du stockage ou de la catégorie interne. Ceci n'autorise pas la fusion et ne certifie pas toute l'application. |
| **Scientifique** | **NO-GO pour revendiquer une validation indépendante** : archives primaires N=44/N=15/Modèle C et portée individuelle toujours non démontrées. Les modèles ne sont pas déclarés invalides par défaut. |
| **Production** | **NO-GO** : persistance Supabase réelle et RLS NON VALIDÉES ; aucune autorisation distincte de connexion ou déploiement. |
| **DET** | **NO-GO** : intégration, preuve de source et admissibilité/dose individuelles non approuvées. Aucun fichier ou refus DET modifié. |

#425 reste **DRAFT / NO-GO global** jusqu'à décision explicite. Aucune dose individuelle approuvée.

## Décisions restantes

Revue humaine du contrat et du diff C8 ; validation indépendante des sources physiologiques lorsqu'elles existent ; environnement Supabase synthétique explicitement autorisé pour le protocole réseau préparé ; validation séparée du raccord DET. Aucun de ces travaux n'est lancé automatiquement.

Une provenance documentaire cohérente reste déclarée et non vérifiée indépendamment. Les notes restent limitées à 2 000 caractères. Les champs et noms hérités des moteurs restent des conventions de calcul ; les intégrateurs doivent utiliser la qualification, pas interpréter `test_labo`, un verrou ou 0,95 comme preuve. Les règles de calibration et de prescription restent celles du système existant.

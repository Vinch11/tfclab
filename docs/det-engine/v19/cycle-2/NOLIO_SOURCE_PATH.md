# Compatibilité Nolio : trois lectures distinctes

DRAFT — NO-GO. Toutes les sorties ci-dessous sont des fixtures synthétiques. Aucun appel à Nolio, serveur Edge lancé, donnée athlète ou changement de production.

| Contrôle | Résultat | Limite |
| --- | --- | --- |
| Miroir local historique du payload | 831 représentations texte ; 13 structurées de source et 2 candidates | Ne prouve pas le passage dans le normaliseur actuel ou une acceptation distante |
| Fonctions pures du chemin d’envoi actuel | 15 fixtures : 0 identité numérique stricte ; 11 avec les seuls arrondis documentés ; 4 pertes de cible refusées | Arrondis de sérialisation séparés des changements de sens ; aucune adaptation de dose |
| Sérialiseur expérimental du format public consulté | 15 fixtures, cibles numériques et consignes conservées exactement | Pas intégré au moteur actuel ; pas présenté comme compatible avec son normaliseur ; aucune acceptation distante testée |

Le module expérimental extrait par AST TypeScript huit fonctions et deux constantes explicitement autorisées depuis le fichier de production inchangé. Il les exécute dans un contexte sans imports, `Deno`, `fetch`, identifiants ou client réseau. Il n’importe jamais le module Edge. Les empreintes de la source et des déclarations sélectionnées sont conservées.

Les quatre fixtures `D_RUN_REGEN`, `D_IM_BRICK_REGEN`, `D_MAR_REGEN` et `D_TR_RECUP_ACTIVE` portent une borne basse d’allure à zéro dans la convention synthétique de domaine. Le normaliseur actuel transforme alors la cible `pace` en `no_target`. Aucun plancher positif n’est inventé pour faire passer ce cas. Les onze autres fixtures subissent seulement le passage aux watts entiers ou à trois décimales en m/s. Le résultat littéral strict reste refusé ; l’accord avec cette précision machine est une lecture supplémentaire explicite, pas une preuve de sécurité physiologique.

Le formateur actuel est également testé sur une projection déclarée des 920 sources (`structure`, objectif source et détails vides). Dans ce scénario précis, **121 descriptions omettent au moins une partie source** ; 799 conservent toutes les parties après normalisation des seules puces et espaces. Cela n’établit pas que 121 exports réels ont perdu des données : les entrées réelles peuvent différer. Il retrouve un texte `avoid` dans 47 descriptions ; le complément n’est pas qualifié automatiquement de perte de contre-indication, car ces textes incluent aussi des mentions non restrictives. Les restrictions restent intégralement disponibles dans le catalogue et le rendu coach.

Parmi les 831 anciennes descriptions complètes de revue, 815 tiennent dans la politique locale de 4 000 caractères du formateur ; 16 la dépassent. La page publique de création consultée **n’indique pas cette limite** : il ne s’agit pas d’un maximum distant démontré. Aucune description n’est tronquée dans le nouvel adaptateur.

La documentation publique GitHub consultée le 29 octobre 2026 confirme les secondes entières, les cibles d’allure en m/s, `comment` et la borne maximale obligatoire pour une cible numérique. Le sérialiseur expérimental copie donc `notes` exactement vers `comment`, conserve les bornes et durées sans arrondir, et retire seulement le marqueur redondant `target_unit: W` déjà porté par le type `power`. Il refuse les champs non représentés, conflits de consignes, temps fractionnaires, récupération inconnue, occurrences multiples et modalités non démontrées. Ces fixtures ne créent aucun nouveau workout admissible.

Les tables publiques décrivent aussi `exercise` et `superset`, mais l’énumération ultérieure n’est pas cohérente avec ces tables ; les indications RPE diffèrent également. Cela reste une piste technique, sans export force ou faux contrat Nolio v2. Aucun numéro de version officiel n’est déduit de ces pages.

Preuves : [étude des fonctions sources](evidence/nolio-path-2/summary.json), [provenance d’extraction](evidence/nolio-path-2/provenance.json), [audit indépendant](evidence/nolio-path-independent.json), [documentation consultée et empreintes](evidence/public-nolio-documents.json), [fixtures publiques](evidence/public-format-final/fixtures.jsonl.gz), [audit de conservation indépendant](evidence/public-format-current-independent.json), [rejeu identique](evidence/supplemental-reproducibility.json).

Le premier calcul exploratoire comptait deux fausses omissions de texte dues aux puces. Son artefact est conservé dans `nolio-path-1` ; le comparateur corrigé ne retire aucune instruction, quantité ou restriction.

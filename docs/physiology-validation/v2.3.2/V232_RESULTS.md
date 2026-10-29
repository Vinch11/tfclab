# V2.3.2 — dernier blocage C8 — DRAFT / NO-GO global

Base : `429a84c1c35255843251a478ef3f48ab0dd907c6`. Périmètre : `/diagnostic/cohort-vlamax-cap`, ses présentations et son CSV ; garde statique R1 en test uniquement. Aucun changement de formule, poids, calibration, statistique numérique, règle de prescription ou fichier DET.

## Correctif

La saisie 0,70 / sprint 85 m sans athlète ni preuve n'est plus présentée comme « Mesuré (labo) ». L'aperçu affiche **« VLamax de référence déclarée — provenance scientifique non vérifiée »**, avec **0.7**, prédiction **0.51** et écart **-0.19 inchangés**. Sélectionner un athlète ne qualifie pas automatiquement cette référence.

La page, les champs, le tableau et les indicateurs distinguent qualité déclarée, provenance documentaire et accord statistique. Les populations historiques `lab` / `field` et leurs poids restent identiques, sous les intitulés **Qualité déclarée 4–5 / 2–3**. Les commentaires d'accord ou d'ajustement deviennent descriptifs ; aucune validation indépendante ou correction automatique n'est affirmée.

Le CSV est explicitement **V2**, avec nouveau nom de fichier et colonne schema_version. Les anciens noms qui supposaient une mesure sont remplacés ; le tier historique est conservé sous un nom indiquant qu'il n'est pas une méthode scientifique. Les valeurs et groupes restent identiques. Les notes sont préservées sans perte, par échappement CSV. La rupture de contrat pour les lecteurs V1 est documentée dans [CSV_V2_CONTRACT](CSV_V2_CONTRACT.md).

Les références historiques restent consultables sans migration. Une preuve structurée cohérente peut documenter une VLamax calculée/estimée, jamais une mesure directe du flux glycolytique. Une qualité déclarée, un ID, une note libre ou un scalar ne fournissent aucune méthode. Sujet, date, unité et valeur incompatibles restent inconnus au tableau et à l'export.

## Preuves de clôture locale

| Contrôle | Résultat |
| --- | --- |
| Rouge au SHA de référence | **1 échec d'assertion attendu** sur le rendu réel ; aucune erreur d'import |
| Nouvelles vérifications | **16 tests / 2 fichiers passent** : aperçu, sélection réelle, tableau, RMSE, CSV, sources cohérentes/inconnues, incertitude rapportée et garde R1 |
| V2.3.1 | **45 tests passent**, périmètre conservé |
| Historiques / release | **147 tests / 17 fichiers passent**, mêmes filtres |
| Protections | **412 tests / 44 fichiers passent**, mêmes filtres |
| Suite globale au calme | **408 fichiers, 3 243 tests passent**, 1 skip historique et 6 TODO inchangés |
| QA | **37 profils inchangés** ; comparaison indépendante de **5 133 nombres et 539 booléens**, aucun champ historique absent |
| Cohorte / CSV | **15 entrées et AnchorReport complet exactement égaux** à la capture indépendante de référence ; groupes 6 / 6 / 12, 3 exclus ; toutes les colonnes numériques et tiers mappés identiques |
| Préservation | **21 fichiers protégés identiques octet par octet**, dont statistique/calibration CAP, estimateur et API R1 ; archives V2 à V2.3.1 inchangées |
| TypeScript / build | Passent ; déclaration source normalement rafraîchie, attestations de déploiement false |
| ESLint | **276 ≤ 279**, aucune hausse par fichier ; nouveaux fichiers sans erreur, règles inchangées |
| GitHub | SHA final et **quatre checks** consignés dans le corps de #425 avec liens immuables, à la clôture |

Les compteurs se recouvrent. Les échecs initiaux restent archivés. Le premier run global sous charge a dépassé 5 secondes dans trois tests FIT ; le même fichier passe isolément (11 tests), puis la suite globale passe sans changement des assertions ou délais. Aucune ancienne fixture QA n'a été recapturée.

## R1 et limites

La revue précédente a établi l'absence de R1 dans les chunks frontend exécutables. Son code et ses exports ne sont pas modifiés. Un test de frontière résout désormais les imports/barrels/namespaces et les dépendances transitives des chemins diagnostic/planification, avec contrôle positif du symbole hérité et distinction du moteur courant. Il refuse une réintroduction runtime détectable dans ce périmètre. Ce n'est pas une refonte ni une preuve générale contre toute réflexion JavaScript future.

Le CSV V2 requiert une adaptation explicite des lecteurs V1. Les anciennes nomenclatures internes et anciens exports restent historiques ; ils ne constituent pas une provenance scientifique. Le contexte documentaire n'authentifie pas le rapport externe ; les flags de validité et de dose individuelles restent false. Le rendu React et le téléchargement local sont testés avec contexte/client synthétiques, pas avec une session Supabase réelle.

## Décision

**GO pour une dernière vérification de clôture C8 ; clôture technique ciblée proposée**, à confirmer sur le SHA final et ses preuves. Une CI verte ne vaut pas GO global ni validation physiologique indépendante.

**NO-GO scientifique indépendant, NO-GO DET et NO-GO production maintenus.** Persistance Supabase réelle/RLS NON VALIDÉES. PR #425 **DRAFT / NO-GO global**, sans fusion, migration, connexion réelle, activation ou dose individuelle approuvée. Aucun chantier supplémentaire lancé.

[Avant/après](BEFORE_AFTER.md) · [Contrat CSV V2](CSV_V2_CONTRACT.md) · [Reproduction](REPRISE.md) · Preuves sous `evidence/`, dont le diff runtime compressé.

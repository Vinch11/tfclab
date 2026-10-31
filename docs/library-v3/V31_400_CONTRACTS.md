# TFCLab — V3.1 : contrat complet pour 400/400 séances

**Périmètre : PR #446 → base #444, sans modification de DET-ENGINE (#445), de production, de Nolio ou de Supabase.**

## Ce qui était incomplet dans la V3 originale

Les 400 recettes avaient des blocs, une intention, un domaine physiologique, des phases, un niveau, des contre-indications et une récupération minimale. Mais elles ne possédaient pas toutes un **contrat structuré** permettant au moteur de répondre sans interprétation :
1. quelle capacité la séance cible et quels ancrages personnels sont nécessaires pour chaque bloc ;
2. comment obtenir une **durée de séance exécutable**, ou pourquoi cette durée reste inconnue ;
3. quels examens individuels de prérequis, de charge, de risque et de récupération précèdent la sélection.

Cela ne satisfaisait pas le mandat initial. Il fallait corriger **les 400**, pas seulement ajouter un exemple.

## Contenu effectivement ajouté à toutes les fiches

Les cinq JSON de `scripts/library-v3` contiennent maintenant, pour **400 ID stables**, le champ obligatoire `prescriptionContract` :
- `physiology` : intention d'origine, domaine source, capacité entraînée, obligation de calibration individuelle et distinction **cible d'entraînement ≠ limiteur diagnostiqué chez cet athlète** ;
- `intensity.segments` : tous les chemins des **1 577 segments** originaux, rôle, domaine TFCL et **clé explicite de repère individuel**. Aucun pourcentage ou RPE personnel n'est inventé ;
- `duration` : calcul en secondes **sans arrondi**, liste des entrées nécessaires, refus si elles manquent ;
- `safety` : récupération minimale source, vérification des prérequis, contre-indications, consignes d'arrêt et revue coach obligatoire ;
- `eligibility` : `candidate`, sélection automatique interdite, validation scientifique spécifique non attestée.

L'audit `auditV3Catalogue` refuse désormais les contrats absents ou désynchronisés du contenu de la fiche. Ce contrôle est appliqué aux **400**, pas seulement au pilote.

## Résolution de dose : trois cas NON interchangeables

| Discipline | Fiches | Calcul de durée | Entrée obligatoire avant confirmation |
|---|---:|---|---|
| Vélo | 100 | Somme exacte des durées des blocs, répétitions et récupérations déclarées | Profil d'intensité personnalisé avant prescription |
| Course | 100 | Idem | Profil d'intensité personnalisé avant prescription |
| Natation | 100 | Mètres × allures de chaque domaine / 100 + repos explicites | Allures coach/athlète en s/100 m par domaine |
| Renforcement | 100 | Séries, répétitions, récupérations + temps d'exécution et transitions **confirmés** | Charges/RPE par segment, temps par répétition confirmés, installation et transitions |

**Ne jamais utiliser le `secPerRep` estimé de la source comme durée certaine.** Les 100 fiches de renfo conservent leur modèle de répétitions mais requièrent désormais des entrées observées/confirmées si le moteur veut une durée exacte. Un temps conditionnel ne signifie pas une séance « vide » : il signifie que le modèle sait précisément ce qu'il ne peut pas mesurer sans le coach.

`resolvePrescription.ts` résout les intensités natation/cyclisme/course/renfo depuis les repères effectivement fournis. Pour vélo/course, il utilise la doctrine TFCL existante et signale les plages **dérivées du seuil**, sans les présenter comme des seuils directement mesurés. Les 400 fiches conservent leur statut candidat.

## Invariants et critères de GO

1. 400/400 fiches possèdent un contrat exhaustif, 400/400 sont validées par l'audit source, chaque segment est référencé.
2. Un athlète sans FTP/LT1/MLSS/CSS ou charge/RPE pertinente ne reçoit **aucune valeur inventée**.
3. Les durées natation/force ne deviennent confirmées **que si toutes les entrées obligatoires sont fournies** ; pas de conversion d'une estimation en mesure, pas d'arrondi silencieux pour DET-ENGINE.
4. 400/400 recettes doivent être testées à la fois sans et avec des entrées synthétiques explicites ; tests négatifs sur contrat modifié et données manquantes.
5. Sélection admissible par DET uniquement après accord individuel, limites de fréquence, objectifs, récupération, progression et interactions interséances. **Ce chantier n'active pas cette sélection**.
6. Validation scientifique/session spécifique séparée ; ne pas requalifier les 400 candidates en 400 séances validées par publication générale.
7. CI, TypeScript, tests de non-régression et workbench vérifiés avant fusion de la PR #446. Pas de déploiement sans recette #445 et attestation.

**Verdict tant que la CI finale et le raccordement DET ne sont pas démontrés : DRAFT / NO-GO.**

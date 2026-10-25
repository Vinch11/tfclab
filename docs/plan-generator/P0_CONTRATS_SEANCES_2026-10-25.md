# Mission B — contrats de prescription et état courant

Base indépendante : `d74657faacd74a7b321d7c8f2edc04939f67e196`, squash de
#404 après sécurisation et quatre checks verts. Branche
`fix/p0-session-contracts-20261025`. Aucune fusion autorisée de cette mission.

## Causes corrigées et résultats sur les cas du PDF

| Incident | Cause démontrée dans le pipeline | Correction | Régression déterministe |
|---|---|---|---|
| Perte de durée/custom | Adaptateur JSON→Parsed omet les champs | Copie conditionnelle de durationMin/custom/variantKey, pas de valeur pour le legacy absent | Échec sur ancien adaptateur, succès corrigé ; course finale brick et ses propriétés inchangées |
| Édition invisible à la sauvegarde | Viewer possède un plan local distinct du parent | Mode contrôlé pour la page qui sauvegarde ; remplacements remontés, nouvel ID/custom/zones cohérents avec la fiche choisie ; durée conservée sans clamp opportuniste | Test UI échoue avec ancien viewer ; export et callback sauvegarde utilisent les mêmes semaines après remplacement |
| S1, brique aérobie ↔ race-pace Build/Peak | ID autorisé n'implique pas phase/intensité compatibles | Contrat initial partagé, erreur phase et dilution d'intensité ; aucune suppression/réécriture de la séance | Fiche réelle B_BRICK_RACE_PACE_SHORT_703, prescription PDF90+30 Z1–Z2 |
| S4, Sweet Spot Fondation ↔ Build | Catalogue de chunk peut couvrir plusieurs phases et relâcher la couverture | Filtre strict initial, table d'IDs admissibles par semaine ; le schéma vérifie la phase canonique de la semaine | V3_BIKE_SST_PROGRESSIF refusée en base et admissible en build |
| S6, brique Z2 ↔ Build/Peak intense | Phase seule/durée seule ne garantissent pas la finalité de la prescription | Même contrat initial, contrôle des zones et filtre de récupération ; lecture des blocs brick quand Main absent | BR_HALF_V1_PRO, vélo80+CAP25 Z1–Z2 ; exclue en récupération sans modification de fiche |
| S10, CAP95 ↔ fiche100–150 | Contrôle structuré peut diverger du texte puis durée perdue dans Parsed | Contrôle initial durationMin ↔ fiche ; durée structurée prévaut pour les volumes, jamais remplacée par médiane catalogue | A_RUN_DURABILITY_LONG à95min reste95 et déclenche catalogue_duration |

Ce sont des ruptures de contrat reproductibles. Sans payload original,
configuration, pool et réponse brute du run PDF, elles ne permettent pas
d'attribuer historiquement chaque ID au modèle plutôt qu'à une mutation.
Les nombres de candidats et écarts du run ne sont pas reconstruits.

## Contrat initial et contrôle final

Le contrôle partagé réutilise :
- normalisation sport et règles `evaluateRepairSportingEquivalence` pour
  phase, objectif et charge en récupération/affûtage ;
- classificateur d'intention existant, déplacé sans modification de ses
  motifs vers `_shared/intentEvidence.ts` pour servir client et Deno ;
- logique de dilution des zones et comparaison des répétitions de B10
  (écart d'ordre de grandeur sur répétitions ET durée, facteur3), appliquée
  uniquement lorsque les preuves nécessaires sont explicites ;
- identité course partagée de #404 : une compétition officielle est custom,
  sans fiche d'entraînement. Une simulation reste un entraînement.

Le schéma JSON reçoit un contrat **par semaine** : une fiche admissible à
une autre semaine du chunk ne devient pas admissible ici. Une phase fournie
par le modèle ne remplace pas la phase canonique. La période multi-objectifs
et les overrides de régénération existants continuent de déterminer la
phase ; l'objectif du segment déclaré est utilisé pour l'admissibilité.

Le prompt reçoit la table semaine→IDs, et les lignes catalogue sans aucune
semaine admissible sont retirées du prompt principal/régénération. Les
métadonnées et dumps d'origine restent disponibles aux diagnostics/réparateurs
sans élargissement de leurs protections. Une référence hors pool compatible
vide n'est plus acceptée par le fallback « n'importe quelle chaîne ».
Un entraînement custom reste représentable, sans prétendre correspondre à
une fiche absente ; l'insuffisance du catalogue reste signalée explicitement.

Les refus initiaux sont des erreurs du schéma avec chemins de séance et
codes techniques. Le mécanisme de retry déjà présent reste inchangé ; tous
les transports des tests sont mockés. Les séances brutes ne sont pas
silencieusement modifiées pour faire passer le contrôle.

Le même contrat est recalculé après mutations et à la sauvegarde. Les
incompatibilités démontrées sont non dérogeables via
`catalogue_prescription_incompatible`. Les protections précédentes restent
présentes ; aucun quota n'est rempli en insérant une séance supplémentaire.
Un pool insuffisant est signalé avec semaine, nombre admissible et sports
manquants, sans suppression de contrainte de phase pour atteindre un floor.

## État courant, affichage, PDF et sauvegarde

La page reste propriétaire du plan éditable. Le viewer contrôlé ne conserve
pas une seconde prescription après modification. Les remplacements gardent
semaine/jour/phase/durée et mettent à jour le nouvel ID et ses zones ; ils
n'imposent pas une durée médiane pour rendre l'association acceptable. Si la
fiche choisie ne convient pas à la durée conservée, le contrôle le signale.

Les contrôles B5/B11/B12/B13 de sauvegarde lisent désormais le plan courant,
pas l'ancien `mergedPlan` du hook. Quotas et diagnostics d'IDs sont actualisés
sur l'état édité, lorsque les contraintes/pools historiques sont disponibles.
La vue de contrôle est en lecture seule : aucune propriété manquante du
legacy n'est ajoutée pour satisfaire le typage des anciens contrôles.

L'enrichissement UI/PDF reçoit aussi le catalogId structuré. La fiche est
présentée comme **référence catalogue**. En cas d'écart ou de vérification
incomplète, l'UI conserve le texte prescrit et ajoute un avertissement ; le
PDF ajoute aussi un avertissement à la fiche. Les volumes utilisent la durée
prescrite explicite ; les anciens fallback d'estimation restent limités aux
séances dépourvues de durée structurée et ne remplissent pas ce champ.

Le test de synchronisation compare les semaines transmises à l'export et
à la sauvegarde après une vraie action de remplacement. Le titre du PDF
continue d'être mis en forme par le renderer, sans modifier les séances.
Aucune vraie écriture Supabase ni requête Nolio dans ce test.

## Variantes et preuves insuffisantes

`variantKey` est optionnel, conservé au transport. Les textes génériques
« utile » / « ok » ne constituent pas une permission de réduire arbitrairement
la durée ou les zones. Les variantes numériques simples explicitement
sélectionnées sont vérifiables (ex. Z2 40–70min), avec contrôle de leur objectif
lorsque celui-ci est disponible ; elles n'élargissent jamais les phases.

Les variantes complexes en prose, les structures non explicites et les
anciennes séances sans durée/zones restent marquées **non vérifiées**.
Elles ne reçoivent pas de nouvelles valeurs pour fabriquer une équivalence.
Un retour initial JSON non vérifiable produit un diagnostic critique ; une
absence historique de preuve est distinguée d'une incompatibilité démontrée.
Les contrôles ne prétendent pas certifier une finalité physiologique à partir
d'un mot vague : seules les preuves explicites sont comparées.

## Fichiers modifiés (groupes)

- Conservation/volume : `aiPlanParser.ts`, `jsonPlanToParsedPlan.ts`,
  `mergePlanChunks.ts` et miroirs serveur, `weeklyVolumeEstimator.ts`.
- État et rendu : `AIPlanViewer.tsx`, `AITrainingPlanPage.tsx`,
  `aiPlanPDFExport.ts`.
- Contrat partagé : `_shared/sessionCatalogueContract.ts`,
  `_shared/intentEvidence.ts`, extension optionnelle de
  `_shared/repairSportingEquivalence.ts`, `intentFamily.ts`,
  `repairCatalogMetadata.ts`, `sessionCatalogueValidation.ts`.
- Entrée JSON/catalogue : `useAITrainingPlan.ts`, `planSchema.ts` frontend et
  deux miroirs, `jsonPlanHandler.ts` des deux fonctions.
- Contrôles : `qa/checkB13.ts` (type commun), `qa/finalValidation.ts` ; tests
  existants B13/B14 et gate mis à jour pour le nouveau refus explicite.
- Tests nouveaux : `sessionFieldsPreservation`, `sessionCatalogueContract`,
  `AIPlanViewer.currentPlan`, deux miroirs `planSchema.catalogueContract` ;
  garde du bloc catalogue régénération actualisée pour le filtrage explicite.

Aucune métadonnée de phase/durée/zone des fiches réelles n'a été élargie.
Aucun package ou migration ajouté. Pas de modification de Nolio API v2.

## Tests avant/après et limites

- Adaptateur original : **1 échec /1 succès** ; correction conserve les champs
  et l'absence historique. Test supplémentaire :95min reste95 avec fiche100–150.
- Viewer original temporairement rétabli : **1 échec**, édition non remontée ;
  version corrigée : même état sportif pour diagnostic/PDF/sauvegarde.
- Schéma serveur original temporairement rétabli : **2 échecs /0 succès**
  sur les deux premiers tests dédiés (exécution sans type-check pour rejouer
  le comportement runtime antérieur, qui n'avait pas l'option de contrat).
  Fichiers corrigés restaurés immédiatement après chaque comparaison.
- Cas PDF sur métadonnées réelles, variantes simples/prose, structure,
  récupération et pools insuffisants : tests déterministes, aucune requête.
- Décodage JSON : fetch entièrement mocké, premier retour incompatible refusé,
  second retour valide distinct accepté ; aucune mutation silencieuse du premier.
- Régression complète frontend/Deno/TypeScript et quatre checks CI : résultats
  exacts suivis dans la description de la PR. Les anciens contrôles sportifs,
  bricks, quotas et protection de quota plein restent dans ces suites.

Un test vert ne prouve pas la qualité sportive générale des32 semaines.
Les huit erreurs de type connues des deux index legacy décrites dans #404
ne sont pas corrigées dans cette mission, ni présentées comme résolues.

## Risques et GO/NO-GO

**NO-GO pour une prochaine génération réelle dans l'état publié actuel.**
La mission B n'est ni fusionnée ni déployée. Aucun frontend/serveur déployé
n'est attesté comme exécutant ces contrats. Un nouveau run payant ne doit
pas être utilisé pour découvrir s'ils étaient actifs.

Avant une décision GO séparée : revue de cette PR, cohérence des versions
frontend/deux fonctions/catalogue, conservation d'un export diagnostique
local même si sauvegarde refusée, et examen des variantes/pools nécessaires
au cas cible. Aucun déploiement implicite n'est proposé par cette PR.

Risques : sélection plus étroite et pools insuffisants plus visibles ; rejets
JSON supplémentaires là où l'ancien schéma laissait passer un ID incohérent ;
incertitude des anciennes données ; variantes complexes encore non exécutables ;
intention par titre et répétitions ne décrivent pas toute la physiologie ;
un ID sélectionné manuellement peut rester hors du pool de génération
historique, signalé par B5 plutôt que masqué. Aucune garantie générale sur
nutrition, récupération, équilibre de charge ou pertinence du calendrier.

Aucun appel Gemini, nouvelle génération réelle, déploiement, migration,
écriture de données athlètes, envoi Nolio ou fusion de cette mission.

# Contrat de réintégration des justifications

DRAFT — NO-GO. Préparation documentaire uniquement ; aucune validation scientifique automatique, dose ou règle modifiée.

[JSON Schema 2020-12](EVIDENCE_INTEGRATION_SCHEMA.json), version `tfcl-evidence-attachment-1.0.0`. Le format transporte une annotation documentaire détachée. Il ne modifie ni catalogue, prescription, intensité, filtre, validateur ni statut d’admissibilité. Les 920 lignes du mapping ont une liste `evidenceAttachments` vide ; l’absence de preuve reste visible.

## Liaison et version

`legacyId` et `sourceEffectiveSha256` lient la fiche exacte. `familyId` doit exister dans son routage candidat ; sinon une revue de classification est requise. Une variante demande le couple `variantGoal` / `variantSourceHash` existant. Une revendication de dose exacte exige `recipeContentSha256` égal à l’empreinte de la structure canonique source et `doseAndRecoveryCompared=true`. Cette version ne lie pas silencieusement les overlays V19 : leur liaison devra être versionnée séparément. Le hash décrit un contenu, pas une recette exécutable ni une dose validée. Les empreintes de structure utilisent SHA-256 du JSON UTF-8 compact, ordre des clés source conservé, caractères Unicode non échappés.

## Séparer preuve et décision

`claim.origin` distingue publication, principe de coaching documenté, convention TFCLab et hypothèse candidate. `claim.scope` distingue contexte familial, mécanisme d’une séance et dose exacte. `finding` peut être non évalué, négatif, mixte ou limité. `evidenceAssessment` conserve type d’étude, cadre et jugement de certitude, argumentaire et intervenant ; ces champs restent nuls sans examen. Le niveau de preuve n’est jamais calculé par le titre ou la famille.

Une variante textuelle ne reçoit pas silencieusement l’empreinte de la recette de base : les revendications de dose exacte par variante sont refusées tant qu’un contrat de recette instanciée versionnée n’est pas disponible. [Exemple brouillon sans référence ni preuve](EXAMPLE_UNREVIEWED_PACKET.json).

`verification.status` distingue simple mention, métadonnées vérifiées, résumé et texte intégral examinés. Une vérification exige URL de récupération, SHA de réponse, date et intervenant. Les limitations d’accès sont explicites. `applicability` exige population, intervention, comparateur, critères, limites, données individuelles et directivité déclarée. Les champs inconnus restent null/listes vides au stade brouillon. Une revue terminée exige intervenant et justification. Le validateur contrôle seulement la forme, la provenance et les liaisons ; il ne vérifie pas la vérité scientifique de ces déclarations.

## Procédure de retour

1. Retourner une ligne JSON par revendication, avec `packetId` stable et contexte d’accès ; inclure résultats négatifs et incertitudes.
2. Contrôler schéma, ID, empreinte de source, famille et variante avec `scripts/det-engine/v21a-evidence.py::validate_packet`.
3. Dédupliquer par `packetId` et contenu identique ; rejeter un même ID avec contenu différent. Une révision explicite utilise un nouvel ID et `supersedesPacketId`. Le validateur unitaire ne constitue pas encore un importeur persistant.
4. Faire examiner la justesse documentaire et le transfert par l’intervenant compétent. Un principe Lorang n’est pas un essai de dose.
5. Stocker les annotations dans une couche expérimentale, puis seulement proposer une intégration sportive distincte et revue. Aucune promotion automatique n’est autorisée.

`prescriptionImpact=none_research_annotation_only`, `automaticPromotion=false`, `individualAthleteApproved=false` sont imposés. Aucun champ d’export Nolio, API, donnée réelle ou règle de production n’est déclenché. Les tests refusent identifiant inconnu, hash périmé, variante erronée, famille non reliée, recette inconnue, fausse provenance absente et promotion automatique.

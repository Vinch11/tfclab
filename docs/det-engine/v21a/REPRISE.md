# Reprise après V21A

PR #420 : **DRAFT — NO-GO**. Baseline `f295567769af8edc558a24313fd2faa2756cc498`. Le [registre](state.json) fixe un seul budget de 60 minutes / 10 unités, sans renouvellement ni relance automatique.

Le chantier V21A prépare l’audit ; il ne conduit pas une justification superficielle des 920 fiches. Sources, prescriptions, doses, production, Nolio et validateurs historiques sont inchangés. Les campagnes V19/V20 restent clôturées.

## Dossier à transmettre

1. [Inventaire](SCIENTIFIC_FAMILY_INVENTORY.md) et [920 lignes de mapping](WORKOUT_FAMILY_MAPPING.jsonl), contenant sources intégrales, variantes et extraits de classement.
2. [Registre des références](EXISTING_REFERENCE_REGISTER.md), [475 occurrences](REFERENCE_OCCURRENCES.jsonl) et [provenances documentaires](evidence/accepted/existing-reference-contexts.json).
3. [62 questions](RESEARCH_QUESTIONS.json), [consignes de recherche](SCIENTIFIC_RESEARCH_QUESTIONS.md) et [cinq dossiers](TOP_5_RESEARCH_DOSSIERS.md), avec leurs [données structurées](TOP_5_RESEARCH_DOSSIERS.json).
4. [Schéma de retour](EVIDENCE_INTEGRATION_SCHEMA.json), [mode d’emploi](EVIDENCE_INTEGRATION_SCHEMA.md), [exemple expressément non revu](EXAMPLE_UNREVIEWED_PACKET.json).

Les [418 candidats éditoriaux](evidence/handoff/EDITORIAL_CANDIDATE_INDEX.jsonl) gardent leur revue V20 intacte, séparée des sources. La [ventilation d’usage par objectif, ambition et niveau](evidence/handoff/FAMILY_USAGE_BY_OBJECTIVE.csv) permet de vérifier les priorités sans reconstruire les classifications.

Les cinq priorités sont déterminées par l’usage historique des cibles déclarées, pas par une preuve de supériorité ni la seule cohorte Ironman. Les plans V2, V14 et dossiers V7 restent stratifiés. Les compteurs ne doivent pas être additionnés entre modèles ou interprétés comme un échantillon d’athlètes.

## Prochain travail indépendant

Effectuer la recherche bibliographique par mécanisme, documenter les requêtes, accès, protocoles, populations, comparateurs, critères, résultats contradictoires et limites. Examiner séparément chaque transfert vers une fiche et sa dose. Retourner les annotations avec leur source et leur empreinte ; aucune référence familiale ne doit être héritée automatiquement par toutes ses séances.

Les deux intentions non rattachées et les citations non balisées restent à clarifier. Une dose future, un titre d’auteur ou une chronologie techniquement complète ne constituent pas une preuve d’adaptation. Les conditions V14–V20 restent ouvertes.

Après ce retour, une nouvelle mission bornée pourra préparer une couche d’annotations expérimentales, contrôler leur liaison, faire examiner leur pertinence et proposer les changements sportifs nécessaires. Cette mission future n’est pas lancée ni planifiée automatiquement. Tout changement de dose ou de méthodologie demande sa propre justification et revue ; aucune promotion n’est autorisée par le schéma.

## Reproductibilité et conservation

Les données acceptées sont dans `evidence/accepted/` ; `evidence/replay/` est identique. Les tentatives antérieures sont conservées, leurs grandes lignes JSONL compressées sans perte et indexées. Les [tests](VALIDATION.md), [empreintes initiales](baseline-files.json), [sources du dossier](source-checksums.json) et [preuve finale](final-integrity.json) permettent une revue indépendante.

La clôture et le temps effectif sont enregistrés dans `state.json`. Aucun quota précis de crédits n’est exposé par l’environnement ; aucune consommation exacte n’est prétendue. Aucun appel payant, fusion, déploiement, migration ou accès aux données réelles n’est effectué.

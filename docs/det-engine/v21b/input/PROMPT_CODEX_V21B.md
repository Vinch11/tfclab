# CODEX — TFCLab V21B : intégration documentaire de la recherche indépendante

**Repo** `Vinch11/tfclab` — **branche** `experiment/det-engine` — **PR** #420 DRAFT / NO-GO — **base vérifiée** V21A `36fa6b248f7a3ac98e505ce88705beedd8987d74` (vérifier que la branche n'a pas bougé avant d'écrire).

## Entrée fournie

Le ZIP V21B est un corpus de **recherche scientifique de contexte**, pas 920 citations attachées, ni 920 séances validées. Le lire intégralement : `README_POUR_CODEX.md`, `DOSSIER_SCIENTIFIQUE_COMPLET.md`, `references_verifiees.json`, `mecanismes_15_familles.json`, `assertions_familiales_non_liees.jsonl`, `garde_fous_integration.json`, `REPONSES_62_QUESTIONS_V21A.json`, `PRINCIPES_COACHING_LORANG.md` et `protocoles_et_doses_etudies.csv`, `REPONSES_62_QUESTIONS_V21A.json`, `JOURNAL_VERIFICATION_SOURCES.md` et `GUIDE_REVUE_FICHE_PAR_FICHE.md`.

## Mission bornée

Durée ≤60 minutes, ≤10 unités, pas d'API payante et aucune relance automatique. Créer V21B dans un nouveau dossier expérimental sans modifier V21A et V2-V20. Conserver tous les IDs, variantes, SHA, sources et 600 références. PR #420 reste DRAFT — NO-GO. Aucun merge, déploiement, Nolio réel, athlete réel ni production.

1. Exécuter `python verify_handoff.py`, puis vérifier l'intégrité du ZIP (`manifest_sha256.json`) et du dépôt, l'état de branche et le schéma exact `docs/det-engine/v21a/EVIDENCE_INTEGRATION_SCHEMA.json`.
2. Importer les 15 familles et références comme **registre indépendant sans liaison individuelle**. Ne pas écrire un `evidenceAttachment` sur 920 fiches simplement parce qu'un rattachement de famille existe.
3. Associer méthodiquement les 920 IDs au **contexte de revue**, en gardant explicitement les deux intentions non rattachées; les 15 familles ne sont pas mutuellement exclusives. Générer une matrice 920 × familles et preuves candidates, jamais des validations.
4. Pour une fiche ciblée, comparer source effective, structure exacte, restrictions, bibliographie, cible et dose. N'écrire un packet V21A valide qu'après la lecture des empreintes réelles, revue PICOS, présence de l'URL+preuve d'accès vérifiable et justification de portée. Si l'empreinte de réponse manque, re-vérifier réellement; **ne jamais fabriquer de SHA, DOI, année ou extrait**.
5. Émettre en priorité des **candidats de liaison** sur les 51 IDs/96 variantes V19; laisser `dose_not_individually_verified` partout où la preuve exacte manque. Aucune annotation `exact_recipe_dose` sans recette et protocole réellement comparés; laisser les autres catégories `family_context`/`unassessed`.
6. Tester les conflits scientifiques : seuil ≠ FTP ≠ CP ≠ MLSS, VLamax estimée non laboratoire, durabilité non déduite d'un test frais, CSS non extrapolée entre nages, n/n−1 non résolu, posture 4×15 ≠ 6×10, nutrition/chaleur/hydratation sans preuve de tolérance.
7. Conserver le rendu coach: section facultative « preuve et limites » lisible et concise, distincte des consignes sportives. L'intégration Nolio n'exporte pas la bibliographie.
8. Livrer revue par famille, registre des citations réellement inspectées, rejets, études manquantes, niveaux de preuve réels, état des 920 IDs et comparaison des 96 recettes candidates. Validation indépendante et rejeux.

## Tests d'acceptation indispensables

- `920` IDs historiques inchangés, `2425` variantes inchangées, `600` références archivées intactes.
- Le schéma V21A rejette source/hash/variante inconnus; ne pas masquer l'absence d'empreinte.
- Zéro liaison par seul titre; zéro `exact_recipe_dose` automatique.
- Les 2 IDs non rattachés restent `unresolved`.
- Zéro promotion automatique, aucune dose/intensité/récupération source modifiée.
- Les contrôles de sécurité P0 restent visibles; les anciens blocages de plans Ironman restent bloquants.
- Aucune perte d'information utile pour coach et Nolio.

## Sorties

`docs/det-engine/v21b/README.md`, `SOURCE_VERIFICATION_LOG.md`, `FAMILY_KNOWLEDGE_BASE.json`, `WORKOUT_RESEARCH_ROUTING.jsonl`, `EVIDENCE_ATTACHMENT_CANDIDATES.jsonl` (uniquement si vrais SHA + vérification admissible; sinon vide), `REJECTION_AND_GAPS.csv`, `COACH_EXPLANATIONS.md`, `TEST_RESULTS.md`, `REPRISE.md`.

**En conclusion : c'est une intégration scientifique documentaire candidate, pas un feu vert de prescription.**

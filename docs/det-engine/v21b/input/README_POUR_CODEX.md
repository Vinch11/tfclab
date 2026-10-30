# TFCLab V21B — Livrable indépendant prêt à remettre à Codex

Date : 2026-10-29 | Dépôt : `Vinch11/tfclab` | PR #420 DRAFT/NO-GO | Base V21A : `36fa6b24`.

**Contenu : 46 références, 15 familles scientifiques, 26 affirmations de contexte candidates, 13 comparaisons de protocoles/doses accessibles.** Une couverture des 15 thèmes ne signifie pas une vérification de toutes les publications existantes, ni une validation individuelle des 920 séances.

## Fichiers

- `DOSSIER_SCIENTIFIQUE_COMPLET.md` : conclusions documentées, dossier détaillé pour chacune des 15 familles, contradictions, limites, risques.
- `references_verifiees.json` et `.csv` : registre des publications avec PMID, DOI si vérifié, résumé, accès et limites.
- `mecanismes_15_familles.json` : base machine lisible indépendante du catalogue.
- `assertions_familiales_non_liees.jsonl` : hypothèses de contexte, **NON directement utilisables comme `evidenceAttachments` V21A**.
- `protocoles_et_doses_etudies.csv` : paramètres explicitement visibles dans les études résumées.
- `garde_fous_integration.json` : contrats et interdictions de promotion.
- `REPONSES_62_QUESTIONS_V21A.json` et `.csv` : matrice de toutes les questions V21A (résultats et lacunes, **aucune dose déclarée validée**).
- `PROMPT_CODEX_V21B.md` : instructions de transfert direct à Codex.
- `JOURNAL_VERIFICATION_SOURCES.md` : sous-ensemble des notices directement revérifiées et limites de la recherche.
- `manifest_sha256.json` : empreintes des fichiers du dossier hors manifest et ZIP.

## Mode d'emploi

1. Après extraction, exécuter `python verify_handoff.py` et vérifier le message PASS.
2. Joindre le ZIP complet à la session Codex (ou mettre les fichiers dans un espace accessible au dépôt).
3. Envoyer `PROMPT_CODEX_V21B.md` **après** l'attachement. Le prompt n'invente pas les données ni ne réclame 920 validations.
4. Garder la PR en DRAFT et vérifier les décisions humaines P0 avant toute promotion.

## Transparence documentaire

Sources inspectées au niveau notices PubMed/abstracts publics lors de ce travail; nous n'avons pas téléchargé et systématiquement relu les textes intégrals des 46 publications. Aucun `responseSha256` de la réponse distante n'est revendiqué. Codex doit vérifier à nouveau et calculer les vrais hashes avant d'intégrer une annotation V21A exigeant cette preuve.

**Aucun fichier du dépôt GitHub n'a été modifié pendant cette recherche.**

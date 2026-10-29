# C8 — reproduction et correctif

Référence immuable : `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`.

Un profil synthétique fournit VLamax vélo **0,42**, sans source/méthode labo. Le résultat historique donne pourtant `VLamax (mesurée labo)`, catégorie `test_labo`, confiance interne **0,95**, marge **0,02** ; le Dashboard convertit son stockage en `MEASURED`.

Les trois tests ciblés, exécutés dans un worktree détaché de cette référence, échouent par assertions métier : label labo indu, promotion du ScoreEnvelope et affichage staff non qualifié. [Preuve rouge](evidence/C8-pinned-reference-red.txt). La première tentative de test de carte utilisait l'alias d'objectif `IM` au lieu de `Ironman` ; cette fixture a été corrigée et les trois cas ont été rejoués sur la référence. Aucune erreur de chargement ni objectif invalide ne sert de preuve finale.

Après correction : valeur 0,42, score 0,95, marge 0,02 et catégorie interne identiques ; qualification inconnue, aucun statut MEASURED scientifique, marge explicitement heuristique. Les références LAB ou mentions « labo » seules restent inconnues. Les preuves documentaires cohérentes distinguent lactate dérivé, terrain, modèle et déclaration coach.

Le correctif est une couche de qualification et de présentation. Il ne retire ni donnée historique, ni verrou, ni modèle. Les anciens labels en cache sont neutralisés à l'affichage, sans migration. Le contrôle des paramètres de handoff évite qu'une revendication brute « direct_measurement » soit promue sans provenance.

Les nouvelles assertions couvrent aussi sujet/date/unité/quantité/discipline incompatibles, incertitude rapportée distincte, références liées aux tests, rechargement et conservation de l'objet historique. Les anciens oracles de hash de présentation et le cas positif V2.1 sont traités explicitement dans [NUMERIC_NON_REGRESSION.md](NUMERIC_NON_REGRESSION.md).

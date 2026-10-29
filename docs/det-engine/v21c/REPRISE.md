# Reprise après V21C

**DRAFT — NO-GO. Aucun moteur ni séance de production modifié.** Baseline V21B : `1953d108ce50b2962b87bf5b77974235727e2954`. Branche autorisée : `experiment/det-engine` ; PR #420 doit rester brouillon.

## État scientifique

51 dossiers source/candidats et 96 chronologies conservées. 12 IDs (22 candidats distincts) ont une comparaison avec un texte primaire entièrement examiné ; 39 IDs n’ont pas ici de protocole primaire intégral ciblé adéquat. 102 lignes : 24 non-concordances du protocole entier, 78 inconclues. Aucun nouveau rattachement exact_recipe_dose ni approbation individuelle. Revues sportives humaines : 0.

5 textes principaux examinés, dont 4 primaires, sur 8 XML récupérés. Distinguer le texte lu d’un protocole de dose entièrement déterminé : basse cadence reste contradictoire sur le repos ; fitting ne prescrit pas une séance d’entraînement. Les deux brouillons contextuels V21B ne sont pas promus.

416 propositions de conventions de récupération (208 IDs), 466 opérations ; voir la partition sur deux axes et les signatures disjointes. Aucune présence/absence de repos final décidée. Les 418 vues restent intactes.

## Artefacts à utiliser

- `evidence/release-comparisons/` : version retenue des comparaisons et dossiers JSON complets ; `evidence/release-replay/` : rejeu byte-identique.
- `evidence/accepted/`, `evidence/replay/`, `evidence/comparisons-1/` : essais techniques antérieurs conservés, pas de nouvelles cohortes à additionner.
- `evidence/retrieval-1` à `retrieval-4` : réponses brutes compressées, URL, horodatages et empreintes réelles. Un accès refusé n’a pas d’empreinte inventée.
- `evidence/recovery-1/`, `evidence/recovery-replay/` : classification et rejeu.
- `coach-packets/` : 51 annexes de revue, distinctes des rendus et prescriptions.
- `evidence/unit-tests-release.txt`, `evidence/independent-validation-release.json` : contrôles actuels.
- `baseline-files.json`, `state.json`, `CYCLE_LOG.jsonl`, `final-integrity.json` : conservation, budget et clôture.

## Prochaine priorité scientifique

1. Obtenir légalement les méthodes complètes du travail cycliste Seiler PMID 21812820 et du fitting PMID 27490817, puis traiter les séances fréquentes D_TAPER_RUN_OPENER, D_TAPER_SHAKEOUT, B_703_RUN_THRESHOLD et COGGAN_BIKE_SST_EXTENDED. L’usage archivé est synthétique, pas une preuve d’efficacité.
2. Distinguer la question de récupération active/passive de celle du dernier repos ; résoudre au cas documenté les contradictions n/n−1, sans transposer une revue à toutes les fiches.
3. Pour chaque revendication de dose exacte, comparer ancre, sport, répétitions, travail, repos, séance complète, fréquence et population avec justification critique. Une non-concordance ne prouve pas une contre-indication.
4. Revue qualifiée des doses et de leur place dans le calendrier à partir des capacités individuelles, historique et récupération réellement observée. Aucune donnée fournie ici n’autorise une prescription personnelle ni une amélioration future supposée.
5. Le texte natation n’est pas obtenu intégralement ; les données de CSS et les nages restent séparées. L’essai basse cadence ne remplace pas une preuve de musculation. Les résultats/discussion de la transition 40 km/10 km restent à lire avant toute conclusion nouvelle.

## Reprise technique idempotente

Vérifier d’abord la branche distante et le dernier commit. Ne pas relancer les unités V2–V21C clôturées, ne pas réinitialiser ce budget. Les 10 unités de cette session sont bornées par `state.json` ; aucun renouvellement ni tâche future automatique. Une autre session exige un nouveau mandat/registre.

La vérification en lecture peut utiliser `python scripts/det-engine/v21c-independent.py /tmp/v21c-independent-recheck.json` (chemin de sortie neuf) et `python scripts/det-engine/v21c-tests.py`. Les générateurs sont protégés par le budget et l’état de session ; ils refusent un dossier de sortie déjà existant. Ne pas contourner leur clôture.

Préserver tous les artefacts antérieurs, notamment les 600 cas, 920 IDs, 2 425 variantes, 96 candidats, 418 vues, 15 fixtures et erreurs Ironman. Les futurs ajouts restent expérimentaux. Pas de fusion, déploiement, données réelles, migration, API payante ou écriture Nolio. Aucun quota exact de crédits n’est visible dans cet environnement ; aucune consommation payante supplémentaire n’a été engagée.

## Décisions humaines nécessaires

La revue indépendante doit juger la transférabilité des protocoles et clarifier les conventions sources qui modifient la dose. L’admissibilité individuelle nécessite des preuves et un coach qualifié ; une réponse favorable de la littérature n’y suffit pas. Aucun arbitrage de production ou d’intégration n’est sollicité : le statut reste NO-GO.

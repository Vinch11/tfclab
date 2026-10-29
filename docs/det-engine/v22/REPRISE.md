# Reprise après V22

**DRAFT — NO-GO.** Baseline : `0f5079d93c03fb5d3c488ea11a3ba3253460068a`, branche `experiment/det-engine`, PR #420 brouillon. Vérifier le head distant avant toute écriture suivante.

## État fonctionnel

Les trois cas sont immuables dans `inputs.json` et `evidence/baseline-1/registered-full-inputs.json`. La correction de transport ne change pas leurs valeurs. B possède un candidat conditionnel4 semaines ; A garde7 refus course, C26 refus de références. Trois calendriers structurels existent, aucun bloc approuvé. A/B :465/485/505/285min ; C455/465/480/265. Aucun gain physiologique acquis.

## Version retenue et preuves

- `evidence/validation-1/build/prospective/results.json.gz` : sorties complètes et comparaison au préfixe initial ; `replay` est identique.
- `evidence/validation-1/build/allocator/results.json.gz` : extension opt-in du premier microcycle et défaut V11 restant visible en S2.
- `evidence/baseline-1/results.json` : premier passage intact, utilisé comme golden de non-régression par défaut.
- `evidence/independent-after-archive.json`, `evidence/validation-1/commands.json`, `regression-tests.txt` : contrôles exécutés.
- `evidence/result-archives.json` : compression sans perte des snapshots intermédiaires, SHA des octets d’origine ; ne pas les additionner comme de nouveaux profils ou plans.
- `comparison.json`, `weekly-summary.json`, `prescription-traces.jsonl`, `FOUR_WEEK_PLANS.md` : lecture synthétique/coach.
- `state.json`, `CYCLE_LOG.jsonl`, `final-integrity.json` : registre borné et clôture.

## Reprise idempotente

Ce mandat dispose d’un budget unique60min/10 unités, sans renouvellement ni relance automatique. Ne pas relancer une unité clôturée ou les unités V2–V21C. Un nouveau cycle exige son propre mandat et registre. Les sorties du contrôleur doivent être neuves, les entrées et le code sont épinglés ; toute régression est conservée.

Un audit en lecture peut se rejouer avec `PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v22-independent.py /tmp/v22-recheck.json` sur un chemin neuf. Les tests V22 se lancent sans variables TFCL_DET_V22_* pour ne pas réécrire d’artefacts. Le contrôleur de génération refuse une session clôturée. Les snapshots compressés conservent exactement les octets d’origine.

## Prochaine unité utile

1. Résolution explicite des variantes d’objectif des sources sélectionnées et de leur recette temporelle, sans les promouvoir scientifiquement.
2. Contrat candidat de validation limité à un bloc pré-compétitif : conserver les quatre erreurs brutes actuelles en parallèle et ne pas ajouter de course fictive.
3. Preuves individuelles de récupération, d’exécution nage/force/posture et vérification du seuil course A. Sans elles, maintien/refus ; jamais un gain de capacité déduit du calendrier.
4. Allocation différenciée des doses selon les besoins réellement documentés : non démontrée entre A/B dans V22. Ne pas inventer une équation VO₂/TTE→minutes.

Archives V2–V21C,600 configurations,920 IDs/2425 variantes,96 chronologies,418 vues et15 fixtures préservées. Seules trois fonctions/types expérimentaux existants sont étendus avec défaut conservé et tests ; aucun moteur/validateur de production modifié. Aucune fusion, migration, donnée réelle, API payante ou écriture Nolio. Le quota exact de crédits n’est pas exposé ; aucun coût externe engagé.

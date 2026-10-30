# Vérification des sources et journal de provenance

DRAFT — NO-GO. Couche documentaire expérimentale ; aucune prescription, dose, récupération, intensité ou règle historique modifiée.

## Intégrité du corpus

[Manifest fourni](input/manifest_sha256.json) : 15 fichiers référencés plus le manifeste lui-même, tous intacts. [Preuve d’entrée](evidence/input-integrity.json) et [sortie du vérificateur fourni](evidence/verify-handoff.txt). Les CSV des 46 références et 62 questions ont été comparés champ par champ aux JSON correspondants, sans écart. Tous les documents, protocoles, assertions et consignes ont été lus. L’original est conservé ; les corrections documentaires ci-dessous ne le réécrivent pas.

## Vérification publique réellement effectuée

Une requête gratuite Europe PMC a récupéré les notices MED des 46 PMID demandés. [Provenance](evidence/public-source-retrieval/provenance.json) : URL exacte, date réelle, statut HTTP, longueur et SHA-256 calculé sur les octets reçus. [Réponse exacte compressée](evidence/public-source-retrieval/response.json.gz). Le même SHA couvre le lot réel de 46 notices, localisées par PMID ; ce n’est pas un hash inventé pour chaque article.

Les 46 identités ont été examinées ; 45 résumés sont présents et ont été lus. HEAT-02 est un éditorial sans résumé récupéré : vérification de métadonnées uniquement. Aucun texte intégral, protocole supplémentaire ou niveau de certitude n’est prétendu examiné. Le registre distingue la déclaration fournie, l’identité récupérée et le statut local. Une notice revérifiée ne rend pas automatiquement exacte chaque paraphrase ou dose du dossier.

## Écarts conservés

| Référence | Écart | Traitement |
|---|---|---|
| THR-01 | `WRONG_PROVIDED_AUTHORS` | The provided Faude/Kindermann/Meyer attribution does not match the retrieved PMID: Beneke, Leithäuser, Ochentel. Preserve the original; use retrieved identity only in a separately reviewed citation. |
| VLA-03 | `UNSUPPORTED_PROVIDED_YEAR` | Provided 2024 is neither online 2020 nor journal 2021 in the retrieved record. Quarantine the supplied citation year, without altering the handoff. |
| SWIM-01 | `ONLINE_PRINT_YEAR_DISTINCTION` | Provided 2024 corresponds to electronic publication; journal issue is 2025. Both dates retained, no article substitution. |
| SWIM-03 | `ONLINE_PRINT_YEAR_DISTINCTION` | Provided 2021 corresponds to electronic publication; journal issue is 2023. Both dates retained. |
| IM-03 | `ONLINE_PRINT_YEAR_DISTINCTION` | Provided 2016 corresponds to electronic publication; journal issue is 2017. Both dates retained. |
| IM-03 | `HANDOFF_JOURNAL_STUDY_TYPE_CONFLICT` | JOURNAL_VERIFICATION_SOURCES.md calls IM-03 an Ironman scoping review, whereas the reference JSON and retrieved article describe an acute bike-fit comfort/fatigue/pain study. The scoping review in this corpus is IM-02; do not silently relabel the original journal row. |

THR-01 correspond à Beneke, Leithäuser et Ochentel, non à l’attribution fournie. VLA-03 : publication électronique 2020, numéro de revue 2021 ; 2024 n’est confirmé par aucun de ces champs. SWIM-01, SWIM-03 et IM-03 ont des dates en ligne et imprimées différentes, conservées sans les confondre avec un article différent. La ligne IM-03 du journal fourni est mise en quarantaine pour son type d’étude erroné ; le JSON fourni et la notice décrivent bien l’étude aiguë de position.

Les paquets candidats utilisent exclusivement l’identité récupérée, avec ses véritables DOI/année/auteurs et l’empreinte de réponse. La différence IM-03 2016 en ligne / 2017 imprimé reste visible dans le registre. Aucun DOI manquant n’est reconstruit depuis un titre.

## Réserves de lecture des protocoles

- **STR-01** : Abstract supports the component participant counts and 6–40 weeks / 1–4 sessions weekly. The supplied 38-study count is not independently confirmed from this abstract alone.
- **STR-02** : Different modalities and speeds have different results; no significant economy improvement for submaximal or isometric methods in this abstract. Do not extend heavy-load effects to every strength entry.
- **TEC-01** : 40 randomized, 22 completed; no significant between-group economy difference. Observed mechanics and measured economy remain distinct.
- **TEC-02** : Recall with cueing reduced impact variables; retention was not statistically established. Do not state that six-month autonomous learning was demonstrated.
- **VO2-02** : 86 articles / 239 acute protocols, long intervals at least 2 min; active/passive recovery did not affect acute time near VO2max. Contrast with REC-02 mechanical outcomes, without erasing either result.
- **THR-01** : CP in this abstract also abbreviates constant-power tests, not necessarily critical power. Preserve terminology context; do not join abbreviations as identical constructs.
- **THR-02** : The authors report possible reconciliation under strict measurement criteria, not that all operational FTP, LT2, CP and MLSS estimates are interchangeable.
- **TRAIL-02** : Six alternating 5-min trials, -15% versus level, two occasions three weeks apart; do not infer an individual D− ceiling or an unambiguous total downhill exposure absent explicit reconstruction.
- **SWIM-01** : 11 male national-level collegiate front-crawl swimmers; CV from 200/400 m tests. Recovery periods are reported, but the abstract does not resolve every last-rest convention of a TFCL recipe.
- **BRICK-02** : 20 km bike at 80/85/90% FTP then 5 km maximal run. Even the authors' broad 90% recommendation must not become a 180 km Ironman target.
- **IM-01** : Race correlations are not a causal training allocation. The abstract's wording about Sprint predictors is internally uneven; no dose or discipline quota follows.
- **IM-03** : 20 cyclists, 45 min at 50% individual peak aerobic power in three positions. Not a 4×15 versus 6×10 aero-bout trial and not individual postural tolerance.
- **HEAT-02** : Metadata only: editorial with no abstract in the retrieved record; no protocol or outcome extracted.
- **NUT-05** : High carbohydrate doses concern specific trained contexts, oxidation measures and a review including practitioner insight; no universal personal dose or acquired GI tolerance.

Les principes Lorang restent dans leur [document distinct](input/PRINCIPES_COACHING_LORANG.md). Les shownotes ne sont pas récupérées à nouveau pendant V21B ; leur accès est une déclaration du corpus et un contexte V8 hérité. Aucune preuve de dose n’en est déduite.

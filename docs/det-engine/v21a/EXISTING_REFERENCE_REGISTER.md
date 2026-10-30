# Registre des références existantes

DRAFT — NO-GO. Préparation documentaire uniquement ; aucune validation scientifique automatique, dose ou règle modifiée.

## Périmètre reproductible

Le registre distingue les 380 occurrences dans les champs historiques (174 marqueurs bibliographiques ou numériques candidats, 206 attributions d’auteur/méthode) et 95 occurrences dans les commentaires des 31 fichiers du bundle V16. Ce sont 475 **mentions candidates**, pas 475 publications. Une année, une « référence allure » ou une attribution peut être non bibliographique. Aucun auteur nommé n’est automatiquement relié à un article. [Occurrences intégrales](REFERENCE_OCCURRENCES.jsonl), avec chemin, pointeur ou ligne.

Les détecteurs recherchent URL, DOI, PMID, marqueur Réf/référence, années et un lexique déclaré d’auteurs. Des citations non balisées peuvent échapper au détecteur : le mapping conserve tous les textes bruts/effectifs, et le [bundle intégral](../v16/evidence/source-bundle.json.gz) reste la base de vérification. Ce registre est exhaustif pour les occurrences de ces règles, sans prétendre reconnaître toute allusion scientifique implicite.

## Sources documentaires dont l’accès a déjà été vérifié

16 enregistrements de provenance, 14 URL distinctes : V8 (12), V17 (2), V19 (2). Les doublons Van Hooren/Peake et Maunder restent distincts par accès. « Vérifié » signifie seulement le périmètre d’accès indiqué ci-dessous et dans les métadonnées ; aucune nouvelle lecture bibliographique n’est effectuée en V21A. Aucun texte intégral non consulté n’est présenté comme lu.

| ID du registre | Source / année | Périmètre d’accès hérité | Limites d’application |
|---|---|---|---|
| V8:R25 | [Rosenblat et al. 2025](https://pubmed.ncbi.nlm.nih.gov/39888556/) | abstract or edited shownotes; see limits | Abstract inspected; IPD unavailable here; subgroup findings not universal prescriptions; sparse women and no demonstrated ultra transfer. |
| V8:O24 | [Oliveira et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38717713/) | abstract or edited shownotes; see limits | Abstract and search excerpts; full text blocked by recaptcha; heterogeneous protocols and outcomes, no direct TFCL percentage validation. |
| V8:W23 | [Wang et al. 2023](https://pubmed.ncbi.nlm.nih.gov/37163550/) | abstract or edited shownotes; see limits | Not universal dose thresholds or support for arbitrary J−1/J−2 intervals; fatigue response and individual readiness not measured in these fixtures. |
| V8:B20 | [Bontemps et al. 2020](https://pubmed.ncbi.nlm.nih.gov/33037592/) | abstract or edited shownotes; see limits | No validated individual D− ceiling, no inference of acquired tolerance from planned sessions; narrative evidence. |
| V8:I20 | [Impellizzeri et al. 2020](https://pubmed.ncbi.nlm.nih.gov/32502973/) | abstract or edited shownotes; see limits | Does not establish a replacement progression ceiling, nor prove any observed increase unsafe; abstract/search metadata checked. |
| V8:M21 | [Maunder et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33886100/) | abstract or edited shownotes; see limits | Fresh TTE or a fresh threshold alone is not a direct measurement of durability; no validated training progression algorithm. |
| V8:S25 | [Sablain et al. 2025](https://pubmed.ncbi.nlm.nih.gov/40338332/) | abstract or edited shownotes; see limits | Short laboratory protocol, no training efficacy trial, no validation of TFCL field-inverse estimates or trail transfer. |
| V8:LL24 | [Llanos-Lagos et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38165636/) | abstract or edited shownotes; see limits | Low/moderate certainty by comparison; not proof that any strength catalogue entry treats an unmeasured economy deficit or requires a blanket VO2 prohibition. |
| V8:L175 | [Dan Lorang, TTS175 shownotes 2019](https://scientifictriathlon.com/tts175/) | abstract or edited shownotes; see limits | 0:56,10:41,58:50,1:12:12,1:21:45; shownotes not independently checked against full audio. Elite schedules are not age-group minima. |
| V8:L417 | [Dan Lorang, TTS417 shownotes 2023](https://scientifictriathlon.com/tts417/) | abstract or edited shownotes; see limits | 08:21,10:54,14:09,1:12:23; elite observations, no universal weekly HIT count; no VLamax term found on inspected page. |
| V8:L220 | [220 Triathlon interview with Lorang 2020](https://www.220triathlon.com/training/long-distance/frodeno-and-haugs-coach-dan-lorang-on-how-to-train-for-ironman) | abstract or edited shownotes; see limits | Attributed coach/athlete statements, not controlled evidence; no exact transferable quotas or proof of a unique optimal phase sequence. |
| V8:E26 | [Esteve-Lanao et al. 2026](https://doi.org/10.1177/17479541261468168) | publisher abstract inspected | Small trial, abstract only/paywalled full text; cannot validate individual response selection or transfer to Ironman/trail. |
| V17:PMID29663142 | [Van Hooren B, Peake JM. 2018](https://pubmed.ncbi.nlm.nih.gov/29663142/) | Résumé public lu, texte intégral non lu | Résumé lu ; texte intégral non lu ; dose et transfert non établis. |
| V17:PMID33886100 | [Maunder E, Seiler S, Mildenhall MJ, Kilding AE, Plews DJ. 2021](https://pubmed.ncbi.nlm.nih.gov/33886100/) | Résumé public lu, texte intégral non lu | Résumé lu ; texte intégral non lu ; dose et transfert non établis. |
| V19:PMID29663142 | [Van Hooren B, Peake JM. 2018](https://pubmed.ncbi.nlm.nih.gov/29663142/) | Résumé public lu, texte intégral non lu | Ne valide pas une récupération finale de cinq minutes dans ce protocole, une meilleure tolérance aux efforts précédents ou un gain individuel. |
| V19:PMID28332114 | [Jeukendrup AE. 2017](https://pubmed.ncbi.nlm.nih.gov/28332114/) | Résumé public lu, texte intégral non lu | Le résumé ne valide ni un départ universel à 60g/h, ni 100–120g/h, ni un ratio obligatoire unique, ni une adaptation acquise après huit semaines. |

[Registre JSON et dossiers originaux](evidence/accepted/existing-reference-contexts.json). [Contexte V19 intégral](evidence/accepted/v19-documentary-context-preserved.json). Les trois annotations documentaires V17 (deux récupérations et une endurance longue) sont conservées dans `inheritedQualification`, avec leurs limites. La correspondance exacte entre liens bibliographiques individuels source et références V8 était nulle en V17 ; V21A n’ajoute aucune attribution individuelle.

## Attributions à traiter séparément

L175/L417/L220 sont des entretiens ou articles de coaching, dont les shownotes/textes édités ont été consultés ; l’audio intégral n’est pas déclaré vérifié. Les principes de contextualisation, stimulus assimilable, feedback et réévaluation ne prouvent pas les quotas TFCLab, les ratios sportifs, une dose précise ou une progression universelle. Voir [méthode et limites V8](../v8/LORANG_METHODOLOGY.md).

Les mentions Burke, Périard, Impey, Van Proeyen, Volek/Phinney, Chatard, Debraux, Daniels et autres restent des pistes à identifier et vérifier. Les chiffres revendiqués dans leur voisinage ne sont pas validés par l’existence du nom. Priorités sensibles conservées : nutrition faible disponibilité, ratio glucidique obligatoire, chaleur/sauna, tolérance aéro, récupération, et unité « +500 mL/h de sommeil » du LCW. Aucune quantité de remplacement proposée.

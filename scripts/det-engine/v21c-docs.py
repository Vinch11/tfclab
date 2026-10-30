"""Documentary views only. Never modifies workout renders, exports, doses or historical artifacts."""
import collections,csv,gzip,json,pathlib,shutil,importlib.util
spec=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21c-session.py'));session=importlib.util.module_from_spec(spec);spec.loader.exec_module(session);session.guard()
R=pathlib.Path('docs/det-engine/v21c');A=R/'evidence/release-comparisons'
def load(p):return json.loads(pathlib.Path(p).read_text())
def rows(p):return[json.loads(l)for l in pathlib.Path(p).read_text().splitlines()if l]
def write(n,t):(R/n).write_text(t.strip()+'\n')
def cell(x):return str(x).replace('|','\\|').replace('\n',' ')
s=load(A/'summary.json');ds=rows(A/'source-id-dossiers.jsonl');cs=rows(A/'candidate-comparisons.jsonl');reg=load(A/'study-registry.json')
for n in ['PRIMARY_STUDY_REGISTER.csv','EXACT_PROTOCOL_COMPARISONS.csv']:shutil.copyfile(A/n,R/n)
write('README.md',f'''# DET-ENGINE V21C — protocoles primaires et dossiers de comparaison

**DRAFT — NO-GO.** Baseline confirmée avant écriture : `1953d108ce50b2962b87bf5b77974235727e2954`, branche `experiment/det-engine`, PR [#420](https://github.com/Vinch11/tfclab/pull/420). Recherche documentaire Codex du 29 octobre 2026 ; aucune revue sportive humaine ni approbation individuelle.

V21C conserve la cohorte et confronte des recettes à des interventions réellement décrites. Aucun changement de séance, de dose, de rendu existant, de moteur, de validateur ou d’export. La note indépendante reste une entrée documentaire et ne vaut pas avis sportif.

| Mesure | Résultat exact et portée |
|---|---:|
| Textes intégraux récupérés en XML | 8 |
| Textes dont corps principal et tableaux XML ont été examinés entièrement | 5 : 4 études primaires + 1 revue systématique |
| Textes examinés seulement par sections | 2 |
| Texte récupéré sans lecture intégrale revendiquée | 1 |
| Entrées au registre, y compris résumés et accès refusés | 11 |
| IDs avec dossier source/candidats | 51 |
| IDs confrontés à au moins un protocole primaire intégral | 12 |
| IDs sans protocole primaire ciblé intégral adéquat ici | 39 |
| Chronologies conservées | 96 |
| Candidats distincts confrontés à un protocole primaire intégral | {s['distinctCandidatesWithPrimaryComparison']} |
| Lignes de comparaison candidat × étude, ou constat d’absence | 102 |
| Comparaisons concluant à une non-concordance du protocole entier | 24 |
| Comparaisons inconclues faute de protocole intégral/ciblé | 78 |
| Liens de comparaison primaire avec provenance vérifiée | 24 ; ne sont pas des rattachements de dose |
| Nouveaux rattachements exact_recipe_dose admissibles | 0 |
| Doses individuelles approuvées | 0 ; les 96 restent dose_not_individually_verified |
| Revues sportives humaines | 0 |

Un constat de non-concordance ne prouve ni danger individuel ni inefficacité de la séance. Il refuse seulement de présenter cette étude comme preuve de la recette exacte. Les deux brouillons contextuels V21B restent inchangés et ne sont pas promus. Aucun nouvel élargissement des 920 routes scientifiques.

## Lecture des livrables

- [Registre des études](PRIMARY_STUDY_REGISTER.csv) : identité issue des réponses récupérées, URL, date et empreinte réelle ; distinguer accès et lecture.
- [Comparaisons](EXACT_PROTOCOL_COMPARISONS.csv) : 102 lignes, travail/repos/ancre/population/fréquence, limites, données individuelles manquantes et refus de dose exacte.
- [Accès aux textes](FULL_TEXT_ACCESS_LOG.md), [désaccords](SCIENTIFIC_DISAGREEMENTS.md), [récupérations](RECOVERY_CONTEXTS.md).
- [Dossiers coach](COACH_REVIEW_PACKETS.md) : priorités et 51 pages documentaires, distinctes des 920 rendus de séances.
- [Validation](VALIDATION.md) et [reprise](REPRISE.md).

## Provenance et méthode

L’archive fournie est conservée dans `input/`, ses deux fichiers texte vérifiés contre le manifeste fourni. Le contrôle V21B est rejoué sans réactiver ses unités clôturées. Les six écarts bibliographiques hérités et les trois collisions d’identifiants du relais sont corrigés uniquement dans des registres séparés.

`evidence/release-comparisons/source-id-dossiers.jsonl` préserve intégralement la fiche effective, ses restrictions et variantes, chaque candidat V19 et sa revue V20. La source effective conserve son SHA V21A ; le SHA candidat est calculé sur le JSON UTF-8 compact de l’objet candidat complet inchangé, ordre des clés conservé. Cette empreinte n’est pas une empreinte d’article ni une nouvelle version de dose.

Les SHA des réponses portent sur les octets réellement reçus avant compression. Le refus HTTP 403 ne reçoit aucun SHA fictif. Une réponse HTTP 200 de métadonnées DOI n’est pas un article lu. Les suppléments externes, figures non textuelles et sources citées ne sont pas réputés examinés par la seule lecture du XML principal.

Les principes documentés de Dan Lorang restent ceux de V8–V21B : partir du profil et du limiteur, choisir un stimulus, considérer récupération et réévaluation. Ils ne constituent ni une loi quantitative ni une preuve du dernier repos ou d’un dosage exact.

## Limites et prochaine étape

La priorité est une revue qualifiée des ancres d’intensité, des repos finaux indéterminés et de la transférabilité, avec accès aux méthodes primaires manquantes, surtout sur les séances réellement fréquentes. Aucune dose individuelle ne peut être approuvée par cette seule recherche. Les blocages Ironman archivés restent présents. Aucune dépendance payante, connexion Nolio, migration, publication de produit, fusion ou déploiement.
''')
accesslines=[]
for key,r in reg.items():
    accesslines.append(f"| `{key}` | {r['pmid']} | {cell(r['access'])} | {r['retrievedAt']} | `{r['artifactSha256'] or 'absent : pas de réponse archivée'}` |")
write('FULL_TEXT_ACCESS_LOG.md','''# Accès effectif et lecture

Le journal distingue **récupération**, **lecture documentaire par Codex** et **approbation sportive humaine** (0). Les URL et artefacts complets sont dans le registre CSV et `evidence/release-comparisons/study-registry.json`. Pas de contournement de l’accès éditeur ni d’achat.

| Clé | PMID | Portée réelle | Horodatage UTC | SHA-256 de la réponse |
|---|---|---|---|---|
'''+ '\n'.join(accesslines)+'''

## Textes principaux examinés

- PMID 34822448 : étude aiguë cycliste 3/3 ; Methods, Results, Discussion et Conclusions, tableaux XML.
- PMID 36314990 : essai chronique de course 4×4 ; protocole entier, tableaux et attrition. 48 randomisés, 31 analysés : ne pas décrire 48 résultats complets.
- PMID 24550843 : essai cycliste basse cadence ; méthodes, résultats et discussion. Le conflit sur le volume des repos est conservé.
- PMID 34540268 : fitting vélo, étude avant/après non contrôlée ; méthodes, tableaux, résultats et limites. Ce texte ouvert distinct ne remplace pas PMID 27490817.
- PMID 38443585 : revue systématique récupération, texte et tableaux ; portée secondaire, pas un protocole primaire commun.

Deux protocoles primaires permettent de décrire le contraste étudié sans contradiction de recette identifiée ici (3/3 aigu et 4×4 course). Les deux autres textes primaires entièrement lus restent détaillés mais insuffisants pour une concordance exacte : repos contradictoires en basse cadence et intervention de fitting sans recette d’entraînement. Le nombre de textes lus ne doit pas être présenté comme le nombre de protocoles de dose complets.

Les huit XML ont un corps d’article. Trois autres ont des lectures limitées : PMID 29663142 (Introduction/Methods seulement), PMID 36589784 (Materials and methods et tableaux 1–2 seulement), PMID 38165636 (récupéré, pas de lecture intégrale revendiquée). Aucun résultat non lu n’est emprunté au texte intégral.

## Accès incomplets

- PMID 27490817, DOI 10.1080/02640414.2016.1215496 : éditeur HTTP 403. L’ancien résumé V21B est conservé ; pas d’empreinte inventée pour le refus.
- PMID 39526869, DOI 10.23736/S0022-4707.24.15931-2 : HTTP 200 mais corps **JSON de métadonnées Crossref**, pas texte primaire de natation. Le protocole complet et la transférabilité entre nages restent inconnus.
- PMID 21812820, DOI 10.1111/j.1600-0838.2011.01351.x : identité et résumé récupérés via Europe PMC ; les liens recensés nécessitent un abonnement, texte complet non obtenu. Les repos ne sont pas reconstruits à partir de la fiche TFCLab.

Les recherches d’articles ouverts basse cadence et posture sont archivées également (`retrieval-1/force_primary_search`, `retrieval-3/posture_open_search`). Le résultat non sélectionné n’est pas une source lue. Aucun appui primaire de musculation lourde n’est revendiqué ; basse cadence et force en salle ne sont pas assimilées. La cohorte des 51 IDs ne contient aucune recette de natation ou de force en salle : ne pas lui attribuer ces articles pour améliorer la couverture.

Les métadonnées des 46 références V21B, dont les six écarts, sont vérifiées par rejeu de l’artefact archivé et de son empreinte, sans nouvelle lecture intégrale revendiquée.
''')
rc=load(R/'evidence/recovery-1/summary.json')
labels={'warm_up':'Échauffement','inter_repetitions':'Interrépétitions (dernier repos restant interne au même motif)','inter_series_or_work_blocks':'Interséries ou entre blocs de travail','after_main_block':'Après le dernier effort du bloc principal','final_cool_down':'Retour au calme final explicitement étiqueté','unresolved_following_content':'Contenu ultérieur indéterminé'}
write('RECOVERY_CONTEXTS.md','''# Où se situe la récupération ?

**416 propositions, 208 IDs, 466 opérations restPolicy. Aucune convention approuvée.** L’unité de comptage est indispensable : certaines propositions modifient plusieurs motifs de répétition. Les 418 vues V19 incluent aussi deux autres propositions ; elles ne constituent pas 418 conventions de repos.

## Deux axes distincts

Dans les 416 propositions, les repos récurrents séparent les répétitions du motif concerné. Le choix éditorial n/n−1 porte sur **une dernière occurrence éventuelle**. Le tableau suivant situe cette dernière occurrence hypothétique ; il ne dit jamais si elle est effectivement présente dans la source.

| Dernière occurrence hypothétique | Opérations (partition des 466) | Propositions concernées (chevauchements) |
|---|---:|---:|
'''+ '\n'.join(f"| {labels[k]} | {v} | {rc['inclusiveProposalCounts'][k]} |"for k,v in rc['hypotheticalLastRestOperations'].items())+'''

Le zéro dans la ligne « interrépétitions » de cet axe ne signifie donc pas absence de récupération entre répétitions. Il signifie qu’au terme du motif examiné aucune dernière occurrence n’a pu être classée comme restant interne au même motif. Un repos à la fin d’un bloc ne devient pas un cool-down parce qu’un retour au calme séparé le suit.

« Interséries ou entre blocs » inclut les motifs imbriqués et la présence de travail explicite après le motif dans la même partie. Ce libellé ne prétend pas que tous ces cas sont des séries identiques. Les 18 cas avec contenu ultérieur inconnu restent indéterminés, sans déplacement automatique dans une catégorie favorable.

## Partition sans double comptage des propositions

| Signature des positions modifiées | Propositions |
|---|---:|
'''+ '\n'.join(f"| {k} | {v} |"for k,v in rc['disjointProposalSignatures'].items())+'''

Total : **416**. Le comptage inclusif par position ne doit pas être additionné pour prétendre obtenir 416. Les 88 opérations d’échauffement concernent 72 propositions, dont certaines modifient plusieurs motifs.

## Ce que la littérature autorise

La revue chronique PMID 38443585 compare des modalités actives/passives de programmes hétérogènes : elle n’arbitre pas l’existence d’un repos final absent de la source. La revue de cool-down PMID 29663142 traite d’une autre fenêtre temporelle ; seule son introduction et sa méthode ont été relues ici.

Dans PMID 36314990, trois repos inter-efforts et un cool-down final sont explicitement distincts : cela décrit cette étude, pas les fiches TFCLab. Dans PMID 24550843, cinq efforts avec repos « in-between » suggèrent quatre repos mais le volume hebdomadaire déclaré correspond à cinq : le conflit reste ouvert.

Chaque opération et proposition est auditée dans `evidence/recovery-1/`, avec motif source, partie source et politique éditoriale inchangés. Le classificateur et le vérificateur indépendant obtiennent les mêmes 466 positions ; le rejeu est identique. La structure ne résout pas la décision sportive.
''')
cor=load(A/'IDENTITY_CORRECTIVE_REGISTER.json')
identityrows=[]
for x in cor:
    i=x['verifiedCorrectiveIdentity'];issue=x['v21bDiscrepancyUnchanged'];identityrows.append(f"| {issue['referenceId']} | {issue['code']} | PMID {i['id']} ; {cell(i['authorString'])} ; print/index {i['pubYear']} ; électronique {i.get('electronicPublicationDate')} | {cell(issue['detail'])} |")
write('SCIENTIFIC_DISAGREEMENTS.md','''# Désaccords et limites de transfert

## Six écarts V21B conservés, corrections séparées

| Référence héritée | Écart | Identité récupérée (pas une nouvelle source inventée) | Constat |
|---|---|---|---|
'''+ '\n'.join(identityrows)+'''

Les dates électronique/numéro imprimé restent distinctes, pas de correction globale arbitraire de l’année. `IDENTITY_CORRECTIVE_REGISTER.json` conserve chaque entrée fournie, identité et provenance archivées. IM-03 a deux écarts distincts : date et type d’étude.

## Trois collisions du relais

REC-02 du relais (PMID 38443585) ≠ REC-02 V21B (32744041). VO2-01 relais (34822448) ≠ V21B (23539308). VO2-02 relais (36314990) ≠ V21B (42237396). Utiliser PMID/DOI/artefact comme identité ; ne jamais réaffecter l’ancien identifiant. La note indépendante reste intacte.

## Protocole et portée

1. **Ancre 3/3 cycliste.** PMID 34822448 utilise une puissance issue de la rampe à 80 % VO2peak, réduite de 5 % pour les cinétiques, et une récupération liée à 85 % GET. « 80 % FTP », Z5 ou VO2peak mesurée ne sont pas interchangeables. L’effet est aigu ; pas de gain chronique établi par cette étude.
2. **4×4 course.** PMID 36314990 est sur tapis à environ 3 degrés, avec ancre MAS ajustée à la réponse cardiaque. Une dose vélo 106–115 % FTP et une récupération 50 % FTP ne reproduisent pas ce protocole. Une fréquence cardiaque donnée ne prouve pas à elle seule l’atteinte mesurée de VO2max.
3. **Seiler.** Le résumé primaire PMID 21812820 décrit 4×4/8/16 à intensité maximale tolérable et deux séances hebdomadaires ; il rapporte des gains plus grands globalement pour 4×8 dans cet échantillon. Les repos complets manquent. Il ne justifie ni un repos 50 % FTP universellement « essentiel », ni une supériorité universelle d’un format, ni l’inefficacité de 4×4.
4. **Basse cadence.** PMID 24550843 : 40 rpm, 5×6 min et ancre HRmax. Les recettes à 50–60 rpm/Z3 ne sont pas identiques. Le bilan négatif de cet essai ne prouve pas l’inefficacité de toutes les méthodes. Les volumes de récupération se contredisent ; aucun dernier repos n’est ajouté pour les réconcilier.
5. **Posture.** PMID 34540268 concerne un fitting et une observation avant/après non contrôlée chez des vététistes. Ni l’équivalence 4×15 et 6×10 en position aéro, ni une tolérance Ironman, ni une récupération de cinq minutes n’y sont démontrées. PMID 27490817 reste au niveau résumé ; ne pas confondre les deux études.
6. **Récupération.** Modalité active/passive pendant une série, présence du dernier repos, retour au calme et séance facile séparée sont quatre questions différentes. Absence de supériorité statistique ne prouve pas équivalence ni non-infériorité.
7. **Tempo/SST.** Les affirmations historiques « 1 h SST = 2 h Z2 », « ROI optimal » et les seuils VLamax associés n’ont pas de preuve primaire ciblée suffisante ici. Elles restent des revendications sources, sans modification de leur contenu ni approbation.
8. **Spécificité Ironman.** Seules les méthodes de PMID 36589784 ont été examinées : 40 km vélo puis 10 km course, sans prolongateurs. Modèles INSCYD et paramètres calculés ne sont pas des mesures directes de laboratoire, ni une validation indépendante des calculs TFCLab. Résultats/discussion non relus intégralement ; aucune conclusion de recette Ironman.
9. **Natation/force.** Pas de transposition CSS crawl aux autres nages ; pas de traduction d’une charge neuromusculaire en zone cardiaque. L’absence de recette dans cette cohorte n’est pas une absence de besoin sportif.
10. **Applicabilité individuelle.** LT1, LT2, MLSS, FTP et CP restent distincts. Une estimation terrain de VLamax n’est pas une mesure directe. Un test frais ne prouve pas la durabilité. Aucune tolérance nutritionnelle, thermique ou posturale ni adaptation future n’est acquise parce qu’une semaine s’est écoulée.

Aucune règle quantitative nouvelle n’est déduite des principes de Lorang. Aucune source historique ni règle de prescription n’est corrigée par ces constats documentaires. Les garde-fous et les quarantaines LCW/nutrition/chaleur déjà archivés restent intégralement conservés.
''')
# New scientific dossiers: distinct from all historical workout renders and export payloads.
packets=R/'coach-packets';packets.mkdir(exist_ok=True)
index=[]
for d in sorted(ds,key=lambda x:(-x['historicalUse']['historicalOccurrences'],x['legacyId'])):
    id=d['legacyId'];source=d['sourceEffectiveUnchanged'];cc=[r for r in cs if r['workoutId']==id];full=[r for r in cc if r['comparisonStatus']=='conclusive_not_same_protocol'];studykeys=list(dict.fromkeys(r['studyKey']for r in cc if r['studyKey']))
    support=[];limits=[]
    for key in studykeys:
        rr=reg[key];manual=rr.get('manualReviewUnchanged',{})
        french_support={
          'acute_cycle_3_3':'À puissance et temps de travail contrôlés, les réponses cardio-respiratoires pendant les efforts longs diffèrent de celles des efforts courts. Mesures aiguës ; aucune adaptation chronique démontrée.',
          'chronic_run_4_4':'Après huit semaines, le groupe 4×4 course a davantage augmenté son VO2max que les deux groupes sprint étudiés. Population masculine sélectionnée, attrition importante ; pas de transfert direct au vélo.',
          'low_cadence_primary':'Le groupe basse cadence ne présente pas d’amélioration significative des critères aérobies, de performance cycliste ou de force étudiés. Ce résultat ne condamne pas toutes les méthodes à basse cadence.',
          'posture_160_primary':'Après un fitting, les sensations de douleur, de fatigue et d’inconfort diminuent à trente jours. Étude non contrôlée chez des vététistes : pas de preuve causale d’endurance aéro ni de tolérance Ironman.',
          'seiler_21812820':'Le résumé compare 4×4, 4×8 et 4×16 chez des cyclistes et rapporte globalement davantage de gains pour 4×8 dans cet échantillon. Le texte intégral et les repos restent non vérifiés.'}
        support.append(f"- PMID {rr['pmid']} ({rr['access']}) : {french_support.get(key,'Contexte de résumé seulement ; protocole non vérifié intégralement ici.')}")
        limits.append(f"- PMID {rr['pmid']} : {manual.get('reasonForTargets','Article complet non obtenu.')} {rr['limits']}")
    if not support:support=['Aucun protocole primaire ciblé adéquat n’a été établi pour ce dossier. L’intention historique ci-dessous reste une déclaration de la fiche ; elle n’est pas une conclusion bibliographique.']
    if not limits:limits=['Ni la dose exacte, ni une équivalence entre formats, ni l’admissibilité individuelle ne sont démontrées. Aucun article n’est attribué à partir du seul titre de la fiche.']
    linesource='\n'.join(f"| {cell(p['part'])} | {cell(p['text'])} | {cell(', '.join(p.get('zones',[])))} |"for p in source['structure'])
    doses='\n'.join(f"| `{c['candidateKey']}` | {c['v20ReviewUnchanged']['exactCandidateDose']['seconds']/60:g} | `{c['candidateSnapshotSha256']}` |"for c in d['candidates'])
    constraints=json.dumps(d['sourceConstraintsUnchanged'],ensure_ascii=False,indent=2)
    text=f'''# Dossier scientifique — {id}

**Document de revue, aucune séance modifiée. DRAFT — NO-GO. Revue sportive humaine : 0.**

Intention historique : {cell(d['sourceIntentionNotScientificallyApproved'])}.

Utilisation archivée : {d['historicalUse']['historicalOccurrences']} occurrences dans les plans synthétiques complets V2. Ce nombre ne mesure ni des athlètes réels ni l’efficacité de la séance. Source SHA-256 : `{d['sourceEffectiveSha256']}`.

## Recette historique à examiner

| Partie | Consigne source conservée | Étiquettes source, pas des domaines individuels certifiés |
|---|---|---|
{linesource}

| Chronologie candidate conservée | Minutes du témoin technique | Empreinte candidate complète |
|---|---:|---|
{doses}

Ces minutes sont un témoin de compilation, pas un choix de dose individuelle. Les conventions de repos final restent candidates ; elles ne sont pas résolues par la littérature.

## Ce que l’étude soutient

{chr(10).join(support)}

## Ce qu’elle ne soutient pas

{chr(10).join(limits)}

{len(full)} comparaison(s) avec protocole primaire intégral aboutissent à une non-concordance du protocole entier ; {len(cc)-len(full)} comparaison(s) restent inconclues. Ne pas confondre non-concordance et contre-indication établie.

## Ce qui dépend de l’athlète

Les capacités à la dose envisagée, l’historique individuel, la récupération observée et l’accord du coach ne sont pas fournis dans cette cohorte documentaire. Les ancres physiologiques doivent être disponibles dans la bonne discipline ; aucune assimilation FTP/VO2peak, test frais/durabilité ou niveau qualitatif/résistance à la fatigue. La place dans le calendrier doit être revue avec les autres séances, pas sur cette seule fiche.

Restrictions et contraintes exactes conservées :

```json
{constraints}
```

## Décision attendue du coach

Clarifier l’intention et les paramètres réellement requis, examiner l’ancre d’intensité et la présence ou non du dernier repos avec le reste de la séance, puis confronter la dose aux preuves individuelles et au calendrier. Une décision documentée peut maintenir le refus ou demander une source primaire plus pertinente. Ce dossier ne demande pas une approbation globale et ne fournit aucune capacité nouvelle.

Statut de chaque chronologie : **dose_not_individually_verified**. Aucun rattachement exact_recipe_dose, aucune validation experte humaine. Les lignes complètes avec travail/repos/population/fréquence, revendications non soutenues et empreintes d’article sont dans `../EXACT_PROTOCOL_COMPARISONS.csv`, filtrables par ID et clé candidate. Les objets sources et candidats intacts sont dans `../evidence/release-comparisons/source-id-dossiers.jsonl`.
'''
    (packets/(id+'.md')).write_text(text)
    index.append(f"| [{id}](coach-packets/{id}.md) | {d['historicalUse']['historicalOccurrences']} | {len(d['candidates'])} | {'Oui, non-concordance entière'if full else'Non établi ici'} |")
write('COACH_REVIEW_PACKETS.md','''# Dossiers examinables par le coach

Ces 51 pages sont des **dossiers documentaires nouveaux**, pas de nouveaux rendus de prescription. Les 920 rendus historiques, les 418 vues candidates et les exports ne changent pas. Les 51 IDs ont leurs structures, contraintes, chronologies et inconnues conservées ; seuls 12 ont une comparaison primaire intégrale ciblée dans cette session.

## Priorités et décisions réellement ouvertes

| Cas | Ce que les données permettent | Décision à instruire, sans dose approuvée |
|---|---|---|
| C_BIKE_FORCE / TPL_IM_BIKE_FORCE_K3 | Comparaison réelle avec un essai basse cadence à 40 rpm/HRmax ; pas d’amélioration significative de son groupe expérimental | Clarifier l’adaptation visée, distinguer force en salle et cadence, rechercher une preuve plus transférable ; ne pas copier une cadence ou durée différente |
| C_IM_AERO_HOLD | Fitting/confort étudiés ; repos et tolérance longue non démontrés | Obtenir l’histoire posturale individuelle et les méthodes de l’article 27490817 ; ne pas déclarer 4×15 et 6×10 équivalents |
| B_BIKE_VO2_3MIN | Étude aiguë cycliste 3/3 avec puissance liée à VO2peak/GET | Choisir une ancre réellement disponible et vérifier récupération/répétitions ; aucun gain chronique ni Z5 optimal prouvé |
| SEILER_BIKE_4X4MIN / BILLAT_BIKE_VO2MAX_4MIN | Étude intégrale de course et résumé primaire cycliste ne confirment pas la recette entière | Rechercher méthodes cyclistes complètes ; ne pas transférer MAS/HR vers FTP ni proclamer un repos universel |
| COGGAN_BIKE_SST_EXTENDED / B_703_RUN_THRESHOLD | Familles fréquentes dans les plans archivés, sans protocole primaire ciblé adéquat conclu ici | Priorité de recherche sur anchors, durabilité et compromis de charge ; les slogans d’équivalence de durée restent non démontrés |
| D_TAPER_RUN_OPENER / D_TAPER_SHAKEOUT | Fort usage historique synthétique, sans preuve de dose exacte apportée | Revoir place J−1/J−2, fatigue résiduelle, vécu individuel et interactions ; la popularité n’est pas une validation |

La revue de récupération peut informer la question, sans trancher les 416 derniers repos. La force, la natation et l’Ironman complet ne sont pas réputés validés par les quelques études accessibles. Les données individuelles nécessaires sont indiquées dans chaque dossier ; pas de questionnaire quantitatif nouveau.

## Index exhaustif des 51 IDs

Tri par occurrences dans les plans synthétiques V2 puis identifiant ; les autres cohortes restent séparées dans l’artefact JSON. Aucun score physiologique n’est déduit de l’usage.

| ID | Occurrences V2 | Chronologies | Protocole primaire intégral comparé |
|---|---:|---:|---|
'''+ '\n'.join(index))
print(json.dumps({'documentsWritten':6,'coachScientificPackets':len(index),'copiedCsvTables':2}))

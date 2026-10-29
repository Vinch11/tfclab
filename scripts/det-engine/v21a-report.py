"""Deterministic handoff documents from frozen V21A inventory; not a literature review."""
import json,pathlib,shutil,collections,importlib.util
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21a-session.py'))
session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
R=session.ROOT;E=R/'evidence/accepted'
def load(p):return json.loads(pathlib.Path(p).read_text())
def jsonl(p):return [json.loads(x)for x in pathlib.Path(p).read_text().splitlines()]
def esc(t):return str(t).replace('|','/').replace('\n',' ')
def put(name,t):
    p=R/name
    assert not p.exists(),str(p)
    p.write_text(t if isinstance(t,str)else json.dumps(t,ensure_ascii=False,indent=2)+'\n')
def main():
    session.guard();session.preserve()
    rows=jsonl(E/'WORKOUT_FAMILY_MAPPING.jsonl');byid={r['legacyId']:r for r in rows}
    fs=load(E/'family-definitions-and-impact.json');summary=load(E/'summary.json')
    top=[next(f for f in fs if f['id']==id)for id in summary['top5Mechanisms']]
    refs=load(E/'existing-reference-contexts.json');mentions=jsonl(E/'REFERENCE_OCCURRENCES.jsonl')
    for f in ['WORKOUT_FAMILY_MAPPING.jsonl','REFERENCE_OCCURRENCES.jsonl','PLAN_USAGE.jsonl']:
        assert not (R/f).exists();shutil.copyfile(E/f,R/f)
    put('dashboard.json',summary)
    header='DRAFT — NO-GO. Préparation documentaire uniquement ; aucune validation scientifique automatique, dose ou règle modifiée.\n\n'
    t='# Inventaire des familles scientifiques\n\n'+header
    t+='920 IDs uniques, 2 425 variantes historiques conservées avec leur texte et leur classification technique V18 : 1 073 ambiguës, 1 346 descriptives, 6 à paramètre explicite. Aucun de ces statuts ne juge l’efficacité scientifique. Les 96 propositions complètes V19 / 51 IDs et les 418 propositions V19 restent des overlays séparés, sans remplacement des 920 sources.\n\n'
    t+='[Mapping complet](WORKOUT_FAMILY_MAPPING.jsonl) : une ligne par ID, source brute et effective intégrales, structure, variantes, restrictions, inconnues, provenance, métadonnées et qualifications héritées. [Définitions et listes d’IDs](evidence/accepted/family-definitions-and-impact.json).\n\n'
    t+='## Ce que signifie un rattachement\n\nChaque correspondance est un routage candidat vers une question de recherche. L’extrait et son pointeur sont conservés. `declared_target` signifie revendication historique explicite (objectif, tag, métadonnée ou discipline), pas adaptation obtenue. `component_or_rationale_only` signifie composant ou justification secondaire ; `goal_scope_only` indique seulement une compatibilité d’objectif. Les familles se recouvrent et ne doivent pas être additionnées. L’efficacité, le niveau de preuve et les références ne sont jamais déduits de ces correspondances.\n\n'
    t+='Les mécanismes sont séparés des contextes (trail, natation, bricks, Ironman, affûtage) et des soutiens (nutrition, chaleur/hypoxie). L’endurance musculaire n’est pas automatiquement aérobie ; « sans fatigue » ne devient pas une exposition de durabilité. Une récupération dans un échauffement reste un composant de cet échauffement. Les domaines d’intensité restent ceux de `src/lib/zones/tfclDoctrine.ts`, sans nouveau calcul.\n\n'
    t+='| Famille | Axe | IDs avec au moins une mention | Objectif déclaré | Occurrences ciblées V2 | Occurrences ciblées V14 natif |\n|---|---|---:|---:|---:|---:|\n'
    for f in fs:t+=f"| {f['label']} | {f['axis']} | {f['workoutCount']} | {f['declaredTargetCount']} | {f['targetUsageOccurrences']['v2_historical_complete_plans']} | {f['targetUsageOccurrences']['v14_native_primary']} |\n"
    t+='\nDeux séances restent sans rattachement positif : `A_10K_PROGRESSIVE_60` et `A_SEMI_PROGRESSIVE_FINISH`. Leur negative split décrit une construction, sans préciser à lui seul le mécanisme recherché. Elles sont conservées intégralement et orientées vers clarification d’intention, sans famille inventée.\n\n'
    t+='## Couverture et limites\n\nSports canoniques : '+', '.join(f"{k} {v}"for k,v in summary['sports'].items())+'. Le contexte trail traverse aussi des fiches classées run/strength ; les trois IDs de discipline trail ne résument donc pas la couverture trail. Deux métadonnées physiologiques sont dans les sources brutes, 25 dans la représentation effective enrichie existante : les 23 autres ne deviennent pas des preuves expérimentales.\n\n'
    t+='Le classement automatique facilite la revue, mais n’est pas une ontologie scientifiquement validée. Les mentions négatives complexes, synonymes non prévus et intentions implicites nécessitent une revue humaine. Toutes les sources restent accessibles pour corriger le routage sans modifier la séance.\n'
    put('SCIENTIFIC_FAMILY_INVENTORY.md',t)
    t='# Registre des références existantes\n\n'+header
    t+='## Périmètre reproductible\n\nLe registre distingue les 380 occurrences dans les champs historiques (174 marqueurs bibliographiques ou numériques candidats, 206 attributions d’auteur/méthode) et 95 occurrences dans les commentaires des 31 fichiers du bundle V16. Ce sont 475 **mentions candidates**, pas 475 publications. Une année, une « référence allure » ou une attribution peut être non bibliographique. Aucun auteur nommé n’est automatiquement relié à un article. [Occurrences intégrales](REFERENCE_OCCURRENCES.jsonl), avec chemin, pointeur ou ligne.\n\n'
    t+='Les détecteurs recherchent URL, DOI, PMID, marqueur Réf/référence, années et un lexique déclaré d’auteurs. Des citations non balisées peuvent échapper au détecteur : le mapping conserve tous les textes bruts/effectifs, et le [bundle intégral](../v16/evidence/source-bundle.json.gz) reste la base de vérification. Ce registre est exhaustif pour les occurrences de ces règles, sans prétendre reconnaître toute allusion scientifique implicite.\n\n'
    t+='## Sources documentaires dont l’accès a déjà été vérifié\n\n16 enregistrements de provenance, 14 URL distinctes : V8 (12), V17 (2), V19 (2). Les doublons Van Hooren/Peake et Maunder restent distincts par accès. « Vérifié » signifie seulement le périmètre d’accès indiqué ci-dessous et dans les métadonnées ; aucune nouvelle lecture bibliographique n’est effectuée en V21A. Aucun texte intégral non consulté n’est présenté comme lu.\n\n'
    t+='| ID du registre | Source / année | Périmètre d’accès hérité | Limites d’application |\n|---|---|---|---|\n'
    for r in refs:
        b=r['originalRecord'];limit=b.get('limits')or b.get('applicabilityLimits')or 'Résumé lu ; texte intégral non lu ; dose et transfert non établis.'
        access=b.get('access')or ('Résumé public lu, texte intégral non lu'if b.get('abstractRead')else r['verification'])
        t+=f"| {r['registryId']} | [{esc(b.get('authors',''))} {b.get('year','')}]({b['url']}) | {esc(access)} | {esc(limit)} |\n"
    t+='\n[Registre JSON et dossiers originaux](evidence/accepted/existing-reference-contexts.json). [Contexte V19 intégral](evidence/accepted/v19-documentary-context-preserved.json). Les trois annotations documentaires V17 (deux récupérations et une endurance longue) sont conservées dans `inheritedQualification`, avec leurs limites. La correspondance exacte entre liens bibliographiques individuels source et références V8 était nulle en V17 ; V21A n’ajoute aucune attribution individuelle.\n\n'
    t+='## Attributions à traiter séparément\n\nL175/L417/L220 sont des entretiens ou articles de coaching, dont les shownotes/textes édités ont été consultés ; l’audio intégral n’est pas déclaré vérifié. Les principes de contextualisation, stimulus assimilable, feedback et réévaluation ne prouvent pas les quotas TFCLab, les ratios sportifs, une dose précise ou une progression universelle. Voir [méthode et limites V8](../v8/LORANG_METHODOLOGY.md).\n\n'
    t+='Les mentions Burke, Périard, Impey, Van Proeyen, Volek/Phinney, Chatard, Debraux, Daniels et autres restent des pistes à identifier et vérifier. Les chiffres revendiqués dans leur voisinage ne sont pas validés par l’existence du nom. Priorités sensibles conservées : nutrition faible disponibilité, ratio glucidique obligatoire, chaleur/sauna, tolérance aéro, récupération, et unité « +500 mL/h de sommeil » du LCW. Aucune quantité de remplacement proposée.\n'
    put('EXISTING_REFERENCE_REGISTER.md',t)
    # Questions are grouped by mechanism and actionable decision, not 920 separate searches.
    questions=[]
    for f in fs:
        priority='P1'if f['id']in summary['top5Mechanisms']else 'P2'
        for suffix,question,decision in [
          ('mechanism',f['question'],'Définir ce que la séance peut raisonnablement viser, avec limites de transfert.'),
          ('dose','Quelles doses, récupérations, fréquences et variantes sont effectivement étudiées, et lesquelles restent conventions TFCLab ?','Conserver, annoter ou renvoyer à revue les paramètres ; aucune dose automatiquement remplacée.'),
          ('individualization','Quelles données individuelles sont nécessaires pour le stimulus, sa dose et son suivi, sans inventer de capacité ?','Préciser les prérequis et conditions de réévaluation, distincts de l’appréciation qualitative du coach.'),
          ('interaction','Comment ce stimulus interagit-il avec les autres disciplines, la fatigue et le calendrier complet ?','Identifier les incompatibilités démontrées, les précautions et les hypothèses ; pas de seuil universel inventé.')]:
            questions.append({'questionId':'Q-'+f['id']+'-'+suffix,'familyId':f['id'],'priority':priority,
              'question':question,'decisionEnabled':decision,'population':f['population'],'comparators':f['comparators'],
              'outcomes':f['outcomes'],'searchSeed':f['search'],'targetIds':f['declaredTargetIds'],
              'allRoutingIds':f['ids'],'sourceExcerptsIn':'WORKOUT_FAMILY_MAPPING.jsonl',
              'reviewStatus':'not_started_independent_search_required','evidenceLevel':None})
    questions.insert(0,{'questionId':'Q-cross-source-safety','familyId':None,'priority':'P0','question':'Clarifier les consignes à fort impact : unité LCW, promesses chiffrées non vérifiées, nutrition restrictive et chaleur. Quels contextes/contre-indications sont nécessaires ?',
      'decisionEnabled':'Revue ciblée avant toute activation, sans modification de dose ou contournement de protection.',
      'targetIds':['B_LCW_NUTRITION_RECHARGE','FATMAX_TRAIN_HIGH_GUT','FATMAX_BIKE_LONG_FASTED','HEAT_SAUNA_POST_WORKOUT'],
      'reviewStatus':'not_started_independent_search_required','evidenceLevel':None})
    questions.append({'questionId':'Q-unresolved-intent','familyId':None,'priority':'P2','question':'Quel mécanisme est réellement visé par ces deux negative splits, au-delà de leur construction éditoriale ?',
      'decisionEnabled':'Clarifier le routage scientifique sans déduire une adaptation du nom ou du negative split.',
      'targetIds':summary['unresolvedIds'],'reviewStatus':'not_started_independent_search_required','evidenceLevel':None})
    put('RESEARCH_QUESTIONS.json',questions)
    t='# Questions de recherche par mécanisme\n\n'+header
    t+='62 questions versionnées : une clarification P0 de consignes sensibles, quatre questions dans chacune des 15 familles, une clarification des deux intentions non rattachées. [Données et listes d’IDs](RESEARCH_QUESTIONS.json). La priorité P1 reflète l’usage des objectifs déclarés dans les 167 calendriers techniquement assemblés de l’archive V2 ; elle ne représente pas une fréquence chez les athlètes réels ni une supériorité physiologique. Les domaines/contextes peu utilisés dans cette archive ne sont pas réputés sans importance.\n\n'
    t+='## Protocole de recherche indépendant attendu\n\nEnregistrer date, bases consultées gratuitement, requêtes exactes, filtres, résultats et exclusions. Séparer revues, essais, études mécanistiques et entretiens. Extraire population, sport, niveau, intervention complète (durée de bloc et de séance, intensité et ancre, récupération, répétitions, fréquence), comparateur, critères, incertitude, effets indésirables et limites. Rechercher les résultats contradictoires et nuls. Un résumé ne suffit pas à reconstruire des détails absents ; ne pas inventer les récupérations.\n\n'
    t+='L’analyse doit séparer stimulus plausible, dose étudiée, transfert vers une fiche et admissibilité individuelle. Retourner aussi les absences de preuve, les textes inaccessibles et les désaccords. L’appréciation qualitative de résistance à la fatigue par le coach reste optionnelle, distincte de la récupération réellement observée et du niveau d’entraînement. Pas de nouveau questionnaire quantitatif.\n\n'
    for f in fs:
        fq=[q for q in questions if q.get('familyId')==f['id']]
        t+=f"## {f['label']} — {fq[0]['priority']}\n\nHypothèse à examiner : {f['hypothesis']}\n\n"
        for q in fq:t+=f"- `{q['questionId']}` : {q['question']} Décision : {q['decisionEnabled']}\n"
        t+=f"\nPopulation : {f['population']} Comparateurs : {f['comparators']} Critères : {f['outcomes']}\n\nRequête de départ, à compléter : `{f['search']}`.\n\n"
    t+='## Questions transversales prioritaires\n\n'+questions[0]['question']+'\n\nLa source LCW reste bloquée pour la consigne ambiguë ; aucun nouveau seuil ni correction nutritionnelle n’est introduit. Les deux intentions non rattachées demandent clarification du mécanisme. Ces travaux ne déclenchent aucune prescription.\n'
    put('SCIENTIFIC_RESEARCH_QUESTIONS.md',t)
    # Top five dossiers retain entire ID lists and concrete source material.
    targeted={
      'recovery':('Séparer repos entre répétitions, récupération finale d’échauffement, retour au calme final, séance séparée et semaine allégée. Revoir les 416 politiques V19 et les 59 intensités de repos non univoques V20 sans attribuer la zone principale au repos.', ['V17:PMID29663142','V19:PMID29663142']),
      'strength':('Dissocier force lourde, isométrie, circuit, corde de natation, muscles respiratoires et basse cadence. LL24 porte sur certaines modalités chez des coureurs, sans valider toute cette famille ni une équivalence avec la force vélo.', ['V8:LL24']),
      'technique':('Séparer apprentissage moteur, mobilité, posture aéro et technique de nage. Examiner la différence 6 × 10 versus 4 × 15 min de posture et la nécessité de tolérance cervicale/lombaire ; la même dose cumulée n’implique pas le même stimulus continu.', ['V8:L175','V8:L417','V8:L220']),
      'aerobic_endurance':('Distinguer domaine réel, durée tolérée, oxydation aiguë, adaptation chronique et conditions nutritionnelles. Ne pas déduire une baisse de VLamax de Z2 ni une capacité acquise du passage des semaines.', ['V8:R25','V8:O24','V8:S25','V8:M21']),
      'economy':('Distinguer économie mesurée à charge standardisée, coordination visible et simple sensation. Rechercher si strides, éducatifs ou force modifient le coût, sans diagnostiquer un déficit individuel ni imposer une cadence universelle.', ['V8:LL24','V8:E26'])}
    dossiers=[]
    t='# Cinq dossiers de recherche prioritaires\n\n'+header
    t+='Classement reproductible des **mécanismes déclarés** par occurrences dans les 167 calendriers assemblés de l’archive V2 (600 configurations conservées), puis départage déterministe par couverture. Les familles et objectifs multiples se recouvrent. Ce choix privilégie l’impact sur la sélection historique ; il ne transforme pas les anciens biais du solveur en priorités scientifiques universelles. Natation, trail, bricks, spécificité Ironman, seuil/VO₂max, nutrition et affûtage gardent leurs questions propres et les contextes des cinq dossiers.\n\n'
    for rank,f in enumerate(top,1):
        candidates=sorted([byid[id]for id in f['declaredTargetIds']],key=lambda r:(-r['usageByCohort'].get('v2_historical_complete_plans',0),r['legacyId']))
        examples=candidates[:3];specific,context=targeted[f['id']]
        d={'rank':rank,'familyId':f['id'],'label':f['label'],'priorityBasis':{'cohort':'v2_historical_complete_plans','occurrences':f['rankingMetric'],'counting':'historical declared targets, overlapping, synthetic, no expert approval'},
          'allTargetIds':f['declaredTargetIds'],'allRoutingIds':f['ids'],'specificResearchTask':specific,
          'candidateContextReferencesNotWorkoutAttributions':context,'questionIds':[q['questionId']for q in questions if q.get('familyId')==f['id']],
          'examples':[{'legacyId':r['legacyId'],'source':r['source'],'doseParameters':r['doseParameters'],'constraints':r['constraints'],'unknowns':r['unknowns']}for r in examples],
          'scientificReviewPerformed':False,'evidenceLevel':None,'deliverableExpected':'Versioned claims with extracted protocol, evidence access scope, applicability, contradictions, uncertainty and qualified independent review.'}
        dossiers.append(d)
        t+=f"## {rank}. {f['label']}\n\n{f['declaredTargetCount']} IDs déclarent cette cible ; {f['rankingMetric']} occurrences historiques, {f['usedDistinctIds']['v2_historical_complete_plans']} IDs employés tous rôles confondus. Occurrences ciblées V14 natif : {f['targetUsageOccurrences']['v14_native_primary']}. Les listes exactes et exemples complets sont dans [le dossier JSON](TOP_5_RESEARCH_DOSSIERS.json), entrée `familyId={f['id']}`.\n\n"
        t+=f"**Question centrale.** {f['question']}\n\n**Analyse demandée.** {specific}\n\n**Population et comparaison.** {f['population']} {f['comparators']}\n\n**Critères.** {f['outcomes']}\n\n**Contexte documentaire existant, sans attribution aux fiches.** {', '.join(context)}. Examiner l’applicabilité avant toute liaison individuelle.\n\n"
        t+='| Exemple conservé | Objectif historique | Enveloppe annoncée, pas capacité | Restriction source |\n|---|---|---|---|\n'
        for r in examples:t+=f"| `{r['legacyId']}` | {esc(r['historicalObjective'])} | {esc(r['doseParameters']['declaredDuration'])} min | {esc(r['constraints']['avoid'])} |\n"
        t+=f"\n**Données individuelles et réévaluation.** {f['monitoring']}\n\n**Limite.** {f['risk']}\n\n**Recherche initiale.** `{f['search']}`. Étendre aux termes spécifiques du sport et de la modalité, sans limiter aux résultats favorables. Retour attendu : mécanisme étayé ou non, doses réellement testées, population, incertitude et décisions restant candidates.\n\n"
    t+='## Pont vers DET-ENGINE\n\nSuivre tests terrain → profil calculé → limiteur priorisé → adaptation hypothétique → stimulus → dose → calendrier → réaction observée. Les sensibilités V20 démontrent des changements de limiteurs et de bornes issus des références, mais pas la justification causale de toutes les doses. Chaque proposition de rattachement doit indiquer cette lacune et les données qui permettraient de la lever. Une simulation favorable n’est pas une observation d’assimilation.\n'
    put('TOP_5_RESEARCH_DOSSIERS.md',t);put('TOP_5_RESEARCH_DOSSIERS.json',dossiers)
    t='# Contrat de réintégration des justifications\n\n'+header
    t+='[JSON Schema 2020-12](EVIDENCE_INTEGRATION_SCHEMA.json), version `tfcl-evidence-attachment-1.0.0`. Le format transporte une annotation documentaire détachée. Il ne modifie ni catalogue, prescription, intensité, filtre, validateur ni statut d’admissibilité. Les 920 lignes du mapping ont une liste `evidenceAttachments` vide ; l’absence de preuve reste visible.\n\n'
    t+='## Liaison et version\n\n`legacyId` et `sourceEffectiveSha256` lient la fiche exacte. `familyId` doit exister dans son routage candidat ; sinon une revue de classification est requise. Une variante demande le couple `variantGoal` / `variantSourceHash` existant. Une revendication de dose exacte exige `recipeContentSha256` égal à l’empreinte de la structure canonique source et `doseAndRecoveryCompared=true`. Cette version ne lie pas silencieusement les overlays V19 : leur liaison devra être versionnée séparément. Le hash décrit un contenu, pas une recette exécutable ni une dose validée. Les empreintes de structure utilisent SHA-256 du JSON UTF-8 compact, ordre des clés source conservé, caractères Unicode non échappés.\n\n'
    t+='## Séparer preuve et décision\n\n`claim.origin` distingue publication, principe de coaching documenté, convention TFCLab et hypothèse candidate. `claim.scope` distingue contexte familial, mécanisme d’une séance et dose exacte. `finding` peut être non évalué, négatif, mixte ou limité. Le type d’étude et le niveau de preuve ne sont pas calculés par le titre ou la famille ; l’extraction et l’argumentaire sont à fournir dans la revue.\n\n'
    t+='`verification.status` distingue simple mention, métadonnées vérifiées, résumé et texte intégral examinés. Une vérification exige URL de récupération, SHA de réponse, date et intervenant. Les limitations d’accès sont explicites. `applicability` exige population, intervention, comparateur, critères, limites, données individuelles et directivité déclarée. Les champs inconnus restent null/listes vides au stade brouillon. Une revue terminée exige intervenant et justification. Le validateur contrôle seulement la forme, la provenance et les liaisons ; il ne vérifie pas la vérité scientifique de ces déclarations.\n\n'
    t+='## Procédure de retour\n\n1. Retourner une ligne JSON par revendication, avec `packetId` stable et contexte d’accès ; inclure résultats négatifs et incertitudes.\n2. Contrôler schéma, ID, empreinte de source, famille et variante avec `scripts/det-engine/v21a-evidence.py::validate_packet`.\n3. Dédupliquer par `packetId` et contenu identique ; rejeter un même ID avec contenu différent. Une révision explicite utilise un nouvel ID et `supersedesPacketId`. Le validateur unitaire ne constitue pas encore un importeur persistant.\n4. Faire examiner la justesse documentaire et le transfert par l’intervenant compétent. Un principe Lorang n’est pas un essai de dose.\n5. Stocker les annotations dans une couche expérimentale, puis seulement proposer une intégration sportive distincte et revue. Aucune promotion automatique n’est autorisée.\n\n'
    t+='`prescriptionImpact=none_research_annotation_only`, `automaticPromotion=false`, `individualAthleteApproved=false` sont imposés. Aucun champ d’export Nolio, API, donnée réelle ou règle de production n’est déclenché. Les tests refusent identifiant inconnu, hash périmé, variante erronée, famille non reliée, recette inconnue, fausse provenance absente et promotion automatique.\n'
    put('EVIDENCE_INTEGRATION_SCHEMA.md',t)
    put('README.md','# TFCLab DET-ENGINE V21A\n\n'+header+'Commencer par [les résultats](V21A_RESULTS.md), puis [l’inventaire](SCIENTIFIC_FAMILY_INVENTORY.md), [les cinq dossiers](TOP_5_RESEARCH_DOSSIERS.md), [les questions](SCIENTIFIC_RESEARCH_QUESTIONS.md), [le registre](EXISTING_REFERENCE_REGISTER.md) et [le contrat de retour](EVIDENCE_INTEGRATION_SCHEMA.md). [Reprise](REPRISE.md).\n')
    print(json.dumps({'mapping':len(rows),'variants':sum(len(r['variants'])for r in rows),'questions':len(questions),'dossiers':len(dossiers),'mentions':len(mentions),'newEvidenceLinks':0}))
if __name__=='__main__':main()

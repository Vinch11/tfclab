"""Render coach-facing documents solely from executed machine evidence."""
import collections,gzip,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v26');attempt=sys.argv[1] if len(sys.argv)>1 else '1';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def save(name,text):(R/name).write_text(text.rstrip()+'\n')
def j(x):return json.dumps(x,ensure_ascii=False)
rows=load(E/'build/originals.json.gz');sensitivity=load(E/'build/sensitivity.json.gz');dossiers=load(E/'build/dossiers.json.gz');nolio=load(E/'build/nolio.json.gz');validation=load(R/'evidence/independent-validation.json');state=load(R/'state.json')
names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
def minutes(row):return [{sport:sum(s['minutes'] for s in w['slots'] if s['role']['sport']==sport) for sport in ['swim','bike','run','strength']} for w in row['retained']['calendar']['weeks']]
def issues(row):return[row['retained']['rawValidation']['historical']['blocking'],row['retained']['rawValidation']['historical']['warnings']]
common='DRAFT — NO-GO. Cas synthétiques. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée. Quatre semaines ne constituent pas une préparation Ironman complète.'
intro=f'''# V26 — prescription physiologique prospective

{common}

Baseline `013489126054a94d4c5395e0b5e49d457d25ab47`, #425 lu à `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`. Les deux têtes ont été vérifiées avant écriture. Les archives V2–V25 restent intactes.

La nouvelle capacité exécutée est une recherche de recettes pilotée par les leviers calculés avant le calendrier. Elle parcourt la bibliothèque canonique complète, exige une intention physiologique explicite dans la source et une discipline étayée, réutilise les filtres et l'instanciateur existants, puis expose les raisons d'exclusion. Ni titre ni score pondéré caché ne pilotent le choix.

A obtient un dossier de deux chronologies VO₂ vélo structurées de B_BIKE_VO2_3MIN, 60,5 et 64,5 minutes comme témoins techniques. Elles restent interdites/différées dans ce bloc : phase, prohibition historique, tolérance, intensité Z5 et convention du repos final. B obtient la longue vélo continue déjà présente comme recette pertinente à examiner. Son prérequis historique `ventilateur` reste non confirmé. Le TTE frais n'est pas requalifié en durabilité Ironman.

**Aucune nouvelle substitution de séance n'est retenue.** Les calendriers et volumes V25 avec dérogation coach restent exactement identiques ; les propositions physiologiques sont différentes et les raisons de leur non-insertion sont exécutées. Aucune preuve ne permet actuellement d'ajouter le VO₂ à A ni de rendre la dose de B individuellement approuvée.

| Cas figé | Recettes structurées à examiner | Franchissent tous les filtres connus | Erreurs / avertissements historiques | Refus individuels |
|---|---:|---:|---|---:|
'''
for row,stat in zip(rows,validation['profiles'],strict=True):intro+=f"| {row['caseId']} | {stat['candidateShortlist']} | {stat['selectionPassingKnownGates']} | {j(stat['rawHistorical'])} | {stat['refusals']} |\n"
intro+='\nLa liste pour examiner les preuves n’est pas une liste de prescriptions admissibles. Le prérequis de ventilation est conservé, pas transformé en avis de diversité. Les sept refus course A, les 26 refus C, les autres refus et la suspension vélo S2 restent identiques. L’exception 95→90 est déjà autorisée pour la programmation expérimentale et ne doit pas être redemandée pour son périmètre existant. Elle n’approuve pas la dose individuelle.\n'
intro+=f"\nVérification indépendante : {validation['previousFilesUnchanged']} fichiers antérieurs inchangés, 920 IDs, 2 425 variantes, 600 références historiques recomptées et préservées (pas rejouées intégralement), 15 fixtures Nolio conservées. Deux dossiers de 30 séances, dix sensibilités et cinq sondes de contrat #425. {validation['independentlyCheckedRecipeWitnesses']} témoins de recettes contrôlés indépendamment ; sept artefacts identiques au rejeu.\n"
intro+='\nLes études V21 sont du contexte documentaire, pas une validation de ces doses. Les modèles #425 ne sont pas importés, et aucun coût 200 de la fixture de transfert distincte n’est injecté dans A/B/C. C8 et la persistance réelle Supabase restent non résolus. Voir les journaux de tests et les dossiers complets ci-dessous.\n'
save('V26_RESULTS.md',intro)

save('PHYSIOLOGICAL_SELECTION_ENGINE.md',f'''# Sélection physiologique exécutée

{common}

`deriveV26Intentions` réutilise `deriveV22StimulusRequests` et les vrais résultats de `prepareTrainingPlanContext` / `computeDiagnostic`. Les raw inputs A/B/C restent inchangés. La liaison explicite levier → intention de source est une convention expérimentale inspectable, pas une équation de dose. La provenance vélo repose sur les tests vélo déclarés dans les fixtures ; une provenance non disponible ne se déduit pas de l'objectif triathlon.

`searchV26Stimuli` parcourt les 920 enregistrements déjà convertis. Une correspondance exige `original.effective.physiology.primary/secondary` et la discipline ; elle ne se déduit jamais de `title`. Les sources sans ce champ ne sont pas réputées inefficaces : leur intention nécessite un rattachement explicite revu. Cette couverture volontairement stricte réduit les faux positifs ; aucune migration de catalogue n'est relancée.

Pour chaque correspondance, les recettes historiques et leurs overlays éditoriaux sont séparés. Les filtres `evaluateCanonicalOffer` / `evaluateV18ReviewOffer`, les minima sources, l'instanciateur V18, les domaines de `tfclDoctrine.ts`, les capacités et les restrictions existantes sont réutilisés. Les conventions de dernier repos restent des overlays non approuvés. Un témoin de durée minimum est une démonstration arithmétique ; ce n'est pas une dose choisie pour l'athlète.

Ordre partiel publié : options qui passent les filtres connus / protocoles incomplets / options bloquées ou différées. Aucune pondération. Les ex æquo sont conservés ; l'ordre lexical sert seulement à stabiliser l'affichage. La liste de revue documentaire exige structure et mécanisme plausible ; elle ne supprime aucun bloqueur.

`buildV26Prescription` calcule cette demande avant `buildV25Prescription`, puis applique l'opt-in coach existant et les contrôles V23 sur les quatre semaines. Les correspondances aux slots existants et les témoins aux vraies durées 120/130/145/105 sont exposés séparément. Un remplacement non validé n'est pas inséré dans le calendrier.

Avant : le catalogue d'offres A contenait des familles de métadonnées telles que yoga ou travail respiratoire, sans prouver qu'elles soient un protocole VO₂ vélo ; le calendrier utilisait ses listes fixes. Après : des sources vélo portant une intention explicite sont trouvées, leurs recettes effectivement structurées sont confrontées aux règles, et la non-insertion est expliquée. B confirme une exposition longue déjà présente, sans ajouter de minutes pour satisfaire un levier.

Les textes quantitatifs automatiques des leviers TFCL (HIIT, +10 %, etc.) restent archivés comme résultats natifs : V26 ne les adopte pas comme règles quantitatives.
''')

save('INDIVIDUALIZED_PRESCRIPTION_CONTRACT.md',f'''# Contrat individuel candidat

{common}

La trace machine conserve : entrée/hash ; levier calculé ; adaptation ; famille de mécanisme ; source/hash et recette/hash ; original exact ; dose témoin, répétitions, récupérations ; cibles calculables ; discipline ; enveloppe déclarée ; restrictions ; contextes par semaine ; prérequis ; réévaluation ; décision coach.

| Couche | Signification | Limite |
|---|---|---|
| A — techniquement structurée | Un témoin complet est instancié dans les bornes de la recette | N'approuve ni convention éditoriale ni exécution individuelle |
| B — mécanisme plausible | Intention source explicite et contexte familial V21 disponible | Pas preuve de la dose exacte ni adaptation obtenue |
| C — individuellement admissible | Exigerait preuves spécifiques d'intensité, tolérance et récupération | Toujours false dans les sondes V26 |
| D — dose approuvée par le coach | Décision individuelle explicite, authentifiée et liée à la prescription | Toujours false ; la politique floor n'est pas D |

Le niveau qualitatif, la disponibilité et l'enveloppe de séance ne démontrent pas la tolérance à des répétitions VO₂, à la force maximale ou à la posture. Aucune cible Z5 n'est calculée depuis une FTP seule ; les zones/domains connus Z1/Z2 réutilisent la doctrine et l'interprétation coach V22 préenregistrée, avec ses inconnues. Une séance neuromusculaire ne reçoit pas une zone cardio comme preuve de charge.

Les 60,5/64,5 minutes des overlays VO₂ restent des témoins techniques concurrents. Leur population, ancre, récupérations et portée ne deviennent pas des prescriptions universelles. Une phase base ou une prohibition historique ne disparaît pas parce qu'une recette est compilée.

L'enveloppe course reste 90, et non 95 par simple passage du temps. La réduction 95→90 demeure strictement limitée à la séance et au contexte autorisés ; le brut historique conserve le floor 95 et ses alertes. Réponse favorable : évaluer l'exposition précédente, symptômes et microcycle ; aucune croissance de capacité ni reprise automatique.
''')

for dossier,row,label in zip(dossiers,rows[:2],['A','B'],strict=True):
 text=f"# Athlète {label} — quatre semaines, dossier coach\n\n{common}\n\nProfil `{row['caseId']}`, mêmes contraintes, capacité et ambition initiales. Tous les textes sources ci-dessous sont conservés. Les réservations ne prouvent ni l'exécution ni l'adaptation.\n\n"
 text+='## Priorités avant sélection\n\n'
 for r in row['search']['results']:text+=f"- {r['intention']['lever']['id']} : {r['intention']['lever']['reason']}\n  Adaptation : {r['intention']['adaptation']}. Conditions : {j(r['intention']['reasons'])}. Recettes pour examiner les preuves : {j(r['shortlistForEvidenceReview'])}.\n"
 for w in dossier['weeks']:
  text+=f"\n## S{w['week']} — {w['phase']} / {w['type']}\n\nBudget {w['budget']} min, réservées {w['reservedMinutes']} min. Répartition : {j(minutes(row)[w['week']-1])}.\n\n"
  for day in range(7):
   ss=[s for s in w['sessions'] if s['day']==day];text+=f"### {names[day]}\n\n"
   if not ss:text+='Repos prévu ; aucune compensation ajoutée.\n\n';continue
   for s in ss:
    text+=f"**{s['title']} — {s['sport']}, {s['minutes']} min** (`{s['sourceId']}`)\n\nStatut : `{s['state']}` ; enveloppe déclarée {s['capacity']} min ; dose approuvée : non.\n\nObjectif : {' ; '.join(s['physiologicalGoals'])}.\n\nMotif : {s['selectionReason']}.\n\nDéroulement d'origine intégral :\n\n"
    for part in s['originalStructure']:text+=f"- {part['part']} : {part['text']} (zones sources {j(part.get('zones',[]))})\n"
    text+=f"\nCibles calculables, candidates uniquement : `{j(s['targets'])}`.\n\n"
    if s['strictVariantExecution']:text+=f"Variante stricte : {s['strictVariantExecution']['variantInstructions']}. Z1 seulement ; l'interprétation et les limites individuelles restent à vérifier.\n\n"
    text+=f"Structure temporelle vérifiée pour contenu déclaré : {s['timing']['timingCompleteForDeclaredRecipe']}. Recette : `{j(s['recipe'])}`.\n\nRestrictions : {j(s['restrictions'])}.\n\nRefus durs : {j(s['hardFailures'])}.\n\nConditions complètes, récupération et interactions comprises :\n\n"
    for c in s['conditions']:text+=f"- `{c['id']}` ({c['kind']}, avant S{c['beforeWeek']}) : {' ; '.join(c['requiredEvidence'])}. Alternative/arrêt : {c['fallback']}.\n"
    text+=f"\nDécision coach : {s['coachDecision']}. Aucune réévaluation passée n'est simulée comme acquise.\n\n"
 text+=f"## Résultats de contrôles\n\nErreurs / avertissements bruts historiques : {j(issues(row))}, identiques au dossier V25 retenu. Les erreurs de portée 16 semaines, les alertes de floor autorisé, les inconnues de recette et les refus individuels restent séparés dans `fourWeekScope` et `floor.complementary`. Le statut reste NO-GO.\n"
 save('ATHLETE_'+label+'_FOUR_WEEK_PLAN.md',text)

text=f"# Comparaison A / B\n\n{common}\n\n"
text+='A : une limitation aérobie relative conduit à rechercher des recettes VO₂ vélo explicites, mais les conditions actuelles ne permettent pas leur insertion. Aucune allure course conflictuelle n’est remplacée. B : le TTE observé vélo oriente vers une exposition aérobie continue ; une longue vélo existante la sert déjà, sans prouver sa durabilité tardive ni justifier une hausse de dose.\n\n'
text+='| Semaine | Minutes A par discipline | Minutes B par discipline | Différence physique nouvelle V26 | Priorité / décisions |\n|---|---|---|---|---|\n'
for w,(a,b) in enumerate(zip(minutes(rows[0]),minutes(rows[1]),strict=True),1):text+=f"| {w} | {j(a)} | {j(b)} | aucune | A : VO₂ différé ; B : endurance à revoir ; {'récupération conservée' if w==4 else 'tolérance et réponse précédente requises'} |\n"
text+='\nLes séances identiques assurent les mêmes fréquences et rôles de base sous les mêmes contraintes. V26 ne revendique pas leur optimalité individuelle. Le placement différent B en S3 (jeudi facile45, vendredi longue90) est conservé ; aucun autre changement de jour/durée/source. Les intensités numériques peuvent différer selon les ancres existantes ; pour la course A, elles restent absentes à cause du conflit critique.\n\nPourquoi cette séance pour A ? Le mécanisme recherché est justifié comme hypothèse par son levier réel, mais aucune option VO₂ disponible ne franchit tous les contrôles. Pourquoi une prescription différente pour B ? Sa priorité observée concerne le maintien d’intensité vélo ; sa longue aérobie reste une option pertinente, avec prérequis et tolérance non attestés. Pourquoi mêmes volumes ? Aucune règle disponible ne justifie un dosage supplémentaire ou une réduction entre ces profils.\n'
save('PROFILE_A_B_COMPARISON.md',text)

trace=f"# Traces de décision\n\n{common}\n\n"
for row in rows[:3]:
 trace+=f"## {row['caseId']}\n\nEntrée figée : `{row['inputHash']}`. Trace complète : `evidence/validation-{attempt}/build/originals.json.gz`.\n\n"
 for r in row['search']['results']:
  trace+=f"### {r['intention']['lever']['id']} → {r['intention']['intent']}\n\n{r['intention']['adaptation']}. {r['explicitMatchingSources']} sources à intention explicite, sur {r['scannedCanonicalRecords']} parcourues.\n\n"
  for o in r['offers']:trace+=f"- `{o['key']}` : {o['minimumMinutes']} min témoin ; A/B/C/D = {j(o['layers'])} ; refus/conditions `{j(o['blockers'])}` ; source `{o['sourceHash']}` ; recette `{o['recipeHash']}`.\n"
trace+='\nLes preuves de famille V21 et les comparaisons protocolaires conservées ne satisfont jamais seules C ou D. La rubrique `contextualOffers` confronte les recettes aux vraies doses et états de chaque semaine ; aucune recherche massive de permutations.\n'
save('DECISION_TRACE.md',trace)

text=f"# Validation sportive et technique\n\n{common}\n\n"
text+='| Vérification exécutée | Résultat / portée |\n|---|---|\n'
for c in load(E/'commands.json'):
 import re
 log=(E/(c['name']+'.txt')).read_text();matches=re.findall(r'Tests\s+([^\n]+)',log);text+=f"| {c['name']} | code {c['status']} ; {matches[-1].strip() if matches else 'compilation TypeScript sans émission'} |\n"
text+=f"\nContrôle indépendant Python stdlib : {j({k:v for k,v in validation.items() if k not in ['profiles','logicalReplay']})}.\n\n"
text+='Les quatre semaines sont vérifiées avec les validateurs historiques inchangés et `validateFourWeekScopeV23`. Les huit calendriers conservés et leurs issues brutes sont exactement ceux du précédent dossier coach-floor, pas seulement les mêmes compteurs. Les floors, quotas, alertes de répétition et conflits course restent présents. A garde sept refus, C ses refus, et l’observation défavorable la suspension S2 sans compensation.\n\n'
text+='Les sensibilités restent distinctes des huit références :\n\n| Cas | Leviers calculés | Budget S1 | Refus individuels | Bloqueurs de contexte de dose |\n|---|---|---:|---:|---|\n'
for s in sensitivity:
 r=s['result'];text+=f"| {s['id']} | {', '.join(x['lever']['id'] for x in r['search']['intentionsBeforeSearch'])} | {r['retained']['calendar']['weeks'][0]['budget']} | {sum(d['state']=='not_admissible' for d in r['retained']['decisions'])} | {sum('actual_calendar_dose_exceeds_or_lacks_current_capacity' in w['blockers'] for c in r['contextualOffers'] for w in c['weeks'])} |\n"
text+='\nLe cas disponibilité réduite peut conserver une réservation en défaut : ce défaut est signalé, jamais renommé admissible. Retirer le contexte scientifique retire le dossier mécanistique, sans réécrire le calendrier. Un compte rendu favorable sans preuve d’adaptation laisse capacités et calendrier inchangés. Les 600 références ne sont pas rejouées ; la non-régression multiobjectifs disponible est exécutée.\n\nDeux essais initiaux attendaient à tort que la longue vélo franchisse tous les filtres. Le prérequis `ventilateur` les a fait échouer. Il est conservé ; une liste documentaire séparée, explicitement non admissible, remplace cette attente incorrecte. Les logs rouges sont archivés. Aucune règle sportive n’est assouplie.\n'
save('SPORTING_VALIDATION.md',text)

coach=f'''# Décisions coach réellement nécessaires

{common}

La dérogation de programmation 95→90 est déjà accordée dans son périmètre : aucune nouvelle autorisation de ce floor n'est demandée.

1. A : clarifier la référence course avec le chantier physiologique ; ne pas lever ses sept refus à partir d'un coût d'une autre fixture. Examiner la place future des intervalles vélo après revue des prohibitions/phase et seulement si la tolérance source-spécifique et l'ancre réelle sont documentées. Ne pas adopter automatiquement les exemples chiffrés des leviers TFCL.
2. B : vérifier les prérequis de la longue vélo, notamment ventilation si applicable au contexte réel, et la tolérance des vraies doses du calendrier. Le TTE frais ne démontre ni endurance sous fatigue, ni capacité à la nutrition/posture Ironman.
3. Pour les deux : interprétation des zones auteur, natation complète dans le créneau (CSS crawl seulement), tolérance posturale, compétence de mouvement, historique de récupération et interactions. La force de support ne devient pas une prescription de force maximale.
4. Conventions de dernier repos : les deux chronologies restent des propositions distinctes. Les études aiguës ou les revues actif/passif ne tranchent pas un repos source manquant et ne prouvent pas un gain chronique individuel.

Les dossiers A/B contiennent chaque séance et chaque condition. Une validation humaine individuelle n'a pas été effectuée. Aucun nouveau test terrain dosé ou nouveau questionnaire de charge n'est ajouté pour combler ces inconnues.
'''
for row in rows[:2]:
 coach+=f"\n## Propositions hors calendrier — {row['caseId']}\n\n"
 for r in row['search']['results']:
  for o in r['offers']:
   if o['key'] not in r['shortlistForEvidenceReview']:continue
   coach+=f"### {o['key']}\n\nIntention source : {j(o['explicitIntent'])}. Le témoin {o['minimumMinutes']} min démontre une structure, pas la dose de cet athlète.\n\n"
   for part in o['sourceInstructions']:coach+=f"- {part['part']} : {part['text']}\n"
   coach+=f"\nBloqueurs conservés : {j(o['blockers'])}. Variante objectif : {o['goalVariant']} ; statut : {o['goalVariantResolution']}.\n\n"
   if o['editorial']:coach+=f"Conventions nouvelles non approuvées : {j(o['recipe']['changes'])}.\n\n"
   for comparison in o.get('documentaryComparisons',[]):
    coach+=f"Littérature déjà examinée V21C, PMID {comparison['PMID']}, DOI {comparison['DOI']} ; accès : {comparison['access']}. Résultat : **{comparison['comparisonStatus']}**.\n\nCe que l'étude soutient : {comparison['supportableClaim']}.\n\nCe qu'elle ne soutient pas : {comparison['unsupportedClaims']}.\n\nDonnées individuelles supplémentaires : {comparison['additionalIndividualData']}. Empreinte de l'artefact effectivement récupéré : `{comparison['artifactHash']}`. Aucun nouveau texte primaire lu en V26.\n\n"
   coach+='Décision attendue : conserver le refus/la condition tant que les prérequis et la portée ne sont pas résolus ; aucune dose approuvée par cette page.\n'
save('COACH_REVIEW.md',coach)

save('NOLIO_SIMULATION.md',f'''# Sérialisation locale Nolio

{common}

Réutilisation des fonctions V18/V19 de contrat local, aucune requête réseau. {validation['knownSourceTextNolioMocks']} textes sources sont sérialisés sur les 60 réservations examinées, {validation['sourceTextRefusals']} refus explicites. Les instructions de chaque source sérialisée sont vérifiées intégralement présentes.

Ces sorties sont des fixtures de texte source, pas un export du calendrier. Le créneau réservé et le témoin générique source sont conservés séparément. Les dates synthétiques de test de contrat ne sont pas présentées comme les dates d'une prescription envoyée. Aucune fiche incomplète n'est présentée comme workout structuré complet.

Les candidates éditoriales utilisent leur recette complète distincte pour le test texte ; le format structuré est refusé lorsque l'ancre spécifique, la portée de zone ou les instructions ne sont pas résolues. Aucun faux contrat Nolio v2, aucune réduction multidisciplinaire, aucune activation de sender. Les 15 fixtures précédentes restent inchangées.
''')

text=f"# Avant / après V25\n\n{common}\n\n| Capacité | V25 / coach-floor | V26 exécutée |\n|---|---|---|\n| Leviers → candidats | familles et listes fixes, transport partiel | recherche exhaustive en lecture de 920 sources, intention explicite + discipline |\n| Recettes alternatives VO₂ A | pas de dossier source conditionné par le levier | deux chronologies complètes distinctes, toutes restrictions conservées |\n| Priorité B | placement retenu, longue commune | rôle long identifié et doses réelles confrontées à structure/capacité/conditions |\n| C / science absente | refus à préserver | absence de données et retrait de contexte empêchent la sélection |\n| Métadonnées #425 | contexte de coût séparé | précontrôle discipline/C8/domaine, cinq scénarios ; aucune injection native |\n| Calendriers physiques | dérogation coach90 + placement B | exactement identiques ; zéro substitution nouvelle non validée |\n| Approbations individuelles | zéro | zéro |\n\n"
text+='Le gain démontré est la sélection documentaire de stimuli et recettes par le profil avec motifs reproductibles de non-prescription. Il ne s’agit pas encore d’une différenciation de séances effectivement autorisées. Le facteur bloquant est documenté : aucune recette VO₂ vélo à intention explicite n’est applicable et individuellement étayée dans la phase base de A, et la longue B garde prérequis et inconnues. Un stimulus différent ne justifie pas d’inventer une capacité ou de changer la méthodologie.\n\n'
text+='Contrat #425 : source relue sans import de code. Une référence correctement typée de la sonde documentaire indépendante est consommée uniquement comme contexte à revue ; incertaine/absente/discipline inconnue/historique non attesté restent en hold. Les ancres natives, paramètres physiologiques et refus A/B/C ne changent pas. La confiance heuristique0,95 ne devient pas une mesure labo ; Supabase réel n’est pas testé.\n'
save('BEFORE_AFTER_V25.md',text)

save('REPRISE.md',f'''# Reprise V26

{common}

Départ : {state['startedAt']}. Deadline stricte : {state['deadline']}. Budget unique60 minutes et10 unités, aucune relance automatique. Le fichier `state.json` porte l'état final des unités et le nombre de validations ; ne pas relancer cette mission clôturée sans nouveau mandat.

Sources exécutées : `evidence/validation-{attempt}/executed-source-pins.json`. Résultats et rejeu : `evidence/validation-{attempt}/build` / `replay`. Vérificateur indépendant : `scripts/det-engine/v26-independent.py`. Générateur de ces dossiers : `scripts/det-engine/v26-report.py`. Archives rouges : `evidence/development-1` et `development-2` ; passage intermédiaire : `development-3`.

Prochaine étape technique autorisable : améliorer les annotations explicites d'intention source après revue, puis confronter une proposition source/phase réellement admissible au microcycle entier. Ne pas utiliser une comparaison familiale comme approbation de dose. Aucun besoin de redemander le floor déjà accordé.

Conditions avant prescription individuelle : résolution ou refus persistant des références course, prérequis source, protocole complet/intensités, tolérance et récupération documentées, revue coach. #425 reste candidat et C8 / persistance réelle non validés. Aucun déploiement, export réel ou approbation implicite.
''')
print('12 V26 documents rendered from verified artifacts')

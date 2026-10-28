"""Render coach-review evidence; prospective completeness is never labelled sporting approval."""
from pathlib import Path
import json,gzip,re,hashlib,time,collections
R=Path('docs/det-engine/v14'); E=R/'evidence/final'
state=json.loads((R/'state.json').read_text());assert time.time()<state['deadline']
study=json.load(gzip.open(E/'study.json.gz','rt'));rep=json.loads((R/'evidence/reproducibility.json').read_text());commands=json.loads((R/'evidence/validation/commands.json').read_text())
delta=json.loads((R/'evidence/reassessment-delta/commands.json').read_text());assert len(delta['proof'])==2 and all(c['exitCode']==0 for c in delta['proof'])
assert rep['identical'] and len(commands)==4 and all(c['exitCode']==0 for c in commands)
for row in rep['comparison']:assert hashlib.sha256((E/row['file']).read_bytes()).hexdigest()==row['first']==row['replay']
rows=study['rows'];native=[r for r in rows if r['model']=='native_floor_conditional'];hold={r['profile']:r for r in rows if r['model']=='hold_current_envelope'}
def put(name,s): (R/name).write_text(s.strip()+'\n')
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','|'+'|'.join('---'for _ in headers)+'|']+['| '+' | '.join(str(v).replace('|','/')for v in row)+' |'for row in rows])
counts={}
for label,file in [('experimental',R/'evidence/reassessment-delta/experimental.txt'),('historical',R/'evidence/validation/historical.txt'),('targeted',E/'tests.txt')]:
 m=re.search(r'Tests\s+(\d+) passed(?:\s*\|\s*(\d+) skipped)?(?:\s*\|\s*(\d+) todo)?',file.read_text());assert m,label
 counts[label]={'passed':int(m[1]),'skipped':int(m[2]or 0),'todo':int(m[3]or 0),'evidence':str(file.relative_to(R))}
counts.update(types='passed',governancePassed=62,targetedOverlapsExperimental=True)
(R/'validation-summary.json').write_text(json.dumps(counts,indent=2)+'\n')
put('CONDITIONAL_PROGRESS_CONTRACT.md','''# Contrat de progression conditionnelle — candidat V14

Les trois états portent sur un créneau et son périmètre de preuve. Aucun ne vaut approbation opérationnelle ou revue experte. `actualApprovedPlan=null` demeure pour tous les calendriers.

| État | Signification | Conséquence |
|---|---|---|
| currently_admissible | Dose compatible avec les données et éléments de source actuellement étayés dans le périmètre testé | Revue coach toujours nécessaire ; aucune autorisation globale de plan |
| conditional_pending_reassessment | Cible prospective avec au moins une preuve manquante : capacité future, temps complet, prérequis, compétence, récupération ou interaction | Ne pas exécuter comme prescription approuvée ; satisfaire les conditions avant le créneau ou replanifier |
| not_admissible | Dose actuelle au-delà de l’enveloppe, contre-indication/défaut dur, réponse adverse non résolue ou donnée numérique/portée invalide | Refus ou suspension ; ne pas maquiller le défaut en simple condition future |

Une dose future dépassant une enveloppe actuelle peut devenir une **intention conditionnelle**, jamais une capacité acquise par le passage du temps. À échéance, une nouvelle évaluation doit documenter la capacité pertinente, le protocole complet, les symptômes et la récupération, ainsi que les interactions du microcycle. Une dose déjà excessive aujourd’hui est refusée. Les contre-indications et incohérences de catalogue démontrées restent bloquantes.

Chaque condition enregistre identifiant, nature, semaine limite, preuves requises et repli. Chaque créneau conserve capacité actuelle, minutes envisagées, source inchangée, dose de recette lorsqu’elle est connue, état et justification. Les champs sont un contrat offline de preuve ; aucune interface, questionnaire de charge ou donnée athlète de production n’est créé.

La résolution synthétique exige une preuve explicitement fictive, datée et applicable à la bonne source, au bon créneau et à la bonne semaine. Une recette tronquée, une réponse inconnue, un protocole différent, une preuve future/périmée ou une capacité insuffisante ne résout pas la condition. Une réponse adverse reste en suspension, y compris si un enregistrement favorable est ajouté ensuite. Une réévaluation valide explicitement insuffisante refuse la dose à échéance ; absence de preuve et refus établi restent distincts. Le simulateur n’est pas un mécanisme d’approbation réelle. Ses observations sont des assertions de scénario, sans mécanisme d’authentification ou d’ingestion de mesures individuelles réelles ; elles testent uniquement la décision logicielle sous ces hypothèses.

La validation recalcule les états, les bornes, la source originale et la correspondance calendrier/créneau ; une promotion falsifiée de conditional vers currently est détectée. Aucun contrat historique n’est supprimé, ni son niveau de sévérité modifié.
''')
text='''# Réévaluation scientifique et modèles de progression

La chaîne reste **profil → limiteur → adaptation prioritaire → stimulus → dose candidate → récupération → réévaluation**. Les données sont celles des deux cas synthétiques V10, avec la seule réconciliation de budget V13 réutilisée : 10 h, même ambition finisher, même niveau qualitatif trained et mêmes disponibilités. Les enveloppes actuelles vélo/course restent180/75 et150/90 min. Les tests terrain et incertitudes sont conservés ; un TTE frais ou une estimation de VLamax ne démontre pas la durabilité sous fatigue.

## Fondements et limites

- **M21, Maunder et al.2021** : la durabilité concerne la dégradation lors d’un effort prolongé. Cela justifie d’examiner une exposition prolongée et sa réponse ; cette revue ne valide aucune progression75→90,90→95 ou95→100 min.
- **I20, Impellizzeri et al.2020** : une règle universelle de progression ou un ratio de charge ne constitue pas un certificat causal de sécurité. Aucune règle10% n’est créée ici. Les plafonds natifs configurés restent contrôlés comme conventions de programmation.
- **L175/L417, Lorang** : besoin du moment, historique, feedback, capacités individuelles et équilibre entre séances. Sources de coaching/shownotes selon V8, pas des essais contrôlés prouvant ces minutes ni une loi VLamax→dose.
- **W23, Wang et al.2023** : diminution de volume et conservation possible de rappels d’intensité/fréquence dans les populations étudiées. Ni un pourcentage universel, ni une activation obligatoire à chaque semaine n’en découle.
- **LL24** : des méthodes de force peuvent améliorer l’économie dans certaines conditions ; le circuit de stabilité proposé ne démontre ni une force maximale prescrite, ni un gain individuel d’économie.

Voir la [matrice scientifique V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md), sa bibliographie et les [limites d’attribution à Lorang](../v8/LORANG_METHODOLOGY.md). Aucune nouvelle revue systématique ni lecture intégrale supplémentaire n’est revendiquée en V14.

## Trois variantes bornées, aucune supériorité démontrée

| Modèle | Cible | Avantage prospectif | Limite |
|---|---|---|---|
| native_floor_conditional | Conserver les minima individualisés natifs comme cibles, soumises aux réévaluations | Relie calendrier, objectif et points de décision sans inventer de capacité | Minutes exactes = convention TFCLab, pas minimum physiologique prouvé |
| hold_current_envelope | Rester dans l’enveloppe actuellement documentée | Repli explicite lorsque la progression n’est pas confirmée | Conserve les écarts historiques de plancher et ne garantit pas la spécificité Ironman |
| blockwise_reassessment | Examiner la cible maximale du bloc en début de bloc, puis maintien | Permet de comparer une consolidation sans hausse hebdomadaire automatique | Cible plus forte plus tôt ; aucune preuve qu’elle soit préférable ou tolérable, non promue comme défaut |

La natation, les sources, disponibilités et garde-fous sont comparés à cohorte constante. Les variantes ne sont pas des athlètes supplémentaires. Le modèle par bloc conserve une alerte historique de progression supplémentaire pour l’aérobie ; cet essai reste candidat avec son incertitude, jamais promu au motif qu’il est assemblable.

'''
text+=table(['Profil/modèle','Course longue S1/S2/S3','S5/S6/S7','S9/S10/S11','Écarts de plancher conservés'],[[r['profile']+' / '+r['model'],'/'.join(str(next(s['minutes']for s in r['weeks'][n-1]['slots']if s['role']['sport']=='run'and s['role']['kind']=='long'))for n in [1,2,3]),'/'.join(str(next(s['minutes']for s in r['weeks'][n-1]['slots']if s['role']['sport']=='run'and s['role']['kind']=='long'))for n in [5,6,7]),'/'.join(str(next(s['minutes']for s in r['weeks'][n-1]['slots']if s['role']['sport']=='run'and s['role']['kind']=='long'))for n in [9,10,11]),len(r['validation']['candidate']['programmingShortfalls'])]for r in rows])
text+='''

La hausse60→65→75 min initiale de l’aérobie est issue des planchers natifs sous l’enveloppe75, pas d’une adaptation présumée. L’autre profil privilégie une exposition course90 min déjà documentée dans sa fiction d’historique. Les différences de répartition en S1 sont expliquées par ces priorités et enveloppes, avec le même budget480 min natif ; seules les recettes chronométrées réellement flexibles peuvent être réduites pour tenir ce budget. Les nages inconnues ne sont pas raccourcies pour équilibrer le total.

**75→90 en S5,90→95 en S6 puis100** deviennent des décisions de réévaluation, pas des doses libérées. Il faut une nouvelle enveloppe explicitement argumentée par le coach, des efforts comparables, une exécution complète et une récupération compatible avec toute la semaine. Si la capacité reste75 ou90, le témoin de maintien reste disponible avec ses manques ; en cas de symptôme/récupération adverse, l’action est une suspension, pas une réduction automatiquement réputée sûre.

## Périodisation, récupération et affûtage

Les phases et types natifs sont conservés, identiques entre profils de même objectif/niveau mais avec doses et priorités différentes. S4/S8/S12 réduisent fréquences et réservations ; cette réduction ne prouve pas une récupération obtenue. La semaine S13 est de phasebuild mais de typetaper, suivie de trois semaines de phasetaper. Ce chevauchement et la longueur de l’allègement restent visibles ; les résultats W23 ne démontrent pas que ces quatre semaines natives sont optimales.

L’affûtage de ce prototype reste essentiellement facile. Aucun rappel intense n’est ajouté pour satisfaire un quota, et aucun principe n’interdit universellement de tels rappels. Leur place, la fatigue résiduelle, la préparation spécifique et la proximité de compétition nécessitent une revue indépendante. Les sources de position gardent leurs répétitions/repos ; une prescription répétée ne prouve ni confort ni adaptation posturale. Les justifications par créneau et tous les changements sont archivés dans `study.json.gz` sous `rationale`.
'''
put('SCIENTIFIC_REASSESSMENT.md',text)
text='''# Audit ciblé des sources nécessaires

Ce périmètre examine les fiches effectivement retenues dans les six calendriers. Il ne généralise pas une preuve de durée aux302 sources non couvertes en V13. Les fiches de production et les validateurs restent inchangés ; leur empreinte est conservée.

'''
text+=table(['Source','Annonce min','Intervalle pour tous les éléments déclarés','Temps complet encore conditionnel','Méthode'],[[a['sourceId'],a['originalRange'],a['declaredContentRange'],'oui'if not a['timingCompleteForDeclaredRecipe']else'exécution/réponse individuelle toujours à revoir',a['proof']or'V13 : couverture insuffisante, tous les éléments restent présents']for a in study['targetedCatalogue']])
text+='''

SEILER_BIKE_Z1_LONG comporte90–180 min avec échauffement/retour explicitement intégrés. Les15+15 min ne sont pas ajoutées une seconde fois ; le haut210 annoncé n’est pas pris comme preuve de recette210. Les références et pourcentages d’auteur dans le texte source restent des éléments du catalogue, pas une nouvelle doctrine V14 ; le domaine d’intensité est référencé à tfclDoctrine.

Pour A_RUN_Z2_EASY, V14 garde l’option5 min d’éducatifs :10 min initiales +20–70 min principales +5 min finales +5 min éducatifs =40–90 min. Le bloc principal choisi est explicite, aucun bloc obligatoire n’est tronqué. Les sources contenant une seule prescription continue clairement bornée sont auditées pour **tout leur contenu déclaré** ; cela n’invente aucun échauffement supplémentaire ni capacité individuelle.

Les blocs aéro6×10 avec repos5 conservent85–90 min quantifiées au minimum selon le dernier repos ; leur recette complète reste conditionnelle. Les fiches de récupération vagues, les répétitions de force et les protocoles de nage ne deviennent pas chronométrés par leur seul intervalle catalogue.

## Natation

La nage multi-nages2000 m en45 min de V13 n’est pas conservée comme preuve. En base, la fiche A_SWIM_CONTINUOUS_2K est réservée à55 min et reste conditionnelle :400 m multi-nages +2000 m continus +200 m dos =2600 m, temps périphériques et exécution individuelle inconnus. La technique C_SWIM_CATCH_FOCUS est distincte. En build, A_SWIM_TRI_END_2500 conserve400 m +4×50 m +2000–2500 m principaux +200 m :2800–3300 m, avec repos des éducatifs conservés. La réservation50 min est **une cible à vérifier, jamais une faisabilité individuelle démontrée** ; si la source complète ne tient pas, ce créneau ne doit pas être exécuté ainsi et la semaine doit être replanifiée, sans tronquer les distances.

Les autres créneaux réduits utilisent des sources de récupération/technique effectivement offertes dans les contextes correspondants. Pour aucune nage, le CSS de crawl90 de l’aérobie n’est transféré au dos/brasse ; le CSS manquant de l’équilibré n’est pas inventé. Il n’existe pas de solution déclarée actuellement admissible pour ces créneaux. Les horaires sont des réservations conditionnelles, pas une mesure de dose interne.

## Spécificité différée

Le brick de transition V13 reste55 min actives, durée totale inconnue. Le candidat BRICK_STAGE2_BUILD distingue75–105 min vélo et20–30 min course, sans imputer les transitions à zéro. Il n’est pas inséré sans capacité combinée, temps complet, budget et récupération établis. La nutrition est un objet de revue et d’observation sur efforts prolongés, sans quantité ni tolérance GI inventée. La stabilité du tronc ne vaut pas une force maximale correctement prescrite.
'''
put('REQUIRED_CATALOGUE_AUDIT.md',text)
# Concrete calendars: all seven days, no approved dose hidden in the numeric projection.
for r in native:
 slug='IRONMAN_AEROBIC_16W.md'if'aerobic'in r['profile']else'IRONMAN_BALANCED_16W.md'
 s=f'''# {r['profile']} —16 semaines prospectives conditionnelles

**NON APPROUVÉ — NO-GO.** Chaque minute ci-dessous est une réservation candidate. Le calendrier est complet, l’admissibilité actuelle du plan ne l’est pas. Une compétition déclarée garde une durée inconnue. Les sources et détails complets, recettes et justifications figurent dans les artefacts, sans substitution de données réelles.

'''
 s+=table(['S','Phase/type','Total réservé','Natation','Vélo','Course','Soutien/force','Budget','Créneaux conditionnels'],[[w['week'],w['phase']+'/'+w['type'],w['reservedMinutes'],*[sum(z['minutes']for z in w['slots']if z['role']['sport']==sport)for sport in ['swim','bike','run','strength']],w['budget'],sum(z['decision']['state']=='conditional_pending_reassessment'for z in w['slots'])]for w in r['weeks']])
 s+='\n\n## Calendrier détaillé\n\n'
 for w in r['weeks']:
  s+=f'\n### S{w["week"]} —{w["phase"]}/{w["type"]}\n\n'
  dayrows=[]
  for day in w['days']:
   slots=[z for z in w['slots']if z['day']==day['day']]
   if slots:
    for z in slots:dayrows.append([['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][day['day']],z['card']['id'],z['minutes'],z['role']['purpose'],z['decision']['state'],', '.join(c['id']for c in z['decision']['conditions'])or'aucune condition non résolue dans le périmètre logiciel ; revue coach requise'])
   elif day['kind']=='event':dayrows.append([['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][day['day']],'Compétition Ironman déclarée','inconnue','événement distinct de l’entraînement','préparation/readiness non attestée','revue avant compétition ; aucune durée imputed'])
   else:dayrows.append([['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][day['day']],'Repos prévu',0,'récupération à observer','pas de dose','ne prouve pas une récupération obtenue'])
  s+=table(['Jour','Source','Minutes réservées','But','État','Décision avant séance'],dayrows)+'\n'
 s+='''

Les jours de repos, l’espacement des longues et les disponibilités respectent les contraintes candidates testées ; cela ne certifie pas la tolérance de fatigue cumulée. Une preuve manquante entraîne une condition en attente ; une réponse adverse entraîne une suspension. L’alternative de maintien doit être contrôlée sur toute la semaine, avec les défauts de spécificité conservés. Aucun export opérationnel n’est autorisé par ces calendriers.
'''
 put(slug,s)
text='''# Points de décision et alternatives

Les réévaluations sont obligatoires **avant** chaque créneau dont une condition demeure, pas après une augmentation automatique. Les calendriers détaillent tous les identifiants de condition. Le tableau ci-dessous cible les longues courses des semaines de développement ; les autres conditions de source, de posture, de compétence et de récupération ne sont pas omises.

'''
text+=table(['Profil','S','Dose actuelle documentée','Cible course longue','État','Si la capacité ne progresse pas'],[[r['profile'],w['week'],z['role']['currentCapacity'],z['minutes'],z['decision']['state'],'maintien source-compatible ≤'+str(z['role']['currentCapacity'])+' seulement après revue de toute la semaine ; écarts natifs conservés, sinon suspension']for r in native for w in r['weeks']for z in w['slots']if z['role']['sport']=='run'and z['role']['kind']=='long'])
text+='''

Un succès à un test terrain frais ne suffit pas à établir la capacité sur effort prolongé. La réévaluation documente protocole, dates, conditions comparables, exécution, symptômes, fatigue et récupération, puis l’enveloppe effectivement retenue par le coach. Une absence de données ou un résultat contradictoire conserve l’attente. Le contrat ne calcule pas la nouvelle capacité depuis un nombre de semaines, une baisse de FC ou un pourcentage.

La réponse adverse suspend le sport concerné dans la trajectoire simulée, sans substitution automatique par une séance plus courte. Le scénario sans gain conserve l’ancienne enveloppe ; le modèle complet de repli est construit et validé séparément, avec ses défauts historiques de plancher visibles. Ce repli ne préserve pas automatiquement la préparation spécifique ni l’objectif Ironman. Les autres séances ne sont ni rallongées pour compenser ni supposées innocentes face à une fatigue réelle.
'''
put('DECISION_POINTS.md',text)
text='''# Trajectoires synthétiques — aucune adaptation réelle démontrée

Les observations favorables sont **stipulées fictivement**, source par source, séance par séance et semaine par semaine. Elles ne sont ni mesurées ni prédites par le moteur. Les nombres ci-dessous testent le contrat de décision ; ils ne sont pas des taux de réussite sportive.

'''
text+=table(['Profil','Trajectoire','Admissibles dans la fiction','Conditions restantes','Refus/suspensions dans la fiction','Approbation réelle'],[[p['profile'],s['trajectory'],s['counts']['currently_admissible'],s['counts']['conditional_pending_reassessment'],s['counts']['not_admissible'],'aucune']for p in study['profiles']for s in p['simulations']])
text+='''

- Favorable : chaque condition est supposée satisfaite avec une preuve synthétique applicable ; le calendrier prospectif initial et ses deux erreurs historiques de ratio restent inchangés. Aucun plan n’est réellement approuvé et aucune pertinence physiologique n’est démontrée.
- Sans gain de capacité : les enveloppes restent75/90 min ; les six/cinq doses arrivées à échéance au-dessus de l’enveloppe réévaluée sont refusées dans la fiction. Le maintien complet conserve six/cinq non-conformités de plancher.
- Inconnue : aucun rapport n’est fourni ; les104 conditions de créneau restent ouvertes pour chaque profil. Le seul créneau actuellement admissible ne libère pas le plan.
- Adverse : suspension à partir de la première réévaluation de longue course non résolue, propagée aux expositions ultérieures du sport concerné ; aucune nouvelle augmentation ou substitution automatiquement approuvée.

Les autres dimensions de ces trajectoires sont également hypothétiques : temps complet des nages, compétence musculaire et posturale, prérequis et récupération. Une réponse favorable à la seule durée de course ne suffirait pas à résoudre ces dimensions. Les alternatives ont été vérifiées comme calendriers complets, pas comme modifications locales déclarées sûres.
'''
put('SCENARIOS_AND_ALTERNATIVES.md',text)
# Preserve raw historical outcomes, including unchanged severities.
(R/'historical-issues.json').write_text(json.dumps([{'profile':r['profile'],'model':r['model'],'issues':r['validation']['historical']['issues']}for r in rows],ensure_ascii=False,indent=2)+'\n')
text='''# Validation réellement exécutée

Complétude prospective, admissibilité actuelle, conformité historique, conditions et revue humaine sont mesurées séparément. Les historiques sont évalués sur les réservations candidates avec événement de durée inconnue ; les résultats ne deviennent pas un certificat d’exécution.

'''
text+=table(['Profil/modèle','Calendrier prospectif complet','Créneaux admissibles actuellement','Conditionnels','Refus de créneau','Erreurs historiques','Avertissements historiques','Écarts de plancher'],[[r['profile']+'/'+r['model'],r['prospectiveCalendarComplete'],r['currentlyAdmissibleSlots'],r['conditionalSlots'],r['notAdmissibleSlots'],r['validation']['historical']['blocking'],r['validation']['historical']['warnings'],len(r['validation']['candidate']['programmingShortfalls'])]for r in rows])
text+='''

## Lectures et limites

- **Structure prospective** :16 semaines,112 jours, sources et doses candidates associées à tous les rôles requis, disponibilités, repos, budget et espacement des longues vérifiés. Aucun trou n’est transformé en repos pour prétendre compléter un rôle absent.
- **Sources** : identités/contenus, durées originales, bornes ciblées, niveaux, phases et contextes testés ; aucun défaut de source détecté par les contrôles exécutés sur la sélection finale. La chronologie inconnue reste une condition, pas un contrôle passé.
- **Projection technique historique** : le schéma d’export réclame une durée numérique à l’événement ; sa durée inconnue n’est pas fabriquée en0. Il reste donc une erreur de portée d’export par calendrier. Le calendrier prospectif peut être complet sans être un payload opérationnel techniquement valide.
- **Historique sportif** : deux erreurs de ratio par fréquence demeurent pour les modèles à cible native/par bloc. Natation et vélo sont chacun33% des séances d’endurance, en conflit avec les proportions historiques ; ces alertes ne sont ni retirées ni changées de sévérité. Les observations de minutes réservées sont calculées séparément par les vrais blocs de génération, sans prétendre mesurer la dose interne ou résoudre automatiquement le débat méthodologique.
- **Maintien** : conserve en plus les six/cinq erreurs de plancher. Le repli n’est pas présenté conforme au contrat Ironman historique.
- **Avertissements** : dérive du gabarit de placement, répétition, prescription non entièrement vérifiée, auto-déclaration des séances clés, cohérence de phase/quota restent consultables dans historical-issues.json. Le modèle par bloc ajoute une alerte de progression pour l’aérobie ; aucune supériorité ne lui est attribuée.
- **Global** : budgets coach et contrôles de continuité/charge configurés sont exécutés sur toute la chronologie, ainsi que l’audit candidat de diminution d’affûtage. Leurs passages ne prouvent ni récupération réelle ni adaptation ni préparation à la compétition.
- **Réponse réelle et revue experte** : non effectuées. Les scénarios synthétiques ne sont jamais agrégés aux résultats actuels ni aux600 configurations historiques.

'''
text+=table(['Suite','Passés','Ignorés','Todo'],[['Gouvernance',62,0,0]]+[[k,v['passed'],v['skipped'],v['todo']]for k,v in counts.items()if isinstance(v,dict)])
text+='''

Typage réussi. Les tests ciblés de preuve recouvrent la suite expérimentale et son opt-in : ils ne s’additionnent pas comme couverture indépendante. Les600 références ne sont pas régénérées en nouveaux plans V14. Deux processus offline indépendants produisent trois artefacts identiques ; les empreintes de source et références sont conservées.

Une correction finale de contexte relatif a suivi la validation initiale complète : typage et toute la suite expérimentale ont été rejoués ; les sources/entrées historiques sont byte-identiques. Les fiches «lendemain» ne peuvent plus être placées après un jour de repos connu, et une source exigeant une séance clé n’est pas utilisée si cette séance est absente. Leurs échecs intermédiaires sont conservés.

La correction de contexte ajoute un avertissement net layout_drift en S13 par calendrier (trois messages ajoutés/deux retirés), sans nouvelle erreur critique. Le coût de gabarit, ses messages et les inconnues de récupération restent visibles dans evidence/relative-context-comparison.json ; ce compromis technique ne vaut pas validation sportive.

Une dernière régression sémantique a été reproduite avant correction : le scénario sans gain traitait une enveloppe réévaluée insuffisante comme simple attente. Il refuse désormais explicitement la dose à échéance, sans modifier les capacités ou le calendrier prospectif. Le témoin rouge est conservé, puis typage et suite expérimentale entière rejoués.

Les essais rejetés restent archivés : créneaux de nage absents dans certains contextes, duplications puis incompatibilité de cible/source en S13, erreur intermédiaire de typage du témoin incomplet. Les corrections ont porté sur sélection, réservation compatible et typage, sans modifier les validateurs ni leurs seuils.
'''
put('VALIDATION.md',text)
dashboard={'version':'det-v14-1','recommendation':'NO-GO','distinctSyntheticProfiles':2,'modelsEach':3,'prospectiveCalendars':len(rows),'completeProspectiveCalendars':sum(r['prospectiveCalendarComplete']for r in rows),'currentlyAdmissibleCompletePlans':0,'operationallyApprovedPlans':0,'humanExpertReviewed':0,'sourceAuditCount':study['sourceCount'],'rows':[{'profile':r['profile'],'model':r['model'],'complete':r['prospectiveCalendarComplete'],'currentlyAdmissibleSlots':r['currentlyAdmissibleSlots'],'conditionalSlots':r['conditionalSlots'],'notAdmissible':r['notAdmissibleSlots'],'historicalBlocking':r['validation']['historical']['blocking'],'historicalWarnings':r['validation']['historical']['warnings'],'nativeFloorShortfalls':len(r['validation']['candidate']['programmingShortfalls']),'technicalProjectionValid':r['validation']['technicalProjection']['valid']}for r in rows],'simulationCountsAreNotActualResults':True,'tests':counts,'reproducibility':rep}
(R/'dashboard.json').write_text(json.dumps(dashboard,indent=2)+'\n')
text=f'''# Résultats V14 — DRAFT / NO-GO

**Six calendriers prospectifs conditionnels complets de16 semaines sont produits pour deux profils synthétiques et trois modèles. Aucun plan complet actuellement admissible ou approuvé n’est produit.**

La V13 refusait le plan sous les capacités actuelles. V14 conserve ces capacités mais autorise des intentions futures explicitement conditionnelles, avec preuves requises et alternatives. Il ne prétend pas avoir transformé les refus V13 en prescriptions validées.

- Trois états explicites : currently_admissible, conditional_pending_reassessment, not_admissible.
-105 créneaux par calendrier :1 actuellement admissible dans le périmètre testé et104 conditionnels ; aucune approbation réelle, y compris dans le scénario favorable.
-Cibles natives de course90 en S5,95 en S6 puis100 min conservées comme conventions de programmation, pas capacités acquises. Le maintien75/90 min conserve ses six/cinq écarts historiques.
-Audit ciblé de{study['sourceCount']} sources réellement retenues, contenus complets préservés. Aucune nage2000 m en45 min artificiellement certifiée ; les nages alternatives restent conditionnelles tant que les temps/protocoles individuels ne sont pas établis.
-Disponibilités, budgets, continuité des disciplines, sources distinctes et contrôles globaux exécutés sur les16 semaines. Les erreurs historiques de ratio, avertissements et inconnues restent visibles.
-L’événement Ironman conserve une durée inconnue : le schéma historique d’export reste non satisfait sur ce point. Complétude prospective ne vaut ni validité de payload opérationnel ni conformité sportive.

Typage réussi ;62 tests de gouvernance ;{counts['experimental']['passed']} expérimentaux réussis ({counts['experimental']['skipped']} opt-in ignorés) ;{counts['historical']['passed']} historiques réussis ({counts['historical']['skipped']} ignoré,{counts['historical']['todo']} todo). Deux processus reproduisent exactement trois artefacts. Les tests ciblés recouvrent la suite ; aucune validation scientifique individuelle ou revue humaine n’en est déduite.

Les briques de force maximale, nutrition individualisée, capacité combinée des bricks et préparation spécifique finale ne sont pas inventées pour remplir le calendrier. Elles restent différées ou conditionnelles aux prérequis ; la stabilité du tronc, la présence des disciplines et un volume allégé ne prouvent pas leur efficacité ou une récupération obtenue.

## Décisions réellement nécessaires

1. Revue indépendante des cibles de progression et des critères de réévaluation, puis preuves individuelles avant toute libération de dose.
2. Exécution chronométrée complète des nages, compétence/posture, capacité des longues, récupération et interactions documentées ; aucune nouvelle valeur n’est imputée.
3. Revue des contradictions historiques de ratios, de la spécificité finale et du contexte d’affûtage natif ; aucun changement de doctrine ou de validateur n’est promu automatiquement.

Les références V2–V13 et les600 configurations restent intactes. Aucun moteur actuel, validateur de production, donnée réelle ou Nolio n’est modifié. Aucune fusion, migration, publication Lovable, déploiement ou API payante. La mission V14 est bornée à dix unités/60 minutes ; aucune relance permanente n’est revendiquée.
'''
# Keep valid Markdown list spacing and readable numeric prose in this generated overview.
text=text.replace('\n-105','\n-105').replace('\n-Cibles','\n- Cibles').replace('\n-Audit','\n- Audit').replace('\n-Disponibilités','\n- Disponibilités').replace('\n-L’événement','\n- L’événement').replace('\n-105','\n- 105')
put('V14_RESULTS.md',text)
put('README.md','''# DET-ENGINE V14 — prospective conditionnelle, NO-GO

La complétude du calendrier est distincte de l’admissibilité actuelle, des conditions futures et de la conformité sportive. Deux profils synthétiques, trois modèles chacun ; aucune nouvelle disponibilité Coach Preview ou autorisation d’entraînement n’est attestée.

- [Résultats V14](V14_RESULTS.md)
- [Contrat à trois états](CONDITIONAL_PROGRESS_CONTRACT.md)
- [Réévaluation scientifique et comparaison des modèles](SCIENTIFIC_REASSESSMENT.md)
- [Audit des sources effectivement nécessaires](REQUIRED_CATALOGUE_AUDIT.md)
- [Calendrier aérobie16 semaines](IRONMAN_AEROBIC_16W.md)
- [Calendrier équilibré16 semaines](IRONMAN_BALANCED_16W.md)
- [Points de décision](DECISION_POINTS.md)
- [Scénarios et alternatives](SCENARIOS_AND_ALTERNATIVES.md)
- [Validation et limites](VALIDATION.md)
- [État de reprise](REPRISE.md)

Les détails structurés complets sont dans evidence/final/study.json.gz ; calendriers seuls dans calendars.json.gz. Aucune preuve réelle n’est créée par un scénario favorable.
''')
print(json.dumps({'calendars':len(rows),'complete':sum(r['prospectiveCalendarComplete']for r in rows),'actualApproved':0,'sources':study['sourceCount'],'tests':counts,'replay':rep['identical']}))

"""Coach-facing dossier from immutable V14 evidence; not a new prescription or a human expert review."""
from pathlib import Path
import json,gzip,csv,collections,hashlib,re,time
R=Path('docs/det-engine/v15');E=R/'evidence/final';state=json.loads((R/'state.json').read_text());assert time.time()<state['deadline']
x=json.load(gzip.open(E/'review.json.gz','rt'));summary=json.loads((E/'summary.json').read_text());proof=json.loads((R/'evidence/reproducibility.json').read_text());validation=json.loads((R/'evidence/validation/commands.json').read_text());schema=json.loads((R/'evidence/schema-audit.json').read_text())
assert proof['identical']and len(validation)==3 and all(c['exitCode']==0 for c in validation)
for p in proof['comparison']:assert hashlib.sha256((E/p['file']).read_bytes()).hexdigest()==p['first']==p['replay']
cl=x['classification'];block=x['initial'];sp=x['specificity'];names={'individual_pre_prescription':'Preuve individuelle avant prescription','technical_catalogue':'Précondition technique/catalogue','future_reassessment':'Réévaluation future obligatoire','routine_monitoring':'Suivi courant obligatoire'}
DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];selected=cl[0]
def table(h,rows):return '\n'.join(['| '+' | '.join(h)+' |','|'+'|'.join('---'for _ in h)+'|']+['| '+' | '.join(str(c).replace('|','/')for c in r)+' |'for r in rows])
def put(name,text):
 # Improve French prose spacing while preserving identifiers, links, code and source fingerprints.
 pieces=re.split(r'(`[^`]*`|\]\([^)]*\)|https?://\S+|[0-9a-f]{40,64}|VO2max|VO2peak)',text)
 for i in range(0,len(pieces),2):
  pieces[i]=re.sub(r'([a-zàâéèêëïîôöùûüç])(?=\d)',r'\1 ',pieces[i])
  pieces[i]=re.sub(r'(?<=\d)(?=[a-zàâéèêëïîôöùûüç])',' ',pieces[i])
 text=''.join(pieces).replace('TTE45','TTE 45').replace('FTP299','FTP 299').replace('CSS crawl90','CSS crawl 90').replace('vrai protocole si','protocole de force spécifique si')
 (R/name).write_text(text.strip()+'\n')
def hh(n):return f'{n//60} h {n%60:02d}'
def source_session(s):return f'S{s["week"]} {DAYS[s["day"]]} — {s["source"]} ({s["minutes"]} min)'
# Every original occurrence gets a filterable row, with original state and locator retained.
with(R/'CONDITION_INDEX.csv').open('w',newline='')as f:
 w=csv.writer(f);w.writerow(['profile','model','week','slot','source','minutes','original_condition_id','original_kind','original_slot_state','primary_review_category','secondary_categories','original_gate_retained','condition_satisfied','source_pointer'])
 for row in cl:
  for c in row['records']:w.writerow([c['profile'],c['model'],c['week'],c['slot'],c['source'],c['minutes'],c['original']['id'],c['original']['kind'],c['originalSlotState'],c['classification']['primary'],';'.join(c['classification']['secondary']),True,False,c['sourcePointer']])
text='''# Classification des conditions — périmètre et conséquences

**104 = créneaux conditionnels, pas104 contre-indications ni104 examens distincts.** Les deux modèles natifs comportent318/317 occurrences de conditions. Toutes les occurrences et leurs textes V14 sont conservés : aucune suppression, résolution ou modification de sévérité. Le CSV et conditions.jsonl permettent une revue ligne par ligne, avec pointeur vers la preuve d’origine.

Le classement ci-dessous décrit le travail attendu. Il ne change aucun état V14. Une condition de suivi courant reste obligatoire à son échéance ; elle n’est ni une erreur de construction aujourd’hui, ni une preuve de récupération obtenue. Les catégories secondaires conservent les dépendances des conditions composées. Seule la catégorie primaire est comptée pour éviter le double comptage.

'''
text+=table(['Profil/modèle','Créneaux conditionnels','Occurrences','Individuelles','Techniques/catalogue','Réévaluations futures','Suivis courants'],[[r['profile']+'/'+r['model'],r['conditionalSlots'],r['conditionOccurrences'],*[r['byPrimary'].get(k,0)for k in names]]for r in cl])
text+='\n\n## Familles et conséquences pratiques\n\n'
families=[('protocol_time','Temps complet de tous les éléments et exécution individuelle dans le créneau','Technique + individuel','Une plage catalogue seule ne confirme pas la faisabilité. Ne pas tronquer distances, répétitions ou repos.'),('swim_execution','Maîtrise des nages/éducatifs, protocole complet, épaules et effort','Individuel + suivi','CSS crawl ne chronomètre pas dos/brasse/éducatifs ; aucune valeur manquante n’est inventée.'),('movement_competence','Compétence et charge des exercices effectivement prescrits','Individuel + suivi','Le plafond générique40 min de soutien ne prouve ni technique ni tolérance d’un circuit précis.'),('posture_response','Tolérance des bouts aéro et réponse cervicale/lombaire','Individuel + suivi','120 min de vélo générique ne démontrent pas60 min en position aéro.'),('prerequisite:ventilateur','Lieu et matériel pertinents pour la fiche','Technique/contexte','La fiche évite le home-trainer sans ventilateur. Clarifier la portée si sortie dehors ; ne pas lever ici le prérequis extrait par V14.'),('catalogue_unknown','Métadonnée manquante, ici intensité non déclarée du soutien yoga','Technique/catalogue','Incertitude de représentation ; ne pas créer du HIT ou demander une mesure métabolique fictive pour faire disparaître le signal.'),('relative_source_context','Contexte réel précédent conforme au placement de la fiche','Technique + suivi','Le calendrier prévu est contrôlé ; un changement réel ou une réponse adverse demande une nouvelle revue.'),('whole_week_interaction','Expositions cumulées ET historique nutrition/hydratation adapté aux efforts','Individuel initial, puis réévaluation/suivi','Une condition composée ne devient pas un simple suivi : les prérequis initiaux et le contexte hebdomadaire restent nécessaires.'),('capacity','Capacité actuelle75/90 min vs cible future90/95/100','Réévaluation + individuel','Pas à démontrer avant S1 pour autoriser la réflexion sur le bloc initial ; à établir avant la dose concernée. Une insuffisance constatée refuse cette dose.'),('recovery','Retours qualitatifs et symptômes avant les expositions concernées','Suivi courant obligatoire','98 occurrences par modèle ; pas98 nouvelles analyses de laboratoire. Absence ou réponse adverse n’autorise aucune progression.')]
text+=table(['Condition V14','Objet de preuve','Catégories','Conséquence'],families)
text+='''

Les questions répétées peuvent être documentées dans un même dossier lorsque source, dose, contexte et individu correspondent. Les clés de regroupement sont un index documentaire, pas un mécanisme de validation en lot : toutes les occurrences restent présentes. Les preuves datées de capacité et de récupération ne sont pas remplacées par une attestation statique applicable à seize semaines.

## Ce qui est réellement bloquant, réversible ou simplement à suivre

| Situation | Nature | Décision |
|---|---|---|
| Protocole individuel/temps/compétence absent pour la première exposition | Preuve indispensable manquante | Garder le créneau conditionnel ; une prescription immédiate non conditionnelle n’est pas étayée |
| Récupération d’une séance future non encore observée | Suivi normalement futur | Prévoir responsable, indicateur et décision ; ne pas compter l’absence de cette observation aujourd’hui comme une erreur de construction |
| Dose arrivée à échéance au-dessus de l’enveloppe explicitement réévaluée | Non-admissibilité de cette dose dans ce contexte | Refuser la dose, puis revoir une alternative complète et ses écarts ; ce n’est pas une incapacité physiologique définitive |
| Réponse adverse, douleur ou fatigue non résolue | Suspension, pas simple donnée administrative | Ne pas compenser ailleurs ni substituer automatiquement une dose prétendument sûre |
| Recette complète incompatible avec durée/phase/calendrier fixé | Incompatibilité de la configuration versionnée | Impossible en gardant simultanément ces contraintes ; corriger explicitement la configuration ou changer de source, jamais attendre une adaptation pour résoudre une contradiction mathématique |
| Brick V13 :55 min actives pour maximum annoncé45 | Exemple archivé de contradiction source/contrat, non utilisé dans les calendriers V14 | Un meilleur athlète ne réduit pas55 min prescrites à45 ; overlay candidat séparé, temps total toujours inconnu |
| Durée de compétition inconnue pour le schéma d’export | Blocage technique du calendrier complet | Ne pas inventer une durée ou une compétition0 min ; ce point n’empêche pas l’audit technique séparé du premier bloc |

**Aucune contre-indication médicale permanente ni incompatibilité irréversible d’un athlète n’est établie dans ces profils synthétiques.** Les hardFailures V14 sont nuls dans les calendriers initiaux ; cela ne prouve pas l’absence de tout risque. Les scénarios sans gain/adverses restent des fictions distinctes. «Irréversible» ne peut ici qualifier qu’une contradiction tant que ses hypothèses fixes restent inchangées, pas une personne.
'''
put('CONDITION_CLASSIFICATION.md',text)
put('SCIENTIFIC_REVIEW.md','''# Revue scientifique préparatoire du premier mésocycle

Cette revue logicielle et documentaire prépare une évaluation indépendante. **Aucun coach qualifié n’a validé le bloc ; aucune adaptation ou tolérance réelle n’est mesurée.** Profil retenu :IM_aerobic_history, modèle natif conditionnel, semaines1–4 inchangées. Les comparaisons gardent les deux profils et trois modèles V14 à cohorte constante.

## Profil et priorité : ce qui est donné et ce qui reste une hypothèse

L’historique V10 est explicitement fictif : huit semaines étiquetées tolérées,600 min hebdomadaires et enveloppes de longues vélo180/course75 min. Les données synthétiques incluent FTP299 W, CSS crawl90 s/100 m et TTE45 min. Les méthodes, dates, conditions de terrain et exécutions instrumentées ne sont pas établies. Un marqueur de fixture «observed» n’est pas une observation réelle.

Le diagnostic place VLamax comme limiteur et annonce une confiance d’environ61%, alors que la décision stratégique héritée indique «high». Ces indicateurs ont des sens différents et ne prouvent pas une précision physiologique élevée. Le score d’économie3 et les valeurs estimées ne démontrent pas un déficit de force ou une adaptation à obtenir. La priorité vélo vient aussi des observations qualitatives fictives de durabilité, pas d’une formule VLamax→minutes.

Les garde-fous hérités signalent un risque vélo modéré et une vigilance sur les longues, la tension tendineuse et l’accumulation force/durée. Ce ne sont pas des diagnostics de lésion ; la stabilité du tronc ne devient pas automatiquement de la force maximale, mais la charge musculaire cumulée reste à examiner.

Une base aérobie et une consolidation technique sont des hypothèses plausibles à examiner au regard de l’historique. Cela n’oblige ni à mesurer la VLamax en laboratoire avant toute endurance, ni à appliquer les pourcentages de progression, le train-low ou la force lourde proposés dans l’ancienne trace stratégique. Ces propositions TFCL restent candidates ; elles ne sont pas des prescriptions de Dan Lorang universellement démontrées.

## Ce que les sources soutiennent réellement

| Source | Résultat/principe utilisable | Ce qu’elle ne démontre pas ici |
|---|---|---|
| [M21, Maunder et al.2021](https://pubmed.ncbi.nlm.nih.gov/33886100/) | Les caractéristiques mesurées au repos peuvent évoluer pendant un effort prolongé ; durabilité distincte du test frais | La pertinence individuelle de160/180 min, l’augmentation60→75 ou la tolérance en Ironman |
| [L175, shownotes2019](https://scientifictriathlon.com/tts175/) | Besoin du moment, historique, feedback et test utile à la décision | Quotas, minima de durée ou progression chiffrée universelle ; shownotes non vérifiées contre tout l’audio |
| [L417, shownotes2023](https://scientifictriathlon.com/tts417/) | Équilibre de l’effort entre séances, capacité individuelle, adaptation aux réponses | Supériorité du calendrier ci-présent, transfert automatique d’un cas élite à un finisher10 h |
| [I20, via matrice V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md) | Limites de l’inférence charge/blessure | Une règle de remplacement universellement sûre ou une preuve de danger pour toute hausse |
| [LL24, Llanos-Lagos et al.2024](https://pubmed.ncbi.nlm.nih.gov/38165636/) | Certains programmes de force améliorent en moyenne l’économie de coureurs, selon méthode/vitesse ; programmes6–24 semaines dans les études incluses | Équivalence avec trois circuits de stabilité25 min ou yoga, bénéfice individuel Ironman, diagnostic fondé sur un score heuristique |
| [G17, Jeukendrup2017](https://pubmed.ncbi.nlm.nih.gov/28332114/) | Le système digestif peut s’adapter ; importance d’une familiarisation aux conditions de ravitaillement d’effort | Tolérance GI acquise, protocole optimal universel, quantité imposable sans historique individuel ; revue avec besoins de recherche humaine supplémentaires |
| [W23, Wang et al.2023](https://pubmed.ncbi.nlm.nih.gov/37163550/) | Réduction de volume avec maintien possible d’intensité/fréquence dans les populations étudiées | Une règle d’allègement ordinaire, nécessité de tout supprimer au-delà de Z2, ni optimum de quatre semaines d’affûtage dans ces profils |
| [R25/O24, via matrice V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md) | Comparaisons de distributions d’intensité à contextualiser | Supériorité générale d’une distribution ou validation de seize semaines sans stimulus supérieur explicitement dosé |

Les résumés publics M21/W23/LL24/G17 ont été relus via Europe PMC en V15, titres et identifiants vérifiés. Métadonnées, URL, empreinte de réponse et court extrait sont conservés dans evidence/science/retrieval.json. Aucun texte intégral supplémentaire n’est revendiqué, aucune synthèse systématique nouvelle ou achat d’article effectué. Les limites détaillées et attributions antérieures restent dans la [matrice V8](../v8/SCIENTIFIC_EVIDENCE_MATRIX.md) et [LORANG_METHODOLOGY](../v8/LORANG_METHODOLOGY.md).

## Logique prospective à soumettre au coach

1. **Adaptation prioritaire** : soutenir l’endurance et l’exécution vélo dans un contexte de diagnostic incertain ; conserver natation/course pour la continuité.
2. **Stimulus** : effort prolongé dans le domaine TFCL adapté, pratique technique de nage et position aéro. Les domaines restent définis uniquement dans tfclDoctrine ; les pourcentages d’auteur des fiches ne deviennent pas une doctrine V15.
3. **Dose** : les160 min initiales financent les minima des autres sources sous le budget natif480 min ; le retour180 min est déjà dans l’enveloppe fictive, pas une capacité produite en sept jours. Course60→65→75 reste sous l’enveloppe75 mais réclame une réponse utilisable, pas une hausse automatique souhaitable.
4. **Réaction attendue** : exécution complète, qualité technique utilisable, effort compatible et récupération permettant les expositions suivantes. C’est une hypothèse, pas un résultat.
5. **Indicateurs** : contenu réellement terminé, temps total, retours qualitatifs existants, symptômes et récupération ; puissance/allure/FC seulement si mesurées de façon interprétable. Un TTE frais ne remplace pas l’observation en effort prolongé.
6. **Réévaluation** : maintien si la réponse le justifie ; suspension/replanification si douleur, fatigue non résolue ou recette incompatible avec le créneau ; absence de données conserve la condition. Aucun signal ne met à jour seul une capacité future.

La première semaine ne demande pas de prouver les cibles de course90/95/100 de S5+. Elle exige d’abord de rendre ses propres sources exécutables et ses interactions examinables. Le coach peut envisager un bloc initial avec suivi futur explicite ; il ne peut déclarer ces observations futures déjà disponibles.
''')
# Per-session review, full source preserved, with prospective rationale and unresolved questions.
base_notes={
'SEILER_BIKE_Z1_LONG':('Endurance vélo prolongée, cohérente avec la priorité déclarée ; les minutes exactes restent une convention de réservation, pas un optimum physiologique [M21/L175].','Vérifier protocole complet, référence d’intensité pertinente, conditions de terrain/matériel, historique de ravitaillement et réponse ; le prérequis ventilateur doit être contextualisé, pas effacé.'),
'C_SWIM_CATCH_FOCUS':('Pratique du catch et maintien d’une exposition de nage ; aucun défaut technique individuel n’est diagnostiqué par le titre de la fiche [L175].','1900 m déclarés :300 +400 +400 +600 +200, avec repos des éducatifs. Le CSS de crawl ne fixe pas les temps de scull/catch-up ; confirmer recette entière et épaules dans50 min.'),
'C_BIKE_AERO_POSITION_DRILLS':('Consolidation posturale candidate ; maintenir une source répétée peut être raisonnable, sans preuve d’adaptation ou de bénéfice équivalent à une longue autonome [L417/M21].','Six bouts10 min =60 min aéro ; cinq/six repos5 min donnent85–90 min quantifiées. À85 min, aucune marge n’est établie pour les éléments périphériques ; clarifier dernier repos et exécution intégrale, confort cervical/lombaire.'),
'A_RUN_Z2_EASY':('Endurance course sous l’enveloppe fictive75 min ; la progression native ne démontre ni réponse acquise ni amélioration de durabilité [M21/I20].','Confirmer capacité réelle, qualité d’exécution et retour de récupération ; les éducatifs optionnels5 min sont conservés. Pas de nouveau seuil ou tempo ajouté pour satisfaire une catégorie.'),
'A_RUN_EASY_45_PRO':('Exposition de course comparable, source continue45–55 min dont45 réservées ; une séance stable n’est pas un défaut scientifique en soi [L175].','Le statut currently_admissible de S1 ne porte que sur le périmètre logiciel/source. La réaction réelle à la course de la veille reste à vérifier avant ce vendredi, sans altérer rétrospectivement les conditions V14.'),
'A_STR_STABILITY_CORE':('Pratique de stabilité du tronc/mouvement, à distinguer d’un programme de force maximale ou d’une économie démontrée [LL24].','Compétence, tempo, repos et transitions non établis. Les seuls éléments chronométrés font15 min15 ;25 min laissent9 min45 pour282 répétitions et leurs repos/transitions. Ni faisabilité ni impossibilité ne sont prouvées.'),
'A_SWIM_CONTINUOUS_2K':('Continuité d’endurance natation ; le nom2K décrit le principal, pas tout le contenu. Cette dose ne prouve pas une capacité de nage Ironman [M21/L175].','2600 m complets :400 multi-nages +2000 continus +200 dos. Créneau55 min, jamais2000 m certifiés45 min. Maîtrise, temps des autres nages, qualité après1000 m et réponse des épaules restent à documenter.'),
'ENR_RECUP_MOBILITE_YOGA':('Soutien de mouvement en semaine réduite ; les30 min ne sont ni une dose de force équivalente aux25 min du circuit ni une preuve de récupération [L417].','5 min +20–30 min de flow +5 min donnent30–40 déclarées ; vérifier aisance et symptômes. L’intensité non déclarée est une limite de métadonnée ; ne pas inventer du HIT pour la faire disparaître.'),
'D_SWIM_RECOVERY_EASY':('Exposition réduite de nage prévue en semaine de récupération ; le faible domaine nominal ne garantit pas un effet récupérateur [L417].','1200 m déclarés avec plusieurs nages et éléments de fin. Le temps réel30 min, la technique et le confort doivent être établis ; aucune nage manquante n’est supprimée.'),
'D_SWIM_TECHNIQUE_LIGHT':('Travail technique léger conditionnel, sans requalification en séance de haute intensité [L175].','1600 m déclarés :200 +300 +300 +200 +400 +200 ; repos des éducatifs conservés. Confirmer les temps, épaules et effet de deux jours de nage consécutifs en fin de semaine allégée.')}
text='''# Premier mésocycle — revue séance par séance

Profil retenu :IM_aerobic_history / native_floor_conditional. **26 séances archivées analysées, aucune dose ni place modifiée.** Les minutes sont des réservations nominales. Les fiches ci-dessous préparent une revue coach ; elles ne constituent pas une validation sportive humaine.

'''
text+=table(['S','Type','Natation','Vélo','Course','Soutien','Total','Budget','Repos complets prévus'],[[w['week'],w['type'],*[w['perSport'][s]for s in ['swim','bike','run','strength']],w['reservedMinutes'],w['budget'],', '.join(DAYS[d]for d in w['restDays'])]for w in block['timeline']])
text+='''

Sur quatre semaines :1740 min réservées (29 h), dont865 vélo,390 course,380 natation et105 soutien. Les heures réelles de récupération, l’ordre intrajournalier et les contraintes de transport/logistique ne sont pas connus. Les doubles du mardi demandent210 min en S1 et230 min en S2/S3, avant ces éléments : «disponibilité large» ne vaut pas une fenêtre individuelle confirmée.

## Analyse de toutes les séances
'''
for n,s in enumerate(block['sessions'],1):
 rationale,missing=base_notes[s['source']]
 text+=f'\n### {n}. {source_session(s)}\n\n'
 text+=f'**Dose et but.** {rationale}\n\n'
 if s['source']=='SEILER_BIKE_Z1_LONG':
  if s['week']==1:text+='Les160 min sont20 min sous la cible déclarée180 pour respecter480 min de budget initial, sans raccourcir une nage inconnue. Ce compromis d’allocation n’est pas une dose calculée optimale.\n\n'
  elif s['week']in [2,3]:text+='Les180 min reviennent à l’enveloppe déjà donnée par l’historique fictif ; ce retour ne démontre pas une adaptation nouvelle.\n\n'
  else:text+='Les90 min respectent le minimum de la recette intégrée, au-dessus du plancher natif85 ; le volume réduit n’est pas une mesure de récupération.\n\n'
 if s['source']=='A_RUN_Z2_EASY':text+=f'La recette explicite est10 min initiales +{s["recipe"]["main"]} min principales +5 min finales +5 min d’éducatifs. Dose{ s["minutes"] }≤75 min, sans relever la capacité actuelle.\n\n'
 if s['doseChange']:text+=f'Évolution par rapport au rôle précédent :{s["doseChange"]["previousMinutes"]}→{s["minutes"]} min, source {s["doseChange"]["previousSource"]}→{s["source"]}. Le changement de source/mode n’établit pas une équivalence de fatigue.\n\n'
 neighbours=[]
 for label,key in [('même jour','sameDay'),('veille','previousDay'),('lendemain','nextDay')]:
  a=s['interactions'][key]
  if a:neighbours.append(label+' :'+', '.join(f'{t["source"]} {t["minutes"]} min'for t in a))
 text+='**Placement et interactions.** '+('; '.join(neighbours)if neighbours else'Pas d’autre séance dans les jours adjacents décrits du bloc.')+'. '
 if s['source']=='C_BIKE_AERO_POSITION_DRILLS':text+='Le vélo long et la nage de mardi précèdent la position aéro de mercredi : examiner la fatigue cumulée plutôt que conclure à la récupération au seul vu de Z1/Z2. '
 if s['source']=='A_RUN_EASY_45_PRO':text+='Deux jours de course consécutifs ne sont ni automatiquement interdits ni automatiquement tolérés ; la réponse à la première dose conditionne la seconde. '
 if s['interactions']['sameDay']:text+='Ordre et écart horaire inconnus ; cette association natation/vélo ne devient pas un brick vélo-course. '
 text+='Aucun seuil universel d’espacement ou de fatigue n’est ajouté.\n\n'
 text+='**Preuves et décision.** '+missing+' En cas de réponse adverse ou de protocole complet ne tenant pas dans le créneau, garder le refus/la condition et revoir la semaine entière ; aucune compensation automatique ailleurs.\n\n'
 text+=f'**Trace.** État V14 :`{s["originalState"]}`. Conditions originales :'+(', '.join('`'+c['id']+'`'for c in s['conditions'])or'aucune dans le périmètre V14 de ce créneau')+'. Source et contenu conservés ; revue humaine non effectuée.\n'
text+='''

## Cohérence du bloc et points ouverts

Le maintien des sources pendant trois semaines peut servir une consolidation comparable. Il n’y a pas de preuve que multiplier les variantes améliorerait la prescription. En revanche, le retour160→180 de vélo, la course60→65→75, les bouts aéro après vélo long et les courses jeudi/vendredi doivent avoir une condition de réponse explicite ; la fiche ne suffit pas à démontrer la réponse.

S4 réduit515→240 min (variation descriptive d’environ−53%), sans imposer ce pourcentage comme règle. Natation105→65, vélo265→90, course120→55 ; soutien25→30 change du circuit vers yoga. Les minutes de ces deux soutiens ne sont pas une échelle comparable de contrainte musculaire. Deux repos complets sont prévus en S4 ; aucun n’atteste une récupération effectivement acquise.

Les35 avertissements historiques localisés en S1–4 (19 de gabarit,12 de répétition,4 de déclaration de séance clé) sont conservés dans le périmètre des contrôles du plan complet. Les deux erreurs globales de ratio ne sont pas attribuées artificiellement à une semaine. Cette revue ne certifie pas une conformité sportive indépendante du bloc.
'''
put('FIRST_MESOCYCLE_REVIEW.md',text)
text='''# Réalisme et spécificité de la préparation Ironman16 semaines

Audit des six calendriers V14 archivés, sans reconstruction. Même ambition finisher, même catégorie qualitative trained,10 h hebdomadaires déclarées et mêmes disponibilités nominales. Présence d’une discipline, minutes réservées et préparation effective de la course sont distinguées.

'''
text+=table(['Profil/modèle','Séances natation/vélo/course','Longue vélo max','Longue course max','Bricks entraînement','Circuit core','Yoga/mobilité','Sources avec zone principale>Z2'],[[s['profile']+'/'+s['model'],'/'.join(str(s['countsByDiscipline'].get(k,0))for k in ['swim','bike','run']),s['maxAutonomousLongBikeMinutes'],s['maxAutonomousLongRunMinutes'],s['trainingBricks'],len(s['coreStabilitySlots']),len(s['yogaMobilitySlots']),len(s['explicitHigherZoneSources'])]for s in sp])
text+='''

Aucune de ces durées n’est utilisée comme seuil universel suffisant ou insuffisant pour finir un Ironman. Les profils restent synthétiques ; l’aptitude au format continu, aux conditions et au temps d’effort de la course n’est pas démontrée.

| Domaine | Ce qui est présent | Manque réel / conséquence | Compromis à examiner, sans l’appliquer |
|---|---|---|---|
| Endurance longue/durabilité | Longues autonomes vélo jusqu’à180 min, course100 min candidate ; maintien et réponse conditionnelle | Pas d’observation sous fatigue prolongée de course, historique seulement fictif, réactions inconnues. Un test frais ne suffit pas [M21] | Maintien possible si justifié ; progression seulement après preuve pertinente, jamais durée imposée pour un taux d’assemblage |
| Progression des disciplines | Continuité physique32 nages,29 vélos,29 courses ; réserve vélo modulée au départ, course variable puis stable | Présence ne prouve ni dose suffisante ni adaptation. Pas de progression réelle de nage mesurée ; nouvelle source build2800–3300 m réservée50 min reste non démontrée | Établir la recette et l’exécution avant de choisir la réserve ; pas de mètres supprimés pour tenir le budget |
| Bricks/course sous fatigue | Aucun brick d’entraînement, aucune source spécifique post-vélo ou lendemain préfatigué | Pas de compétence de transition/tolérance combinée démontrée. Les doubles nage-vélo et l’événement de compétition ne comptent pas comme entraînement brick | Évaluer la nécessité/phase à partir de l’expérience puis un contrat combiné complet ; ne pas ajouter un brick pour atteindre un quota |
| Intensités spécifiques | Six sources A_IM_RUN_PACE dans les modèles natifs, nominalement Z2 bas ; position aéro répétée | Une étiquette IM n’établit pas l’allure/puissance individuelle durable. Aucune source de zone principale>Z2 prévue, temps réellement passé dans les domaines inconnu | Revue du besoin de stimulus supérieur ou rappel ; ni obligation HIT hebdomadaire ni preuve que16 semaines faciles soient optimales [R25/O24/L175] |
| Force musculaire | Trois circuits core en S1–3, puis12 yoga/mobilité | Aucune force maximale, charge externe/progression/compétence suffisamment documentée. Les15 séances comptées «strength» ne sont pas15 doses de force efficace [LL24] | Prioriser ou différer un vrai protocole si le besoin et les prérequis sont établis ; ne pas créditer la mobilité comme force maximale |
| Nutrition/hydratation |48 conditions de revue d’interaction, pas de protocole individuel de ravitaillement établi | Ni tolérance digestive ni stratégie de course attestées ; mentionner nutrition n’est pas l’entraîner [G17] | Utiliser historique et essais compatibles avec efforts/conditions réels ; aucune quantité universelle, tolérance ou exposition à jeun inventée |
| Récupération | S4/S8/S12 réduites, repos/espacement candidats présents | Faible domaine et diminution de minutes ne démontrent pas la réponse musculaire, nutritionnelle ou générale | Planifier suivi et décisions ; ne pas exiger aujourd’hui les98 réponses futures, ne pas les déclarer acquises |
| Affûtage | Types taper/race S13–16 ; phasebuild encore en S13 ; volumes250/220/220/190 min pour l’aérobie natif | Quatre semaines de contexte allégé, fréquence/stimulus spécifique et fatigue résiduelle non individualisés. W23 ne valide pas automatiquement ce schéma | Revue indépendante du contexte, de la fatigue et des rappels ; pas de changement silencieux de doctrine ni pourcentage universel |
| Ambition/disponibilité |10 h et16 semaines, catégorie trained ; plages de jours mais horaires exacts absents | Finisher n’implique pas des exigences faibles. Expérience, contraintes de course, temps utile par jour/logistique et exposition antérieure manquent pour une conclusion de faisabilité | Confirmer les fenêtres et l’expérience ; si incompatibles, arbitrage explicite du coach sur préparation/objectif/disponibilité, aucun changement automatique |

Le plan actuel ne prouve ni impossibilité de l’Ironman en10 h d’entraînement ni préparation suffisante. Les lacunes de spécificité tardive ne rendent pas automatiquement illégitime un premier bloc de base ; elles empêchent de présenter l’ensemble comme une prescription Ironman prête.
'''
put('IRONMAN_SPECIFICITY_16W.md',text)
text='''# Comparaison des profils et modèles V14 à preuves constantes

Aucun calendrier, état, avertissement ou résultat V14 n’est modifié. Les variantes ne constituent pas six athlètes. Les modèles de maintien/natif ont le même premier bloc pour chaque profil ; les différences apparaissent ensuite. Le modèle par bloc avance une cible, sans preuve de supériorité.

'''
orig=json.load(gzip.open('docs/det-engine/v14/evidence/final/study.json.gz','rt'))
text+=table(['Profil/modèle','Minutes S1–4','Vélo long S1','Course longue S1/S2/S3','Première hausse dépassant l’enveloppe','Erreurs historiques','Avertissements'],[[r['profile']+'/'+r['model'],sum(w['reservedMinutes']for w in r['weeks'][:4]),next(s['minutes']for s in r['weeks'][0]['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long'),'/'.join(str(next(s['minutes']for s in r['weeks'][w-1]['slots']if s['role']['sport']=='run'and s['role']['kind']=='long'))for w in [1,2,3]),next((f'S{w["week"]} :{s["minutes"]}>{s["role"]["currentCapacity"]}'for w in r['weeks']for s in w['slots']if s['minutes']>s['role']['currentCapacity']),'aucune'),r['validation']['historical']['blocking'],r['validation']['historical']['warnings']]for r in orig['rows']])
text+='''

L’aérobie priorise le vélo avec une enveloppe180/75 ; l’équilibré priorise la course avec150/90. La première semaine reste480 min pour les deux :160 contre130 min de vélo long et60 contre90 min de course longue. Ces différences viennent des priorités/historiques synthétiques déclarés et des contraintes d’allocation, pas d’une relation physiologique validée entre VLamax et minutes.

Le profil équilibré comporte davantage de données manquantes, dont CSS et plusieurs références physiologiques ; sa confiance diagnostique nominale50% et sa complétude64% ne sont pas remplacées par des valeurs inventées. Un même mot-clé VLamax dans les deux profils ne justifie pas à lui seul deux doses optimales. La revue approfondie V15 porte sur l’aérobie natif ; aucune revue experte du second profil n’est déclarée.

Le maintien75/90 min conserve six/cinq écarts historiques de plancher ; il n’est pas déclaré dangereux à cause d’un minimum de programmation non atteint, ni conforme au contrat Ironman. Le modèle par bloc fait apparaître une hausse au-dessus de90 min dès S5 pour l’équilibré, contre S6 au natif : c’est une demande de réévaluation plus précoce, pas un progrès démontré. L’alerte de progression supplémentaire de l’aérobie par bloc reste visible.

Les deux erreurs de ratio reposent sur des fréquences de séances. Les minutes réservées, ventilées par période réelle de génération dans V14, constituent une lecture séparée ; ni les unités ni les périodes ne peuvent être interchangées pour faire passer un contrôle. Les avertissements de répétition peuvent correspondre à une consolidation ou signaler une prescription monotone non réévaluée ; le coach doit examiner leur sens, sans supprimer la sévérité enregistrée.
'''
put('PROFILE_MODEL_COMPARISON.md',text)
put('PRESCRIPTION_READINESS.md','''# Six critères distincts de prescription exploitable

Ces critères sont une grille de revue candidate, pas une modification des validateurs. Aucun état V14 ni aucune sévérité historique n’est réécrit.

| Critère | Définition / preuve attendue | État V15 |
|---|---|---|
|1. Calendrier prospectif structurellement complet |16 semaines et112 jours, sources/rôles/doses/place/budgets et contexte explicités, calendrier identifié/versionné | Démontré dans le périmètre archivé V14 pour six variantes ; zéro nouveau calendrier généré |
|2. Bloc initial sportivement examinable | Chaque séance reliée à sa dose, son rôle, sa place, ses interactions, preuves et limites scientifiques | Dossier préparé pour26 séances aérobie S1–4 ; pas d’approbation sportive, pas de revue experte humaine effectuée |
|3. Conditions futures clairement planifiées | Objet de preuve, responsable, indicateur, échéance avant la dose et alternative/arrêt ; pas de réponse future présumée | Occurrences et échéances indexées, conditions non résolues. Les suivis futurs normaux ne sont pas des erreurs de construction |
|4. Prescriptions actuellement non admissibles / non autorisables | Séparer dépassement/contre-indication établis, données indispensables absentes et intention future normale |0 hardFailures initiaux V14, mais aucun bloc intégral actuellement autorisable sur ces seules preuves. Temps/compétence/contextes initiaux restent manquants ; les refus simulés ne sont pas des faits athlètes |
|5. Validation par un coach qualifié | Identité/qualification, date, portée exacte et version, preuves examinées, incertitudes acceptées, décisions et surveillance consignées | Non effectuée. Le formulaire reste vierge ; un test ou classement ne peut pas produire cette validation |
|6. Aptitude technique à l’export | Schéma, références source, dates/durées et intégrité conditionnelle cohérents, puis autorisation de la portée exportée | Préfixe S1–4 conforme au schéma en lecture seule pour six variantes ; ensemble16 semaines non conforme au schéma sur durée de compétition inconnue. Aucun export effectué ou autorisé |

## Ce qui doit être prêt avant la première prescription

- Une finalité de base provisoire acceptée par le coach malgré le diagnostic incertain, avec référence d’effort interprétable ; pas nécessairement un nouveau test de laboratoire.
- Les recettes de S1 chronométrables et réalisables entièrement pour l’individu : nages, position aéro, circuit. Les plages du catalogue et plafonds génériques n’établissent pas cette preuve.
- Compétences et conditions applicables documentées, notamment posture/mouvements, nages et matériel/lieu.
- Disponibilités quotidiennes, ordre/espacement utile des deux séances de mardi, historique de ravitaillement et risque de fatigue cumulée examinés.
- Procédure de suivi et d’arrêt exploitable avec les retours qualitatifs déjà disponibles. Une condition future de récupération reste ouverte jusqu’à sa date ; elle n’exige pas une observation impossible aujourd’hui.
- Déclaration explicite de la portée retenue : première séance, semaine ou bloc conditionnel, sans transformer cette validation en approbation des16 semaines ou d’une préparation Ironman complète.

Un avis de cohérence sur le cas synthétique est distinct d’une autorisation individuelle : il est possible de le préparer maintenant sans inventer un athlète observé. Aucune validation indépendante n’est empêchée par le seul fait qu’une réaction de S12 n’existe pas encore. La difficulté initiale vient des preuves qui manquent déjà pour les doses proches, et de la nécessité de définir le suivi réel. Inversement, un beau calendrier ou un schéma passé ne suffit pas à autoriser ces doses.

## Décisions et données selon l’échéance

| Moment | À établir | À ne pas exiger ou présumer |
|---|---|---|
| Avant S1 | Recettes/doses initiales, compétences, contexte et fenêtres, finalité de base acceptée, surveillance et arrêts | Pas toutes les réponses futures ; pas une adaptation acquise de la VLamax |
| Pendant S1–3 | Réponse aux longues, bouts posturaux et deux jours de course, maintien ou révision des doses avec le coach | Pas d’augmentation automatique ; pas de signal «currently» interprété comme récupération réelle |
| Avant les nouvelles sources de S4 | Exécution des nages réduites et yoga/soutien, contexte et réponse à la semaine précédente | Pas de preuve de récupération tirée du seul−53% de minutes |
| Avant S5/S6 et100 min | Nouvelle enveloppe réellement argumentée si dépassement de75/90, comparabilité et récupération de toute la semaine | Ni gain déduit du temps, ni réduction silencieuse des exigences de l’objectif |
| Avant spécificité/compétition | Durabilité pertinente, capacité combinée/transition si utilisée, stratégie de nutrition, intensité/allure durable, fatigue et affûtage | La présence des disciplines, l’étiquette IM ou le scénario favorable ne prouvent pas l’aptitude à la course |

## Schéma technique et autorisation ne sont pas interchangeables

L’audit de S1–4 réutilise les semaines archivées sans en reconstruire les séances et sans les exporter. Il prouve une compatibilité de structure, pas la résolution des conditions. Les conditions sont conservées dans l’enveloppe de revue ; une projection numérique isolée ne doit pas les faire disparaître dans un futur export. Les intégrations réelles et écritures Nolio n’ont pas été testées ni utilisées. La durée de course inconnue n’est pas remplacée par0 ou une estimation inventée.

Les deux erreurs historiques de ratio et les avertissements restent visibles. Un coach peut examiner le sens sportif d’un contrôle dans un bloc donné ; cela ne modifie pas le validateur ou n’autorise une promotion de doctrine. L’intégration demeure NO-GO.
''')
put('COACH_REVIEW_FORM.md','''# Formulaire de revue indépendante — non rempli

**Aucune validation humaine réalisée.** Les cases restent volontairement non cochées. Ce document prépare la revue du cas synthétique ; il ne demande aucune écriture d’athlète ou nouveau questionnaire de charge.

- Dossier : V15, baseline1d04718d16b2cba990bbe726a21d7cfc7af720e0 ; profil IM_aerobic_history, natif, S1–4.
- Coach / qualification : à renseigner lors d’une revue réelle.
- Date et version exacte examinée : à renseigner.
- Type de revue : avis de cohérence sur cas synthétique / validation de prescription individuelle réelle, à distinguer explicitement.
- Portée : séance / semaine / bloc conditionnel ; aucune approbation implicite de16 semaines.
- Preuves réellement examinées et provenance : à référencer, sans transformer des données synthétiques en observations réelles.

- [ ] Finalité de base et diagnostic incertain examinés ; hypothèses et limites explicitement retenues ou rejetées.
- [ ] Recette complète de chaque nage, repos et nages périphériques réalisables dans le créneau, sans troncature.
- [ ] Recette et compétence posturale aéro compatibles avec la dose et l’exposition vélo de la veille.
- [ ] Circuit musculaire : technique, tempo, repos/transitions, charge et durée effective documentés ; aucune force maximale créditée au yoga.
- [ ] Longues et course jeudi/vendredi compatibles avec historique et retours réellement disponibles.
- [ ] Plages quotidiennes et ordre des doubles, matériel/lieu et ravitaillement adaptés vérifiés.
- [ ] Conditions futures, responsable, indicateurs et décisions avant séance explicités ; observation inconnue reste inconnue.
- [ ] Douleur, fatigue non résolue, temps/source incompatible : procédure de suspension et réévaluation prévue, sans compensation automatique.
- [ ] Erreurs/avertissements historiques examinés avec leur portée et sévérité d’origine ; aucun contrôle modifié pour obtenir un passage.
- [ ] Décision et restrictions de portée écrites ; aptitude technique distincte de l’autorisation sportive.

Décision : non rendue. Motifs, réserves, modifications demandées, prochaine réévaluation : à renseigner. Un avis signé sur la cohérence du cas synthétique peut être rendu sans prétendre valider un athlète réel. Une validation de prescription individuelle exige des preuves individuelles réelles et la portée explicitement revue ; les deux actes ne sont pas interchangeables. Aucun champ coché automatiquement par le logiciel.
''')
# A concise packet for the coach, with larger evidence annexes linked.
put('COACH_PACKET.md','''# Dossier coach — première prescription Ironman

**Décision actuelle : NO-GO pour prescription opérationnelle et intégration. Dossier initial prêt à examiner ; validation humaine non effectuée.**

Le coach peut rendre un avis de cohérence sur le cas synthétique dès ce dossier ; cet avis ne vaudrait pas autorisation individuelle de s’entraîner.

La question n’est plus de remplir16 semaines. Les calendriers V14 existent déjà. Pour l’aérobie natif, le premier bloc comporte26 séances et69 occurrences de conditions ;19 sont des suivis de récupération normaux, aucune n’exige déjà la capacité de course90/95/100 min. Les observations futures ne doivent pas être demandées comme si elles existaient aujourd’hui.

## Ce qui empêche réellement de défendre la première dose

| Paquet de revue | Manque précis | Première décision utile |
|---|---|---|
| Finalité et références | Valeurs et confiance diagnostiques synthétiques, dates/méthodes non établies ; décision héritée «high» ne remplace pas une preuve | Accepter ou réviser une base provisoire et ses références d’effort ; pas de promesse VLamax→adaptation |
| Temps des nages |1900 m de catch/éducatifs en50 min et2600 m continus+périphériques en55 min non démontrés individuellement | Preuves de recette intégrale et compétence des nages, ou source alternative effectivement étayée ; pas de CSS transféré au dos/brasse |
| Position aéro |6×10 min et repos font85–90 min quantifiées, contre85 réservées, sans preuve des éléments périphériques ni tolérance posturale | Établir exécution/confort et interaction avec la longue de mardi, ou revoir une alternative avec tout le bloc |
| Circuit musculaire |25 min dont15 min15 déjà chronométrées ;282 répétitions/repos/transitions non chronométrés | Clarifier tempo/technique/charge réelle et temps complet ; ni recette artificiellement accélérée ni force maximale revendiquée |
| Temps quotidien / récupération croisée | Mardi210/230 min, vélo aéro le lendemain, course jeudi puis vendredi, ordre/écarts horaires non connus | Confirmer fenêtres réelles, ravitaillement et réponse ; un état logiciel admissible ne prouve pas la récupération du vendredi |
| Suivi réellement opérable | Les retours futurs sont prévus mais pas observés | Prévoir qui observe, quoi, quand et quelle décision ; maintien possible, suspension si adverse, pas de progression automatique |
| Portée de validation | Premier bloc distinct de la préparation spécifique finale et de l’export | Revue qualifiée du bloc, avec conditions/limites explicites ; pas d’approbation rétroactive ou globale |

Les fenêtres quotidiennes et la réaction réelle avant le vendredi de S1 sont des questions de revue V15, pas des occurrences ajoutées rétroactivement au compteur V14. Les69 conditions et les états archivés restent inchangés.

Ces paquets ne sont pas un nouveau questionnaire de charge. Ils utilisent les données, observations et retours déjà présents dans la logique TFCLab, avec une preuve minimale adaptée à chaque décision. Ils ne demandent pas69 examens indépendants.

## Lire le dossier

1. [Revue des26 séances](FIRST_MESOCYCLE_REVIEW.md), puis [fondements et limites scientifiques](SCIENTIFIC_REVIEW.md).
2. [Conditions : catégories et conséquences](CONDITION_CLASSIFICATION.md) ; [index CSV exhaustif](CONDITION_INDEX.csv) pour filtrer chaque occurrence.
3. [Spécificité16 semaines](IRONMAN_SPECIFICITY_16W.md) et [comparaison profils/modèles](PROFILE_MODEL_COMPARISON.md).
4. [Six critères distincts de maturité](PRESCRIPTION_READINESS.md) et [formulaire indépendant vierge](COACH_REVIEW_FORM.md).

La durée de compétition inconnue bloque le schéma complet mais pas la lecture technique S1–4. En revanche, le schéma S1–4 passé ne résout ni les temps individuels ni les compétences ou la nutrition. Les besoins tardifs de durabilité, bricks, intensités spécifiques, force et affûtage restent ouverts sans ajout automatique de séances.
''')
# Evidence of validation executed in V15 is kept separate from preserved V14 results.
reviewlog=(R/'evidence/validation/review.txt').read_text();m=re.search(r'(?:ℹ\s*)?tests\s+(\d+)',reviewlog);assert m and int(m[1])==16
schemalog=(R/'evidence/validation/schema.txt').read_text();sm=re.search(r'Tests\s+(\d+) passed',schemalog);assert sm and int(sm[1])==1
v={'version':'det-v15-1','executedV15':{'types':'passed','reviewTestsPassed':16,'reviewTestsSkipped':0,'schemaTestPassed':1,'archivedVariantsAuditedBySchema':6,'proofIndependentProcesses':2,'proofArtifactsIdentical':3,'calendarsGenerated':0,'conditionsResolved':0},'preservedV14NotRerun':{'experimentalPassed':132,'historicalPassed':2999,'governancePassed':62,'source':'docs/det-engine/v14/validation-summary.json'},'coachValidationPerformed':False}
(R/'validation-summary.json').write_text(json.dumps(v,indent=2)+'\n')
put('VALIDATION.md','''# Preuves réellement exécutées — V15

V15 n’a régénéré aucun calendrier ou plan historique et n’a exécuté aucune simulation nouvelle d’adaptation. Les deux profils et trois modèles sont lus dans les artefacts V14 ; leurs dates, doses, sources, états et résultats restent inchangés.

- Typage expérimental réussi ; seuls les nouveaux tests de revue de schéma sont ajoutés à ce périmètre, aucun validateur modifié.
-16 tests du dossier exécutés directement avec Node:test : couverture de toutes les occurrences, texte/pointeur/empreinte, maintien des garde-fous, non-classement par défaut en suivi, incohérence id/type refusée, données de compétences non inventées, arithmétique musculaire et absence de mutation.
-1 test de schéma audite les six variantes : résultat complet identique à V14 (durée de compétition absente), préfixes S1–4 techniquement valides. Aucun export ou génération de séance.
-Deux processus indépendants produisent trois artefacts de revue identiques :review.json.gz, conditions.jsonl et summary.json.
-2989 fichiers antérieurs suivis contrôlés par empreinte, y compris preuves V2–V14 et600 configurations de référence. Les sorties de recherche initiales et les versions de revue intermédiaires sont conservées séparément.

Les132 tests expérimentaux,2999 historiques et62 de gouvernance de V14 sont **des références conservées, pas des tests réexécutés en V15**. V15 n’en fait pas un résultat clinique ni une nouvelle couverture sportive. Les16 tests Node ont un journal direct détaillant chaque assertion ; l’invocation initiale du runner Node regroupait le fichier comme un seul sous-test, elle n’est pas utilisée pour revendiquer16 résultats indépendants.

La couverture V15 concerne la classification et le dossier Ironman, pas un nouveau comportement de génération running/trail/triathlon. Aucun moteur actuel, validateur, intégration ou workflow de production n’est modifié. Une réussite de logiciel ou de schéma n’établit aucune adaptation réelle ou signature d’un coach qualifié.
''')
put('V15_RESULTS.md','''# Résultats V15 — DRAFT / NO-GO

**Le dossier de première prescription est préparé pour revue ; aucune prescription ou validation experte n’est déclarée.** Aucun nouveau calendrier n’est produit et aucune condition V14 n’est supprimée ou déclarée satisfaite.

Le chiffre104 était celui des créneaux conditionnels. Les modèles natifs comportent318/317 occurrences :110 techniques/catalogue,60 individuelles,50/49 réévaluations futures et98 suivis courants. Chaque occurrence est classée et traçable. «Suivi courant» reste une obligation à échéance, pas une déclassification de sécurité.

Le premier bloc aérobie contient26 séances et69 occurrences, dont19 suivis et aucune hausse future au-dessus de l’enveloppe de capacité. Ses principaux obstacles proches sont les temps complets et compétences des nages, la tolérance/chronologie posturale, le circuit musculaire non entièrement chronométré et les interactions/horaires/ravitaillement des journées chargées. Les cibles de course S5+ et la durée de compétition inconnue ne doivent pas être traitées comme des preuves à acquérir avant S1.

Les quatre premières semaines passent le schéma technique en lecture seule pour les six variantes ; l’ensemble16 semaines conserve son échec sur la durée de compétition. Aucun export réel. Les deux erreurs de ratio et tous les avertissements historiques restent présents avec leur sévérité d’origine ; leur sens sportif demande une revue de portée, sans modification des contrôles.

Sur16 semaines, continuité des disciplines et longues ne démontrent pas la spécificité complète : aucun brick d’entraînement, pas de tolérance nutritionnelle ou de force maximale attestée, intensités spécifiques non individualisées par une réponse mesurée et affûtage natif encore à discuter. Ni impossibilité générale ni préparation suffisante d’un Ironman en10 h n’est démontrée. La comparaison des profils/modèles ne promeut aucun candidat.

V15 : typage,16 tests du dossier,1 test de schéma sur six variantes, rejeu identique de trois artefacts ;2989 fichiers protégés inchangés. Les suites V14 sont conservées comme références et non présentées comme réexécutées. Relecture de quatre résumés publics gratuits avec provenance, sans texte intégral ou achat revendiqué.

## Prochaine décision réellement humaine

Un avis indépendant sur la cohérence du premier bloc synthétique peut être demandé dès ce dossier. La validation ultérieure d’une prescription individuelle exige ses preuves réelles, avec qualification, portée/version, hypothèses acceptées, décisions de suivi/arrêt et réserves consignées. Le formulaire reste vierge. Le coach doit distinguer la base initiale d’une préparation complète de compétition ; si les preuves proches manquent, choisir une alternative étayée ou suspendre la dose, sans adaptation inventée.

NO-GO conservé pour intégration et prescription opérationnelle. Aucune fusion, migration, production, donnée réelle/Nolio, déploiement, publication Lovable, changement de validateur ou API payante.
''')
put('README.md','''# DET-ENGINE V15 — dossier de prescription à examiner

**DRAFT / NO-GO.** Revue documentaire et logicielle, sans validation humaine ni nouveaux calendriers.

- [Dossier coach : commencer ici](COACH_PACKET.md)
- [Résultats V15](V15_RESULTS.md)
- [Classification exhaustive des conditions](CONDITION_CLASSIFICATION.md) et [CSV filtrable](CONDITION_INDEX.csv)
- [Revue séance par séance S1–4](FIRST_MESOCYCLE_REVIEW.md)
- [Fondements scientifiques et limites](SCIENTIFIC_REVIEW.md)
- [Spécificité Ironman16 semaines](IRONMAN_SPECIFICITY_16W.md)
- [Comparaison des profils et modèles](PROFILE_MODEL_COMPARISON.md)
- [Six critères de maturité](PRESCRIPTION_READINESS.md)
- [Formulaire de revue indépendante non rempli](COACH_REVIEW_FORM.md)
- [Validation réellement exécutée](VALIDATION.md)
- [Registre de reprise](REPRISE.md)

Les conditions détaillées restent dans evidence/final/conditions.jsonl ; la revue structurée complète dans review.json.gz. Les calendriers V14 restent leur source immuable.
''')
(R/'dashboard.json').write_text(json.dumps({'version':'det-v15-1','recommendation':'NO-GO','calendarsRegenerated':0,'conditionsResolved':0,'humanExpertReviews':0,'variantsRead':6,'distinctSyntheticProfiles':2,'selectedInitialBlockSessions':26,'initialConditionOccurrences':69,'firstBlockFutureCapacityConditions':0,'classification':[{'profile':r['profile'],'model':r['model'],'conditionalSlots':r['conditionalSlots'],'occurrences':r['conditionOccurrences'],'byPrimary':r['byPrimary']}for r in cl],'initialBlockReviewPrepared':True,'firstBlockPrescriptionReady':False,'initialPrefixSchemaValidVariants':sum(r['initialFourWeeks']['valid']for r in schema['results']),'fullSchemaValidVariants':sum(r['full16']['valid']for r in schema['results']),'validation':v},indent=2)+'\n')
print(json.dumps({'variantsRead':6,'selectedSessionsReviewed':26,'conditionOccurrences':sum(r['conditionOccurrences']for r in cl),'calendarsGenerated':0,'originalConditionsResolved':0,'humanValidation':False,'v15ReviewTests':16,'schemaTest':1}))

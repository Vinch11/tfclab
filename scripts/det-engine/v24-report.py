"""Render the executed V24 evidence. This script cannot approve a prescription."""
import collections, csv, gzip, hashlib, json, pathlib
R=pathlib.Path('docs/det-engine/v24');E=R/'evidence/validation-2'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def write(name,text):(R/name).write_text(text.strip()+'\n')
audit=load(R/'evidence/independent-validation.json');assert audit['pass']
rows=load(E/'build/results.json.gz');phys=load(E/'build/physiology-handoff.json');source=load(R/'evidence/pr424-retrieval.json')
days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
def table(head,rows):return'| '+' | '.join(head)+' |\n|'+'|'.join(['---']*len(head))+'|\n'+'\n'.join('| '+' | '.join(str(x).replace('|','/')for x in r)+' |'for r in rows)
def slots(r):return[s for w in r['calendar']['weeks']for s in w['slots']]
def title(s):return s.lower().replace('🔑','').replace('🏁','').strip()
def witnesses(result):
 out=[];byweek={w['weekNumber']:w for w in result['calendar']['calendar']['weeks']}
 for n,w in byweek.items():
  prev=byweek.get(n-1)
  if not prev or w['theme']!='load'or prev['theme']!='load':continue
  for s in w['sessions']:
   if s.get('isRest'):continue
   prior=next((p for p in prev['sessions']if not p.get('isRest')and p['dayIndex']==s['dayIndex']),None)
   if prior and title(prior['title'])==title(s['title']):out.append({'week':n,'day':s['dayIndex'],'sourceId':s['catalogId'],'title':s['title'],'minutes':s['durationMin'],'previousSourceId':prior['catalogId'],'previousMinutes':prior['durationMin'],'sameRecipeId':s['catalogId']==prior['catalogId'],'sameReservedDose':s['durationMin']==prior['durationMin'],'rule':'anti_repetition','severity':'warning','meaning':'same normalized title as first physical session on same weekday; no overload or spacing calculation'})
 return out
warning_rows=[]
for row in rows:
 v=row['result'];before=v['before']['result'];oldtrial=v['before']['rejectedProgrammingAttempt']
 if not oldtrial:continue
 warning_rows.append({'caseId':row['caseId'],'original':witnesses(before),'rejectedV23':witnesses(oldtrial),'retainedV24':witnesses(v['result']),'rawV23Issues':oldtrial['rawValidation']['historical']['issues'],'rawOriginalIssues':before['rawValidation']['historical']['issues'],'rawRetainedIssues':v['result']['rawValidation']['historical']['issues'],'v24CandidateWitnessAdditions':[{'model':t['model'],'additions':t['acceptance']['newHistoricalWitnesses'],'accepted':t['acceptance']['accepted']}for t in v['trials']]})
(R/'evidence/warning-witnesses.json').write_text(json.dumps(warning_rows,indent=2,ensure_ascii=False)+'\n')
with(R/'evidence/calendar-before-after.csv').open('w')as f:
 writer=csv.writer(f,lineterminator="\n");writer.writerow(['case','week','source_id','sport','role','minutes_before','minutes_after','day_before','day_after','capacity','state','individual_approval'])
 for row in rows:
  v=row['result'];old={s['key']:s for s in slots(v['before']['result'])}
  for s in slots(v['result']):writer.writerow([row['caseId'],s['week'],s['card']['id'],s['role']['sport'],s['role']['kind'],old[s['key']]['minutes'],s['minutes'],days[old[s['key']]['day']],days[s['day']],s['input']['currentCapacity'],s['decision']['state'],False])
profile_table=table(['Cas figé','Placement retenu','Jours modifiés','Avertissements V23 → V24','Erreurs historiques','Refus / conditions','Conflits capacité'],[[p['caseId'],p['retainedModel']or'identique',p['changedDays'],f"{p['warningsBefore']} → {p['warningsAfter']}",f"{p['blockingBefore']} → {p['blockingAfter']}",f"{p['states'].get('not_admissible',0)} / {p['states'].get('conditional_pending_reassessment',0)}",p['capacityConflicts']]for p in audit['profiles']])
tests=[]
for c in load(E/'commands.json'):
 log=(E/(c['name']+'.txt')).read_text();match=__import__('re').search(r'Tests\s+(\d+) passed(?: \| (\d+) skipped)?',log)
 tests.append([c['name'],match.group(1)if match else'compilation TypeScript',match.group(2)if match and match.group(2)else'0',c['status']])
write('PHYSIOLOGY_HANDOFF_424.md',f'''
# Relais physiologique #424 — lecture seule

DET baseline `4ec5547875768f8430606401bb750445e381f71f`. PR #424 consultée au commit `{source['ref']}`, branche `experiment/physiology-validation`, brouillon non fusionné. Ses fichiers ne sont ni appliqués ni exécutés comme une dépendance distante.

Neuf fichiers ont été récupérés par le connecteur GitHub. Leur contenu UTF-8 est conservé dans `evidence/pr424-retrieval.json`, avec SHA Git et SHA-256 effectivement calculé. Le vérificateur indépendant recalcule les neuf objets Git. Les snapshots des deux PR sont archivés séparément. Le diff de contexte `pr424-diagnostic-source.diff` montre deux autres écarts de base liés à `canGuidePrescription`; **la fonction de frontière étudiée est textuellement identique** et le prédicteur est identique entre les branches. Cela ne prouve pas l'équivalence des deux branches entières.

## Fixture commune et unités

{table(['Fixture','VLamax course','Score transmis','CE explicite','VMA','Allure seuil','Sortie native','Rejeu candidat #424'],[['A V22 inchangé',0.3,3,'absent','15 km/h','290 s/km','observé 82,8%; prédiction 95%; écart −12,2 points, critical','observé 82,8%; prédiction et comparaison nulles'],['QA #424 distincte',0.5,65,'200 ml O₂/kg/km synthétiques','18 km/h','absente','prédiction 93,7%','prédiction 83,2%'],['QA #424 sans CE',0.5,65,'absent','18 km/h','absente','score encore interprété comme CE par le chemin natif','runMLSS nul; aucun ancrage inventé']])}

Les entrées complètes, unités, traces du prédicteur, sorties et hashes réels sont dans `validation-2/build/physiology-handoff.json`. La valeur 200 n'est jamais substituée au profil A. Le natif borne le score reçu à 150 dans une fonction attendant un coût énergétique; l'écart dimensionnel précède toute interprétation sportive du désaccord.

## Contrat de transport expérimental

Le loader de test reproduit **en mémoire seulement** les deux substitutions d'arguments du patch candidat #424. Il échoue si les deux sites ne correspondent plus. Aucun fichier calculateur n'est réécrit. Le champ CE n'est ajouté qu'à la fixture distincte explicitement documentée.

`assessRunReferenceV24` exige une vitesse positive en km/h, une provenance, deux empreintes au format SHA-256 et une date. Une référence candidate corrigée peut être présentée au coach; une référence incertaine, absente, mal dimensionnée ou conflictuelle retourne une suspension sans vitesse utilisable. Ce contrôle de transport n'est ni une certification scientifique des données ni une approbation de dose.

Pour A, l'ancre reste `{phys['boundary']['refsNative']['mlssSpeedKmh']:.6f} km/h` dans les deux lectures : elle provient de l'allure initiale. Retirer la comparaison fautive ne fournit aucune mesure CE ni une nouvelle preuve de validité de l'allure. **Les sept refus course natifs sont conservés dans le calendrier retenu.** Le relais n'annonce ni correctif fusionné ni validation des tests terrain. La décision sur le calculateur appartient au chantier #424.
''')
first=warning_rows[0];old_set={(x['week'],x['day'],x['sourceId'])for x in first['original']};new=[x for x in first['rejectedV23']if(x['week'],x['day'],x['sourceId'])not in old_set]
warning_table=table(['Semaine / jour','ID actuel','Minutes précédente → actuelle','Signal exact'],[[f"S{x['week']} {days[x['day']]}",x['sourceId'],f"{x['previousMinutes']} → {x['minutes']}",'même ID/dose'if x['sameReservedDose']else'même titre malgré une durée différente']for x in new])
variant_table=table(['Modèle candidat','Nouveaux témoins bruts par cas','Décision'],[[t['model'],len(t['acceptance']['newHistoricalWitnesses']),'retenu comme calendrier candidat'if t['acceptance']['accepted']else'proposition coach distincte']for t in rows[1]['result']['trials']])
write('PLACEMENT_WARNING_ANALYSIS.md',f'''
# Placement : témoins complets, pas seulement compteurs

Les « trois variantes V23 » archivées sont trois essais de la même politique sur B, B avec plafond course inférieur et B avec récupération défavorable. Chacun avait 35 → 36 avertissements, soit +1 `anti_repetition` en S3. Ce ne sont pas trois algorithmes distincts.

Le contrôle de production `planValidator.ts`, fonction `validateAntiRepetition`, compare chaque titre normalisé avec **la première séance physique du même jour de la semaine précédente**. Les semaines allégées/course sont exemptées. Cette branche contrôle une préférence de diversité de titres; elle ne mesure ni surcharge, ni espacement, ni récupération. D'autres contrôles distincts vérifient les plafonds intra-semaine et les contraintes de placement. Le code et la sévérité warning restent intégralement inchangés.

Nouveaux témoins de répétition de l'essai V23 pour B (mêmes paires dans les deux contrefactuels) :

{warning_table}

Une sortie 130 → 145 minutes peut donc recevoir le même avertissement qu'une recette strictement répétée. Cela ne permet pas de supprimer l'alerte; les sorties brutes et les paires comparées sont conservées dans `evidence/warning-witnesses.json`.

## Hypothèses limitées et résultat

{variant_table}

Les deux premiers modèles conservent les totaux d'avertissements mais échangent 12 témoins bruts par cas (dont 6 `layout_drift` et 6 répétitions). Le troisième échange encore 2 témoins `layout_drift`. Ils ne sont pas retenus automatiquement, même avec zéro erreur du bloc. Ce compromis est visible et soumis au coach.

Le quatrième échange uniquement les jours des deux sorties course **dans la semaine portant la plus grande sortie vélo déjà planifiée**. Les disciplines par jour, les sources et les doses ne changent pas. En S3, le vélo technique reste mercredi; la sortie courte passe jeudi et la longue vendredi. Il existe un jour intermédiaire de course courte avant la sortie longue; ce jour n'est pas déclaré comme repos ou récupération réussie. Le soutien du tronc suit désormais la sortie longue : la source l'autorise même en fatigue, mais la réaction individuelle reste à observer.

Le garde expérimental compare les multiensembles d'issues complets, message compris, en plus des codes/semaine/sévérité/contrôle. Il recalcule la portée quatre semaines et conserve tous les refus. Le quatrième modèle n'ajoute aucun témoin historique et retire une répétition. Aucune permutation exhaustive n'a été lancée : quatre hypothèses explicites seulement, sur les trois cas ayant une priorité admissible à ce niveau de programmation.
''')
write('PHYSIOLOGICAL_DECISIONS.md','''
# Décisions physiologiques démontrées

La chaîne V22/V23 reste utilisée : calculs TFCLab réels → limiteurs → leviers → intentions → catalogue → doses réservées → calendrier V14 → validations historiques et portée quatre semaines V23. V24 compose ces fonctions; aucun second moteur de sélection n'est créé.

Pour A, VO₂max calculée/transmise 40 face à la cible TFCLab 43,2 produit le levier `vo2_intervals`; seuil et force sont aussi proposés par le moteur existant. La tolérance individuelle aux intervalles et les compétences/charges de force ne sont pas documentées. Ces intentions restent différées. Le conflit critique de référence course persiste. Aucun HIIT ni volume supplémentaire n'est ajouté.

Pour B, le TTE vélo observé synthétique de 28 minutes produit le levier existant `z2_volume` et une intention d'endurance fondamentale. Une ancre FTP et une provenance datée sont disponibles. **Un TTE à l'état frais ne prouve pas la durabilité après fatigue prolongée.** Le libellé « durabilité » présent dans le levier historique est conservé dans la trace, sans être transformé en preuve de durabilité Ironman.

La seule conséquence nouvelle retenue est une priorité de séquençage réversible : dans la semaine au plus fort vélo long déjà réservé, retarder la course longue d'un jour après le bloc vélo, en échangeant deux séances course existantes. C'est une convention de programmation candidate; aucune étude nouvelle ne démontre qu'elle soit supérieure. Ni la durée, ni la fréquence, ni l'intensité ne sont dérivées quantitativement de VO₂max, VLamax ou TTE.

Le contrefactuel changeant le limiteur, celui sans FTP et celui avec seulement un TTE estimé ne reçoivent pas cette priorité. C reste incomplet avec refus explicites. La réponse de récupération défavorable conserve son refus sur la séance vélo visée, dans chaque proposition et dans le calendrier retenu.

Les deux profils A/B conservent 465, 485, 505 et 285 minutes. Leurs intentions et, désormais, deux placements diffèrent lorsque les données le permettent. Leurs sources et doses identiques restent justifiées par les recettes, minima et inconnues partagées. Les suggestions quantitatives des leviers historiques sont des traces, pas des doses automatiquement appliquées.
''')
write('CAPACITY_FLOOR_OPTIONS.md','''
# 95 minutes / 90 minutes : trois contrats séparés

En S3, le plancher natif individualisé vaut 95 minutes (nominal 100). C'est une convention de programmation déjà identifiée par V14, pas une loi physiologique de sécurité démontrée. La capacité course longue préenregistrée des profils concernés est 90 minutes; elle n'augmente pas avec les semaines. La proposition native de 95 minutes reste conditionnelle et ne peut pas être exécutée comme actuellement admissible.

La fiche historique `SEILER_RUN_Z1_EASY_LONG` contient : échauffement intégré dans les 10 premières minutes, bloc 60–120 minutes, retour au calme intégré dans les 10 dernières, métadonnée 70–150 minutes, variante Ironman 90–120 minutes Z1 strict. Le témoin V24 vérifie l'identité complète de la fiche et ces clauses littérales. À 90 minutes, les deux parties intégrées ne sont pas ajoutées une seconde fois et aucun composant n'est tronqué.

Cette preuve temporelle étroite n'approuve ni les affirmations scientifiques de la fiche, ni son ancrage d'intensité, ni la dose individuelle. La variante Ironman reste Z1 strict; aucun assouplissement vers Z2 n'est ajouté par la contreproposition. La résolution exacte de toutes les consignes d'intensité demeure une condition coach.

Six contrepropositions à 90 minutes sont testées comme blocs complets séparés. Leur catalogue et leurs sources restent intacts; elles échouent encore au plancher historique : `quota_floor_violation` critical (contrôle quotas et restitution historique), plus `four_week_native_floor`. Le vérificateur indépendant retrouve exactement ces trois signalements, correspondant au même conflit de programmation. Les erreurs historiques passent de 4 à 5 dans ces simulations, sans les masquer.

Aucune dérogation n'est appliquée. Une décision coach documentée sur le contrat candidat serait nécessaire avant tout futur changement du plancher expérimental; cela ne modifierait pas les floors ou validateurs de production. Le cas au plafond 75 minutes reste refusé : 75 n'atteint pas le minimum 90 de cette variante Ironman et les autres recettes/planchers ne sont pas automatiquement redimensionnés.

La capacité effectivement assimilée, la tolérance à cette source et la récupération restent inconnues. Une enveloppe déclarée n'en tient pas lieu. Un changement d'horaires ne lève aucun de ces points.
''')
write('BEFORE_AFTER.md',f'''
# Comparaison V23 / V24 — cohorte constante

Les 3 profils V22 et les 5 contrefactuels V23 sont identiques, vérifiés par comparaison des entrées complètes avant calcul. Le chemin V23 rejoué est égal à l'archive V23 complète, pas seulement à ses compteurs.

{profile_table}

240 réservations examinées, 3 calendriers candidats modifiés, 6 changements de jour au total. Les 12 propositions de placement comprennent 3 retenues et 9 propositions coach distinctes. Toutes les doses, sources, fréquences, limites de capacité et consignes sont identiques aux calendriers de référence. Les intensités calculées et les refus restent identiques.

Les 32 erreurs historiques de portée préparation complète restent visibles : quatre par cas, sans attestation de préparation Ironman. Les 9 conflits d'enveloppe restent signalés. Aucun bloc n'est approuvé comme prescription individuelle. Les avertissements passent de 285 à 282; le détail par cas ci-dessus interdit de masquer un échec par agrégation.

Les calendriers complets avant/après sont dans `evidence/calendar-before-after.csv`; les résultats JSON contiennent les plans numériques, les recettes, les décisions et tous les contrôles. La première validation exploratoire ayant comparé seulement les totaux est conservée comme rejetée : `validation-1`, avec ses résultats et son échec TypeScript. Les registres V2–V23 restent inchangés.
''')
b=rows[1]['result'];w=b['result']['calendar']['weeks'][2];old=b['before']['result']['calendar']['weeks'][2]
cal=table(['Jour S3','Avant V23','Après V24'],[[days[d],'; '.join(s['card']['id']+' '+str(s['minutes'])+' min'for s in old['slots']if s['day']==d)or'repos','; '.join(s['card']['id']+' '+str(s['minutes'])+' min'for s in w['slots']if s['day']==d)or'repos']for d in range(7)])
write('COACH_DECISIONS.md',f'''
# Dossier coach — décisions restant ouvertes

## Changement concret pour B

{cal}

Le bloc reste à 465 / 485 / 505 / 285 minutes. S1, S2 et S4 sont identiques à V23. Les trois nages, deux vélos, deux courses et le soutien musculaire de chaque semaine de charge sont conservés. La semaine de récupération garde ses 285 minutes et ses six séances. Le report de la sortie longue est une organisation candidate, pas une preuve de récupération.

## Arbitrages minimaux

1. **Ancre course de A :** coordonner la décision sur la frontière score/CE avec #424 et contrôler la provenance/qualité de l'allure seuil. La CE de A est inconnue. Le scénario #424 ne la mesure pas et le présent chantier ne corrige aucun calculateur.
2. **Course 95/90 :** choisir s'il faut instruire une exception au plancher de programmation dans un contrat séparé. La recette littérale 90 minutes peut être conservée, mais elle échoue toujours au floor inchangé; aucune exécution automatique n'est proposée. Une décision sur la dose et les capacités demeure indépendante.
3. **Séquençage de B :** examiner le report de la sortie longue après la sortie courte, la réaction au bloc vélo, le soutien musculaire le lendemain et les inconnues de natation/posture. Le TTE ne prouve pas une durabilité sous fatigue. Les variantes protégeant un jour vélo isolé restent des propositions distinctes car elles échangent des avertissements.

Le profil C nécessite toujours les références/prérequis manquants. La récupération défavorable impose un arrêt de la séance concernée, sans décision automatique de reprise. Les inconnues exactes sont conservées par séance dans les traces; aucune preuve individuelle n'est fabriquée.

Revues expertes humaines enregistrées : **0**. Doses individuellement approuvées : **0**. Ces dossiers préparent une revue; ils ne la remplacent pas.
''')
write('V24_RESULTS.md',f'''
# V24 — DRAFT / NO-GO

## Amélioration fonctionnelle

Le moteur expérimental réutilise la chaîne existante et retient un séquençage différent pour B et deux contrefactuels éligibles : échange des sorties course en S3, après le plus grand bloc vélo déjà planifié. Aucun volume supplémentaire ni nouvel exercice. L'acceptation exige désormais l'absence de **tout nouveau témoin brut** d'avertissement/erreur, et pas seulement un compteur identique.

3 placements candidats retenus sur 8 cas, 6 jours de séances modifiés. 9 propositions avec compromis sont isolées pour le coach. 6 contrepropositions 90 minutes sont vérifiées comme blocs et restent rejetées par le floor historique. Le défaut de frontière commun à #424 est reproduit sans modification des calculateurs; les états corrigé candidat, incertain et absent ont des décisions de transport explicites.

{profile_table}

## Vérifications exécutées

{table(['Commande','Tests réussis','Tests ignorés','Code sortie'],tests)}

23 tests V24, puis rejeu des mêmes 23; 227 tests de non-régression V23/V22/multiobjectifs réussis, 5 tests anciens explicitement ignorés. TypeScript sans émission : réussi. Le vérificateur Python indépendant contrôle arithmétique, sources, jours, fréquences, espacements, capacités, refus, identités d'alertes et trois artefacts de rejeu logiquement identiques.

Les 4 654 fichiers précédemment suivis sont inchangés. 920 IDs, 2 425 variantes, 600 configurations historiques, 96 chronologies / 51 IDs, 418 vues candidates et 15 fixtures Nolio sont conservés. Les 600 cas sont préservés et recomptés, **pas réexécutés** dans V24. Aucun appel Nolio; aucun export nouveau, API payante, donnée réelle, migration, fusion ou déploiement.

## Limites et essais rejetés

Une assertion initiale attendait un attribut nul au lieu du diagnostic global nul quand CE et allure manquent : corrigée sans changer le comportement. Le premier loader utilisait `replaceAll`, incompatible avec la cible TypeScript existante : remplacement lexical équivalent par regex. Les logs des échecs restent archivés. Une première acceptation par compteurs seulement a été abandonnée après inspection des témoins; aucune promotion de ces résultats exploratoires.

Les quatre semaines restent des réservations conditionnelles, pas une préparation Ironman complète. 32 erreurs historiques de portée intégrale et 9 conflits de capacité subsistent; A garde 7 refus course et C 26 refus. L'observation défavorable garde son refus. Une organisation plus explicable n'établit ni dose optimale, ni adaptation acquise, ni supériorité scientifique du placement.

**NO-GO maintenu.** La revue indépendante des références, du contrat 95/90 et des réactions individuelles est indispensable avant toute prescription utilisable.
''')
write('REPRISE.md','''
# Reprise V24

Baseline V23 : `4ec5547875768f8430606401bb750445e381f71f`. Branche exclusive `experiment/det-engine`. PR #420 doit rester DRAFT / NO-GO.

Le registre `state.json` conserve l'origine du budget, sa limite absolue et les unités; aucun budget ne se renouvelle. Vérifier son état de clôture avant toute exécution. `v24-run.mjs` refuse une session fermée, expirée, une mauvaise branche, plus de 10 unités, plus de 3 validations ou un répertoire de résultats existant. Il impose 2 Go au tas Node, un timeout au plus 180 s par processus et un plafond de logs; aucune relance externe n'est installée. Le quota/crédit exact n'est pas exposé par l'environnement.

Résultats retenus : `evidence/validation-2`, `evidence/independent-validation.json`, `calendar-before-after.csv`. Les validations exploratoires et leurs échecs ne sont pas effacés. `preregistered-models-1.json`, `preregistered-models-2.json` et `inputs.json` exposent l'ordre réel des hypothèses, toutes enregistrées avant leur exécution.

Code à réutiliser : `v24-prescription.ts` compose V23, `v24-placement.ts` transforme seulement les jours de sources existantes et garde les refus, `v24-capacity.ts` produit une contreproposition complète non retenue, `v24-reference.ts` qualifie le transport d'une ancre sans la promouvoir. Les calculateurs, validateurs et sources antérieurs sont inchangés.

Pour une nouvelle mission explicitement autorisée : confirmer les têtes distantes #420 et #424, relire les preuves, définir un nouveau budget et un nouveau registre. Ne pas relancer les unités V24 clôturées. Ne pas promouvoir les variantes rejetées par compteurs ni considérer le candidat #424 comme fusionné.

Prochaine priorité : revue coach des trois arbitrages de `COACH_DECISIONS.md`, puis développement expérimental ciblé à partir d'une preuve nouvelle. Pas de nouvelle recherche générale ni de hausse automatique des capacités.
''')
(R/'evidence/report-summary.json').write_text(json.dumps({'profiles':audit['profiles'],'tests':tests,'warningWitnessCases':len(warning_rows),'humanExpertReviews':0,'status':'DRAFT_NO_GO'},indent=2)+'\n')
print('V24: eight requested dossiers and complete before/after reservation CSV rendered from independent evidence.')

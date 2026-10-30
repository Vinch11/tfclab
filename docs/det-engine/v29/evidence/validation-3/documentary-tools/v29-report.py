"""Compact coach-facing reports generated from independently verified V29 transport evidence."""
import gzip,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v29');attempt=sys.argv[1]if len(sys.argv)>1 else'1';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
m=load(R/'evidence/independent-validation.json');assert m['passed'];rows=load(E/'build/scenarios.json.gz');state=load(R/'state.json')
banner='DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.\n\n'
def doc(name,title,body):(R/name).write_text('# '+title+'\n\n'+banner+body.rstrip()+'\n')
def yes(v):return'oui'if v is True else'non'if v is False else'inconnu'
def clock(s):return'inconnu'if s is None else f'{s//60}:{s%60:02d}'
def table(headers,rs):return'| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+''.join('| '+' | '.join(('inconnu'if x is None else str(x)).replace('|','/')for x in r)+' |\n'for r in rs)+'\n'
commands=load(E/'commands.json');testrows=[]
for c in commands:
 text=(E/(c['name']+'.txt')).read_text();p=re.search(r'Tests\s+(\d+) passed',text);s=re.search(r'(\d+) skipped',text);testrows.append([c['name'],int(p[1])if p else None,int(s[1])if s else 0,c['status']])
new=next(r[1]for r in testrows if r[0]=='build');old=sum(r[1]or 0 for r in testrows if r[0].endswith('non_regression'));skips=sum(r[2]for r in testrows if r[0].endswith('non_regression'))
matrix=table(['Scénario','Exécution s','Créneau s','Marge s','Transport sans perte','Créneau compatible','Bloc sans nouveau défaut'],[[r['scenarioId'],r['bridge']['executionDurationSeconds'],r['bridge']['reservedSlotSeconds'],r['bridge']['unallocatedSlotSeconds'],yes(r['bridge']['knownSourceTimeline']),yes(r['bridge']['compatibleWithReservedSlot']),yes(r['block']['noNewComplementaryDefect'])]for r in rows])
doc('V29_RESULTS.md','V29 — pont temporel exact, sans durée fictive',f'''Baseline `{state['baseline']}`. Les onze scénarios V28 sont rejoués avec recettes, paramètres, sujets et profils inchangés. La représentation historique reste intacte ; les résultats V28 en échec demeurent visibles.

**Gain démontré :** sept chronologies connues sont transportées sans perte à la seconde. Les sources fractionnaires dont recette et variante sont compatibles sont {', '.join('`'+s+'`'for s in m['transportedFractionalGoalCompatibleSourceIds'])}. La nage continue2K possède aussi une chronologie générique transportable, mais sa variante Ironman reste non résolue. Aucun de ces cas n’ajoute une séance à B.

{matrix}
Les six chronologies techniquement complètes de V28 restent six ; V29 améliore leur transport, pas leur validation scientifique. Six créneaux synthétiques sont compatibles avec le temps d’exécution, dont cinq ont aussi recette et variante compatibles ; la nage2K reste bloquée malgré son temps calculable. Cinq scénarios ne créent aucun nouveau défaut complémentaire de bloc : aéro85min, les deux nages catch et les deux conventions de gainage. V28 n’en comptait qu’un. Ce résultat **ne lève pas** les cinq erreurs historiques B,34 avertissements, conditions individuelles ou horaires inconnus.

**Budgets distincts, valeurs inchangées :** le plafond de volume planifié S1 est480min (28800s), tandis que la disponibilité déclarée est10h (36000s). Le premier prototype comparait à tort les réservations, marge incluse, au plafond d’exercice ; un test rouge conserve ce défaut. Le pont corrigé compare le volume planifié au plafond de volume et les réservations à la disponibilité. Pour catch/pull et catch focus :28555/28660s planifiées,29100s réservées. Pour les gainages :28234/28324s planifiées,28500s réservées. Aucun plafond n’est augmenté et aucune autre discipline réduite. Les doses historiques des autres séances restent des valeurs planifiées pour ce budget, et non des durées d’exécution intégralement vérifiées ou réalisées. Les55/35min restent des créneaux synthétiques, sans insertion dans B.

Deux témoins reproduisent les comparaisons flottantes strictes V28. Le nouveau chemin additionne uniquement des entiers de secondes et n’insère aucune durée fractionnaire dans `durationMin`. Aucun epsilon, arrondi, contenu tronqué ou marge transformée en activité.

Validation finale : **{new} tests V29**, puis rejeu ; **{old} tests de non-régression**, {skips} skips historiques inchangés ; TypeScript réussi. Quatre artefacts logiques identiques au rejeu. Vérification Python indépendante et six mutations négatives rejetées. Quatre tests rouges ont corrigé une exigence cardiaque inappropriée en force, une exposition mutable du registre et la perte du mode poids du corps dans le texte local et la confusion volume/disponibilité ; sources et échecs avant correction conservés.

{m['previousFilesUnchanged']} anciens fichiers inchangés ;920 IDs,2 425 variantes,600 configurations historiques et15 fixtures Nolio préservés. Les600 configurations sont conservées et recomptées, pas réexécutées. A/B/C gardent90 réservations identiques ;7 refus course A et26 refus C. Suspensions et dérogation course95→90 préservées ;0 nouvelle politique coach,0 substitution,0 approbation individuelle.

Nolio : sept représentations internes exactes, cinq payloads texte locaux conservant les secondes ; aucun workout structuré officiel émis, aucun appel réel ou export. #425 a avancé en lecture seule de `429a84c1c35255843251a478ef3f48ab0dd907c6` à `18c20998eed1539f5c5fc2f8831d41245b237fe5` pendant la mission. Sa clôture technique C8 annoncée ne constitue ni un audit V29 de ce code ni une approbation scientifique/DET. Aucun correctif physiologique importé.
''')
doc('EXACT_TIME_CONTRACT.md','Exécution, réservation et marge : trois durées différentes','''Les champs sont `executionDurationSeconds`, `reservedSlotSeconds`, `unallocatedSlotSeconds`, `timelineEvents`, `durationAccounting`, `legacyCompatibility` et `individualApprovalStatus`. Pour catch/pull :2755s d’exercice,3300s réservées,545s non attribuées. Aucun de ces545s n’est ajouté à la chronologie, à un échauffement ou à une récupération.

Chaque événement garde son contenu complet V28, son occurrence, un identifiant lié au scénario/source/index/contenu, son temps entier et sa position relative. Les occurrences ne sont pas dédupliquées par leur texte : deux répétitions identiques demeurent deux événements distincts. Les identités dupliquées, suppressions et changements de séquence sont refusés contre la séquence source enregistrée.

Les durées incluses sont des annotations d’un parent additif explicite. Le test600s de continu avec deux annotations60s d’échauffement/retour au calme reste600s, pas720s. Un parent absent, des bornes incompatibles ou un chevauchement inclus non documenté sont refusés. Les onze recettes V28 utilisées ici ont des événements additifs déjà développés ; aucune nouvelle périphérie n’est inventée.

Les secondes et leurs sommes doivent être des entiers sûrs. Sous-secondes, dépassement de capacité arithmétique, réservations historiques fractionnaires et somme différente du total sont refusés. Une chronologie partielle garde ses événements connus, mais sa durée totale et ses positions absolues non démontrées restent inconnues.

Si l’exécution dépasse la réservation, la marge non attribuée vaut0 et un dépassement explicite est rapporté : aéro90min dans85min donne300s de dépassement. Une durée inconnue ne devient pas zéro. Les plages d’intensité peuvent rester décimales ; elles ne servent jamais à arrondir le temps.

Le registre vérifie les fichiers V28 par SHA256 réel, la ligne exacte, les paramètres, le contexte, le profil et la séance d’origine. Les vues renvoyées sont des copies ; les preuves privées ne suivent pas une mutation de leur vue publique. Un hash fourni par l’appelant ne remplace pas la comparaison avec la source enregistrée. L’ancre FTP/allure est exigée lorsqu’elle pilote le stimulus ; elle n’est pas inventée comme préalable au gainage poids du corps.
''')
doc('LEGACY_CALENDAR_BRIDGE.md','Le calendrier historique garde son sens','''Le schéma `src/lib/plan/planSchema.ts:61` impose `durationMin` entier. `v14-calendar.ts:99` renseigne ce champ à partir de la dose planifiée ; `v23-scope.ts` compare sérialisation, séance et sommes. Aucune preuve n’autorise à traiter silencieusement ce champ comme une réserve incluant du temps libre.

Le mode `legacy_exact` exige donc égalité entre exécution et durée historique. Les nages45:55/47:40 et gainages30:34/32:04 ne sont pas directement insérables dans les créneaux natifs35/25min. Les valeurs historiques, erreurs de schéma et comparaisons flottantes V28 sont conservées ; le pont ne les remplace pas par un succès artificiel.

Le mode `synthetic_upper_bound` est nommé et explicitement reconnu dans la fixture complémentaire. Il consomme uniquement les créneaux55/35/85 déjà enregistrés en V28. Il ne modifie aucun `durationMin`, jour, discipline, source ou paramètre historique. Un créneau arbitrairement agrandi, une sémantique non déclarée ou un profil différent sont refusés.

Le moteur réutilise `buildProspectiveCalendar` via la prescription V26, la résolution V28 et les gardes de portée V23. Le pont est un adaptateur de représentation et de validation ; il ne cherche pas une autre répartition ou un second calendrier. Les trois calendriers originaux et leurs décisions sont rejoués à l’identique.

Les secondes d’exercice connues sont comptées séparément. Pour les autres séances de ce scénario unitaire, le pont conserve la réservation et indique exécution inconnue ; il ne transforme pas la somme des réservations en charge réalisée. Les horaires précis sont inconnus par défaut. Des fixtures supplémentaires d’horaires documentés testent absence de conflit, chevauchement et fenêtre trop courte, sans devenir des observations de B.
''')
swimforce=[r for r in rows if r['sourceId'].startswith('C_SWIM_')or r['sourceId']=='A_STR_STABILITY_CORE']
doc('SWIM_AND_STRENGTH_REPLAY.md','Nage et gainage : mêmes recettes, transport exact',table(['Source/scénario','Temps exact','Créneau','Marge','Décision complémentaire'],[[r['scenarioId'],clock(r['bridge']['executionDurationSeconds']),clock(r['bridge']['reservedSlotSeconds']),clock(r['bridge']['unallocatedSlotSeconds']),r['block']['status']]for r in swimforce])+'''
Catch/pull conserve2100m,8 répétitions composites, sept repos15s et les transitions déclarées ;2755s. Catch focus conserve1900m, les deux séries8×50m et6×100m, repos et transitions V28 ;2860s. Aucune CSS transférée aux éducatifs ou aux autres nages. Les créneaux55min sont synthétiques et restent distincts des35min natifs de B.

Le gainage conserve les six exercices, trois tours, côtés séquentiels,2s/répétition, maintiens45s et30s/côté, changements de côté5s, repos10s/60s et transitions périphériques5s. Les deux conventions V28 produisent1834s et1924s. Aucune répartition nouvelle du tempo concentrique/excentrique, aucune zone cardiaque musculaire et aucune capacité acquise.

Les chronologies complètes sont dans les artefacts machine, avec les événements originaux intacts. Le texte coach Nolio de revue ne les tronque pas pour tenir dans35/25min. Convention inconnue ou tempo/transition absents restent incomplets dans les contrôles V28 rejoués.
''')
aero=rows[:3]
doc('AERO_REPLAY.md','Aéro :85 et90minutes restent deux scénarios',table(['Scénario','Travail','Repos','Exécution s','Réservation s','Dépassement s','Bloc sans nouveau défaut'],[[r['scenarioId'],'6×600s',5 if i==0 else 6 if i==1 else'inconnu',r['bridge']['executionDurationSeconds'],r['bridge']['reservedSlotSeconds'],r['bridge']['durationAccounting']['overrunSlotSeconds'],yes(r['block']['noNewComplementaryDefect'])]for i,r in enumerate(aero)])+'''
Les événements de travail et récupération conservent leurs cibles de puissance V28 calculées par la doctrine existante depuisFTP265W. Aucun passage à4×15min, aucune nouvelle tolérance posturale, aucune récupération finale choisie d’après la taille du créneau.

La convention entre répétitions fait85min et ne crée pas de nouveau défaut de bloc. Après chaque répétition,90min dépassent le créneau85min de300s : refus conservé. Sans convention, le total reste inconnu. Le fait qu’un scénario de test soit techniquement transportable ne constitue ni choix de convention par le coach ni approbation individuelle.
''')
floating=[]
for r in rows:
 if r['floatingWitness']:
  f=r['floatingWitness'];floating.append([r['scenarioId'],repr(f['legacyActiveMinuteSum']),repr(f['legacyStoredMinuteSum']),yes(f['strictEquality']),r['bridge']['executionDurationSeconds'],r['block']['weeks'][0]['totalReservedSlotSeconds']])
doc('BLOCK_VALIDATION.md','Contrôles du bloc : temps exacts, contraintes conservées','''Les deux défauts flottants V28 sont exécutés par le chemin V28 inchangé : les sommes de minutes mathématiquement équivalentes ont des représentations binaires différentes. Les résultats ci-dessous ne sont pas rectifiés ou effacés.

'''+table(['Témoin','Somme historique active min','Somme historique stockée min','Égalité stricte','Exécution exacte cible s','Nouvelles réservations S1 s'],floating)+'''
Le chemin complémentaire utilise des sommes entières de secondes : volume planifié contre plafond sportif natif, réservations contre disponibilité déclarée, valeurs inchangées. Aucun epsilon ou arrondi n’est utilisé. Il ne fait pas passer une réservation pour une dose d’exercice. La disparition de l’erreur arithmétique dans cette représentation ne change pas le résultat historique et n’efface aucun dépassement réel de volume ou de disponibilité.

Les réservations des deux scénarios catch totalisent29100s contre36000s de disponibilité ; le volume planifié28555/28660s reste sous28800s. Le2K générique, initialement dans un créneau40min, atteint28800s de réservation et28590s planifiées, mais reste refusé pour sa variante Ironman inconnue. Le gainage totalise28500s réservées et28234/28324s planifiées : aucun nouveau défaut complémentaire. La source `v14-calendar.ts:90` distingue déjà disponibilité et plafond de volume ; aucun seuil n’est changé. Les tests négatifs refusent un vrai dépassement de chacun de ces plafonds. Pour les séances non ciblées, les minutes historiques servent seulement au budget planifié ; leur exécution reste explicitement inconnue. Les autres disciplines, jours, fréquences, repos et capacités restent inchangés. Une modification ultérieure du bloc ou du profil est refusée.

La portée quatre semaines et les sorties historiques intégrales restent attachées à chaque scénario. Les cinq erreurs historiques B et34 avertissements ne sont pas remplacés par le champ `noNewComplementaryDefect`. Ce champ indique seulement absence de nouvelle défaillance dans la représentation complémentaire. Les autres recettes et les horaires précis peuvent encore être inconnus. Aucun plan de quatre semaines ni préparation Ironman n’est déclaré sportivement approuvé.

Douleur, récupération défavorable, capacité insuffisante/inconnue, ancre nécessaire absente/incertaine, variantes et phases non compatibles restent bloquantes. Aucun volume compensatoire et aucune reprise automatique. Les7 refus course A et26 refus C, les quatre incompatibilités longue vélo, ainsi que la politique95→90 limitée sont conservés.
''')
doc('BEFORE_AFTER_V28.md','Avant/après : transporter ne signifie pas approuver',table(['Indicateur','V28','V29'],[
 ['Scénarios identiques','11','11'],['Recettes techniquement complètes','6','6, sans nouvelle qualification scientifique'],['Représentation distincte exercice/réservation/marge','absente de ce contrat','7 chronologies connues sans perte'],['Sources fractionnaires compatibles recette/objectif transportées','échec du pont vers minutes entières','3 sources ; plus2K générique encore bloqué par variante'],['Créneaux temporellement compatibles','6, dont5 recettes/variantes complètes','6, dont5 recettes/variantes complètes'],['Scénarios sans nouveau défaut de bloc','1','5, dans la représentation complémentaire seulement'],['Défauts flottants historiques','2','2 conservés ; nouveau calcul entier sans ces défauts'],['Politique vélo base et convention aéro','non autorisées','non autorisées'],['Séances ajoutées au B original','0','0'],['Contrats exécutables dans B original','3 de course','3 de course, inchangés'],['Approbations individuelles / revues humaines','0 /0','0 /0']])+'''
Les deux scénarios de gainage apportent un gain fonctionnel de transport pour une même source ; ils ne sont pas deux nouvelles prescriptions individuelles. Les deux sources de nage sont transportées à la seconde et respectent les deux budgets distincts dans leurs scénarios55min ; elles ne remplacent pas les créneaux35min de B. Aucun total synthétique n’est ajouté aux performances du profil B original.
''')
doc('COACH_DECISIONS.md','Décisions coach restantes, sans nouvelle autorisation présumée','''1. **Longue vélo Ironman :** la politique générique90–180min en base, variante180–210min plus tard, reste une proposition non autorisée. Les quatre incompatibilités B demeurent. Aucun créneau n’est porté à180min.

2. **Cette recette aéro :** confirmer la convention de dernier repos, cinq ou six occurrences, après revue sportive et posturale.85min qui tiennent dans le créneau ne décident pas à la place du coach.

3. **Nage/gainage :** confirmer les paramètres techniques et leur applicabilité individuelle. Les données V28 sont des hypothèses de test, pas les capacités de B. Les nages exigent aussi un créneau et un budget compatibles ; le pont ne fait pas disparaître ce besoin.

La dérogation course95→90 est déjà autorisée pour son cas exact ; aucune nouvelle demande à ce sujet. Elle ne vaut ni autorisation de variante vélo, ni approbation de dose, intensité, tolérance ou récupération. Aucun questionnaire quantitatif universel nouveau.

La suite technique peut améliorer l’affichage et les contrats d’export exacts dans la couche expérimentale. Une intégration historique qui changerait le sens de `durationMin` exige une décision distincte ; V29 ne la réalise pas. Toutes les approbations individuelles et tous les exports restent désactivés.
''')
doc('NOLIO_LOCAL_CONTRACT.md','Nolio : chronologie interne et texte local exacts','''Sept chronologies connues produisent une représentation interne versionnée : date synthétique du calendrier, source/version, événements, intensités, consignes, secondes d’exécution, réservation et marge distinctes. Le rejeu JSON conserve l’objet et sa somme entière. Ce schéma interne n’est pas une API Nolio.

Cinq scénarios sans nouveau défaut complémentaire produisent un payload texte local vérifié par le contrat V1 existant : aéro5100s, nages2755/2860s et gainages1834/1924s. Le champ `duration` reçoit les secondes d’exécution exactes, jamais le créneau5100/2100s par assimilation. La description conserve les consignes source, les segments, tempos, côtés, tours, charge poids du corps et conventions de repos, ainsi que les marges explicitement non attribuées. Un garde indépendant et un test rouges ont détecté l’omission initiale de la charge ; le rendu corrigé est testé sans changer les paramètres. L’ID athlète1 reste une fixture, pas un destinataire réel.

Les nages sont des fixtures55min uniquement ; aucun payload n’est préparé pour les créneaux natifs35min. Les scénarios refusés (aéro90min, variante2K inconnue, recettes partielles) gardent seulement leur représentation interne de revue lorsque possible. Une recette partielle ne devient pas un workout complet. Source/profil altéré après le pont : refus.

Aucun `structured_workout` officiel Nolio n’est émis. La représentation des nages, éducatifs et exercices musculaires n’est pas démontrée par le seul miroir local ; la voie structurée de cette nouvelle couche reste refusée explicitement, même en vélo. Les travaux publics V19/V20 sont conservés sans inventer de contratV2. Le sender courant peut normaliser des cibles, ajouter des pauses natation ou retirer une structure de force ; aucun passage par cette voie n’est activé ou revendiqué fidèle par ce test.

La validation texte porte sur la sérialisation locale, pas sur l’acceptation distante ou une autorisation d’export.0 appel Nolio,0 écriture,0 export réel,0 approbation individuelle. Les15 fixtures antérieures sont conservées ; aucun sender n’a changé.
''')
doc('REPRISE.md','État de reprise V29',f'''Début observé : `{state['firstObservedAt']}` ; deadline : `{state['deadline']}`. Budget unique60min/10unités, sans renouvellement ni relance automatique. État persistant : `state.json`.

Preuve retenue : `evidence/validation-{attempt}` ; sources exécutées épinglées et copiées. Les quatre artefacts de build/rejeu sont identiques ; `evidence/independent-validation.json` détaille les compteurs et mutations. Une interruption d’environnement a arrêté la troisième validation après build/rejeu : ces deux reçus sont conservés, le journal partiel suivant archivé et les commandes restantes reprises dans la même tentative et le même budget. Les11 scénarios V28 et les cas négatifs sont rejoués par leurs fonctions/tests, pas par les contrôleurs V28 clôturés.

Quatre tests rouges, un garde texte indépendant et les sources avant réparation sont conservés : ancre cardiaque indûment requise en force ; vue publique du registre mutable ; charge poids du corps omise dans le texte ; confusion entre plafond d’exercice et disponibilité réservée. La version retenue isole les preuves, conserve les données musculaires et vérifie aussi les changements tardifs de bloc/profil/source. Le résultat historique V28, y compris ses deux défauts flottants et refus, reste intégralement disponible.

Prochaine étape : revue des trois décisions ciblées et de la tolérance/récupération individuelles ; préparation de formats structurés exacts uniquement sous contrat démontré, sans changer le calendrier historique. Les chronologies nage sont transportées sous les deux plafonds distincts inchangés ; les paramètres synthétiques et créneaux55min ne sont pas ceux de B et ne sont pas autorisés individuellement. Aucune réduction compensatoire.

Les trois calendriers A/B/C, les920 sources,2 425 variantes,600 configurations et archives V2–V28 restent intacts. #425 est lu en référence candidate seulement, sans calculateur importé. Aucune fusion, déploiement, migration, dépense, donnée réelle ou écriture Nolio. NO-GO maintenu. Toute reprise future exige un mandat explicite, sans promesse de relance permanente.
''')
print(json.dumps({'documents':10,'newTests':new,'legacyTests':old,'unchangedSkips':skips,'scenarios':len(rows)},indent=2))

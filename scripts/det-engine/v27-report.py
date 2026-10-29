"""Coach-readable reports rendered from executed contracts; full JSON remains in artifacts."""
import collections,gzip,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v27');attempt=sys.argv[1]if len(sys.argv)>1 else'2';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def save(name,text):(R/name).write_text(text.rstrip()+'\n')
rows=load(E/'build/results.json.gz');fixtures=load(E/'build/fixtures.json.gz');audit=load(R/'evidence/independent-validation.json');b=rows[1];executions=b['executions'];state=load(R/'state.json')
days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];common='DRAFT — NO-GO. Données synthétiques. Exécutabilité technique et approbation sportive individuelle restent distinctes. Aucune dose individuelle approuvée, aucune revue sportive humaine attestée.'
labels={'A':'Techniquement exécutable avec les paramètres disponibles','B':'Structure/intensité ou portée de variante encore à préciser','C':'Variante ou objectif incompatible','D':'Recette d’exécution incomplète','E':'Prérequis matériel/technique non confirmé','F':'Tolérance, capacité ou récupération individuelle non attestée','G':'Prescription refusée par une interdiction ou erreur de source'}
flag_labels={'recipe_structurally_complete':'Structure complète','objective_variant_compatible':'Variante compatible','full_duration_verified':'Durée complète vérifiée','intensity_anchor_resolved':'Intensité entièrement calculable dans le contrat','technical_prerequisites_satisfied':'Prérequis techniques connus satisfaits','current_capacity_documented':'Dans l’enveloppe déclarée','individual_tolerance_verified':'Tolérance individuelle vérifiée','recovery_compatible':'Récupération compatible attestée','coach_review_required':'Revue coach requise','individual_prescription_approved':'Prescription individuelle approuvée'}
def yn(v):return 'oui'if v is True else'non'if v is False else'inconnu / non applicable'
def status(e):return ', '.join(e['categories'])
def time_text(e):
 m=e['execution'];s=m.get('fullDurationSeconds',m.get('seconds'))
 return f'{int(s)//60} min {int(s)%60:02d} s, pour toutes les composantes écrites'if s is not None else'Non déterminée : des composantes ou occurrences restent inconnues'
def intensity_text(e):
 if e['sport']=='strength':return 'Pas de zone cardiaque utilisée pour représenter une charge musculaire. Tempo/charge/restes à préciser.'
 if e['sport']=='swim':return 'CSS crawl disponible dans le profil B ; aucune transposition aux éducatifs, au dos, à la brasse ou aux multi-nages. Allures et domaines de ces blocs non résolus.'
 parts=[]
 for t in e['intensity']['numericTargets']:
  if'min'not in t:continue
  factor=3.6 if t['unit']=='m/s'else 1;unit='km/h'if t['unit']=='m/s'else t['unit'];lo=t['min']*factor;hi=t['max']*factor
  parts.append(f"{t['zone']} / {t['domain']} : "+(f'≤ {hi:.2f} {unit} (aucune borne basse prescrite)'if lo==0 else f'{lo:.2f}–{hi:.2f} {unit}'))
 p=e['intensity']['sourcePower']
 if p:parts.append(f"Limite source 55–72 % FTP : {p['min']:.2f}–{p['max']:.2f} W ; plafond strict sur le plat et consignes de terrain conservés")
 if not parts:return 'Aucune cible numérique utilisable ; la référence manque ou reste bloquée.'
 return ' ; '.join(parts)+('. Toutes les contraintes d’intensité sont calculables dans la convention candidate.'if e['intensity']['resolved']else'. Ces calculs partiels ne résolvent pas les autres contraintes FC/LT1/terrain.')
def decision_text(e):
 if e['sourceId']=='SEILER_BIKE_Z1_LONG':return 'Résoudre le contrat de variante Ironman et le contexte matériel ; ne pas assimiler la recette générique à la variante180–210. Tolérance, FC et récupération restent à établir.'
 if e['sourceId']=='A_SWIM_CONTINUOUS_2K':return 'Préciser la portée de « augmenter à3000m », chronométrer toutes les nages/parties et vérifier le créneau40min ; ne pas supprimer échauffement/retour au calme.'
 if e['sourceId']=='C_BIKE_AERO_POSITION_DRILLS':return 'Choisir explicitement une occurrence de récupération finale après revue, vérifier la tolérance aux6×10min et les symptômes cervicaux/lombaires ; ne pas adapter le repos pour atteindre85min.'
 if e['sport']=='strength':return 'Documenter les exercices, compétences, charges, tempo, repos et transitions manquants. Une déclaration de compétence ne prouve ni assimilation ni durée totale.'
 if e['sport']=='swim':return 'Documenter les allures de chaque nage/éducatif, les transitions et les récupérations manquantes. Les hypothèses synthétiques ne sont pas les capacités de B.'
 if e['sourceId']=='A_RUN_Z2_EASY':return 'Préciser si45–75min décrit le bloc Z2 ou toute la séance, et quels éducatifs sont exécutés ; conserver les composants et l’enveloppe actuels.'
 if e['sourceId']=='SEILER_RUN_Z1_EASY_LONG':return 'Dérogation de programmation90 déjà accordée : ne pas la redemander. Vérifier séparément la terminologie Z1, FC/LT1, terrain, tolérance et récupération.'
 return 'La recette et les cibles sont techniquement présentables ; vérifier encore la qualité de l’ancre, la tolérance à la dose exacte, les symptômes et la récupération, puis décider explicitement de la prescription.'

counts={k:sum(e['flags'][k]is True for e in executions)for k in flag_labels}
text=f'''# V27 — séances exécutables, sans approbation individuelle

{common}

Baseline `ec65f318b943f4a65f5df059288e1abd9e874ae4`. #425 V2.3 lu au SHA `9f67b70240d21f4d07ef29828a64d01b2060fadf`, uniquement comme contrat candidat documentaire. Aucun code physiologique importé.

**Capacité nouvelle exécutée :** trois réservations de B de la même source `A_RUN_EASY_45_PRO` deviennent des objets d’exécution technique de2700secondes, avec la variante « ok », les consignes originales et les domaines calculés depuis la référence course235s/km, au moyen de la doctrine et du binding coach V22 existants. Il s’agit d’un nouveau chemin d’instanciation/contrôle, pas de trois nouvelles recettes de bibliothèque ni d’une nouvelle dose optimale. Les contrôles A et C ne reçoivent aucune prescription course exécutable.

Le calendrier B reste identique à V26. Tolérance et récupération spécifiques restent non attestées ; zéro approbation individuelle. Les catégories A et F peuvent donc coexister. Toutes les autres conditions historiques restent dans les artefacts, sans effacement.

| Dimension indépendante sur les30 réservations B | Nombre de oui |
|---|---:|
'''
for k,label in flag_labels.items():text+=f'| {label} | {counts[k]} |\n'
text+=f"\n**3 contrats techniques exécutables /30**, pour **1 ID source**. {audit['NolioTextFixtures']} fixtures texte Nolio locales passent, avec durée/date/consignes/cibles conservées ; aucune écriture ni workout structuré présenté comme complet.\n\n"
text+='Quatre conflits explicites de variante longue vélo sont désormais visibles dans le complément :105/120/130/145min ne satisfont pas180–210min. Le générique90–180min ne constitue pas une dérogation. La restriction de ventilateur est traitée comme le prédicat contextuel écrit ; sa métadonnée historique reste intacte.\n\n'
text+='Trois scénarios de temps natation entièrement déclarés calculent2755,2860 et3090secondes. Tous dépassent les créneaux35/40min concernés de B ; aucun paramètre n’est injecté dans B. L’aéro conserve deux interprétations85/90min, sans choix automatique. La force conserve les tempos/restes/transitions inconnus.\n\n'
text+='Un garde indépendant a révélé une source trail explicitement non destinée à Ironman qui passait le contrôle générique. Les trois essais initiaux ajoutaient une alerte et n’ont jamais été appliqués. Un contrôle complémentaire exige maintenant l’appartenance de l’objectif aux objectifs déclarés : le test rouge avant et les preuves sont archivés. Aucun validateur historique n’a changé.\n\n'
tests=re.search(r'Tests\s+(\d+) passed',(E/'build.txt').read_text());text+=f"Validation : **{tests.group(1)if tests else 'voir logs'} tests V27 réussis**, puis rejeu ; **351 tests de non-régression réussis**,5 anciens skips inchangés, TypeScript réussi. Quatre artefacts logiquement identiques au rejeu ; vérification Python indépendante réussie. Les7 refus course A, les26 refus C et les erreurs/avertissements historiques sont conservés.\n\n"
text+=f"{audit['previousFilesUnchanged']} fichiers antérieurs inchangés ;920 IDs,2425 variantes,600 configurations historiques et15 fixtures Nolio préservés. Les600 configurations sont recomptées, pas réexécutées. Aucun changement de calendrier, dose, phase, récupération ou règle de production.\n"
save('V27_RESULTS.md',text.replace('de2700secondes','de 2 700 secondes').replace('course235s/km','course 235 s/km').replace('les30 réservations','les 30 réservations').replace('exécutables /30','exécutables / 30').replace('3min','3 min'))

save('WORKOUT_EXECUTION_CONTRACT.md',f'''# Contrat d’exécution V27

{common}

Le contrat utilise dix états indépendants, booléens ou explicitement inconnus/non applicables : `recipe_structurally_complete`, `objective_variant_compatible`, `full_duration_verified`, `intensity_anchor_resolved`, `technical_prerequisites_satisfied`, `current_capacity_documented`, `individual_tolerance_verified`, `recovery_compatible`, `coach_review_required`, `individual_prescription_approved`.

Une durée complète signifie que toutes les parties écrites ont un témoin temporel à la dose réservée, pas que la séance est tolérée. Les repos/transitions absents restent inconnus. Les temps intégrés ne sont pas ajoutés deux fois. Une plage numérique calculable ne certifie ni LT1 ni la qualité scientifique de l’ancre. Les paramètres techniques d’un exercice de force ne deviennent pas des zones cardio.

`technicallyExecutable` exige structure, variante, durée complète, égalité au créneau, intensité requise résolue, prérequis, enveloppe déclarée suffisante et absence d’interdiction. Ce champ ne commande aucun envoi ni exécution réelle : `operationalAuthorization`, `individual_prescription_approved` et `readyForAthlete` restent false. La tolérance et la récupération individuelle restent des conditions séparées, même pour les3 contrats techniques positifs.

Le contrat est une vue complémentaire : source canonique/IR et carte opérationnelle vérifiées, objectifs/variante explicités, instanciateur V18 et cibles V22 réutilisés. Les sources, réservations et décisions natives ne sont pas mutées. L’intégrité d’une source ou de sa recette altérée entraîne un refus avant toute instanciation.

La preuve intégrée V24/V25 de la course90min est réutilisée telle quelle :10min initiales et10min finales sont incluses dans90, pas ajoutées. Le statut ambigu de l’ancien IR reste visible ; il n’annule pas cette preuve littérale ciblée existante. Le temps complet est donc connu dans ce périmètre, mais FC/LT1, tolérance et récupération ne le sont pas. Aucune nouvelle autorisation du floor n’est sollicitée.

Une référence positive des fixtures initiales autorise le calcul technique dans ce seul périmètre synthétique. Sa méthode, date précise et validité scientifique individuelles ne sont pas inventées. Une référence explicitement périmée/incertaine/absente reste inutilisable. Les paramètres natation déclarés sont de nouveaux scénarios documentés, jamais des observations de B.

Une recette de bibliothèque peut être complète en mètres et rester incomplète en temps ou en repos ; une prescription de force peut avoir des répétitions connues sans durée totale. Les champs ne sont jamais fusionnés en un booléen « validé ».
''')

overview=f"# Audit des30 réservations B\n\n{common}\n\n| Semaine / jour | Source | Créneau | Durée complète | Variante | Classes | Contrat technique |\n|---|---|---:|---|---|---|---|\n"
for e in executions:overview+=f"| S{e['week']} {days[e['day']]} | {e['sourceId']} | {e['minutesReserved']}min | {yn(e['flags']['full_duration_verified'])} | {yn(e['flags']['objective_variant_compatible'])} | {status(e)} | {yn(e['technicallyExecutable'])} |\n"
overview+='\nCatégories cumulables :\n\n'+''.join(f'- **{k}** : {label}.\n'for k,label in labels.items())
overview+='\nLes incompatibilités objectives sont des diagnostics nouveaux d’une prescription ancienne, pas des erreurs historiques effacées ou des changements de dose. Les résultats historiques bruts et ceux du contrôle quatre semaines restent identiques à V26. La table distingue les inconnues des refus établis.\n'
save('PROFILE_B_SESSION_AUDIT.md',overview)

longs=[e for e in executions if e['sourceId']=='SEILER_BIKE_Z1_LONG']
text=f"# Conflit recette générique / variante longue vélo\n\n{common}\n\nRecette générique écrite :90–180min, échauffement15 et retour15 intégrés. Fourchette catalogue90–210min, dont la partie au-dessus180 n’est pas démontrée par la recette générique. Variante Ironman : **180–210min**, avec consignes de ravitaillement à conserver. Intersection temporelle littérale générique/variante :180min seulement ; ceci ne prouve pas une tolérance à180min.\n\n| Semaine | Réservé | Générique | Variante IM | Enveloppe déclarée | Minutes hebdo si180 à la place | Budget hebdo |\n|---|---:|---|---|---:|---:|---:|\n"
for e in longs:
 w=b['calendar']['calendar']['weeks'][e['week']-1];text+=f"| {e['week']} | {e['minutesReserved']} | oui, temps intégré | **non** | {e['currentCapacity']} | {w['reservedMinutes']+180-e['minutesReserved']} | {w['budget']} |\n"
text+='\nLa dernière colonne est une comparaison arithmétique, pas un plan alternatif validé ni une prescription180. Aucun remplissage de budget, raccourcissement d’une autre discipline ou compensation n’est appliqué. Récupération et tolérance aux doses spécifiques restent inconnues.\n\n'
text+='La phase base autorise la fiche générique selon les phases historiques. Cela n’autorise pas à déclarer120min conforme à la variante IM180–210. Aucun contrat préexistant ne dispense explicitement cette variante en base. Le complément conserve donc le conflit ; il ne promeut pas un nouveau modèle physiologique de base. Une évolution de ce contrat nécessiterait une justification distincte.\n\n'
text+='Le parseur historique n’exécute que des variantes numériques entièrement reconnues ; cette variante avec texte supplémentaire reste `variant_not_executable` quand elle est explicitement demandée. Sans variantKey, il applique la durée générique. Ces deux résultats bruts sont conservés ; l’absence de blocage ancien ne constitue pas une preuve d’applicabilité.\n\n'
text+='Matériel : intérieur avec ventilateur déclaré → la restriction écrite est satisfaite ; intérieur sans ventilateur → refus ; extérieur → l’antécédent « home trainer » est faux pour cette seule restriction ; contexte inconnu → inconnu. La métadonnée `ventilateur` reste dans le résultat historique. Aucune dispense générale, ni tolérance physiologique déduite du matériel.\n\n'
text+='FTP265W :55–72% donne145,75–190,80W. Sur le plat, le plafond source est strict ; les côtes, descentes, cadence et FC sont conservées. FCmax explicite absente : aucun calcul à partir de l’âge. Le calcul de puissance ne résout donc pas toutes les consignes, ni le conflit de variante.\n'
save('LONG_BIKE_VARIANT_CONFLICT.md',text)

save('SWIM_EXECUTION_TIMING.md',f'''# Natation — temps complet distinct des mètres et de la CSS

{common}

| Source | Distance générique écrite | Récupérations et inconnues |
|---|---:|---|
| C_SWIM_CATCH_FOCUS |300+8×50+8×50+6×100+200 = **1900m**|15s après les répétitions scull et catch-up, occurrence finale non précisée ; repos des6×100 non écrit ; allures techniques et transitions inconnues |
| C_SWIM_TRI_CATCH_PULL |300+8×(50+50+100)+200 = **2100m**|15s externe écrit ; overlay syntaxique le reconnaît sans choisir7 ou8 occurrences ; allures et transitions inconnues |
| A_SWIM_CONTINUOUS_2K |400+2000+200 = **2600m**|warm-up multi-nages et retour dos non chronométrables par CSS crawl ; variante « augmenter à3000m » de portée non tranchée |

Le total1900/2100/2600 est documentaire, pas une distance réellement réalisée. CSS105s/100m dans B n’est pas une allure d’éducatif, de dos ou de multi-nages, ni automatiquement la dose Z2. Aucun protocole entier de35 ou40min n’est ainsi justifié.

Scénarios préenregistrés séparés des données B :

- Catch-pull : allures déclarées120/140/130/110/120s/100m pour les cinq types de blocs ; repos entre séries7×15s ;18 transitions déclarées de5s → **2755s (45min55)**.
- Catch-focus :120/180/150/110/120s/100m, deux séries de7×15s et proposition nouvelle5×10s de repos pour6×100 ; quatre transitions5s → **2860s (47min40)**.
- Continu générique : multi-nages145, crawl110 et dos150s/100m, deux transitions5s → **3090s (51min30)**. Ces valeurs sont des déclarations de scénario et ne proviennent pas de CSS.

Les trois durées peuvent entrer dans une fenêtre synthétique55min, mais dépassent les créneaux B correspondants. Aucune durée n’est choisie pour obtenir35/40min. Le protocole continu reste en outre soumis au conflit de portée de sa variante IM. Les transitions déclarées et le choix du dernier repos sont des hypothèses nouvelles, pas des faits historiques ou des capacités individuelles.

Le compilateur V18 et les faits de distance V19 sont réutilisés. L’overlay V27 se limite au repos externe dont la quantité est littéralement écrite. Il ne résout pas sa dernière occurrence. Sans tempo technique, repos ou transition requis, le temps total reste null.
''')

save('STRENGTH_EXECUTION.md',f'''# Force et supports musculaires

{common}

`A_STR_STABILITY_CORE` : échauffement mobilité5min, trois tours, puis stretching5min. Chaque tour prescrit : planche frontale45s, latérale30s/côté, bird-dog10/côté, dead bug12/côté, pont fessier unipodal10/côté, clamshell15/côté. Les unités par côté sont conservées ; aucun nombre de côtés ou tempo n’est inventé pour calculer le temps total.

Les périphéries écrites font600s. Les répétitions, temps de changement, repos, charge/mode de charge et exécution bilatérale ne permettent pas de démontrer25min complètes. Le modèle identifie les six exercices et leurs doses écrites, mais retourne une durée totale inconnue. Aucun calcul à partir d’un nombre de répétitions et aucune zone cardiaque substituée à une charge neuromusculaire.

`ENR_RECUP_MOBILITE_YOGA` : respiration/mobilité5min, bloc20–30min avec postures et répétitions, savasana5min. L’enveloppe annoncée ne répartit pas le temps de chaque répétition, transition et posture. Le modèle V18 conservé reste descriptif ; aucun gain de force maximale ou d’économie n’est déduit du support.

Trois contrôles de compétence déclarée (oui/non/inconnue) testent le prérequis technique. La déclaration positive ne complète ni tempo, ni repos, ni durée, ni preuve d’assimilation ; l’approbation individuelle reste false. Demande ciblée : préciser les paramètres ci-dessus, la familiarité des mouvements, les symptômes et la récupération croisée.
''')

save('AERO_POSITION_EXECUTION.md',f'''# Posture aéro — occurrence de récupération non résolue

{common}

Source inchangée : **6×10min**, avec **5min relâchées Z1**. Cela représente3600s en position, par bouts continus de600s ; pas60min continus. Le repos final n’est pas spécifié.

| Interprétation documentaire | Repos | Durée totale du contenu écrit |
|---|---:|---:|
| Entre les six bouts |5×5min |85min |
| Après chaque bout, dernier compris |6×5min |90min |
| Source seule |Occurrence inconnue |Durée complète inconnue |

Le créneau85min de B ne permet pas de choisir la première interprétation. Les variantes de test déclarent leur convention comme une proposition nouvelle, pas une validation source. La seconde conserve90min même si elle ne tient pas dans le créneau ; aucune récupération n’est supprimée.

Une répartition4×15min aurait des bouts de900s au lieu600 ; le même volume postural total ne démontre aucune équivalence physiologique. Tolérance, symptômes cervicaux/lombaires, récupération et maintien de la puissance sont distincts. Une douleur entraîne un refus ; une compétence déclarée n’atteste pas la tolérance à la prescription.
''')

save('INTENSITY_RESOLUTION.md',f'''# Intensités — calcul technique et preuve individuelle

{common}

Les cibles réutilisent exclusivement `resolveV22Targets`, `resolvePhysiologicalReferences` et `tfclDoctrine.ts`. B conserve FTP265W et allure seuil brute235s/km ; A conserve290s/km et son conflit critique ; C conserve ses références absentes. Aucune VMA, VO₂max, VLamax, FTP ou coût énergétique n’est remplacé.

Pour la course facile45min B, les domaines Z1/recovery et Z2/moderate_lt1 sont ceux du binding coach V22 déjà préenregistré. L’ancre déclarée convertit235s/km en3600/235km/h ; les fractions de doctrine produisent les plages, sans nouveau pourcentage. Une borne0 signifie absence de minimum prescrit, pas une consigne de courir à0. L’affichage coach est arrondi ; les bornes exactes restent dans les artefacts.

Ce calcul ne démontre ni LT1 mesuré, ni validation de l’allure seuil. La date de contexte27/10 est conservée, sans l’inventer comme date précise de chaque test ni créer d’expiration universelle. Une référence explicitement périmée/incertaine/absente est refusée ; aucun target numérique n’est alors utilisable. Les limites FC/LT1/terrain des sources restent opérantes : FCmax n’est pas estimée depuis l’âge pour les satisfaire.

La V2.3 #425 est lue par ses vrais fichiers de contrat, avec provenance Git conservée. Elle distingue contexte documenté, source indépendamment vérifiée et validité/dose individuelle. Une VLamax issue de lactate est calculée/estimée, pas mesure directe du flux glycolytique ; un score interne0,95 n’est pas une probabilité individuelle. Aucun code #425 n’est importé ni supposé fusionné, aucune persistance Supabase réelle attestée. Les7 refus course A restent intégralement actifs.
''')

alt=b['alternatives'];offers=sum(len(s['offers'])for s in alt['searches']);eligible=sum(len(s['eligibleSourceIds'])for s in alt['searches'])
save('ALTERNATIVE_SESSION_SEARCH.md',f'''# Alternatives — mêmes rôle, discipline et contraintes

{common}

Le catalogue canonique existant est lu, pas reconverti. Pour chaque réservation non exécutable, la recherche conserve discipline, catégorie source, rôle aérobie autonome lorsqu’il est requis, durée, jour, floor historique, enveloppe et contexte. Elle confronte la structure réelle et les objectifs déclarés ; aucun titre ni score pondéré ne choisit une séance. Les paramètres d’exécution inconnus restent bloquants. Les conditions individuelles restent séparées.

{offers} offres source examinées sur27 réservations en défaut ;{eligible} éligibles techniquement sous les contraintes connues ;{len(alt['trials'])} nouveaux essais complets après le garde d’objectif. Zéro substitution appliquée. Une offre réellement admissible aurait été revalidée comme plan complet, avec sources/doses non modifiées ailleurs, validateurs historiques et contrôle quatre semaines, dans une limite de3 essais. Les ex æquo ne sont pas départagés artificiellement.

L’essai initial a retrouvé `A_TR_EF_SENTIER` pour trois longues course. Sa structure chronométrée est complète, mais ses objectifs sont exclusivement trail et sa charge de terrain n’est pas documentée pour B. Le contrôle historique générique ne vérifie l’objectif que sur certaines cartes marquées objectiveSpecific. Les trois essais de plan ajoutaient un avertissement `key_session_self_declaration_mismatch` et n’ont jamais été appliqués.

Un garde indépendant et un test négatif ont établi l’écart. Le complément V27 exige maintenant l’appartenance aux objectifs déclarés même lorsque le contrôle historique générique est permissif. Il conserve les résultats historiques bruts ; le candidat trail est rejeté avant sélection. Il ne s’agit pas d’une modification des règles de production ni d’un arbitrage physiologique ajoutant du trail à Ironman.

Les longues vélo complètes disponibles demandent d’autres doses/variantes (souvent180min et plus), ou un objectif différent. Les autres candidats gardent leurs inconnues de variante, intensité, matériel ou recette. Aucune séance obligatoire n’est supprimée et aucune charge n’est compensée.
''')

before=b['beforeV26'];text=f"# Avant / après V26\n\n{common}\n\nMême cohorte de30 réservations, mêmes inputs et calendrier.\n\n| Indicateur | V26 conservé | V27 |\n|---|---|---|\n"
text+=f"| Sources génériques compilées complètes V18 | {sum(x['sourceRecipeClass']=='complete'for x in before)} | inchangées, aucune migration |\n"
text+=f"| Ancien indicateur de temps source connu | {sum(x['sourceGenericTimingPreviouslyKnown']for x in before)} | conservé brut ; ne prouve pas toutes les occurrences à la dose réservée |\n"
text+=f"| Nouveau contrat de durée complète à la réservation | non implémenté sous cette forme | {counts['full_duration_verified']} |\n| Anciennes cibles numériques disponibles | {sum(x['numericTargetsPreviouslyAvailable']for x in before)} | conservées ; une plage ne résout pas FC/LT1/terrain |\n| Nouveau contrôle d’intensité complète requise | non implémenté sous cette forme | {counts['intensity_anchor_resolved']} |\n| Variante compatible explicitée | ancien indicateur ne distinguant pas tous les marqueurs/doses | {counts['objective_variant_compatible']} oui,4 non,7 inconnues |\n| Contrat exécutable complet matériel/source/cibles/durée | absent ; non équivalent à0 recettes exploitables |3 réservations,1 source |\n| Décisions coach |30 conditions natives préservées |30 revues requises |\n| Approbations individuelles |0 |0 |\n"
text+='\nLes unités des anciens indicateurs sont conservées et ne sont pas artificiellement rendues équivalentes aux nouveaux champs. Le gain est le nouveau chemin d’exécution pour la course45min, une résolution explicite des marqueurs de variante sans dose nouvelle et des refus plus précis. Zéro condition historique effacée. Les contrats natation/aéro/force montrent les paramètres indispensables sans les fabriquer.\n\nLes90 réservations A/B/C, les issues historiques et les résultats du contrôle quatre semaines sont identiques à V26. Les nouveaux conflits de variante vélo sont des diagnostics complémentaires, pas des modifications de la prescription.\n'
save('BEFORE_AFTER_V26.md',text.replace('30 conditions natives préservées','30 réservations conditionnelles, conditions natives préservées'))

cond_labels={'protocol_time':'Chronométrer le protocole complet sans supprimer de composante','swim_execution':'Vérifier nages, éducatifs, temps réel et symptômes d’épaule','movement_competence':'Documenter les compétences de mouvement et les charges','posture_response':'Vérifier la position, les symptômes et la réponse posturale','recovery':'Réévaluer la récupération de l’exposition précédente, sans supposer une adaptation','whole_week_interaction':'Revoir les interactions natation/vélo/course/musculaire, nutrition et récupération','strict_variant_Z1_individual_execution_unverified':'Confirmer l’interprétation Z1, les limites individuelles FC/LT1/terrain et la récupération'}
text=f"# Profil B — revue des30 séances\n\n{common}\n\nLes heures réservées ne prouvent ni la durée réalisable ni l’adaptation. Les consignes sources sont reproduites intégralement pour la revue, sans approbation de leurs affirmations scientifiques. Les indicateurs techniques sont séparés des conditions individuelles.\n\n"
text+='Légende des statuts cumulables : A = contrat techniquement présentable ; B = paramètre/portée non résolu ; C = variante incompatible ; D = recette incomplète ; E = prérequis non confirmé ; F = conditions individuelles non attestées ; G = refus actif. A+F signifie donc structure technique disponible, prescription individuelle encore non approuvée.\n\n'
for e in executions:
 text+=f"## S{e['week']} — {days[e['day']]} — {e['title']}\n\n**{e['sport']} · {e['minutesReserved']}min réservées · source `{e['sourceId']}`**\n\nStatuts : **{status(e)}**. "+('Contrat techniquement exécutable ; dose individuelle non approuvée.'if e['technicallyExecutable']else'Contrat technique non complet/admissible dans ce créneau.')+'\n\n'
 text+=f"Objectif source : {e['title']}. Cette intention est une déclaration de la fiche, pas une adaptation obtenue.\n\nDéroulement exact :\n\n"
 for part in e['originalParts']:text+=f"- **{part['part']}** : {part['text']}\n"
 material=(f"Contexte {e['equipment']['setting']} ; application du prédicat ventilateur : {yn(e['equipment']['compatible'])}."if e['equipment']['reason']!='no_equipment_condition_in_this_source'else'Aucune condition matérielle spécifique écrite par ce contrôle ; le contexte réel reste à confirmer.')
 fit_text=yn(e['fits_reserved_window'])if e['flags']['full_duration_verified']else'non démontrée, durée inconnue'
 text+=f"\nDurée : {time_text(e)}. Correspondance exacte au créneau : {fit_text}.\n\nIntensité : {intensity_text(e)}\n\nVariante : {e['variant']['text']or'aucune variante spécifique écrite'} ; compatibilité : {yn(e['variant']['compatible'])}. Les remarques descriptives ne constituent pas une dérogation de dose.\n\nMatériel : {material} Restriction source intégrale : {e['equipment']['literalRestriction']}. Les prérequis historiques ne sont pas effacés.\n\nEnveloppe déclarée : {e['currentCapacity']}min ; dose dans cette enveloppe : {yn(e['flags']['current_capacity_documented'])}. Cela n’atteste pas la tolérance à cette recette.\n\nConditions individuelles et techniques encore ouvertes :\n\n"
 for c in e['individualConditionsUnchanged']:text+=f"- {cond_labels.get(c['id'],'Point source à clarifier')} (`{c['id']}`), avant S{c['beforeWeek']}.\n"
 text+='- Tolérance à la dose exacte non attestée ; récupération et symptômes à réévaluer ; revue coach obligatoire.\n'
 if e['hardFailures']:text+='- Refus actifs conservés : '+', '.join(e['hardFailures'])+'.\n'
 text+='\n**Décision coach :** '+decision_text(e)+'\n\n'
save('COACH_REVIEW_30_SESSIONS.md',text)

save('NOLIO_SIMULATION.md',f'''# Nolio — texte local compatible uniquement

{common}

Trois réservations B de course45min satisfont le contrat technique. Les fixtures texte réutilisent le contrat local Nolio V1 existant, conservent l’ID source, la date réelle du jour du calendrier synthétique,2700s, toutes les consignes et restrictions, puis ajoutent les domaines calculés et les inconnues individuelles. Les dates des trois occurrences ne sont pas ramenées arbitrairement au même jour.

Les87 autres occurrences A/B/C sont explicitement refusées par cette nouvelle voie d’encodage. La bibliothèque et les anciens rendus restent disponibles inchangés pour lecture coach ; aucun contenu n’est supprimé.

Aucun workout structuré n’est émis, aucune API v2 inventée, aucune connexion réseau ou écriture réelle Nolio. L’ID athlète1 du contrat local reste une fixture synthétique et n’est pas un destinataire réel. La réussite de sérialisation locale ne démontre ni l’acceptation distante ni une prescription approuvée. Les15 fixtures précédentes et les correctifs V20 sont conservés.
''')

save('REPRISE.md',f'''# État de reprise V27

{common}

Début observé : {state['firstObservedAt']}. Deadline : {state['deadline']}. Budget unique60min/10unités, sans renouvellement ni relance automatique. L’état final et les unités sont dans `state.json` ; les contrôleurs clôturés ne doivent pas être relancés sans nouveau mandat.

Preuve retenue : `evidence/validation-{attempt}/build`, rejeu dans `replay`, sources exécutées épinglées dans `executed-source-pins.json` et copiées dans `executed-new-sources`. Vérificateur indépendant : `scripts/det-engine/v27-independent.py`. Garde d’objectif indépendant : `v27-goal-guard.py`. Générateur documentaire : `v27-report.py`.

Les essais initiaux et trois remplacements trail non appliqués restent dans `evidence/development-2` et `validation-1`. Le garde et le test rouges sont conservés dans `goal-negative-before.txt` et `goal-unit-before.txt`, avec leurs sources. La sélection finale les refuse avant essai. Aucun calendrier A/B/C n’est modifié.

Prochain travail : clarifier les variantes Ironman des longues vélo et des sources de nage/course ambiguës, documenter les paramètres d’exécution réellement manquants, puis décider individuellement de la tolérance et de la récupération. La dérogation90min est déjà accordée dans son périmètre : ne pas la redemander. Ne pas remplacer les inconnues par les paces ou conventions synthétiques du présent dossier.

#425 reste un contrat candidat en lecture seule au SHA consigné. Aucune importation de calculateurs ou données, aucune fusion, déploiement, migration, donnée réelle ou écriture Nolio. Les7 refus A, les références manquantes C et toutes les preuves V2–V26 sont préservés.
''')
print('13 coach-readable V27 documents generated')

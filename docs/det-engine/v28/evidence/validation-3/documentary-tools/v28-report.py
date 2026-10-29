"""Generate compact review dossiers from independently checked execution artifacts."""
import gzip,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v28');attempt=sys.argv[1] if len(sys.argv)>1 else '3';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
summary=load(R/'evidence/independent-validation.json');assert summary['passed'];scenarios=load(E/'build/scenarios.json.gz');phases=load(E/'build/phases.json.gz');inputs=load(R/'inputs.json');state=load(R/'state.json');originals=load(E/'build/originals.json.gz')
banner='DRAFT — NO-GO. Tous les cas sont synthétiques. Complétude technique, compatibilité de calendrier, admissibilité individuelle et approbation coach sont distinctes. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée.\n\n'
def doc(name,title,body):(R/name).write_text('# '+title+'\n\n'+banner+body.rstrip()+'\n')
def yes(v):return 'oui' if v is True else 'non' if v is False else 'inconnu'
def duration(s):return 'inconnue' if s is None else f'{int(s)//60}:{int(s)%60:02d}'
def table(headers,rows):return '| '+' | '.join(headers)+' |\n|'+ '|'.join(['---']*len(headers))+'|\n'+''.join('| '+' | '.join(('non déclaré' if x is None else str(x)).replace('|','/') for x in row)+' |\n' for row in rows)+'\n'
by={s['context']['scenarioId']:s for s in scenarios};m=summary
commands=load(E/'commands.json');tests=[]
for c in commands:
 text=(E/(c['name']+'.txt')).read_text();match=re.search(r'Tests\s+(\d+) passed',text);skip=re.search(r'(\d+) skipped',text)
 tests.append((c['name'],int(match[1]) if match else None,int(skip[1]) if skip else 0,c['status']))
new=next(x[1] for x in tests if x[0]=='build');legacy=sum(x[1] or 0 for x in tests if x[0].endswith('non_regression'));skips=sum(x[2] for x in tests if x[0].endswith('non_regression'))
rows=[]
for s in scenarios:
 r=s['result'];b=s['wholeBlockReview'];rows.append([s['context']['scenarioId'],s['sourceId'],duration(r['seconds']),yes(r['technically_complete_in_scenario']),yes(r['compatible_with_reserved_slot']),yes(r['objectiveVariant']['compatible']),yes(b['acceptedAsSeparateTechnicalScenario'])])
scenario_table=table(['Scénario','Source','Temps exact','Complet techniquement','Créneau compatible','Variante compatible','Bloc sans nouveau défaut'],rows)
doc('V28_RESULTS.md','V28 — résolution paramétrique vérifiée',f'''Baseline `{state['baseline']}`. Le profil B original, lui-même synthétique, conserve exactement ses 30 réservations et ses trois contrats exécutables de course issus d’un ID. A et C, leurs références, calendriers et résultats bruts restent inchangés.

**Gain fonctionnel :** {m['syntheticTechnicallyCompleteScenarios']} scénarios paramétrés complètement instanciés sur {m['syntheticCompleteSourceCount']} sources distinctes : {', '.join('`'+x+'`' for x in m['syntheticTechnicallyCompleteSourceIds'])}. Aucun de ces paramètres nouveaux n’est injecté dans B. La force acquiert un calcul d’exécution complet qui n’existait pas en V27 ; nage et aéro réutilisent leurs marcheurs/parsers et gagnent un contrat de paramètres liés à la source, des intensités de segments et une revue de bloc.

{scenario_table}
{m['syntheticCompleteTimingScenarios']} temps complets sont calculés. Un seul scénario (`aero_between`) passe la comparaison de bloc sans nouveau défaut. Ce résultat signifie absence de régression par rapport à la baseline conditionnelle ; **les cinq erreurs historiques B et ses 34 avertissements ne disparaissent pas**. Ce n’est pas une validation complète du mésocycle ou de la préparation Ironman.

Les chronologies natation/force exactes avec secondes ne sont pas insérables dans le schéma historique `durationMin` entier : {m['syntheticFractionalMinuteBlockRefusals']} essais refusés. Les diagnostics complets sont conservés. Les deux alertes arithmétiques supplémentaires sur les propositions de nage proviennent aussi d’une comparaison flottante stricte ; les sommes indépendantes restent sous budget. Aucun seuil ni validateur n’est modifié, aucun arrondi ou contenu tronqué.

**Sécurité corrigée avant conservation :** le premier modèle de force choisissait implicitement les occurrences finales des repos. Un garde indépendant et un test rouges le démontrent. La deuxième revue a également exigé les transitions périphériques et la composition des repos à la frontière exercice/tour. Les premiers runs verts ne qualifient donc pas ces modèles comme complets. Les conventions et transitions nouvelles sont enregistrées dans deux fichiers séparés avant leur exécution ; inconnues ou propositions restent bloquantes. Les sources et preuves des trois validations sont préservées.

Validation finale : **{new} tests V28**, rejeu ; **{legacy} tests de non-régression**, {skips} skips historiques inchangés ; TypeScript réussi. Six artefacts logiques identiques au rejeu ; vérifications Python indépendantes et garde de repos réussis. Les mutants de repos, tempo, source, CSS transférée et approbation fictive sont rejetés.

{m['previousFilesUnchanged']} fichiers antérieurs inchangés ; 920 IDs, 2 425 variantes, 600 configurations historiques et 15 fixtures Nolio préservés. Les 600 cas sont recomptés, pas réexécutés. Aucun appel Nolio, aucune nouvelle sortie exportée, aucun changement de production ou des 920 sources. Zéro approbation individuelle, zéro revue sportive humaine, zéro substitution automatique.

#425 a avancé de `9f67b702…` à `429a84c1c35255843251a478ef3f48ab0dd907c6` au démarrage ; son dossier de risques V2.3.1 a été lu comme contrat candidat uniquement. Aucune formule ou valeur importée ; les sept refus course A et les 26 refus C restent identiques.
''')
doc('PARAMETRIC_EXECUTION_CONTRACT.md','Contrat paramétrique de séance', '''Le résolveur `experimental/det-engine/v28-execution.ts` étend V27. Il réutilise V18, les chronologies V27, la résolution V22 des intensités, les gardes de variantes V27, la revalidation V22, la portée V23 et les témoins historiques V24. Il ne sélectionne pas un nouveau plan et ne remplace aucun moteur.

Chaque paramètre porte : clé, valeur, unité, statut, origine, ID source, empreinte canonique, empreinte recette, portée scénario/objectif/phase, date/version du contexte, effets et contrôles à rejouer. L’intégrité est recalculée contre la compilation source et les empreintes. Une mauvaise unité, portée, version, empreinte, clé dupliquée ou donnée runtime mal formée bloque le résultat.

| Paramètre | Effet calculable dans ces scénarios |
|---|---|
| aéro, occurrence finale | 5 ou6 repos300s ; travail3600s inchangé ; différence300s |
| nage, allure par libellé | secondes = mètres/100 × allure déclarée, pour chaque occurrence écrite |
| nage, transition | un événement par frontière déclarée ; aucune transition inconnue remplacée par zéro |
| nage, repos et occurrence | conserve la durée source du repos ; compte selon la convention explicitement fournie |
| force, tempo | répétitions × côtés × tours × secondes/répétition ; les maintiens restent en secondes source |
| force, changement de côté | 15 changements dans ce circuit à deux côtés ;75s avec le paramètre5s |
| force, repos exercice | 15 ou18 événements10s selon la dernière occurrence ; différence30s |
| force, repos tour | 2 ou3 événements60s ; différence60s |
| force, transitions périphériques | deux événements5s ;10s, sans réduire les5min de chaque périphérie source |
| force, charge et composition | mode poids du corps déclaré ; repos cumulés seulement sous convention additive explicite ; aucune conversion en zone cardiaque |

Ce tableau décrit l’effet technique des valeurs de test. Il n’attribue aucun bénéfice physiologique à une seconde ou un repos supplémentaire. Toute modification rejoue les dix familles de contrôles portées dans les paramètres ; le résultat du bloc reste une sortie distincte.

`known` signifie valeur explicitement déclarée dans son contexte, jamais mesure scientifiquement vérifiée. `unknown` et `proposed` restent non exécutables. `authorized` ou origine coach exigent une décision documentaire exacte et un vérificateur humain externe ; ce vérificateur n’est jamais fourni par le harnais offline. Une simulation ne peut autoriser un document. Aucun mécanisme nouveau n’approuve une dose individuelle.

Les textes originaux bruts, la structure canonique enrichie et la variante sont séparés. Les phases originales et enrichies sont également affichées : l’élargissement historique base/build→peak ne vaut pas autorisation du protocole original en peak. Le nouveau garde complémentaire vérifie les deux ; il ne change pas le validateur historique.

Les intensités vélo proviennent exclusivement de la doctrine TFCLab et du binding candidat V22, appliqués à l’ancre native synthétique. Les allures de nage sont des paramètres par libellé exact, non un transfert CSS. Les charges de force sont neuromusculaires, sans zone cardiaque.

Les sorties indépendantes sont `technically_complete_in_scenario`, `compatible_with_reserved_slot`, `candidate_requires_coach_policy`, `individually_admissible`, `approved_by_coach`, plus les contrôles de prérequis, capacité et récupération. Les deux derniers restent faux/non établis. Un objet complet n’est ni une tolérance démontrée ni une prescription autorisée.

Le budget logistique de minutes réservées ne prouve pas une dose active. La chronologie exacte est en secondes. Le pont actuel vers le plan historique refuse les durées fractionnaires ; aucune minute fictive n’est ajoutée pour les rendre entières. Toutes les propositions restent séparées du calendrier retenu, y compris celles sans nouvelle erreur.
''')
phase_rows=[[x['week'],x['reservedMinutes'],str(x['capacity'])+' min',str(x['weekReservedMinutes'])+'/'+str(x['budget']),yes(x['A']['compatible']),yes(x['B']['genericDurationCompatible'])]for x in phases]
doc('IRONMAN_PHASE_VARIANT_OPTIONS.md','Longue vélo : deux interprétations de phase', '''Source `SEILER_BIKE_Z1_LONG`, texte brut `src/lib/workoutLibrary.ts:5968`. Corps générique 90–180 min, périphéries intégrées ; variante Ironman 180–210 min. Intersection littérale 180 min. Le catalogue annonce 90–210 min, ce qui ne suffit pas à résoudre la contradiction des contenus.

**A : variante obligatoire dès la base.** Les quatre conflits sont conservés. **B : générique en base, variante spécifique plus tard.** Proposition de politique, non autorisée : elle résoudrait seulement la sélection de variante en base. Elle ne prouverait ni tolérance, intensité complète, récupération ni préparation spécifique Ironman. Aucune réservation n’est augmentée à 180 min, aucune autre discipline réduite.

'''+table(['Semaine','Réservation','Enveloppe déclarée','Réservé/budget hebdo','A compatible','B plage générique seulement'],phase_rows)+'''
Les chemins inspectés ne fournissent pas de dérogation explicite générique/base : `sessionCatalogueContract.ts:7` réserve les variantes exécutables aux plages numériques explicites ; `workoutCatalogBuilder.ts:678` et `prepareGenerationContracts.ts:175` décrivent même les longues sorties jusqu’à 210 min comme possibles en base, sans règle imposant leur dose à chaque semaine. Les variantes restent distinctes de l’éligibilité par phase. Cette lecture ciblée ne prétend pas prouver l’absence d’une règle dans tout document externe.

FTP265W donne le sous-contrôle source 145,75–190,8W à 55–72%FTP, avec plafond strict sur le plat et consignes des côtes conservés. FCmax manque ; aucun âge→FCmax inventé. La politique B ne résout pas ce manque.

Le ventilateur reste contextuel : intérieur avec ventilateur déclaré satisfait cette restriction littérale ; intérieur sans ventilateur est refusé ; dehors rend faux l’antécédent home trainer pour cette restriction uniquement ; contexte inconnu reste inconnu. Les métadonnées et résultats historiques ne sont pas effacés. Ces quatre cas sont rejoués dans la non-régression V27. La tolérance individuelle reste non démontrée dans tous les cas.

La semaine4 conserve son statut de récupération et ses contrôles. Une lecture générique/base ne justifierait pas mécaniquement une charge longue de développement pendant une semaine allégée. Les conséquences au-delà de quatre semaines et la spécificité Ironman restent à examiner.
''')
aero=scenarios[:3]
doc('AERO_RECOVERY_ALTERNATIVES.md','Aéro : repos paramétrique sans choix automatique', '''Source `C_BIKE_AERO_POSITION_DRILLS`. Le parser V27 lit 6×10min de position aéro, r=5min relâché Z1. Le résolveur V28 développe les événements, garde chaque zone et calcule les cibles au moyen de la doctrine existante : Z2 candidat 145,75–198,75W ; Z1 candidat 0–145,75W depuisFTP265W. Ce ne sont ni une mesure de LT1 ni une puissance optimale.

'''+table(['Convention explicite','Travail','Repos','Temps total','Créneau85min','Revue du bloc'],[[s['context']['scenarioId'],'6×600s','5×300s'if i==0 else'6×300s'if i==1 else'inconnu',duration(s['result']['seconds']),yes(s['result']['compatible_with_reserved_slot']),yes(s['wholeBlockReview']['acceptedAsSeparateTechnicalScenario'])]for i,s in enumerate(aero)])+'''
Les deux conventions sont testées indépendamment. La première n’est pas choisie parce qu’elle tient dans le créneau. Sans paramètre, la durée demeure inconnue. Le temps total postural reste 60min, le maximum continu 10min ; aucune équivalence avec4×15min. Aucun échauffement ou retour au calme supplémentaire absent de la source n’est inventé.

La fixture déclare compétence technique et absence de douleur pour tester le contrat. Cela ne prouve ni tolérance cervicale/lombaire, adaptation posturale, récupération ou aptitude individuelle. Douleur, ancre incertaine/périmée, capacité inconnue/insuffisante et récupération défavorable empêchent la soumission. Aucun changement dans B.
''')
swimrows=[[s['sourceId'],s['result']['timeline']['model']['totalWrittenMeters'],duration(s['result']['seconds']),s['fixture']['availableMinutes'],yes(s['result']['objectiveVariant']['compatible']),yes(s['wholeBlockReview']['acceptedAsSeparateTechnicalScenario'])]for s in scenarios[3:6]]
body='''Les nages réutilisent V18/V27. Allure par feuille littérale, zone compatible avec la partie source, repos, occurrence finale et transitions sont déclarés avant calcul. La CSS crawl de 105 s/100 m de B n’est appliquée ni aux éducatifs, ni au dos, ni au multi-nages. Les allures de ces fixtures sont nouvelles hypothèses techniques, pas des observations de B. La fabrique de fixtures, épinglée avant exécution, fournit explicitement Z2 aux feuilles portant cette consigne littérale et Z1 aux autres : ce choix synthétique est conservé comme paramètre, jamais comme frontière individuelle mesurée. Le moteur ne fournit aucune zone par défaut lorsque ce paramètre manque.

'''+table(['Source','Distance écrite','Temps exact','Créneau synthétique','Variante IM','Bloc sans nouveau défaut'],swimrows)+'''
Catch/pull : 300m +8×(50m rattrapé +50m poing fermé +100m nage complète) +200m =2100m ; sept repos15s avec convention entre répétitions, transitions5s explicitement déclarées. Catch focus : 300m +8×50m scull +8×50m catch-up +6×100m +200m =1900m ; les repos10s de la dernière série sont proposés uniquement par la fixture. Nage continue : 400m multi-nages +2000m +200m dos =2600m ; « augmenter à3000m » en Ironman ne précise pas sa portée, donc la variante reste non résolue malgré un temps générique calculable.

Les créneaux35/40min de B sont trop courts pour ces paramètres. Un créneau55min rend le temps compatible, sans valider les capacités individuelles ou supprimer les refus du bloc. Avec CSS seule ou allure/transition/repos manquants, la chronologie reste incomplète. Aucune distance, répétition ou récupération n’est tronquée.

## Force : même contenu, paramètres déclarés

Source `A_STR_STABILITY_CORE` :5min mobilité,3 tours,5min stretching. Par tour : planche frontale45s, latérale30s/côté, bird-dog10/côté, dead bug12/côté, pont unipodal10/côté, clamshell15/côté. Fixture : deux côtés séquentiels,2s/répétition, changement de côté5s, repos exercice10s et tour60s, charge poids du corps. Les transitions entre exercices et tours sont incluses dans les repos déclarés ; les deux transitions périphériques5s sont ajoutées explicitement. Lorsque repos final d’exercice et de tour existent ensemble, la fixture les déclare distincts et additifs.

'''
strengthrows=[]
for s in scenarios[8:]:
 r=s['result'];strengthrows.append([s['context']['scenarioId'],s['fixture']['exerciseRestPolicy'],s['fixture']['roundRestPolicy'],duration(r['seconds']),yes(r['technically_complete_in_scenario']),yes(r['compatible_with_reserved_slot'])])
body+=table(['Scénario','Repos exercices','Repos tours','Temps exact','Complet technique','Créneau35min'],strengthrows)+'''
Chaque répétition possède un tempo explicite ; les maintiens conservent leur temps source. La répartition concentrique/excentrique du tempo n’est pas affirmée. Aucune durée ne vient du seul nombre de répétitions. Les exercices gardent leurs consignes et contraintes ; compétence déclarée ne prouve pas assimilation ou force acquise. Aucune zone cardiaque ne représente la dose musculaire.

Les données V1/V2 et leurs résultats restent archivés. Le garde indépendant a refusé leurs conventions de repos/transition implicites. La version retenue exige ces champs ; leur absence empêche de déclarer la recette complète. Le temps exact reste incompatible avec le transport historique en minutes entières, et la réservation B25min n’est pas changée.
'''
doc('SWIM_AND_STRENGTH_EXECUTION.md','Nage et force : chronologies complètes sous paramètres',body)
doc('BEFORE_AFTER_V27.md','Avant/après V27 — périmètres séparés',table(['Périmètre','V27 conservé','V28'],[
 ['Calendriers originaux A/B/C','90 réservations','identiques, avec leurs résultats bruts'],
 ['B original','3 contrats course,1ID','3 contrats course,1ID ;0 nouvelle insertion'],
 ['Aéro paramétré','deux durées déjà calculées par V27','enveloppes source/scénario, événements et intensités segmentaires, revue du bloc'],
 ['Nage paramétrée','temps déjà calculables dans3 fixtures V27','paramètres typés par feuille, cibles déclarées, contrôles de variante et de bloc'],
 ['Force paramétrée','aucun temps complet','deux temps complets avec repos/transitions explicités ;absence bloquante'],
 ['Sources complètes dans nouveaux scénarios','contrat V28 absent','4 sources distinctes ;ne sont pas4 ajouts à B'],
 ['Bloc de scénario sans nouveau défaut','non évalué par ce contrat','aéro85min seulement ;toujours conditionnel'],
 ['Approbations individuelles / revues humaines','0 /0','0 /0']])+'''La comparaison ne prétend pas qu’aucune option aéro V27 ne pouvait produire un objet technique : V27 proposait déjà des options de timing. Le gain réutilisable est le lien vérifié entre paramètres, provenance, chronologie, intensités et résultat du bloc, ainsi que l’exécution neuromusculaire entièrement paramétrée.

La référence B, ses volumes, le placement jeudi45/vendredi90 S3 et la dérogation coach95→90 restent inchangés. Les sept refus A,26 refus C et la suspension après récupération défavorable sont préservés dans les contrôles antérieurs rejoués. Aucune progression de capacité n’est déduite du temps ou d’un compte rendu favorable.

Les refus supplémentaires des propositions fractionnaires sont techniques : format de durée et, sur deux nages, comparaison flottante stricte. Les contrôles historiques restent bruts ; le complément documente ces causes sans les remplacer ou assouplir leurs seuils. Les limites de récupération, de capacité et de variante restent distinctes.
''')
doc('COACH_DECISIONS.md','Trois décisions ciblées, sans autorisation présumée', '''1. **Vélo Ironman en base : politique B en attente.** Faut-il permettre la recette générique90–180min pendant la base, avec variante180–210min réservée à des phases ultérieures explicitement définies ? Une décision exige de revoir le contrat sportif, la récupération et la spécificité future. Aucun accord n’est enregistré dans V28. Les quatre incompatibilités actuelles restent visibles ;120min ne valent pas180min spécifiques.

2. **Aéro, cette source exacte : quelle dernière récupération ?** Cinq repos donnent85min ; six donnent90min. La différence porte sur un repos final5min, pas sur60min de posture. La compatibilité du créneau ne décide pas de l’intention. Les symptômes, tolérance posturale et récupération restent des décisions individuelles séparées.

3. **Nage : renseigner les paramètres de ce protocole.** Allure par nage/éducatif réellement utilisé, repos et occurrences, transitions, portée de la variante3000m le cas échéant, compétence et dégradation technique. Avec les paramètres testés, les créneaux35/40min sont incompatibles. Aucun nouveau questionnaire quantitatif universel n’est proposé.

Pour le gainage, les tempos, côtés et conventions restants sont désormais des champs d’exécution précis, non des capacités acquises. Les scénarios illustrent les effets de deux conventions et n’en recommandent aucune universellement. Une décision réelle et une revue de tolérance restent nécessaires avant toute prescription individuelle.

**Dérogation course95→90 : déjà accordée**, dans son périmètre limité. Ne pas la redemander ; elle n’autorise ni un autre plancher, ni une intensité, ni une dose individuelle. Le problème technique des secondes→minutes doit être résolu par un adaptateur expérimental fidèle, sans arrondir les recettes ni changer les validateurs historiques. Il ne nécessite pas d’inventer une nouvelle capacité de l’athlète.
''')
doc('REPRISE.md','Reprise V28',f'''Début : `{state['firstObservedAt']}` ; deadline : `{state['deadline']}`. Budget unique60min/10unités, sans renouvellement ni relance automatique. État persistant : `state.json`.

Preuve retenue : `evidence/validation-{attempt}`. Les sources exécutées sont épinglées et copiées. Les six artefacts de build/rejeu et le vérificateur indépendant confirment les résultats ; `evidence/independent-validation.json` contient les compteurs exacts. Les anciennes validations restent archivées et ne constituent pas les preuves de complétude des modèles force rejetés.

Le contrôleur V28 possède son propre budget et au plus trois validations ; aucun contrôleur V27 clôturé n’est relancé. Les deux témoins indépendants et les deux tests rouges de repos/transitions sont conservés. Les nouvelles conventions force sont dans `strength-rest-policy-registration.json` et `strength-boundary-registration.json`, enregistrées avant les exécutions correspondantes, sans modifier `inputs.json`.

Prochaine priorité technique : représentation exacte des secondes dans une couche expérimentale compatible avec les calendriers historiques, sans perte ni arrondi ; puis résolution coach des trois décisions ciblées. Aucun changement des 920 sources, des calculateurs #425, des validateurs, du sender Nolio ou des données réelles. Les futures sessions exigent un mandat explicite, sans promesse de relance automatique. NO-GO maintenu.
''')
print(json.dumps({'documents':8,'newTests':new,'legacyTests':legacy,'unchangedSkips':skips,'scenarios':len(scenarios)},indent=2))

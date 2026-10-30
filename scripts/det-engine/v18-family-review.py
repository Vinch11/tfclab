"""Family review briefs; source-routing labels do not assign efficacy, adaptation or citations."""
import gzip,json,pathlib,sys,datetime
D=pathlib.Path('docs/det-engine/v18');s=json.loads((D/'state.json').read_text());assert s['status']=='in_progress_no_go'and datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(s['deadline'].replace('Z','+00:00'))
out=pathlib.Path(sys.argv[1]);assert not out.exists()and out.resolve().is_relative_to((D/'evidence').resolve())
families=[
 ('endurance_fondamentale',['R25','O24'],'Durée et domaine sont des conventions de prescription; une séance Z2 ne démontre ni FatMax individuel ni adaptation acquise.','Ancres de domaine, historique et réponse; distinguer entraînement à jeun et endurance normale.'),
 ('tempo_seuil',['R25','O24'],'MLSS, LT1, seuils et allures de compétition ne sont pas interchangeables.','Résultat de test, méthode, discipline, fraîcheur et récupération des répétitions.'),
 ('vo2max',['R25','O24'],'Répétitions à intensité élevée ne démontrent pas le temps réellement passé à VO2max. Aucun quota hebdomadaire créé.','Intensité étayée, tolérance documentée et limites de maintien de qualité.'),
 ('force_economie',['LL24'],'Force lourde, plyométrie, gainage et technique sont des modalités distinctes. Effets moyens ne valident pas chaque fiche.','Exercices, charge, séries, tempo, repos, compétence technique et tolérance musculaire.'),
 ('technique',[],'La vitesse CSS crawl ne chronomètre pas les autres nages, les éducatifs ou un circuit technique.','Tâche exacte, qualité de mouvement, référence propre à la nage et feedback coach.'),
 ('durabilite',['M21'],'Une durée planifiée ne prouve pas la résistance à la fatigue acquise; TTE frais et durabilité sont distincts.','Réaction pendant effort prolongé, dérive observée et suivi; avis qualitatif distinct de récupération.'),
 ('specificite_ironman',['M21','L220'],'Composantes des bricks, position aéro et nutrition doivent être explicites et individualisées; aucun crédit long vélo artificiel.','Doses par discipline, transitions, capacité actuelle, tolérance nutritionnelle et calendrier global.'),
 ('trail_excentrique',['B20'],'D+, D−, terrain et sollicitation excentrique sont distincts; aucun plafond individuel inféré du niveau.','Tolérance verticale/excentrique documentée, progression et réaction; inconnues conservées.'),
 ('recuperation_affutage',['W23'],'Affûtage et récupération ordinaire sont distincts; réduction de volume ne prouve pas la récupération; rappel intensité non imposé.','Réponse individuelle, fatigue résiduelle, compétition et placement; revue active cool-down limitée V17.')]
briefs=[{'family':name,'contextReferencesInheritedFromV8':refs,'principle':principle,'individualEvidenceForReview':needs,'evidenceScope':'context only; not an automatic reference attribution to individual workouts','evidenceRecheckedExternallyInV18':False,'tfclConvention':'catalogue dose envelopes and parsing conventions are not individual optima','scientificPromotion':False}for name,refs,principle,needs in families]
C=[json.loads(l)for l in gzip.open('docs/det-engine/v16/evidence/final/canonical.jsonl.gz','rt')];Q=[json.loads(l)for l in gzip.open('docs/det-engine/v17/evidence/qualification-final.jsonl.gz','rt')]
rows=[]
for c,q in zip(C,Q):
 hints=[];w=c['original']['effective'];zones={z for p in w['structure']for z in p['zones']};sport=c['prescription']['discipline']
 if sport=='strength':hints+=['force_economie']
 if sport=='swim':hints+=['technique']
 if sport=='brick'or w['cat']=='Brique':hints+=['specificite_ironman']
 if any(str(g).startswith('trail')for g in c['prescription']['goals']):hints+=['trail_excentrique']
 if w['cat']=='A'and sport in ['run','bike','swim']:hints+=['endurance_fondamentale','durabilite']
 if w['cat']=='B'and zones&{'Z3','Z4','Z4a','Z4b'}:hints+=['tempo_seuil']
 if zones&{'Z5','Z6','Z7'}and sport in ['run','bike','swim']:hints+=['vo2max']
 if w['cat']=='D'or any(p in ['taper','recovery']for p in c['prescription']['phases']):hints+=['recuperation_affutage']
 rows.append({'legacyId':c['identity']['legacyId'],'sourceReviewHints':list(dict.fromkeys(hints)),'hintScope':'editorial categories, literal source zones, sport and goal compatibility ONLY; no efficacy/adaptation assignment','scientificQualificationV17':q,'newWorkoutReferenceAttributions':[],'newAdaptationClaims':[],'expertReview':False,'automaticPromotion':False})
out.mkdir();(out/'family-review.json').write_text(json.dumps({'version':'v18-family-review-1','briefs':briefs,'lorangPrinciples':{'source':'docs/det-engine/v8/LORANG_METHODOLOGY.md','documentedEditorialSources':['L175','L417','L220'],'principles':['individual profile and history guide dose','feedback can change the next decision','balance other sessions when changing one stimulus'],'tfclHypothesisNotLorangQuote':'Profil → limiteurs → adaptations → stimuli → dose → organisation → récupération → réévaluation','notDerived':['universal dose','weekly HIT quota','acquired tolerance','new fatigue questionnaire']},'individualReferenceInheritance':False},ensure_ascii=False,indent=2)+'\n')
with gzip.GzipFile(out/'review-queue.jsonl.gz','wb',mtime=0)as f:f.write(('\n'.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))for r in rows)+'\n').encode())
print(json.dumps({'briefs':len(briefs),'records':len(rows),'individualReferenceAttributionsAdded':0,'expertReviews':0,'newScientificQualifications':0}))

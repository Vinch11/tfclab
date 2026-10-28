"""Inventory literal source witnesses for review; never builds or edits a workout."""
from pathlib import Path
import json,re,hashlib
root=Path('docs/det-engine/v12')
specs=[('C_STR_MAX_LOWER_HEAVY','src/lib/enrichedWorkoutsStrengthV2.ts'),('C_SWIM_CATCH_FOCUS','src/lib/enrichedWorkoutsSwim.ts'),('C_BRICK_TRANSITION_DRILL','src/lib/enrichedWorkoutsV4.ts'),('V3_BIKE_Z2_ENDURANCE_LONG','src/lib/enrichedWorkoutsV3.ts')]
rows=[]
for name,path in specs:
 text=Path(path).read_text();start=text.index('id: "'+name+'"');end=text.index('\n  },',start);block=text[start:end]
 duration=re.search(r'durationMin:\s*\[(\d+),\s*(\d+)\]',block)
 phase=re.search(r'phase:\s*(\[[^\]]+\])',block)
 def quoted(key):
  match=re.search(r'\b'+key+r':\s*("(?:[^"\\]|\\.)*")',block)
  return json.loads(match[1])if match else None
 row={'source':name,'path':path,'line':text[:start].count('\n')+1,'fileSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'durationRange':[int(duration[1]),int(duration[2])]if duration else None,'phases':json.loads(phase[1])if phase else None,'when':quoted('when'),'avoid':quoted('avoid'),'insertedInV12':False}
 if name=='C_STR_MAX_LOWER_HEAVY':
  row.update(currentV10SupportCap=40,minimumExceedsCurrentCap=bool(duration and int(duration[1])>40),barExperienceEvidence=None,sourceProgrammeIsNotMobility=True)
 if name=='C_BRICK_TRANSITION_DRILL':
  main=re.search(r'(\d+)× transition drill: Vélo (\d+)min Z3.*?course (\d+)min Z3',block)
  warm=re.search(r'Warm-up",\s*text:\s*"(\d+)min vélo',block)
  cool=re.search(r'Cool-down",\s*text:\s*"(\d+)min jogging',block)
  if main and warm and cool and duration:
   bike=int(warm[1])+int(main[1])*int(main[2]);run=int(cool[1])+int(main[1])*int(main[3]);lower=bike+run
   row.update(parsedLiteralWitness=True,knownBikeMinutes=bike,knownRunMinutes=run,totalLowerBoundMinutes=lower,transitionMinutes=None,totalWithinDeclaredRangeImpossible=lower>int(duration[2]),formula=f'{warm[1]} + {main[1]}×({main[2]}+{main[3]}) + {cool[1]} = {lower}, hors transitions non quantifiées')
  else:row.update(parsedLiteralWitness=False,diagnostic='unknown: literal source witness needs rereading')
 if name=='V3_BIKE_Z2_ENDURANCE_LONG':
  row.update(fuellingMentionPresent='ravitaillement toutes les 30' in block,individualNutritionProtocol=None,carbohydrateGramsPerHour=None,gutToleranceEvidence=None)
 rows.append(row)
(root/'evidence/specificity-inventory.json').write_text(json.dumps({'scope':'four existing catalogue examples only; not all workouts or a full16-week plan','rows':rows,'actualAthleteDataRead':False,'expertReviewed':False},indent=2))
print(json.dumps({'sources':len(rows),'brickLiteralConflict':next(r for r in rows if r['source']=='C_BRICK_TRANSITION_DRILL').get('totalWithinDeclaredRangeImpossible')}))

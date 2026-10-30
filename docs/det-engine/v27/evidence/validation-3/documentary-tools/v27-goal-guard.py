"""Independent declared-goal guard: technical coverage cannot promote a trail-only source into Ironman."""
import gzip,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v27/evidence')/('validation-'+sys.argv[1])/'build'
canonical={x['legacyId']:x for x in map(json.loads,gzip.open('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz','rt'))}
rows=json.loads(gzip.decompress((R/'results.json.gz').read_bytes()))
bad=[]
for row in rows:
 for search in (row['alternatives']or{}).get('searches',[]):
  for offer in search['offers']:
   goals=canonical[offer['sourceId']]['originalCanonical']['original']['effective'].get('goals',[])
   if offer['technicallyCandidate'] and 'ironman'not in goals:bad.append({'slot':search['slotKey'],'source':offer['sourceId'],'declaredGoals':goals})
assert not bad,('unsupported_goal_in_technical_alternative',bad)
print('All eligible alternatives preserve explicit source objective membership.')

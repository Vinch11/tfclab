/**
 * V3.36 — exact Hall-subset witness when the already-admitted weekly source
 * domains cannot assign one DISTINCT source to each slot (B13).
 * This diagnoses one fixed candidate-domain snapshot, not athlete feasibility.
 * Never fabricates a new source, session, schedule, or sporting approval.
 */
export type HallConflictWitness={
  slotIndices:number[];sourceIds:string[];
  slotsRequired:number;distinctSourcesAvailable:number;
  necessaryConditionOnly:true;
};
export function findHallConflictWitness(
  domains:ReadonlyArray<readonly string[]>,
):HallConflictWitness|null {
  // Weekly layouts are small. Fail closed for oversized domains rather than
  // pretending a bounded subset scan proved anything.
  const n=domains.length;
  if(!n||n>12)return null;
  const unique=domains.map(ids=>[...new Set(ids)]);
  // Lowest-cardinality conflict is easiest for a coach to investigate.
  for(let size=1;size<=n;size++){
    for(let mask=1;mask<(1<<n);mask++){
      let count=0;
      for(let i=0;i<n;i++)if((mask&(1<<i))!==0)count++;
      if(count!==size)continue;
      const slots:number[]=[];
      const sources=new Set<string>();
      for(let i=0;i<n;i++)if((mask&(1<<i))!==0){
        slots.push(i);
        unique[i].forEach(id=>sources.add(id));
      }
      if(sources.size<slots.length){
        return {slotIndices:slots,sourceIds:[...sources].sort(),
          slotsRequired:slots.length,distinctSourcesAvailable:sources.size,
          necessaryConditionOnly:true};
      }
    }
  }
  return null;
}

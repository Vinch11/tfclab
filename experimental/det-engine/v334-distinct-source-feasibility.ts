/**
 * DET V3.34 — strict necessary check for the existing B13 one-card-per-week
 * rule. A reviewed V3 source ID may fill at most one selected week slot.
 *
 * A bipartite matching proves whether the remaining independent slot domains
 * CAN use distinct IDs. "true" is NOT a sporting GO: recovery, source overlap,
 * phases, dose, zones, weekly minutes and native validation remain required.
 * "false" proves only that this exact admitted-domain snapshot cannot fit.
 * Never creates sources, timings, coach approvals or workouts.
 */
export function hasDistinctSourceAssignment(
  domains:ReadonlyArray<readonly string[]>,
):boolean {
  if(domains.some(domain=>domain.length===0))return false;
  const choices=domains.map(domain=>[...new Set(domain)]);
  const assignedTo=new Map<string,number>();
  const tryAssign=(slot:number,seen:Set<string>):boolean=>{
    for(const id of choices[slot]){
      if(seen.has(id))continue;
      seen.add(id);
      const other=assignedTo.get(id);
      if(other===undefined||tryAssign(other,seen)){
        assignedTo.set(id,slot);
        return true;
      }
    }
    return false;
  };
  return choices.every((_domain,slot)=>tryAssign(slot,new Set<string>()));
}

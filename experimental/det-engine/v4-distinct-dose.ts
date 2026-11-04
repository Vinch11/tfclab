/** Exact lower bound for <=8 roles, with each catalogue ID usable once. No permutation enumeration. */
export function minimumDistinctDose(domains:ReadonlyArray<ReadonlyArray<{id:string;min:number}>>){
 if(domains.length>8)throw Error('ROLE_BOUND_EXCEEDED');
 if(domains.some(d=>d.some(c=>!Number.isFinite(c.min)||c.min<0)))throw Error('INVALID_DOSE_DOMAIN');
 const size=1<<domains.length;let costs=Array<number>(size).fill(Infinity);costs[0]=0;
 const ids=[...new Set(domains.flatMap(d=>d.map(c=>c.id)))].sort();
 for(const id of ids){const next=costs.slice();for(let mask=0;mask<size;mask++)if(Number.isFinite(costs[mask]))for(let role=0;role<domains.length;role++){
  if(mask&(1<<role))continue;const doses=domains[role].filter(c=>c.id===id).map(c=>c.min);if(!doses.length)continue;
  const target=mask|(1<<role);next[target]=Math.min(next[target],costs[mask]+Math.min(...doses));
 }costs=next;}
 return costs[size-1];
}

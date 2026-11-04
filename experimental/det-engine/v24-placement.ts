import{revalidateV22Reservation}from'./v22-prescription';
import{validateFourWeekScopeV23}from'./v23-scope';

/** Bounded day reassignment of an existing prescription, not a new selector or dose model. */
export function reassignV24ExistingSessions(result:any,p:any,model:'pull_on_support_day'|'catch_on_support_day'|'protect_peak_ride_only'|'space_peak_bike_block_and_long_run'){
 if(!['pull_on_support_day','catch_on_support_day','protect_peak_ride_only','space_peak_bike_block_and_long_run'].includes(model))throw Error('V24_UNKNOWN_PLACEMENT_MODEL');
 const r=structuredClone(result),names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
 const peak=r.calendar.weeks.filter((w:any)=>w.type==='load').flatMap((w:any)=>w.slots.filter((s:any)=>s.role.sport==='bike'&&s.role.kind==='long')).sort((a:any,b:any)=>b.minutes-a.minutes||a.week-b.week)[0];
 const moves:any[]=[];
 for(const w of r.calendar.weeks){if(w.type!=='load')continue;
  if(['protect_peak_ride_only','space_peak_bike_block_and_long_run'].includes(model)&&w.week!==peak?.week)continue;
  const catchSlot=w.slots.find((s:any)=>s.card.id==='C_SWIM_CATCH_FOCUS'),pull=w.slots.find((s:any)=>s.card.id==='C_SWIM_TRI_CATCH_PULL'),support=w.slots.find((s:any)=>s.role.sport==='strength'),bike=w.slots.find((s:any)=>s.role.sport==='bike'&&s.role.kind!=='long');
  if(!catchSlot||!pull||!support||!bike)throw Error('V24_EXISTING_ROLE_REQUIRED');
  const longRun=w.slots.find((s:any)=>s.role.sport==='run'&&s.role.kind==='long'),easyRun=w.slots.find((s:any)=>s.role.sport==='run'&&s.role.kind==='endurance');
  if(model==='space_peak_bike_block_and_long_run'&&(!longRun||!easyRun))throw Error('V24_EXISTING_RUN_ROLES_REQUIRED');
  if(model==='space_peak_bike_block_and_long_run'){
   const lastBikeDay=Math.max(...w.slots.filter((s:any)=>s.role.sport==='bike').map((s:any)=>s.day));
   if(!(longRun.day>lastBikeDay&&easyRun.day>longRun.day&&easyRun.minutes<=longRun.minutes))throw Error('V24_NO_DEMONSTRATED_INTERDISCIPLINE_SPACING_BENEFIT');
  }
  const assignments=model==='pull_on_support_day'?[[pull,support.day]]:model==='protect_peak_ride_only'?[[catchSlot,support.day]]:model==='space_peak_bike_block_and_long_run'?[[longRun,easyRun.day],[easyRun,longRun.day]]:[[catchSlot,support.day],[pull,bike.day]];
  for(const[s,day]of assignments){if(s.day!==day)moves.push({week:w.week,sourceId:s.card.id,from:s.day,to:day,minutesUnchanged:s.minutes});s.day=day;}
  w.days=Array.from({length:7},(_,day)=>({day,kind:w.events.some((e:any)=>e.day===day)?'event':w.slots.some((s:any)=>s.day===day)?'training':'rest',slotKeys:w.slots.filter((s:any)=>s.day===day).map((s:any)=>s.key)}));
  const stored=r.calendar.calendar.weeks.find((x:any)=>x.weekNumber===w.week);
  w.placement={...w.placement,v24Reassignment:model,originalSolverNodes:w.placement.nodes,verification:'recomputed unchanged historical and four-week validators; original nodes are not a new search'};
  const active=stored.sessions.filter((s:any)=>!s.isRest);for(const s of active){const slot=w.slots.find((x:any)=>x.card.id===s.catalogId);if(!slot)throw Error('V24_SOURCE_IDENTITY');s.dayIndex=slot.day;s.dayName=names[slot.day];}
  // Keep the source ordering within each day. No array rotation to conceal title warnings.
  stored.sessions=w.days.flatMap((d:any)=>{const xs=active.filter((s:any)=>s.dayIndex===d.day);return xs.length?xs:[{weekNumber:w.week,weekTheme:w.type,phase:w.phase,dayName:names[d.day],dayIndex:d.day,sport:'rest',title:'Repos prévu',details:'Absence de séance planifiée ; récupération réelle non attestée.',durationMin:0,isRest:true}];});
 }
 for(const d of r.decisions){const s=r.calendar.weeks.flatMap((w:any)=>w.slots).find((s:any)=>s.key===d.slotKey);d.day=s.day;}
 revalidateV22Reservation(r,p);return{model,moves,result:r,scope:validateFourWeekScopeV23(r,p),newDose:false,newSource:false,expertReviewed:false};
}

export function historicalAdditionsV24(reference:any,candidate:any){const counts=(r:any)=>{const m=new Map<string,number>();for(const i of r.rawValidation.historical.issues)if(['warning','error','critical','blocking'].includes(i.severity)){const k=JSON.stringify([i.code,i.week??null,i.severity,i.control??null]);m.set(k,(m.get(k)??0)+1);}return m;};const a=counts(reference);return[...counts(candidate)].filter(([k,n])=>n>(a.get(k)??0)).map(([key,n])=>({key,added:n-(a.get(key)??0)}));}

export function historicalWitnessAdditionsV24(reference:any,candidate:any){const count=(r:any)=>{const m=new Map<string,number>();for(const i of r.rawValidation.historical.issues)if(['warning','error','critical','blocking'].includes(i.severity)){const k=JSON.stringify(i);m.set(k,(m.get(k)??0)+1);}return m;};const a=count(reference);return[...count(candidate)].filter(([k,n])=>n>(a.get(k)??0)).map(([key,n])=>({issue:JSON.parse(key),added:n-(a.get(key)??0)}));}

/** Never accept a benefit in placement in exchange for a new warning, refusal or block error. */
export function acceptV24Placement(reference:any,trial:ReturnType<typeof reassignV24ExistingSessions>,p:any){
 const historicalAdditions=historicalAdditionsV24(reference,trial.result);
 const newHistoricalWitnesses=historicalWitnessAdditionsV24(reference,trial.result);
 const scope=validateFourWeekScopeV23(trial.result,p);
 const signature=(r:any)=>r.calendar.weeks.flatMap((w:any)=>w.slots.map((s:any)=>JSON.stringify([w.week,s.key,s.card,s.minutes,s.input.currentCapacity]))).sort();
 const sourcesAndDosesUnchanged=JSON.stringify(signature(reference))===JSON.stringify(signature(trial.result));
 const newRefusals=trial.result.decisions.filter((d:any)=>d.state==='not_admissible'&&reference.decisions.find((x:any)=>x.slotKey===d.slotKey)?.state!=='not_admissible').map((d:any)=>d.slotKey);
 const accepted=trial.moves.length>0&&sourcesAndDosesUnchanged&&!historicalAdditions.length&&!newHistoricalWitnesses.length&&!scope.executedBlockErrors.length&&!newRefusals.length;
 return{accepted,historicalAdditions,newHistoricalWitnesses,newRefusals,sourcesAndDosesUnchanged,blockErrors:scope.executedBlockErrors,individualApproval:false,reason:accepted?'same_sources_and_doses_protected_long_days_no_executed_regression':'retain_original_or_separate_coach_proposal'};
}

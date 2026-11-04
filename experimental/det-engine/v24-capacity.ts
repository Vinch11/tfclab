import{digest}from'./v9-prospective';import{originalCard}from'./v14-sources';import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';
import{explicitDose}from'./v14-sources';import{revalidateV22Reservation}from'./v22-prescription';import{validateFourWeekScopeV23}from'./v23-scope';
/** Narrow source-literal proof, independent of the historical timing parser and floor. */
export function integratedRunProofV24(card:any,minutes:number){
 let unchanged=false;try{unchanged=digest(card)===digest(originalCard(card.id));}catch{/* An unknown source is not a timing proof. */}
 const exact=unchanged&&card.id==='SEILER_RUN_Z1_EASY_LONG'&&card.structure.includes('Warm-up: Intégré — les 10 premières minutes')&&card.structure.includes('Main: 60-120 min en Z1-Z2 strict')&&card.structure.includes('Cool-down: Intégré — les 10 dernières minutes')&&card.variants?.ironman==='90-120 min Z1 strict — fondement de la préparation IM longue distance';
 const valid=exact&&Number.isFinite(minutes)&&minutes>=90&&minutes<=120&&minutes>=card.durationMin[0]&&minutes<=card.durationMin[1];
 return{valid,sourceHash:digest(card),minutes,integratedWarmup:10,integratedCooldown:10,mainElapsedMinutes:valid?minutes:null,extraMinutesInvented:0,allOriginalInstructionsRetained:true,intensityResolved:false,scope:'timing identity only; source intensity labels and all physiological claims remain unapproved'};
}

/** Full-block counterproposal. It deliberately fails the unchanged programming floor. Never retained. */
export function inspectFloorCounterproposalV24(result:any,p:any,option:ReturnType<typeof floorOptionV24>){
 if(option.status!=='coach_only_programming_floor_exception_proposal'||option.proposedMinutes==null||!option.proof.valid)return null;
 const r=structuredClone(result),w=r.calendar.weeks.find((w:any)=>w.week===option.week),s=w?.slots.find((s:any)=>s.key===option.slotKey);
 if(!s||digest(s.card)!==option.proof.sourceHash||s.input.currentCapacity!==option.documentedCapacity||!integratedRunProofV24(s.card,option.proposedMinutes).valid)throw Error('V24_FLOOR_PROOF_CHANGED');
 const delta=option.proposedMinutes-s.minutes;s.minutes=option.proposedMinutes;s.input.minutes=s.minutes;s.recipe=explicitDose(s.card,s.minutes);w.reservedMinutes+=delta;
 const stored=r.calendar.calendar.weeks.find((w:any)=>w.weekNumber===option.week).sessions.find((x:any)=>x.catalogId===s.card.id);stored.durationMin=s.minutes;
 const d=r.decisions.find((d:any)=>d.slotKey===s.key);d.minutes=s.minutes;
 revalidateV22Reservation(r,p);const scope=validateFourWeekScopeV23(r,p);
 return{purpose:'coach-only counterproposal; original floor, validators and retained calendar unchanged',result:r,scope,sourceTimingProof:option.proof,appliedToRetainedPlan:false,coachApproved:false,nativeFloorWaived:false,individualDoseApproved:false};
}
export function floorOptionV24(slot:any,p:any){
 const cap=slot.input.currentCapacity,proof=integratedRunProofV24(slot.card,cap),q=p.prep.weeklyQuotas[slot.week];
 const check=checkSessionCatalogue({sport:slot.role.sport,catalogId:slot.card.id,title:slot.card.title,details:slot.card.structure,durationMin:cap,zones:slot.card.zones},{objective:p.config.objective,phase:q.phase,weekType:q.weekType,catalog:[slot.card]});
 const candidate=slot.minutes>cap&&cap<slot.role.floor&&proof.valid&&!check.errors.length;
 return{slotKey:slot.key,week:slot.week,sourceId:slot.card.id,plannedMinutes:slot.minutes,documentedCapacity:cap,nativeProgrammingMinimum:slot.role.floor,sourceIronmanMinimum:slot.card.id==='SEILER_RUN_Z1_EASY_LONG'?90:null,sourceMinimumIsScientificLaw:false,proof,catalogueCheck:check,status:candidate?'coach_only_programming_floor_exception_proposal':'no_demonstrated_exception',proposedMinutes:candidate?cap:null,applied:false,requiresCoach:true,sourceRecipeChanged:false,historicalFloorStillViolated:candidate,allSportingConstraintsSatisfied:false,reason:'native programming floor remains enforced; a literal recipe timing proof is not an automatic floor override, intensity or individual dose approval'};
}

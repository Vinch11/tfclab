import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {V3PlanProposal} from './appPlanningV3Proposal';
import {parseV3PlanProposal} from './v3ProposalLocalSave';

export interface DetPreparationBlock {
  startWeek:number;endWeek:number;
  mode:'development'|'recovery'|'taper'|'race';
  focus:string|null;primary:string|null;maintenance:string[];
  knownMinutes:number;totalMinutes:number|null;
  keySessions:number;
  associations:Array<{limiter:string;sessions:number}>;
  sources:Array<{id:string;title:string;sport:string}>;
}

/** Read the saved proposal only: no live athlete, catalogue lookup, text
 * matcher or inferred physiological improvement. Affinity is not dose proof. */
export function buildDetPreparationTimeline(proposal:V3PlanProposal):DetPreparationBlock[]{
  const blocks:DetPreparationBlock[]=[];
  for(const week of proposal.weeks){
    const mode=week.weekType==='recovery'?'recovery':week.weekType==='taper'?'taper':week.weekType==='race'?'race':'development';
    const focus=mode==='development'?week.focus:null;
    let block=blocks.at(-1);
    if(!block||week.week!==block.endWeek+1||block.mode!==mode||block.focus!==focus){
      block={startWeek:week.week,endWeek:week.week,mode,focus,primary:proposal.limiterOrder[0]??null,maintenance:proposal.limiterOrder.filter(limiter=>limiter!==focus),knownMinutes:0,totalMinutes:0,keySessions:0,associations:proposal.limiterOrder.map(limiter=>({limiter,sessions:0})),sources:[]};
      blocks.push(block);
    }
    block.endWeek=week.week;block.knownMinutes+=week.knownMinutes;
    block.totalMinutes=block.totalMinutes===null||week.durationMinutes===null?null:block.totalMinutes+week.durationMinutes;
    for(const session of week.days.flatMap(day=>day.sessions)){
      if(session.role==='key'||session.role==='long'){
        block.keySessions++;
        for(const association of block.associations)if(session.components.some(c=>c.limiterMatches.includes(association.limiter)))association.sessions++;
      }
      for(const source of session.components)if(!block.sources.some(s=>s.id===source.sourceId))block.sources.push({id:source.sourceId,title:source.title,sport:source.sport});
    }
  }
  return blocks;
}

export function savedDetPreparationTimeline(plan:ParsedPlan):DetPreparationBlock[]|null{
  const value=plan as ParsedPlan & {_provenance?:{engine?:string;mode?:string;planningInput?:{fingerprint?:string}};_detSourceProposal?:unknown};
  if(value._provenance?.engine!=='det'||value._provenance.mode!=='app-profile')return null;
  try{
    const proposal=parseV3PlanProposal(value._detSourceProposal);
    if(proposal.planningInputFingerprint!==value._provenance.planningInput?.fingerprint)return null;
    return buildDetPreparationTimeline(proposal);
  }catch{return null;}
}

import {buildPlanChunkSchema, type PlanChunk} from './planSchema.ts';
import {validateFixedPlan,attachFixedExplanations,EXPLANATION_RESPONSE_FORMAT,type FixedChunk,type FixedQuota} from '../_shared/controlledPlan.ts';
import {type CatalogueContract} from '../_shared/sessionCatalogueContract.ts';
import {isCompleteRepairWorkoutMetadata,type RepairWorkoutMetadata} from '../_shared/repairSportingEquivalence.ts';
import {prevalidateTransport} from '../_shared/prevalidateTransport.ts';
import {gateway400Evidence} from '../_shared/planGatewayDiagnostics.ts';
type Input={apiKey:string;model:string;maxTokens:number;planConfig:any;chunkRepairCatalogs?:RepairWorkoutMetadata[][];phaseRepairCatalogs?:Record<string,RepairWorkoutMetadata[]>;chunkRegenRepairCatalogs?:RepairWorkoutMetadata[][];corsHeaders:Record<string,string>};
/** Fail-closed controlled path. No legacy reconciler or extra phase-model calls. */
export async function handleControlledPlan(input:Input):Promise<Response> {
 const config=input.planConfig??{};
 const fail=(code:string,issues:string[]=[])=>Response.json({code,error:'Prescription contrôlée indisponible : aucune génération lancée.',issues},{status:422,headers:input.corsHeaders});
 if(config._controlledPrescription!==true) return fail('CONTROLLED_PRESCRIPTION_REQUIRED');
 if(!Array.isArray(config._prescribedChunks)||!config._prescribedChunks.length) return fail('CONTROLLED_PRESCRIPTION_MISSING');
 if(/trail/i.test(config.catalogObjective??config.objective??'')||config.raceGoals?.some((g:any)=>g.raceFormat&&g.raceFormat!=='continuous')) return fail('CONTROLLED_DEDICATED_CONTRACT_UNAVAILABLE');
 const chunks=config._prescribedChunks as FixedChunk[];
 const quotas=config._weeklyQuotas as Record<number,FixedQuota>??{};
 const contracts:Record<number,CatalogueContract>={};
 const all=[...(input.chunkRepairCatalogs??[]).flat(),...(input.chunkRegenRepairCatalogs??[]).flat(),...Object.values(input.phaseRepairCatalogs??{}).flat()];
 for(const [key,entry] of Object.entries(quotas)) contracts[Number(key)]={phase:entry.phase,weekType:entry.weekType,objective:config.catalogObjective??config.objective,catalog:[...new Map(all.filter(isCompleteRepairWorkoutMetadata).map(m=>[m.id,m])).values()]};
 try {
  const transport=prevalidateTransport(config);
  if(transport.status==='blocked') return fail('CONTROLLED_PREFLIGHT_BLOCKED',transport.issues.filter(i=>i.severity==='blocking').map(i=>`S${i.week}:${i.code}`));
  const issues=validateFixedPlan(chunks,contracts,quotas,config.weeksAvailable);
  if(issues.length) return fail('CONTROLLED_PRESCRIPTION_INVALID',issues);
  for(const chunk of chunks) buildPlanChunkSchema(all.map(m=>m.id),{expectedWeekCount:chunk.weeks.length,isFirstChunk:true,catalogueContractsByWeek:contracts}).parse(chunk);
 } catch {return fail('CONTROLLED_PRESCRIPTION_INVALID');}
 // Provider requests occur only after ALL weeks in the requested scope pass.
 const encoder=new TextEncoder();
 return new Response(new ReadableStream({async start(controller){
  const emit=(event:string,data:unknown)=>controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  try {
   emit('prevalidation',{status:'coach_review',issues:[{week:0,code:'controlled_coach_review_required',severity:'warning'}]});
   for(let index=0;index<chunks.length;index++) {
    const chunk=chunks[index];
    emit('chunk-progress',{chunkIndex:index,totalChunks:chunks.length,status:'generating',weekRange:[chunk.weeks[0]?.weekNumber,chunk.weeks.at(-1)?.weekNumber]});
    const body=(format:unknown)=>({model:input.model,messages:[{role:'system',content:'Tu expliques un programme déjà prescrit. Tu ne prescris aucun exercice, durée, intensité ou déplacement. Réponds uniquement en JSON avec weeks [{weekNumber, explanation}]. Les explications ne donnent aucune instruction de modification des séances.'},{role:'user',content:JSON.stringify({weeks:chunk.weeks})}],response_format:format,stream:false,max_tokens:input.maxTokens});
    const call=(format:unknown)=>fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${input.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body(format))});
    let response=await call(EXPLANATION_RESPONSE_FORMAT);
    if(response.status===400) {
     const evidence=gateway400Evidence(await response.text());
     emit('warning',{code:'controlled_explanation_schema_rejected',severity:'warning',message:'Format explicatif refusé ; prescriptions applicatives inchangées.',evidence});
     response=await call({type:'json_object'});
    }
    if(!response.ok) throw Error(`CONTROLLED_GATEWAY_${response.status}`);
    const data=await response.json();
    const notes=JSON.parse(data?.choices?.[0]?.message?.content??'');
    const hydrated=attachFixedExplanations(chunk,notes);
    const validated=buildPlanChunkSchema(all.map(m=>m.id),{expectedWeekCount:chunk.weeks.length,isFirstChunk:index===0,catalogueContractsByWeek:contracts}).parse(hydrated) as PlanChunk;
    emit('chunk-json',{chunkIndex:index,chunk:validated});
    emit('chunk-progress',{chunkIndex:index,totalChunks:chunks.length,status:'done',weekRange:[chunk.weeks[0]?.weekNumber,chunk.weeks.at(-1)?.weekNumber],usage:data.usage?{promptTokens:data.usage.prompt_tokens,completionTokens:data.usage.completion_tokens,totalTokens:data.usage.total_tokens}:undefined});
   }
   emit('plan-complete',{totalChunks:chunks.length,totalWeeks:config.weeksAvailable,weeksProduced:chunks.flatMap(c=>c.weeks).length});
  } catch {
   emit('error',{code:'CONTROLLED_EXPLANATION_FAILED',message:'Explication IA non conforme ou indisponible : aucun plan complet validé.'});
  } finally {controller.close();}
 }}),{headers:{...input.corsHeaders,'Content-Type':'text/event-stream','Cache-Control':'no-cache'}});
}
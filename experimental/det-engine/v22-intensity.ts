import{getDoctrineDomain,type DoctrineDomainId}from'@/lib/zones/tfclDoctrine';
/** Candidate domain conversion plus explicit source constraints. No new physiological percentage. */
export function resolveV22Targets(sport:string,anchor:number|null,zones:string[],sourceText:string,bindings:Record<string,string>){
 const explicitFtp=sourceText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%\s*FTP/i);
 return zones.map(zone=>{const id=bindings[zone];if(!id)return{zone,status:'unresolved',reason:'explicit_domain_binding_missing'};
 const d=getDoctrineDomain(id as DoctrineDomainId),f=sport==='bike'?d.bike:sport==='run'?d.run:null;
 if(sport==='swim'||sport==='strength'||!f||anchor===null||!Number.isFinite(anchor)||anchor<=0)return{zone,domain:id,status:'unresolved',reason:sport==='swim'?'stroke_specific_anchor_and_execution_required':sport==='strength'?'neuromuscular_load_not_a_cardiovascular_zone':'reference_missing'};
 let lo=f.min,hi=f.max;const constraints=[]as unknown[];
 if(sport==='bike'&&explicitFtp&&d.zone==='Z2'){lo=Math.max(lo,Number(explicitFtp[1])/100);hi=Math.min(hi,Number(explicitFtp[2])/100);constraints.push({sourceLiteral:explicitFtp[0],rule:'intersection_with_source_not_dose_optimization'});}
 if(lo>hi)return{zone,domain:id,status:'refused',reason:'source_and_doctrine_domain_do_not_intersect',constraints};
 const factor=sport==='run'?1/3.6:1;return{zone,domain:id,status:'candidate_domain_not_individually_approved',unit:sport==='bike'?'W':'m/s',min:anchor*lo*factor,max:anchor*hi*factor,anchor,constraints,doctrine:'src/lib/zones/tfclDoctrine.ts',sourceTextRetained:true,unresolvedSourceContext:/FCmax|dans les côtes|dans les cotes/i.test(sourceText)?'additional heart-rate/terrain instructions retained; not automatically resolved':null};
 });
}

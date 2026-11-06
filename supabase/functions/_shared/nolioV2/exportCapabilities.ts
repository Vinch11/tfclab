export const NOLIO_EXPORT_REVISION='tfcl.nolio-scoped-export.v2';
export function exportCapabilities(functionName:'nolio-v2-plan-dry-run'|'nolio-v2-send-plan',releaseId:string){
 return {status:'CAPABILITIES',revision:NOLIO_EXPORT_REVISION,functionName,releaseId,scopes:['all','weeks','sessions'],serverOwnedPlanOnly:true,simulationReceiptsRequired:true};
}
export function sameExportCapabilities(value:unknown,functionName:string,releaseId:string):boolean{
 const v=value as ReturnType<typeof exportCapabilities>|null;
 return !!v&&v.status==='CAPABILITIES'&&v.revision===NOLIO_EXPORT_REVISION&&v.functionName===functionName&&v.releaseId===releaseId&&v.serverOwnedPlanOnly===true&&v.simulationReceiptsRequired===true&&Array.isArray(v.scopes)&&['all','weeks','sessions'].every(s=>v.scopes.includes(s));
}

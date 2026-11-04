import fs from'node:fs';import zlib from'node:zlib';import{createHash}from'node:crypto';import{it,expect,vi}from'vitest';import{v23Cases,prepareV23Case}from'./v23-cases';import{buildV24Prescription}from'./v24-prescription';import{computeDiagnostic}from'@/engines/diagnostic/computeDiagnostic';import{computeDiagnostic as candidateDiagnostic}from'v24:diagnostic-candidate';import{QA_PROFILES}from'@/lib/plan/qa/syntheticProfiles';import{buildPilotDiagnosticInput}from'@/lib/plan/qa/preparePilotTrainingPlanContext';import{assessRunReferenceV24}from'./v24-reference';import{resolvePhysiologicalReferences}from'./v20-physio';
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
it('executes the frozen eight cases and the separately identified PR424 boundary fixture offline',()=>{
 const a=JSON.parse(fs.readFileSync('docs/det-engine/v22/inputs.json','utf8')),b=JSON.parse(fs.readFileSync('docs/det-engine/v23/inputs.json','utf8')),spec=JSON.parse(fs.readFileSync('docs/det-engine/v24/inputs.json','utf8'));
 for(const[p,h]of Object.entries(spec.sourceInputs))expect(createHash('sha256').update(fs.readFileSync(p)).digest('hex')).toBe(h);
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(spec.clock));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
 const canonical=new Map<string,any>(zlib.gunzipSync(fs.readFileSync('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')).toString().trim().split('\n').map((l:string)=>{const x=JSON.parse(l);return[x.legacyId,x];})),cases=v23Cases(a,b),out=process.env.TFCL_DET_V24_OUT;
 if(out){if(fs.existsSync(out)||!out.startsWith('docs/det-engine/v24/evidence/'))throw Error('FRESH_V24_OUTPUT_REQUIRED');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/registered-cases.json',JSON.stringify(cases,null,2)+'\n');}
 const old=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/det-engine/v23/evidence/validation-1/build/results.json.gz')).toString());
 const rows=cases.map((c:any)=>{const v=prepareV23Case(c,a),r=buildV24Prescription(v,a,canonical);expect(JSON.parse(JSON.stringify(r.before))).toEqual(old.find((x:any)=>x.caseId===c.id).after);return{caseId:c.id,input:c,profileCaps:{normal:v.profile.normalCaps,long:v.profile.longCaps},result:r};});
 expect(rows).toHaveLength(8);
 const first=prepareV23Case(cases[0],a),raw=first.prepared.diagnostic._rawInput,original=computeDiagnostic(raw),separated=candidateDiagnostic(raw);
 const boundary={rawInput:raw,rawInputHash:hash(raw),production:original.runMLSS,candidate:separated.runMLSS,scoreUnchanged:separated._rawInput.runEconomyScore,refsNative:resolvePhysiologicalReferences(first.prepared),refsCandidate:resolvePhysiologicalReferences({...first.prepared,diagnostic:separated}),productionSourceUnchanged:true,candidateMerged:false};
 expect(original.runMLSS?.crossValidation?.severity).toBe('critical');expect(separated.runMLSS?.prediction).toBeNull();expect(separated.runMLSS?.crossValidation).toBeNull();expect(separated._rawInput.runEconomyScore).toBe(3);
 const f=spec.externalFixture424,{base,label,...overrides}=f;const sharedRaw={...buildPilotDiagnosticInput(QA_PROFILES.find(p=>p.id===base)!),...overrides},native=computeDiagnostic(sharedRaw),candidate=candidateDiagnostic(sharedRaw),missing=candidateDiagnostic({...sharedRaw,runningEconomyCostMlKgKm:null});
 expect(native.runMLSS?.prediction?.mlssPct).toBe(93.7);expect(candidate.runMLSS?.prediction?.mlssPct).toBe(83.2);expect(missing.runMLSS).toBeNull();
 const source=JSON.parse(fs.readFileSync('docs/det-engine/v24/evidence/pr424-retrieval.json','utf8')),patch=source.files.find((x:any)=>x.path.endsWith('economy-contract.patch'));
 const envelope={state:'corrected_candidate',speed:boundary.refsCandidate.mlssSpeedKmh,unit:'km/h',sourceRef:source.ref,sourceHash:patch.contentSha256,rawInputHash:boundary.rawInputHash,observedAt:'2026-10-29',conflictUnresolved:false,source:'unmerged virtual replay; original supplied threshold pace retained, no CE invented for A'};
 const transport=spec.externalStates.map((state:string)=>({state,input:{...envelope,state},decision:assessRunReferenceV24({...envelope,state})}));
 const external={label,raw:sharedRaw,rawInputHash:hash(sharedRaw),production:native.runMLSS,candidate:candidate.runMLSS,missingCE:missing.runMLSS,fixtureNotAReplacement:true};
 if(out){fs.writeFileSync(out+'/results.json.gz',zlib.gzipSync(JSON.stringify(rows,null,2)));fs.writeFileSync(out+'/physiology-handoff.json',JSON.stringify({boundary,external,transport},null,2)+'\n');}
 }finally{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();}
});

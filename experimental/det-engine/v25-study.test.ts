import fs from'node:fs';import zlib from'node:zlib';import{createHash}from'node:crypto';import{it,expect,vi}from'vitest';import{loadV25TestData}from'./v25-test-data';import{buildV25Prescription}from'./v25-prescription';import{executeV25Fixtures}from'./v25-fixtures';import{computeDiagnostic}from'@/engines/diagnostic/computeDiagnostic';
it('executes eight frozen cases and preregistered floor, cost and future recovery fixtures offline',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
 const d=loadV25TestData(),out=process.env.TFCL_DET_V25_OUT;
 for(const[p,h]of Object.entries(d.spec.cohortInputs))expect(createHash('sha256').update(fs.readFileSync(p)).digest('hex')).toBe(h);
 if(out){if(fs.existsSync(out)||!out.startsWith('docs/det-engine/v25/evidence/'))throw Error('FRESH_V25_OUTPUT_REQUIRED');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/registered-cases.json',JSON.stringify(d.cases,null,2)+'\n');fs.writeFileSync(out+'/registered-contract-fixtures.json',JSON.stringify(d.fixtures,null,2)+'\n');}
 const rows=d.prepared.map((v:any,i:number)=>{const result=buildV25Prescription(v,d.a,d.canonical,d.spec.clock);expect(JSON.parse(JSON.stringify(result.baselineV24))).toEqual(d.old[i].result);return{caseId:v.caseId,input:d.cases[i],profileCaps:{normal:v.profile.normalCaps,long:v.profile.longCaps},result};});
 const native424=computeDiagnostic(d.raw424).runMLSS,contracts=executeV25Fixtures(d.fixtures,d.prepared[1].profile,native424,d.spec.clock);
 expect(rows).toHaveLength(8);expect(contracts.floors).toHaveLength(5);expect(contracts.physiology).toHaveLength(4);expect(contracts.recovery).toHaveLength(6);
 if(out){fs.writeFileSync(out+'/results.json.gz',zlib.gzipSync(JSON.stringify(rows,null,2)));fs.writeFileSync(out+'/contract-results.json',JSON.stringify({native424,contracts},null,2)+'\n');}
 }finally{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();}
});

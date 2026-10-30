import{it,expect}from'vitest';import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{auditTechnicalPlan}from'./v2-technical-validation';
const file=process.env.TFCL_DET_V2_AUDIT_INPUT??'docs/det-engine/v2/cycles/05/candidate.json.gz';
const bytes=readFileSync(file),bundle=JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
it('audits all actual candidate schemas without conflating sporting validity or refusals',()=>{
 const rows=bundle.rows.map((r:{id:string;candidate?:Parameters<typeof auditTechnicalPlan>[0]})=>({id:r.id,planHash:r.candidate?createHash('sha256').update(JSON.stringify(r.candidate)).digest('hex'):null,...auditTechnicalPlan(r.candidate)}));
 expect(rows).toHaveLength(600);expect(rows.filter((r:{execution:string})=>r.execution==='executed')).toHaveLength(167);
 expect(rows.filter((r:{valid:boolean|null})=>r.valid===false)).toEqual([]);
 expect(auditTechnicalPlan(undefined).valid).toBe(null);
 if(process.env.TFCL_DET_V2_AUDIT_OUT)writeFileSync(process.env.TFCL_DET_V2_AUDIT_OUT,JSON.stringify({inputVersion:bundle.version,source:'v2-technical-validation.ts',rows}));
});
it('detects serialization and calendar damage independently of sports scores',()=>{
 const plan=structuredClone(bundle.rows.find((r:{candidate?:unknown})=>r.candidate).candidate);
 plan.weeks[0].sessions[0].durationMin=-1;expect(auditTechnicalPlan(plan).valid).toBe(false);
 const broken=structuredClone(bundle.rows.find((r:{candidate?:unknown})=>r.candidate).candidate);
 broken.weeks[0].sessions[0].dayIndex=99;expect(auditTechnicalPlan(broken).issues.some(i=>i.includes('day_name_index_conflict'))).toBe(true);
});

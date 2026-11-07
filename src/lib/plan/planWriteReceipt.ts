/**
 * A successful HTTP status or error=null is not a canonical write receipt.
 * Verify the exact owner, athlete and JSON returned by a single-row mutation.
 * No retry: a transport failure or missing receipt may follow a committed write.
 */
export type PlanWriteExpectation={
  operation:'archive'|'current';
  athleteId:string;
  coachId:string;
  planJson:unknown;
  archiveId?:string;
};
type Reply={data:unknown;error:unknown};
export class PlanWriteUnconfirmedError extends Error {
  readonly code='PLAN_WRITE_UNCONFIRMED';
  readonly mayHaveCommitted:boolean;
  readonly operation:PlanWriteExpectation['operation'];
  readonly athleteId:string;
  readonly archiveId?:string;
  constructor(reason:string,expected:PlanWriteExpectation,mayHaveCommitted=true){
    super('Plan write receipt unavailable: '+reason);
    this.name='PlanWriteUnconfirmedError';
    this.operation=expected.operation;
    this.athleteId=expected.athleteId;
    this.archiveId=expected.archiveId;
    this.mayHaveCommitted=mayHaveCommitted;
  }
}
function canonicalJson(value:unknown):string {
  const wire=JSON.stringify(value,(_key,entry)=>{
    if(typeof entry==='number'&&!Number.isFinite(entry))
      throw Error('non_finite_plan_number');
    return entry;
  });
  if(wire===undefined)throw Error('plan_is_not_json');
  const sorted=(entry:unknown):unknown=>{
    if(Array.isArray(entry))return entry.map(sorted);
    if(entry&&typeof entry==='object')return Object.fromEntries(
      Object.entries(entry).sort(([a],[b])=>a.localeCompare(b))
        .map(([key,item])=>[key,sorted(item)]));
    return entry;
  };
  return JSON.stringify(sorted(JSON.parse(wire)));
}
function record(value:unknown):Record<string,unknown>|null {
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?
    value as Record<string,unknown>:null;
}
export async function requirePlanWriteReceipt(
  request:PromiseLike<Reply>,expected:PlanWriteExpectation,
):Promise<void>{
  // Supabase's mutation builder is lazy; reject a non-JSON expectation before
  // awaiting it. Canonicalisation preserves arrays and all numeric values.
  let intended:string;
  try{intended=canonicalJson(expected.planJson);}
  catch{throw new PlanWriteUnconfirmedError('invalid_expected_json',expected,false);}
  let reply:Reply;
  try{reply=await request;}
  catch{throw new PlanWriteUnconfirmedError('transport_response_lost',expected);}
  if(!reply||typeof reply!=='object')
    throw new PlanWriteUnconfirmedError('empty_response',expected);
  if(reply.error){
    const error=record(reply.error);
    // Preserve definite server errors. A network result or zero-row single()
    // has no trustworthy exact-row receipt, so retain commit uncertainty.
    if(typeof error?.code==='string'&&error.code.trim()&&error.code!=='PGRST116')
      throw reply.error;
    throw new PlanWriteUnconfirmedError('server_receipt_unavailable',expected);
  }
  const row=record(reply.data);
  if(!row||row.athlete_id!==expected.athleteId||row.coach_id!==expected.coachId||
     (expected.operation==='archive'&&(!expected.archiveId||row.id!==expected.archiveId)))
    throw new PlanWriteUnconfirmedError('row_identity_missing_or_mismatched',expected);
  let actual:string;
  try{actual=canonicalJson(row.plan_json);}
  catch{throw new PlanWriteUnconfirmedError('returned_json_invalid',expected);}
  if(actual!==intended)
    throw new PlanWriteUnconfirmedError('returned_plan_does_not_match',expected);
}
export function planWriteErrorMessage(error:unknown,fallback:string):string {
  return error instanceof PlanWriteUnconfirmedError&&error.mayHaveCommitted?
    'Sauvegarde non confirmée. Rechargez le plan avant de réessayer.':fallback;
}

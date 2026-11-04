import {describe,expect,it} from 'vitest';
import {requirePlanWriteReceipt,PlanWriteUnconfirmedError,planWriteErrorMessage}
  from '../planWriteReceipt';

const plan={title:'synthetic',weeks:[{sessions:[{durationMin:45}]}],
  _coachLimiterOrder:['tte','aerobic_ceiling']};
const expected={operation:'archive' as const,athleteId:'qa-athlete-A',
  coachId:'qa-coach-A',planJson:plan,archiveId:'qa-version-1'};
const row={id:'qa-version-1',athlete_id:'qa-athlete-A',coach_id:'qa-coach-A',plan_json:plan};

describe('exact plan write receipts — no success from status alone',()=>{
  it('accepts the exact canonical row, independent of JSON object-key order',async()=>{
    await expect(requirePlanWriteReceipt(Promise.resolve({error:null,data:{
      ...row,created_at:'server-only',
      plan_json:{_coachLimiterOrder:['tte','aerobic_ceiling'],
        weeks:[{sessions:[{durationMin:45}]}],title:'synthetic'},
    }}),expected)).resolves.toBeUndefined();
  });
  it.each([
    null,[],[row],{...row,id:'wrong-version'},
    {...row,athlete_id:'qa-athlete-B'},{...row,coach_id:'qa-coach-B'},
    {...row,plan_json:{...plan,title:'different'}},
    {...row,plan_json:{...plan,_coachLimiterOrder:['aerobic_ceiling','tte']}},
    {...row,plan_json:{...plan,weeks:[{sessions:[{durationMin:40}]}]}},
  ])('rejects an absent, wrong or changed canonical receipt: %j',async data=>{
    await expect(requirePlanWriteReceipt(Promise.resolve({data,error:null}),expected))
      .rejects.toBeInstanceOf(PlanWriteUnconfirmedError);
  });
  it('current-plan primary key is athlete_id; no fictitious id column required',async()=>{
    await expect(requirePlanWriteReceipt(Promise.resolve({error:null,data:{
      athlete_id:row.athlete_id,coach_id:row.coach_id,plan_json:plan,
    }}),{...expected,operation:'current',archiveId:undefined})).resolves.toBeUndefined();
  });
  it('propagates a definite database refusal without replacing the cause',async()=>{
    const error={code:'42501',message:'synthetic denied'};
    await expect(requirePlanWriteReceipt(Promise.resolve({data:null,error}),expected))
      .rejects.toBe(error);
  });
  it.each([
    {data:null,error:{code:'PGRST116',message:'0 rows'}},
    {data:null,error:{code:'',message:'network response unavailable'}},
  ])('retains commit uncertainty for a missing server receipt: %j',async reply=>{
    await expect(requirePlanWriteReceipt(Promise.resolve(reply),expected))
      .rejects.toMatchObject({mayHaveCommitted:true,operation:'archive',
        archiveId:'qa-version-1',athleteId:'qa-athlete-A'});
  });
  it('retains commit uncertainty after a rejected transport promise',async()=>{
    await expect(requirePlanWriteReceipt(Promise.reject(Error('connection lost')),expected))
      .rejects.toMatchObject({mayHaveCommitted:true,code:'PLAN_WRITE_UNCONFIRMED'});
  });
  it('does not send a lazy mutation when the intended JSON is invalid',async()=>{
    let sent=0;
    const request={then:(resolve:(v:{data:unknown;error:unknown})=>unknown)=>{
      sent++;return Promise.resolve(resolve({data:row,error:null}));
    }} as unknown as PromiseLike<{data:unknown;error:unknown}>;
    await expect(requirePlanWriteReceipt(request,{...expected,
      planJson:{durationMin:Infinity}})).rejects.toMatchObject({mayHaveCommitted:false});
    expect(sent).toBe(0);
  });
  it('warns about an unconfirmed save rather than asserting no write happened',()=>{
    expect(planWriteErrorMessage(new PlanWriteUnconfirmedError('missing',expected),'failure'))
      .toBe('Sauvegarde non confirmée. Rechargez le plan avant de réessayer.');
    expect(planWriteErrorMessage({code:'42501'},'failure')).toBe('failure');
  });
});

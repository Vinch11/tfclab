/** Common release smoke test for Chromium's actual worker and Node's isolated worker. Synthetic records only. */
export async function receipt(run, input) {
  const plan=await run({action:'generate',input});
  const sessions=plan.weeks.flatMap(w=>w.sessions.map((s,index)=>({...s,key:`S${w.weekNumber}-J${s.dayIndex}-${index}`})));
  const chosen=sessions.find(s=>s.weekNumber===5&&s.dayIndex===3&&s.catalogId);
  const race=sessions.find(s=>s.title.startsWith('COURSE : '));
  if(!race||!chosen||plan._provenance.engine!=='det')throw Error('Plan CLM ou provenance absent.');
  const refs={synthetic:true,athleteId:'usr_SYNTHETIC',sportIds:{bike:'spt_BIKE',strength:'spt_STRENGTH'},exerciseIds:{},
    competition:{date:plan._raceDate,name:race.title.slice('COURSE : '.length),sport:'bike'}};
  const counts=[];let workout;
  for(const scope of [undefined,{kind:'weeks',from:5,to:5},{kind:'sessions',keys:[chosen.key]}]){
    const r=await run({action:'verify',args:[plan,refs,'TEST_CLM',scope]});
    if(!r.precheck.complete)throw Error(JSON.stringify(r.precheck.rows.filter(row=>row.status==='refused')));
    counts.push(r.ops.length);if(scope?.kind==='sessions')workout=r.ops[0].body.workout;
  }
  const [warmup,repeats,cooldown]=workout;
  const [effort,recovery]=repeats.steps;
  const expected=[
    plan.weeks.length===8,plan._detSourceProposal.limiterOrder.join('/')==='FTP/kg',counts.join('/')==='37/5/1',
    plan._detSourceProposal.checks.filter(c=>c.code==='time_trial_posture'&&c.status==='passed').length===2,
    warmup.duration.value===900 && warmup.targets[0].unit==='W', repeats.times===2 && repeats.skip_last===true,
    effort.duration.value===930 && effort.targets[0].unit==='W' && effort.targets[0].value===136.8 && effort.targets[0].value_max===158.4,
    recovery.duration.value===240,cooldown.duration.value===600,
  ];
  if(expected.some(test=>!test))throw Error('Séances, cibles ou durées différentes de la prescription source.');
  return {version:plan._provenance.engineVersion,weeks:plan.weeks.length,counts,physicalReceipt:false,fieldObservation:false};
}

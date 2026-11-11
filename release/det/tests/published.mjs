import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=new URL(process.argv[2]).origin;
if(new URL(origin).protocol!=='https:')throw Error('Précisez l’origine HTTPS du site publié.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=name=>readFile(new URL(name,import.meta.url));
const expectedManifest=await local('../dist/manifest.json');
const manifest=JSON.parse(expectedManifest);
const clientHash=hash(await local('../dist/client.mjs'));
const runtime='runtime/'+manifest.version+'/'+clientHash;
const browser=await chromium.launch({executablePath:process.env.DET_CHROME_EXECUTABLE||undefined});
try {
  const context=await browser.newContext({serviceWorkers:'block'});
  const observed=new Set();
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin || request.method()!=='GET' || url.pathname.includes('/functions/v1/'))return route.abort();
    observed.add(url.pathname);
    return route.continue();
  });
  async function publicFile(path){
    const response=await context.request.get(origin+path,{headers:{'Cache-Control':'no-cache'}});
    assert.equal(response.status(),200,path);
    assert.equal(new URL(response.url()).origin,origin);
    return response.body();
  }
  const publicManifest=await publicFile('/__det/v1/manifest.json');
  assert.deepEqual(publicManifest,expectedManifest,'Octets du manifeste canonique');
  const host=JSON.parse(await publicFile('/__det/coach/host-release.json'));
  assert.equal(host.runtime,runtime);
  assert.equal(JSON.parse(await publicFile('/plan-release.json')).releaseId,host.upstreamRelease);
  const base='/__det/coach/'+runtime+'/';
  assert.deepEqual(await publicFile(base+'manifest.json'),expectedManifest);
  const page=await context.newPage();
  const form=await page.goto(origin+'/__det/coach/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(form.status(),200);
  assert.equal(await page.locator('#det-root').count(),1);
  const modulePath=await page.locator('script[type="module"][src]').first().getAttribute('src');
  assert.ok(host.assets[new URL(modulePath,page.url()).pathname.split('/').pop()]);
  const results={};
  for(const sport of ['marathon','ironman']){
    const input=JSON.parse(await local('./witness-'+sport+'.json'));
    const actual=await page.evaluate(async({base,input})=>{
      const {runDet}=await import(base+'client.mjs');
      const plan=await runDet({action:'generate',input});
      const preview=scope=>runDet({action:'preview',plan,scope});
      const full=await preview({kind:'all'});
      const week=await preview({kind:'weeks',from:1,to:1});
      const first=week.ops.find(op=>op.sessionKey);
      if(!first)throw Error('Première semaine sans opération vérifiable.');
      const session=await preview({kind:'sessions',keys:[first.sessionKey]});
      const proposal=plan._detSourceProposal;
      const sessions=w=>w.days.flatMap(day=>day.sessions).filter(s=>s.role!=='race');
      const longAt=(n,sport)=>sessions(proposal.weeks[n-1]).find(s=>s.role==='long'&&s.sport===sport)?.knownMinutes;
      const runPeak=Math.max(...proposal.weeks.map(w=>sessions(w).flatMap(s=>s.components)
        .filter(c=>c.sport==='run').reduce((sum,c)=>sum+c.durationMinutes,0)));
      return {version:plan._provenance.engineVersion,weeks:plan.weeks.length,limiters:proposal.limiterOrder,
        complete:[full,week,session].every(p=>p.precheck.complete),operations:[full,week,session].map(p=>p.ops.length),
        matchingSingle:session.ops.some(op=>op.bodySha256===first.bodySha256),
        sport:input.config.objective==='Marathon' ? {peakRunMinutes:runPeak,longRunS13:longAt(13,'run')} :
          {longBikeS11:longAt(11,'bike'),longRunS11:longAt(11,'run'),brickWeeks:proposal.transitionPractice.map(p=>p.week)}};
    },{base,input});
    assert.equal(actual.version,manifest.version);
    assert.equal(actual.weeks,16);
    assert.deepEqual(actual.limiters,input.config.identifiedLimitersRaw);
    assert.equal(actual.complete,true);
    assert.equal(actual.matchingSingle,true);
    const [plan,week,session]=actual.operations;
    assert.ok(plan>week && week>session && session===1);
    if(sport==='marathon'){
      assert.equal(input.config.raceGoals[0].targetTimeMinutes,187);
      assert.deepEqual(actual.sport,{peakRunMinutes:434.5,longRunS13:159.5});
    }else{
      assert.equal(plan,166);
      assert.deepEqual(actual.sport,{longBikeS11:150,longRunS11:100,brickWeeks:[3,7,11]});
    }
    results[sport]=actual;
  }
  const lowVolume = JSON.parse(await local('./ordinary-balanced-10K.json'));
  lowVolume.config.loadHistory = {recentWeeklyHours:2.4,recentWeeksCount:4};
  const compact = await page.evaluate(async ({base,input}) => {
    const {runDet} = await import(base+'client.mjs');
    const plan = await runDet({action:'generate',input});
    const proposal = plan._detSourceProposal;
    const firstWeek = proposal.weeks[0];
    const sessions = firstWeek.days.flatMap(day=>day.sessions);
    const strength = sessions.find(session=>session.sport==='strength');
    const preview = await runDet({action:'preview',plan,scope:{kind:'all'}});
    const noStrength = await runDet({action:'generate',input:{...input,
      config:{...input.config,strengthSessionsPerWeek:0}}});
    return {version:plan._provenance.engineVersion,weeks:proposal.weeks.length,
      firstWeekMinutes:firstWeek.knownMinutes,runs:sessions.filter(s=>s.sport==='run').length,
      source:strength?.components[0].sourceId,strengthMinutes:strength?.knownMinutes,
      limiters:proposal.limiterOrder,blocked:proposal.checks.filter(c=>c.status==='blocked').length,
      precheck:preview.precheck.complete,operations:preview.ops.length,
      zeroStrengthWeeks:noStrength.weeks.length,zeroStrengthSessions:noStrength._detSourceProposal.weeks
        .flatMap(week=>week.days.flatMap(day=>day.sessions)).filter(s=>s.sport==='strength').length};
  },{base,input:lowVolume});
  assert.deepEqual(compact,{version:manifest.version,weeks:8,firstWeekMinutes:141,runs:4,
    source:'V3P_STRENGTH_201',strengthMinutes:21,limiters:[],blocked:0,precheck:true,
    operations:38,zeroStrengthWeeks:8,zeroStrengthSessions:0});
  results.balanced10K144 = compact;
  const marathon=JSON.parse(await local('./witness-marathon.json'));
  const decisions=await page.evaluate(async({base,marathon})=>{
    const {runDet}=await import(base+'client.mjs');
    const currentThreshold={...marathon,athlete:{...marathon.athlete,paceThresholdSecPerKm:260},
      diagnostic:{...marathon.diagnostic,_rawInput:{...marathon.diagnostic._rawInput,paceThresholdSecPerKm:260}}};
    const inputs={
      standard:{config:{objective:'StartToRun'}},
      assessment:{...marathon,diagnostic:null},
      excludedRun:{...marathon,config:{...marathon.config,constraints:'Course à pied interdite'}},
      paceDomain:currentThreshold,
    };
    const answers={};
    for(const [caseName,input] of Object.entries(inputs)){
      try{await runDet({action:'generate',input});}
      catch(error){answers[caseName]={decision:error.decision,message:error.message};}
    }
    return answers;
  },{base,marathon});
  const expected={
    standard:['outside_det',[],/protocole marche-course/],
    assessment:['missing_data',['diagnostic'],/bilan/],
    excludedRun:['incompatible',['objective','constraints'],/course à pied/],
    paceDomain:['engine_limit',[],/4:26\/km.+4:20\/km.+conserver le chrono/],
  };
  for(const [caseName,[kind,fields,reason]] of Object.entries(expected)){
    assert.deepEqual(decisions[caseName]?.decision,{kind,fields},caseName);
    assert.match(decisions[caseName].message,reason);
  }
  for(const name of ['client.mjs','manifest.json',manifest.entry])assert.ok(observed.has(base+name),name);
  console.log(JSON.stringify({publicOrigin:origin,manifestBytes:publicManifest.length,manifestSha256:hash(publicManifest),
    runtime,results,decisions,syntheticInputs:true,nolioSend:false,nolioReadback:false,watchObservation:false}));
} finally {await browser.close();}

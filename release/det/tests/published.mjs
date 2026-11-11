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
  for(const name of ['client.mjs','manifest.json',manifest.entry])assert.ok(observed.has(base+name),name);
  console.log(JSON.stringify({publicOrigin:origin,manifestBytes:publicManifest.length,manifestSha256:hash(publicManifest),
    runtime,results,syntheticInputs:true,nolioSend:false,nolioReadback:false,watchObservation:false}));
} finally {await browser.close();}

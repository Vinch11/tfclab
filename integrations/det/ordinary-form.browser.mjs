import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const project='https://detfixture.supabase.co';
const root=fileURLToPath(new URL('../../',import.meta.url));
const coach='00000000-0000-4000-8000-0000000000c1';
const athlete='00000000-0000-4000-8000-0000000000a1';
const date='2026-10-26T12:00:00Z';
const publicKey='sb_publishable_synthetic_ordinary_form';
const publicFiles=path.join(root,'public');
const ordinaryShell=(await readFile(path.join(root,'index.html'),'utf8'))
  .replace('%VITE_SUPABASE_URL%',project).replace('%VITE_SUPABASE_PUBLISHABLE_KEY%',publicKey);
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/index.html'){res.setHeader('Content-Type','text/html');res.end(ordinaryShell);return;}
  const file=path.resolve(publicFiles,'.'+pathname);
  if(!file.startsWith(publicFiles+path.sep)){res.writeHead(404).end();return;}
  try{
    const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/octet-stream'};
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const app='http://127.0.0.1:'+server.address().port;
const expires=2300000000;
const user={id:coach,role:'authenticated',aud:'authenticated',email:'coach@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:date};
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=[part({alg:'HS256',typ:'JWT'}),part({iss:project+'/auth/v1',sub:coach,aud:'authenticated',role:'authenticated',exp:expires}),part('synthetic')].join('.');
const session={user,access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_in:3600,expires_at:expires};
const form={objective:'703',raceDate:'2026-12-20',planStartDate:'2026-10-26',raceFormat:'continuous',weeklyHours:'7',sessionsPerWeek:'5',maxSessionsPerDay:'2',strengthSessionsPerWeek:'1',ambition:'age_group',constraints:'pas de vélo le mercredi',crossTrainingVelo:false,crossTrainingNatation:false};
const rows={
  athletes:[{id:athlete,coach_id:coach,name:'Profil CLM de test',goal:'703',refs:{fcMax:188,ambition:'age_group'},birth_date:'1991-01-01',sex:'M',active_snapshot_id:'snap-syn-1',is_hidden:false,created_at:date}],
  snapshots:[{id:'snap-syn-1',athlete_id:athlete,coach_id:coach,date:'2026-10-01',created_at:date,sport_main:'bike',ftp:180,weight_kg:72,fc_max:188,vma:20,vo2max:75,vlamax:0.25,vlamax_run:0.25,vlamax_source:'lab',vlamax_protocol:'SYNTHETIC lactate lab',pace_threshold_sec_per_km:240,tte_observed_min_run:80,run_economy_score:68,run_hr_drift_pct:3.5,tss_7d:380,fatigue_state:'ok'}],
};
let browser,page;
try{
  browser=await chromium.launch({executablePath:process.env.DET_CHROME_EXECUTABLE||undefined});
  const ctx=await browser.newContext({timezoneId:'UTC'});
  page=await ctx.newPage();
  page.on('pageerror',error=>console.error('Erreur navigateur (profil synthétique)',error.message));
  await page.clock.setFixedTime(new Date(date));
  page.on('console',msg=>{if(msg.type()==='error')console.error('Console du profil synthétique',msg.text().slice(0,350));});
  page.on('requestfailed',r=>console.error('Lecture du profil synthétique',new URL(r.url()).pathname,r.failure()?.errorText));
  const keys={'tfcl_ai_multi_plan':JSON.stringify({isMultiMode:true}), 'sb-detfixture-auth-token':JSON.stringify(session),'vinceslab-selected-athlete':athlete,['tfcl_ai_plan_'+athlete]:JSON.stringify(form)};
  const refused=[],requested=[],errors=[];
  await page.addInitScript(values=>{for(const [k,v] of Object.entries(values))localStorage.setItem(k,v);},keys);
  await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    requested.push(u.pathname);
    if(u.origin===app)return route.continue();
    if(u.origin!==project || !['GET','HEAD','OPTIONS'].includes(req.method()) || !(u.pathname.startsWith('/rest/v1/')||u.pathname==='/auth/v1/user')){
      refused.push(req.method()+' '+u.origin+u.pathname);return route.abort();
    }
    const headers={'access-control-allow-origin':app,'access-control-allow-headers':req.headers()['access-control-request-headers']||'*','access-control-allow-methods':'GET,HEAD,OPTIONS','content-type':'application/json'};
    const table=u.pathname.split('/').pop();
    const response=u.pathname==='/auth/v1/user'?user:rows[table]??(req.headers().accept?.includes('vnd.pgrst.object')?null:[]);
    return route.fulfill({status:req.method()==='OPTIONS'?204:200,headers,body:req.method()==='OPTIONS'?'':JSON.stringify(response)});
  });
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(app+'/__det/coach/index.html');
  await page.getByRole('button',{name:'DET-ENGINE',exact:true}).click({timeout:25000});
  assert(!requested.some(url=>url.endsWith('worker.js.gz')));
  await page.getByRole('button',{name:/^(?:\d+\s*·\s*)?Configuration$/}).click();
  const racePicker=page.getByText('Objectif principal (A)',{exact:true}).locator('..').getByRole('combobox');
  await racePicker.click();
  await page.getByRole('option',{name:'Contre-la-montre vélo',exact:true}).click();
  for(const [label,value] of [['Durée de course prévue','60'],['Durée continue déjà tolérée','20'],['Total aéro toléré par séance','60'],['Durée continue visée','15'],['Total aéro visé','30'],['Date de l’observation','2026-10-20'],['Référence de la sortie','Observation synthétique'],['Semaines des séances aéro','5, 6']]){
    await page.getByLabel(label).fill(value);
  }
  await page.getByLabel('Jour des séances').selectOption('3');
  await page.getByLabel('Réglage du vélo vérifié').check();
  await page.getByLabel('Position tolérée sans douleur').check();
  await page.getByRole('button',{name:'Générer avec DET'}).click();
  await page.locator('[aria-label="Génération déterministe"]').locator('h3,[role=alert]').first().waitFor({timeout:90000});
  const result=page.locator('[aria-label="Génération déterministe"]');
  assert.equal(await result.locator('[role=alert]').allTextContents().then(r=>r.join(' ')),'');
  assert.equal(await result.locator('details').count(),8);
  assert.match(await result.innerText(),/FTP\/kg/);
  const pinned=JSON.parse(await readFile(path.join(publicFiles,'__det/v1/manifest.json'),'utf8'));
  assert((await result.getByTestId('det-provenance').innerText()).includes(pinned.version));
  const guidance=page.getByRole('region',{name:'Guidage Nolio V2'});
  async function verify(scope,expected){
    await guidance.getByLabel('Portée du contrôle').selectOption(scope);
    await guidance.getByRole('button',{name:'Vérifier sans envoyer'}).click();
    await guidance.getByText(expected+' opération(s) préparée(s) en simulation locale. Traduction complète.').waitFor();
  }
  await verify('all',37);
  await verify('week-5',5);
  const key=await guidance.locator('option').evaluateAll(options=>options.find(o=>o.value.startsWith('S5-J3-')&&o.textContent.includes('CLM'))?.value);
  assert.ok(key,'Séance CLM du jeudi de la cinquième semaine');
  await verify(key,1);
  const stages=await guidance.innerText();
  assert.match(stages,/15 min 30 s/);assert.match(stages,/136,8–158,4 W/);assert.match(stages,/dernière récupération omise/);
  assert.deepEqual(refused,[]);assert.deepEqual(errors,[]);
  const witness=await ctx.newPage();
  await witness.goto(app+'/index.html');
  const original=await witness.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),Object.keys(keys));
  assert.deepEqual(original,Object.values(keys));
  console.log('Formulaire TFCLab 2.1, compte et bilan synthétiques, 8 semaines CLM. Aucune requête IA ni écriture sur la session TFCLab.');
}catch(error){
  if(page)console.error('Vue de test :',((await page.locator('body').innerText().catch(()=>''))||'').slice(-2200));
  throw error;
}finally{await browser?.close();server.close();}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.argv[2];
if (!origin || new URL(origin).protocol!=='https:') throw Error('Précisez l’origine HTTPS du site publié.');
const expected=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url),'utf8')).version;
const fixture=JSON.parse(await readFile(new URL('./ordinary-high-marathon.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.DET_CHROME_EXECUTABLE||undefined});
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(new URL('/__det/v1/manifest.json',origin).href,{waitUntil:'domcontentloaded',timeout:20000});
  const result=await page.evaluate(async({expected,fixture})=>{
    const manifest=JSON.parse(document.body.textContent);
    if(manifest.version!==expected)return {expected,served:manifest.version,match:false};
    const {runDet}=await import('/__det/v1/client.mjs');
    const plan=await runDet({action:'generate',input:fixture});
    const preview=await runDet({action:'preview',plan,scope:{kind:'weeks',from:1,to:1}});
    return {expected,served:manifest.version,match:plan._provenance.engineVersion===expected,
      weeks:plan.weeks.length,previewComplete:preview.precheck.complete,previewOperations:preview.ops.length};
  },{expected,fixture});
  console.log(JSON.stringify(result));
  assert.equal(result.match,true,'Le site doit distribuer le moteur testé.');
  assert.equal(result.weeks,fixture.config.weeksAvailable);
  assert.equal(result.previewComplete,true);
} finally {await browser.close();}

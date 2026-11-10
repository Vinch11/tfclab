import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root)){res.writeHead(404).end();return;}
  try {
    const bytes=await readFile(file);
    const types={'.mjs':'text/javascript','.html':'text/html','.json':'application/json','.gz':'application/octet-stream'};
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'text/plain'}).end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.DET_CHROME_EXECUTABLE||undefined});
  const page=await browser.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/tests/receipt.html');
  const result=page.locator('output[data-done]');
  await result.waitFor({timeout:120000});
  assert.equal(await result.getAttribute('data-done'),'ok',await result.innerText());
  console.log(await result.innerText());
}finally{await browser?.close();server.close();}

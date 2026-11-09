import {test,expect} from '@playwright/test';
for(const viewport of [{width:1118,height:676},{width:390,height:844}]) {
 test(`global 33 week contract survives a window failure at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);
  const writes:string[]=[];
  await page.route('**/*',async route=>{
   if(!['GET','HEAD','OPTIONS'].includes(route.request().method())) {writes.push(route.request().method());await route.abort();}
   else await route.continue();
  });
  await page.goto('/__e2e/plan-contract');
  await expect(page.getByText('Plan complet : 33 semaines',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Simuler un refus du premier bloc'}).click();
  await expect(page.getByText('Plan complet : 33 semaines',{exact:true})).toBeVisible();
  await page.getByText('Contrats des 33 semaines',{exact:true}).click();
  await expect(page.getByRole('cell',{name:'33',exact:true})).toHaveCount(1);
  expect(writes).toEqual([]);
 });
}
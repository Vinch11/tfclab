import { expect, test } from '@playwright/test';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'node:url';

GlobalWorkerOptions.workerSrc = fileURLToPath(new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url));

test('les deux éditions du dashboard ouvrent le bon contenu sur téléphone et ordinateur', async ({page, context, browserName}) => {
  // The document also supports system fonts when the external font CDN is unavailable.
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
  await context.route('**/rest/v1/**', async route => {
    const calendar = new URL(route.request().url()).pathname.endsWith('/training_plan');
    await route.fulfill({json:calendar ? [
      {date:'2027-01-04', phase:'Endurance', custom_workout_title:'Sortie vélo régulière'},
      {date:'2027-01-12', phase:'Allure de course', custom_workout_title:'Enchaînement spécifique'},
    ] : []});
  });
  await page.goto('/__e2e/dashboard-profile');
  for (const audience of ['athlète','coach']) {
    if (!(await page.getByRole('dialog').isVisible())) {
      await page.getByRole('button', {name:'Rapports coach et athlète'}).click();
    }
    const [report] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', {name: new RegExp('^Rapport ' + audience)}).click(),
    ]);
    await expect(report.locator('main.edition')).toBeVisible();
    await expect(report).toHaveURL(/\/print-preview\?d=/);
    await expect(report.locator('main')).toContainText('Camille');
    await expect(report.locator('main')).toContainText('Enchaînement spécifique');
    await expect(report.locator('#empreinte .lab-gauge').first()).toBeVisible();
    await expect(report.locator('#terrain')).toContainText('Puissance pendant le test');
    await expect(report.locator('[data-critical-sport="bike"]')).toContainText('232 W');
    await expect(report.locator('[data-critical-sport="run"]')).toContainText('4:16 min/km');
    await expect(report.locator('[data-critical-sport="run"]')).toContainText('Estimation à confirmer');
    await expect(report.locator('.durability-summary').first()).toContainText('2 sorties longues');
    // Historique des bilans : édition coach seulement (règle : aucune progression côté athlète).
    if (audience === 'coach') await expect(report.locator('#evolution')).toContainText('171 W');
    else await expect(report.locator('#evolution')).toHaveCount(0);
    if (audience === 'coach') {
      await expect(report.locator('#terrain')).toContainText('Capteur témoin');
      await expect(report.locator('#staff-evidence')).toContainText('Note réservée au coach');
      await expect(report.locator('#lecture-coach')).toBeVisible();
    } else {
      await expect(report.locator('main')).not.toContainText('Note réservée au coach');
      await expect(report.locator('#preparation')).toContainText('Ce qui est déjà dans ton calendrier');
      await expect(report.locator('#reperes-swim')).toContainText('1:40 min/100 m');
      await expect(report.locator('#suivi')).toBeVisible();
      await expect(report.locator('#terrain')).not.toContainText('Capteur témoin');
      await expect(report.locator('#reperes-swim img')).toBeVisible();
    }
    expect(await report.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await report.emulateMedia({media:'print'});
    await report.setViewportSize({width:650,height:920});
    await report.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, img => img.decode()));
    });
    const cover = report.locator('.folio-cover');
    expect((await cover.boundingBox())!.height).toBeLessThan(945); // 250 mm of usable A4 height
    await expect(report.locator('.tfc-print-helper')).toBeHidden();
    await expect(report.locator('#empreinte .print-introduction').first()).toContainText('VO₂max');
    if (browserName === 'chromium') {
      // Allow room for native printer headers and footers, as on a phone.
      await report.addStyleTag({content:'@page { margin:20mm !important }'});
      const pdf = await getDocument({data: new Uint8Array(await report.pdf({
        format:'A4', printBackground:true, preferCSSPageSize:true,
      })), isEvalSupported:false}).promise;
      try {
        const first = await (await pdf.getPage(1)).getTextContent();
        const firstPage = first.items.map(item => 'str' in item ? item.str : '').join(' ');
        for (const fact of await cover.locator('dd').allTextContents()) expect(firstPage).toContain(fact);
        expect(firstPage).toContain('Camille');
        const pages = [];
        for (let i = 2; i <= pdf.numPages; i++) {
          const pageText = await (await pdf.getPage(i)).getTextContent();
          pages.push(pageText.items.map(item => 'str' in item ? item.str : '').join(' '));
        }
        expect(pages.join(' ')).toContain('Enchaînement spécifique');
        expect(pages.join(' ')).toContain(audience === 'coach' ? 'Note réservée au coach' : 'Ce que tu observeras avec ton coach');
      } finally {
        await pdf.destroy();
      }
    }
    await report.close();
  }
});

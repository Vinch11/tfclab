import { expect, test } from '@playwright/test';

test('les deux éditions du dashboard ouvrent le bon contenu sur téléphone et ordinateur', async ({page, context}) => {
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
    await expect(report.locator('#evolution')).toContainText('171 W');
    if (audience === 'coach') {
      await expect(report.locator('#terrain')).toContainText('Capteur témoin');
      await expect(report.locator('#staff-evidence')).toContainText('Note réservée au coach');
      await expect(report.locator('#lecture-coach')).toBeVisible();
    } else {
      await expect(report.locator('main')).not.toContainText('Note réservée au coach');
      await expect(report.locator('#preparation')).toContainText('Le fil du calendrier enregistré');
      await expect(report.locator('#reperes-swim')).toContainText('1:40 min/100 m');
      await expect(report.locator('#suivi')).toBeVisible();
      await expect(report.locator('#terrain')).not.toContainText('Capteur témoin');
      await expect(report.locator('#reperes-swim img')).toBeVisible();
    }
    expect(await report.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await report.close();
  }
});

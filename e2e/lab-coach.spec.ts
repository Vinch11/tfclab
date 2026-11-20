import { expect, test } from "@playwright/test";
test("historical review hides the next result until the coach records an opinion", async ({
  page,
}) => {
  await page.goto("/__e2e/lab-coach");
  await expect(page.getByText("VMA (km/h) · 13")).toBeVisible();
  await expect(page.getByText("Observations du 2026-10-01")).toHaveCount(0);
  await expect(page.getByText(/Repère piste/)).toHaveCount(0);
  await page.getByLabel("Ambition à cette date").selectOption("competitor");
  await page
    .getByLabel("Quel facteur attends-tu de retrouver sur le terrain ?")
    .fill("Tenue de la vitesse aérobie");
  await page.getByRole("button", { name: "Révéler le bilan suivant" }).click();
  await expect(page.getByText("Observations du 2026-10-01")).toBeVisible();
  await expect(page.getByText(/Repère piste.*15 km/)).toBeVisible();
  await expect(
    page.getByText(/Dernier chrono sur cette distance 50:00.*2:00/),
  ).toBeVisible();
  await expect(page.getByText("VMA (km/h) · 15 (précédent 13)")).toBeVisible();
  await expect(
    page.getByText("Classement reconstitué avec les champs du bilan initial"),
  ).toBeVisible();
});

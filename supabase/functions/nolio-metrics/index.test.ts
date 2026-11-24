import { assertEquals } from "jsr:@std/assert@1";
import { convertNolioValue, diffExceeds, latestMetaValue, planNolioSnapshot, restingHrMedian, toNum } from "./index.ts";

// ─── convertNolioValue ───────────────────────────────────────────────────────

Deno.test("convertNolioValue — css format min·100+sec (≥100) → secondes/100m", () => {
  // 117.05 = 1:17.05/100m → 77.05s
  assertEquals(convertNolioValue("css", 117.05), 77.05);
  assertEquals(convertNolioValue("css", 200), 120); // 2:00 → 120s
});

Deno.test("convertNolioValue — css déjà en secondes (<100) → valeur brute arrondie", () => {
  assertEquals(convertNolioValue("css", 96), 96);
  assertEquals(convertNolioValue("css", 95.456), 95.46);
});

Deno.test("convertNolioValue — fc_repos/fc_max arrondis en entier", () => {
  assertEquals(convertNolioValue("fc_repos", 55.6), 56);
  assertEquals(convertNolioValue("fc_max", 184.4), 184);
});

Deno.test("convertNolioValue — autres colonnes → valeur inchangée", () => {
  assertEquals(convertNolioValue("ftp", 280.5), 280.5);
  assertEquals(convertNolioValue("vma", 18), 18);
});

// ─── toNum ───────────────────────────────────────────────────────────────────

Deno.test("toNum — null/undefined/'' → null, numérique sinon", () => {
  assertEquals(toNum(null), null);
  assertEquals(toNum(undefined), null);
  assertEquals(toNum(""), null);
  assertEquals(toNum(42), 42);
  assertEquals(toNum("42.5"), 42.5);
  assertEquals(toNum("abc"), null);
});

// ─── latestMetaValue ─────────────────────────────────────────────────────────

Deno.test("latestMetaValue — première valeur non-null du tableau (déjà trié par Nolio)", () => {
  assertEquals(
    latestMetaValue([
      { id: 1, date: "2026-01-01", hour: "08:00", value: null as unknown as number, source: null },
      { id: 2, date: "2026-01-02", hour: "08:00", value: 72, source: null },
    ]),
    72,
  );
});

Deno.test("latestMetaValue — tableau vide ou tout null → null", () => {
  assertEquals(latestMetaValue([]), null);
});

// ─── diffExceeds ─────────────────────────────────────────────────────────────

Deno.test("diffExceeds — prev null/undefined → toujours true (premier snapshot)", () => {
  assertEquals(diffExceeds(null, 70), true);
  assertEquals(diffExceeds(undefined, 70), true);
});

Deno.test("diffExceeds — prev=0 → true seulement si next!=0 (évite une division par zéro)", () => {
  assertEquals(diffExceeds(0, 0), false);
  assertEquals(diffExceeds(0, 5), true);
});

Deno.test("diffExceeds — variation sous le seuil 0.5% → false", () => {
  assertEquals(diffExceeds(100, 100.4, 0.005), false);
});

Deno.test("diffExceeds — variation au-dessus du seuil 0.5% → true", () => {
  assertEquals(diffExceeds(100, 100.6, 0.005), true);
});

Deno.test("diffExceeds — fonctionne aussi avec un prev négatif (valeur absolue)", () => {
  assertEquals(diffExceeds(-100, -100.4, 0.005), false);
  assertEquals(diffExceeds(-100, -100.6, 0.005), true);
});

// ─── FC repos : médiane 7 jours ─────────────────────────────────────────────

const hr = (date: string, value: number) => ({ id: 0, date, hour: "07:00", value, source: "garmin" });

Deno.test("restingHrMedian — médiane des 7 jours précédant la dernière mesure", () => {
  const out = restingHrMedian([
    hr("2026-11-24", 52), hr("2026-11-23", 60), hr("2026-11-22", 50), hr("2026-11-21", 51),
    hr("2026-11-10", 70), // hors fenêtre
  ]);
  assertEquals(out, { value: 52, date: "2026-11-24", count: 4 });
});

Deno.test("restingHrMedian — valeurs absurdes ignorées, vide → null", () => {
  assertEquals(restingHrMedian([hr("2026-11-24", 0), hr("2026-11-23", 250)]), null);
  assertEquals(restingHrMedian([]), null);
});

// ─── planNolioSnapshot ──────────────────────────────────────────────────────

Deno.test("planNolioSnapshot — complète le snapshot de référence sans écraser ni toucher aux seuils", () => {
  const plan = planNolioSnapshot(
    { fc_repos: 48, fc_max: 190, weight_kg: 61, ftp: 250, vma: 15 },
    { id: "s1", fc_repos: null, fc_max: 185, weight_kg: null, field_sources: { ftp: { source: "cp_test" } } },
    "2026-11-24",
  );
  assertEquals(plan, { kind: "update", id: "s1", payload: { fc_repos: 48, weight_kg: 61 } });
});

Deno.test("planNolioSnapshot — VO₂max de montre rangée à part, jamais dans la colonne vo2max", () => {
  const plan = planNolioSnapshot({ vo2max: 52 }, { id: "s1", field_sources: { ftp: { source: "cp_test" } } }, "2026-11-24");
  if (plan.kind !== "update") throw new Error("update attendu");
  assertEquals("vo2max" in plan.payload, false);
  const fs = plan.payload.field_sources as Record<string, Record<string, unknown>>;
  assertEquals(fs.vo2max_watch.value, 52);
  assertEquals(fs.ftp.source, "cp_test");
});

Deno.test("planNolioSnapshot — rien de neuf → none ; aucun snapshot → création avec FTP marquée montre", () => {
  assertEquals(planNolioSnapshot({ fc_max: 190 }, { id: "s1", fc_max: 185 }, "2026-11-24"), { kind: "none" });
  const plan = planNolioSnapshot({ ftp: 250.4, fc_repos: 50 }, null, "2026-11-24");
  if (plan.kind !== "insert") throw new Error("insert attendu");
  assertEquals(plan.payload.ftp, 250);
  assertEquals((plan.payload.field_sources as Record<string, Record<string, unknown>>).ftp.source, "watch");
});

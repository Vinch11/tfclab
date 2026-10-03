import { assertEquals } from "jsr:@std/assert@1";
import { aggregate, extractDate, nolioSportIdToBucket, pickTss } from "./index.ts";

Deno.test("nolioSportIdToBucket — swim=19, bike=14/18, run=2/52, sinon other", () => {
  assertEquals(nolioSportIdToBucket(19), "swim");
  assertEquals(nolioSportIdToBucket(14), "bike");
  assertEquals(nolioSportIdToBucket(18), "bike");
  assertEquals(nolioSportIdToBucket(2), "run");
  assertEquals(nolioSportIdToBucket(52), "run");
  assertEquals(nolioSportIdToBucket(20), "other");
});

Deno.test("pickTss — priorité load_coggan puis load_foster, sinon null", () => {
  assertEquals(pickTss({ load_coggan: 85, load_foster: 90 }), 85);
  assertEquals(pickTss({ load_coggan: 0, load_foster: 70 }), 70);
  assertEquals(pickTss({}), null);
});

Deno.test("extractDate — cascade date_start > date > date_end", () => {
  assertEquals(extractDate({ date_start: "2026-10-02", date: "2026-01-01", date_end: "2026-02-02" }), "2026-10-02");
  assertEquals(extractDate({ date: "2026-05-01", date_end: "2026-02-02" }), "2026-05-01");
  assertEquals(extractDate({ date_end: "2026-02-02T10:00:00Z" }), "2026-02-02");
  assertEquals(extractDate({}), null);
});

Deno.test("aggregate — somme tss/count par (date,sport) ET par (date,global)", () => {
  const items = [
    { date_start: "2026-03-01", sport_id: 14, load_coggan: 100 }, // bike
    { date_start: "2026-03-01", sport_id: 2, load_coggan: 50 }, // run même jour
    { date_start: "2026-03-02", sport_id: 14, load_coggan: 20 },
  ];
  const agg = aggregate(items);
  assertEquals(agg.get("2026-03-01|bike"), { tss: 100, count: 1 });
  assertEquals(agg.get("2026-03-01|run"), { tss: 50, count: 1 });
  assertEquals(agg.get("2026-03-01|global"), { tss: 150, count: 2 });
  assertEquals(agg.get("2026-03-02|bike"), { tss: 20, count: 1 });
  assertEquals(agg.get("2026-03-02|global"), { tss: 20, count: 1 });
});

Deno.test("aggregate — ignore les items sans date ou sans tss exploitable", () => {
  const items = [
    { sport_id: 14, load_coggan: 100 }, // pas de date
    { date_start: "2026-03-01", sport_id: 14 }, // pas de tss
  ];
  const agg = aggregate(items);
  assertEquals(agg.size, 0);
});

Deno.test("aggregate — tableau vide → Map vide", () => {
  assertEquals(aggregate([]).size, 0);
});

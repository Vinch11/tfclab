import { describe, it, expect } from "vitest";
import {
  AppendOnlyPlanVersionSaver, canonicalJson, derivePlanVersionId, freezePayload, rowMatches,
  type PlanVersionPayload, type PlanVersionRow,
} from "../appendOnlyPlanVersionSave";

const base = (plan: unknown): PlanVersionPayload => ({
  athlete_id: "c155204f-0000-4000-8000-0000000000a1", coach_id: "573e045a-0000-4000-8000-00000000000a",
  plan_json: plan, objective: "Marathon", weeks_count: 1, sessions_count: 1,
  validator_score: null, validator_grade: null, validator_summary: null,
});
const p1 = JSON.parse('{"__proto__":{"dose":1}}');
const p2 = JSON.parse('{"__proto__":{"dose":2}}');

describe("clés JSON spéciales conservées dans l'identité et la comparaison", () => {
  it("__proto__ avec doses différentes ⇒ JSON canonique et identités différents", async () => {
    expect(canonicalJson(p1)).toBe('{"__proto__":{"dose":1}}');
    expect(canonicalJson(p1)).not.toBe(canonicalJson(p2));
    const a = await derivePlanVersionId(freezePayload(base(p1)));
    const b = await derivePlanVersionId(freezePayload(base(p2)));
    expect(a).not.toBe(b);
  });

  it("rowMatches faux quand seule la dose sous __proto__ change", async () => {
    const f = freezePayload(base(p1));
    const id = await derivePlanVersionId(f);
    const exp: PlanVersionRow = { ...f, id };
    const act: PlanVersionRow = { ...freezePayload(base(p2)), id };
    expect(rowMatches(exp, act)).toBe(false);
    expect(rowMatches(exp, { ...f, id })).toBe(true);
  });

  it("transport qui relit un contenu changé sous __proto__ ⇒ BLOCKED", async () => {
    const r = await new AppendOnlyPlanVersionSaver({ transport: {
      insert: async () => ({ error: null }),
      readById: async (id) => ({ data: { ...freezePayload(base(p2)), id }, error: null }),
    } }).save(base(p1));
    expect(r.status).toBe("BLOCKED");
  });

  it("objet à prototype nul et clés constructor/prototype conservés", async () => {
    const nul = Object.assign(Object.create(null), { constructor: 1, prototype: { x: 2 } });
    expect(canonicalJson(nul)).toBe('{"constructor":1,"prototype":{"x":2}}');
    const a = await derivePlanVersionId(freezePayload(base(nul)));
    const b = await derivePlanVersionId(freezePayload(base({ constructor: 1, prototype: { x: 3 } })));
    expect(a).not.toBe(b);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  AppendOnlyPlanVersionSaver,
  type PlanVersionPayload,
  type PlanVersionRow,
  type PlanVersionTransport,
  type TransportError,
  derivePlanVersionId,
  freezePayload,
} from "../appendOnlyPlanVersionSave";

const COACH = "00000000-0000-4000-8000-00000000000a";
const ATHLETE = "00000000-0000-4000-8000-0000000000a1";

const payload = (over: Partial<PlanVersionPayload> = {}): PlanVersionPayload => ({
  athlete_id: ATHLETE,
  coach_id: COACH,
  plan_json: { title: "QA — restauration V4 NON PRESCRIPTIVE", weeks: [{ sessions: [{ durationMin: 45 }] }], _secret: "SENSITIVE_PLAN_TEXT" },
  objective: "70.3",
  weeks_count: 1,
  sessions_count: 1,
  validator_score: 85,
  validator_grade: "B",
  validator_summary: { overallComment: "ok" },
  ...over,
});

/** Faux serveur en mémoire. `commit` = la ligne est-elle écrite ? */
function fakeServer(opts: {
  insert?: (row: PlanVersionRow, db: Map<string, PlanVersionRow>) => Promise<{ error: TransportError | null }>;
  read?: (id: string, db: Map<string, PlanVersionRow>) => Promise<{ data: PlanVersionRow | null; error: TransportError | null }>;
} = {}) {
  const db = new Map<string, PlanVersionRow>();
  const insert = vi.fn(opts.insert ?? (async (row: PlanVersionRow, d: Map<string, PlanVersionRow>) => {
    if (d.has(row.id)) return { error: { code: "23505", message: "duplicate" } };
    d.set(row.id, JSON.parse(JSON.stringify(row)));
    return { error: null };
  }));
  const read = vi.fn(opts.read ?? (async (id: string, d: Map<string, PlanVersionRow>) => ({ data: d.get(id) ?? null, error: null })));
  const transport: PlanVersionTransport = {
    insert: (row) => insert(row, db),
    readById: (id) => read(id, db),
  };
  return { db, insert, read, transport };
}


describe("AppendOnlyPlanVersionSaver", () => {
  it("insertion + read-back identique => CONFIRMED, 1 ligne", async () => {
    const s = fakeServer();
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("CONFIRMED");
    expect(s.db.size).toBe(1);
  });

  it("serveur écrit mais ACK perdu, read-back confirme => CONFIRMED", async () => {
    const s = fakeServer({ insert: async (row, db) => { db.set(row.id, JSON.parse(JSON.stringify(row))); throw new TypeError("Failed to fetch"); } });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("CONFIRMED");
    expect(r.reason).toBe("readback_match_after_lost");
  });

  it("écrit, ACK perdu, read-back indisponible => UNKNOWN (jamais FAILED)", async () => {
    const s = fakeServer({
      insert: async (row, db) => { db.set(row.id, row); throw new TypeError("Failed to fetch"); },
      read: async () => { throw new TypeError("Failed to fetch"); },
    });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("UNKNOWN");
  });

  it("timeout insert et read-back => UNKNOWN", async () => {
    const never = () => new Promise<never>(() => {});
    const s = fakeServer({ insert: never, read: never });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport, timeoutMs: 5 }).save(payload());
    expect(r.status).toBe("UNKNOWN");
  });

  it("relance après UNKNOWN : même id, ligne relue identique => CONFIRMED sans 2e insert, toujours 1 ligne", async () => {
    let reads = 0;
    const s = fakeServer({
      insert: async (row, db) => {
        if (db.has(row.id)) return { error: { code: "23505" } };
        db.set(row.id, JSON.parse(JSON.stringify(row)));
        throw new TypeError("lost");
      },
      // 1re tentative : pré-lecture ET relecture perdues ; ensuite le réseau revient.
      read: async (id, db) => {
        if (++reads <= 2) throw new TypeError("lost");
        return { data: db.get(id) ?? null, error: null };
      },
    });
    const saver = new AppendOnlyPlanVersionSaver({ transport: s.transport });
    const r1 = await saver.save(payload());
    expect(r1.status).toBe("UNKNOWN");
    const r2 = await saver.save(payload());
    expect(r2.status).toBe("CONFIRMED");
    expect(r2.attemptId).toBe(r1.attemptId);
    expect(s.insert).toHaveBeenCalledTimes(1);
    expect(s.db.size).toBe(1);
  });

  it("relance après UNKNOWN avec ligne absente à la pré-lecture : même id, 23505 + relecture identique => CONFIRMED", async () => {
    let hidden = true;
    const s = fakeServer({
      read: async (id, db) => {
        if (hidden) { hidden = false; return { data: null, error: null }; } // réplica en retard
        return { data: db.get(id) ?? null, error: null };
      },
    });
    const first = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    const id = first.attemptId!;
    expect(first.status).toBe("CONFIRMED");
    hidden = true;
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.attemptId).toBe(id);
    expect(r.status).toBe("CONFIRMED");
    expect(r.reason).toBe("readback_match_after_duplicate");
    expect(s.insert.mock.calls[1][0].id).toBe(id);
    expect(s.db.size).toBe(1);
  });

  it("23505 avec plan différent sous le même id => BLOCKED, aucune écriture", async () => {
    const s = fakeServer();
    const saver = new AppendOnlyPlanVersionSaver({ transport: s.transport });
    const id = await derivePlanVersionId(freezePayload(payload()));
    s.db.set(id, { ...payload({ plan_json: { title: "autre" } }), id });
    const r = await saver.save(payload());
    expect(r.status).toBe("BLOCKED");
    expect(s.insert).not.toHaveBeenCalled();
    expect((s.db.get(id)!.plan_json as { title: string }).title).toBe("autre");
  });

  it("23505 avec athlète différent => BLOCKED", async () => {
    const s = fakeServer();
    const id = await derivePlanVersionId(freezePayload(payload()));
    s.db.set(id, { ...payload({ athlete_id: "other-athlete" }), id });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("BLOCKED");
  });

  it("23505 mais ligne invisible => BLOCKED", async () => {
    const s = fakeServer({ insert: async () => ({ error: { code: "23505" } }) });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("BLOCKED");
  });

  it("panne avant commit (rejet serveur, absence relue) => FAILED, pas de faux succès", async () => {
    const s = fakeServer({ insert: async () => ({ error: { code: "23502", message: "null value" } }) });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("FAILED");
    expect(s.db.size).toBe(0);
  });

  it("réseau coupé avant commit, absence relue => UNKNOWN (pas de succès)", async () => {
    const s = fakeServer({ insert: async () => { throw new TypeError("Failed to fetch"); } });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("UNKNOWN");
    expect(r.status).not.toBe("CONFIRMED");
  });

  it("droits insuffisants (42501 RLS) => FAILED", async () => {
    const s = fakeServer({ insert: async () => ({ error: { code: "42501" } }) });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("FAILED");
    expect(r.reason).toBe("auth_refused_42501");
  });

  it("droits insuffisants + lecture refusée => FAILED", async () => {
    const s = fakeServer({ insert: async () => ({ error: { status: 401 } }), read: async () => ({ data: null, error: { status: 401 } }) });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(r.status).toBe("FAILED");
  });

  it("double clic pendant pending => IN_PROGRESS, 1 seul insert", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const s = fakeServer({ insert: async (row, db) => { await gate; db.set(row.id, row); return { error: null }; } });
    const saver = new AppendOnlyPlanVersionSaver({ transport: s.transport });
    const p1 = saver.save(payload());
    const r2 = await saver.save(payload());
    expect(r2.status).toBe("IN_PROGRESS");
    release();
    expect((await p1).status).toBe("CONFIRMED");
    expect(s.insert).toHaveBeenCalledTimes(1);
  });

  it("re-clic après CONFIRMED sur le même plan => aucun nouvel insert", async () => {
    const s = fakeServer();
    const saver = new AppendOnlyPlanVersionSaver({ transport: s.transport });
    await saver.save(payload());
    const r = await saver.save(payload());
    expect(r.status).toBe("CONFIRMED");
    expect(s.insert).toHaveBeenCalledTimes(1);
    expect(s.db.size).toBe(1);
  });

  it("plan changé => nouvelle identité, l'ancienne version est conservée", async () => {
    const s = fakeServer();
    const saver = new AppendOnlyPlanVersionSaver({ transport: s.transport });
    const a = await saver.save(payload());
    const b = await saver.save(payload({ plan_json: { title: "plan modifié" } }));
    expect(b.attemptId).not.toBe(a.attemptId);
    expect(s.db.size).toBe(2);
  });

  it("ordre des clés JSON (jsonb) n'empêche pas la confirmation", async () => {
    const s = fakeServer({ read: async (id, db) => {
      const r = db.get(id)!; return { data: { ...r, plan_json: JSON.parse(JSON.stringify(r.plan_json, Object.keys(r.plan_json as object).reverse())) }, error: null };
    } });
    // relit avec clés racine réordonnées
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload({ plan_json: { b: 1, a: 2 } }));
    expect(r.status).toBe("CONFIRMED");
  });

  it("aucun contenu sensible du plan dans le résultat ni dans la console", async () => {
    const spies = (["log", "warn", "error", "info", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const s = fakeServer({ insert: async () => ({ error: { code: "42501" } }) });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(JSON.stringify(r)).not.toContain("SENSITIVE_PLAN_TEXT");
    for (const sp of spies) { expect(sp).not.toHaveBeenCalled(); sp.mockRestore(); }
  });

  it("n'utilise que insert + readById (aucun update/upsert/delete)", async () => {
    const s = fakeServer();
    await new AppendOnlyPlanVersionSaver({ transport: s.transport }).save(payload());
    expect(Object.keys(s.transport).sort()).toEqual(["insert", "readById"]);
  });
});

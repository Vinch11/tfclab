import { describe, it, expect, vi } from "vitest";
import {
  AppendOnlyPlanVersionSaver,
  IDENTITY_DOMAIN,
  LEGACY_ATTEMPT_STORAGE_KEY,
  UUID_V8_RE,
  canonicalJson,
  derivePlanVersionId,
  freezePayload,
  sha256Hex,
  uuidV8FromSha256Hex,
  type PlanVersionPayload,
  type PlanVersionRow,
  type PlanVersionTransport,
  type TransportError,
} from "../appendOnlyPlanVersionSave";

const COACH_A = "573e045a-0000-4000-8000-00000000000a";
const COACH_B = "6b4c1722-0000-4000-8000-00000000000b";
const ATH_A = "c155204f-0000-4000-8000-0000000000a1";
const ATH_B = "9758ace0-0000-4000-8000-0000000000b1";

const payload = (over: Partial<PlanVersionPayload> = {}): PlanVersionPayload => ({
  athlete_id: ATH_A,
  coach_id: COACH_A,
  plan_json: { title: "QA — restauration V4 NON PRESCRIPTIVE", _qaFixture: true, _qaNonPrescriptive: true, weeks: [{ sessions: [{ durationMin: 45 }] }] },
  objective: "70.3",
  weeks_count: 1,
  sessions_count: 1,
  validator_score: null,
  validator_grade: null,
  validator_summary: null,
  ...over,
});

/** Une seule « base » partagée par tous les onglets / instances (PK = id). */
function sharedDb() {
  const db = new Map<string, PlanVersionRow>();
  const inserts: PlanVersionRow[] = [];
  const mk = (opts: {
    insert?: (row: PlanVersionRow) => Promise<{ error: TransportError | null }>;
    read?: (id: string) => Promise<{ data: PlanVersionRow | null; error: TransportError | null }>;
  } = {}): PlanVersionTransport => ({
    insert: opts.insert ?? (async (row) => {
      inserts.push(row);
      if (db.has(row.id)) return { error: { code: "23505" } };
      db.set(row.id, JSON.parse(JSON.stringify(row)));
      return { error: null };
    }),
    readById: opts.read ?? (async (id) => ({ data: db.get(id) ?? null, error: null })),
  });
  return { db, inserts, mk };
}

describe("identité d'écriture durable (contenu + coach + athlète)", () => {
  it("UUID v8 correctement typé, dérivé du SHA-256 domaine + JSON canonique complet", async () => {
    const frozen = freezePayload(payload());
    const id = await derivePlanVersionId(frozen);
    expect(id).toMatch(UUID_V8_RE);
    const expected = uuidV8FromSha256Hex(await sha256Hex(`${IDENTITY_DOMAIN}\n${canonicalJson(frozen)}`));
    expect(id).toBe(expected);
  });

  it("deux onglets / deux instances sans aucun stockage, même payload ⇒ une seule ligne, même id", async () => {
    const s = sharedDb();
    const r1 = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    const r2 = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    expect(r1.status).toBe("CONFIRMED");
    expect(r2.status).toBe("CONFIRMED");
    expect(r2.attemptId).toBe(r1.attemptId);
    expect(s.db.size).toBe(1);
  });

  it("fermeture / réouverture et +24 h (horloge avancée) ⇒ toujours le même id, une ligne", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const s = sharedDb();
      vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
      const r1 = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
      vi.setSystemTime(new Date("2026-11-04T10:00:01Z")); // > 48 h plus tard
      const r2 = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
      expect(r2.attemptId).toBe(r1.attemptId);
      expect(r2.status).toBe("CONFIRMED");
      expect(s.db.size).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deux savers concurrents, même payload ⇒ une seule ligne, les deux CONFIRMED", async () => {
    const s = sharedDb();
    const [a, b] = await Promise.all([
      new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload()),
      new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload()),
    ]);
    expect(a.attemptId).toBe(b.attemptId);
    expect([a.status, b.status]).toEqual(["CONFIRMED", "CONFIRMED"]);
    expect(s.db.size).toBe(1);
  });

  it("ACK perdu après commit, read-back indisponible ⇒ UNKNOWN ; nouvel onglet ⇒ même id, CONFIRMED, 1 ligne", async () => {
    const s = sharedDb();
    const lossy = s.mk({
      insert: async (row) => { s.db.set(row.id, JSON.parse(JSON.stringify(row))); throw new TypeError("Failed to fetch"); },
      read: async () => { throw new TypeError("Failed to fetch"); },
    });
    const r1 = await new AppendOnlyPlanVersionSaver({ transport: lossy }).save(payload());
    expect(r1.status).toBe("UNKNOWN");
    const r2 = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    expect(r2.attemptId).toBe(r1.attemptId);
    expect(r2.status).toBe("CONFIRMED");
    expect(r2.reason).toBe("already_present_identical");
    expect(s.db.size).toBe(1);
  });

  it("contenu, coach ou athlète différent ⇒ identités distinctes", async () => {
    const id = async (p: PlanVersionPayload) => derivePlanVersionId(freezePayload(p));
    const base = await id(payload());
    const ids = await Promise.all([
      id(payload({ plan_json: { title: "autre" } })),
      id(payload({ coach_id: COACH_B })),
      id(payload({ athlete_id: ATH_B })),
      id(payload({ objective: "Marathon" })),
      id(payload({ validator_score: 80 })),
    ]);
    expect(new Set([base, ...ids]).size).toBe(6);
  });

  it("ordre des clés ou clé undefined n'altère pas l'identité", async () => {
    const a = await derivePlanVersionId(freezePayload(payload({ plan_json: { a: 1, b: 2 } })));
    const b = await derivePlanVersionId(freezePayload(payload({ plan_json: { b: 2, a: 1, c: undefined } })));
    expect(a).toBe(b);
  });

  it("collision simulée (ligne divergente sous l'id calculé) ⇒ BLOCKED, aucun insert, ligne intacte", async () => {
    const s = sharedDb();
    const id = await derivePlanVersionId(freezePayload(payload()));
    s.db.set(id, { ...payload({ plan_json: { title: "collision" } }), id });
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    expect(r.status).toBe("BLOCKED");
    expect(s.inserts).toHaveLength(0);
    expect((s.db.get(id)!.plan_json as { title: string }).title).toBe("collision");
  });

  it("métadonnée divergente relue après insert ⇒ BLOCKED (jamais CONFIRMED)", async () => {
    const s = sharedDb();
    let reads = 0;
    const t = s.mk({ read: async (id) => {
      reads++;
      const row = s.db.get(id);
      return { data: row ? { ...row, weeks_count: 99 } : null, error: null };
    } });
    const r = await new AppendOnlyPlanVersionSaver({ transport: t }).save(payload());
    expect(reads).toBe(2);
    expect(r.status).toBe("BLOCKED");
  });

  it("crypto indisponible ⇒ NOT_SENT, aucune requête", async () => {
    const s = sharedDb();
    const read = vi.fn();
    const r = await new AppendOnlyPlanVersionSaver({
      transport: { insert: vi.fn(), readById: read } as unknown as PlanVersionTransport,
      hash: async () => { throw new Error("crypto_unavailable"); },
    }).save(payload());
    expect(r.status).toBe("NOT_SENT");
    expect(read).not.toHaveBeenCalled();
    expect(s.db.size).toBe(0);
  });

  it("sessionStorage indisponible : sans effet sur l'identité, jamais lu ni écrit", async () => {
    const boom = () => { throw new Error("SecurityError"); };
    const fakeStorage = { getItem: vi.fn(boom), setItem: vi.fn(boom), removeItem: vi.fn(boom) };
    vi.stubGlobal("sessionStorage", fakeStorage);
    vi.stubGlobal("localStorage", fakeStorage);
    try {
      const s = sharedDb();
      const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
      expect(r.status).toBe("CONFIRMED");
      expect(fakeStorage.getItem).not.toHaveBeenCalled();
      expect(fakeStorage.setItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("ancienne tentative à UUID aléatoire : ignorée, aucun faux claim de migration", async () => {
    const s = sharedDb();
    const legacyId = "11111111-1111-4111-8111-000000000001";
    s.db.set(legacyId, { ...freezePayload(payload()), id: legacyId });
    const legacyStore = new Map([[LEGACY_ATTEMPT_STORAGE_KEY, JSON.stringify([{ id: legacyId }])]]);
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    expect(r.attemptId).not.toBe(legacyId);
    expect(r.attemptId).toMatch(UUID_V8_RE);
    expect(r.legacyScope).toBe("not_reconciled");
    expect(r.identity).toBe("content-sha256-v1");
    expect(r.reason).not.toMatch(/legacy|migr/i);
    // La ligne historique reste là, non modifiée ; la nouvelle est distincte.
    expect(s.db.size).toBe(2);
    expect(legacyStore.size).toBe(1);
  });

  it.each([
    ["NaN", { x: Number.NaN }, "non_finite_number"],
    ["Infinity", { x: Number.POSITIVE_INFINITY }, "non_finite_number"],
    ["fonction", { f: () => 1 }, "illegal_function"],
    ["BigInt", { b: BigInt(1) }, "illegal_bigint"],
    ["Date", { d: new Date(0) }, "non_plain_object"],
    ["undefined dans tableau", { a: [1, undefined] }, "undefined_in_array"],
  ])("payload illégal (%s) refusé avant tout envoi", async (_n, plan, code) => {
    const insert = vi.fn();
    const read = vi.fn();
    const r = await new AppendOnlyPlanVersionSaver({ transport: { insert, readById: read } as unknown as PlanVersionTransport })
      .save(payload({ plan_json: plan }));
    expect(r.status).toBe("NOT_SENT");
    expect(r.reason).toBe(`illegal_payload_${code}`);
    expect(insert).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("payload cyclique refusé avant envoi", async () => {
    const plan: Record<string, unknown> = {};
    plan.self = plan;
    const insert = vi.fn();
    const r = await new AppendOnlyPlanVersionSaver({ transport: { insert, readById: vi.fn() } as unknown as PlanVersionTransport })
      .save(payload({ plan_json: plan }));
    expect(r.reason).toBe("illegal_payload_cyclic");
    expect(insert).not.toHaveBeenCalled();
  });

  it("propriété `id` inattendue dans le payload : refusée, n'écrase jamais l'id calculé", async () => {
    const s = sharedDb();
    const bad = { ...payload(), id: "99999999-9999-4999-8999-999999999999" } as unknown as PlanVersionPayload;
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(bad);
    expect(r.status).toBe("NOT_SENT");
    expect(r.reason).toBe("illegal_payload_payload_has_id");
    expect(s.inserts).toHaveLength(0);
  });

  it("clé non prévue refusée (pas d'injection de colonne)", async () => {
    const s = sharedDb();
    const bad = { ...payload(), created_at: "2020-01-01" } as unknown as PlanVersionPayload;
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(bad);
    expect(r.reason).toBe("illegal_payload_unexpected_key");
    expect(s.inserts).toHaveLength(0);
  });

  it("l'id inséré est toujours l'id calculé", async () => {
    const s = sharedDb();
    const r = await new AppendOnlyPlanVersionSaver({ transport: s.mk() }).save(payload());
    expect(s.inserts[0].id).toBe(r.attemptId);
    expect(s.inserts[0].id).toBe(await derivePlanVersionId(freezePayload(payload())));
  });
});

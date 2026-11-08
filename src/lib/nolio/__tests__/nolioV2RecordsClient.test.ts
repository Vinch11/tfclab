/**
 * Client V2 records : validations d'entrée et de forme de réponse, fetch injecté/mocké.
 * Aucun réseau réel.
 */
import { describe, it, expect, vi } from "vitest";
import { fetchNolioV2Records } from "../../../../supabase/functions/_shared/nolioV2/recordsClient";

const okResponse = (body: unknown) => ({ status: 200, text: async () => JSON.stringify(body) });

describe("fetchNolioV2Records — validations", () => {
  it("refuse une référence athlète qui n'est pas au format usr_...", async () => {
    const client = fetchNolioV2Records({ fetch: vi.fn(), accessToken: "nolio_sk_x" });
    const r = await client.list({ athlete: "123", cat: "ppr", recordType: "time", from: "2026-01-01", to: "2026-02-01" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.detail).toBe("athlete_ref_invalid");
  });

  it("refuse une plage de dates inversée", async () => {
    const client = fetchNolioV2Records({ fetch: vi.fn(), accessToken: "nolio_sk_x" });
    const r = await client.list({ athlete: "usr_abc", cat: "ppr", recordType: "time", from: "2026-02-01", to: "2026-01-01" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.detail).toBe("date_range_invalid");
  });

  it("accepte une réponse conforme et renvoie les données typées", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({
      data: [{ value: 950, unit: "W", date: "2026-10-15", cat: "ppr", record_type: "time", inner_val: 5, sport_name: "Vélo" }],
      has_more: false, windows: {},
    }));
    const client = fetchNolioV2Records({ fetch: fetchMock, accessToken: "nolio_sk_x" });
    const r = await client.list({ athlete: "usr_abc", cat: "ppr", recordType: "time", from: "2026-01-01", to: "2026-02-01" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.page.data).toHaveLength(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://www.nolio.io/api/v2/metrics/records/");
    expect(calledUrl).toContain("athlete=usr_abc");
  });

  it("refuse une réponse dont la forme s'écarte du contrat, jamais une liste vide inventée", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ records: [] })); // pas la forme {data, has_more}
    const client = fetchNolioV2Records({ fetch: fetchMock, accessToken: "nolio_sk_x" });
    const r = await client.list({ athlete: "usr_abc", cat: "ppr", recordType: "time", from: "2026-01-01", to: "2026-02-01" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.detail).toBe("list_shape_invalid");
  });

  it("refuse un statut HTTP non-200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 429, text: async () => "" });
    const client = fetchNolioV2Records({ fetch: fetchMock, accessToken: "nolio_sk_x" });
    const r = await client.list({ athlete: "usr_abc", cat: "ppr", recordType: "time", from: "2026-01-01", to: "2026-02-01" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.detail).toBe("http_429");
  });
});

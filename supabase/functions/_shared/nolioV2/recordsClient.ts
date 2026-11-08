/**
 * Nolio V2 — lecture SEULE de `GET /api/v2/metrics/records/`, `fetch` injecté
 * (testable hors réseau, même style que httpFetch.ts).
 * Contrat : docs/nolio-v2/NOLIO_V1_V2_MIGRATION_MATRIX.md §6.4 et le guide
 * officiel de migration Nolio v1→v2 §8.3 — endpoint catalogue/fenêtres top N,
 * jamais une pagination ordinaire (`has_more` toujours présent mais sans
 * curseur de ligne). Plafond documenté 20 req/min, découverte comprise.
 * Aucune écriture ; jamais de requête hors `https://www.nolio.io`.
 */
import { NOLIO_V2_ORIGIN, type FetchLike } from "./httpFetch.ts";

export const RECORDS_PATH = "/api/v2/metrics/records/";

export type RecordsCategory = "ppr" | "par" | "phrr";
export type RecordsAxisType = "time" | "distance";

export type RawMetricsRecord = {
  value: number; unit: string; date: string; cat: string; record_type: string;
  inner_val: number; source?: string | null; training_id?: string | null;
  training_name?: string | null; sport_id?: string; sport_name?: string;
};
export type RecordsPage = { data: RawMetricsRecord[]; has_more: boolean; windows: unknown };
export type RecordsResult = { ok: true; page: RecordsPage } | { ok: false; detail: string };

const ATHLETE = /^usr_[A-Za-z0-9]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATS = new Set<RecordsCategory>(["ppr", "par", "phrr"]);
const AXES = new Set<RecordsAxisType>(["time", "distance"]);
/** Toutes les combinaisons interrogées pour un "remplissage" complet. Fixe le
 * budget d'appels (6, bien sous les 20/min) : jamais de boucle par fenêtre. */
export const RECORDS_QUERY_PLAN: Array<{ cat: RecordsCategory; recordType: RecordsAxisType }> = [
  { cat: "ppr", recordType: "time" },
  { cat: "par", recordType: "time" },
  { cat: "par", recordType: "distance" },
  { cat: "phrr", recordType: "time" },
];

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function isRawRecord(x: unknown): x is RawMetricsRecord {
  if (!isObj(x)) return false;
  return typeof x.value === "number" && Number.isFinite(x.value)
    && typeof x.unit === "string" && x.unit.length > 0 && x.unit.length <= 16
    && typeof x.date === "string" && DATE.test(x.date)
    && typeof x.cat === "string" && typeof x.record_type === "string"
    && typeof x.inner_val === "number" && Number.isFinite(x.inner_val);
}

export function fetchNolioV2Records(opts: { fetch: FetchLike; accessToken: string; timeoutMs?: number }) {
  if (!opts.accessToken) throw new Error("access_token_absent");
  const timeoutMs = opts.timeoutMs ?? 15000;
  const auth = { Authorization: `Bearer ${opts.accessToken}`, Accept: "application/json" };
  return {
    async list(params: { athlete: string; cat: RecordsCategory; recordType: RecordsAxisType; from: string; to: string; sports?: string[]; top?: number }): Promise<RecordsResult> {
      if (!ATHLETE.test(params.athlete)) return { ok: false, detail: "athlete_ref_invalid" };
      if (!CATS.has(params.cat)) return { ok: false, detail: "cat_invalid" };
      if (!AXES.has(params.recordType)) return { ok: false, detail: "record_type_invalid" };
      if (!DATE.test(params.from) || !DATE.test(params.to) || params.from > params.to) return { ok: false, detail: "date_range_invalid" };
      if (params.top !== undefined && (!Number.isInteger(params.top) || params.top < 1 || params.top > 10)) return { ok: false, detail: "top_invalid" };
      const q = new URLSearchParams({ athlete: params.athlete, cat: params.cat, record_type: params.recordType, from: params.from, to: params.to });
      if (params.sports?.length) q.set("sports", params.sports.join(","));
      if (params.top !== undefined) q.set("top", String(params.top));
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      let resp: { status: number; text(): Promise<string> };
      try {
        resp = await opts.fetch(`${NOLIO_V2_ORIGIN}${RECORDS_PATH}?${q.toString()}`, { method: "GET", redirect: "error", signal: ctl.signal, headers: { ...auth } });
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, detail: (e as Error)?.name === "AbortError" ? "timeout" : "network_error" };
      }
      clearTimeout(timer);
      if (resp.status !== 200) return { ok: false, detail: `http_${resp.status}` };
      let text: string;
      try { text = await resp.text(); } catch { return { ok: false, detail: "body_unreadable" }; }
      let json: unknown;
      try { json = JSON.parse(text); } catch { return { ok: false, detail: "json_invalid" }; }
      if (!isObj(json) || !Array.isArray(json.data) || typeof json.has_more !== "boolean") return { ok: false, detail: "list_shape_invalid" };
      for (const it of json.data) if (!isRawRecord(it)) return { ok: false, detail: "record_shape_invalid" };
      return { ok: true, page: { data: json.data as RawMetricsRecord[], has_more: json.has_more, windows: json.windows ?? null } };
    },
  };
}

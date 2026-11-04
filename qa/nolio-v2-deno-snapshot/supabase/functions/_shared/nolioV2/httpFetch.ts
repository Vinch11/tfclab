/**
 * Transport HTTP Nolio V2 réel, `fetch` INJECTÉ (testable hors réseau).
 * Contrat : docs/qa/nolio-v2/planning-contract-2026-11-02.json (créations)
 * et read-contract-2026-11-02.json (lectures, OpenAPI officiel bc43cbcd…1965).
 * - Hôte autorisé unique (https://www.nolio.io), routes planned V2 avec slash
 *   final, redirections refusées (`redirect: "error"`).
 * - POST : timeout / erreur réseau / corps illisible ⇒ { kind: "lost" } (la
 *   requête a PU être traitée ; l'expéditeur ne renvoie jamais seul). Aucun
 *   paramètre `athlete` en query sur un POST (400 selon le contrat).
 * - GET liste : athlete, date_from/date_to (inclusifs), limit ≤ 100,
 *   starting_after ; réponse { data, has_more }. GET détail : collection +
 *   encodeURIComponent(id) + "/", query athlete ; objet direct. Jamais de
 *   `recurrence_action` (sens distinct : portée d'une écriture récurrente).
 * - Toute lecture non 200, JSON invalide, forme hors contrat, redirection,
 *   timeout ⇒ { ok:false } (lecture INCONNUE), jamais une liste vide inventée.
 * Le jeton n'est jamais journalisé ni retourné.
 */
import type { HttpResult, ListPage, NolioV2Http } from "./plannedClient.ts";
import { NOLIO_V2_CONTRACT } from "./plannedMapper.ts";

export const NOLIO_V2_ORIGIN = "https://www.nolio.io";
const COLLECTIONS = new Set<string>([NOLIO_V2_CONTRACT.trainingsPath, NOLIO_V2_CONTRACT.competitionsPath]);
/** Préfixe d'id opaque par collection (une ressource de l'autre type n'est jamais adressable). */
export const ID_PREFIX: Record<string, RegExp> = {
  [NOLIO_V2_CONTRACT.trainingsPath]: /^ptrn_[A-Za-z0-9]+$/,
  [NOLIO_V2_CONTRACT.competitionsPath]: /^pcmp_[A-Za-z0-9]+$/,
};
export const LIST_LIMIT = 100;
const ATHLETE = /^usr_[A-Za-z0-9]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal; redirect?: "manual" | "error" }) => Promise<{ status: number; text(): Promise<string> }>;

type ReadResult = { ok: true; json: unknown } | { ok: false; detail: string };
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function fetchNolioV2Http(opts: { fetch: FetchLike; accessToken: string; timeoutMs?: number; deadline?:number }): NolioV2Http {
  if (!opts.accessToken) throw new Error("access_token_absent");
  const timeoutMs = opts.timeoutMs ?? 15000;
  const remaining=()=>Math.max(0,Math.min(timeoutMs,(opts.deadline??Infinity)-Date.now()));
  async function bounded<T>(work:Promise<T>,ctl:AbortController):Promise<T>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{ctl.abort();reject(new DOMException("timeout","AbortError"));},remaining());})]);}finally{if(timer)clearTimeout(timer);}
  }
  const auth = { Authorization: `Bearer ${opts.accessToken}`, Accept: "application/json" };

  async function get(path: string, query: URLSearchParams): Promise<ReadResult> {
    if(remaining()<=0)return {ok:false,detail:"timeout"};
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), remaining());
    try {
      const r = await bounded(opts.fetch(`${NOLIO_V2_ORIGIN}${path}?${query.toString()}`, { method: "GET", redirect: "error", signal: ctl.signal, headers: { ...auth } }),ctl);
      if (r.status !== 200) return { ok: false, detail: `http_${r.status}` };
      let text: string;
      try { text = await bounded(r.text(),ctl); } catch { return { ok: false, detail: "body_unreadable" }; }
      try { return { ok: true, json: JSON.parse(text) }; } catch { return { ok: false, detail: "json_invalid" }; }
    } catch (e) {
      return { ok: false, detail: (e as Error)?.name === "AbortError" ? "timeout" : "network_error" };
    } finally { clearTimeout(timer); }
  }

  return {
    async post(path, body): Promise<HttpResult> {
      if (!COLLECTIONS.has(path)) return { kind: "response", status: 0, json: { error: "path_not_allowed" } };
      if (body && typeof body === "object" && "dry_run" in (body as object)) return { kind: "response", status: 0, json: { error: "dry_run_not_enabled_in_qa" } };
      if(remaining()<=0)return {kind:"lost",detail:"timeout"};
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), remaining());
      try {
        const r = await bounded(opts.fetch(`${NOLIO_V2_ORIGIN}${path}`, {
          method: "POST", redirect: "error", signal: ctl.signal,
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),ctl);
        let text: string;
        try { text = await bounded(r.text(),ctl); } catch { return { kind: "lost", detail: "body_unreadable" }; }
        let json: unknown = null;
        if (text) { try { json = JSON.parse(text); } catch { if (r.status >= 200 && r.status < 300) return { kind: "lost", detail: "2xx_body_not_json" }; } }
        return { kind: "response", status: r.status, json };
      } catch (e) {
        return { kind: "lost", detail: (e as Error)?.name === "AbortError" ? "timeout" : "network_error" };
      } finally { clearTimeout(timer); }
    },

    async listPage(path, athleteRef, date, startingAfter): Promise<ListPage> {
      if (!COLLECTIONS.has(path)) return { ok: false, detail: "path_not_allowed" };
      if (!ATHLETE.test(athleteRef)) return { ok: false, detail: "athlete_ref_invalid" };
      if (!DATE.test(date)) return { ok: false, detail: "date_invalid" };
      if (startingAfter !== null && !ID_PREFIX[path].test(startingAfter)) return { ok: false, detail: "cursor_invalid" };
      const q = new URLSearchParams({ athlete: athleteRef, date_from: date, date_to: date, limit: String(LIST_LIMIT) });
      if (startingAfter) q.set("starting_after", startingAfter);
      const r = await get(path, q);
      if (!r.ok) return { ok: false as const, detail: (r as { detail: string }).detail };
      const j = r.json;
      if (!isObj(j) || !Array.isArray(j.data) || typeof j.has_more !== "boolean") return { ok: false, detail: "list_shape_invalid" };
      if (j.data.length > LIST_LIMIT) return { ok: false, detail: "list_over_limit" };
      for (const it of j.data) if (!isObj(it) || typeof it.id !== "string" || !ID_PREFIX[path].test(it.id)) return { ok: false, detail: "list_item_invalid" };
      return { ok: true, items: j.data as Array<Record<string, unknown>>, hasMore: j.has_more };
    },

    async getDetail(path, id, athleteRef) {
      if (!COLLECTIONS.has(path)) return { ok: false as const, detail: "path_not_allowed" };
      if (typeof id !== "string" || !ID_PREFIX[path].test(id)) return { ok: false as const, detail: "id_invalid_for_collection" };
      if (!ATHLETE.test(athleteRef)) return { ok: false as const, detail: "athlete_ref_invalid" };
      const r = await get(`${path}${encodeURIComponent(id)}/`, new URLSearchParams({ athlete: athleteRef }));
      if (!r.ok) return { ok: false as const, detail: (r as { detail: string }).detail };
      if (!isObj(r.json) || typeof r.json.id !== "string") return { ok: false as const, detail: "detail_shape_invalid" };
      return { ok: true as const, item: r.json };
    },
  };
}

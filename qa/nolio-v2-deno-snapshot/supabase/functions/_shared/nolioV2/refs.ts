/**
 * Références Nolio V2 (QA) — lecture des sports de l'athlète et des exercices,
 * validation de l'association coach. Logique PURE, `fetch` injecté.
 *
 * Contrat : OpenAPI public courant (SHA-256 75e3850e…f9238, relevé 2026-11-03) :
 * - GET /api/v2/settings/sports/?athlete=usr_…  (SettingsSportUserList
 *   {data,has_more} ; item id spu_…, sport spt_…, name, is_active,
 *   is_structured_workout_enabled ; scope planned:read accepté ; 403 si athlète
 *   non géré / API fermée). C'est `sport` (spt_…) qui est cité sur une écriture.
 *   Guide §8 : « le sport doit être l'un des sports de l'athlète qui supporte les
 *   séances structurées » ⇒ seuls is_active && is_structured_workout_enabled sont
 *   associables.
 * - GET /api/v2/library/exercises/  (LibraryExerciseList ; id exf_… ; scope
 *   library:read). « never invent an id » : aucun rapprochement par nom.
 * Keyset : limit ≤ 100 + starting_after (id du dernier objet) + has_more.
 * Toute lecture non 200 / hors schéma / pagination incomplète ⇒ INCONNU, jamais
 * une liste vide inventée. Aucune valeur de jeton ni réponse brute retournée.
 */
import type { FetchLike } from "./httpFetch.ts";
import { canonicalJson } from "./plannedMapper.ts";

export const NOLIO_ORIGIN = "https://www.nolio.io";
export const SPORTS_PATH = "/api/v2/settings/sports/";
export const EXERCISES_PATH = "/api/v2/library/exercises/";
export const MAX_SPORT_PAGES = 10;
export const MAX_EXERCISE_PAGES = 20;
export const REFS_MAX_AGE_MS = 60 * 60_000;

export type RemoteSport = { id: string; sport: string; name: string; isActive: boolean; structuredEnabled: boolean };
export type RemoteExercise = { id: string; name: string; type: string | null };
export type RemoteRefs = {
  athleteRef: string;
  sports: RemoteSport[];
  exercises: { status: "loaded" | "scope_missing" | "partial" | "unknown"; items: RemoteExercise[] };
  digest: string;
};

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const USR = /^usr_[A-Za-z0-9]+$/, SPU = /^spu_[A-Za-z0-9]+$/, SPT = /^spt_[A-Za-z0-9]+$/, EXF = /^exf_[A-Za-z0-9]+$/;

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateSportPage(j: unknown): { data: RemoteSport[]; hasMore: boolean } | null {
  if (!isObj(j) || !Array.isArray(j.data) || typeof j.has_more !== "boolean") return null;
  const data: RemoteSport[] = [];
  for (const s of j.data) {
    if (!isObj(s) || typeof s.id !== "string" || !SPU.test(s.id) || typeof s.sport !== "string" || !SPT.test(s.sport) ||
      typeof s.name !== "string" || typeof s.is_active !== "boolean" || typeof s.is_structured_workout_enabled !== "boolean") return null;
    data.push({ id: s.id, sport: s.sport, name: s.name.slice(0, 120), isActive: s.is_active, structuredEnabled: s.is_structured_workout_enabled });
  }
  return { data, hasMore: j.has_more };
}
export function validateExercisePage(j: unknown): { data: RemoteExercise[]; hasMore: boolean } | null {
  if (!isObj(j) || !Array.isArray(j.data) || typeof j.has_more !== "boolean") return null;
  const data: RemoteExercise[] = [];
  for (const e of j.data) {
    if (!isObj(e) || typeof e.id !== "string" || !EXF.test(e.id) || typeof e.name !== "string" ||
      !(e.type === null || typeof e.type === "string") || typeof e.scope !== "string") return null;
    data.push({ id: e.id, name: e.name.slice(0, 120), type: (e.type as string | null) });
  }
  return { data, hasMore: j.has_more };
}

type Page<T> = { data: T[]; hasMore: boolean } | null;
async function readAll<T extends { id: string }>(f: FetchLike, token: string, path: string, base: URLSearchParams, maxPages: number, validate: (j: unknown) => Page<T>, timeoutMs: number):
  Promise<{ ok: true; items: T[] } | { ok: false; reason: "partial" | "unknown" }> {
  const items: T[] = [];
  let after: string | null = null;
  for (let i = 0; ; i++) {
    if (i >= maxPages) return { ok: false, reason: "partial" };
    const q = new URLSearchParams(base); q.set("limit", "100"); if (after) q.set("starting_after", after);
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
    let page: Page<T>;
    try {
      const r = await f(`${NOLIO_ORIGIN}${path}?${q.toString()}`, { method: "GET", redirect: "error", signal: ctl.signal, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      if (r.status !== 200) return { ok: false, reason: "unknown" };
      page = validate(JSON.parse(await r.text()));
    } catch { return { ok: false, reason: "unknown" }; } finally { clearTimeout(t); }
    if (!page) return { ok: false, reason: "unknown" };
    items.push(...page.data);
    if (!page.hasMore) break;
    if (!page.data.length) return { ok: false, reason: "unknown" };
    after = page.data[page.data.length - 1].id;
  }
  if (new Set(items.map((x) => x.id)).size !== items.length) return { ok: false, reason: "unknown" };
  return { ok: true, items };
}

export async function fetchRemoteRefs(a: { fetch: FetchLike; accessToken: string; athleteRef: string; scopes: string[]; timeoutMs?: number }):
  Promise<{ ok: true; refs: RemoteRefs } | { ok: false; reason: string }> {
  if (!USR.test(a.athleteRef)) return { ok: false, reason: "athlete_ref_invalid" };
  if (!a.accessToken) return { ok: false, reason: "access_token_absent" };
  const tmo = a.timeoutMs ?? 15000;
  const sp = await readAll(a.fetch, a.accessToken, SPORTS_PATH, new URLSearchParams({ athlete: a.athleteRef }), MAX_SPORT_PAGES, validateSportPage, tmo);
  if (sp.ok === false) return { ok: false, reason: `sports_read_${sp.reason}` };
  let exercises: RemoteRefs["exercises"] = { status: "scope_missing", items: [] };
  if (a.scopes.includes("library:read")) {
    const ex = await readAll(a.fetch, a.accessToken, EXERCISES_PATH, new URLSearchParams(), MAX_EXERCISE_PAGES, validateExercisePage, tmo);
    exercises = ex.ok === true ? { status: "loaded", items: ex.items } : { status: ex.reason, items: [] };
  }
  const body = { athleteRef: a.athleteRef, sports: sp.items, exercises };
  return { ok: true, refs: { ...body, digest: await sha256Hex(canonicalJson(body)) } };
}

export function parseStoredRefs(x: unknown): RemoteRefs | null {
  if (!isObj(x) || typeof x.athleteRef !== "string" || typeof x.digest !== "string" || !Array.isArray(x.sports) || !isObj(x.exercises)) return null;
  return x as unknown as RemoteRefs;
}

export type ConnectionRefs = { sportIds: Record<string, string>; exerciseIds: Record<string, string>; competition: null; calendarTimeZone: string | null };
const SPORT_KEY = /^[a-z][a-z0-9_]{1,23}$/;

export function validateActivationRefs(a: { remote: RemoteRefs; selectedRef: string; sportIds: unknown; exerciseIds: unknown; calendarTimeZone: unknown }):
  { ok: true; refs: ConnectionRefs } | { ok: false; reason: string } {
  if (a.remote.athleteRef !== a.selectedRef) return { ok: false, reason: "refs_for_other_athlete" };
  if (!isObj(a.sportIds)) return { ok: false, reason: "sport_ids_invalid" };
  const keys = Object.keys(a.sportIds);
  if (!keys.length || keys.length > 12) return { ok: false, reason: "sport_ids_count_invalid" };
  const usable = new Set(a.remote.sports.filter((s) => s.isActive && s.structuredEnabled).map((s) => s.sport));
  const sportIds: Record<string, string> = {};
  for (const k of keys) {
    const v = (a.sportIds as Record<string, unknown>)[k];
    if (!SPORT_KEY.test(k)) return { ok: false, reason: `sport_key_invalid:${k.slice(0, 24)}` };
    if (typeof v !== "string" || !SPT.test(v)) return { ok: false, reason: `sport_ref_invalid:${k}` };
    if (!usable.has(v)) return { ok: false, reason: `sport_ref_not_allowed_for_athlete:${k}` };
    sportIds[k] = v;
  }
  const exerciseIds: Record<string, string> = {};
  const ex = a.exerciseIds ?? {};
  if (!isObj(ex)) return { ok: false, reason: "exercise_ids_invalid" };
  const exKeys = Object.keys(ex);
  if (exKeys.length) {
    if (a.remote.exercises.status !== "loaded") return { ok: false, reason: `exercise_refs_unavailable:${a.remote.exercises.status}` };
    const known = new Set(a.remote.exercises.items.map((e) => e.id));
    if (exKeys.length > 200) return { ok: false, reason: "exercise_ids_count_invalid" };
    for (const k of exKeys) {
      const v = (ex as Record<string, unknown>)[k];
      if (!k || k.length > 120) return { ok: false, reason: "exercise_label_invalid" };
      if (typeof v !== "string" || !EXF.test(v) || !known.has(v)) return { ok: false, reason: `exercise_ref_not_in_library:${k.slice(0, 40)}` };
      exerciseIds[k] = v;
    }
  }
  let tz: string | null = null;
  if (a.calendarTimeZone !== null && a.calendarTimeZone !== undefined && a.calendarTimeZone !== "") {
    if (typeof a.calendarTimeZone !== "string" || !/^(UTC|[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+)$/.test(a.calendarTimeZone)) return { ok: false, reason: "calendar_timezone_invalid" };
    try { new Intl.DateTimeFormat("en", { timeZone: a.calendarTimeZone }); } catch { return { ok: false, reason: "calendar_timezone_invalid" }; }
    tz = a.calendarTimeZone;
  }
  return { ok: true, refs: { sportIds, exerciseIds, competition: null, calendarTimeZone: tz } };
}

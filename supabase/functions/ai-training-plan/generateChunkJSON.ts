/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1A — Génération JSON contrainte d'un chunk (contrainte N°3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Appelle le Lovable AI Gateway en mode JSON, valide la sortie via Zod,
 * effectue 1 seul retry avec les erreurs Zod injectées dans le prompt.
 * 2ᵉ échec ⇒ throw ChunkGenerationError avec code "SCHEMA_FAIL".
 *
 * Le gateway est OpenAI-compatible. On utilise `response_format:
 * { type: "json_object" }` qui est universellement supporté par les modèles
 * Gemini (via OpenRouter). L'enforcement du schéma est post-hoc via Zod,
 * ce qui reste conforme à l'attendu Phase 1A (retry sur erreur).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { z } from "npm:zod@3.23.8";
import {
  buildPlanChunkSchema,
  collectZodIssues,
  formatZodErrors,
  zStrategicRecap,
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
} from "./planSchema.ts";
import { extractJsonPayload } from "./extractJson.ts";
import { isTrailCatalogId, TRAIL_DETAILS_CRITICAL_RX } from "./trailMarkers.ts";

// ─── DIAGNOSTIC TRAIL (à retirer) — collecte remontée au client ───
export const __trailDebug: string[] = [];

export class ChunkGenerationError extends Error {
  constructor(
    public code: "SCHEMA_FAIL" | "GATEWAY_ERROR" | "PARSE_FAIL" | "RATE_LIMIT" | "CREDITS" | "TRUNCATED",
    public chunkIndex: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ChunkGenerationError";
  }
}

interface GatewayCallInput {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  allowedCatalogIds: string[];
  schemaOptions?: BuildPlanChunkSchemaOptions;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface GatewayCallResult {
  content: string;
  finishReason?: string;
  status: number;
  gatewayDiagnostic: GatewayDiagnostic;
}

interface GatewayDiagnostic {
  model: string;
  responseFormatType: "json_schema" | "json_object";
  jsonSchemaName?: string;
  constrained: boolean;
  jsonSchemaAttempted: boolean;
  fallbackReason?: string;
  gatewayIndicatedIgnoredResponseFormat?: boolean;
}

interface ParseDiagnostic {
  parsedJson: unknown | null;
  unwrapped: boolean;
  unwrapMethod: "none" | "extractJsonPayload";
  cleanedLength: number;
  parseError?: string;
  truncatedByExtraction?: boolean;
  repairs: string[];
}

interface AttemptDiagnostic {
  attempt: 1 | 2;
  finishReason?: string;
  rawLength: number;
  rawFirst800: string;
  rawLast400: string;
  unwrapped: boolean;
  unwrapMethod: ParseDiagnostic["unwrapMethod"];
  parseError?: string;
  truncatedByExtraction?: boolean;
  zodIssues: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  zodErrorText: string;
  repairs: string[];
  /** JSON-level conservative repairs (trailing_comma / bom / balance_close). */
  jsonRepairs: string[];
  gateway: GatewayDiagnostic;
}

const DAY_CANON: Record<string, string> = {
  lundi: "lundi", mardi: "mardi", mercredi: "mercredi", jeudi: "jeudi",
  vendredi: "vendredi", samedi: "samedi", dimanche: "dimanche",
  monday: "lundi", tuesday: "mardi", wednesday: "mercredi", thursday: "jeudi",
  friday: "vendredi", saturday: "samedi", sunday: "dimanche",
};

const PHASE_CANON: Record<string, string> = {
  base: "base", fondation: "base", adaptation: "base",
  build: "build", chantier: "build", consolidation: "build",
  "développement": "build", developpement: "build",
  peak: "peak", "spécifique": "peak", specifique: "peak",
  "compétition": "peak", competition: "peak", "race-specific": "peak",
  taper: "taper", "affûtage": "taper", affutage: "taper", "pre-race": "taper",
  // Semaines de récup/deload : non-canoniques en phase. Fallback contextuel
  // dans normalizeModelJsonForSchema (voisin le plus proche, sinon "build").
  recovery: "__deload__", "récupération": "__deload__", recuperation: "__deload__",
  "récup": "__deload__", recup: "__deload__", deload: "__deload__",
  regen: "__deload__", "régen": "__deload__", regeneration: "__deload__",
  "régénération": "__deload__", assimilation: "__deload__", relache: "__deload__",
  "relâche": "__deload__",
};

const SPORT_CANON: Record<string, string> = {
  swim: "swim", natation: "swim", nat: "swim",
  bike: "bike", "vélo": "bike", velo: "bike", cyclisme: "bike",
  run: "run", cap: "run", course: "run", "cap/course": "run", footing: "run",
  brick: "brick", brique: "brick", "enchaînement": "brick", enchainement: "brick",
  strength: "strength", renfo: "strength", renforcement: "strength",
  ppg: "strength", force: "strength", musculation: "strength",
  recovery: "recovery", "récup": "recovery", recup: "recovery",
  "récupération": "recovery", recuperation: "recovery",
  rest: "rest", repos: "rest", off: "rest",
};

function canonEnum(raw: unknown, table: Record<string, string>): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return table[key] ?? null;
}

const LIMITER_KEY_ALIAS: Record<string, string> = {
  statue: "status", statut: "status", "état": "status", etat: "status", state: "status",
  bloc: "block", blocs: "block", phase: "block",
  weekrange: "weeks", "week_range": "weeks", semaines: "weeks", "semaine": "weeks",
  sessions: "keySessions", "séances": "keySessions", seances: "keySessions",
  keysessions: "keySessions",
  nom: "name",
};

function coerceLimiterStringField(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(x => coerceLimiterStringField(x)).filter(Boolean).join(" · ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim();
    if (typeof o.description === "string" && o.description.trim()) return o.description.trim();
    try {
      const j = JSON.stringify(v);
      return j.length > 120 ? j.slice(0, 117) + "…" : j;
    } catch { return String(v); }
  }
  return String(v);
}

function canonicalizeStrategicRecap(
  raw: unknown,
  repairs: string[],
): { value: unknown; dropped: boolean } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { value: raw, dropped: false };
  const recap = raw as Record<string, unknown>;

  // Canonicalize limiters
  if (Array.isArray(recap.limiters)) {
    recap.limiters = recap.limiters.map((lim, li) => {
      if (!lim || typeof lim !== "object" || Array.isArray(lim)) return lim;
      const src = lim as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        const canon = LIMITER_KEY_ALIAS[k.toLowerCase()] ?? k;
        if (canon !== k) repairs.push(`strategicRecap.limiters.${li} key "${k}"→"${canon}"`);
        // First occurrence wins if collision (canonical field already set)
        if (out[canon] === undefined) out[canon] = v;
      }
      // rank fallback
      if (typeof out.rank !== "number" || !Number.isInteger(out.rank) || (out.rank as number) < 1) {
        out.rank = li + 1;
        repairs.push(`strategicRecap.limiters.${li}.rank defaulted to ${li + 1}`);
      }
      // name required string
      if (typeof out.name !== "string" || !out.name.trim()) {
        const coerced = coerceLimiterStringField(out.name);
        if (coerced) { out.name = coerced; repairs.push(`strategicRecap.limiters.${li}.name coerced`); }
      }
      // string fields coercion
      for (const f of ["status", "block", "weeks", "keySessions"] as const) {
        if (typeof out[f] !== "string") {
          const coerced = coerceLimiterStringField(out[f]);
          if (coerced !== "" || out[f] !== undefined) {
            out[f] = coerced;
            repairs.push(`strategicRecap.limiters.${li}.${f} coerced to string`);
          } else {
            out[f] = "";
          }
        }
      }
      return out;
    });
  }

  // Canonicalize synergies to array of strings
  if (Array.isArray(recap.synergies)) {
    let mutated = false;
    recap.synergies = recap.synergies.map((s) => {
      if (typeof s === "string") return s;
      mutated = true;
      return coerceLimiterStringField(s);
    });
    if (mutated) repairs.push(`strategicRecap.synergies coerced to string[]`);
  }

  // Safety net: validate against zStrategicRecap; if fail → drop
  const parsed = zStrategicRecap.safeParse(recap);
  if (!parsed.success) {
    console.warn(`[normalize] strategicRecap dropped (invalid after canon): ${formatZodErrors(parsed.error, 5)}`);
    repairs.push("strategicRecap dropped (invalid after canon)");
    return { value: undefined, dropped: true };
  }
  return { value: parsed.data, dropped: false };
}

export function normalizeModelJsonForSchema(
  value: unknown,
  allowedIds: string[],
  weekRange?: { start: number; end: number },
): { value: unknown; repairs: string[] } {
  const repairs: string[] = [];
  const allowed = new Set(allowedIds);
  const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
  const root = asRecord(value);
  if (!root) return { value, repairs };

  // Canonicalize + safety-net strategicRecap (narrative, never should block a chunk)
  if (root.strategicRecap !== undefined) {
    const { value: canonRecap, dropped } = canonicalizeStrategicRecap(root.strategicRecap, repairs);
    if (dropped) delete root.strategicRecap;
    else root.strategicRecap = canonRecap;
  }

  if (!Array.isArray(root.weeks)) return { value, repairs };

  root.weeks.forEach((week, wi) => {
    const w = asRecord(week);
    if (!w) return;
    if (typeof w.weekNumber === "string" && /^\d+$/.test(w.weekNumber.trim())) {
      w.weekNumber = Number(w.weekNumber);
      repairs.push(`weeks.${wi}.weekNumber string→number`);
    }
    // Canonicalisation phase (avec sentinelle __deload__ pour semaines de récup)
    const cp = canonEnum(w.phase, PHASE_CANON);
    if (cp !== null && cp !== w.phase) {
      if (cp === "__deload__") {
        // Inférence contextuelle : voisin le plus proche canonique, sinon "build".
        const weeksArr = root.weeks as unknown[];
        const canonical = new Set(["base", "build", "peak", "taper"]);
        const phaseAt = (i: number): string | null => {
          const r = asRecord(weeksArr[i]);
          if (!r) return null;
          const p = typeof r.phase === "string" ? r.phase.trim().toLowerCase() : null;
          return p && canonical.has(p) ? p : null;
        };
        let inferred: string | null = null;
        for (let d = 1; d < weeksArr.length && !inferred; d++) {
          inferred = phaseAt(wi - d) ?? phaseAt(wi + d);
        }
        const fallback = inferred ?? "build";
        repairs.push(`weeks.${wi}.phase deload→${fallback} (LLM=${String(w.phase)})`);
        w.phase = fallback;
      } else {
        repairs.push(`weeks.${wi}.phase canonicalized (${String(w.phase)}→${cp})`);
        w.phase = cp;
      }
    }
    if (!Array.isArray(w.sessions)) return;
    w.sessions.forEach((session, si) => {
      const s = asRecord(session);
      if (!s) return;
      const path = `weeks.${wi}.sessions.${si}`;
      // Canonicalisation day
      const cd = canonEnum(s.day, DAY_CANON);
      if (cd !== null && cd !== s.day) {
        repairs.push(`${path}.day canonicalized (${String(s.day)}→${cd})`);
        s.day = cd;
      }
      // Canonicalisation sport
      const cs = canonEnum(s.sport, SPORT_CANON);
      if (cs !== null && cs !== s.sport) {
        repairs.push(`${path}.sport canonicalized (${String(s.sport)}→${cs})`);
        s.sport = cs;
      }
      // durationMin non entier
      if (typeof s.durationMin === "number" && !Number.isInteger(s.durationMin)) {
        const rounded = Math.round(s.durationMin);
        repairs.push(`${path}.durationMin rounded (${s.durationMin}→${rounded})`);
        s.durationMin = rounded;
      }
      for (const key of ["custom", "isKeySession"] as const) {
        if (s[key] === "true" || s[key] === "false") {
          s[key] = s[key] === "true";
          repairs.push(`${path}.${key} string→boolean`);
        }
      }
      if (typeof s.durationMin === "string" && /^\d+$/.test(s.durationMin.trim())) {
        s.durationMin = Number(s.durationMin);
        repairs.push(`${path}.durationMin string→number`);
      }
      if (s.sport === "rest") {
        if (s.custom !== true) repairs.push(`${path}.custom forced true for rest`);
        if (s.catalogId !== null) repairs.push(`${path}.catalogId forced null for rest`);
        if (s.durationMin !== 0) repairs.push(`${path}.durationMin forced 0 for rest`);
        s.custom = true;
        s.catalogId = null;
        s.durationMin = 0;
        return;
      }
      // ─── SONDE DIAGNOSTIC TRAIL (à retirer) ───
      if (typeof s.catalogId === "string" && s.catalogId.length > 0) {
        const inAllowedProbe = allowed.has(s.catalogId);
        const trailIdProbe = isTrailCatalogId(s.catalogId);
        if (trailIdProbe || !inAllowedProbe) {
          __trailDebug.push(
            `[normalize] id="${s.catalogId}" custom=${String(s.custom)} ` +
            `inAllowed=${inAllowedProbe} isTrail=${trailIdProbe} allowedSize=${allowed.size}`,
          );
        }
      }

      const invalidId =
        s.catalogId === null ||
        s.catalogId === undefined ||
        (typeof s.catalogId === "string" && !allowed.has(s.catalogId));

      // Détection trail : sur l'ID halluciné OU sur le contenu de la séance.
      const scanText = `${(s as Record<string, unknown>).title ?? ""} ${(s as Record<string, unknown>).details ?? ""}`;
      const looksTrail =
        (typeof s.catalogId === "string" && isTrailCatalogId(s.catalogId)) ||
        TRAIL_DETAILS_CRITICAL_RX.test(scanText);

      if (typeof s.catalogId === "string" && allowed.has(s.catalogId)) {
        if (s.custom !== false) repairs.push(`${path}.custom forced false for valid catalogId`);
        s.custom = false;
      } else if (invalidId && looksTrail) {
        // ─── TRAIL sur plan non-trail : PAS de déguisement en custom légitime. ───
        // On nullifie l'ID (contrainte Zod) MAIS on marque explicitement la séance
        // pour substitution/échec par le guard offsport en aval. Le flag est retiré
        // après substitution réussie ; s'il subsiste → offsport_unresolved visible.
        if (s.catalogId !== null) repairs.push(`${path}.catalogId trail invalid→null (flagged for offsport guard)`);
        repairs.push(`${path}.__offsportTrail flagged (no silent custom disguise)`);
        s.custom = true;
        s.catalogId = null;
        (s as Record<string, unknown>).__offsportTrail = true;
      } else if (invalidId) {
        // Non-trail : comportement inchangé (dette assumée, hors périmètre P0).
        if (s.custom !== true) repairs.push(`${path}.custom forced true for custom/invalid catalogId`);
        if (s.catalogId !== null) repairs.push(`${path}.catalogId invalid→null`);
        s.custom = true;
        s.catalogId = null;
      }
    });
  });

  // Filtrage week-range + dedup
  if (weekRange) {
    const { start, end } = weekRange;
    const seen = new Set<number>();
    const kept: unknown[] = [];
    for (const week of root.weeks) {
      const w = asRecord(week);
      const n = w && typeof w.weekNumber === "number" ? w.weekNumber : NaN;
      if (!Number.isFinite(n)) { kept.push(week); continue; }
      if (n < start || n > end) {
        repairs.push(`weeks filtered out-of-range ${n}`);
        continue;
      }
      if (seen.has(n)) {
        repairs.push(`weeks dedup ${n}`);
        continue;
      }
      seen.add(n);
      kept.push(week);
    }
    root.weeks = kept;
  }

  return { value, repairs };
}


function buildJsonSchemaResponseFormat(allowedIds: string[], opts?: BuildPlanChunkSchemaOptions) {
  const catalogIdSchema = allowedIds.length > 0
    ? { type: "string", enum: allowedIds }
    : { type: "string", minLength: 1 };
  const nonRestSports = ["swim", "bike", "run", "brick", "strength", "recovery"];
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const sessionBase = {
    type: "object",
    properties: {
      day: { type: "string", enum: days },
      sport: { type: "string", enum: ["swim", "bike", "run", "brick", "strength", "recovery", "rest"] },
      title: { type: "string", minLength: 1 },
      details: { type: "string" },
      isKeySession: { type: "boolean" },
      custom: { type: "boolean" },
      catalogId: { anyOf: [{ type: "string" }, { type: "null" }] },
      durationMin: { type: "integer", minimum: 0 },
      zones: { type: "array", items: { type: "string" } },
    },
    required: ["day", "sport", "title", "details", "isKeySession", "custom", "catalogId", "durationMin", "zones"],
    additionalProperties: false,
  };
  const sessionRef = {
    ...sessionBase,
    properties: {
      ...sessionBase.properties,
      sport: { type: "string", enum: nonRestSports },
      custom: { const: false },
      catalogId: catalogIdSchema,
    },
  };
  const sessionCustom = {
    ...sessionBase,
    properties: {
      ...sessionBase.properties,
      sport: { type: "string", enum: nonRestSports },
      custom: { const: true },
      catalogId: { type: "null" },
    },
  };
  const sessionRest = {
    ...sessionBase,
    properties: {
      ...sessionBase.properties,
      sport: { const: "rest" },
      custom: { const: true },
      catalogId: { type: "null" },
      durationMin: { const: 0 },
    },
  };
  const weekSchema = {
    type: "object",
    properties: {
      weekNumber: { type: "integer", minimum: 1 },
      phase: { type: "string", enum: ["base", "build", "peak", "taper"] },
      theme: { type: "string" },
      phaseObjective: { type: "string" },
      weeklyNotes: { type: "string" },
      sessions: { type: "array", minItems: 1, items: { anyOf: [sessionRest, sessionRef, sessionCustom] } },
    },
    required: ["weekNumber", "phase", "theme", "sessions"],
    additionalProperties: false,
  };
  const weeks: Record<string, unknown> = { type: "array", minItems: 1, items: weekSchema };
  if (opts?.expectedWeekCount !== undefined) {
    weeks.minItems = opts.expectedWeekCount;
    weeks.maxItems = opts.expectedWeekCount;
  }
  return {
    type: "json_schema",
    json_schema: {
      name: "tfcl_plan_chunk",
      strict: false,
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          diagnostic: { type: "string" },
          strategicRecap: {
            type: "object",
            properties: {
              limiters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rank: { type: "integer", minimum: 1 },
                    name: { type: "string" },
                    status: { type: "string" },
                    block: { type: "string" },
                    weeks: { type: "string" },
                    keySessions: { type: "string" },
                  },
                  required: ["name"],
                  additionalProperties: true,
                },
              },
              synergies: { type: "array", items: { type: "string" } },
            },
            required: ["limiters"],
            additionalProperties: true,
          },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                weeks: { type: "string" },
                objective: { type: "string" },
              },
              required: ["name", "weeks"],
              additionalProperties: false,
            },
          },
          weeks,
        },
        required: opts?.isFirstChunk ? ["title", "weeks"] : ["weeks"],
        additionalProperties: false,
      },
    },
  };
}

function isTruncatedFinishReason(reason?: string): boolean {
  return reason === "length" || reason === "max_tokens" || reason === "MAX_TOKENS";
}

function rawSnippet(raw: string) {
  return {
    rawLength: raw.length,
    rawFirst800: raw.slice(0, 800),
    rawLast400: raw.slice(Math.max(0, raw.length - 400)),
  };
}

/** Extrait l'offset numérique d'un message d'erreur JSON.parse (V8/Deno). */
function extractParseOffset(msg: string): number | null {
  const mPos = msg.match(/position\s+(\d+)/i);
  if (mPos) return Number(mPos[1]);
  const mChar = msg.match(/char\s+(\d+)/i);
  if (mChar) return Number(mChar[1]);
  return null;
}

/**
 * Réparation JSON CONSERVATRICE — uniquement des corrections sûres qui ne peuvent PAS
 * inventer de données ni changer le sens.
 */
function conservativeJsonRepair(input: string): { text: string; changed: boolean; repairs: string[] } {
  let text = input;
  const repairs: string[] = [];

  const before1 = text;
  text = text.replace(/,(\s*[}\]])/g, "$1");
  if (text !== before1) repairs.push("trailing_comma");

  const before2 = text;
  text = text.replace(/^\uFEFF/, "");
  if (text !== before2) repairs.push("bom");

  const opensCurly = (text.match(/{/g) || []).length;
  const closesCurly = (text.match(/}/g) || []).length;
  const opensSquare = (text.match(/\[/g) || []).length;
  const closesSquare = (text.match(/\]/g) || []).length;
  const missingCurly = opensCurly - closesCurly;
  const missingSquare = opensSquare - closesSquare;
  if (missingCurly >= 0 && missingSquare >= 0 && missingCurly + missingSquare > 0 && missingCurly + missingSquare <= 3) {
    text = text + "]".repeat(missingSquare) + "}".repeat(missingCurly);
    repairs.push(`balance_close(sq=${missingSquare},cu=${missingCurly})`);
  }

  return { text, changed: repairs.length > 0, repairs };
}

function extractJSONText(raw: string): ParseDiagnostic {
  let payload: string;
  let unwrapped = false;
  try {
    const res = extractJsonPayload(raw);
    payload = res.json;
    unwrapped = res.unwrapped;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isUnbalanced = /non\s+équilibré/i.test(msg);
    if (unwrapped || isUnbalanced) {
      console.info(`[generateChunkJSON] unwrapped=${unwrapped} extraction-failed=${msg}`);
    }
    return {
      parsedJson: null,
      unwrapped,
      unwrapMethod: unwrapped ? "extractJsonPayload" : "none",
      cleanedLength: raw.length,
      parseError: msg,
      truncatedByExtraction: isUnbalanced,
      repairs: [],
    };
  }

  const method: ParseDiagnostic["unwrapMethod"] = unwrapped ? "extractJsonPayload" : "none";
  if (unwrapped) console.info(`[generateChunkJSON] unwrapped=true method=${method}`);

  try {
    return {
      parsedJson: JSON.parse(payload),
      unwrapped,
      unwrapMethod: method,
      cleanedLength: payload.length,
      repairs: [],
    };
  } catch (e) {
    const firstError = e instanceof Error ? e.message : String(e);

    // Filet défensif CONSERVATEUR : réparations minimales et sûres uniquement.
    const repaired = conservativeJsonRepair(payload);
    if (repaired.changed) {
      try {
        const parsedRepaired = JSON.parse(repaired.text);
        if (parsedRepaired && typeof parsedRepaired === "object" && !Array.isArray(parsedRepaired)) {
          console.warn(
            `[generateChunkJSON] JSON réparé (conservateur) — repairs=${repaired.repairs.join(", ")} · firstError="${firstError}"`,
          );
          return {
            parsedJson: parsedRepaired,
            unwrapped,
            unwrapMethod: method,
            cleanedLength: repaired.text.length,
            parseError: `recovered_after_repair: ${firstError}`,
            repairs: repaired.repairs,
          };
        }
      } catch {
        // réparation insuffisante
      }
    }

    const offset = extractParseOffset(firstError);
    const around = offset != null
      ? payload.slice(Math.max(0, offset - 120), offset + 120)
      : payload.slice(0, 240);

    return {
      parsedJson: null,
      unwrapped,
      unwrapMethod: method,
      cleanedLength: payload.length,
      parseError: `${firstError} | near>>>${around}<<<`,
      repairs: repaired.changed ? repaired.repairs : [],
    };
  }
}


function issuesFromZodError(err: z.ZodError): AttemptDiagnostic["zodIssues"] {
  return collectZodIssues(err).map(e => ({ path: e.path, message: e.message, code: e.code }));
}

async function callGatewayJSON(input: GatewayCallInput): Promise<GatewayCallResult> {
  const buildBody = (responseFormat: unknown) => ({
    model: input.model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    response_format: responseFormat,
    stream: false,
    max_tokens: input.maxTokens ?? 32768,
  });
  const call = (body: unknown) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: input.signal,
  });

  const jsonSchemaFormat = buildJsonSchemaResponseFormat(input.allowedCatalogIds, input.schemaOptions);
  const jsonSchemaBody = buildBody(jsonSchemaFormat);
  console.info("[ai-gateway-json] request", JSON.stringify({
    model: input.model,
    response_format: "json_schema",
    json_schema: "tfcl_plan_chunk",
    constrained: true,
    max_tokens: input.maxTokens ?? 32768,
  }));

  let resp = await call(jsonSchemaBody);
  let diagnostic: GatewayDiagnostic = {
    model: input.model,
    responseFormatType: "json_schema",
    jsonSchemaName: "tfcl_plan_chunk",
    constrained: true,
    jsonSchemaAttempted: true,
  };

  if (resp.status === 400) {
    const text = await resp.text().catch(() => "");
    diagnostic = {
      model: input.model,
      responseFormatType: "json_object",
      constrained: false,
      jsonSchemaAttempted: true,
      fallbackReason: `json_schema rejected status=400: ${text.slice(0, 300) || "empty body"}`,
    };
    console.warn(`[ai-gateway-json] json_schema rejected; constrained=false; fallback=json_object; reason=${diagnostic.fallbackReason}`);
    const jsonObjectBody = buildBody({ type: "json_object" });
    resp = await call(jsonObjectBody);
  }

  const status = resp.status;

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { content: text, status, gatewayDiagnostic: diagnostic };
  }

  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const finishReason: string | undefined = data?.choices?.[0]?.finish_reason;
  const responseMeta = JSON.stringify({
    warnings: data?.warnings,
    provider: data?.provider,
    error: data?.error,
  }).toLowerCase();
  const ignored = responseMeta.includes("response_format") && responseMeta.includes("ignor");
  if (ignored) {
    diagnostic.gatewayIndicatedIgnoredResponseFormat = true;
    diagnostic.constrained = false;
    console.warn("[ai-gateway-json] gateway indicated response_format was ignored; constrained=false");
  }
  return { content, finishReason, status, gatewayDiagnostic: diagnostic };
}

export interface GenerateChunkJSONInput {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  allowedCatalogIds: string[];
  chunkIndex: number;
  schemaOptions?: BuildPlanChunkSchemaOptions;
  signal?: AbortSignal;
  maxTokens?: number;
  weekRange?: { start: number; end: number };
}

/**
 * Génère un chunk JSON validé. 1 seul retry en cas d'échec Zod.
 * `repairDiag` est présent UNIQUEMENT si un filet conservateur a réparé le
 * JSON avant validation (chemin succès non silencieux).
 */
export async function generateChunkJSON(input: GenerateChunkJSONInput): Promise<{
  chunk: PlanChunk;
  usedRetry: boolean;
  finishReason?: string;
  repairDiag?: { attempt: 1 | 2; repairs: string[]; parseError?: string };
}> {
  const schema = buildPlanChunkSchema(input.allowedCatalogIds, input.schemaOptions);

  const tryOnce = async (userPrompt: string): Promise<{
    parsed: z.SafeParseReturnType<unknown, PlanChunk>;
    finishReason?: string;
    rawContent: string;
    status: number;
    diagnostic: AttemptDiagnostic;
  }> => {
    const result = await callGatewayJSON({
      apiKey: input.apiKey,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt,
      signal: input.signal,
      maxTokens: input.maxTokens,
      allowedCatalogIds: input.allowedCatalogIds,
      schemaOptions: input.schemaOptions,
    });

    if (result.status === 429) {
      throw new ChunkGenerationError(
        "RATE_LIMIT",
        input.chunkIndex,
        "Rate limit dépassé sur le gateway AI.",
      );
    }
    if (result.status === 402) {
      throw new ChunkGenerationError(
        "CREDITS",
        input.chunkIndex,
        "Crédits IA épuisés.",
      );
    }
    if (result.status < 200 || result.status >= 300) {
      throw new ChunkGenerationError(
        "GATEWAY_ERROR",
        input.chunkIndex,
        `Gateway AI status=${result.status} : ${result.content.slice(0, 400)}`,
      );
    }

    if (isTruncatedFinishReason(result.finishReason)) {
      const snippets = rawSnippet(result.content);
      console.error(`[TRUNCATED] chunk=${input.chunkIndex} finish_reason=${result.finishReason} rawLength=${snippets.rawLength}`);
      throw new ChunkGenerationError(
        "TRUNCATED",
        input.chunkIndex,
        `Chunk ${input.chunkIndex} : sortie JSON tronquée (finish_reason=${result.finishReason}).`,
        {
          chunkIndex: input.chunkIndex,
          finishReason: result.finishReason,
          ...snippets,
          gateway: result.gatewayDiagnostic,
        },
      );
    }

    const extracted = extractJSONText(result.content);
    if (extracted.truncatedByExtraction) {
      const snippets = rawSnippet(result.content);
      console.error(`[TRUNCATED] chunk=${input.chunkIndex} reason=unbalanced-json rawLength=${snippets.rawLength}`);
      throw new ChunkGenerationError(
        "TRUNCATED",
        input.chunkIndex,
        `Chunk ${input.chunkIndex} : sortie JSON tronquée (délimiteurs non équilibrés).`,
        {
          chunkIndex: input.chunkIndex,
          finishReason: result.finishReason,
          ...snippets,
          unwrapped: extracted.unwrapped,
          unwrapMethod: extracted.unwrapMethod,
          parseError: extracted.parseError,
          gateway: result.gatewayDiagnostic,
        },
      );
    }
    const normalized = extracted.parsedJson === null
      ? { value: null, repairs: [] }
      : normalizeModelJsonForSchema(extracted.parsedJson, input.allowedCatalogIds, input.weekRange);

    if (normalized.repairs.length > 0) {
      console.info(`[generateChunkJSON] schema-normalized=true repairs=${normalized.repairs.slice(0, 12).join("; ")}`);
    }
    const parsed = extracted.parsedJson === null
      ? schema.safeParse(null) // forcera un échec Zod racine + conserve l'erreur parse dans diagnostic
      : schema.safeParse(normalized.value);
    const gatewayDiagnostic = { ...result.gatewayDiagnostic };
    if (!parsed.success && gatewayDiagnostic.responseFormatType === "json_schema" && gatewayDiagnostic.constrained) {
      gatewayDiagnostic.constrained = false;
      gatewayDiagnostic.fallbackReason = "json_schema accepted by gateway, but returned content violated the requested schema; treating enforcement as unavailable for this model.";
      console.warn(`[ai-gateway-json] constrained=false: schema-invalid content returned despite json_schema response_format (chunk=${input.chunkIndex})`);
    }
    const zodErrorText = parsed.success ? "" : formatZodErrors(parsed.error, Number.POSITIVE_INFINITY);
    const snippets = rawSnippet(result.content);
    return {
      parsed,
      finishReason: result.finishReason,
      rawContent: result.content,
      status: result.status,
      diagnostic: {
        attempt: 1,
        finishReason: result.finishReason,
        ...snippets,
        unwrapped: extracted.unwrapped,
        unwrapMethod: extracted.unwrapMethod,
        parseError: extracted.parseError,
        truncatedByExtraction: extracted.truncatedByExtraction,
        zodIssues: parsed.success ? [] : issuesFromZodError(parsed.error),
        zodErrorText,
        repairs: normalized.repairs,
        jsonRepairs: extracted.repairs,
        gateway: gatewayDiagnostic,
      },
    };
  };

  const buildRepairDiag = (
    attempt: 1 | 2,
    diag: AttemptDiagnostic,
  ): { attempt: 1 | 2; repairs: string[]; parseError?: string } | undefined => {
    const recovered = typeof diag.parseError === "string" && diag.parseError.startsWith("recovered_after_repair");
    if (!recovered && diag.jsonRepairs.length === 0) return undefined;
    return { attempt, repairs: diag.jsonRepairs, parseError: diag.parseError };
  };

  // 1ère tentative
  const first = await tryOnce(input.userPrompt);
  first.diagnostic.attempt = 1;
  if (first.parsed.success) {
    return {
      chunk: first.parsed.data,
      usedRetry: false,
      finishReason: first.finishReason,
      repairDiag: buildRepairDiag(1, first.diagnostic),
    };
  }

  // Retry unique avec erreurs Zod injectées.
  const errList = formatZodErrors(first.parsed.error);
  console.warn(
    `[SCHEMA_FAIL] chunk=${input.chunkIndex} tentative 1 — retry avec corrections :\n${errList}`,
  );
  const retryPrompt = `${input.userPrompt}

⚠️ CORRECTION REQUISE — Ta précédente réponse ne respecte pas le schéma JSON attendu.
Corrige EXACTEMENT ces champs et régénère l'INTÉGRALITÉ du JSON (pas un patch) :
${errList}

Rappels non négociables :
- Objet JSON racine uniquement, pas de Markdown, pas de texte hors JSON.
- \`sessions[].custom=false\` ⇒ \`catalogId\` DOIT être un ID exact du catalogue injecté ci-dessus.
- \`sessions[].custom=true\` ⇒ \`catalogId=null\`.
- \`sessions[].sport="rest"\` ⇒ \`custom=true\`, \`catalogId=null\`, \`durationMin=0\`.`;

  const second = await tryOnce(retryPrompt);
  second.diagnostic.attempt = 2;
  if (second.parsed.success) {
    return {
      chunk: second.parsed.data,
      usedRetry: true,
      finishReason: second.finishReason,
      repairDiag: buildRepairDiag(2, second.diagnostic),
    };
  }

  const errList2 = formatZodErrors(second.parsed.error);
  console.error(
    `[SCHEMA_FAIL] chunk=${input.chunkIndex} tentative 2 — abandon.\n${errList2}`,
  );
  throw new ChunkGenerationError(
    "SCHEMA_FAIL",
    input.chunkIndex,
    `Chunk ${input.chunkIndex} : sortie JSON non conforme après 1 retry.`,
    {
      errors: errList2,
      chunkIndex: input.chunkIndex,
      zodIssues: second.diagnostic.zodIssues,
      zodErrorText: second.diagnostic.zodErrorText,
      rawFirst800: second.diagnostic.rawFirst800,
      rawLast400: second.diagnostic.rawLast400,
      rawLength: second.diagnostic.rawLength,
      unwrapped: second.diagnostic.unwrapped,
      unwrapMethod: second.diagnostic.unwrapMethod,
      parseError: second.diagnostic.parseError,
      repairs: second.diagnostic.repairs,
      finishReason: second.finishReason,
      gateway: second.diagnostic.gateway,
      attempts: [first.diagnostic, second.diagnostic],
    },
  );
}

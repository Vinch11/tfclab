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
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
} from "./planSchema.ts";
import { extractJsonPayload } from "./extractJson.ts";

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
  zodIssues: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  zodErrorText: string;
  repairs: string[];
  gateway: GatewayDiagnostic;
}

function normalizeModelJsonForSchema(value: unknown, allowedIds: string[]): { value: unknown; repairs: string[] } {
  const repairs: string[] = [];
  const allowed = new Set(allowedIds);
  const asRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
  const root = asRecord(value);
  if (!root || !Array.isArray(root.weeks)) return { value, repairs };

  root.weeks.forEach((week, wi) => {
    const w = asRecord(week);
    if (!w) return;
    if (typeof w.weekNumber === "string" && /^\d+$/.test(w.weekNumber.trim())) {
      w.weekNumber = Number(w.weekNumber);
      repairs.push(`weeks.${wi}.weekNumber string→number`);
    }
    if (!Array.isArray(w.sessions)) return;
    w.sessions.forEach((session, si) => {
      const s = asRecord(session);
      if (!s) return;
      const path = `weeks.${wi}.sessions.${si}`;
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
      if (typeof s.catalogId === "string" && allowed.has(s.catalogId)) {
        if (s.custom !== false) repairs.push(`${path}.custom forced false for valid catalogId`);
        s.custom = false;
      } else if (s.catalogId === null || s.catalogId === undefined || (typeof s.catalogId === "string" && !allowed.has(s.catalogId))) {
        if (s.custom !== true) repairs.push(`${path}.custom forced true for custom/invalid catalogId`);
        if (s.catalogId !== null) repairs.push(`${path}.catalogId invalid→null`);
        s.custom = true;
        s.catalogId = null;
      }
    });
  });
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
                  required: ["rank", "name", "status", "block", "weeks", "keySessions"],
                  additionalProperties: false,
                },
              },
              synergies: { type: "array", items: { type: "string" } },
            },
            required: ["limiters", "synergies"],
            additionalProperties: false,
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

function extractJSONText(raw: string): ParseDiagnostic {
  let cleaned = raw.trim();
  let fenceRemoved = false;
  const beforeFence = cleaned;
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  fenceRemoved = cleaned !== beforeFence;

  const extractBalanced = (text: string): { text: string; extracted: boolean } => {
    const objStart = text.indexOf("{");
    const arrStart = text.indexOf("[");
    const start = arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;
    if (start >= 0) {
      const open = text[start];
      const close = open === "{" ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escaped = false;
      let end = -1;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escaped) { escaped = false; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === open) depth++;
        if (ch === close) depth--;
        if (depth === 0) { end = i; break; }
      }
      if (end > start) {
        return { text: text.slice(start, end + 1).trim(), extracted: true };
      }
    }
    return { text, extracted: false };
  };

  let unwrapped = fenceRemoved;
  let method: ParseDiagnostic["unwrapMethod"] = fenceRemoved ? "fence" : "none";
  const startsJson = cleaned.startsWith("{") || cleaned.startsWith("[");
  if (!startsJson) {
    const extracted = extractBalanced(cleaned);
    if (extracted.extracted) {
      cleaned = extracted.text;
      unwrapped = true;
      method = fenceRemoved ? "fence+balanced-substring" : "balanced-substring";
    }
  }

  if (unwrapped) console.info(`[generateChunkJSON] unwrapped=true method=${method}`);

  try {
    return { parsedJson: JSON.parse(cleaned), unwrapped, unwrapMethod: method, cleanedLength: cleaned.length, repairs: [] };
  } catch (e) {
    if (startsJson) {
      const extracted = extractBalanced(cleaned);
      if (extracted.extracted && extracted.text !== cleaned) {
        try {
          console.info(`[generateChunkJSON] unwrapped=true method=${fenceRemoved ? "fence+balanced-substring" : "balanced-substring"}`);
          return {
            parsedJson: JSON.parse(extracted.text),
            unwrapped: true,
            unwrapMethod: fenceRemoved ? "fence+balanced-substring" : "balanced-substring",
            cleanedLength: extracted.text.length,
            repairs: [],
          };
        } catch { /* preserve original parse error below */ }
      }
    }
    return {
      parsedJson: null,
      unwrapped,
      unwrapMethod: method,
      cleanedLength: cleaned.length,
      parseError: e instanceof Error ? e.message : String(e),
      repairs: [],
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
}

/**
 * Génère un chunk JSON validé. 1 seul retry en cas d'échec Zod.
 */
export async function generateChunkJSON(input: GenerateChunkJSONInput): Promise<{
  chunk: PlanChunk;
  usedRetry: boolean;
  finishReason?: string;
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
    const normalized = extracted.parsedJson === null
      ? { value: null, repairs: [] }
      : normalizeModelJsonForSchema(extracted.parsedJson, input.allowedCatalogIds);
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
        zodIssues: parsed.success ? [] : issuesFromZodError(parsed.error),
        zodErrorText,
        repairs: normalized.repairs,
        gateway: gatewayDiagnostic,
      },
    };
  };

  // 1ère tentative
  const first = await tryOnce(input.userPrompt);
  first.diagnostic.attempt = 1;
  if (first.parsed.success) {
    return { chunk: first.parsed.data, usedRetry: false, finishReason: first.finishReason };
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
    return { chunk: second.parsed.data, usedRetry: true, finishReason: second.finishReason };
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

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
  formatZodErrors,
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
} from "./planSchema.ts";

export class ChunkGenerationError extends Error {
  constructor(
    public code: "SCHEMA_FAIL" | "GATEWAY_ERROR" | "PARSE_FAIL" | "RATE_LIMIT" | "CREDITS",
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
  maxTokens?: number;
  signal?: AbortSignal;
}

interface GatewayCallResult {
  content: string;
  finishReason?: string;
  status: number;
}

async function callGatewayJSON(input: GatewayCallInput): Promise<GatewayCallResult> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      // JSON-mode : contrat "réponse = JSON valide" (Gemini/OpenAI compatible).
      // L'enforcement du schéma reste post-hoc via Zod.
      response_format: { type: "json_object" },
      stream: false,
      max_tokens: input.maxTokens ?? 32768,
    }),
    signal: input.signal,
  });

  const status = resp.status;

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { content: text, status };
  }

  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const finishReason: string | undefined = data?.choices?.[0]?.finish_reason;
  return { content, finishReason, status };
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
  }> => {
    const result = await callGatewayJSON({
      apiKey: input.apiKey,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt,
      signal: input.signal,
      maxTokens: input.maxTokens,
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

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(result.content);
    } catch (e) {
      return {
        parsed: schema.safeParse(null), // forcera un échec Zod
        finishReason: result.finishReason,
        rawContent: result.content,
        status: result.status,
      };
    }
    return {
      parsed: schema.safeParse(parsedJson),
      finishReason: result.finishReason,
      rawContent: result.content,
      status: result.status,
    };
  };

  // 1ère tentative
  const first = await tryOnce(input.userPrompt);
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
    { errors: errList2 },
  );
}

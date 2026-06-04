import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizeObjKey, normalizeAmbKey, extractLimiterKeywords } from "./sportRatioMatrix.ts";
import { getSystemPrompt } from "./systemPrompt.ts";
import {
  buildUserPrompt,
  buildCPWprimeSection,
  computeCPWprime,
  buildStructuredDiagnosticBlock,
  buildTerrainHardBanBlock,
  extractStrategicRecap,
  detectActivePhase,
  validateChunk1HasRecap,
} from "./promptHelpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
function parseIsoDateUtc(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: verify caller has a valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { athleteData, planConfig, regenerateWeek, workoutCatalog, phaseCatalogs, chunkCatalogs, catalogDurationStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // F-21 — Réinjection dynamique des sections spécialisées (Master >=50, Féminin/RED-S, Trail)
    const systemPrompt = getSystemPrompt({
      sex: athleteData?.sex ?? planConfig?._athleteSex ?? null,
      age: athleteData?.age ?? null,
      objective: planConfig?.objective ?? null,
    });
    console.log(`📋 F-21 systemPrompt profile: sex=${athleteData?.sex ?? planConfig?._athleteSex ?? "?"} age=${athleteData?.age ?? "?"} obj=${planConfig?.objective ?? "?"} → ${systemPrompt.length} chars`);
    let userPrompt: string;
    if (regenerateWeek) {
      userPrompt = `Régénère UNIQUEMENT la Semaine ${regenerateWeek.weekNumber} du plan.
Contexte : ${regenerateWeek.phase || "Phase inconnue"}, thème "${regenerateWeek.theme || "Standard"}".
Plan total : ${regenerateWeek.totalWeeks} semaines.

${buildUserPrompt(athleteData, planConfig, catalogDurationStats)}

IMPORTANT : Ne génère QUE la Semaine ${regenerateWeek.weekNumber} au format tableau obligatoire. Pas les autres semaines.

RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles de cette semaine, tu DOIS :
1. Mentionner la durée de repos avec justification W'bal (ex: "Repos 2min30 — calibré W'bal 22kJ")
2. Indiquer le nombre max de répétitions avant dégradation W'
3. Étiqueter les efforts supra-CP quand la puissance prescrite dépasse CP
Ces mentions sont OBLIGATOIRES si les données CP/W' sont disponibles dans le profil athlète ci-dessus.`;
    } else {
      userPrompt = buildUserPrompt(athleteData, planConfig, catalogDurationStats);
    }

    // Resolve workout catalog for injection — phase-specific catalogs take priority
    function getWorkoutCatalogForPhase(phase: string): string {
      if (phaseCatalogs && typeof phaseCatalogs === "object") {
        // Map active phase names to catalog keys
        const phaseMap: Record<string, string> = {
          "fondation": "base", "base": "base", "adaptation": "base",
          "build": "build", "chantier": "build", "consolidation": "build", "développement": "build",
          "spécifique": "peak", "peak": "peak", "race-specific": "peak", "compétition": "peak",
          "affûtage": "taper", "taper": "taper", "pre-race": "taper",
        };
        const key = phaseMap[phase.toLowerCase()] || "build";
        const catalog = phaseCatalogs[key];
        if (catalog && typeof catalog === "string" && catalog.length > 0) return catalog;
        // Fallback to any available catalog
        for (const k of ["build", "base", "peak", "taper"]) {
          if (phaseCatalogs[k]) return phaseCatalogs[k];
        }
      }
      // Legacy: single workoutCatalog string
      if (workoutCatalog && typeof workoutCatalog === "string" && workoutCatalog.length > 0) {
        return workoutCatalog;
      }
      return "";
    }

    // For non-chunked plans, inject ALL phase catalogs (plan covers all phases)
    const monoblocCatalogParts: string[] = [];
    for (const phaseKey of ["base", "build", "peak", "taper"]) {
      const cat = getWorkoutCatalogForPhase(phaseKey);
      if (cat && !monoblocCatalogParts.includes(cat)) {
        monoblocCatalogParts.push(cat);
      }
    }
    if (monoblocCatalogParts.length > 0) {
      // Deduplicate: if all phases return the same catalog, inject once
      const uniqueCatalogs = [...new Set(monoblocCatalogParts)];
      userPrompt += "\n\n" + uniqueCatalogs.join("\n\n");
      userPrompt += `\n\n→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus.
→ Si AUCUNE séance ne correspond, tu peux CRÉER une séance [Custom] en respectant le format et la méthodologie.
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom.`;
    }

    // 🚨 TERRAIN HARD-BAN — prepend en TÊTE du userPrompt pour overrider les exemples
    // "+1200m D+" / "montagne" du systemPrompt quand l'athlète déclare un terrain urbain.
    // S'applique à tous les chemins : mono-bloc, chunked (chunk 1+N), retries, surgical.
    const _terrainHardBanTop = buildTerrainHardBanBlock(planConfig);
    if (_terrainHardBanTop) {
      userPrompt = `${_terrainHardBanTop}\n\n${userPrompt}`;
      console.log(`🏙️ TERRAIN HARD-BAN ACTIVE: terrainAvailability="${planConfig?.terrainAvailability}" → injecté en tête + queue de chaque chunk.`);
    } else {
      console.log(`🏙️ TERRAIN HARD-BAN inactif (terrainAvailability="${planConfig?.terrainAvailability ?? "undefined"}").`);
    }

    const totalWeeks = planConfig?.weeksAvailable || 12;
    // Use smaller chunks for triathlon (very verbose output with multi-session days)
    const obj = (planConfig?.objective || "").toUpperCase();
    // Detect verbose plans: triathlon multi-sport plans generate much more text per week
    // Verbose tier 1: Triathlon (doubles/triples, 3 sports) — most verbose
    const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
    // Verbose tier 2: Trail Ultra/Mountain (D+, back-to-back, nutrition descriptions)
    const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj) || (/TRAIL/i.test(obj) && totalWeeks >= 12);
    const isVerbosePlan = isTriVerbose || isTrailVerbose;
    // Dynamic chunk sizing based on verbosity tier
    const CHUNK_SIZE = isTriVerbose ? 5 : isTrailVerbose ? 6 : 8;
    // Chunk earlier for verbose plans to avoid token exhaustion → incomplete Race Weeks
    const chunkThreshold = isTriVerbose ? 6 : isTrailVerbose ? 8 : 12;
    const needsChunking = !regenerateWeek && totalWeeks > chunkThreshold;

    // FIX #1: Deduplicate CP/W' — reuse buildCPWprimeSection's logic via shared helper
    const cpwResult = computeCPWprime(athleteData);
    const cpRound = cpwResult?.cpRound ?? null;
    const effectiveCPVal = cpwResult?.effectiveCP ?? null;
    const wprimeKJ = cpwResult?.wprimeKJ ?? null;
    const wEffKJ = cpwResult ? Math.round(cpwResult.wprimeEffJ / 100) / 10 : null;

    // FIX #6: Per-chunk timeout (4 min per chunk call)
    const CHUNK_TIMEOUT_MS = 4 * 60 * 1000;
    // AUDIT FIX #2: Inter-chunk delay to mitigate rate limits on long plans (>24w)
    const INTER_CHUNK_DELAY_MS = 1500;
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // AUDIT FIX #6: Model fallback chain — primary fast, fallback robust for long plans
    const PRIMARY_MODEL = "google/gemini-3-flash-preview";
    const FALLBACK_MODEL = "google/gemini-2.5-pro";

    // AUDIT FIX #1: Track finish_reason to detect truncation (max_tokens reached)
    // generateAndStream returns text + truncation flag for caller-side handling
    let streamError: { code: number; message: string } | null = null;
    async function generateAndStream(
      prompt: string,
      controller: ReadableStreamDefaultController,
      encoder: TextEncoder,
      model: string = PRIMARY_MODEL,
      // OPTIMIZATION #3: Adaptive reasoning — enable on critical chunks (Chunk 1, Race Weeks)
      reasoningEffort?: "minimal" | "low" | "medium" | "high",
    ): Promise<{ text: string; truncated: boolean }> {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), CHUNK_TIMEOUT_MS);

      try {
        const body: Record<string, unknown> = {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          stream: true,
          max_tokens: 65536,
        };
        if (reasoningEffort) {
          body.reasoning = { effort: reasoningEffort };
        }

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: abortCtrl.signal,
        });

        if (!resp.ok || !resp.body) {
          const errText = await resp.text().catch(() => "Unknown error");
          console.error("AI call error:", resp.status, errText);

          const status = resp.status || 500;
          if (status === 402) {
            streamError = { code: 402, message: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." };
          } else if (status === 429) {
            streamError = { code: 429, message: "Rate limit dépassé, réessayez dans quelques instants." };
          } else {
            streamError = { code: 500, message: "Erreur du service IA" };
          }

          return { text: "", truncated: false };
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let buf = "";
        let truncated = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;

            try {
              const p = JSON.parse(json);
              const token = p.choices?.[0]?.delta?.content;
              // AUDIT FIX #1: Capture finish_reason to detect length-based truncation
              const finishReason = p.choices?.[0]?.finish_reason;
              if (finishReason === "length") {
                truncated = true;
                console.warn("⚠️ AI response truncated (finish_reason=length). Will trigger continuation logic.");
              }
              if (token) {
                text += token;
                controller.enqueue(encoder.encode(line + "\n\n"));
              }
            } catch {}
          }
        }
        return { text, truncated };
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.error("Chunk generation timed out after", CHUNK_TIMEOUT_MS, "ms");
          streamError = { code: 504, message: "Timeout: le bloc a pris trop de temps à générer." };
        }
        return { text: "", truncated: false };
      } finally {
        clearTimeout(timeout);
      }
    }

    // Helper: extract which week numbers were generated in a chunk of text
    function extractGeneratedWeekNumbers(text: string): number[] {
      const nums: number[] = [];
      const re = /^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*(\d+)\b/gim;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        nums.push(parseInt(m[1], 10));
      }
      return [...new Set(nums)].sort((a, b) => a - b);
    }

    // FIX #2: Build W'bal reminder using effectiveCP and W' effectif (aligned with client-side)
    const wbalReminder = (effectiveCPVal !== null && wEffKJ !== null)
      ? `\n🔋 RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles supra-CP, tu DOIS :
1. Justifier la durée de repos avec le W' individuel (ex: "Repos 2min30 — calibré W'bal ${wEffKJ} kJ")
2. Indiquer le volume max de répétitions avant épuisement du W'
3. Étiqueter les efforts au-dessus de CP effectif (${effectiveCPVal}W) comme "supra-CP"${cpwResult?.cpBounded ? `\n⚠️ CP brut (${cpRound}W) borné à ${effectiveCPVal}W (FTP+10) pour les prescriptions.` : ""}`
      : "";

    if (needsChunking) {
      // === CHUNKED GENERATION for long plans ===
      const encoder = new TextEncoder();
      const MAX_SUMMARY_CHUNKS = 5;

      // Build structured diagnostic from config (always available, includes phase bounds)
      const structuredDiagnostic = buildStructuredDiagnosticBlock(planConfig, totalWeeks);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let chunkSummaries: string[] = [];
            // Capture diagnostic from first chunk for re-injection
            let extractedDiagnostic = "";
            // FIX #1 (audit recap): Capture Récapitulatif Stratégique from chunk 1
            let extractedRecap = "";
            // AUDIT FIX #4: Global Plan Memory — ultra-condensed, persists across all chunks
            let globalPlanMemory = "";
            // F-22: Prescribed paces / power / HR thresholds extracted from chunk 1
            // Persists across all chunks to anchor intensity prescriptions and prevent drift.
            let prescribedPaces = "";
            // AUDIT FIX #5: Anti-redundancy — track key sessions used across all previous chunks
            const usedKeySessions: Set<string> = new Set();
            // FIX C1 (audit): Initialize activePhase from ambition — finisher starts in "Adaptation", not "Fondation"
            const ambKeyForPhase = normalizeAmbKey(planConfig?.ambition || "");
            let activePhase = (ambKeyForPhase === "finisher") ? "Adaptation" : "Fondation";
            const chunks: { start: number; end: number }[] = [];
            for (let s = 1; s <= totalWeeks; s += CHUNK_SIZE) {
              chunks.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
            }

            // AUDIT FIX #4: Append condensed entry to global memory (capped ~2KB)
            const updateGlobalMemory = (chunkIdx: number, chunkRange: string, phase: string, blocs: string[], topSessions: string[]) => {
              const blocLine = blocs.length > 0 ? ` | Blocs: ${blocs.join("; ")}` : "";
              const sessLine = topSessions.length > 0 ? ` | Clés: ${topSessions.slice(0, 4).join(", ")}` : "";
              const entry = `[Bloc${chunkIdx + 1} ${chunkRange} • ${phase}${blocLine}${sessLine}]`;
              globalPlanMemory = (globalPlanMemory + " " + entry).trim();
              if (globalPlanMemory.length > 2000) {
                const parts = globalPlanMemory.split(/(?=\[Bloc)/);
                while (parts.length > 1 && parts.join("").length > 2000) parts.shift();
                globalPlanMemory = parts.join("").trim();
              }
            };

            /**
             * F-22: Extract prescribed paces / power / HR from chunk 1 text.
             * Looks for explicit thresholds and pace prescriptions in the diagnostic,
             * strategic recap, and first weeks. Returns a deduplicated compact list
             * (≤800 chars) suitable for re-injection in every subsequent chunk.
             */
            const extractPrescribedPaces = (text: string): string => {
              if (!text) return "";
              const hits = new Set<string>();
              // Power prescriptions: "CP 285W", "FTP 280W", "Z4 = 240-260W", "Seuil ~265W"
              const powerRe = /\b(CP|FTP|MAP|PMA|Seuil|Threshold|Z[1-7]|VO2|Sweet ?Spot|SST|Tempo)\b[^.\n|]{0,40}?\b\d{2,4}\s*W\b/gi;
              // Pace prescriptions: "allure marathon 4:30/km", "seuil 3:45/km", "VMA 18 km/h", "16:00/3km"
              const paceRe = /\b(VMA|Seuil|Allure\s+\w+|Tempo|Marathon|Semi|10K|5K|CSS|Z[1-7])\b[^.\n|]{0,40}?\d{1,2}[:'h]\d{1,2}\s*\/?\s*(?:km|m|3km)?|\b\d{1,2}[,.]?\d?\s*km\/h\b/gi;
              // HR prescriptions: "Z2 130-145 bpm", "Seuil 165 bpm"
              const hrRe = /\b(Z[1-7]|Seuil|Threshold|FCmax|FC\s*Seuil)\b[^.\n|]{0,30}?\d{2,3}\s*(?:-\s*\d{2,3})?\s*(?:bpm|ppm)\b/gi;
              // %FTP / %CP / %VMA / %VO2 / %FCmax bands
              const pctRe = /\b\d{2,3}\s*[-–]\s*\d{2,3}\s*%\s*(?:FTP|CP|VMA|VO2|PMA|FCmax|FCM)\b/gi;

              const collect = (re: RegExp) => {
                let m: RegExpExecArray | null;
                while ((m = re.exec(text)) !== null) {
                  const s = m[0].replace(/\s+/g, " ").trim();
                  if (s.length >= 6 && s.length <= 80) hits.add(s);
                }
              };
              collect(powerRe);
              collect(paceRe);
              collect(hrRe);
              collect(pctRe);

              if (hits.size === 0) return "";
              const list = Array.from(hits).slice(0, 24);
              let joined = list.join(" • ");
              if (joined.length > 800) joined = joined.slice(0, 800).replace(/\s•[^•]*$/, "") + " …";
              return joined;
            };


            // ─── OPTIMIZATION #4: Dynamic feedback guardrails ───
            // Track per-chunk metrics (volume, intensity ratio, sport distribution).
            // After each chunk, compute deviations vs Lorang/Friel norms and feed them
            // back as NON-PRESCRIPTIVE signals into the NEXT chunk's prompt. The AI
            // remains in full control — it can confirm, justify, or correct.
            interface ChunkMetrics {
              chunkIdx: number;
              weekRange: string;
              estimatedTSS: number;          // sum of est. TSS across chunk weeks
              avgWeeklyHours: number;        // avg duration in hours
              intensityRatioPct: number;     // % time in Z3+ (high) — target ≤20% polarized
              sportDist: Record<string, number>; // sport → minutes
              progressionVsPrevPct: number | null; // %change in TSS vs previous chunk
            }
            const chunkMetricsHistory: ChunkMetrics[] = [];
            // Pending guardrail messages to inject into NEXT chunk
            let pendingGuardrails: string[] = [];

            // Estimate TSS from a session line: "duration × intensity factor² × 100"
            // Heuristic-based since we only have text. Conservative IF mapping per category.
            const estimateSessionTSS = (sessionText: string): number => {
              const lower = sessionText.toLowerCase();
              // Extract duration in minutes (formats: "1h30", "90min", "45'")
              let durMin = 0;
              const hMatch = lower.match(/(\d+)\s*h\s*(\d{1,2})?/);
              if (hMatch) {
                durMin = parseInt(hMatch[1], 10) * 60 + (hMatch[2] ? parseInt(hMatch[2], 10) : 0);
              } else {
                const mMatch = lower.match(/(\d{2,3})\s*(?:min|'|′)/);
                if (mMatch) durMin = parseInt(mMatch[1], 10);
              }
              if (durMin === 0) return 0;
              // IF heuristic by intensity markers
              let IF = 0.65; // Z2 default
              if (/sprint|vo2|map\b|z5|z6|110%|120%/.test(lower)) IF = 0.95;
              else if (/seuil|threshold|ftp\b|css|tempo|z4/.test(lower)) IF = 0.88;
              else if (/sweet ?spot|z3|sst/.test(lower)) IF = 0.82;
              else if (/fatmax|endurance|z2|aérobie|easy/.test(lower)) IF = 0.65;
              else if (/récup|recovery|z1|jog/.test(lower)) IF = 0.50;
              return Math.round((durMin / 60) * IF * IF * 100);
            };

            // Compute objective metrics for a chunk's generated text
            const computeChunkMetrics = (text: string, chunkIdx: number, range: string, prevTSS: number | null): ChunkMetrics => {
              const weekBlocks = text.match(/(?:^|\n)(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+\b[\s\S]*?(?=(?:\n(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+\b)|$)/gi) || [];
              let totalTSS = 0;
              let totalMin = 0;
              let highIntensityMin = 0;
              const sportDist: Record<string, number> = {};
              for (const wb of weekBlocks) {
                // Each session line typically has duration + zone info
                const lines = wb.split("\n").filter(l => /\d+\s*(?:h|min|'|′)/.test(l));
                for (const line of lines) {
                  const tss = estimateSessionTSS(line);
                  totalTSS += tss;
                  const lower = line.toLowerCase();
                  let durMin = 0;
                  const hMatch = lower.match(/(\d+)\s*h\s*(\d{1,2})?/);
                  if (hMatch) durMin = parseInt(hMatch[1], 10) * 60 + (hMatch[2] ? parseInt(hMatch[2], 10) : 0);
                  else {
                    const mMatch = lower.match(/(\d{2,3})\s*(?:min|'|′)/);
                    if (mMatch) durMin = parseInt(mMatch[1], 10);
                  }
                  totalMin += durMin;
                  if (/sprint|vo2|map\b|seuil|threshold|tempo|z3|z4|z5|z6|sst|sweet ?spot/.test(lower)) {
                    highIntensityMin += durMin;
                  }
                  // Sport detection
                  if (/vélo|bike|cyclisme|home ?trainer|ht\b/.test(lower)) sportDist.bike = (sportDist.bike || 0) + durMin;
                  else if (/course|run|cap\b|trail|piste/.test(lower)) sportDist.run = (sportDist.run || 0) + durMin;
                  else if (/nat|swim|piscine|crawl/.test(lower)) sportDist.swim = (sportDist.swim || 0) + durMin;
                  else if (/musc|force|gym|strength|renf/.test(lower)) sportDist.strength = (sportDist.strength || 0) + durMin;
                }
              }
              const numWeeks = Math.max(weekBlocks.length, 1);
              const avgWeeklyHours = Math.round((totalMin / 60 / numWeeks) * 10) / 10;
              const intensityRatioPct = totalMin > 0 ? Math.round((highIntensityMin / totalMin) * 100) : 0;
              const progressionVsPrevPct = prevTSS !== null && prevTSS > 0
                ? Math.round(((totalTSS - prevTSS) / prevTSS) * 100)
                : null;
              return { chunkIdx, weekRange: range, estimatedTSS: totalTSS, avgWeeklyHours, intensityRatioPct, sportDist, progressionVsPrevPct };
            };

            // Build feedback guardrail messages from metrics — NON-PRESCRIPTIVE tone
            const buildFeedbackGuardrails = (m: ChunkMetrics, phase: string): string[] => {
              const msgs: string[] = [];
              // Lorang: max +10% load progression between consecutive blocks
              if (m.progressionVsPrevPct !== null) {
                if (m.progressionVsPrevPct > 12) {
                  msgs.push(`📊 Charge bloc précédent (${m.weekRange}) : TSS ${m.estimatedTSS} = +${m.progressionVsPrevPct}% vs bloc N-1. Recommandation Lorang : max +10%/bloc. Confirme ce saut (justifié par adaptation forte ?) ou lisse la progression.`);
                } else if (m.progressionVsPrevPct < -25 && phase !== "Affûtage" && phase !== "Récupération") {
                  msgs.push(`📊 Charge bloc précédent : TSS −${Math.abs(m.progressionVsPrevPct)}% vs N-1 hors phase de récup/taper. Si volontaire (semaine de décharge), ignore ce signal. Sinon, vérifie la cohérence.`);
                }
              }
              // Polarized 80/20 — high intensity should be ≤20-25% in base/build
              if (m.intensityRatioPct > 28 && (phase === "Fondation" || phase === "Adaptation" || phase === "Build" || phase === "Chantier")) {
                msgs.push(`⚖️ Intensité bloc précédent : ${m.intensityRatioPct}% du temps en Z3+ (cible polarisée 80/20 = ≤20-25% en ${phase}). Si l'athlète a besoin de plus d'intensité (limiteur VLamax/VO2max), justifie. Sinon, rééquilibre vers du Z2/FatMax.`);
              }
              // Sport distribution sanity (only flag if multi-sport plan)
              const totalSportMin = Object.values(m.sportDist).reduce((a, b) => a + b, 0);
              if (totalSportMin > 60 && Object.keys(m.sportDist).length >= 2) {
                const dist = Object.entries(m.sportDist)
                  .map(([s, min]) => `${s}=${Math.round(min / totalSportMin * 100)}%`)
                  .join(", ");
                msgs.push(`🏃🚴🏊 Répartition sport bloc précédent : ${dist}. Vérifie que c'est aligné avec l'objectif et la phase active.`);
              }
              return msgs;
            };

            const emitChunkBoundary = () => {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"\\n\\n"}}]}\n\n')
              );
            };

            for (let ci = 0; ci < chunks.length; ci++) {
              const chunk = chunks[ci];
              const isFirst = ci === 0;
              const expectedWeeks = Array.from(
                { length: chunk.end - chunk.start + 1 },
                (_, i) => chunk.start + i
              );

              // Sliding window summary — only last N chunks
              const slidingSummary = chunkSummaries.slice(-MAX_SUMMARY_CHUNKS).join("\n");

              // Per-chunk filtered catalog (OPTIMIZATION #1): prefer chunk-specific over phase-wide
              // Reduces cognitive noise: AI sees ~45 ultra-relevant sessions instead of ~80 phase-wide
              const chunkSpecificCatalog = Array.isArray(chunkCatalogs) && typeof chunkCatalogs[ci] === "string" && chunkCatalogs[ci].length > 0
                ? chunkCatalogs[ci]
                : null;
              const chunkPhaseCatalog = chunkSpecificCatalog || getWorkoutCatalogForPhase(activePhase);

              let chunkPrompt: string;
              if (isFirst) {
                const allChunksSummary = chunks.map(c => `Semaines ${c.start}-${c.end}`).join(", ");
                // FIX C2 (audit): Inject structuredDiagnostic in chunk 1 to anchor phase bounds from the start
                chunkPrompt = `${userPrompt}
${chunkPhaseCatalog ? `\n${chunkPhaseCatalog}\n` : ""}
⚠️ GÉNÉRATION PAR BLOC : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).

📋 DIAGNOSTIC STRUCTURÉ (RÉFÉRENCE pour la cohérence du plan entier) :
${structuredDiagnostic}

Pour ce premier bloc, inclus :
1. Le **Diagnostic TFCL™** complet
2. Le **Récapitulatif Stratégique** couvrant **L'INTÉGRALITÉ du plan de ${totalWeeks} semaines** (${allChunksSummary}), PAS seulement le bloc actuel.
   - Le tableau "Limiteurs → Blocs → Séances Clés" DOIT lister TOUS les blocs/phases du plan entier (ex: Fondation S1-S6, Build S7-S12, Spécifique S13-S26, Affûtage S27-S32).
   - La colonne "Semaines" DOIT couvrir la totalité des ${totalWeeks} semaines.
   - Les synergies doivent concerner le plan global.
   - ⚠️ CHAQUE phase/bloc DOIT avoir des bornes de semaines explicites (ex: "S1-S6", "S7-S12").
   - ⚠️ Les bornes de phase estimées ci-dessus servent de GUIDE. Tu peux ajuster ±1 semaine si les limiteurs le justifient.

Génère ensuite les semaines ${chunk.start} à ${chunk.end} avec leurs tableaux complets.
IMPORTANT : Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines (${expectedWeeks.join(", ")}). Ne t'arrête pas avant.${wbalReminder}${_terrainHardBanTop ? `\n\n${_terrainHardBanTop}` : ""}`;

              } else {
                // FIX #2 (audit recap): Re-inject BOTH diagnostic AND strategic recap
                const diagnosticBlock = structuredDiagnostic + (extractedDiagnostic ? `\n\n📝 Diagnostic généré (résumé) :\n${extractedDiagnostic}` : "");
                
                // FIX #2: Build recap injection section
                const recapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (généré au bloc 1 — RÉFÉRENCE pour le séquençage) :\n${extractedRecap}\n\n⚠️ Tu DOIS respecter les bornes de phase et les séances clés définies ci-dessus. Si la semaine ${chunk.start} tombe dans un nouveau bloc/phase selon ce récapitulatif, insère l'en-tête de bloc.`
                  : "";

                // FIX C3 (audit): Build multi-objective reminder specific to this chunk's week range
                let multiObjChunkReminder = "";
                if (planConfig?.raceGoals && planConfig.raceGoals.length > 1) {
                  const relevantGoals = planConfig.raceGoals.filter((g: any) => {
                    if (!g.raceDate || !planConfig.planStartDate) return false;
                    const startMs = parseIsoDateUtc(planConfig.planStartDate);
                    const raceMs = parseIsoDateUtc(g.raceDate);
                    if (startMs === undefined || raceMs === undefined) return false;
                    const days = Math.round((raceMs - startMs) / (24 * 3600 * 1000));
                    const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                    // Include goals within ±3 weeks of this chunk's range (taper/recovery window)
                    return goalWeek >= chunk.start - 3 && goalWeek <= chunk.end + 3;
                  });
                  if (relevantGoals.length > 0) {
                    multiObjChunkReminder = `\n\n🎯 RAPPEL MULTI-OBJECTIFS pour ce bloc :`;
                    relevantGoals.forEach((g: any) => {
                      const startMs = parseIsoDateUtc(planConfig.planStartDate);
                      const raceMs = parseIsoDateUtc(g.raceDate);
                      const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : 0;
                      const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                      const prio = g.priority === "A" ? "🅰️" : g.priority === "B" ? "🅱️" : "🆎";
                      multiObjChunkReminder += `\n  ${prio} ${g.objective || g.raceName || "Course"} — Semaine ${goalWeek} (${g.raceDate})`;
                      if (g.priority !== "A" && goalWeek >= chunk.start && goalWeek <= chunk.end) {
                        multiObjChunkReminder += ` ⚠️ DANS CE BLOC → Mini-taper S${goalWeek - 1}, Course S${goalWeek}, Récup S${goalWeek + 1}`;
                      }
                    });

                    const inChunkGoals = relevantGoals.filter((g: any) => {
                      const startMs = parseIsoDateUtc(planConfig.planStartDate);
                      const raceMs = parseIsoDateUtc(g.raceDate);
                      const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : -999;
                      const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                      return goalWeek >= chunk.start && goalWeek <= chunk.end;
                    });

                    if (inChunkGoals.length > 0) {
                      multiObjChunkReminder += `\n\n🚨 RACE WEEK À GÉNÉRER DANS CE BLOC (OBLIGATION ABSOLUE) :`;
                      inChunkGoals.forEach((g: any) => {
                        const startMs = parseIsoDateUtc(planConfig.planStartDate);
                        const raceMs = parseIsoDateUtc(g.raceDate);
                        const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : 0;
                        const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                        multiObjChunkReminder += `\n- ${g.priority === "A" ? "🅰️" : g.priority === "B" ? "🅱️" : "🆎"} ${g.objective || g.raceName || "Course"} : la S${goalWeek} DOIT inclure la course à la date exacte ${g.raceDate}.`;
                        multiObjChunkReminder += `\n  • La S${goalWeek} doit être une vraie Race Week complète : mini-taper + rappels spécifiques + activation + Jour J.`;
                        multiObjChunkReminder += `\n  • Interdit de produire une semaine vide, ambiguë, ou limitée à 2-3 séances non spécifiques.`;
                        multiObjChunkReminder += `\n  • Minimum attendu : 5 séances réelles pour cette semaine, dont une séance "🏁 COURSE OBJECTIF" / "🏁 Jour J".`;
                      });
                    }
                  }
                }

                chunkPrompt = `${userPrompt}
${chunkPhaseCatalog ? `\n📚 CATALOGUE SÉANCES FILTRÉES POUR CETTE PHASE (${activePhase}) :\n${chunkPhaseCatalog}\n` : ""}
⚠️ GÉNÉRATION PAR BLOC (suite) : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).
NE PAS répéter le diagnostic ni le récapitulatif stratégique. NE PAS ajouter d'introduction.
Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines : ${expectedWeeks.map(w => `Semaine ${w}`).join(", ")}.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une nouvelle phase/bloc commence dans cette plage de semaines (d'après le Récapitulatif Stratégique du premier bloc), tu DOIS insérer l'en-tête de bloc AVANT la première semaine de ce bloc :
## Bloc N : [Nom Métabolique] (Semaines X-Y)
**Objectif physiologique :** [...]
**Volume cible :** [...]

Puis continue avec les semaines. Chaque bloc doit avoir son en-tête. C'est OBLIGATOIRE pour le parsing.

📋 DIAGNOSTIC STRUCTURÉ (cohérence obligatoire pour ce bloc) :
${diagnosticBlock}
${recapSection}${multiObjChunkReminder}

🔄 PHASE ACTIVE ESTIMÉE : ${activePhase}
→ Les séances clés de ce bloc doivent correspondre à cette phase ET aux limiteurs ci-dessus.
→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus qui correspondent à cette phase.
→ Si AUCUNE séance du catalogue ne correspond précisément à l'objectif/phase/sport requis, tu peux CRÉER une séance sur mesure en respectant :
  1. Le format identique (titre explicite, zones, durée, structure Warm-up/Main/Cool-down)
  2. Les principes méthodologiques du plan (polarisation 80/20, progression, cohérence de phase)
  3. Marque-la avec [Custom] dans le titre pour la distinguer des protocoles validés
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom. Si tu dépasses 20% custom, justifie pourquoi.

${prescribedPaces ? `🎯 ALLURES / PUISSANCES / FC PRESCRITES (réf. bloc 1 — ANCRAGE OBLIGATOIRE, ne pas dériver) :\n${prescribedPaces}\n→ Toute séance d'intensité de ce bloc DOIT utiliser ces ancrages (ou une variation justifiée ±5%). Ne pas inventer de nouvelles valeurs.\n\n` : ""}🧠 MÉMOIRE GLOBALE DU PLAN (synthèse de TOUS les blocs déjà générés — anti-amnésie) :
${globalPlanMemory || "(aucun bloc précédent)"}

Résumé détaillé des blocs récents (progression) :
${slidingSummary || "Premier bloc de continuation."}

🚫 SÉANCES CLÉS DÉJÀ UTILISÉES (éviter la répétition exacte — varier les protocoles) :
${usedKeySessions.size > 0 ? Array.from(usedKeySessions).slice(-25).join(" • ") : "(aucune)"}
→ Tu peux REPRENDRE des familles de séances pour la progression, mais évite de copier le titre exact d'une séance déjà programmée. Varie les durées, intensités, ou structures.
${pendingGuardrails.length > 0 ? `\n🛟 GARDE-FOUS DYNAMIQUES (signaux objectifs du bloc précédent — tu restes maître, confirme ou ajuste) :\n${pendingGuardrails.map(g => `• ${g}`).join("\n")}\n→ Ces signaux sont INFORMATIFS. Tu peux les justifier (adaptation contextuelle valide) ou les corriger dans ce bloc. Ne les ignore pas silencieusement.\n` : ""}
Assure la PROGRESSION LOGIQUE du volume et de l'intensité par rapport aux semaines précédentes.${wbalReminder}${_terrainHardBanTop ? `\n\n${_terrainHardBanTop}` : ""}`;
                // Reset pending guardrails — they've been delivered
                pendingGuardrails = [];
              }

              if (!isFirst) emitChunkBoundary();

              // AUDIT FIX #2: Inter-chunk delay to mitigate rate limits (skip on first chunk)
              if (!isFirst) {
                await sleep(INTER_CHUNK_DELAY_MS);
              }

              // ─── OPTIMIZATION #3: Adaptive reasoning ───
              // Activate medium reasoning for critical chunks where the AI must think harder:
              //   • Chunk 1 → strategic recap covering ALL totalWeeks (high-stakes structural decision)
              //   • Chunks containing a Race Week (priority A/B/C) → race day logistics + taper precision
              const chunkContainsRaceWeek = Array.isArray(planConfig?.raceGoals) && planConfig.raceGoals.some((g: any) => {
                if (!g.raceDate || !planConfig.planStartDate) return false;
                const sMs = parseIsoDateUtc(planConfig.planStartDate);
                const rMs = parseIsoDateUtc(g.raceDate);
                if (sMs === undefined || rMs === undefined) return false;
                const days = Math.round((rMs - sMs) / (24 * 3600 * 1000));
                const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                return goalWeek >= chunk.start && goalWeek <= chunk.end;
              });
              const useReasoning = isFirst || chunkContainsRaceWeek;
              if (useReasoning) {
                console.log(`🧠 Adaptive reasoning ENABLED for chunk ${ci + 1} (isFirst=${isFirst}, raceWeek=${chunkContainsRaceWeek})`);
              }

              // Generate chunk
              const genResult = await generateAndStream(
                chunkPrompt,
                controller,
                encoder,
                PRIMARY_MODEL,
                useReasoning ? "medium" : undefined,
              );
              let chunkText = genResult.text;
              let combinedChunkText = chunkText;
              let chunkTruncated = genResult.truncated;

              if (!chunkText) {
                console.error(`Chunk ${ci + 1}/${chunks.length} failed (empty response). StreamError: ${streamError?.message || "none"}`);
                if (streamError && (streamError.code === 402 || streamError.code === 429)) {
                  const errorPayload = `{"error":"${streamError.message}","code":${streamError.code}}`;
                  controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                  break;
                }
                console.log(`Retrying full chunk ${ci + 1} after failure...`);
                streamError = null;
                await sleep(INTER_CHUNK_DELAY_MS);
                const retryResult = await generateAndStream(chunkPrompt, controller, encoder);
                if (!retryResult.text) {
                  // AUDIT FIX #6: Fallback model — switch to robust Gemini Pro after 2 failures
                  console.warn(`⚠️ Chunk ${ci + 1} primary retry failed. Trying FALLBACK model (${FALLBACK_MODEL})...`);
                  streamError = null;
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const fallbackResult = await generateAndStream(chunkPrompt, controller, encoder, FALLBACK_MODEL);
                  if (!fallbackResult.text) {
                    console.error(`Chunk ${ci + 1} fallback also failed. Skipping to next chunk.`);
                    continue;
                  }
                  chunkText = fallbackResult.text;
                  combinedChunkText = chunkText;
                  chunkTruncated = fallbackResult.truncated;
                  console.log(`✅ Chunk ${ci + 1} recovered via fallback model.`);
                } else {
                  chunkText = retryResult.text;
                  combinedChunkText = chunkText;
                  chunkTruncated = retryResult.truncated;
                }
              }

              // AUDIT FIX #1: Log truncation — missing-weeks retry below handles continuation
              if (chunkTruncated) {
                const generatedSoFar = extractGeneratedWeekNumbers(combinedChunkText);
                const missingFromTrunc = expectedWeeks.filter(w => !generatedSoFar.includes(w));
                console.warn(`⚠️ Chunk ${ci + 1} truncated (finish_reason=length). Missing ${missingFromTrunc.length}/${expectedWeeks.length} weeks — continuation will be requested.`);
              }

              // === FIRST CHUNK EXTRACTIONS ===
              if (isFirst) {
                // Extract Diagnostic
                const diagMatch = chunkText.match(/(?:##\s*(?:1\.\s*)?Diagnostic[^\n]*\n)([\s\S]*?)(?=##\s*(?:2\.\s*)?(?:R[ée]capitulatif|Semaine\s*\d))/i);
                if (diagMatch) {
                  extractedDiagnostic = diagMatch[1].trim().slice(0, 1200);
                } else {
                  const limiterLines = chunkText.match(/(?:Limiteur|L1|L2|stratégi|priorit|VLamax|VO2max|TTE|FTP|FatMax|économie|durabilité)[^\n]*/gi) || [];
                  extractedDiagnostic = limiterLines.slice(0, 15).join("\n");
                }

                // FIX #1 (audit recap): Extract Récapitulatif Stratégique
                extractedRecap = extractStrategicRecap(chunkText);

                // AUDIT FIX #3: Strict recap enforcement — regenerate chunk 1 once if recap is missing
                let recapValidation = validateChunk1HasRecap(chunkText);
                if ((!recapValidation.hasRecap || !recapValidation.hasPhases || !extractedRecap) && chunks.length > 1) {
                  console.warn("⚠️ Chunk 1 missing strategic recap — forcing one regeneration with reinforced prompt.");
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const reinforcedPrompt = `${chunkPrompt}

🚨 CONTRAINTE ABSOLUE — RÉCAPITULATIF STRATÉGIQUE OBLIGATOIRE :
Tu DOIS produire une section "## 2. Récapitulatif Stratégique" couvrant les ${totalWeeks} semaines du plan AVANT toute semaine.
Le tableau "Limiteurs → Blocs → Séances Clés" doit comporter au moins 3 phases avec bornes explicites (S1-Sx, Sy-Sz, …) couvrant l'INTÉGRALITÉ des ${totalWeeks} semaines.
Sans ce récapitulatif structuré, le plan sera rejeté.`;
                  const reinforcedResult = await generateAndStream(reinforcedPrompt, controller, encoder);
                  if (reinforcedResult.text) {
                    combinedChunkText = reinforcedResult.text;
                    chunkText = reinforcedResult.text;
                    extractedRecap = extractStrategicRecap(reinforcedResult.text);
                    recapValidation = validateChunk1HasRecap(reinforcedResult.text);
                    chunkTruncated = chunkTruncated || reinforcedResult.truncated;
                  }
                }

                if (!recapValidation.hasRecap) {
                  console.warn("⚠️ Chunk 1 still missing Récapitulatif Stratégique after enforcement.");
                }
                if (!recapValidation.hasPhases) {
                  console.warn("⚠️ Chunk 1 Récapitulatif has no phase boundaries (SN-SM patterns) after enforcement.");
                }
                if (extractedRecap) {
                  console.log(`✅ Extracted strategic recap (${extractedRecap.length} chars)`);
                } else {
                  console.warn("⚠️ Failed to extract strategic recap — subsequent chunks will lack periodization context");
                }

                // F-22: Extract prescribed paces / power / HR from chunk 1 (diagnostic + recap + week 1)
                prescribedPaces = extractPrescribedPaces(combinedChunkText);
                if (prescribedPaces) {
                  console.log(`🎯 F-22: Extracted prescribed paces (${prescribedPaces.length} chars): ${prescribedPaces.slice(0, 120)}…`);
                } else {
                  console.warn("⚠️ F-22: No prescribed paces extracted from chunk 1 — subsequent chunks may drift in intensity.");
                }
              }

              // FIX #4 (audit recap): Detect active phase with broader matching
              activePhase = detectActivePhase(combinedChunkText, activePhase);

              // Verify which weeks were generated
              const generatedWeeks = extractGeneratedWeekNumbers(chunkText);
              const missingWeeks = expectedWeeks.filter(w => !generatedWeeks.includes(w));

              // Double retry for missing weeks (with deduplication + diagnostic + recap injection)
              if (missingWeeks.length > 0) {
                console.log(`Chunk ${ci + 1}: missing weeks ${missingWeeks.join(",")}. Retry 1...`);
                
                // FIX #2: Include recap in retry prompts too
                const retryRecapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1500)}`
                  : "";
                
                const retryPrompt = `${userPrompt}

⚠️ COMPLÉTION DE SEMAINES MANQUANTES : Génère UNIQUEMENT les semaines suivantes : ${missingWeeks.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic ni le récapitulatif. NE PAS ajouter d'introduction.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une des semaines manquantes est la PREMIÈRE semaine d'un nouveau bloc/phase, tu DOIS insérer l'en-tête de bloc.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retryRecapSection}
${prescribedPaces ? `\n🎯 ALLURES PRESCRITES (réf. bloc 1) : ${prescribedPaces}\n` : ""}

🔄 PHASE ACTIVE : ${activePhase}

Contexte des semaines déjà générées :
${slidingSummary}
${generatedWeeks.length > 0 ? `Semaines déjà générées dans ce bloc : ${generatedWeeks.join(", ")}` : ""}

Assure la CONTINUITÉ de la progression.${wbalReminder}`;

                emitChunkBoundary();
                await sleep(INTER_CHUNK_DELAY_MS);
                const retryResult1 = await generateAndStream(retryPrompt, controller, encoder);
                const retryText = retryResult1.text;
                let allRetryWeeks: number[] = [];
                if (retryText) {
                  combinedChunkText += `\n${retryText}`;
                  allRetryWeeks = extractGeneratedWeekNumbers(retryText);
                  // Update phase from retry text too
                  activePhase = detectActivePhase(retryText, activePhase);
                }

                const stillMissing = missingWeeks.filter(w => !allRetryWeeks.includes(w));

                // Second retry for remaining missing weeks
                if (stillMissing.length > 0) {
                  console.log(`Chunk ${ci + 1}: still missing ${stillMissing.join(",")}. Retry 2...`);
                  // FIX #2 (audit recap): Include recap in retry 2 as well
                  const retry2RecapSection = extractedRecap
                    ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1200)}`
                    : "";

                  const retry2Prompt = `${userPrompt}

⚠️ DERNIÈRE TENTATIVE — Génère UNIQUEMENT : ${stillMissing.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic. Génère directement les tableaux.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retry2RecapSection}
${prescribedPaces ? `\n🎯 ALLURES PRESCRITES (réf. bloc 1) : ${prescribedPaces}\n` : ""}

🔄 PHASE ACTIVE : ${activePhase}

Contexte : ${slidingSummary}
Semaines déjà générées : ${[...generatedWeeks, ...allRetryWeeks].sort((a, b) => a - b).join(", ")}${wbalReminder}`;

                  emitChunkBoundary();
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const retry2Result = await generateAndStream(retry2Prompt, controller, encoder);
                  const retry2Text = retry2Result.text;
                  if (retry2Text) {
                    combinedChunkText += `\n${retry2Text}`;
                    const retry2Weeks = extractGeneratedWeekNumbers(retry2Text);
                    const finalMissing = stillMissing.filter(w => !retry2Weeks.includes(w));
                    if (finalMissing.length > 0) {
                      console.warn(`Final missing weeks after 2 retries: ${finalMissing.join(",")}`);
                    }
                    activePhase = detectActivePhase(retry2Text, activePhase);
                  }
                }
              }

              // ─── OPTIMIZATION #2: Surgical per-week regeneration for ANEMIC weeks ───
              // After missing-weeks retries, scan for weeks that are technically present
              // but underdeveloped (too few sessions, missing key markers). Regenerate
              // ONLY those individual weeks instead of the whole chunk.
              {
                const minSessionsExpected = isVerbosePlan ? 6 : 4; // tri/trail need more
                const presentWeeks = extractGeneratedWeekNumbers(combinedChunkText);
                const anemicWeeks: number[] = [];

                for (const wNum of presentWeeks) {
                  // Extract this week's block (from "Semaine N" to next "Semaine M" or end)
                  const wRe = new RegExp(
                    `(?:^|\\n)(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*${wNum}\\b[\\s\\S]*?(?=(?:\\n(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*\\d+\\b)|$)`,
                    "i",
                  );
                  const m = combinedChunkText.match(wRe);
                  if (!m) continue;
                  const block = m[0];

                  // Heuristics: count table rows (| Lundi |, | Mardi |…) OR session bullet markers
                  const dayRows = (block.match(/\|\s*(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s*\|/gi) || []).length;
                  const bulletRows = (block.match(/^\s*[-*]\s+(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)/gim) || []).length;
                  const sessionCount = Math.max(dayRows, bulletRows);
                  // A week is anemic if it has too few sessions OR is suspiciously short
                  const blockLen = block.length;
                  const isAnemic = (sessionCount < minSessionsExpected && blockLen < 1500) || blockLen < 600;
                  if (isAnemic) {
                    anemicWeeks.push(wNum);
                    console.warn(`🔍 Anemic week detected: S${wNum} (sessions=${sessionCount}, len=${blockLen}, threshold=${minSessionsExpected})`);
                  }
                }

                // Surgical regeneration: one week at a time, max 3 to bound cost
                const weeksToFix = anemicWeeks.slice(0, 3);
                for (const wNum of weeksToFix) {
                  console.log(`🩹 Surgical regen of anemic week S${wNum}…`);
                  const surgicalRecap = extractedRecap
                    ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1200)}`
                    : "";
                  const surgicalPrompt = `${userPrompt}

⚠️ RÉGÉNÉRATION CHIRURGICALE — Régénère UNIQUEMENT la Semaine ${wNum} de manière COMPLÈTE et DÉTAILLÉE.
Cette semaine était trop pauvre (séances insuffisantes ou structure incomplète) — produis une version riche.

Exigences obligatoires :
- Minimum ${minSessionsExpected} séances réelles
- Tableau jour-par-jour complet (Lundi → Dimanche) avec : sport, type, durée, zones cibles, structure
- Marqueur 🔑 sur les séances clés (alignées L1="${planConfig?.identifiedLimitersRaw?.[0] || planConfig?.identifiedLimiters?.[0] || "—"}")
- Justification W'bal pour les séances d'intervalles supra-CP
- Cohérence de phase : ${activePhase}
${surgicalRecap}

🚫 SÉANCES CLÉS DÉJÀ UTILISÉES (varier les protocoles) :
${usedKeySessions.size > 0 ? Array.from(usedKeySessions).slice(-15).join(" • ") : "(aucune)"}

NE PAS répéter le diagnostic. Génère directement le tableau "### Semaine ${wNum}".${wbalReminder}`;

                  emitChunkBoundary();
                  await sleep(INTER_CHUNK_DELAY_MS);
                  // Use medium reasoning for surgical fixes — quality > speed here
                  const surgicalResult = await generateAndStream(
                    surgicalPrompt,
                    controller,
                    encoder,
                    PRIMARY_MODEL,
                    "medium",
                  );
                  if (surgicalResult.text) {
                    combinedChunkText += `\n${surgicalResult.text}`;
                    console.log(`✅ Week S${wNum} regenerated surgically (${surgicalResult.text.length} chars).`);
                  } else {
                    console.warn(`⚠️ Surgical regen failed for S${wNum}.`);
                  }
                }
              }

              // FIX M1 (audit): Build ENRICHED summary with limiter progression tracking
              const weekMatches = combinedChunkText.match(/^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+[^#\n]*(?:\n(?!#{1,4}\s*\*{0,2}\s*Semaine\s*\d+).*)*/gim) || [];
              const summaryLines = weekMatches.map(w => {
                const numMatch = w.match(/Semaine\s*(\d+)/i);
                const themeMatch = w.match(/[—–:\-]\s*(.+?)[\n|]/);
                // Extract key sessions (🔑) for richer context
                const keySessionMatches = w.match(/🔑[^\n|]*/g) || [];
                const keySummary = keySessionMatches.length > 0 ? ` [Clés: ${keySessionMatches.map(k => k.replace("🔑", "").trim().slice(0, 30)).join(", ")}]` : "";
                // M1: Track limiter-relevant metrics (durations, intensities, volumes)
                const durationMatches = w.match(/(\d+h?\d*['′min]*\s*(?:Z2|endurance|FatMax|seuil|tempo|SFR|force))/gi) || [];
                const durSummary = durationMatches.length > 0 ? ` [Prog: ${durationMatches.slice(0, 2).map(d => d.trim().slice(0, 25)).join(", ")}]` : "";
                return `S${numMatch?.[1] || "?"}: ${themeMatch?.[1]?.trim() || "progression"}${keySummary}${durSummary}`;
              }).join(", ");
              
              // Detect bloc headers in this chunk for phase tracking in summary
              const blocHeaders = combinedChunkText.match(/##\s*Bloc\s*\d*\s*[:—–\-]?\s*[^\n]+/gi) || [];
              const blocInfo = blocHeaders.length > 0 ? ` | Blocs: ${blocHeaders.map(h => h.replace(/^##\s*/i, "").trim().slice(0, 40)).join("; ")}` : "";
              
              // M1: Track longest Z2/endurance session for durability progression
              const z2Durations = combinedChunkText.match(/(\d+)\s*(?:h|min|'|′)\s*(?:\d+\s*(?:min|'|′))?\s*(?:Z2|endurance|FatMax|aérobie)/gi) || [];
              const maxZ2 = z2Durations.length > 0 ? ` | MaxZ2: ${z2Durations[z2Durations.length - 1]?.trim().slice(0, 20)}` : "";

              // FIX M3 (audit): Post-chunk validation — check key sessions target L1/L2
              const keySessionMatches_all = combinedChunkText.match(/🔑[^\n|]*/g) || [];
              const rawLimitersList: string[] = (planConfig?.identifiedLimitersRaw && planConfig.identifiedLimitersRaw.length > 0)
                ? planConfig.identifiedLimitersRaw
                : (planConfig?.identifiedLimiters || []);
              const L1Name = (rawLimitersList[0] || "").toLowerCase();
              const L2Name = (rawLimitersList[1] || "").toLowerCase();
              if (L1Name && keySessionMatches_all.length > 0) {
                const L1Keywords = extractLimiterKeywords(L1Name);
                const L2Keywords = L2Name ? extractLimiterKeywords(L2Name) : [];
                const keyTexts = keySessionMatches_all.map(k => k.toLowerCase());
                const L1Hits = keyTexts.filter(t => L1Keywords.some(kw => t.includes(kw))).length;
                const L2Hits = L2Keywords.length > 0 ? keyTexts.filter(t => L2Keywords.some(kw => t.includes(kw))).length : -1;
                if (L1Hits === 0) {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions (🔑) target L1="${L1Name}". Phase: ${activePhase}`);
                  pendingGuardrails.push(`Bloc précédent: 0 séance clé 🔑 ne ciblait L1="${rawLimitersList[0]}". Recentre au moins 1 séance clé/sem sur ce limiteur (mots-clés: ${L1Keywords.slice(0, 4).join(", ")}).`);
                }
                if (L2Hits === 0 && activePhase !== "Fondation" && activePhase !== "Adaptation") {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions target L2="${L2Name}" in ${activePhase} phase.`);
                  pendingGuardrails.push(`Bloc précédent: 0 séance clé 🔑 ne ciblait L2="${rawLimitersList[1]}" en phase ${activePhase}. Ajoute ≥1 séance L2 (mots-clés: ${L2Keywords.slice(0, 4).join(", ")}).`);
                }
              }
              
              chunkSummaries.push(`Semaines ${chunk.start}-${chunk.end} [Phase: ${activePhase}${blocInfo}${maxZ2}]: ${summaryLines || "Plan progressif standard"}`);

              // AUDIT FIX #4 + #5: Update global memory + register key sessions for anti-redundancy
              const blocLabels = blocHeaders.map(h => h.replace(/^##\s*/i, "").trim().slice(0, 50));
              const topSessions = keySessionMatches_all
                .map(k => k.replace(/🔑/g, "").replace(/[|]/g, "").trim())
                .filter(s => s.length > 0)
                .map(s => s.slice(0, 50));
              updateGlobalMemory(ci, `S${chunk.start}-S${chunk.end}`, activePhase, blocLabels, topSessions);
              topSessions.forEach(s => {
                const norm = s.toLowerCase().replace(/\s+/g, " ").trim();
                if (norm.length >= 6) usedKeySessions.add(norm);
              });

              // ─── OPTIMIZATION #4: Compute metrics & build guardrails for NEXT chunk ───
              const prevTSS = chunkMetricsHistory.length > 0
                ? chunkMetricsHistory[chunkMetricsHistory.length - 1].estimatedTSS
                : null;
              const metrics = computeChunkMetrics(combinedChunkText, ci, `S${chunk.start}-S${chunk.end}`, prevTSS);
              chunkMetricsHistory.push(metrics);
              console.log(`📊 Chunk ${ci + 1} metrics: TSS=${metrics.estimatedTSS}, avgH/wk=${metrics.avgWeeklyHours}, intensityZ3+=${metrics.intensityRatioPct}%, prog=${metrics.progressionVsPrevPct ?? "n/a"}%`);
              const newGuardrails = buildFeedbackGuardrails(metrics, activePhase);
              if (newGuardrails.length > 0) {
                console.log(`🛟 ${newGuardrails.length} guardrail(s) queued for chunk ${ci + 2}`);
                pendingGuardrails.push(...newGuardrails);
              }
            }

            // Send final [DONE]
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("Chunked generation error:", e);
            controller.error(e);
          }
        },
      });


      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === SINGLE GENERATION for short plans / regenerateWeek ===
    // FIX: Inject race week obligation for single-gen plans too
    let singleGenPrompt = userPrompt;
    if (!regenerateWeek && planConfig?.raceGoals && planConfig.raceGoals.length > 0) {
      const raceGoalReminders: string[] = [];
      for (const goal of planConfig.raceGoals) {
        if (!goal.raceDate || !planConfig.planStartDate) continue;
        const startMs = parseIsoDateUtc(planConfig.planStartDate);
        const raceMs = parseIsoDateUtc(goal.raceDate);
        if (startMs === undefined || raceMs === undefined) continue;
        const days = Math.round((raceMs - startMs) / (24 * 3600 * 1000));
        const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
        if (goalWeek >= 1 && goalWeek <= totalWeeks) {
          const prio = goal.priority === "A" ? "🅰️" : goal.priority === "B" ? "🅱️" : "🆎";
          raceGoalReminders.push(`${prio} ${goal.objective || goal.raceName || "Course"} : S${goalWeek} DOIT inclure "🏁 COURSE OBJECTIF" le ${goal.raceDate}. Minimum 5 séances réelles. Race Week complète obligatoire.`);
        }
      }
      if (raceGoalReminders.length > 0) {
        singleGenPrompt += `\n\n🚨 RACE WEEK OBLIGATION (PRIORITÉ ABSOLUE) :\n${raceGoalReminders.join("\n")}`;
      }
    }
    singleGenPrompt += wbalReminder;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: singleGenPrompt },
        ],
        stream: true,
        max_tokens: 65536,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit dépassé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-training-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


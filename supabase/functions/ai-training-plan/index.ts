import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizeObjKey, normalizeAmbKey, extractLimiterKeywords } from "./sportRatioMatrix.ts";
import { getSystemPrompt } from "./systemPrompt.ts";
import {
  buildUserPrompt,
  buildCPWprimeSection,
  computeCPWprime,
  buildStructuredDiagnosticBlock,
  extractStrategicRecap,
  detectActivePhase,
  validateChunk1HasRecap,
} from "./promptHelpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { athleteData, planConfig, regenerateWeek, workoutCatalog, phaseCatalogs, catalogDurationStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = getSystemPrompt();
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

    const totalWeeks = planConfig?.weeksAvailable || 12;
    // Use smaller chunks for triathlon (very verbose output with multi-session days)
    const obj = (planConfig?.objective || "").toUpperCase();
    // Detect verbose plans: triathlon multi-sport plans generate much more text per week
    const isVerbosePlan = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
    // Dynamic chunk sizing: larger chunks = fewer API calls + better context retention
    // Gemini Flash supports 65k output tokens; ~3-4k tokens/week (verbose) or ~1.5-2k (standard)
    const CHUNK_SIZE = isVerbosePlan ? 6 : 8;
    const needsChunking = !regenerateWeek && totalWeeks > 12;

    // FIX #1: Deduplicate CP/W' — reuse buildCPWprimeSection's logic via shared helper
    const cpwResult = computeCPWprime(athleteData);
    const cpRound = cpwResult?.cpRound ?? null;
    const effectiveCPVal = cpwResult?.effectiveCP ?? null;
    const wprimeKJ = cpwResult?.wprimeKJ ?? null;
    const wEffKJ = cpwResult ? Math.round(cpwResult.wprimeEffJ / 100) / 10 : null;

    // FIX #6: Per-chunk timeout (4 min per chunk call)
    const CHUNK_TIMEOUT_MS = 4 * 60 * 1000;

    // Helper: call AI and stream response, return full text
    let streamError: { code: number; message: string } | null = null;
    async function generateAndStream(
      prompt: string,
      controller: ReadableStreamDefaultController,
      encoder: TextEncoder,
    ): Promise<string> {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), CHUNK_TIMEOUT_MS);

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            stream: true,
            max_tokens: 65536,
          }),
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

          return "";
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let buf = "";

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
              if (token) {
                text += token;
                controller.enqueue(encoder.encode(line + "\n\n"));
              }
            } catch {}
          }
        }
        return text;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.error("Chunk generation timed out after", CHUNK_TIMEOUT_MS, "ms");
          streamError = { code: 504, message: "Timeout: le bloc a pris trop de temps à générer." };
        }
        return "";
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
            // FIX C1 (audit): Initialize activePhase from ambition — finisher starts in "Adaptation", not "Fondation"
            const ambKeyForPhase = normalizeAmbKey(planConfig?.ambition || "");
            let activePhase = (ambKeyForPhase === "finisher") ? "Adaptation" : "Fondation";
            const chunks: { start: number; end: number }[] = [];
            for (let s = 1; s <= totalWeeks; s += CHUNK_SIZE) {
              chunks.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
            }

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

              // Phase-specific workout catalog for this chunk
              const chunkPhaseCatalog = getWorkoutCatalogForPhase(activePhase);

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
IMPORTANT : Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines (${expectedWeeks.join(", ")}). Ne t'arrête pas avant.${wbalReminder}`;

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

Résumé des blocs précédents (progression récente) :
${slidingSummary || "Premier bloc de continuation."}

Assure la PROGRESSION LOGIQUE du volume et de l'intensité par rapport aux semaines précédentes.${wbalReminder}`;
              }

              if (!isFirst) emitChunkBoundary();

              // Generate chunk
              const chunkText = await generateAndStream(chunkPrompt, controller, encoder);
              let combinedChunkText = chunkText;

              if (!chunkText) {
                // If this chunk failed, try to continue with remaining chunks instead of breaking
                console.error(`Chunk ${ci + 1}/${chunks.length} failed (empty response). StreamError: ${streamError?.message || "none"}`);
                if (streamError && (streamError.code === 402 || streamError.code === 429)) {
                  // Credit/rate limit errors — stop entirely
                  const errorPayload = `{"error":"${streamError.message}","code":${streamError.code}}`;
                  controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                  break;
                }
                // For timeouts or transient errors, try one more time with a smaller scope
                console.log(`Retrying full chunk ${ci + 1} after failure...`);
                streamError = null;
                const retryChunkText = await generateAndStream(chunkPrompt, controller, encoder);
                if (!retryChunkText) {
                  console.error(`Chunk ${ci + 1} retry also failed. Skipping to next chunk.`);
                  continue; // Skip this chunk, let the gap-filling in parser handle it
                }
                combinedChunkText = retryChunkText;
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
                
                // FIX #6 (audit recap): Validate chunk 1 output quality
                const validation = validateChunk1HasRecap(chunkText);
                if (!validation.hasRecap) {
                  console.warn("⚠️ Chunk 1 is missing Récapitulatif Stratégique section");
                }
                if (!validation.hasPhases) {
                  console.warn("⚠️ Chunk 1 Récapitulatif has no phase boundaries (SN-SM patterns)");
                }
                if (extractedRecap) {
                  console.log(`✅ Extracted strategic recap (${extractedRecap.length} chars)`);
                } else {
                  console.warn("⚠️ Failed to extract strategic recap — subsequent chunks will lack periodization context");
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

🔄 PHASE ACTIVE : ${activePhase}

Contexte des semaines déjà générées :
${slidingSummary}
${generatedWeeks.length > 0 ? `Semaines déjà générées dans ce bloc : ${generatedWeeks.join(", ")}` : ""}

Assure la CONTINUITÉ de la progression.${wbalReminder}`;

                emitChunkBoundary();
                const retryText = await generateAndStream(retryPrompt, controller, encoder);
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

🔄 PHASE ACTIVE : ${activePhase}

Contexte : ${slidingSummary}
Semaines déjà générées : ${[...generatedWeeks, ...allRetryWeeks].sort((a, b) => a - b).join(", ")}${wbalReminder}`;

                  emitChunkBoundary();
                  const retry2Text = await generateAndStream(retry2Prompt, controller, encoder);
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
              const L1Name = (planConfig?.identifiedLimiters?.[0] || "").toLowerCase();
              const L2Name = (planConfig?.identifiedLimiters?.[1] || "").toLowerCase();
              if (L1Name && keySessionMatches_all.length > 0) {
                const L1Keywords = extractLimiterKeywords(L1Name);
                const L2Keywords = L2Name ? extractLimiterKeywords(L2Name) : [];
                const keyTexts = keySessionMatches_all.map(k => k.toLowerCase());
                const L1Hits = keyTexts.filter(t => L1Keywords.some(kw => t.includes(kw))).length;
                const L2Hits = L2Keywords.length > 0 ? keyTexts.filter(t => L2Keywords.some(kw => t.includes(kw))).length : -1;
                if (L1Hits === 0) {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions (🔑) target L1="${L1Name}". Phase: ${activePhase}`);
                }
                if (L2Hits === 0 && activePhase !== "Fondation" && activePhase !== "Adaptation") {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions target L2="${L2Name}" in ${activePhase} phase.`);
                }
              }
              
              chunkSummaries.push(`Semaines ${chunk.start}-${chunk.end} [Phase: ${activePhase}${blocInfo}${maxZ2}]: ${summaryLines || "Plan progressif standard"}`);
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
          { role: "user", content: userPrompt },
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


/**
 * Plan Suggestion Simulator
 * Generates a simulated "advised plan" based on annotations
 * WITHOUT modifying the original template
 */

import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import type { AnnotationV2 } from "@/lib/annotationEngineV2";

// ============= TYPES =============

export type ChangeType = 
  | "REPLACE"      // Replace session type/content
  | "REDUCE"       // Reduce duration
  | "MOVE"         // Move session in week
  | "ADD_RECOVERY" // Insert recovery after
  | "FRACTIONATE"  // Split into smaller blocks
  | "INTENSITY_DOWN"; // Reduce intensity level

export interface SessionDiff {
  weekNumber: number;
  sessionDay: string;
  sessionIndex: number;
  changeType: ChangeType;
  from: {
    sport: string;
    type: string;
    duration: string;
    title: string;
  };
  to: {
    sport: string;
    type: string;
    duration: string;
    title: string;
  };
  reason: {
    annotationId: string;
    title: string;
    why: string;
  };
  confidence: number;
}

export interface SimulatedPlan {
  advisedWeeks: TemplateWeek[];
  diffMap: SessionDiff[];
  impactSummary: ImpactSummary;
}

export interface ImpactSummary {
  glycolyticRiskReduction: string | null;
  durabilityImprovement: string | null;
  injuryRiskReduction: string | null;
  coherenceImprovement: string | null;
  nutritionRiskReduction: string | null;
  overallConfidence: number;
  totalChanges: number;
}

// ============= HELPERS =============

function parseDurationFromText(text: string): number {
  if (!text) return 0;
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const h = parseInt(hourMinMatch[1], 10);
    const m = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return h * 60 + m;
  }
  const minMatch = text.match(/(\d+)['′]/);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 0;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function reduceDuration(text: string, reductionPercent: number): string {
  const duration = parseDurationFromText(text);
  if (duration === 0) return text;
  const newDuration = Math.round(duration * (1 - reductionPercent));
  const formatted = formatDuration(newDuration);
  // Replace duration pattern in text
  const replaced = text
    .replace(/\d+h\d+/gi, formatted)
    .replace(/\d+h(?!\d)/gi, formatted)
    .replace(/\d+['′]/g, formatted);
  return replaced === text ? `${formatted} (réduit)` : replaced;
}

function detectSessionType(session: TemplateSession): string {
  const combined = `${session.title || ""} ${session.details || ""}`.toLowerCase();
  if (combined.includes("vo2") || combined.includes("vma") || combined.includes("30/30")) return "VO2";
  if (combined.includes("seuil") || combined.includes("threshold")) return "THRESHOLD";
  if (combined.includes("tempo")) return "TEMPO";
  if (combined.includes("force") || combined.includes("côte")) return "FORCE";
  if (combined.includes("brick") || combined.includes("enchaînement")) return "BRICK";
  if (combined.includes("long") || combined.includes("sortie longue")) return "LONG";
  if (combined.includes("z2") || combined.includes("endurance")) return "Z2";
  return "OTHER";
}

function getConservativeReplacement(sessionType: string): { type: string; title: string } {
  switch (sessionType) {
    case "VO2":
      return { type: "TEMPO", title: "Tempo long stable" };
    case "THRESHOLD":
      return { type: "TEMPO", title: "Tempo modéré" };
    case "FORCE":
      return { type: "Z2", title: "Endurance + technique" };
    case "BRICK":
      return { type: "BRICK_LIGHT", title: "Brick allégé" };
    default:
      return { type: sessionType, title: "Session adaptée" };
  }
}

// ============= OPTION PARSING =============

interface ParsedOption {
  action: ChangeType;
  target?: string;
  value?: string;
}

function parseAnnotationOption(option: string): ParsedOption | null {
  const lower = option.toLowerCase();
  
  // Reduction patterns
  if (lower.includes("réduire") || lower.includes("diminuer") || lower.includes("raccourcir") || lower.includes("limiter")) {
    if (lower.includes("vo2") || lower.includes("vma")) {
      return { action: "REPLACE", target: "VO2" };
    }
    if (lower.includes("durée") || lower.includes("volume")) {
      return { action: "REDUCE" };
    }
    if (lower.includes("intensité")) {
      return { action: "INTENSITY_DOWN" };
    }
    return { action: "REDUCE" };
  }
  
  // Replace patterns
  if (lower.includes("supprimer") || lower.includes("remplacer")) {
    if (lower.includes("vo2") || lower.includes("vma")) {
      return { action: "REPLACE", target: "VO2", value: "TEMPO" };
    }
    if (lower.includes("intensité")) {
      return { action: "REPLACE", target: "INTENSITY" };
    }
    return { action: "REPLACE" };
  }
  
  // Add patterns
  if (lower.includes("ajouter") || lower.includes("augmenter")) {
    if (lower.includes("z2") || lower.includes("récupération") || lower.includes("endurance")) {
      return { action: "ADD_RECOVERY" };
    }
  }
  
  // Fractionate patterns
  if (lower.includes("fractionner") || lower.includes("découper") || lower.includes("split")) {
    return { action: "FRACTIONATE" };
  }
  
  return null;
}

// ============= MAIN SIMULATOR =============

export function simulateAdvisedPlan(
  planWeeks: TemplateWeek[],
  annotations: AnnotationV2[]
): SimulatedPlan {
  // Deep clone weeks
  const advisedWeeks: TemplateWeek[] = JSON.parse(JSON.stringify(planWeeks));
  const diffMap: SessionDiff[] = [];
  
  // Track metrics for impact summary
  let glycolyticChanges = 0;
  let durabilityChanges = 0;
  let injuryRiskChanges = 0;
  let coherenceChanges = 0;
  let nutritionChanges = 0;
  let totalConfidence = 0;
  
  // Process annotations that have actionable options
  for (const annotation of annotations) {
    if (annotation.options.length === 0) continue;
    
    // Get the most conservative option (first one by convention)
    const conservativeOption = annotation.options[0];
    const parsed = parseAnnotationOption(conservativeOption);
    if (!parsed) continue;
    
    // Apply based on scope
    if (annotation.scope === "SESSION" && annotation.weekNumber && annotation.day) {
      const weekIdx = advisedWeeks.findIndex(w => w.weekNumber === annotation.weekNumber);
      if (weekIdx === -1) continue;
      
      const week = advisedWeeks[weekIdx];
      const sessionIdx = week.sessions.findIndex(s => 
        s.day === annotation.day || 
        (annotation.sessionTitle && (s.title?.includes(annotation.sessionTitle) || annotation.sessionTitle.includes(s.title || "")))
      );
      if (sessionIdx === -1) continue;
      
      const session = week.sessions[sessionIdx];
      const originalSession = { ...session };
      const sessionType = detectSessionType(session);
      
      // Apply change based on parsed action
      let applied = false;
      let changeType: ChangeType = parsed.action;
      
      switch (parsed.action) {
        case "REDUCE":
          const newDetails = reduceDuration(session.details || "", 0.2);
          if (newDetails !== session.details) {
            session.details = newDetails;
            applied = true;
          }
          break;
          
        case "REPLACE":
          if (parsed.target === "VO2" && sessionType === "VO2") {
            const replacement = getConservativeReplacement("VO2");
            session.title = replacement.title;
            session.type = replacement.type;
            applied = true;
          } else if (sessionType !== "Z2" && sessionType !== "OTHER") {
            const replacement = getConservativeReplacement(sessionType);
            session.title = replacement.title;
            session.type = replacement.type;
            applied = true;
          }
          break;
          
        case "INTENSITY_DOWN":
          session.title = `${session.title || ""} (intensité réduite)`;
          applied = true;
          break;
          
        case "FRACTIONATE":
          const duration = parseDurationFromText(session.details || "");
          if (duration > 60) {
            const halfDuration = formatDuration(Math.floor(duration / 2));
            session.details = `${halfDuration} + récup + ${halfDuration} (fractionné)`;
            applied = true;
          }
          break;
      }
      
      if (applied) {
        diffMap.push({
          weekNumber: annotation.weekNumber!,
          sessionDay: annotation.day!,
          sessionIndex: sessionIdx,
          changeType,
          from: {
            sport: originalSession.sport || originalSession.discipline || "",
            type: sessionType,
            duration: originalSession.details || "",
            title: originalSession.title || "",
          },
          to: {
            sport: session.sport || session.discipline || "",
            type: session.type || sessionType,
            duration: session.details || "",
            title: session.title || "",
          },
          reason: {
            annotationId: annotation.id,
            title: annotation.title,
            why: annotation.why,
          },
          confidence: annotation.confidence,
        });
        
        totalConfidence += annotation.confidence;
        
        // Categorize changes for impact summary
        const annLower = annotation.id.toLowerCase();
        if (annLower.includes("vlamax") || annLower.includes("glyco") || annLower.includes("vo2")) {
          glycolyticChanges++;
        }
        if (annLower.includes("tte") || annLower.includes("durabil")) {
          durabilityChanges++;
        }
        if (annLower.includes("injury") || annLower.includes("blessure") || annLower.includes("mécanique")) {
          injuryRiskChanges++;
        }
        if (annLower.includes("nutri")) {
          nutritionChanges++;
        }
        coherenceChanges++;
      }
    }
    
    // Handle WEEK-level annotations
    else if (annotation.scope === "WEEK" && annotation.weekNumber) {
      const weekIdx = advisedWeeks.findIndex(w => w.weekNumber === annotation.weekNumber);
      if (weekIdx === -1) continue;
      
      const week = advisedWeeks[weekIdx];
      
      // Find high-intensity sessions to potentially modify
      const intenseSessions = week.sessions
        .map((s, idx) => ({ session: s, idx, type: detectSessionType(s) }))
        .filter(s => ["VO2", "THRESHOLD", "FORCE"].includes(s.type));
      
      if (intenseSessions.length > 0 && parsed.action === "REDUCE") {
        // Reduce the last intense session
        const target = intenseSessions[intenseSessions.length - 1];
        const originalSession = { ...target.session };
        const newDetails = reduceDuration(target.session.details || "", 0.15);
        
        if (newDetails !== target.session.details) {
          target.session.details = newDetails;
          
          diffMap.push({
            weekNumber: annotation.weekNumber!,
            sessionDay: target.session.day,
            sessionIndex: target.idx,
            changeType: "REDUCE",
            from: {
              sport: originalSession.sport || originalSession.discipline || "",
              type: target.type,
              duration: originalSession.details || "",
              title: originalSession.title || "",
            },
            to: {
              sport: target.session.sport || target.session.discipline || "",
              type: target.type,
              duration: target.session.details || "",
              title: target.session.title || "",
            },
            reason: {
              annotationId: annotation.id,
              title: annotation.title,
              why: annotation.why,
            },
            confidence: annotation.confidence,
          });
          
          totalConfidence += annotation.confidence;
          coherenceChanges++;
        }
      }
    }
  }
  
  // Build impact summary
  const totalChanges = diffMap.length;
  const avgConfidence = totalChanges > 0 ? totalConfidence / totalChanges : 0;
  
  const impactSummary: ImpactSummary = {
    glycolyticRiskReduction: glycolyticChanges > 0 
      ? `Réduit le risque glycolytique (${glycolyticChanges} modification${glycolyticChanges > 1 ? "s" : ""})`
      : null,
    durabilityImprovement: durabilityChanges > 0 
      ? `Améliore la cohérence durabilité (${durabilityChanges} ajustement${durabilityChanges > 1 ? "s" : ""})`
      : null,
    injuryRiskReduction: injuryRiskChanges > 0 
      ? `Réduit le risque blessure (${injuryRiskChanges} adaptation${injuryRiskChanges > 1 ? "s" : ""})`
      : null,
    coherenceImprovement: coherenceChanges > 0 
      ? `Améliore la cohérence objectif (${coherenceChanges} modification${coherenceChanges > 1 ? "s" : ""})`
      : null,
    nutritionRiskReduction: nutritionChanges > 0 
      ? `Améliore la préparation nutrition (${nutritionChanges} ajustement${nutritionChanges > 1 ? "s" : ""})`
      : null,
    overallConfidence: Math.round(avgConfidence * 100),
    totalChanges,
  };
  
  return { advisedWeeks, diffMap, impactSummary };
}

// ============= EXPORT HELPERS =============

export function formatDiffForExport(diff: SessionDiff): string {
  return `S${diff.weekNumber} ${diff.sessionDay}: ${diff.from.title || diff.from.type} → ${diff.to.title || diff.to.type}
  Raison: ${diff.reason.title}
  Détail: ${diff.reason.why}`;
}

export function generateComparisonText(
  originalWeeks: TemplateWeek[],
  advisedWeeks: TemplateWeek[],
  diffMap: SessionDiff[],
  impactSummary: ImpactSummary
): string {
  let output = "=== COMPARAISON PLAN BRUT vs PLAN CONSEILLÉ ===\n\n";
  
  output += "--- RÉSUMÉ DES MODIFICATIONS ---\n";
  output += `Total: ${impactSummary.totalChanges} modification(s)\n`;
  output += `Confiance globale: ${impactSummary.overallConfidence}%\n\n`;
  
  if (impactSummary.glycolyticRiskReduction) output += `• ${impactSummary.glycolyticRiskReduction}\n`;
  if (impactSummary.durabilityImprovement) output += `• ${impactSummary.durabilityImprovement}\n`;
  if (impactSummary.injuryRiskReduction) output += `• ${impactSummary.injuryRiskReduction}\n`;
  if (impactSummary.coherenceImprovement) output += `• ${impactSummary.coherenceImprovement}\n`;
  if (impactSummary.nutritionRiskReduction) output += `• ${impactSummary.nutritionRiskReduction}\n`;
  
  output += "\n--- DÉTAIL DES CHANGEMENTS ---\n\n";
  
  for (const diff of diffMap) {
    output += formatDiffForExport(diff) + "\n\n";
  }
  
  output += "\n--- PLAN CONSEILLÉ (RÉSUMÉ) ---\n\n";
  
  for (const week of advisedWeeks) {
    const weekDiffs = diffMap.filter(d => d.weekNumber === week.weekNumber);
    output += `Semaine ${week.weekNumber}${weekDiffs.length > 0 ? ` (${weekDiffs.length} modification${weekDiffs.length > 1 ? "s" : ""})` : ""}\n`;
    for (const session of week.sessions) {
      const isModified = weekDiffs.some(d => d.sessionDay === session.day);
      output += `  ${isModified ? "🔄 " : ""}${session.day}: ${session.sport || session.discipline} - ${session.title || session.details?.slice(0, 40) || ""}\n`;
    }
    output += "\n";
  }
  
  output += "\n⚠️ SIMULATION - Le coach décide de l'application des modifications.\n";
  
  return output;
}

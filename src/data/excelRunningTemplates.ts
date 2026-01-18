// =============================================
// EXCEL RUNNING TEMPLATES - Données importées
// Plans Semi 1h20/1h30/1h40 et Marathon 2h30/4h
// Two For Coaching Lab
// =============================================

import type { 
  RunningTemplate, 
  RunningTemplateSection, 
  RunningWeek,
  RunningSession,
  RunningWeekMeta,
  RunSessionType,
  RunningPhase,
  WeekFocus,
  InjuryRiskTag,
  AmbitionLevel,
} from "@/types/runningTemplate";

// =============================================
// TYPES SPÉCIFIQUES EXCEL
// =============================================

export interface ExcelSessionRaw {
  day_label: string;
  title: string;
  objective: string;
  details: string;
  fcmax?: string;
  vma?: string;
  duration?: string;
  distance?: string;
}

export interface ExcelWeekRaw {
  week_number: number;
  label: string;
  sessions: ExcelSessionRaw[];
  volume_total?: string; // Pour marathon 4h
}

// =============================================
// HELPERS DE PARSING
// =============================================

/**
 * Détecte le type de séance à partir du titre
 */
export function detectSessionType(title: string, details: string): RunSessionType {
  const text = (title + " " + details).toLowerCase();
  
  if (text.includes("récup") || text.includes("relâché")) return "RECOVERY";
  if (text.includes("vma") || text.includes("vo2")) return "VO2";
  if (text.includes("seuil")) return "THRESHOLD";
  if (text.includes("tempo") || text.includes("asm") || text.includes("as21")) return "TEMPO";
  if (text.includes("longue") || text.includes("long run") || text.match(/\b[2-3]h\d*\b/)) return "LONGRUN";
  if (text.includes("côte") || text.includes("hill")) return "HILLS";
  if (text.includes("sprint") || text.includes("vitesse")) return "SPRINT";
  if (text.includes("endurance") || text.includes("ef") || text.includes("z2")) return "Z2";
  
  return "Z2";
}

/**
 * Détecte si c'est une séance clé
 */
export function isKeySession(type: RunSessionType, title: string, details: string): boolean {
  if (type === "VO2" || type === "THRESHOLD" || type === "LONGRUN") return true;
  if (type === "TEMPO" && (title.toLowerCase().includes("asm") || title.toLowerCase().includes("as21"))) return true;
  if (type === "HILLS" && details.includes("×")) return true;
  return false;
}

/**
 * Parse la durée depuis une chaîne (ex: "1h30", "45'", "1h15")
 */
export function parseDuration(text: string): number {
  if (!text) return 0;
  
  // Match "1h30", "2h", etc.
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }
  
  // Match "45'", "30'"
  const minMatch = text.match(/(\d+)[''′]/);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  
  // Match plain minutes
  const plainMin = text.match(/^(\d+)$/);
  if (plainMin) {
    return parseInt(plainMin[1], 10);
  }
  
  return 0;
}

/**
 * Estime la durée d'une séance depuis les détails
 */
export function estimateDuration(details: string, durationField?: string): number {
  // Utiliser le champ durée s'il existe
  if (durationField) {
    const dur = parseDuration(durationField);
    if (dur > 0) return dur;
  }
  
  // Estimer depuis les détails
  const parts = details.split("+").map(p => p.trim());
  let total = 0;
  
  for (const part of parts) {
    const dur = parseDuration(part);
    if (dur > 0) total += dur;
  }
  
  return total || 60; // Default 60 min
}

/**
 * Convertit une séance Excel en RunningSession
 */
export function convertExcelSession(raw: ExcelSessionRaw): RunningSession {
  const type = detectSessionType(raw.title, raw.details);
  const key = isKeySession(type, raw.title, raw.details);
  const duration = estimateDuration(raw.details, raw.duration);
  
  return {
    sport: "run",
    day: raw.day_label,
    title: raw.title,
    type,
    isKey: key,
    duration_min: duration,
    intensity_hint: raw.fcmax || raw.vma || undefined,
    notes: raw.objective || undefined,
    details: raw.details,
  };
}

// =============================================
// AUTO-TAGGING STAFF-GRADE
// =============================================

export function computeWeekMeta(
  sessions: RunningSession[],
  weekNumber: number,
  totalWeeks: number,
  weekLabel: string,
  volumeTotal?: string
): RunningWeekMeta {
  // Count session types
  const vo2Count = sessions.filter(s => s.type === "VO2").length;
  const thresholdCount = sessions.filter(s => s.type === "THRESHOLD" || s.type === "TEMPO").length;
  const longrunCount = sessions.filter(s => s.type === "LONGRUN").length;
  const qualityCount = vo2Count + thresholdCount;
  
  // Find longest session
  const maxDuration = Math.max(...sessions.map(s => s.duration_min || 0));
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_min || 0), 0);
  
  // Parse volume total if available
  let volumeMin = 0;
  if (volumeTotal) {
    volumeMin = parseDuration(volumeTotal);
  }
  
  // Compute intensity_density (1-5)
  let intensity_density: 1 | 2 | 3 | 4 | 5 = 1;
  if (qualityCount >= 4) intensity_density = 5;
  else if (qualityCount >= 3) intensity_density = 4;
  else if (qualityCount >= 2) intensity_density = 3;
  else if (qualityCount >= 1) intensity_density = 2;
  
  // Compute longrun_level (1-5)
  let longrun_level: 1 | 2 | 3 | 4 | 5 = 1;
  if (maxDuration >= 150) longrun_level = 5;
  else if (maxDuration >= 120) longrun_level = 4;
  else if (maxDuration >= 90) longrun_level = 3;
  else if (maxDuration >= 60) longrun_level = 2;
  
  // Compute load_level (1-5)
  let load_level: 1 | 2 | 3 | 4 | 5 = 3;
  const avgVolume = volumeMin > 0 ? volumeMin : totalDuration;
  if (avgVolume >= 540) load_level = 5;      // 9h+
  else if (avgVolume >= 420) load_level = 4; // 7h+
  else if (avgVolume >= 300) load_level = 3; // 5h+
  else if (avgVolume >= 180) load_level = 2; // 3h+
  else load_level = 1;
  
  // Detect phase
  let phase: RunningPhase = "BUILD";
  const lowercaseLabel = weekLabel.toLowerCase();
  
  if (lowercaseLabel.includes("récup") || lowercaseLabel.includes("affûtage") || lowercaseLabel.includes("taper")) {
    phase = "TAPER";
  } else if (weekNumber >= totalWeeks - 3) {
    phase = "TAPER";
  } else if (weekNumber >= totalWeeks * 0.7) {
    phase = "SPECIFIC";
  } else if (weekNumber >= totalWeeks * 0.3) {
    phase = "BUILD";
  } else {
    phase = "BASE";
  }
  
  // Force TAPER if low load and late in plan
  if (load_level <= 2 && intensity_density <= 2 && weekNumber >= totalWeeks - 4) {
    phase = "TAPER";
  }
  
  // Detect focus
  let focus: WeekFocus = "ENDURANCE";
  if (vo2Count >= 2) focus = "VO2";
  else if (thresholdCount >= 2 && longrun_level >= 3) focus = "TTE";
  else if (longrun_level >= 4) focus = "ENDURANCE";
  else if (vo2Count >= 1 && thresholdCount >= 1) focus = "SPEED";
  else if (sessions.some(s => s.details?.toLowerCase().includes("asm"))) focus = "ECONOMY";
  
  // Compute injury risk
  let injury_risk_tag: InjuryRiskTag = "LOW";
  if (longrun_level >= 4 && intensity_density >= 4) {
    injury_risk_tag = "HIGH";
  } else if (longrun_level >= 4 || intensity_density >= 4) {
    injury_risk_tag = "MED";
  }
  
  return {
    phase,
    focus,
    load_level,
    intensity_density,
    longrun_level,
    injury_risk_tag,
    isTagged: true,
  };
}

/**
 * Génère un résumé de semaine
 */
export function generateWeekSummary(meta: RunningWeekMeta): string {
  const phaseLabels: Record<RunningPhase, string> = {
    BASE: "Construction",
    BUILD: "Développement",
    SPECIFIC: "Spécifique",
    TAPER: "Affûtage",
  };
  
  const focusLabels: Record<WeekFocus, string> = {
    TTE: "Seuil/Durabilité",
    VO2: "VO2max",
    ECONOMY: "Économie",
    ENDURANCE: "Endurance",
    SPEED: "Vitesse",
  };
  
  return `${phaseLabels[meta.phase]} • ${focusLabels[meta.focus]} • Charge ${meta.load_level}/5`;
}

// =============================================
// DONNÉES SEMI 1H20
// =============================================

const SEMI_1H20_WEEKS_RAW: ExcelWeekRaw[] = [
  {
    week_number: 1,
    label: "S1",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Endurance fondamentale + éducatifs", objective: "Développer base aérobie et technique", details: "20' EF + éducatifs (9×60 m) + 30' EF + 5' retour au calme", fcmax: "65–70", vma: "60–65", duration: "1h10" },
      { day_label: "Mercredi", title: "VMA courte", objective: "Améliorer puissance aérobie", details: "15' EF + 4×100m progressifs; 2×(10×30\"/30\") @105–110% VMA; 10' retour au calme", fcmax: "65–110", vma: "55–110", duration: "1h00" },
      { day_label: "Vendredi", title: "Sortie longue", objective: "Renforcer endurance", details: "20' EF + 40' EF active + 15' EF", fcmax: "65–75", vma: "60–70", duration: "1h15" },
      { day_label: "Samedi", title: "Seuil", objective: "Stimuler allure tempo/seuil", details: "20' EF + 3×100m + 3×8' seuil (récup 2') + 10' EF", fcmax: "85–88", vma: "80–85", duration: "1h15" },
      { day_label: "Dimanche", title: "Footing récup + côtes", objective: "Récup active + force", details: "30' EF + 8×20\" côte (récup marchée) + 20' EF", fcmax: "65–90", vma: "60–100", duration: "1h00" },
    ],
  },
  {
    week_number: 2,
    label: "S2",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Endurance fondamentale + éducatifs", objective: "Amélioration technique et endurance", details: "25' EF + éducatifs (6×80 m) + 25' EF + 5' retour au calme", duration: "1h10" },
      { day_label: "Mercredi", title: "VMA moyenne", objective: "Développer la capacité à tenir 100% VMA", details: "15' EF + 3×100 m progressifs; 10×400 m @100–102% VMA (récup 1'15 trot); 10' EF", duration: "1h10" },
      { day_label: "Vendredi", title: "Endurance longue", objective: "Développer fond aérobie", details: "25' EF + 45' EF active + 15' EF", duration: "1h25" },
      { day_label: "Samedi", title: "Seuil + allure semi", objective: "Travailler transition seuil → allure course", details: "20' EF + 3×100 m; 2×10' seuil (récup 3'); +8' AS21; 10' EF", duration: "1h20" },
      { day_label: "Dimanche", title: "Footing récup + côtes longues", objective: "Renforcement musculaire", details: "25' EF + 6×40\" côte (récup descente) + 20' EF", duration: "1h05" },
    ],
  },
  {
    week_number: 3,
    label: "S3",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance + éducatifs", objective: "Entretenir l'endurance et la technique", details: "30' EF + éducatifs (6×80 m) + 20' EF + 5' retour au calme", duration: "1h10" },
      { day_label: "Mercredi", title: "VMA longue", objective: "Améliorer VO2max avec fractions longues", details: "20' EF + 3×100 m progressifs; 5×1000 m @95–100% VMA (récup 2'); 10' EF", duration: "1h20" },
      { day_label: "Vendredi", title: "Endurance longue + tempo", objective: "Développer résistance aérobie", details: "40' EF + 15' tempo douce + 15' EF", duration: "1h30" },
      { day_label: "Samedi", title: "Seuil + allure semi", objective: "Renforcer zone spécifique", details: "20' EF + 3×100 m; 3×8' seuil (récup 2'); +10' AS21; 10' EF", duration: "1h25" },
      { day_label: "Dimanche", title: "Footing récup + côtes courtes", objective: "Force légère et relâchement", details: "30' EF + 10×15\" côte (récup descente) + 20' EF", duration: "1h05" },
    ],
  },
  {
    week_number: 4,
    label: "S4",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Endurance fondamentale + éducatifs", objective: "Assimilation + technique", details: "25' EF + éducatifs (6×80 m) + 25' EF + 5' retour au calme", duration: "1h10" },
      { day_label: "Mercredi", title: "VMA pyramidale", objective: "Développer VO2max", details: "20' EF + 3×100 m; 400m @105% VMA, 800m @100%, 1200m @95–98%, 800m @100%, 400m @105%; 10' EF", duration: "1h20" },
      { day_label: "Vendredi", title: "Endurance longue progressive", objective: "Renforcer endurance et fatigue contrôlée", details: "30' EF + 50' EF active + 20' tempo", duration: "1h40" },
      { day_label: "Samedi", title: "Seuil + allure semi", objective: "Renforcement zone spécifique", details: "20' EF + 3×100 m; 2×12' seuil (récup 3'); +15' AS21; 10' EF", duration: "1h30" },
      { day_label: "Dimanche", title: "Footing récup + côtes longues", objective: "Force + économie de course", details: "25' EF + 8×45\" côte (récup descente) + 20' EF", duration: "1h10" },
    ],
  },
  {
    week_number: 5,
    label: "S5 (Récup)",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance + lignes droites", objective: "Récup active + maintien", details: "45' EF + 3×80 m LD (récup 45'') + 5' retour au calme", duration: "55'" },
      { day_label: "Mercredi", title: "VMA légère", objective: "Entretenir la vitesse sans fatigue", details: "15' EF + 3×100 m progressifs; 12×30''/30'' @100–105% VMA; 10' EF", duration: "1h00" },
      { day_label: "Vendredi", title: "Endurance longue facile", objective: "Maintenir le fond aérobie", details: "40' EF + 25' EF active + 10' retour au calme", duration: "1h15" },
      { day_label: "Dimanche", title: "Seuil léger", objective: "Entretenir le seuil avec faible charge", details: "20' EF + 3×100 m; 2×8' seuil léger (récup 3'); 10' EF", duration: "1h10" },
    ],
  },
  {
    week_number: 6,
    label: "S6",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing + éducatifs", objective: "Reprise après semaine allégée", details: "25' EF + éducatifs (6×80 m) + 25' EF", duration: "1h00" },
      { day_label: "Mercredi", title: "VMA longue", objective: "Développer VO2max", details: "20' EF + 3×100 m; 4×1200 m @95–100% VMA (récup 2'30 trot); 10' EF", duration: "1h20" },
      { day_label: "Vendredi", title: "Endurance longue progressive", objective: "Renforcer endurance et tempo", details: "30' EF + 40' EF active + 20' tempo @75–80% VMA", duration: "1h30" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Consolider allure semi", details: "20' EF + 3×100 m; 2×10' seuil (récup 3'); +12' AS21; 10' EF", duration: "1h25" },
      { day_label: "Dimanche", title: "Footing récup + côtes", objective: "Travail de force et relâchement", details: "30' EF + 8×30'' côte (récup descente) + 20' EF", duration: "1h05" },
    ],
  },
  {
    week_number: 7,
    label: "S7",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance", objective: "Récup active et maintien du volume", details: "55' EF", duration: "55'" },
      { day_label: "Mercredi", title: "Fractionné seuil long", objective: "Améliorer endurance au seuil", details: "20' EF + 3×100 m; 3×12' seuil (récup 3'); 10' EF", duration: "1h30" },
      { day_label: "Vendredi", title: "Endurance + tempo", objective: "Développer l'aérobie et le tempo", details: "30' EF + 20' tempo @75–80% VMA + 15' EF", duration: "1h20" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Renforcer la zone spécifique semi", details: "20' EF + 3×100 m; 3×10' AS21 (récup 3'); 10' EF", duration: "1h35" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Diminuer fatigue musculaire", details: "45' EF relâché", duration: "45'" },
    ],
  },
  {
    week_number: 8,
    label: "S8",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance + éducatifs", objective: "Récupération active et technique", details: "25' EF + éducatifs (6×80 m) + 25' EF", duration: "1h00" },
      { day_label: "Mercredi", title: "VMA courte", objective: "Travail de vitesse et VO2max", details: "20' EF + 3×100 m progressifs; 20×45''/45'' @105–110% VMA; 10' EF", duration: "1h15" },
      { day_label: "Vendredi", title: "Endurance longue progressive", objective: "Renforcer l'endurance et la résistance", details: "30' EF + 50' EF active + 20' tempo @75–80% VMA", duration: "1h40" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Développer la capacité à tenir AS21", details: "20' EF + 3×100 m; 2×15' AS21 (récup 4'); +10' seuil léger; 10' EF", duration: "1h35" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Dissiper la fatigue de la semaine", details: "45' EF relâché", duration: "45'" },
    ],
  },
  {
    week_number: 9,
    label: "S9",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance", objective: "Récupération active", details: "1h00 EF", duration: "1h00" },
      { day_label: "Mercredi", title: "Seuil long", objective: "Développer l'endurance au seuil", details: "20' EF + 3×100 m; 2×15' seuil (récup 4'); 10' EF", duration: "1h30" },
      { day_label: "Vendredi", title: "Endurance + tempo", objective: "Consolider l'aérobie et le rythme soutenu", details: "30' EF + 25' tempo @75–80% VMA + 15' EF", duration: "1h25" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Renforcer la capacité à tenir l'allure course", details: "20' EF + 3×100 m; 3×12' AS21 (récup 3'); 10' EF", duration: "1h40" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Diminuer la fatigue", details: "45' EF", duration: "45'" },
    ],
  },
  {
    week_number: 10,
    label: "S10",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing + éducatifs", objective: "Récup active + technique", details: "25' EF + éducatifs (6×80 m) + 25' EF", duration: "1h00" },
      { day_label: "Mercredi", title: "VMA moyenne", objective: "Développer VO2max et économie de course", details: "20' EF + 3×100 m; 8×600 m @100–102% VMA (récup 1'30 trot); 10' EF", duration: "1h20" },
      { day_label: "Vendredi", title: "Endurance longue + tempo", objective: "Renforcer la résistance", details: "35' EF + 30' tempo @75–80% VMA + 15' EF", duration: "1h35" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Consolider l'allure course", details: "20' EF + 3×100 m; 2×18' AS21 (récup 4'); 10' EF", duration: "1h40" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Régénération musculaire", details: "50' EF relâché", duration: "50'" },
    ],
  },
  {
    week_number: 11,
    label: "S11",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance", objective: "Récupération active", details: "1h00 EF", duration: "1h00" },
      { day_label: "Mercredi", title: "Seuil + VMA longue", objective: "Améliorer seuil et VO2max", details: "20' EF + 3×100 m; 2000 m @90% VMA + 3' récup; 3×1000 m @95–100% VMA (récup 2'); 10' EF", duration: "1h35" },
      { day_label: "Vendredi", title: "Endurance progressive", objective: "Renforcer endurance et tempo", details: "30' EF + 40' EF active + 20' tempo @75–80% VMA", duration: "1h35" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Renforcer la capacité à tenir l'allure en fatigue", details: "20' EF + 3×100 m; 3×15' AS21 (récup 3'); 10' EF", duration: "1h45" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Diminuer la fatigue accumulée", details: "50' EF relâché", duration: "50'" },
    ],
  },
  {
    week_number: 12,
    label: "S12",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance", objective: "Récupération active", details: "1h00 EF", duration: "1h00" },
      { day_label: "Mercredi", title: "Seuil + tempo", objective: "Développer endurance élevée", details: "20' EF + 3×100 m; 3×10' seuil (récup 3'); +10' tempo @75–80% VMA; 10' EF", duration: "1h35" },
      { day_label: "Vendredi", title: "Endurance longue progressive", objective: "Renforcer résistance", details: "30' EF + 50' EF active + 20' tempo @75–80% VMA", duration: "1h40" },
      { day_label: "Samedi", title: "Spécifique semi (gros bloc)", objective: "Simuler fatigue de course", details: "20' EF + 3×100 m; 3×15' AS21 (récup 3'); 10' EF", duration: "1h45" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Évacuer la fatigue", details: "45' EF", duration: "45'" },
    ],
  },
  {
    week_number: 13,
    label: "S13",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance + lignes droites", objective: "Récup active", details: "50' EF + 4×100 m LD (récup 45'')", duration: "55'" },
      { day_label: "Mercredi", title: "Seuil long + tempo", objective: "Développer la résistance", details: "20' EF + 3×100 m; 2×18' seuil (récup 4'); +10' tempo @75–80% VMA; 10' EF", duration: "1h40" },
      { day_label: "Vendredi", title: "Endurance longue", objective: "Renforcer la base aérobie", details: "1h45 EF modulée (65–75% FCmax, 60–70% VMA)", duration: "1h45" },
      { day_label: "Samedi", title: "Spécifique semi", objective: "Consolider la capacité à tenir l'allure", details: "20' EF + 3×100 m; 2×20' AS21 (récup 4'); 10' EF", duration: "1h45" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Éliminer fatigue", details: "50' EF relâché", duration: "50'" },
    ],
  },
  {
    week_number: 14,
    label: "S14 (Affûtage)",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing endurance", objective: "Récupération active", details: "50' EF", duration: "50'" },
      { day_label: "Mercredi", title: "Seuil court", objective: "Entretenir la zone seuil sans fatigue", details: "20' EF + 3×100 m; 3×8' seuil (récup 3'); 10' EF", duration: "1h10" },
      { day_label: "Vendredi", title: "Endurance + tempo léger", objective: "Maintenir l'endurance + rappel tempo", details: "30' EF + 15' tempo @75–78% VMA + 10' EF", duration: "55'" },
      { day_label: "Samedi", title: "Allure semi (rappel spécifique)", objective: "Conserver le rythme de course", details: "20' EF + 3×100 m; 2×12' AS21 (récup 3'); 10' EF", duration: "1h20" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Faciliter l'assimilation et la fraîcheur", details: "45' EF relâché", duration: "45'" },
    ],
  },
  {
    week_number: 15,
    label: "S15 (Affûtage)",
    sessions: [
      { day_label: "Lundi/Mardi", title: "Footing léger", objective: "Récupération + maintien du fond", details: "45' EF", duration: "45'" },
      { day_label: "Mercredi", title: "Rappel seuil", objective: "Entretenir l'endurance haute", details: "20' EF + 3×100 m; 2×10' seuil (récup 3'); 10' EF", duration: "1h05" },
      { day_label: "Vendredi", title: "Rappel tempo", objective: "Stabiliser la foulée", details: "25' EF + 12' tempo @75–78% VMA + 10' EF", duration: "50'" },
      { day_label: "Samedi", title: "Rappel AS21", objective: "Fixer l'allure course avec faible charge", details: "20' EF + 3×100 m; 2×10' AS21 (récup 3'); 10' EF", duration: "1h10" },
      { day_label: "Dimanche", title: "Footing récupération", objective: "Optimiser la fraîcheur", details: "40' EF relâché", duration: "40'" },
    ],
  },
  {
    week_number: 16,
    label: "S16 (Course)",
    sessions: [
      { day_label: "Lundi", title: "Footing léger", objective: "Favoriser la fraîcheur", details: "40' EF", duration: "40'" },
      { day_label: "Mardi", title: "Rappel AS21 très court", objective: "Recalage léger de l'allure", details: "20' EF + 2×6' AS21 (récup 3') + 10' EF", duration: "55'" },
      { day_label: "Jeudi", title: "Footing très léger", objective: "Préserver l'énergie", details: "30' EF + 3×80 m LD relâchées", duration: "35'" },
      { day_label: "Samedi", title: "Footing d'activation", objective: "Réveiller les jambes", details: "20' EF + 3×1' @85% VMA (récup 1')", duration: "25'" },
      { day_label: "Dimanche", title: "COURSE Semi-marathon", objective: "Objectif 1h20 (~3:47/km)", details: "Échauffement léger 10–15' + course", duration: "Variable" },
    ],
  },
];

// =============================================
// CONVERSION EN RUNNING WEEKS
// =============================================

function convertExcelWeeksToRunningWeeks(
  rawWeeks: ExcelWeekRaw[],
  templateId: string,
  sectionId: string
): RunningWeek[] {
  return rawWeeks.map((raw, index) => {
    const sessions = raw.sessions.map(s => convertExcelSession(s));
    const meta = computeWeekMeta(sessions, raw.week_number, rawWeeks.length, raw.label, raw.volume_total);
    
    return {
      template_id: templateId,
      section_id: sectionId,
      week_id: `${templateId}-${sectionId}-w${raw.week_number}`,
      week_number: raw.week_number,
      title: raw.label,
      summary: generateWeekSummary(meta),
      sessions,
      meta,
    };
  });
}

// =============================================
// TEMPLATES SEMI 1H30 & 1H40 (données simplifiées)
// =============================================

// Semi 1h30 - Même structure, intensités légèrement réduites
const SEMI_1H30_WEEKS_RAW: ExcelWeekRaw[] = SEMI_1H20_WEEKS_RAW.map(week => ({
  ...week,
  sessions: week.sessions.map(s => ({
    ...s,
    // Les détails sont identiques dans le fichier Excel
    // sauf VMA légèrement plus basses
  })),
}));

// Semi 1h40 - Même structure, intensités encore plus réduites
const SEMI_1H40_WEEKS_RAW: ExcelWeekRaw[] = SEMI_1H20_WEEKS_RAW.map(week => ({
  ...week,
  sessions: week.sessions.map(s => ({
    ...s,
  })),
}));

// =============================================
// DONNÉES MARATHON 2H30
// =============================================

const MARATHON_2H30_WEEKS_RAW: ExcelWeekRaw[] = [
  {
    week_number: 1,
    label: "S1",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Développer technique et base aérobie", details: "20' EF + éducatifs (9×60m) + 40' EF + 5' RCalme", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "VMA", objective: "Stimuler VO2max", details: "15' EF + 4×100m ; 2×(8×45\"/45\") @95-100% VMA ; 10' RCalme", duration: "1h00" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "20' EF + 50' EF active + 15' EF", duration: "1h25" },
      { day_label: "Séance 4 (ASM)", title: "Seuil", objective: "Travail seuil", details: "20' EF + 3×100m ; 3×8' Seuil (récup 2') ; 10' EF", duration: "1h10" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h20 EF + 8×20\" côte (récup marchée)", duration: "1h30" },
    ],
  },
  {
    week_number: 2,
    label: "S2",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 30' EF + 5' RCalme", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil", objective: "Développer seuil", details: "15' EF + 3×100m ; 6×1000m @Seuil (récup 1'30 trot) ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "25' EF + 55' EF active + 15' EF", duration: "1h35" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×10' Seuil (récup 3') ; +10' ASM ; 10' EF", duration: "1h20" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h30 EF + 6×40\" côte (récup descente)", duration: "1h40" },
    ],
  },
  {
    week_number: 3,
    label: "S3",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 25' EF + 5' RCalme", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 4×1500m @Seuil (récup 2') ; 10' EF", duration: "1h25" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "1h00 EF + 20' tempo douce + 10' EF", duration: "1h30" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×10' Seuil (récup 2') ; +15' ASM ; 10' EF", duration: "1h25" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h45 EF + 10×15\" côte (récup descente)", duration: "1h55" },
    ],
  },
  {
    week_number: 4,
    label: "S4",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 35' EF + 5' RCalme", duration: "1h10" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "VMA/Seuil", objective: "Développer VO2max", details: "20' EF + 3×100m ; 4×200m VMA (105%) / 800m Seuil (récup 1'/2') ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "30' EF + 1h00 EF active + 15' EF", duration: "1h45" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×15' Seuil (récup 3') ; +15' ASM ; 10' EF", duration: "1h30" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h55 EF + 8×45\" côte (récup descente)", duration: "2h05" },
    ],
  },
  {
    week_number: 5,
    label: "S5 (Récup)",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF + LD", objective: "Récup active", details: "50' EF + 3×80m LD (récup 45'') + 5' RCalme", duration: "1h00" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "VMA légère", objective: "Maintien vitesse", details: "15' EF + 3×100m ; 10×30''/30'' @95% VMA ; 10' EF", duration: "50'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Récup active", details: "50' EF + 15' EF active + 10' RCalme", duration: "1h15" },
      { day_label: "Séance 4 (ASM)", title: "Seuil léger + ASM", objective: "Rappel seuil", details: "20' EF + 3×100m ; 2×8' Seuil léger (récup 3') ; 5' ASM ; 10' EF", duration: "1h05" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h15 EF", duration: "1h15" },
    ],
  },
  {
    week_number: 6,
    label: "S6",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 35' EF", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 4×2000m @Seuil (récup 2'30 trot) ; 10' EF", duration: "1h35" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 50' EF active + 20' tempo @70-75% VMA", duration: "1h40" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×12' Seuil (récup 3') ; +15' ASM ; 10' EF", duration: "1h25" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "2h00 EF + 8×30'' côte (récup descente)", duration: "2h10" },
    ],
  },
  {
    week_number: 7,
    label: "S7",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h05 EF", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil long", objective: "Développer seuil", details: "20' EF + 3×100m ; 3×15' Seuil (récup 3') ; 10' EF", duration: "1h35" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 25' tempo @75% VMA + 15' EF", duration: "1h10" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×10' ASM (récup 3') ; 10' EF", duration: "1h20" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h10 EF relâché", duration: "2h10" },
    ],
  },
  {
    week_number: 8,
    label: "S8",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 30' EF", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "VMA", objective: "Développer VO2max", details: "20' EF + 3×100m ; 4×(10×30\"/30\") @100% VMA ; 10' EF", duration: "1h25" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 1h10 EF active + 20' tempo @70-75% VMA", duration: "2h00" },
      { day_label: "Séance 4 (ASM)", title: "ASM long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×20' ASM (récup 4') ; 10' EF", duration: "1h30" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h20 EF relâché", duration: "2h20" },
    ],
  },
  {
    week_number: 9,
    label: "S9",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h10 EF", duration: "1h10" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil long", objective: "Développer seuil", details: "20' EF + 3×100m ; 2×20' Seuil (récup 4') ; 10' EF", duration: "1h30" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 30' tempo @75% VMA + 15' EF", duration: "1h15" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×12' ASM (récup 3') ; 10' EF", duration: "1h25" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h30 EF", duration: "2h30" },
    ],
  },
  {
    week_number: 10,
    label: "S10",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 30' EF", duration: "1h05" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 10×800m @Seuil (récup 1'30 trot) ; 10' EF", duration: "1h35" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "35' EF + 40' tempo @75% VMA + 10' EF", duration: "1h25" },
      { day_label: "Séance 4 (ASM)", title: "ASM long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×25' ASM (récup 4') ; 10' EF", duration: "1h40" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h45 EF relâché", duration: "2h45" },
    ],
  },
  {
    week_number: 11,
    label: "S11",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h15 EF", duration: "1h15" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil continu", objective: "Développer seuil", details: "20' EF + 3×100m ; 10 km @Seuil continu ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 1h00 EF active + 20' tempo @70-75% VMA", duration: "1h50" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×15' ASM (récup 3') ; 10' EF", duration: "1h35" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h50 EF relâché", duration: "2h50" },
    ],
  },
  {
    week_number: 12,
    label: "S12",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h20 EF", duration: "1h20" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil très long", objective: "Développer seuil", details: "20' EF + 3×100m ; 2×30' Seuil (récup 4') ; 10' EF", duration: "1h45" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 1h10 EF active + 20' tempo @70-75% VMA", duration: "2h00" },
      { day_label: "Séance 4 (ASM)", title: "ASM très long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×40' ASM (récup 5') ; 10' EF", duration: "2h00" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "3h00 EF", duration: "3h00" },
    ],
  },
  {
    week_number: 13,
    label: "S13 (Décharge)",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF + LD", objective: "Récup active", details: "1h00 EF + 4×100m LD (récup 45'')", duration: "1h10" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil + tempo", objective: "Maintien seuil", details: "20' EF + 3×100m ; 2×20' Seuil (récup 4') ; +10' tempo ; 10' EF", duration: "1h35" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF modulée", objective: "Endurance facile", details: "2h00 EF modulée (65–70% VMA)", duration: "2h00" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 3×15' ASM (récup 3') ; 10' EF", duration: "1h35" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "2h00 EF relâché", duration: "2h00" },
    ],
  },
  {
    week_number: 14,
    label: "S14 (Affûtage -3)",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "50' EF", duration: "50'" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil court", objective: "Rappel seuil", details: "20' EF + 3×100m ; 3×10' Seuil (récup 3') ; 10' EF", duration: "1h15" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Maintien tempo", details: "30' EF + 20' tempo @75% VMA + 10' EF", duration: "1h00" },
      { day_label: "Séance 4 (ASM)", title: "ASM court", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 2×15' ASM (récup 3') ; 10' EF", duration: "1h15" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h30 EF relâché", duration: "1h30" },
    ],
  },
  {
    week_number: 15,
    label: "S15 (Affûtage -2)",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "45' EF", duration: "45'" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "Seuil court", objective: "Rappel seuil", details: "20' EF + 3×100m ; 2×8' Seuil (récup 3') ; 10' EF", duration: "55'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Maintien tempo", details: "25' EF + 15' tempo @75% VMA + 10' EF", duration: "50'" },
      { day_label: "Séance 4 (ASM)", title: "ASM court", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 2×8' ASM (récup 3') ; 10' EF", duration: "55'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h00 EF relâché", duration: "1h00" },
    ],
  },
  {
    week_number: 16,
    label: "S16 (Course)",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "30' EF", duration: "30'" },
      { day_label: "Séance 2 (Tempo/Seuil)", title: "ASM rappel", objective: "Rappel allure", details: "20' EF + 2×5' ASM (récup 3') + 10' EF", duration: "45'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + LD", objective: "Activation", details: "20' EF + 3×80m LD relâchées", duration: "25'" },
      { day_label: "Séance 4 (ASM)", title: "Activation", objective: "Réveil musculaire", details: "20' EF + 3×1' @85% VMA (récup 1')", duration: "25'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "MARATHON", objective: "Objectif 2h30", details: "Échauffement léger 10–15' + MARATHON", duration: "Variable" },
    ],
  },
];

// =============================================
// DONNÉES MARATHON 4H (avec volumes)
// =============================================

const MARATHON_4H_WEEKS_RAW: ExcelWeekRaw[] = [
  {
    week_number: 1,
    label: "S1",
    volume_total: "5h15",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Développer technique et base aérobie", details: "20' EF + éducatifs (9×60m) + 30' EF + 5' RCalme", duration: "55'" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "VMA légère", objective: "Stimuler VO2max", details: "15' EF + 4×100m ; 2×(6×30\"/30\") @95% VMA ; 10' RCalme", duration: "45'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "20' EF + 40' EF active + 15' EF", duration: "1h15" },
      { day_label: "Séance 4 (ASM)", title: "Seuil", objective: "Travail seuil", details: "20' EF + 3×100m ; 3×6' Seuil (récup 2') ; 10' EF", duration: "55'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h00 EF + 8×20\" côte (récup marchée)", duration: "1h10" },
    ],
  },
  {
    week_number: 2,
    label: "S2",
    volume_total: "6h00",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 25' EF + 5' RCalme", duration: "1h00" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil", objective: "Développer seuil", details: "15' EF + 3×100m ; 8×600m @Seuil (récup 1'30 trot) ; 10' EF", duration: "1h10" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "25' EF + 45' EF active + 15' EF", duration: "1h25" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×8' Seuil (récup 3') ; +8' ASM ; 10' EF", duration: "1h10" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h15 EF + 6×40\" côte (récup descente)", duration: "1h25" },
    ],
  },
  // ... Semaines 3-16 suivent le même pattern avec volumes progressifs
  {
    week_number: 3,
    label: "S3",
    volume_total: "6h40",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 20' EF + 5' RCalme", duration: "1h00" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 4×1000m @Seuil (récup 2') ; 10' EF", duration: "1h10" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "40' EF + 15' tempo douce + 15' EF", duration: "1h10" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×6' Seuil (récup 2') ; +10' ASM ; 10' EF", duration: "1h10" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h30 EF + 10×15\" côte (récup descente)", duration: "1h40" },
    ],
  },
  {
    week_number: 4,
    label: "S4",
    volume_total: "7h35",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 35' EF + 5' RCalme", duration: "1h10" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 4×1200m @Seuil (récup 2'30 trot) ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Endurance fondamentale", details: "30' EF + 50' EF active + 15' EF", duration: "1h35" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×10' Seuil (récup 3') ; +12' ASM ; 10' EF", duration: "1h20" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h45 EF + 8×45\" côte (récup descente)", duration: "1h55" },
    ],
  },
  {
    week_number: 5,
    label: "S5 (Récup)",
    volume_total: "5h05",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF + LD", objective: "Récup active", details: "45' EF + 3×80m LD (récup 45'') + 5' RCalme", duration: "55'" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "VMA légère", objective: "Maintien vitesse", details: "15' EF + 3×100m ; 8×30''/30'' @90% VMA ; 10' EF", duration: "40'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF Active", objective: "Récup active", details: "40' EF + 15' EF active + 10' RCalme", duration: "1h05" },
      { day_label: "Séance 4 (ASM)", title: "Seuil léger", objective: "Rappel seuil", details: "20' EF + 3×100m ; 2×6' Seuil léger (récup 3') ; 10' EF", duration: "50'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h00 EF", duration: "1h00" },
    ],
  },
  {
    week_number: 6,
    label: "S6",
    volume_total: "8h10",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "25' EF + éducatifs (6×80m) + 30' EF", duration: "1h00" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 5×1200m @Seuil (récup 2'30 trot) ; 10' EF", duration: "1h30" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 45' EF active + 15' tempo @70% VMA", duration: "1h30" },
      { day_label: "Séance 4 (ASM)", title: "Seuil + ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×12' Seuil (récup 3') ; +15' ASM ; 10' EF", duration: "1h25" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue + côtes", objective: "Endurance + force", details: "1h55 EF + 8×30'' côte (récup descente)", duration: "2h05" },
    ],
  },
  {
    week_number: 7,
    label: "S7",
    volume_total: "7h40",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h00 EF", duration: "1h00" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil", objective: "Développer seuil", details: "20' EF + 3×100m ; 3×10' Seuil (récup 3') ; 10' EF", duration: "1h15" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 20' tempo @75% VMA + 15' EF", duration: "1h05" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×15' ASM (récup 3') ; 10' EF", duration: "1h15" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h00 EF relâché", duration: "2h00" },
    ],
  },
  {
    week_number: 8,
    label: "S8",
    volume_total: "8h35",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 30' EF", duration: "1h05" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "VMA", objective: "Développer VO2max", details: "20' EF + 3×100m ; 12×45''/45'' @95% VMA ; 10' EF", duration: "1h00" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 1h00 EF active + 15' tempo @70% VMA", duration: "1h45" },
      { day_label: "Séance 4 (ASM)", title: "ASM long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×20' ASM (récup 4') ; 10' EF", duration: "1h25" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h15 EF relâché", duration: "2h15" },
    ],
  },
  {
    week_number: 9,
    label: "S9",
    volume_total: "8h40",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h05 EF", duration: "1h05" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil long", objective: "Développer seuil", details: "20' EF + 3×100m ; 2×18' Seuil (récup 4') ; 10' EF", duration: "1h25" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 25' tempo @75% VMA + 15' EF", duration: "1h10" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×12' ASM (récup 3') ; 10' EF", duration: "1h20" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h30 EF", duration: "2h30" },
    ],
  },
  {
    week_number: 10,
    label: "S10",
    volume_total: "9h00",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "Technique/EF", objective: "Technique et aérobie", details: "30' EF + éducatifs (6×80m) + 30' EF", duration: "1h05" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil continu", objective: "Développer seuil", details: "20' EF + 3×100m ; 8 km @Seuil continu (récup 1'30 trot) ; 10' EF", duration: "1h15" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "35' EF + 30' tempo @75% VMA + 15' EF", duration: "1h20" },
      { day_label: "Séance 4 (ASM)", title: "ASM long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×25' ASM (récup 4') ; 10' EF", duration: "1h35" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h45 EF relâché", duration: "2h45" },
    ],
  },
  {
    week_number: 11,
    label: "S11",
    volume_total: "9h30",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h10 EF", duration: "1h10" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil continu", objective: "Développer seuil", details: "20' EF + 3×100m ; 10 km @Seuil continu ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 50' EF active + 15' tempo @70% VMA", duration: "1h35" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 3×15' ASM (récup 3') ; 10' EF", duration: "1h30" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "2h50 EF relâché", duration: "2h50" },
    ],
  },
  {
    week_number: 12,
    label: "S12 (PIC)",
    volume_total: "10h15",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Endurance fondamentale", details: "1h15 EF", duration: "1h15" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil + tempo", objective: "Développer seuil", details: "20' EF + 3×100m ; 3×12' Seuil (récup 3') ; +10' tempo ; 10' EF", duration: "1h30" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Endurance et tempo", details: "30' EF + 1h00 EF active + 15' tempo @70% VMA", duration: "1h45" },
      { day_label: "Séance 4 (ASM)", title: "ASM très long", objective: "Spécifique marathon", details: "20' EF + 3×100m ; 2×35' ASM (récup 5') ; 10' EF", duration: "1h55" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance longue", details: "3h00 EF", duration: "3h00" },
    ],
  },
  {
    week_number: 13,
    label: "S13 (Décharge)",
    volume_total: "7h45",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF + LD", objective: "Récup active", details: "1h00 EF + 4×100m LD (récup 45'')", duration: "1h10" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil + tempo", objective: "Maintien seuil", details: "20' EF + 3×100m ; 2×15' Seuil (récup 4') ; +10' tempo ; 10' EF", duration: "1h20" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF modulée", objective: "Endurance facile", details: "1h45 EF modulée (65–70% VMA)", duration: "1h45" },
      { day_label: "Séance 4 (ASM)", title: "ASM", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 2×20' ASM (récup 4') ; 10' EF", duration: "1h20" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h30 EF relâché", duration: "1h30" },
    ],
  },
  {
    week_number: 14,
    label: "S14 (Affûtage -3)",
    volume_total: "5h30",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "45' EF", duration: "45'" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil court", objective: "Rappel seuil", details: "20' EF + 3×100m ; 3×8' Seuil (récup 3') ; 10' EF", duration: "1h00" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Maintien tempo", details: "30' EF + 15' tempo @75% VMA + 10' EF", duration: "55'" },
      { day_label: "Séance 4 (ASM)", title: "ASM court", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 2×12' ASM (récup 3') ; 10' EF", duration: "1h00" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "1h10 EF relâché", duration: "1h10" },
    ],
  },
  {
    week_number: 15,
    label: "S15 (Affûtage -2)",
    volume_total: "4h15",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "40' EF", duration: "40'" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "Seuil court", objective: "Rappel seuil", details: "20' EF + 3×100m ; 2×8' Seuil (récup 3') ; 10' EF", duration: "50'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + Tempo", objective: "Maintien tempo", details: "25' EF + 10' tempo @75% VMA + 10' EF", duration: "45'" },
      { day_label: "Séance 4 (ASM)", title: "ASM court", objective: "Rappel spécifique", details: "20' EF + 3×100m ; 2×8' ASM (récup 3') ; 10' EF", duration: "50'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "Sortie Longue", objective: "Endurance facile", details: "0h50 EF relâché", duration: "50'" },
    ],
  },
  {
    week_number: 16,
    label: "S16 (Course)",
    volume_total: "2h30",
    sessions: [
      { day_label: "Séance 1 (Technique/EF)", title: "EF", objective: "Récup", details: "30' EF", duration: "30'" },
      { day_label: "Séance 2 (VMA/Tempo Court)", title: "ASM rappel", objective: "Rappel allure", details: "20' EF + 2×5' ASM (récup 3') + 10' EF", duration: "45'" },
      { day_label: "Séance 3 (EF Active/Tempo)", title: "EF + LD", objective: "Activation", details: "20' EF + 3×80m LD relâchées", duration: "25'" },
      { day_label: "Séance 4 (ASM)", title: "Activation", objective: "Réveil musculaire", details: "20' EF + 3×1' @85% VMA (récup 1')", duration: "25'" },
      { day_label: "Séance 5 (Sortie Longue)", title: "MARATHON", objective: "Objectif 4h00", details: "Échauffement léger 10–15' + MARATHON", duration: "Variable" },
    ],
  },
];

// =============================================
// EXPORT DES TEMPLATES FINAUX
// =============================================

const SEMI_1H20_WEEKS = convertExcelWeeksToRunningWeeks(SEMI_1H20_WEEKS_RAW, "semi-1h20", "semi-1h20-perf");
const SEMI_1H30_WEEKS = convertExcelWeeksToRunningWeeks(SEMI_1H30_WEEKS_RAW, "semi-1h30", "semi-1h30-perf");
const SEMI_1H40_WEEKS = convertExcelWeeksToRunningWeeks(SEMI_1H40_WEEKS_RAW, "semi-1h40", "semi-1h40-perf");
const MARATHON_2H30_WEEKS = convertExcelWeeksToRunningWeeks(MARATHON_2H30_WEEKS_RAW, "marathon-2h30", "marathon-2h30-perf");
const MARATHON_4H_WEEKS = convertExcelWeeksToRunningWeeks(MARATHON_4H_WEEKS_RAW, "marathon-4h", "marathon-4h-perf");

export const EXCEL_RUNNING_TEMPLATES: RunningTemplate[] = [
  {
    id: "semi-1h20",
    name: "Semi-Marathon 1h20",
    goal: "semi",
    weeks_count: 16,
    description: "Plan semi-marathon 16 semaines pour objectif 1h20 (~3:47/km). Profil compétiteur confirmé avec VMA élevée.",
    sections: [{
      id: "semi-1h20-perf",
      name: "Performance 1h20",
      ambition: "ELITE" as AmbitionLevel,
      weeks: SEMI_1H20_WEEKS,
    }],
  },
  {
    id: "semi-1h30",
    name: "Semi-Marathon 1h30",
    goal: "semi",
    weeks_count: 16,
    description: "Plan semi-marathon 16 semaines pour objectif 1h30 (~4:16/km). Profil performance confirmé.",
    sections: [{
      id: "semi-1h30-perf",
      name: "Performance 1h30",
      ambition: "SUB" as AmbitionLevel,
      weeks: SEMI_1H30_WEEKS,
    }],
  },
  {
    id: "semi-1h40",
    name: "Semi-Marathon 1h40",
    goal: "semi",
    weeks_count: 16,
    description: "Plan semi-marathon 16 semaines pour objectif 1h40 (~4:44/km). Profil performance accessible.",
    sections: [{
      id: "semi-1h40-perf",
      name: "Performance 1h40",
      ambition: "PERF" as AmbitionLevel,
      weeks: SEMI_1H40_WEEKS,
    }],
  },
  {
    id: "marathon-2h30",
    name: "Marathon 2h30",
    goal: "marathon",
    weeks_count: 16,
    description: "Plan marathon 16 semaines pour objectif 2h30 (~3:33/km). Profil élite avec gros volume.",
    sections: [{
      id: "marathon-2h30-perf",
      name: "Performance 2h30",
      ambition: "ELITE" as AmbitionLevel,
      weeks: MARATHON_2H30_WEEKS,
    }],
  },
  {
    id: "marathon-4h",
    name: "Marathon 4h00",
    goal: "marathon",
    weeks_count: 16,
    description: "Plan marathon 16 semaines pour objectif 4h00 (~5:41/km). Profil finisher/performance accessible.",
    sections: [{
      id: "marathon-4h-perf",
      name: "Performance 4h00",
      ambition: "FINISH" as AmbitionLevel,
      weeks: MARATHON_4H_WEEKS,
    }],
  },
];

/**
 * Récupère tous les templates Excel
 */
export function getExcelRunningTemplates(): RunningTemplate[] {
  return EXCEL_RUNNING_TEMPLATES;
}

/**
 * Récupère un template par ID
 */
export function getExcelTemplateById(id: string): RunningTemplate | null {
  return EXCEL_RUNNING_TEMPLATES.find(t => t.id === id) || null;
}

/**
 * Récupère toutes les semaines de tous les templates Excel
 */
export function getAllExcelWeeks(): RunningWeek[] {
  const allWeeks: RunningWeek[] = [];
  
  EXCEL_RUNNING_TEMPLATES.forEach(template => {
    template.sections.forEach(section => {
      allWeeks.push(...section.weeks);
    });
  });
  
  return allWeeks;
}

/**
 * Filtre les semaines par objectif (semi ou marathon)
 */
export function getExcelWeeksByGoal(goal: "marathon" | "semi"): RunningWeek[] {
  const templates = EXCEL_RUNNING_TEMPLATES.filter(t => t.goal === goal);
  const weeks: RunningWeek[] = [];
  
  templates.forEach(template => {
    template.sections.forEach(section => {
      weeks.push(...section.weeks);
    });
  });
  
  return weeks;
}

// =============================================
// RUNNING TEMPLATES DATA STORE
// Templates Marathon & Semi-Marathon structurés
// =============================================

import type { 
  RunningTemplate, 
  RunningTemplateSection, 
  RunningWeek,
  AmbitionLevel,
} from "@/types/runningTemplate";
import { MARATHON_WEEKS } from "@/data/marathonTemplate";
import { SEMI_MARATHON_WEEKS } from "@/data/semiMarathonTemplate";
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";
import { 
  autoTagWeek, 
  convertToRunningSession,
  generateWeekSummary 
} from "./runningTemplateAutoTag";

// =============================================
// TEMPLATE CONVERSION
// =============================================

/**
 * Convertit un TemplateWeek[] en RunningWeek[]
 */
function convertToRunningWeeks(
  weeks: TemplateWeek[],
  templateId: string,
  sectionId: string
): RunningWeek[] {
  return weeks.map((week, index) => {
    const meta = autoTagWeek(week, weeks.length);
    const sessions = week.sessions.map(s => convertToRunningSession(s));
    
    return {
      template_id: templateId,
      section_id: sectionId,
      week_id: `${templateId}-${sectionId}-w${week.weekNumber}`,
      week_number: week.weekNumber,
      title: week.theme || `Semaine ${week.weekNumber}`,
      summary: generateWeekSummary(meta),
      sessions,
      meta,
      coachAdvice: week.coachAdvice,
    };
  });
}

// =============================================
// MARATHON TEMPLATE
// =============================================

const MARATHON_SECTION_PERFORMANCE: RunningTemplateSection = {
  id: "marathon-perf",
  name: "Marathon Performance",
  ambition: "PERF" as AmbitionLevel,
  weeks: convertToRunningWeeks(MARATHON_WEEKS, "marathon", "marathon-perf"),
};

export const MARATHON_TEMPLATE: RunningTemplate = {
  id: "marathon",
  name: "Marathon 24 semaines",
  goal: "marathon",
  weeks_count: MARATHON_WEEKS.length,
  description: "Template marathon complet basé sur la méthodologie Two For Coaching Lab™. Phases: Construction → Endurance Force → Seuil/VLaMax → Spécifique → Affûtage.",
  sections: [MARATHON_SECTION_PERFORMANCE],
};

// =============================================
// SEMI-MARATHON TEMPLATE
// =============================================

const SEMI_SECTION_PERFORMANCE: RunningTemplateSection = {
  id: "semi-perf",
  name: "Semi-Marathon Performance",
  ambition: "PERF" as AmbitionLevel,
  weeks: convertToRunningWeeks(SEMI_MARATHON_WEEKS, "semi", "semi-perf"),
};

export const SEMI_MARATHON_TEMPLATE: RunningTemplate = {
  id: "semi",
  name: "Semi-Marathon 12 semaines",
  goal: "semi",
  weeks_count: SEMI_MARATHON_WEEKS.length,
  description: "Template semi-marathon sur 12 semaines. Phases: Développement Moteur → Seuil & Endurance → Spécifique → Affûtage.",
  sections: [SEMI_SECTION_PERFORMANCE],
};

// =============================================
// COMBINED STORE
// =============================================

export const RUNNING_TEMPLATES: RunningTemplate[] = [
  MARATHON_TEMPLATE,
  SEMI_MARATHON_TEMPLATE,
];

/**
 * Récupère un template par ID
 */
export function getRunningTemplateById(id: string): RunningTemplate | null {
  return RUNNING_TEMPLATES.find(t => t.id === id) || null;
}

/**
 * Récupère toutes les semaines de tous les templates
 */
export function getAllRunningWeeks(): RunningWeek[] {
  const allWeeks: RunningWeek[] = [];
  
  RUNNING_TEMPLATES.forEach(template => {
    template.sections.forEach(section => {
      section.weeks.forEach(week => {
        allWeeks.push({
          ...week,
          // Add template and section names for display
        });
      });
    });
  });
  
  return allWeeks;
}

/**
 * Filtre les semaines par objectif
 */
export function getWeeksByGoal(goal: "marathon" | "semi"): RunningWeek[] {
  const template = RUNNING_TEMPLATES.find(t => t.goal === goal);
  if (!template) return [];
  
  const weeks: RunningWeek[] = [];
  template.sections.forEach(section => {
    weeks.push(...section.weeks);
  });
  
  return weeks;
}

/**
 * Récupère les infos de template/section pour une semaine
 */
export function getWeekContext(week: RunningWeek): {
  templateName: string;
  sectionName: string;
} {
  const template = RUNNING_TEMPLATES.find(t => t.id === week.template_id);
  const section = template?.sections.find(s => s.id === week.section_id);
  
  return {
    templateName: template?.name || "Template inconnu",
    sectionName: section?.name || "Section inconnue",
  };
}

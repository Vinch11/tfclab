/**
 * Template Annotation Engine
 * Generates staff-grade annotations for training templates
 * Does NOT modify anything - just provides insights
 */

export type AnnotationSeverity = 0 | 1 | 2 | 3;
export type AnnotationScope = "WEEK" | "SESSION" | "PLAN";

export interface TemplateAnnotation {
  scope: AnnotationScope;
  weekNumber: number;
  day?: string;
  severity: AnnotationSeverity;
  title: string;
  message: string;
  why: string;
}

export interface VLamaxSignal {
  value: number | null;
  source: string;
  confidence: number;
}

export interface TTESignal {
  value: number | null;
  source: string;
  confidence: number;
}

export interface PotentielSignal {
  score: number;
  details?: {
    fraicheur?: number;
    confiance?: number;
    endurance?: number;
    metabolique?: number;
  };
}

export interface AnnotationParams {
  athleteGoal: "IM" | "703" | "Marathon" | "Semi" | string;
  vlamaxEffectif: VLamaxSignal | null;
  tteEffectif: TTESignal | null;
  potentielPhysiologique: PotentielSignal | null;
  poids?: number | null;
  ftpKg?: number | null;
  tss7d?: number | null;
  stressCheckin?: number | null;
}

// Target values per objective
function getTTETarget(goal: string): number {
  switch (goal) {
    case "IM": return 55;
    case "703": return 50;
    case "Marathon": return 45;
    case "Semi": return 40;
    default: return 45;
  }
}

function getVLamaxMax(goal: string): number {
  switch (goal) {
    case "IM": return 0.45;
    case "703": return 0.50;
    case "Marathon": return 0.55;
    case "Semi": return 0.60;
    default: return 0.50;
  }
}

/**
 * Generate annotations based on athlete signals
 */
export function generateTemplateAnnotations(params: AnnotationParams): TemplateAnnotation[] {
  const annotations: TemplateAnnotation[] = [];
  const { athleteGoal, vlamaxEffectif, tteEffectif, potentielPhysiologique, tss7d, stressCheckin } = params;

  // Rule A: VLamax too high for IM
  if (
    (athleteGoal === "IM" || athleteGoal === "703") &&
    vlamaxEffectif?.value != null &&
    vlamaxEffectif.value > getVLamaxMax(athleteGoal)
  ) {
    const max = getVLamaxMax(athleteGoal);
    annotations.push({
      scope: "PLAN",
      weekNumber: 0,
      severity: vlamaxEffectif.value > max + 0.10 ? 3 : 2,
      title: "Profil trop glycolytique pour " + athleteGoal,
      message: "Ce plan est très exigeant si l'athlète dépend trop des glucides. Prioriser les séances Force basse cadence et Z2 long.",
      why: `VLamax = ${vlamaxEffectif.value.toFixed(2)} > ${max.toFixed(2)} → coût glucidique ↑ ; risque nutrition/fatigue ↑. (Source: ${vlamaxEffectif.source}, confiance ${Math.round(vlamaxEffectif.confidence * 100)}%)`,
    });
  }

  // Rule B: TTE too low
  if (tteEffectif?.value != null) {
    const target = getTTETarget(athleteGoal);
    if (tteEffectif.value < target - 5) {
      annotations.push({
        scope: "PLAN",
        weekNumber: 0,
        severity: 2,
        title: "TTE sous la cible",
        message: "Les séances 'spécifiques' seront difficiles à tenir à intensité stable. Prioriser Tempo/Seuil longs plutôt que VO2 courts.",
        why: `TTE = ${tteEffectif.value.toFixed(0)} min < cible ${target} min. (Source: ${tteEffectif.source}, confiance ${Math.round(tteEffectif.confidence * 100)}%)`,
      });
    }
  }

  // Rule C: Race readiness low
  if (potentielPhysiologique != null) {
    const score = potentielPhysiologique.score;
    const fraicheur = potentielPhysiologique.details?.fraicheur ?? 100;
    
    if (score < 60 || fraicheur < 50) {
      annotations.push({
        scope: "PLAN",
        weekNumber: 0,
        severity: 2,
        title: "Risque surcharge / fraîcheur insuffisante",
        message: "Prévoir 24-48h de consolidation autour des séances clés. Envisager de réduire l'intensité cette semaine.",
        why: `PotentielPhysiologique score = ${score.toFixed(0)} + fraîcheur = ${fraicheur.toFixed(0)}%.`,
      });
    }
  }

  // Rule D: Objective CAP but template is multisport (IM/703 template)
  if ((athleteGoal === "Marathon" || athleteGoal === "Semi")) {
    annotations.push({
      scope: "PLAN",
      weekNumber: 0,
      severity: 1,
      title: "Template multisport vs objectif CAP",
      message: "Ce template contient natation/vélo. Pour un objectif CAP, réduire ces disciplines au strict entretien.",
      why: `Objectif = ${athleteGoal}. Template IM/703 contient beaucoup de natation et vélo.`,
    });
  }

  // Rule E: High TSS + high stress
  if (tss7d != null && tss7d > 600 && (stressCheckin == null || stressCheckin >= 6)) {
    annotations.push({
      scope: "PLAN",
      weekNumber: 0,
      severity: 2,
      title: "Charge très élevée",
      message: "TSS 7j élevé avec stress potentiel. Attention au risque de surentraînement.",
      why: `TSS 7j = ${tss7d.toFixed(0)}${stressCheckin != null ? `, stress check-in = ${stressCheckin}/10` : ""}.`,
    });
  }

  return annotations;
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: AnnotationSeverity): string {
  switch (severity) {
    case 0: return "bg-muted text-muted-foreground";
    case 1: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case 2: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case 3: return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: AnnotationSeverity): string {
  switch (severity) {
    case 0: return "Info";
    case 1: return "Note";
    case 2: return "Attention";
    case 3: return "Risque";
    default: return "Info";
  }
}

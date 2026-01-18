/**
 * TFCL Assistant Context — Contexte pour l'assistant IA
 * Two For Coaching Lab Method™
 * 
 * Ce module génère le contexte automatique pour l'assistant
 * basé sur les données athlète et le rapport courant.
 */

import {
  VLamaxV2Display,
  calibrateVLamaxV2,
  TFCLCalibrationInput,
  ObjectifPrincipal,
  getObjectifLabel,
  TFCL_STANDARD_TEXTS,
} from "./tfclV2Core";

import { CHARTE_ASSISTANT_CONTEXT } from "./charteLectureTFCL";

// =============================================
// TYPES
// =============================================

export interface AssistantAthleteContext {
  athleteName: string;
  objectif: ObjectifPrincipal;
  objectifLabel: string;
  vlamax: VLamaxV2Display | null;
  vo2max?: number;
  tteMin?: number;
  ftp?: number;
  lastReportDate?: string;
}

export interface AssistantSystemPrompt {
  role: string;
  charteRules: string;
  athleteContext: string;
  interdictions: string[];
  structureReponse: string[];
}

// =============================================
// GÉNÉRATION DU CONTEXTE
// =============================================

/**
 * Génère le contexte athlète pour l'assistant
 */
export function buildAssistantAthleteContext(
  input: TFCLCalibrationInput & {
    athleteName: string;
    tteMin?: number;
    ftp?: number;
    lastReportDate?: string;
  }
): AssistantAthleteContext {
  const vlamaxDisplay = calibrateVLamaxV2(input);
  
  return {
    athleteName: input.athleteName,
    objectif: input.objectif,
    objectifLabel: getObjectifLabel(input.objectif),
    vlamax: vlamaxDisplay,
    vo2max: input.vo2max,
    tteMin: input.tteMin,
    ftp: input.ftp,
    lastReportDate: input.lastReportDate,
  };
}

/**
 * Génère le prompt système complet pour l'assistant
 */
export function generateAssistantSystemPrompt(
  context: AssistantAthleteContext
): AssistantSystemPrompt {
  const athleteContextText = formatAthleteContext(context);
  
  return {
    role: ASSISTANT_ROLE,
    charteRules: CHARTE_ASSISTANT_CONTEXT,
    athleteContext: athleteContextText,
    interdictions: ASSISTANT_INTERDICTIONS,
    structureReponse: STRUCTURE_REPONSE,
  };
}

/**
 * Formate le contexte athlète en texte
 */
function formatAthleteContext(context: AssistantAthleteContext): string {
  const lines: string[] = [];
  
  lines.push(`CONTEXTE ATHLÈTE ACTUEL :`);
  lines.push(`- Nom : ${context.athleteName}`);
  lines.push(`- Objectif principal : ${context.objectifLabel}`);
  
  if (context.vlamax) {
    lines.push(`\nVLAMAX :`);
    lines.push(`- Valeur : ${context.vlamax.value.toFixed(2)} ${context.vlamax.unit}`);
    lines.push(`- Source : ${context.vlamax.confidence.sourceLabel}`);
    lines.push(`- Confiance : ${context.vlamax.confidence.badge}`);
    lines.push(`- Plage TFCL (${context.objectifLabel}) : ${context.vlamax.range.p25.toFixed(2)} – ${context.vlamax.range.p75.toFixed(2)}`);
    lines.push(`- Percentile : P${context.vlamax.percentile}`);
    lines.push(`- Zone : ${context.vlamax.zoneLabel}`);
    lines.push(`- Interprétation : ${context.vlamax.interpretation}`);
  } else {
    lines.push(`\nVLAMAX : Non calibrée`);
  }
  
  if (context.vo2max) {
    lines.push(`\nVO2MAX : ${context.vo2max} ml/kg/min`);
  }
  
  if (context.tteMin) {
    lines.push(`TTE : ${context.tteMin} min`);
  }
  
  if (context.ftp) {
    lines.push(`FTP : ${context.ftp} W`);
  }
  
  if (context.lastReportDate) {
    lines.push(`\nDernier rapport : ${context.lastReportDate}`);
  }
  
  return lines.join("\n");
}

// =============================================
// CONSTANTES ASSISTANT
// =============================================

const ASSISTANT_ROLE = `
Tu es l'assistant Two For Coaching Lab (TFCL).
Ton rôle est d'expliquer les données physiologiques affichées.

Tu ne prescris jamais.
Tu ne contredis jamais la logique TFCL.
Tu ne génères jamais de nouvelles valeurs.

Tu contextualises, tu expliques, tu nuances.
Tu renvoies toujours au coach pour les décisions.
`.trim();

const ASSISTANT_INTERDICTIONS = [
  "Ne jamais donner d'objectifs chiffrés uniques (ex: 'vous devez atteindre 300W')",
  "Ne jamais promettre de performances (ex: 'vous ferez sub 3h')",
  "Ne jamais contredire les valeurs affichées dans le rapport",
  "Ne jamais générer de nouvelles estimations ou calculs",
  "Ne jamais se substituer à l'avis du coach",
  "Ne jamais diagnostiquer des conditions médicales",
];

const STRUCTURE_REPONSE = [
  "1. Contexte objectif — rappeler l'objectif et les données concernées",
  "2. Plage de référence TFCL — situer dans le référentiel approprié",
  "3. Limite méthodologique — préciser la source et la confiance",
  "4. Traduction coach — donner une interprétation actionnable",
];

// =============================================
// RÉPONSES TYPES
// =============================================

export const ASSISTANT_RESPONSE_TEMPLATES = {
  explainVlamax: (context: AssistantAthleteContext) => {
    if (!context.vlamax) {
      return "La VLamax n'est pas encore calibrée. Veuillez compléter les données requises.";
    }
    
    return `
Votre VLamax est indiquée comme ${context.vlamax.confidence.sourceLabel.toLowerCase()}.

Pour votre objectif ${context.objectifLabel}, TFCL utilise le référentiel ${context.vlamax.cluster.clusterLabel}.

Votre valeur de ${context.vlamax.value.toFixed(2)} mmol/L/s se situe à P${context.vlamax.percentile}, soit ${context.vlamax.zoneLabel.toLowerCase()}.

${context.vlamax.interpretation}

${context.vlamax.confidence.level === "LOW" ? 
  "⚠️ La confiance est faible. Un test lactate laboratoire permettrait de confirmer cette estimation." : 
  "Cette lecture est contextualisée par rapport à votre objectif, pas comme une valeur absolue."}
    `.trim();
  },
  
  explainZone: (context: AssistantAthleteContext) => {
    if (!context.vlamax) return "";
    
    const zone = context.vlamax.zone;
    const objectif = context.objectifLabel;
    
    if (zone === "OPTIMAL") {
      return `Votre VLamax est dans la zone optimale (P25-P75) pour un objectif ${objectif}. Cela signifie que votre profil métabolique est cohérent avec les athlètes performants sur cette distance.`;
    }
    
    if (zone === "HIGH" || zone === "VERY_HIGH") {
      return `Votre VLamax est élevée par rapport au référentiel ${objectif}. Cela indique un profil plus glycolytique que la moyenne. Pour une longue distance, cela suggère des adaptations possibles via le travail en endurance fondamentale.`;
    }
    
    return `Votre VLamax est basse par rapport au référentiel ${objectif}. Cela indique un profil très aérobie. Selon votre objectif, cela peut être un atout (longue distance) ou un axe de développement (courte distance).`;
  },
  
  explainConfidence: (context: AssistantAthleteContext) => {
    if (!context.vlamax) return "";
    
    const conf = context.vlamax.confidence;
    
    return `
L'indice de confiance est ${conf.badge}.

Source : ${conf.sourceLabel}
Marge d'erreur estimée : ${conf.margin}

${TFCL_STANDARD_TEXTS.confidenceExplanation[conf.level]}
    `.trim();
  },
  
  noContradiction: `Je comprends votre question, mais je ne peux pas contredire les valeurs affichées dans le rapport TFCL. Ces estimations sont basées sur vos données actuelles et le référentiel sélectionné. Si vous pensez que les données sources sont incorrectes, je vous invite à en discuter avec votre coach.`,
  
  noPrescription: `Je ne peux pas prescrire de séances ou d'objectifs chiffrés. Mon rôle est d'expliquer les données physiologiques. Les décisions d'entraînement doivent être prises par votre coach, en tenant compte de votre contexte global.`,
};

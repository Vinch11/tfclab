// =============================================
// TFCL EXECUTIVE PERFORMANCE DECK™
// PowerPoint Export - Consulting-style Presentation
// Two For Coaching Lab
// =============================================

import PptxGenJS from "pptxgenjs";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import type { TTEEffectif } from "@/lib/tteEffectif";
import type { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import type { CompassScores } from "@/lib/compassScoring";
import type { NutritionPredictiveV2 } from "@/lib/v2/nutritionV2";
import type { AmbitionLevel } from "@/types/ambitionLevel";
import { getAmbitionDefinition } from "@/types/ambitionLevel";
import { getObjectifLabel } from "@/lib/raceReadinessEffectif";

// =============================================
// TYPES
// =============================================

export interface ExecutiveDeckPayload {
  athlete: DbAthlete;
  effectiveSnapshot: DbSnapshot | null;
  vlamax: VLamaxEffectif;
  tte: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
  compassScores: CompassScores;
  nutritionV2: NutritionPredictiveV2 | null;
  ambition: AmbitionLevel;
  ageAdjustment: {
    age: number | null;
  };
  lorang: {
    priorite: string;
    prioriteLabel: string;
    alertes: string[];
    recommandations: string[];
  };
  snapshotHistory: DbSnapshot[];
  tests: DbTest[];
}

export interface ExecutiveDeckOptions {
  includeStaffAnnex: boolean;
  includeAthleteSimplified: boolean;
  includeHistoricalComparison: boolean;
  darkMode: boolean;
}

// =============================================
// COLOR PALETTE TFCL
// =============================================

const COLORS = {
  // Primary brand
  primary: "1E3A8A",      // Deep blue
  secondary: "3B82F6",    // Bright blue
  
  // Functional
  aerobic: "2563EB",      // Blue - aérobie
  glycolytic: "EA580C",   // Orange - VLamax/glycolytique
  success: "16A34A",      // Green - robuste
  warning: "F59E0B",      // Amber - attention
  danger: "DC2626",       // Red - vigilance
  
  // Neutrals
  dark: "0F172A",         // Slate 900
  medium: "475569",       // Slate 600
  light: "94A3B8",        // Slate 400
  soft: "F1F5F9",         // Slate 100
  white: "FFFFFF",
  
  // Backgrounds
  bgLight: "FAFAFA",
  bgDark: "1E293B",
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.danger;
}

function getVLamaxZoneLabel(value: number | null): string {
  if (!value) return "Inconnue";
  if (value < 0.3) return "Très basse";
  if (value < 0.4) return "Basse (Diesel)";
  if (value < 0.5) return "Optimale";
  if (value < 0.6) return "Élevée";
  return "Très élevée";
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "test": return "✓ Mesurée (labo/test)";
    case "snapshot": return "✓ Mesurée (snapshot)";
    case "estimated": return "⚠ Estimée";
    default: return "? Inconnue";
  }
}

// =============================================
// SLIDE BUILDERS
// =============================================

function addCoverSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  // Background gradient effect (via shape)
  slide.addShape("rect", {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { type: "solid", color: COLORS.primary }
  });
  
  // Decorative accent bar
  slide.addShape("rect", {
    x: 0, y: 5.2, w: "100%", h: 0.3,
    fill: { type: "solid", color: COLORS.secondary }
  });
  
  // Main title
  slide.addText("TFCL Executive Performance Deck™", {
    x: 0.5, y: 1.5, w: 9, h: 0.8,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.white,
    bold: true
  });
  
  // Athlete name
  slide.addText(payload.athlete.name, {
    x: 0.5, y: 2.5, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.soft,
    bold: true
  });
  
  // Objective
  const objectifLabel = getObjectifLabel(payload.athlete.goal || "IM");
  slide.addText(`Objectif : ${objectifLabel}`, {
    x: 0.5, y: 3.3, w: 9, h: 0.4,
    fontSize: 20,
    fontFace: "Arial",
    color: COLORS.light
  });
  
  // Date
  const reportDate = new Date().toLocaleDateString("fr-FR", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  slide.addText(reportDate, {
    x: 0.5, y: 4.0, w: 9, h: 0.3,
    fontSize: 16,
    fontFace: "Arial",
    color: COLORS.light
  });
  
  // Subtitle
  slide.addText("Two For Coaching Lab — Executive Performance Review", {
    x: 0.5, y: 4.6, w: 9, h: 0.4,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
}

function addExecutiveSummarySlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  // Title
  slide.addText("Lecture globale de la performance", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  // Generate insights
  const compass = payload.compassScores;
  const readiness = payload.raceReadiness;
  
  // Point fort majeur
  let strength = "Équilibre métabolique stable";
  if (compass.mainStrength) {
    strength = compass.mainStrength;
  } else if (compass.capaciteAerobie.score >= 80) {
    strength = "Excellente capacité aérobie";
  } else if (compass.toleranceEffort.score >= 80) {
    strength = "Grande durabilité à l'effort";
  }
  
  // Facteur limitant
  let limitation = "Aucun facteur limitant majeur identifié";
  if (compass.mainLimitation) {
    limitation = compass.mainLimitation;
  } else if (compass.profilMetabolique.score < 60) {
    limitation = "Profil métabolique à optimiser (VLamax)";
  } else if (compass.toleranceEffort.score < 60) {
    limitation = "Durabilité insuffisante pour l'objectif";
  }
  
  // Priorité stratégique
  const priority = payload.lorang.prioriteLabel || "Maintenir l'équilibre actuel";
  
  const insights = [
    { icon: "✓", label: "Point fort majeur", text: strength, color: COLORS.success },
    { icon: "⚠", label: "Facteur limitant", text: limitation, color: COLORS.warning },
    { icon: "→", label: "Priorité stratégique", text: priority, color: COLORS.aerobic }
  ];
  
  let yPos = 1.2;
  insights.forEach((insight) => {
    // Card background
    slide.addShape("roundRect", {
      x: 0.5, y: yPos, w: 9, h: 1.2,
      fill: { type: "solid", color: COLORS.soft },
      line: { color: insight.color, width: 2 }
    });
    
    // Icon and label
    slide.addText(`${insight.icon} ${insight.label}`, {
      x: 0.7, y: yPos + 0.15, w: 8.6, h: 0.35,
      fontSize: 12,
      fontFace: "Arial",
      color: insight.color,
      bold: true
    });
    
    // Content text
    slide.addText(insight.text, {
      x: 0.7, y: yPos + 0.5, w: 8.6, h: 0.5,
      fontSize: 16,
      fontFace: "Arial",
      color: COLORS.dark
    });
    
    yPos += 1.45;
  });
  
  // Footer note
  slide.addText("Langage clair · Aucune valeur brute affichée ici", {
    x: 0.5, y: 5.2, w: 9, h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
}

function addMetabolicProfileSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Profil énergétique de l'athlète", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const compass = payload.compassScores;
  const axes = [
    { label: "Capacité Aérobie", score: compass.capaciteAerobie.score, color: COLORS.aerobic },
    { label: "Durabilité (TTE)", score: compass.toleranceEffort.score, color: COLORS.success },
    { label: "Profil Métabolique", score: compass.profilMetabolique.score, color: COLORS.glycolytic },
    { label: "Robustesse", score: compass.robustesse.score, color: COLORS.warning }
  ];
  
  // Create a 2x2 grid of score cards
  const positions = [
    { x: 0.5, y: 1.2 },
    { x: 5, y: 1.2 },
    { x: 0.5, y: 2.9 },
    { x: 5, y: 2.9 }
  ];
  
  axes.forEach((axis, idx) => {
    const pos = positions[idx];
    
    // Card background
    slide.addShape("roundRect", {
      x: pos.x, y: pos.y, w: 4.4, h: 1.4,
      fill: { type: "solid", color: COLORS.white },
      line: { color: axis.color, width: 2 },
      shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.2 }
    });
    
    // Label
    slide.addText(axis.label, {
      x: pos.x + 0.2, y: pos.y + 0.15, w: 4, h: 0.35,
      fontSize: 12,
      fontFace: "Arial",
      color: COLORS.medium,
      bold: true
    });
    
    // Score
    slide.addText(`${Math.round(axis.score)}%`, {
      x: pos.x + 0.2, y: pos.y + 0.5, w: 2, h: 0.6,
      fontSize: 32,
      fontFace: "Arial",
      color: getScoreColor(axis.score),
      bold: true
    });
    
    // Progress bar background
    slide.addShape("rect", {
      x: pos.x + 0.2, y: pos.y + 1.1, w: 4, h: 0.15,
      fill: { type: "solid", color: COLORS.soft }
    });
    
    // Progress bar fill
    slide.addShape("rect", {
      x: pos.x + 0.2, y: pos.y + 1.1, w: Math.max(0.1, (axis.score / 100) * 4), h: 0.15,
      fill: { type: "solid", color: axis.color }
    });
  });
  
  // Interpretation text
  const interpretation = compass.mainStrength && compass.mainLimitation
    ? `Lecture TFCL : Ce profil favorise ${compass.mainStrength.toLowerCase()} au détriment de ${compass.mainLimitation.toLowerCase()}.`
    : "Lecture TFCL : Profil équilibré sans limitation majeure identifiée.";
  
  slide.addShape("roundRect", {
    x: 0.5, y: 4.5, w: 9, h: 0.8,
    fill: { type: "solid", color: COLORS.soft }
  });
  
  slide.addText(interpretation, {
    x: 0.7, y: 4.6, w: 8.6, h: 0.6,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.dark,
    italic: true
  });
}

function addVLamaxSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("VLamax : zone de fonctionnement, pas chiffre absolu", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const vlamax = payload.vlamax;
  const value = vlamax.value;
  
  // Zone visualization
  const zones = [
    { label: "Très basse", min: 0, max: 0.3, color: COLORS.aerobic, desc: "Ultra-endurance" },
    { label: "Basse", min: 0.3, max: 0.4, color: COLORS.success, desc: "Distance longue" },
    { label: "Optimale", min: 0.4, max: 0.5, color: COLORS.warning, desc: "Équilibré" },
    { label: "Élevée", min: 0.5, max: 0.6, color: COLORS.glycolytic, desc: "Puissance" },
    { label: "Très élevée", min: 0.6, max: 1.0, color: COLORS.danger, desc: "Sprint" }
  ];
  
  // Draw zone bar
  const barY = 1.5;
  const barWidth = 8;
  let xOffset = 1;
  
  zones.forEach((zone) => {
    const zoneWidth = ((zone.max - zone.min) / 1.0) * barWidth;
    slide.addShape("rect", {
      x: xOffset, y: barY, w: zoneWidth, h: 0.6,
      fill: { type: "solid", color: zone.color }
    });
    
    // Zone label
    slide.addText(zone.label, {
      x: xOffset, y: barY + 0.65, w: zoneWidth, h: 0.25,
      fontSize: 9,
      fontFace: "Arial",
      color: COLORS.medium,
      align: "center"
    });
    
    xOffset += zoneWidth;
  });
  
  // Current position marker
  if (value !== null) {
    const markerX = 1 + (value / 1.0) * barWidth;
    slide.addShape("triangle", {
      x: markerX - 0.1, y: barY - 0.2, w: 0.2, h: 0.2,
      fill: { type: "solid", color: COLORS.dark },
      rotate: 180
    });
    
    // Value label
    slide.addText(`${fmt(value, 2)} mmol/L/s`, {
      x: markerX - 0.6, y: barY - 0.6, w: 1.2, h: 0.35,
      fontSize: 12,
      fontFace: "Arial",
      color: COLORS.dark,
      bold: true,
      align: "center"
    });
  }
  
  // Info cards
  const cards = [
    { 
      label: "Zone actuelle", 
      value: getVLamaxZoneLabel(value),
      color: COLORS.glycolytic 
    },
    { 
      label: "Source", 
      value: getSourceLabel(vlamax.source),
      color: COLORS.medium 
    },
    { 
      label: "Confiance", 
      value: fmtPct(vlamax.confidence),
      color: COLORS.success 
    }
  ];
  
  let cardX = 0.5;
  cards.forEach((card) => {
    slide.addShape("roundRect", {
      x: cardX, y: 2.8, w: 3, h: 1.0,
      fill: { type: "solid", color: COLORS.soft },
      line: { color: card.color, width: 1.5 }
    });
    
    slide.addText(card.label, {
      x: cardX + 0.15, y: 2.9, w: 2.7, h: 0.3,
      fontSize: 10,
      fontFace: "Arial",
      color: COLORS.medium
    });
    
    slide.addText(card.value, {
      x: cardX + 0.15, y: 3.2, w: 2.7, h: 0.4,
      fontSize: 16,
      fontFace: "Arial",
      color: COLORS.dark,
      bold: true
    });
    
    cardX += 3.15;
  });
  
  // Interpretation text
  const objectifLabel = getObjectifLabel(payload.athlete.goal || "IM");
  const interpretation = value !== null
    ? `Pour un objectif ${objectifLabel}, une VLamax ${value < 0.4 ? "basse est favorable à l'endurance de longue durée" : value < 0.5 ? "dans cette zone permet un bon équilibre aérobie/anaérobie" : "élevée nécessite une attention particulière à la gestion de l'effort"}.`
    : "Données VLamax non disponibles. Un test métabolique est recommandé.";
  
  slide.addShape("roundRect", {
    x: 0.5, y: 4.1, w: 9, h: 1.0,
    fill: { type: "solid", color: COLORS.soft }
  });
  
  slide.addText(interpretation, {
    x: 0.7, y: 4.2, w: 8.6, h: 0.8,
    fontSize: 13,
    fontFace: "Arial",
    color: COLORS.dark,
    italic: true,
    valign: "middle"
  });
}

function addDurabilityFatigueSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Ce qui limite la performance aujourd'hui", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const tte = payload.tte;
  const compass = payload.compassScores;
  const snapshot = payload.effectiveSnapshot;
  
  // TTE Card
  slide.addShape("roundRect", {
    x: 0.5, y: 1.1, w: 4.3, h: 2.2,
    fill: { type: "solid", color: COLORS.white },
    line: { color: COLORS.success, width: 2 },
    shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.2 }
  });
  
  slide.addText("⏱ Durabilité (TTE)", {
    x: 0.7, y: 1.25, w: 3.9, h: 0.35,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.success,
    bold: true
  });
  
  slide.addText(tte.tte_min !== null ? `${tte.tte_min} min` : "—", {
    x: 0.7, y: 1.7, w: 3.9, h: 0.6,
    fontSize: 36,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  slide.addText(`Cible: ${tte.target || "—"} min`, {
    x: 0.7, y: 2.35, w: 3.9, h: 0.3,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.medium
  });
  
  slide.addText(tte.label || "Source inconnue", {
    x: 0.7, y: 2.7, w: 3.9, h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
  
  // Fatigue Card - use fatigue_state from snapshot or infer from tss_7d
  const tss7d = snapshot?.tss_7d;
  let fatigueState = "unknown";
  if (tss7d !== null && tss7d !== undefined) {
    if (tss7d < 300) fatigueState = "fresh";
    else if (tss7d < 500) fatigueState = "moderate";
    else fatigueState = "tired";
  }
  
  const fatigueColor = fatigueState === "fresh" ? COLORS.success : 
                       fatigueState === "tired" ? COLORS.danger : COLORS.warning;
  const fatigueLabel = fatigueState === "fresh" ? "Frais" :
                       fatigueState === "tired" ? "Fatigué" : "Modérée";
  
  slide.addShape("roundRect", {
    x: 5.2, y: 1.1, w: 4.3, h: 2.2,
    fill: { type: "solid", color: COLORS.white },
    line: { color: fatigueColor, width: 2 },
    shadow: { type: "outer", blur: 3, offset: 2, angle: 45, opacity: 0.2 }
  });
  
  slide.addText("💤 État de fatigue", {
    x: 5.4, y: 1.25, w: 3.9, h: 0.35,
    fontSize: 12,
    fontFace: "Arial",
    color: fatigueColor,
    bold: true
  });
  
  slide.addText(fatigueLabel, {
    x: 5.4, y: 1.7, w: 3.9, h: 0.6,
    fontSize: 32,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  slide.addText(tss7d ? `TSS 7j: ${tss7d}` : "Charge: —", {
    x: 5.4, y: 2.35, w: 3.9, h: 0.3,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.medium
  });
  
  // Interpretation
  let interpretation = "Analyse causale : ";
  if (compass.toleranceEffort.score < 60) {
    interpretation += "La durabilité est le facteur limitant principal. Prioriser le travail de seuil prolongé.";
  } else if (fatigueState === "tired") {
    interpretation += "La fatigue accumulée impacte le potentiel de performance. Période de récupération recommandée.";
  } else {
    interpretation += "Équilibre charge/récupération satisfaisant. Continuer la progression.";
  }
  
  slide.addShape("roundRect", {
    x: 0.5, y: 3.5, w: 9, h: 0.9,
    fill: { type: "solid", color: COLORS.soft }
  });
  
  slide.addText(interpretation, {
    x: 0.7, y: 3.6, w: 8.6, h: 0.7,
    fontSize: 13,
    fontFace: "Arial",
    color: COLORS.dark,
    italic: true,
    valign: "middle"
  });
}

function addTFCLSignatureSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  
  slide.addText("Décision robuste vs précision absolue", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  // Draw 2D matrix
  const matrixX = 1;
  const matrixY = 1.2;
  const matrixW = 7.5;
  const matrixH = 3.5;
  
  // Background grid
  slide.addShape("rect", {
    x: matrixX, y: matrixY, w: matrixW, h: matrixH,
    fill: { type: "solid", color: COLORS.soft },
    line: { color: COLORS.light, width: 1 }
  });
  
  // Quadrant lines
  slide.addShape("line", {
    x: matrixX + matrixW / 2, y: matrixY,
    w: 0, h: matrixH,
    line: { color: COLORS.light, width: 1, dashType: "dash" }
  });
  
  slide.addShape("line", {
    x: matrixX, y: matrixY + matrixH / 2,
    w: matrixW, h: 0,
    line: { color: COLORS.light, width: 1, dashType: "dash" }
  });
  
  // Axis labels
  slide.addText("Précision des données →", {
    x: matrixX, y: matrixY + matrixH + 0.1, w: matrixW, h: 0.3,
    fontSize: 11,
    fontFace: "Arial",
    color: COLORS.medium,
    align: "center"
  });
  
  slide.addText("Robustesse décisionnelle", {
    x: 0.2, y: matrixY + matrixH / 2 - 0.15, w: 0.7, h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    color: COLORS.medium,
    rotate: 270
  });
  
  // Position markers
  const positions = [
    { label: "TFCL", x: 0.55, y: 0.25, color: COLORS.primary, size: 14 },
    { label: "INSCYD", x: 0.85, y: 0.35, color: COLORS.glycolytic, size: 12 },
    { label: "Tests terrain", x: 0.35, y: 0.55, color: COLORS.success, size: 12 },
    { label: "Intuition coach", x: 0.2, y: 0.75, color: COLORS.light, size: 12 }
  ];
  
  positions.forEach((pos) => {
    const px = matrixX + pos.x * matrixW;
    const py = matrixY + (1 - pos.y) * matrixH;
    
    // Circle marker
    slide.addShape("ellipse", {
      x: px - 0.15, y: py - 0.15, w: 0.3, h: 0.3,
      fill: { type: "solid", color: pos.color }
    });
    
    // Label
    slide.addText(pos.label, {
      x: px + 0.2, y: py - 0.12, w: 1.5, h: 0.25,
      fontSize: pos.size === 14 ? 12 : 10,
      fontFace: "Arial",
      color: pos.color,
      bold: pos.label === "TFCL"
    });
  });
  
  // Key message
  slide.addShape("roundRect", {
    x: 0.5, y: 4.9, w: 9, h: 0.6,
    fill: { type: "solid", color: COLORS.primary }
  });
  
  slide.addText("TFCL privilégie la robustesse décisionnelle accessible", {
    x: 0.7, y: 5.0, w: 8.6, h: 0.4,
    fontSize: 14,
    fontFace: "Arial",
    color: COLORS.white,
    bold: true,
    align: "center",
    valign: "middle"
  });
}

function addTrainingImplicationsSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Ce que cela implique concrètement", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const compass = payload.compassScores;
  const lorang = payload.lorang;
  
  // Generate implications based on profile
  let prioritize: string[] = [];
  let maintain: string[] = [];
  let avoid: string[] = [];
  
  // Logic based on compass scores and priority
  if (lorang.priorite === "VLAMAX_DOWN" || compass.profilMetabolique.score < 60) {
    prioritize = ["Sorties longues en Zone 2 (4-6h)", "Sweet Spot 2x30-40min", "Tempo prolongé"];
    maintain = ["Volume aérobie de base", "Récupération active"];
    avoid = ["Sprints courts répétés", "Intervalles < 30s", "Séances glycolytiques"];
  } else if (lorang.priorite === "TTE_UP" || compass.toleranceEffort.score < 60) {
    prioritize = ["Travail au seuil prolongé (2x20-30min)", "Intervalles longs à 95-105% FTP", "Sorties tempo soutenues"];
    maintain = ["Endurance fondamentale", "Intensité modérée"];
    avoid = ["Surcharge de volume", "Intensité > seuil fréquente"];
  } else {
    prioritize = ["Maintenir l'équilibre actuel", "Séances spécifiques objectif"];
    maintain = ["Volume et intensité stables", "Récupération qualitative"];
    avoid = ["Changements brusques", "Surcharge non planifiée"];
  }
  
  // Add recommendations from lorang if available
  if (lorang.recommandations.length > 0) {
    prioritize = lorang.recommandations.slice(0, 3);
  }
  
  const blocks = [
    { title: "✓ À PRIORISER", items: prioritize, color: COLORS.success, bgColor: "DCFCE7" },
    { title: "= À MAINTENIR", items: maintain, color: COLORS.warning, bgColor: "FEF3C7" },
    { title: "✗ À ÉVITER", items: avoid, color: COLORS.danger, bgColor: "FEE2E2" }
  ];
  
  let xPos = 0.5;
  blocks.forEach((block) => {
    // Card
    slide.addShape("roundRect", {
      x: xPos, y: 1.1, w: 3, h: 3.8,
      fill: { type: "solid", color: block.bgColor },
      line: { color: block.color, width: 2 }
    });
    
    // Title
    slide.addText(block.title, {
      x: xPos + 0.15, y: 1.2, w: 2.7, h: 0.4,
      fontSize: 12,
      fontFace: "Arial",
      color: block.color,
      bold: true
    });
    
    // Items
    let itemY = 1.7;
    block.items.forEach((item) => {
      slide.addText(`• ${item}`, {
        x: xPos + 0.15, y: itemY, w: 2.7, h: 0.5,
        fontSize: 11,
        fontFace: "Arial",
        color: COLORS.dark,
        valign: "top"
      });
      itemY += 0.55;
    });
    
    xPos += 3.15;
  });
}

function addUncertaintiesSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Ce que l'on sait / ce que l'on estime", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const vlamax = payload.vlamax;
  const tte = payload.tte;
  const snap = payload.effectiveSnapshot;
  
  // Measured data
  const measured: string[] = [];
  const estimated: string[] = [];
  const unknown: string[] = [];
  
  // Categorize data
  if (snap?.ftp) measured.push(`FTP: ${snap.ftp} W`);
  else unknown.push("FTP");
  
  if (snap?.weight_kg) measured.push(`Poids: ${snap.weight_kg} kg`);
  else unknown.push("Poids");
  
  if (snap?.fc_max) measured.push(`FC Max: ${snap.fc_max} bpm`);
  else estimated.push("FC Max (formule)");
  
  if (vlamax.source === "test" || vlamax.source === "snapshot") {
    measured.push(`VLamax: ${fmt(vlamax.value)} mmol/L/s`);
  } else if (vlamax.source === "estimated") {
    estimated.push(`VLamax: ${fmt(vlamax.value)} mmol/L/s`);
  } else {
    unknown.push("VLamax");
  }
  
  if (tte.source === "observed") {
    measured.push(`TTE: ${tte.tte_min} min`);
  } else if (tte.source === "estimated") {
    estimated.push(`TTE: ${tte.tte_min} min`);
  } else {
    unknown.push("TTE");
  }
  
  if (snap?.vo2max) measured.push(`VO2max: ${snap.vo2max} ml/kg/min`);
  else estimated.push("VO2max (estimé)");
  
  const categories = [
    { title: "✓ Données mesurées", items: measured, color: COLORS.success, icon: "📊" },
    { title: "⚠ Données estimées", items: estimated, color: COLORS.warning, icon: "📈" },
    { title: "? Incertitudes", items: unknown, color: COLORS.light, icon: "❓" }
  ];
  
  let yPos = 1.1;
  categories.forEach((cat) => {
    if (cat.items.length === 0) return;
    
    slide.addShape("roundRect", {
      x: 0.5, y: yPos, w: 5.5, h: 0.3 + cat.items.length * 0.35,
      fill: { type: "solid", color: COLORS.soft },
      line: { color: cat.color, width: 1.5 }
    });
    
    slide.addText(`${cat.icon} ${cat.title}`, {
      x: 0.7, y: yPos + 0.05, w: 5.1, h: 0.3,
      fontSize: 11,
      fontFace: "Arial",
      color: cat.color,
      bold: true
    });
    
    cat.items.forEach((item, idx) => {
      slide.addText(`• ${item}`, {
        x: 0.9, y: yPos + 0.35 + idx * 0.35, w: 4.9, h: 0.3,
        fontSize: 10,
        fontFace: "Arial",
        color: COLORS.dark
      });
    });
    
    yPos += 0.45 + cat.items.length * 0.35;
  });
  
  // Lab test recommendation
  slide.addShape("roundRect", {
    x: 6.2, y: 1.1, w: 3.3, h: 2.5,
    fill: { type: "solid", color: COLORS.primary }
  });
  
  slide.addText("🔬 Test labo", {
    x: 6.4, y: 1.25, w: 2.9, h: 0.35,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.white,
    bold: true
  });
  
  const labAdvice = unknown.length > 2 || !measured.some(m => m.includes("VLamax"))
    ? "Un test métabolique en laboratoire est recommandé pour affiner les valeurs clés."
    : "Les données actuelles sont suffisantes. Un test labo peut affiner la VLamax.";
  
  slide.addText(labAdvice, {
    x: 6.4, y: 1.7, w: 2.9, h: 1.5,
    fontSize: 11,
    fontFace: "Arial",
    color: COLORS.soft,
    valign: "top"
  });
  
  // Credibility footer
  slide.addText("But : augmenter la crédibilité scientifique en distinguant mesure et estimation", {
    x: 0.5, y: 5.1, w: 9, h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
}

function addActionPlanSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Plan d'action recommandé", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const lorang = payload.lorang;
  const readiness = payload.raceReadiness;
  const ambitionDef = getAmbitionDefinition(payload.ambition);
  
  // Action items
  const actions = [
    {
      icon: "🎯",
      title: "Priorité physiologique",
      content: lorang.prioriteLabel || "Maintenir l'équilibre actuel",
      color: COLORS.primary
    },
    {
      icon: "📆",
      title: "Prochain bloc clé",
      content: readiness.score >= 80 
        ? "Affûtage pré-compétition (2-3 semaines)"
        : "Développement spécifique (4-6 semaines)",
      color: COLORS.success
    },
    {
      icon: "🔬",
      title: "Prochain test utile",
      content: payload.vlamax.source === "estimated" 
        ? "Test VLamax terrain ou labo"
        : "Test TTE / seuil fonctionnel",
      color: COLORS.glycolytic
    },
    {
      icon: "⏳",
      title: "Horizon réaliste",
      content: `Objectif ${ambitionDef.label} atteignable sous 3-6 mois avec travail ciblé`,
      color: COLORS.warning
    }
  ];
  
  let yPos = 1.1;
  actions.forEach((action) => {
    // Card
    slide.addShape("roundRect", {
      x: 0.5, y: yPos, w: 9, h: 0.95,
      fill: { type: "solid", color: COLORS.white },
      line: { color: action.color, width: 2 },
      shadow: { type: "outer", blur: 2, offset: 1, angle: 45, opacity: 0.15 }
    });
    
    // Icon and title
    slide.addText(`${action.icon} ${action.title}`, {
      x: 0.7, y: yPos + 0.12, w: 3, h: 0.35,
      fontSize: 11,
      fontFace: "Arial",
      color: action.color,
      bold: true
    });
    
    // Content
    slide.addText(action.content, {
      x: 0.7, y: yPos + 0.48, w: 8.6, h: 0.35,
      fontSize: 13,
      fontFace: "Arial",
      color: COLORS.dark
    });
    
    yPos += 1.1;
  });
}

function addStaffAnnexSlide(pptx: PptxGenJS, payload: ExecutiveDeckPayload) {
  const slide = pptx.addSlide();
  
  slide.addText("Annexe technique", {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 24,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  slide.addText("Données détaillées pour le staff technique", {
    x: 0.5, y: 0.75, w: 9, h: 0.3,
    fontSize: 11,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
  
  const snap = payload.effectiveSnapshot;
  const vlamax = payload.vlamax;
  const tte = payload.tte;
  const compass = payload.compassScores;
  
  // Technical data table - using TableCell format
  const tableData: PptxGenJS.TableRow[] = [
    [
      { text: "Métrique", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Valeur", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Plage cible", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Confiance", options: { bold: true, fill: { color: COLORS.soft } } }
    ],
    [
      { text: "VLamax" },
      { text: `${fmt(vlamax.value)} mmol/L/s` },
      { text: "0.30 - 0.45" },
      { text: fmtPct(vlamax.confidence) }
    ],
    [
      { text: "TTE" },
      { text: `${tte.tte_min || "—"} min` },
      { text: `> ${tte.target || 45} min` },
      { text: fmtPct(0.7) }
    ],
    [
      { text: "FTP" },
      { text: `${snap?.ftp || "—"} W` },
      { text: "—" },
      { text: snap?.ftp ? "100%" : "—" }
    ],
    [
      { text: "FTP/kg" },
      { text: `${snap?.ftp && snap?.weight_kg ? fmt(snap.ftp / snap.weight_kg, 2) : "—"} W/kg` },
      { text: "—" },
      { text: "—" }
    ],
    [
      { text: "VO2max" },
      { text: `${snap?.vo2max || "—"} ml/kg/min` },
      { text: "—" },
      { text: snap?.vo2max ? "100%" : "Est." }
    ],
    [
      { text: "FC Max" },
      { text: `${snap?.fc_max || "—"} bpm` },
      { text: "—" },
      { text: snap?.fc_max ? "100%" : "Est." }
    ],
    [
      { text: "TSS 7j" },
      { text: `${snap?.tss_7d || "—"}` },
      { text: "—" },
      { text: "—" }
    ]
  ];
  
  slide.addTable(tableData, {
    x: 0.5, y: 1.15, w: 9, h: 2.5,
    fontFace: "Arial",
    fontSize: 10,
    color: COLORS.dark,
    border: { pt: 0.5, color: COLORS.light },
    colW: [2.5, 2, 2.5, 2],
    valign: "middle"
  });
  
  // Compass scores summary
  slide.addText("Scores Compass TFCL", {
    x: 0.5, y: 4.0, w: 9, h: 0.35,
    fontSize: 12,
    fontFace: "Arial",
    color: COLORS.dark,
    bold: true
  });
  
  const compassData: PptxGenJS.TableRow[] = [
    [
      { text: "Axe", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Score", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Score brut", options: { bold: true, fill: { color: COLORS.soft } } },
      { text: "Formule", options: { bold: true, fill: { color: COLORS.soft } } }
    ],
    [
      { text: "Capacité Aérobie" },
      { text: `${Math.round(compass.capaciteAerobie.score)}%` },
      { text: `${Math.round(compass.capaciteAerobie.rawScore)}%` },
      { text: compass.capaciteAerobie.formula || "—" }
    ],
    [
      { text: "Durabilité" },
      { text: `${Math.round(compass.toleranceEffort.score)}%` },
      { text: `${Math.round(compass.toleranceEffort.rawScore)}%` },
      { text: compass.toleranceEffort.formula || "—" }
    ],
    [
      { text: "Profil Métabolique" },
      { text: `${Math.round(compass.profilMetabolique.score)}%` },
      { text: `${Math.round(compass.profilMetabolique.rawScore)}%` },
      { text: compass.profilMetabolique.formula || "—" }
    ],
    [
      { text: "Robustesse" },
      { text: `${Math.round(compass.robustesse.score)}%` },
      { text: `${Math.round(compass.robustesse.rawScore)}%` },
      { text: compass.robustesse.formula || "—" }
    ]
  ];
  
  slide.addTable(compassData, {
    x: 0.5, y: 4.35, w: 9, h: 1.2,
    fontFace: "Arial",
    fontSize: 9,
    color: COLORS.dark,
    border: { pt: 0.5, color: COLORS.light },
    colW: [2, 1.8, 1.8, 3.4],
    valign: "middle"
  });
  
  // Reference
  slide.addText("Référence: Two For Coaching Lab Academy TFCL v2.0", {
    x: 0.5, y: 5.3, w: 9, h: 0.2,
    fontSize: 8,
    fontFace: "Arial",
    color: COLORS.light,
    italic: true
  });
}

// =============================================
// MAIN EXPORT FUNCTION
// =============================================

export async function generateExecutiveDeck(
  payload: ExecutiveDeckPayload,
  options: ExecutiveDeckOptions = {
    includeStaffAnnex: true,
    includeAthleteSimplified: false,
    includeHistoricalComparison: false,
    darkMode: false
  }
): Promise<void> {
  const pptx = new PptxGenJS();
  
  // Presentation metadata
  pptx.author = "Two For Coaching Lab";
  pptx.title = `TFCL Executive Performance Deck - ${payload.athlete.name}`;
  pptx.subject = "Performance Analysis";
  pptx.company = "Two For Coaching Lab";
  
  // Default slide size (16:9)
  pptx.defineLayout({ name: "CUSTOM", width: 10, height: 5.625 });
  pptx.layout = "CUSTOM";
  
  // Build slides
  addCoverSlide(pptx, payload);                    // Slide 1
  addExecutiveSummarySlide(pptx, payload);         // Slide 2
  addMetabolicProfileSlide(pptx, payload);         // Slide 3
  addVLamaxSlide(pptx, payload);                   // Slide 4
  addDurabilityFatigueSlide(pptx, payload);        // Slide 5
  addTFCLSignatureSlide(pptx);                     // Slide 6
  addTrainingImplicationsSlide(pptx, payload);     // Slide 7
  addUncertaintiesSlide(pptx, payload);            // Slide 8
  addActionPlanSlide(pptx, payload);               // Slide 9
  
  if (options.includeStaffAnnex) {
    addStaffAnnexSlide(pptx, payload);             // Slide 10
  }
  
  // Generate and download
  const fileName = `TFCL-Executive-Deck-${payload.athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
  await pptx.writeFile({ fileName });
}

// =============================================
// DEFAULT OPTIONS EXPORT
// =============================================

export const DEFAULT_DECK_OPTIONS: ExecutiveDeckOptions = {
  includeStaffAnnex: true,
  includeAthleteSimplified: false,
  includeHistoricalComparison: false,
  darkMode: false
};

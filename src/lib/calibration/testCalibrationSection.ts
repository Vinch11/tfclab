/**
 * Tests & Calibration Section for Staff Report V2
 * Génère la section "Tests réalisés & calibration TFCL" pour le PDF
 */

import type { CalibrationResult, BeforeAfterSummary } from "@/lib/calibration";
import type { DbTest } from "@/hooks/useCloudData";

export interface TestCalibrationSection {
  testsRealises: TestResumeItem[];
  impactCalibration: BeforeAfterSummary[];
  avertissement: string;
  globalConfidence: number;
  notes: string[];
}

export interface TestResumeItem {
  date: string;
  type: string;
  resultBrut: string;
  validite: "OK" | "WARNING" | "INVALID";
  qualiteProtocole: number;
  confidence: number;
}

/**
 * Génère la section Tests & Calibration pour le rapport staff
 */
export function generateTestCalibrationSection(
  tests: DbTest[],
  athleteId: string,
  calibration: CalibrationResult | null
): TestCalibrationSection {
  // Filtrer les tests de l'athlète
  const athleteTests = tests.filter(t => t.athlete_id === athleteId);
  
  // Mapper les tests
  const testsRealises: TestResumeItem[] = athleteTests.map(t => {
    const raw = t.raw as Record<string, any> | null;
    let resultBrut = "—";
    
    if (t.vlamax !== null) {
      resultBrut = `VLamax: ${t.vlamax.toFixed(2)}`;
    } else if (raw?.tte_minutes) {
      resultBrut = `TTE: ${raw.tte_minutes} min`;
    } else if (raw?.avgPower) {
      resultBrut = `P15s: ${raw.avgPower} W`;
    }
    
    // Déterminer validité
    let validite: "OK" | "WARNING" | "INVALID" = "OK";
    if (raw?.variance) {
      if (raw.variance > 10) validite = "INVALID";
      else if (raw.variance > 5) validite = "WARNING";
    }
    
    // Qualité protocole
    let qualiteProtocole = 3;
    if (t.reliability !== null) {
      if (t.reliability >= 0.85) qualiteProtocole = 5;
      else if (t.reliability >= 0.75) qualiteProtocole = 4;
      else if (t.reliability >= 0.60) qualiteProtocole = 3;
      else if (t.reliability >= 0.45) qualiteProtocole = 2;
      else qualiteProtocole = 1;
    }
    
    return {
      date: typeof t.date === "string" ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10),
      type: t.name || t.type,
      resultBrut,
      validite,
      qualiteProtocole,
      confidence: t.reliability ?? 0.70,
    };
  });
  
  return {
    testsRealises,
    impactCalibration: calibration?.summary ?? [],
    avertissement: `Les tests terrain augmentent la robustesse des décisions en réduisant l'incertitude du modèle. Ils ne transforment pas une estimation en mesure médicale, mais améliorent la cohérence physiologique.`,
    globalConfidence: calibration?.globalConfidence ?? 0.50,
    notes: calibration?.calibrationNotes ?? [],
  };
}

/**
 * Génère le texte formaté pour la section Tests & Calibration du PDF
 */
export function generateTestCalibrationPDFText(section: TestCalibrationSection): string {
  const lines: string[] = [];
  
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("5. TESTS RÉALISÉS & CALIBRATION TFCL");
  lines.push("───────────────────────────────────────────────────────────");
  lines.push("");
  
  // A) Liste des tests
  if (section.testsRealises.length > 0) {
    lines.push("Tests réalisés :");
    lines.push("");
    lines.push("  Date       | Type                | Résultat      | Validité | Qualité");
    lines.push("  -----------|---------------------|---------------|----------|--------");
    
    for (const test of section.testsRealises) {
      const validiteSymbol = test.validite === "OK" ? "✓" : test.validite === "WARNING" ? "~" : "✗";
      lines.push(`  ${test.date} | ${test.type.padEnd(19)} | ${test.resultBrut.padEnd(13)} | ${validiteSymbol.padEnd(8)} | ${test.qualiteProtocole}/5`);
    }
    lines.push("");
  } else {
    lines.push("Aucun test TFCL réalisé.");
    lines.push("");
  }
  
  // B) Impact calibration AVANT/APRÈS
  if (section.impactCalibration.length > 0) {
    lines.push("Impact de la calibration :");
    lines.push("");
    lines.push("  Métrique | AVANT (modèle)     | APRÈS (calibré)    | Delta");
    lines.push("  ---------|--------------------|--------------------|-------");
    
    for (const item of section.impactCalibration) {
      const beforeVal = item.before.value !== null ? formatValue(item.before.value, item.metric) : "—";
      const afterVal = item.after.value !== null ? formatValue(item.after.value, item.metric) : "—";
      const delta = item.delta !== null ? formatDelta(item.delta, item.metric) : "—";
      
      lines.push(`  ${item.metric.padEnd(8)} | ${beforeVal.padEnd(18)} | ${afterVal.padEnd(18)} | ${delta}`);
    }
    lines.push("");
    
    // Explication
    for (const item of section.impactCalibration) {
      if (item.impact.quality !== "low") {
        lines.push(`  → ${item.metric} : ${item.impact.message}`);
      }
    }
    lines.push("");
  }
  
  // Confiance
  const confLabel = section.globalConfidence >= 0.80 
    ? "cohérence élevée" 
    : section.globalConfidence >= 0.60 
      ? "cohérence modérée" 
      : "lecture prudente";
  
  lines.push(`Confiance globale : ${(section.globalConfidence * 100).toFixed(0)}% (${confLabel})`);
  lines.push("");
  
  // Avertissement
  lines.push("┌─────────────────────────────────────────────────────────┐");
  lines.push("│ AVERTISSEMENT                                           │");
  lines.push("├─────────────────────────────────────────────────────────┤");
  lines.push(`│ ${section.avertissement.slice(0, 57).padEnd(57)} │`);
  lines.push(`│ ${section.avertissement.slice(57, 114).padEnd(57)} │`);
  lines.push("│                                                         │");
  lines.push("│ Les valeurs calibrées restent dépendantes du protocole  │");
  lines.push("│ et du contexte (fatigue, nutrition, environnement).     │");
  lines.push("│ Un test labo est recommandé si une décision critique    │");
  lines.push("│ dépend d'une précision maximale.                        │");
  lines.push("└─────────────────────────────────────────────────────────┘");
  lines.push("");
  
  return lines.join("\n");
}

function formatValue(value: number, metric: string): string {
  if (metric === "VLamax") return `${value.toFixed(2)} mmol/L/s`;
  if (metric === "TTE") return `${value.toFixed(0)} min`;
  if (metric === "FatMax") return `${value.toFixed(0)} W`;
  return value.toFixed(2);
}

function formatDelta(delta: number, metric: string): string {
  const sign = delta >= 0 ? "+" : "";
  if (metric === "VLamax") return `${sign}${delta.toFixed(2)}`;
  if (metric === "TTE") return `${sign}${delta.toFixed(0)} min`;
  if (metric === "FatMax") return `${sign}${delta.toFixed(0)} W`;
  return `${sign}${delta.toFixed(2)}`;
}

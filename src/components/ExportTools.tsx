// =============================================
// OUTILS EXPORT PDF – RAPPORT STAFF-GRADE COMPLET
// Two For Coaching Lab – Performance & Metabolic Report
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
import { getEffectiveSnapshot, getEffectiveRefs, type EffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, type TTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, type RaceReadinessEffectif, getTargets, getRaceWeights } from "@/lib/raceReadinessEffectif";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";
import { TRAINING_ZONES, computeZoneAbsoluteValues, ZONES_METHODOLOGY_NOTE, type AthleteZoneRefs } from "@/lib/trainingZonesDefinition";
import { reglesDanLorang, getPrioriteLabel, getSeancesRecommandees, PrioriteType } from "@/types/reglesDanLorang";
import { SEANCES } from "@/types/seances";
import { computeNutritionEstimate, type NutritionEstimate } from "@/lib/nutritionPredictive";
import { computeCAPInjuryRisk, getCAPRiskIcon } from "@/lib/capInjuryRisk";
import logoUrl from "@/assets/logo-2fc.png";
// ✅ NEW: Import Compass Scoring et CRR
import { computeCRR, computeChargeScore, getCRRTargets, type ChargeRecenteReference, type ChargeScore } from "@/lib/chargeRecenteReference";
import { computeCompassScores, type CompassScores, type CompassAxisScore } from "@/lib/compassScoring";

// =============================================
// TYPES
// =============================================

interface ExportToolsProps {
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  tests: DbTest[];
  checkins?: DbCheckin[];
  staffMode?: boolean;
}

// Payload normalisé pour toutes les sections du rapport
interface ExportPayload {
  athlete: {
    id: string;
    name: string;
    goal: string | null;
    refs: Record<string, number | null>;
  };
  effectiveSnapshot: DbSnapshot | null;
  effectiveRefs: EffectiveRefs;
  vlamax: VLamaxEffectif;
  tte: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
  lorang: {
    priorite: PrioriteType;
    prioriteLabel: string;
    alertes: string[];
    recommandations: string[];
    seancesCodes: string[];
    seancesDetails: Array<{ code: string; nom: string; objectif: string }>;
  };
  tests: DbTest[];
  snapshotHistory: DbSnapshot[];
  checkins: DbCheckin[];
  completude: {
    score: number;
    manquants: string[];
  };
  reportDate: string;
  nutritionEstimate: NutritionEstimate | null;
  capInjuryRisk: {
    level: number;
    label: string;
    icon: string;
    globalIndex: number;
    factors: { vlamaxContribution: number; tteContribution: number; chargeContribution: number };
    staffAnalysis: string;
  } | null;
  // ✅ NEW: CRR et Compass Scores
  crr: ChargeRecenteReference;
  chargeScore: ChargeScore;
  compassScores: CompassScores;
}

// =============================================
// HELPERS
// =============================================

function safe(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(n: number | null | undefined, d = 2): string {
  return typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
}

function fmtPct(n: number | null | undefined): string {
  return typeof n === "number" && !isNaN(n) ? `${Math.round(n * 100)}%` : "—";
}

function dtStr(iso: string | Date | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return safe(iso);
  }
}

function htmlEscape(s: string): string {
  return safe(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseRefs(refs: unknown): Record<string, number | null> {
  if (!refs || typeof refs !== "object") return {};
  return refs as Record<string, number | null>;
}

function getAthleteRefsForZones(effectiveRefs: EffectiveRefs): AthleteRefsForZones {
  return {
    fcMax: effectiveRefs.fcMax,
    vma: effectiveRefs.vma,
    ftp: effectiveRefs.ftp,
    css: effectiveRefs.css
  };
}

function getObjectifLabel(objectif: string | null): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3",
    Half: "Half Ironman",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Trail: "Trail",
    TrailCourt: "Trail Court",
    TrailLong: "Trail Long",
    Ultra: "Ultra",
    Course: "Course à pied"
  };
  return labels[objectif || ""] || objectif || "—";
}

function getRecommandationsPriorite(priorite: PrioriteType): string[] {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return ["Privilégier les sorties longues Z2 (4-6h)", "Éviter les sprints et intervalles courts", "Séances tempo longues (sweet spot 2x30-40min)"];
    case "VLAMAX_UP":
      return ["Ajouter des sprints courts (5-10s max)", "Intervalles courts haute intensité", "Séances de force explosive"];
    case "TTE_UP":
      return ["Séances au seuil prolongées (2x20-30min)", "Intervalles longs à 95-105% FTP", "Sorties tempo soutenues"];
    case "FTP_UTIL":
      return ["Blocs de travail au seuil (sweet spot)", "Intervalles VO2max (3-5min à 105-115% FTP)", "Progression du volume au seuil"];
    case "ENDURANCE_UP":
      return ["Augmenter le volume Z2", "Sorties longues progressives", "Travail au tempo"];
    case "VITESSE_UP":
      return ["Intervalles courts à haute intensité", "Travail de VMA/VO2max", "Séances de côtes"];
    default:
      return ["Maintenir l'équilibre actuel", "Affûtage pré-compétition", "Récupération et fraîcheur"];
  }
}

function zoneAbs(metricKey: string, sportKey: string, zoneKey: string, refs: AthleteRefsForZones): string {
  const metric = ZonesConfig[metricKey];
  if (!metric) return zoneKey;
  const table = metric.sports[sportKey];
  if (!table) return zoneKey;
  const z = table.find((zone) => zone.key === zoneKey);
  if (!z) return zoneKey;
  
  const abs = computeAbsoluteRange(metricKey, sportKey, z, refs);
  return abs && abs.ok 
    ? `${zoneKey} (${z.min}-${z.max}%) → ${abs.display}` 
    : `${zoneKey} (${z.min}-${z.max}%)`;
}

function getStatusIcon(status: "ok" | "warning" | "critical" | undefined): string {
  switch (status) {
    case "ok": return "✅";
    case "warning": return "⚠️";
    case "critical": return "🔴";
    default: return "❔";
  }
}

function getStatusLabel(score: number): string {
  if (score >= 80) return "OK";
  if (score >= 60) return "WARNING";
  return "CRITICAL";
}

// =============================================
// CALCULATE COMPLETUDE SCORE
// =============================================

function calculateCompletude(
  effectiveRefs: EffectiveRefs,
  effectiveSnapshot: DbSnapshot | null,
  tests: DbTest[],
  vlamax: VLamaxEffectif,
  tte: TTEEffectif
): { score: number; manquants: string[] } {
  const manquants: string[] = [];
  let total = 0;
  let filled = 0;

  // Références essentielles
  const checks = [
    { label: "FCmax", value: effectiveRefs.fcMax, weight: 10 },
    { label: "VMA", value: effectiveRefs.vma, weight: 10 },
    { label: "FTP", value: effectiveRefs.ftp, weight: 15 },
    { label: "Poids", value: effectiveRefs.weightKg, weight: 10 },
    { label: "VO2max", value: effectiveRefs.vo2max, weight: 5 },
    { label: "TSS 7d", value: effectiveSnapshot?.tss_7d, weight: 10 },
    { label: "VLamax (test ou mesure)", value: vlamax.source !== "estimated" && vlamax.source !== "unknown" ? vlamax.value : null, weight: 15 },
    { label: "TTE observé", value: tte.source === "observed" ? tte.tte_min : null, weight: 10 },
    { label: "Tests VLamax", value: tests.filter(t => t.vlamax != null).length >= 2 ? 1 : null, weight: 15 },
  ];

  for (const check of checks) {
    total += check.weight;
    if (check.value != null) {
      filled += check.weight;
    } else {
      manquants.push(check.label);
    }
  }

  return {
    score: Math.round((filled / total) * 100),
    manquants
  };
}

// =============================================
// BUILD EXPORT PAYLOAD
// =============================================

function buildExportPayload(
  athlete: DbAthlete,
  snapshots: DbSnapshot[],
  tests: DbTest[],
  checkins: DbCheckin[] = []
): ExportPayload {
  const effectiveSnapshot = getEffectiveSnapshot(athlete, snapshots);
  const effectiveRefs = getEffectiveRefs(athlete, snapshots);
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
  const athleteTests = tests.filter(t => t.athlete_id === athlete.id);
  const athleteCheckins = checkins.filter(c => c.athlete_id === athlete.id);
  
  // Calculer VLamax effectif
  const vlamax = computeVLamaxEffectif({
    athleteId: athlete.id,
    objectif: athlete.goal || "IM",
    activeSnapshotId: athlete.active_snapshot_id,
    tests: athleteTests.map(t => ({
      athlete_id: t.athlete_id,
      vlamax: t.vlamax,
      date: t.date,
      type: t.type,
      name: t.name
    })),
    snapshots: athleteSnapshots.map(s => ({
      id: s.id,
      athlete_id: s.athlete_id,
      date: s.date,
      vlamax: s.vlamax,
      ftp: s.ftp,
      pmax_5s: s.pmax_5s,
      weight_kg: s.weight_kg
    }))
  });
  
  // Calculer TTE effectif
  const tte = computeTTEEffectif({
    ftp: effectiveRefs.ftp,
    tss_7d: effectiveSnapshot?.tss_7d,
    tte_mode: effectiveSnapshot?.tte_mode,
    tte_observed_min: effectiveSnapshot?.tte_observed_min,
    objectif: athlete.goal || "IM"
  });
  
  // Calculer Race Readiness
  const raceReadiness = computeRaceReadinessEffectif({
    objectif: athlete.goal || "IM",
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    ftp: effectiveRefs.ftp,
    poids: effectiveRefs.weightKg,
    fatigue_ok: true,
    seance_specifique_validee: false,
    fcMax: effectiveRefs.fcMax
  });

  // Calculer Dan Lorang
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0
    ? effectiveRefs.ftp / effectiveRefs.weightKg
    : 4.0;
  
  const lorangResult = reglesDanLorang(
    { objectif: athlete.goal || "IM", masse_grasse: 15 } as any,
    vlamax.value ?? 0.45,
    tte.tte_min ?? 45,
    ftpKg,
    false,
    true
  );

  const seancesCodes = getSeancesRecommandees(lorangResult.priorite);
  const seancesDetails = seancesCodes.map(code => {
    const seance = SEANCES[code];
    return {
      code,
      nom: seance?.nom || code,
      objectif: seance?.objectif || "—"
    };
  });

  // Calculer complétude
  const completude = calculateCompletude(effectiveRefs, effectiveSnapshot, athleteTests, vlamax, tte);
  
  // Calculer Nutrition Prédictive
  const nutritionEstimate = computeNutritionEstimate({
    vlamax: vlamax.value,
    objectif: athlete.goal || "IM",
    tteMin: tte.tte_min,
    tteTarget: tte.target ?? 50,
    raceReadiness: raceReadiness.score
  });
  
  // Calculer CAP Injury Risk
  const capRiskResult = computeCAPInjuryRisk({
    vlamaxValue: vlamax.value,
    tteValue: tte.tte_min,
    objectif: athlete.goal || "IM"
  });
  
  const capInjuryRisk = {
    level: capRiskResult.level,
    label: capRiskResult.label,
    icon: getCAPRiskIcon(capRiskResult.level),
    globalIndex: capRiskResult.level * 25,
    factors: {
      vlamaxContribution: vlamax.value ? Math.min(100, (vlamax.value / 0.55) * 100) : 50,
      tteContribution: tte.tte_min ? Math.max(0, 100 - (tte.tte_min / 60) * 100) : 50,
      chargeContribution: effectiveSnapshot?.tss_7d ? Math.min(100, (effectiveSnapshot.tss_7d / 800) * 100) : 50
    },
    staffAnalysis: capRiskResult.staffAnalysis
  };
  
  // ✅ NEW: Calculer CRR et Compass Scores
  const crr = computeCRR({
    tss7d: effectiveSnapshot?.tss_7d ?? null,
    snapshotDate: effectiveSnapshot?.date ?? null
  });
  
  const chargeScore = computeChargeScore(crr, athlete.goal || "IM");
  
  const compassScores = computeCompassScores({
    ftp: effectiveRefs.ftp,
    poids: effectiveRefs.weightKg,
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    crr,
    objectif: athlete.goal || "IM"
  });
  
  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      goal: athlete.goal,
      refs: parseRefs(athlete.refs)
    },
    effectiveSnapshot,
    effectiveRefs,
    vlamax,
    tte,
    raceReadiness,
    lorang: {
      priorite: lorangResult.priorite,
      prioriteLabel: getPrioriteLabel(lorangResult.priorite),
      alertes: lorangResult.alertes,
      recommandations: getRecommandationsPriorite(lorangResult.priorite),
      seancesCodes,
      seancesDetails
    },
    tests: athleteTests,
    snapshotHistory: athleteSnapshots,
    checkins: athleteCheckins,
    completude,
    reportDate: new Date().toISOString(),
    nutritionEstimate,
    capInjuryRisk,
    crr,
    chargeScore,
    compassScores
  };
}

// =============================================
// CHECK IF EXPORT IS POSSIBLE
// =============================================

function canExport(payload: ExportPayload): { ok: boolean; reason?: string } {
  const hasSnapshot = payload.effectiveSnapshot != null;
  const hasTest = payload.tests.length > 0;
  const hasMinimalData = payload.effectiveRefs.ftp != null || payload.effectiveRefs.weightKg != null;
  
  if (!hasSnapshot && !hasTest && !hasMinimalData) {
    return {
      ok: false,
      reason: "Aucune donnée suffisante à exporter. Ajoutez un snapshot (FTP, poids, TSS 7d) ou un test."
    };
  }
  
  return { ok: true };
}

// =============================================
// CONVERT IMAGE TO BASE64
// =============================================

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// =============================================
// BUILD PREMIUM HTML REPORT
// =============================================

function buildStaffGradeReportHTML(payload: ExportPayload, logoBase64: string): string {
  const { 
    athlete, effectiveSnapshot, effectiveRefs, 
    vlamax, tte, raceReadiness, lorang,
    tests, snapshotHistory, checkins, completude, reportDate,
    nutritionEstimate, capInjuryRisk
  } = payload;
  
  const refs = getAthleteRefsForZones(effectiveRefs);
  const targets = getTargets(athlete.goal || "IM");
  const weights = getRaceWeights(athlete.goal || "IM");

  const brandMain = "Two For Coaching Lab";
  const brandSub = "Performance & Metabolic Report";
  const createdAt = new Date(reportDate);
  const title = `${brandMain} — Performance & Metabolic Report — ${athlete.name || "Athlète"}`;

  const coverObjective = htmlEscape(getObjectifLabel(athlete.goal));
  const coverAthlete = htmlEscape(athlete.name || "Athlète");
  const coverDate = htmlEscape(createdAt.toLocaleDateString("fr-FR"));
  const snapshotDate = effectiveSnapshot ? dtStr(effectiveSnapshot.date) : "—";
  const snapshotSource = effectiveSnapshot?.source || "—";
  const cycleTag = effectiveSnapshot?.cycle_tag || "—";
  
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0 
    ? effectiveRefs.ftp / effectiveRefs.weightKg 
    : null;

  // =============================================
  // CSS STYLES
  // =============================================
  const css = `
    <style>
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#fff; --soft:#f7f7f7; --success:#16a34a; --warning:#d97706; --error:#dc2626; --primary:#2563eb; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: var(--fg); margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
      h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
      h2 { margin: 24px 0 12px 0; font-size: 18px; border-bottom: 2px solid var(--primary); padding-bottom: 6px; color: var(--primary); page-break-after: avoid; }
      h3 { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; }
      h4 { margin: 12px 0 6px 0; font-size: 13px; font-weight: 600; color: var(--muted); }
      p { margin: 6px 0; }
      .muted { color: var(--muted); font-size: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .tag { border:1px solid var(--border); border-radius: 999px; padding: 4px 12px; font-size: 11px; display:inline-block; background: var(--soft); }
      .tagPrimary { border-color: var(--primary); background: rgba(37,99,235,0.1); color: var(--primary); font-weight: 600; }
      .card { border:1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--bg); margin-bottom: 12px; break-inside: avoid; }
      .cardHighlight { border-color: var(--primary); background: linear-gradient(135deg, rgba(37,99,235,0.03), rgba(37,99,235,0.08)); }
      .cardSuccess { border-color: var(--success); background: rgba(22,163,74,0.05); }
      .cardWarning { border-color: var(--warning); background: rgba(217,119,6,0.05); }
      .cardError { border-color: var(--error); background: rgba(220,38,38,0.05); }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .grid4 { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
      .mt { margin-top: 12px; }
      .mb { margin-bottom: 12px; }
      ul { margin: 6px 0 0 0; padding-left: 20px; }
      li { margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #eee; padding: 8px; vertical-align: top; text-align: left; }
      th { font-weight: 700; background: var(--soft); }
      .big { font-size: 28px; font-weight: 700; }
      .medium { font-size: 20px; font-weight: 600; }
      .success { color: var(--success); }
      .warning { color: var(--warning); }
      .error { color: var(--error); }
      .locked { color: var(--primary); font-weight: 600; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
      .badgeSuccess { background: rgba(22,163,74,0.15); color: var(--success); }
      .badgeWarning { background: rgba(217,119,6,0.15); color: var(--warning); }
      .badgeError { background: rgba(220,38,38,0.15); color: var(--error); }
      .badgePrimary { background: rgba(37,99,235,0.15); color: var(--primary); }
      .progressBar { height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
      .progressFill { height: 100%; border-radius: 5px; }
      .kv { display:grid; grid-template-columns: 140px 1fr; gap: 4px 12px; }
      .kv .k { color: var(--muted); font-size: 12px; }
      .kv .v { font-weight: 600; }
      .toc { border:1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--soft); }
      .tocTitle { font-weight: 800; margin-bottom: 10px; font-size: 14px; }
      .tocRow { display:flex; justify-content:space-between; border-bottom: 1px dashed #ddd; padding: 6px 0; font-size: 12px; }
      .tocRow a { color: var(--primary); text-decoration: none; }
      .section { margin-bottom: 24px; }
      .alert { padding: 12px; border-radius: 8px; margin: 8px 0; font-size: 12px; }
      .alertWarning { background: rgba(217,119,6,0.1); border-left: 4px solid var(--warning); }
      .alertError { background: rgba(220,38,38,0.1); border-left: 4px solid var(--error); }
      .alertSuccess { background: rgba(22,163,74,0.1); border-left: 4px solid var(--success); }
      .alertInfo { background: rgba(37,99,235,0.1); border-left: 4px solid var(--primary); }
      .footer { margin-top: 30px; font-size: 11px; color: var(--muted); border-top: 2px solid var(--border); padding-top: 15px; }
      .cover { min-height: 90vh; display:flex; flex-direction:column; justify-content:space-between; position: relative; overflow:hidden; margin-bottom: 24px; background: var(--bg); }
      .coverBanner { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 50%, #1e3a5f 100%); padding: 40px 32px; border-radius: 18px; margin-bottom: 24px; position: relative; overflow: hidden; }
      .coverBanner::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat; opacity: 0.3; }
      .coverBannerContent { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; }
      .coverBrandBlock { display: flex; align-items: center; gap: 20px; }
      .coverLogo { height: 80px; width: auto; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); background: white; padding: 8px; border-radius: 12px; }
      .coverBrandText { color: white; }
      .coverBrandName { font-size: 28px; font-weight: 800; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); margin: 0; }
      .coverBrandTagline { font-size: 14px; opacity: 0.9; margin-top: 4px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; }
      .coverBannerBadges { display: flex; gap: 10px; flex-wrap: wrap; }
      .coverBannerBadge { background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3); }
      .coverBody { flex: 1; padding: 0 8px; }
      .coverTop { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; }
      .brand { display:flex; flex-direction:column; gap: 6px; }
      .brandSub { font-size: 13px; color: var(--muted); }
      .coverMid { margin-top: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
      .coverTitle { font-size: 36px; margin: 10px 0 8px; font-weight: 800; }
      .coverMeta { display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
      .coverBottom { display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 24px; }
      .watermark { position:absolute; right:-60px; bottom:-40px; font-size: 100px; font-weight: 900; letter-spacing: 2px; color: rgba(17,17,17,0.04); transform: rotate(-12deg); user-select: none; pointer-events:none; }
      .scoreCircle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; border: 4px solid; }
      .noPrint { margin: 12px 0; padding: 12px; background: #f0f9ff; border-radius: 8px; }
      @media print {
        body { margin: 10mm; padding: 0; font-size: 11px; }
        .noPrint { display:none !important; }
        .pagebreak { page-break-before: always; }
        .pagebreakAvoid { break-inside: avoid; page-break-inside: avoid; }
        .cover { min-height: auto; page-break-after: always; }
        h2 { font-size: 14px; }
        .card { padding: 10px; }
      }
      @media screen and (max-width: 768px) {
        .grid2, .grid3, .grid4 { grid-template-columns: 1fr; }
        .coverBottom { grid-template-columns: 1fr; }
        table { display: block; overflow-x: auto; }
      }
    </style>
  `;

  // =============================================
  // A. COUVERTURE
  // =============================================
  const completudeBadge = completude.score >= 80 
    ? '<span class="badge badgeSuccess">Données complètes</span>'
    : completude.score >= 50 
      ? '<span class="badge badgeWarning">Données partielles</span>'
      : '<span class="badge badgeError">Données insuffisantes</span>';

  const coverHTML = `
    <section class="cover">
      <!-- BANNIÈRE PROFESSIONNELLE -->
      <div class="coverBanner">
        <div class="coverBannerContent">
          <div class="coverBrandBlock">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="coverLogo" />` : ''}
            <div class="coverBrandText">
              <div class="coverBrandName">${htmlEscape(brandMain)}</div>
              <div class="coverBrandTagline">${htmlEscape(brandSub)}</div>
            </div>
          </div>
          <div class="coverBannerBadges">
            <div class="coverBannerBadge">📊 Performance Report</div>
            <div class="coverBannerBadge">📅 ${coverDate}</div>
          </div>
        </div>
      </div>
      
      <!-- CORPS DE LA COUVERTURE -->
      <div class="coverBody">
        <div class="coverMid">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;">Rapport Métabolique & Performance</div>
          <div class="coverTitle">${coverAthlete}</div>
          <div class="coverMeta">
            <div class="tag tagPrimary"><b>Objectif:</b> ${coverObjective}</div>
            <div class="tag"><b>Snapshot:</b> ${snapshotDate}</div>
            <div class="tag"><b>Cycle:</b> ${htmlEscape(cycleTag)}</div>
            <div class="tag"><b>Source:</b> ${htmlEscape(snapshotSource)}</div>
            ${completudeBadge}
            <span class="tag tagPrimary">Complétude: ${completude.score}%</span>
          </div>
          <div class="alert alertInfo mt" style="max-width:600px;">
            <b>📋 Rapport généré à partir des données effectives</b><br>
            Aucune planification automatisée. Les valeurs présentées sont des indicateurs d'aide à la décision pour le coach.
          </div>
        </div>

        <div class="coverBottom">
          <div class="card cardHighlight">
            <h3>🎯 Indicateurs clés</h3>
            <div class="grid3 mt">
              <div>
                <span class="muted">VLamax effectif</span><br>
                <span class="medium ${vlamax.value !== null && vlamax.value > 0.45 ? 'warning' : vlamax.value !== null && vlamax.value < 0.28 ? 'error' : 'success'}">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</span>
                <br><span class="muted">${vlamax.source === "test" ? "🔬 Test" : vlamax.source === "snapshot" ? "📊 Snapshot" : "📐 Estimé"}</span>
                ${vlamax.isLocked ? '<br><span class="locked">🔒 Verrouillée</span>' : ''}
              </div>
              <div>
                <span class="muted">TTE effectif</span><br>
                <span class="medium ${tte.tte_min < (tte.target || 45) ? 'warning' : 'success'}">${tte.tte_min} min</span>
                <br><span class="muted">Cible: ${tte.target ?? 50} min</span>
              </div>
              <div>
                <span class="muted">Race Readiness</span><br>
                <span class="medium ${raceReadiness.score >= 80 ? 'success' : raceReadiness.score >= 60 ? 'warning' : 'error'}">${raceReadiness.score}%</span>
                <br><span class="muted">${raceReadiness.label}</span>
              </div>
            </div>
          </div>
          <div class="card">
            <h3>📐 Références effectives</h3>
            <div class="kv">
              <div class="k">FCmax</div><div class="v">${effectiveRefs.fcMax ?? "—"} bpm</div>
              <div class="k">VMA</div><div class="v">${effectiveRefs.vma ?? "—"} km/h</div>
              <div class="k">FTP</div><div class="v">${effectiveRefs.ftp ?? "—"} W</div>
              <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
              <div class="k">FTP/kg</div><div class="v">${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
              <div class="k">VO2max</div><div class="v">${effectiveRefs.vo2max ? fmt(effectiveRefs.vo2max, 1) : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="watermark">2FC</div>
    </section>
  `;

  // =============================================
  // SOMMAIRE
  // =============================================
  const tocHTML = `
    <div class="toc mb">
      <div class="tocTitle">📑 SOMMAIRE — Performance & Metabolic Report</div>
      <div class="tocRow"><a href="#profil">1. Profil Athlète & Contexte</a></div>
      <div class="tocRow"><a href="#executif">2. Synthèse Exécutive</a></div>
      <div class="tocRow"><a href="#compass">3. Metabolic Performance Compass™</a></div>
      <div class="tocRow"><a href="#physiologie">4. Analyse Physiologique Détaillée</a></div>
      <div class="tocRow"><a href="#race">5. Race Readiness & Risques</a></div>
      <div class="tocRow"><a href="#nutrition">6. Nutrition Prédictive</a></div>
      <div class="tocRow"><a href="#staff">7. Analyse Staff & Recommandations</a></div>
      <div class="tocRow"><a href="#qualite">8. Données Sources & Fiabilité</a></div>
      <div class="tocRow"><a href="#disclaimer">9. Mentions Scientifiques & Disclaimer</a></div>
    </div>
  `;

  // =============================================
  // 1. PROFIL ATHLÈTE & CONTEXTE
  // =============================================
  const profilHTML = `
    <section id="profil" class="section pagebreakAvoid">
      <h2>1. Profil Athlète & Contexte</h2>
      <div class="grid2">
        <div class="card">
          <h3>👤 Informations</h3>
          <div class="kv">
            <div class="k">Nom</div><div class="v">${coverAthlete}</div>
            <div class="k">Objectif</div><div class="v">${coverObjective}</div>
            <div class="k">Sport principal</div><div class="v">${(effectiveSnapshot as any)?.sport_main || "Triathlon"}</div>
            <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
          </div>
        </div>
        <div class="card">
          <h3>📊 Snapshot actif</h3>
          <div class="kv">
            <div class="k">Date</div><div class="v">${snapshotDate}</div>
            <div class="k">Source</div><div class="v">${htmlEscape(snapshotSource)}</div>
            <div class="k">Cycle</div><div class="v">${htmlEscape(cycleTag)}</div>
            <div class="k">Confiance</div><div class="v">${effectiveSnapshot?.confidence ? fmtPct(effectiveSnapshot.confidence) : "—"}</div>
          </div>
        </div>
      </div>
      <div class="card mt">
        <h3>📝 Contexte d'interprétation</h3>
        <div class="alert alertInfo">
          <b>Important:</b> Les valeurs présentées dans ce rapport sont dépendantes du moment de la saison, 
          de l'état de forme et des conditions de test. Elles représentent une photographie à l'instant T 
          et doivent être interprétées dans le contexte global de la préparation.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // 2. SYNTHÈSE EXÉCUTIVE
  // =============================================
  const pointsForts: string[] = [];
  const pointsLimitants: string[] = [];

  if (raceReadiness.details.vlamax >= 20) pointsForts.push("VLamax dans la cible");
  else pointsLimitants.push("VLamax hors cible");

  if (raceReadiness.details.endurance >= 20) pointsForts.push("Endurance (TTE) solide");
  else pointsLimitants.push("Endurance à développer");

  if (raceReadiness.details.puissance >= 20) pointsForts.push("Puissance relative correcte");
  else pointsLimitants.push("FTP/kg insuffisant");

  if (raceReadiness.details.fraicheur >= 18) pointsForts.push("Fraîcheur optimale");
  else pointsLimitants.push("Fatigue accumulée");

  // Déterminer le profil métabolique
  const profilMessage = (() => {
    if (vlamax.value === null) return "Données insuffisantes pour évaluer le profil métabolique.";
    if (raceReadiness.score >= 80 && pointsLimitants.length === 0) {
      return "Le profil métabolique actuel est COHÉRENT avec l'objectif visé. Aucune limitation majeure identifiée.";
    }
    if (raceReadiness.score >= 60) {
      return `Le profil métabolique est globalement adapté à l'objectif MAIS limité par : ${pointsLimitants.slice(0, 2).join(", ")}.`;
    }
    return `Le profil métabolique présente un DÉSALIGNEMENT significatif avec l'objectif. Priorités : ${pointsLimitants.slice(0, 2).join(", ")}.`;
  })();

  const risquesIdentifies = (() => {
    const risques: string[] = [];
    if (capInjuryRisk && capInjuryRisk.level >= 2) risques.push(`Risque blessure CAP (${capInjuryRisk.label})`);
    if (nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical")) {
      risques.push(`Risque nutritionnel (${nutritionEstimate.riskLabel})`);
    }
    return risques.length > 0 ? risques.join(", ") : "Aucun risque majeur identifié";
  })();

  const executifHTML = `
    <section id="executif" class="section pagebreak">
      <h2>2. Synthèse Exécutive</h2>
      
      <div class="card ${raceReadiness.score >= 80 ? 'cardSuccess' : raceReadiness.score >= 60 ? 'cardWarning' : 'cardError'}">
        <div style="display:flex;align-items:center;gap:20px;">
          <div class="scoreCircle" style="border-color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}; color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}">
            ${raceReadiness.score}
          </div>
          <div>
            <div style="font-size:18px;font-weight:700;">${raceReadiness.label}</div>
            <div class="muted">Race Readiness pour ${getObjectifLabel(athlete.goal)}</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <span class="badge ${raceReadiness.score >= 80 ? 'badgeSuccess' : raceReadiness.score >= 60 ? 'badgeWarning' : 'badgeError'}" style="font-size:14px;padding:8px 16px;">
              ${raceReadiness.score >= 80 ? '🟢 FEU VERT' : raceReadiness.score >= 60 ? '🟡 À SÉCURISER' : '🔴 À RISQUE'}
            </span>
          </div>
        </div>
      </div>

      <div class="card cardHighlight mt">
        <h3>📋 Résumé automatique (Lecture < 2 min)</h3>
        <p style="font-size:14px;line-height:1.6;margin:12px 0;">${profilMessage}</p>
        <p style="font-size:12px;color:var(--muted);">
          <b>Priorité physiologique identifiée:</b> ${lorang.prioriteLabel || "Maintien de l'équilibre actuel"}.<br>
          <b>Risques principaux:</b> ${risquesIdentifies}.
        </p>
      </div>
      
      <div class="grid4 mt">
        <div class="card">
          <div class="muted">VLamax effectif</div>
          <div class="big ${vlamax.value !== null && vlamax.value > 0.45 ? 'warning' : 'success'}">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</div>
          <div class="muted">${vlamax.source === "test" ? "Test" : vlamax.source === "snapshot" ? "Snapshot" : "Estimé"}</div>
          <div class="muted">Conf: ${fmtPct(vlamax.confidence)}</div>
        </div>
        <div class="card">
          <div class="muted">TTE effectif</div>
          <div class="big ${tte.tte_min < (tte.target || 45) ? 'warning' : 'success'}">${tte.tte_min} min</div>
          <div class="muted">Cible: ${tte.target ?? 50} min</div>
          <div class="muted">Conf: ${fmtPct(tte.confidence)}</div>
        </div>
        <div class="card">
          <div class="muted">Risque blessure CAP</div>
          <div class="big ${capInjuryRisk && capInjuryRisk.level >= 2 ? 'warning' : 'success'}">${capInjuryRisk ? capInjuryRisk.icon : "—"}</div>
          <div class="muted">${capInjuryRisk?.label || "Non calculé"}</div>
        </div>
        <div class="card">
          <div class="muted">Risque nutritionnel</div>
          <div class="big ${nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical") ? 'error' : nutritionEstimate && nutritionEstimate.riskLevel === "moderate" ? 'warning' : 'success'}">
            ${nutritionEstimate?.nutritionalRiskIndex?.icon || "—"}
          </div>
          <div class="muted">${nutritionEstimate?.riskLabel || "Non calculé"}</div>
        </div>
      </div>
    </section>
  `;

  // =============================================
  // 3. METABOLIC PERFORMANCE COMPASS™ — VERSION OFFICIELLE
  // =============================================
  
  // Utiliser les scores calculés dans le payload (source unique de vérité)
  const { compassScores: cScores, crr, chargeScore } = payload;
  const crrTargets = getCRRTargets(athlete.goal || "IM");
  
  // Générer l'interprétation coach automatique
  const generateCoachInterpretation = (): { limitation: string; risk: string; recommendation: string } => {
    const axes = [
      { name: "Capacité Aérobie (FTP/kg)", score: cScores.capaciteAerobie.score },
      { name: "Tolérance Effort (TTE)", score: cScores.toleranceEffort.score },
      { name: "Profil Métabolique (VLamax)", score: cScores.profilMetabolique.score },
      { name: "Robustesse", score: cScores.robustesse.score }
    ];
    
    const sorted = [...axes].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    
    let limitation = "Aucune limitation majeure détectée.";
    let risk = "Risque global modéré.";
    let recommendation = "Maintenir l'équilibre actuel.";
    
    if (weakest.score < 60) {
      limitation = "La performance est principalement limitée par : " + weakest.name + " (score: " + weakest.score + "/100).";
    }
    
    if (!crr.isValid) {
      risk = "⚠️ Charge récente inconnue – l'évaluation de la robustesse et du risque est incomplète.";
      recommendation = "Priorité : renseigner la charge d'entraînement (TSS 7j) pour une analyse fiable.";
    } else if (chargeScore.status === "overload") {
      risk = "🔴 Surcharge détectée – risque de surentraînement élevé.";
      recommendation = "Réduire immédiatement la charge et surveiller les signes de fatigue.";
    } else if (chargeScore.status === "low") {
      risk = "⚠️ Charge insuffisante pour l'objectif visé.";
      recommendation = "Augmenter progressivement le volume d'entraînement.";
    } else if (weakest.name.includes("VLamax") && weakest.score < 70) {
      recommendation = "Travailler le profil métabolique : séances de seuil bas, tempo long pour réduire VLamax.";
    } else if (weakest.name.includes("TTE") && weakest.score < 70) {
      recommendation = "Développer l'endurance au seuil : intervalles longs 88-95% FTP.";
    } else if (weakest.name.includes("FTP") && weakest.score < 70) {
      recommendation = "Améliorer la puissance aérobie : sweet spot et travail au seuil.";
    }
    
    return { limitation, risk, recommendation };
  };
  
  const coachInterpretation = generateCoachInterpretation();
  
  // Build compass HTML with proper template literals
  const crrCardColor = crr.isValid ? '#22c55e' : '#f59e0b';
  const crrValue = crr.value !== null ? crr.value : "—";
  const crrSourceClass = crr.source === 'NOLIO' ? 'tagSuccess' : crr.source === 'SNAPSHOT' ? 'tagInfo' : 'tagWarning';
  const chargeStatusClass = chargeScore.status === 'optimal' ? 'badgeSuccess' : chargeScore.status === 'overload' ? 'badgeError' : 'badgeWarning';
  const chargeStatusLabel = chargeScore.status === 'optimal' ? '✓ Optimal' : chargeScore.status === 'overload' ? '⚠ Surcharge' : chargeScore.status === 'low' ? '↓ Faible' : chargeScore.status === 'high' ? '↑ Élevée' : '? Inconnu';
  
  const globalBadgeClass = cScores.globalColor === 'success' ? 'badgeSuccess' : cScores.globalColor === 'warning' ? 'badgeWarning' : 'badgeError';
  const limitationAlertClass = cScores.mainLimitation ? 'alertWarning' : 'alertInfo';
  const riskAlertClass = chargeScore.status === 'overload' ? 'alertError' : chargeScore.status === 'unknown' ? 'alertWarning' : 'alertInfo';
  
  // SVG radar points
  const svgY1 = 150 - cScores.capaciteAerobie.score;
  const svgX2 = 150 + cScores.toleranceEffort.score;
  const svgY3 = 150 + cScores.profilMetabolique.score;
  const svgX4 = 150 - cScores.robustesse.score;
  
  const compassHTML = `
    <section id="compass" class="section pagebreak">
      <h2>3. Metabolic Performance Compass™</h2>
      
      <!-- CARTE CRR -->
      <div class="card mb" style="border-left: 4px solid ${crrCardColor};">
        <h3>📊 Charge Récente de Référence (CRR)</h3>
        <div class="grid3">
          <div>
            <span class="muted">Valeur</span><br>
            <span class="big">${crrValue}</span>
            <span class="muted"> TSS/7j</span>
          </div>
          <div>
            <span class="muted">Source</span><br>
            <span class="tag ${crrSourceClass}">${crr.source}</span>
          </div>
          <div>
            <span class="muted">Statut</span><br>
            <span class="badge ${chargeStatusClass}">${chargeStatusLabel}</span>
          </div>
        </div>
        <div class="muted mt" style="font-size:11px;">
          Cibles ${crrTargets.objectif}: Min ${crrTargets.chargeMinimale} | Optimal ${crrTargets.chargeOptimale} | Max ${crrTargets.chargeMaximale} TSS
          ${crr.warningMessage ? '<br>⚠️ ' + crr.warningMessage : ''}
        </div>
      </div>
      
      <!-- COMPASS RADAR -->
      <div class="card cardHighlight">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;">Metabolic Performance Compass™</div>
          <div class="muted">4 Axes Officiels – Two For Coaching Lab</div>
        </div>
        
        <div style="display:flex;justify-content:center;margin:20px 0;">
          <svg width="300" height="300" viewBox="0 0 300 300">
            <polygon points="150,50 250,150 150,250 50,150" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="150,75 225,150 150,225 75,150" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="150,100 200,150 150,200 100,150" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="150,125 175,150 150,175 125,150" fill="none" stroke="#ddd" stroke-width="1"/>
            <line x1="150" y1="50" x2="150" y2="250" stroke="#eee" stroke-width="1"/>
            <line x1="50" y1="150" x2="250" y2="150" stroke="#eee" stroke-width="1"/>
            <polygon points="150,${svgY1} ${svgX2},150 150,${svgY3} ${svgX4},150" fill="rgba(37,99,235,0.2)" stroke="#2563eb" stroke-width="2"/>
            <circle cx="150" cy="${svgY1}" r="6" fill="#2563eb"/>
            <circle cx="${svgX2}" cy="150" r="6" fill="#2563eb"/>
            <circle cx="150" cy="${svgY3}" r="6" fill="#2563eb"/>
            <circle cx="${svgX4}" cy="150" r="6" fill="#2563eb"/>
            <text x="150" y="30" text-anchor="middle" font-size="10" font-weight="600">⚡ Capacité Aérobie (${cScores.capaciteAerobie.score})</text>
            <text x="270" y="155" text-anchor="start" font-size="10" font-weight="600">💪 Tolérance (${cScores.toleranceEffort.score})</text>
            <text x="150" y="280" text-anchor="middle" font-size="10" font-weight="600">🧬 Profil Métab. (${cScores.profilMetabolique.score})</text>
            <text x="30" y="155" text-anchor="end" font-size="10" font-weight="600">🛡️ Robustesse (${cScores.robustesse.score})</text>
          </svg>
        </div>
        
        <div style="text-align:center;margin-top:16px;">
          <span class="badge ${globalBadgeClass}" style="font-size:16px;padding:10px 20px;">
            Score Global: ${cScores.globalScore}/100 – ${cScores.globalLabel}
          </span>
          <div class="muted mt" style="font-size:11px;">Complétude données: ${cScores.dataCompleteness}%</div>
        </div>
      </div>
      
      <!-- 4 AXES DÉTAILLÉS -->
      <div class="card mt">
        <h3>📐 Détail des 4 Axes (Formules Officielles)</h3>
        <div class="grid2 mt">
          <div class="card" style="background:#f8fafc;">
            <h4>⚡ AXE 1 – Capacité Aérobie</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.capaciteAerobie.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.capaciteAerobie.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.capaciteAerobie.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.capaciteAerobie.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>💪 AXE 2 – Tolérance à l'Effort</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.toleranceEffort.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.toleranceEffort.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.toleranceEffort.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.toleranceEffort.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>🧬 AXE 3 – Profil Métabolique</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.profilMetabolique.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.profilMetabolique.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.profilMetabolique.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.profilMetabolique.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>🛡️ AXE 4 – Robustesse</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.robustesse.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.robustesse.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.robustesse.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.robustesse.explanation)}</p>
          </div>
        </div>
      </div>
      
      <!-- INTERPRÉTATION COACH -->
      <div class="card mt" style="border-left: 4px solid #2563eb;">
        <h3>🎓 Interprétation Coach Automatique</h3>
        <div class="grid1 mt">
          <div class="alert ${limitationAlertClass}">
            <b>📍 Limitation principale:</b><br>
            ${htmlEscape(coachInterpretation.limitation)}
          </div>
          <div class="alert ${riskAlertClass}">
            <b>⚠️ Risque identifié:</b><br>
            ${htmlEscape(coachInterpretation.risk)}
          </div>
          <div class="alert alertSuccess">
            <b>💡 Recommandation prioritaire:</b><br>
            ${htmlEscape(coachInterpretation.recommendation)}
          </div>
        </div>
        ${cScores.mainStrength ? '<p class="muted mt">✓ Point fort: ' + htmlEscape(cScores.mainStrength) + '</p>' : ''}
      </div>
    </section>
  `;

  // =============================================
  // C. INDICATEURS CLÉS + INTERPRÉTATION
  // =============================================
  const indicateursHTML = `
    <section id="indicateurs" class="section">
      <h2>B. Indicateurs clés + Interprétation</h2>
      
      <div class="card pagebreakAvoid">
        <h3>1️⃣ VLamax (effectif)</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">Valeur</div><div class="v">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"} mmol/L/s</div>
              <div class="k">Source</div><div class="v">${htmlEscape(vlamax.label)}</div>
              <div class="k">Confiance</div><div class="v">${fmtPct(vlamax.confidence)}</div>
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">${fmt(targets.vlamaxMin, 2)} – ${fmt(targets.vlamaxMax, 2)} (idéal: ${fmt(targets.vlamaxIdeal, 2)})</div>
              <div class="k">Statut</div><div class="v"><span class="badge ${raceReadiness.details.vlamax >= 20 ? 'badgeSuccess' : raceReadiness.details.vlamax >= 15 ? 'badgeWarning' : 'badgeError'}">${raceReadiness.details.vlamax >= 20 ? 'OK' : raceReadiness.details.vlamax >= 15 ? 'WARNING' : 'CRITICAL'}</span></div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${vlamax.value !== null ? (vlamax.value > targets.vlamaxMax ? "VLamax trop élevée = dépendance excessive aux glucides, fatigue précoce sur efforts longs." : vlamax.value < targets.vlamaxMin ? "VLamax trop basse = manque de punch, difficulté sur les changements de rythme." : "VLamax dans la plage optimale pour cet objectif.") : "Donnée indisponible."}</p>
            <h4>Action coach</h4>
            <ul class="muted">
              ${vlamax.value !== null && vlamax.value > targets.vlamaxMax ? "<li>Privilégier les sorties longues Z2</li><li>Éviter les sprints</li><li>Séances sweet spot longues</li>" : vlamax.value !== null && vlamax.value < targets.vlamaxMin ? "<li>Ajouter des sprints courts (5-15s)</li><li>Intervalles haute intensité</li>" : "<li>Maintenir l'équilibre actuel</li><li>Affûtage pré-compétition</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>2️⃣ TTE (Time to Exhaustion)</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">Valeur</div><div class="v">${tte.tte_min} min</div>
              <div class="k">Mode</div><div class="v">${tte.source === "observed" ? "OBSERVED (mesuré)" : "LOAD (estimé TSS)"}</div>
              <div class="k">Confiance</div><div class="v">${fmtPct(tte.confidence)}</div>
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">≥ ${targets.tteTarget} min</div>
              <div class="k">Statut</div><div class="v"><span class="badge ${tte.tte_min >= targets.tteTarget ? 'badgeSuccess' : tte.tte_min >= targets.tteTarget * 0.85 ? 'badgeWarning' : 'badgeError'}">${tte.status?.toUpperCase() || '—'}</span></div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${tte.tte_min < targets.tteTarget ? `TTE insuffisant pour ${getObjectifLabel(athlete.goal)} — risque de défaillance en fin d'épreuve.` : "TTE suffisant pour tenir l'objectif."}</p>
            <h4>Action coach</h4>
            <ul class="muted">
              ${tte.tte_min < targets.tteTarget ? "<li>Séances au seuil prolongées (2x20-30min)</li><li>Intervalles longs 95-105% FTP</li><li>Augmenter le volume Z3-Z4</li>" : "<li>Maintenir le niveau</li><li>Intégrer des séances spécifiques course</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>3️⃣ FTP et FTP/kg</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">FTP</div><div class="v">${effectiveRefs.ftp ?? "—"} W</div>
              <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
              <div class="k">FTP/kg</div><div class="v">${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">≥ ${fmt(targets.ftpKgTarget, 1)} W/kg</div>
              <div class="k">Statut</div><div class="v"><span class="badge ${ftpKg && ftpKg >= targets.ftpKgTarget ? 'badgeSuccess' : ftpKg && ftpKg >= targets.ftpKgTarget * 0.9 ? 'badgeWarning' : 'badgeError'}">${ftpKg && ftpKg >= targets.ftpKgTarget ? 'OK' : 'WARNING'}</span></div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${ftpKg && ftpKg < targets.ftpKgTarget ? "Puissance relative insuffisante — impact sur la performance vélo et la capacité à maintenir l'intensité." : "Puissance relative adaptée à l'objectif."}</p>
            <h4>Action coach</h4>
            <ul class="muted">
              ${ftpKg && ftpKg < targets.ftpKgTarget ? "<li>Blocs sweet spot progressifs</li><li>Intervalles VO2max (3-5min)</li><li>Optimiser le poids de forme</li>" : "<li>Maintenir et affiner</li><li>Séances spécifiques objectif</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>4️⃣ Charge d'entraînement (TSS 7d)</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">TSS 7 jours</div><div class="v">${effectiveSnapshot?.tss_7d ?? "—"}</div>
              <div class="k">Lecture</div><div class="v">${effectiveSnapshot?.tss_7d ? (effectiveSnapshot.tss_7d < 300 ? "Faible" : effectiveSnapshot.tss_7d < 500 ? "Correcte" : effectiveSnapshot.tss_7d < 700 ? "Élevée" : "Très élevée") : "—"}</div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${effectiveSnapshot?.tss_7d ? (effectiveSnapshot.tss_7d < 300 ? "Charge légère — phase récup ou perte de forme si prolongée." : effectiveSnapshot.tss_7d < 500 ? "Charge modérée — maintien de forme." : effectiveSnapshot.tss_7d < 700 ? "Charge élevée — phase de surcharge, surveiller la récupération." : "Charge très élevée — risque de surentraînement.") : "Donnée manquante."}</p>
          </div>
        </div>
      </div>
    </section>
  `;

  // =============================================
  // D. RACE READINESS (STAFF)
  // =============================================
  const raceReadinessHTML = `
    <section id="race" class="section pagebreak">
      <h2>C. Race Readiness (Staff)</h2>
      
      <div class="card ${raceReadiness.score >= 80 ? 'cardSuccess' : raceReadiness.score >= 60 ? 'cardWarning' : 'cardError'}">
        <div class="grid2">
          <div>
            <div style="display:flex;align-items:center;gap:16px;">
              <div class="scoreCircle" style="border-color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}; color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}">
                ${raceReadiness.score}
              </div>
              <div>
                <div style="font-size:20px;font-weight:700;">${raceReadiness.label}</div>
                <div class="muted">Race Readiness pour ${getObjectifLabel(athlete.goal)}</div>
              </div>
            </div>
            <div class="mt">
              <div class="progressBar">
                <div class="progressFill" style="width:${raceReadiness.score}%; background:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}"></div>
              </div>
            </div>
          </div>
          <div>
            <h4>Pondération ${getObjectifLabel(athlete.goal)}</h4>
            <div class="kv">
              <div class="k">VLamax</div><div class="v">${weights.vlamax}%</div>
              <div class="k">TTE (endurance)</div><div class="v">${weights.tte}%</div>
              <div class="k">FTP/kg (puissance)</div><div class="v">${weights.ftpKg}%</div>
              <div class="k">Fraîcheur</div><div class="v">${weights.freshness}%</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid4 mt">
        <div class="card">
          <div class="muted">VLamax</div>
          <div class="medium">${raceReadiness.details.vlamax}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.vlamax / 25) * 100}%; background:${raceReadiness.details.vlamax >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Endurance</div>
          <div class="medium">${raceReadiness.details.endurance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.endurance / 25) * 100}%; background:${raceReadiness.details.endurance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Puissance</div>
          <div class="medium">${raceReadiness.details.puissance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.puissance / 25) * 100}%; background:${raceReadiness.details.puissance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Fraîcheur</div>
          <div class="medium">${raceReadiness.details.fraicheur}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.fraicheur / 25) * 100}%; background:${raceReadiness.details.fraicheur >= 18 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
      </div>

      <div class="card mt">
        <h3>💡 Explication du score</h3>
        <p>${htmlEscape(raceReadiness.messageStaff)}</p>
        ${raceReadiness.wasCappedByNutrition ? `<div class="alert alertWarning">⚠️ Score plafonné par risque nutritionnel: ${raceReadiness.nutritionalCapReason || "Risque élevé"}</div>` : ''}
        ${raceReadiness.wasCappedByEconomy ? `<div class="alert alertWarning">🏃 Score plafonné par économie de course: ${raceReadiness.economyCapReason || "Économie insuffisante"}</div>` : ''}
      </div>

      ${raceReadiness.reasonsMissing.length > 0 ? `
        <div class="card mt">
          <h3>🎯 Ce qui manque pour gagner des points</h3>
          <ul>
            ${raceReadiness.reasonsMissing.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
          </ul>
          <div class="alert alertInfo mt">
            <b>Actions recommandées:</b> Ajoutez les données manquantes dans le snapshot (TSS 7d, TTE mesuré) ou via les tests VLamax pour améliorer la précision du score.
          </div>
        </div>
      ` : ''}
    </section>
  `;

  // =============================================
  // E. ANALYSE DAN LORANG
  // =============================================
  const lorangHTML = `
    <section id="lorang" class="section pagebreakAvoid">
      <h2>D. Analyse Dan Lorang (version staff)</h2>
      
      <div class="card ${lorang.priorite ? 'cardHighlight' : ''}">
        <div class="grid2">
          <div>
            <h3>🎯 Priorité calculée</h3>
            <div style="font-size:20px;font-weight:700;margin:8px 0;">${lorang.prioriteLabel || "Aucune priorité majeure"}</div>
            <div class="muted">Basé sur VLamax ${fmt(vlamax.value, 2)}, TTE ${tte.tte_min}min, FTP/kg ${ftpKg ? fmt(ftpKg, 2) : "—"}</div>
          </div>
          <div>
            ${lorang.alertes.length > 0 ? `
              <h4>⚠️ Alertes</h4>
              <ul class="muted">
                ${lorang.alertes.map(a => `<li>${htmlEscape(a)}</li>`).join("")}
              </ul>
            ` : '<div class="alert alertSuccess">✅ Aucune alerte majeure</div>'}
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>📋 Recommandations (bloc 14 jours)</h3>
        <ul>
          ${lorang.recommandations.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
        </ul>
      </div>

      <div class="card mt">
        <h3>🏋️ Séances recommandées</h3>
        <table>
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Objectif</th></tr>
          </thead>
          <tbody>
            ${lorang.seancesDetails.length > 0 
              ? lorang.seancesDetails.map(s => `<tr><td><b>${htmlEscape(s.code)}</b></td><td>${htmlEscape(s.nom)}</td><td class="muted">${htmlEscape(s.objectif)}</td></tr>`).join("")
              : '<tr><td colspan="3" class="muted">Séances de maintien recommandées</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;

  // =============================================
  // F. ZONES D'ENTRAÎNEMENT Z1→Z7 (GRILLE OFFICIELLE)
  // =============================================
  
  // Préparer les refs pour le calcul des zones absolues
  const zoneRefs: AthleteZoneRefs = {
    fcMax: effectiveRefs.fcMax,
    vma: effectiveRefs.vma,
    ftp: effectiveRefs.ftp
  };
  
  // Générer la grille complète Z1→Z7 avec impacts métaboliques
  const zonesTableRows = TRAINING_ZONES.map(zone => {
    const absValues = computeZoneAbsoluteValues(zone, zoneRefs);
    
    // Format FC
    const fcDisplay = zone.fcMax 
      ? `${zone.fcMax.min}-${zone.fcMax.max}%` + (absValues.fcBpm ? ` → ${absValues.fcBpm.min}-${absValues.fcBpm.max} bpm` : '')
      : 'N/A';
    
    // Format VMA  
    const vmaDisplay = `${zone.vma.min}-${zone.vma.max}%` + (absValues.vmaKmh ? ` → ${absValues.vmaKmh.min.toFixed(1)}-${absValues.vmaKmh.max.toFixed(1)} km/h` : '');
    
    // Format FTP
    const ftpDisplay = `${zone.ftp.min}-${zone.ftp.max}%` + (absValues.ftpWatts ? ` → ${absValues.ftpWatts.min}-${absValues.ftpWatts.max} W` : '');
    
    // Impacts métaboliques formatés
    const vlamaxImpact = zone.impactMetabolique.vlamax;
    const tteImpact = zone.impactMetabolique.tte;
    const vo2Impact = zone.impactMetabolique.vo2max;
    
    // Couleur selon impact VLamax
    const vlamaxColor = vlamaxImpact.includes('↓') ? 'color:var(--success)' : vlamaxImpact.includes('↑') ? 'color:var(--warning)' : '';
    const tteColor = tteImpact.includes('↑') ? 'color:var(--success)' : tteImpact.includes('↓') ? 'color:var(--warning)' : '';
    const vo2Color = vo2Impact.includes('↑') ? 'color:var(--success)' : '';
    
    return `
      <tr>
        <td><span class="badge badgePrimary">${zone.id}</span></td>
        <td><b>${htmlEscape(zone.label)}</b><br><span class="muted" style="font-size:10px">${htmlEscape(zone.description)}</span></td>
        <td class="mono" style="font-size:10px">${fcDisplay}</td>
        <td class="mono" style="font-size:10px">${vmaDisplay}</td>
        <td class="mono" style="font-size:10px">${ftpDisplay}</td>
        <td style="text-align:center"><span style="${vlamaxColor};font-weight:600">${vlamaxImpact}</span></td>
        <td style="text-align:center"><span style="${tteColor};font-weight:600">${tteImpact}</span></td>
        <td style="text-align:center"><span style="${vo2Color};font-weight:600">${vo2Impact}</span></td>
        <td class="muted" style="font-size:10px">${htmlEscape(zone.positionSeuils)}</td>
      </tr>
    `;
  }).join('');
  
  const zonesHTML = `
    <section id="zones" class="section pagebreak">
      <h2>E. Grille d'entraînement Z1→Z7</h2>
      
      <div class="alert alertInfo mb">
        <b>🎯 Méthodologie Two For Coaching Lab</b><br>
        ${htmlEscape(ZONES_METHODOLOGY_NOTE)}
      </div>
      
      <div class="card">
        <h3>📊 Zones d'entraînement officielles</h3>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th style="min-width:150px">Label & Objectif</th>
              <th>%FCmax</th>
              <th>%VMA (CAP)</th>
              <th>%FTP (Vélo)</th>
              <th style="text-align:center">VLamax</th>
              <th style="text-align:center">TTE</th>
              <th style="text-align:center">VO2</th>
              <th>Position Seuils</th>
            </tr>
          </thead>
          <tbody>
            ${zonesTableRows}
          </tbody>
        </table>
      </div>
      
      <div class="grid2 mt">
        <div class="card">
          <h3>📖 Légende impacts métaboliques</h3>
          <table style="font-size:11px">
            <tbody>
              <tr><td><b style="color:var(--success)">↓↓</b></td><td>Diminution forte</td></tr>
              <tr><td><b style="color:var(--success)">↓</b></td><td>Diminution modérée</td></tr>
              <tr><td><b>neutre</b></td><td>Pas d'impact significatif</td></tr>
              <tr><td><b style="color:var(--warning)">↑</b></td><td>Augmentation modérée</td></tr>
              <tr><td><b style="color:var(--error)">↑↑</b></td><td>Augmentation forte</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <h3>⚠️ Avertissements staff</h3>
          <ul class="muted" style="font-size:11px">
            <li><b>Z4b/Z5 prolongée</b> = charge glycolytique élevée. Limiter si objectif ↓ VLamax.</li>
            <li><b>Z6</b> = stimulus VLamax secondaire. Usage modéré pour profils endurance.</li>
            <li><b>Z7</b> = ↑↑ VLamax. Réserver aux phases de puissance/vitesse pure.</li>
          </ul>
        </div>
      </div>
      
      <div class="card cardHighlight mt">
        <h3>🧭 Recommandation selon votre profil</h3>
        <p class="muted" style="line-height:1.6">
          ${vlamax.value !== null && vlamax.value > 0.40 
            ? `<b style="color:var(--warning)">Profil glycolytique (VLamax: ${fmt(vlamax.value, 2)})</b> → Privilégier les zones Z2 et Z4a pour ↓ VLamax. Limiter Z6/Z7.`
            : vlamax.value !== null && vlamax.value < 0.30
              ? `<b style="color:var(--success)">Profil endurant (VLamax: ${fmt(vlamax.value, 2)})</b> → Zones Z4a/Z5 pour ↑ TTE. Possibilité d'inclure du Z6 si besoin de relance VO2max.`
              : `<b>Profil équilibré</b> → Répartition standard avec focus sur les zones correspondant à votre objectif (${getObjectifLabel(athlete.goal)}).`
          }
          <br><br>
          ${tte.tte_min < (tte.target ?? 50) 
            ? `<b style="color:var(--warning)">TTE insuffisant (${tte.tte_min} min vs cible ${tte.target ?? 50} min)</b> → Prioriser Z4a et Z5 pour développer l'endurance au seuil.`
            : `<b style="color:var(--success)">TTE satisfaisant (${tte.tte_min} min)</b> → Maintenir avec du travail Z2/Z3 de fond.`
          }
        </p>
      </div>
    </section>
  `;

  // =============================================
  // G. HISTORIQUE SNAPSHOTS
  // =============================================
  const sortedSnapshots = [...snapshotHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const last2 = sortedSnapshots.slice(0, 2);
  
  let evolutionHTML = "";
  if (last2.length >= 2) {
    const [current, previous] = last2;
    const deltaFtp = current.ftp && previous.ftp ? current.ftp - previous.ftp : null;
    const deltaPoids = current.weight_kg && previous.weight_kg ? current.weight_kg - previous.weight_kg : null;
    const currentFtpKg = current.ftp && current.weight_kg ? current.ftp / current.weight_kg : null;
    const previousFtpKg = previous.ftp && previous.weight_kg ? previous.ftp / previous.weight_kg : null;
    const deltaFtpKg = currentFtpKg && previousFtpKg ? currentFtpKg - previousFtpKg : null;
    
    evolutionHTML = `
      <div class="card mt">
        <h3>📈 Évolution (2 derniers snapshots)</h3>
        <div class="grid4">
          <div>
            <div class="muted">Δ FTP</div>
            <div class="${deltaFtp && deltaFtp > 0 ? 'success' : deltaFtp && deltaFtp < 0 ? 'error' : ''}">${deltaFtp ? (deltaFtp > 0 ? '+' : '') + deltaFtp + ' W' : '—'}</div>
          </div>
          <div>
            <div class="muted">Δ Poids</div>
            <div class="${deltaPoids && deltaPoids < 0 ? 'success' : deltaPoids && deltaPoids > 0 ? 'warning' : ''}">${deltaPoids ? (deltaPoids > 0 ? '+' : '') + fmt(deltaPoids, 1) + ' kg' : '—'}</div>
          </div>
          <div>
            <div class="muted">Δ FTP/kg</div>
            <div class="${deltaFtpKg && deltaFtpKg > 0 ? 'success' : deltaFtpKg && deltaFtpKg < 0 ? 'error' : ''}">${deltaFtpKg ? (deltaFtpKg > 0 ? '+' : '') + fmt(deltaFtpKg, 2) + ' W/kg' : '—'}</div>
          </div>
          <div>
            <div class="muted">Période</div>
            <div class="muted">${dtStr(previous.date)} → ${dtStr(current.date)}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    evolutionHTML = '<div class="alert alertInfo mt">Évolution non calculable — moins de 2 snapshots disponibles.</div>';
  }

  const snapshotsHTML = `
    <section id="historique-snapshots" class="section">
      <h2>F. Historique snapshots</h2>
      <div class="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Cycle</th><th>FTP</th><th>Poids</th><th>FTP/kg</th><th>TSS 7d</th><th>VO2max</th><th>VMA</th><th>VLamax</th><th>Source</th></tr>
          </thead>
          <tbody>
            ${sortedSnapshots.length > 0
              ? sortedSnapshots.slice(0, 15).map(s => {
                  const snapFtpKg = s.ftp && s.weight_kg ? (s.ftp / s.weight_kg).toFixed(2) : "—";
                  return `<tr>
                    <td>${htmlEscape(dtStr(s.date))}</td>
                    <td>${htmlEscape(s.cycle_tag || "—")}</td>
                    <td>${s.ftp ?? "—"}</td>
                    <td>${s.weight_kg ? fmt(s.weight_kg, 1) : "—"}</td>
                    <td>${snapFtpKg}</td>
                    <td>${s.tss_7d ?? "—"}</td>
                    <td>${s.vo2max ? fmt(s.vo2max, 1) : "—"}</td>
                    <td>${s.vma ? fmt(s.vma, 1) : "—"}</td>
                    <td>${s.vlamax ? fmt(s.vlamax, 2) : "—"}</td>
                    <td class="muted">${htmlEscape(s.source || "")}</td>
                  </tr>`;
                }).join("")
              : '<tr><td colspan="10" class="muted">Aucun snapshot enregistré</td></tr>'}
          </tbody>
        </table>
      </div>
      ${evolutionHTML}
    </section>
  `;

  // =============================================
  // H. HISTORIQUE TESTS
  // =============================================
  const sortedTests = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const testsHTML = `
    <section id="historique-tests" class="section pagebreak">
      <h2>G. Historique tests</h2>
      <div class="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Nom</th><th>VLamax</th><th>Fiabilité</th><th>Note coach</th></tr>
          </thead>
          <tbody>
            ${sortedTests.length > 0
              ? sortedTests.slice(0, 15).map(t => `
                  <tr>
                    <td>${htmlEscape(dtStr(t.date))}</td>
                    <td>${htmlEscape(t.type || "—")}</td>
                    <td>${htmlEscape(t.name || "—")}</td>
                    <td>${t.vlamax ? fmt(t.vlamax, 2) : "—"}</td>
                    <td>${t.reliability ? fmtPct(t.reliability) : "—"}</td>
                    <td class="muted">${htmlEscape(t.note || "—")}</td>
                  </tr>
                `).join("")
              : '<tr><td colspan="6" class="muted">Aucun test enregistré</td></tr>'}
          </tbody>
        </table>
      </div>
      ${sortedTests.length === 0 ? '<div class="alert alertInfo">💡 Recommandation: faire 2 tests VLamax fiables à 7-10 jours d\'intervalle pour améliorer la précision.</div>' : ''}
    </section>
  `;

  // =============================================
  // I. CHECK-INS (si dispo)
  // =============================================
  const sortedCheckins = [...checkins].sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime());
  const lastCheckin = sortedCheckins[0];
  
  const checkinsHTML = checkins.length > 0 ? `
    <section id="checkins" class="section pagebreakAvoid">
      <h2>H. Check-ins & Monitoring</h2>
      ${lastCheckin ? `
        <div class="card">
          <h3>Dernier check-in: ${dtStr(lastCheckin.date_iso)}</h3>
          <div class="grid4 mt">
            <div>
              <div class="muted">Fatigue</div>
              <div class="medium">${lastCheckin.fatigue ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Sommeil</div>
              <div class="medium">${lastCheckin.sleep ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Stress</div>
              <div class="medium">${lastCheckin.stress ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Readiness</div>
              <div class="medium">${lastCheckin.readiness ?? "—"}/10</div>
            </div>
          </div>
          ${lastCheckin.notes ? `<div class="mt muted">Notes: ${htmlEscape(lastCheckin.notes)}</div>` : ''}
        </div>
      ` : ''}
    </section>
  ` : '';

  // =============================================
  // I. COMPRENDRE MES SCORES (PÉDAGOGIE)
  // =============================================
  const comprendreHTML = `
    <section id="comprendre" class="section">
      <h2>I. Comprendre mes scores</h2>
      <p class="muted mb">Guide complet pour interpréter vos métriques physiologiques et optimiser votre préparation.</p>
      
      <!-- VLamax -->
      <div class="card pagebreakAvoid">
        <h3>⚡ VLamax – Vitesse maximale de production de lactate</h3>
        <p class="muted">Le VLamax mesure la puissance de votre système anaérobie glycolytique, c'est-à-dire votre capacité à produire de l'énergie rapidement à partir des glucides.</p>
        
        <!-- Graphique échelle VLamax -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid meet">
            <!-- Barre de fond -->
            <defs>
              <linearGradient id="vlamaxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#16a34a"/>
                <stop offset="37.5%" style="stop-color:#3b82f6"/>
                <stop offset="62.5%" style="stop-color:#d97706"/>
                <stop offset="100%" style="stop-color:#dc2626"/>
              </linearGradient>
            </defs>
            <rect x="10" y="15" width="380" height="20" rx="4" fill="url(#vlamaxGrad)"/>
            <!-- Marqueurs -->
            <line x1="10" y1="40" x2="10" y2="45" stroke="#666" stroke-width="1"/>
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="middle">0.20</text>
            <line x1="135" y1="40" x2="135" y2="45" stroke="#666" stroke-width="1"/>
            <text x="135" y="55" font-size="9" fill="#666" text-anchor="middle">0.30</text>
            <line x1="260" y1="40" x2="260" y2="45" stroke="#666" stroke-width="1"/>
            <text x="260" y="55" font-size="9" fill="#666" text-anchor="middle">0.40</text>
            <line x1="390" y1="40" x2="390" y2="45" stroke="#666" stroke-width="1"/>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="middle">0.50+</text>
            <!-- Labels zones -->
            <text x="72" y="10" font-size="8" fill="#16a34a" text-anchor="middle" font-weight="600">ENDURANT</text>
            <text x="197" y="10" font-size="8" fill="#3b82f6" text-anchor="middle" font-weight="600">ÉQUILIBRÉ</text>
            <text x="325" y="10" font-size="8" fill="#d97706" text-anchor="middle" font-weight="600">GLYCOLYTIQUE</text>
            <!-- Indicateur valeur actuelle -->
            ${vlamax.value !== null ? `
              <polygon points="${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380))},12 ${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380)) - 5},2 ${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380)) + 5},2" fill="#111"/>
            ` : ''}
          </svg>
          ${vlamax.value !== null ? `<div style="text-align:center;font-size:11px;color:var(--muted)">▲ Votre VLamax: <b>${fmt(vlamax.value, 2)}</b> mmol/L/s</div>` : ''}
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>📊 Zones d'interprétation</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeSuccess">&lt; 0.30</span></td><td>Profil très endurant – idéal pour Ironman/Ultra</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">0.30 – 0.40</span></td><td>Équilibré – polyvalent pour 70.3 / Marathon</td></tr>
                <tr><td><span class="badge badgeWarning">0.40 – 0.50</span></td><td>Glycolytique – favorise les efforts courts</td></tr>
                <tr><td><span class="badge badgeError">&gt; 0.50</span></td><td>Très glycolytique – adapté sprints/explosivité</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4>💡 Impact sur la performance</h4>
            <ul class="muted">
              <li><b>VLamax élevé</b> → consommation glucidique importante = risque de défaillance énergétique sur longue distance</li>
              <li><b>VLamax bas</b> → meilleure utilisation des graisses = économie de glycogène</li>
              <li>La cible dépend de votre objectif : ce qui est bon pour un sprinteur est mauvais pour un Ironman</li>
            </ul>
          </div>
        </div>
        
        <div class="alert alertInfo mt">
          <b>🔬 Sources de données (hiérarchie)</b><br>
          1. Test lactate (gold standard) → 2. Test terrain validé → 3. Estimation snapshot → 4. Valeur par défaut
        </div>
      </div>
      
      <!-- TTE -->
      <div class="card pagebreakAvoid mt">
        <h3>⏱️ TTE – Time To Exhaustion</h3>
        <p class="muted">Le TTE représente la durée maximale pendant laquelle vous pouvez maintenir une intensité donnée (généralement au seuil). C'est un indicateur clé de l'endurance.</p>
        
        <!-- Graphique échelle TTE -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="tteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#dc2626"/>
                <stop offset="33%" style="stop-color:#d97706"/>
                <stop offset="66%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#16a34a"/>
              </linearGradient>
            </defs>
            <rect x="10" y="15" width="380" height="20" rx="4" fill="url(#tteGrad)"/>
            <!-- Marqueurs -->
            <line x1="10" y1="40" x2="10" y2="45" stroke="#666" stroke-width="1"/>
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="middle">20</text>
            <line x1="136" y1="40" x2="136" y2="45" stroke="#666" stroke-width="1"/>
            <text x="136" y="55" font-size="9" fill="#666" text-anchor="middle">30</text>
            <line x1="263" y1="40" x2="263" y2="45" stroke="#666" stroke-width="1"/>
            <text x="263" y="55" font-size="9" fill="#666" text-anchor="middle">45</text>
            <line x1="390" y1="40" x2="390" y2="45" stroke="#666" stroke-width="1"/>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="middle">60+</text>
            <!-- Labels -->
            <text x="73" y="10" font-size="8" fill="#dc2626" text-anchor="middle" font-weight="600">INSUFFISANT</text>
            <text x="200" y="10" font-size="8" fill="#d97706" text-anchor="middle" font-weight="600">CORRECT</text>
            <text x="327" y="10" font-size="8" fill="#16a34a" text-anchor="middle" font-weight="600">OPTIMAL</text>
            <!-- Indicateur -->
            ${tte.tte_min ? `
              <polygon points="${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380))},12 ${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380)) - 5},2 ${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380)) + 5},2" fill="#111"/>
            ` : ''}
          </svg>
          ${tte.tte_min ? `<div style="text-align:center;font-size:11px;color:var(--muted)">▲ Votre TTE: <b>${tte.tte_min}</b> min</div>` : ''}
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>📊 Zones d'interprétation</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeError">&lt; 30 min</span></td><td>Insuffisant pour longue distance</td></tr>
                <tr><td><span class="badge badgeWarning">30 – 45 min</span></td><td>Correct pour formats courts</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">45 – 60 min</span></td><td>Bon pour 70.3 / Marathon</td></tr>
                <tr><td><span class="badge badgeSuccess">&gt; 60 min</span></td><td>Excellent – prêt pour Ironman</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4>⚙️ Comment est-il calculé ?</h4>
            <ul class="muted">
              <li><b>Mode OBSERVED</b> → test réel effectué (valeur directe)</li>
              <li><b>Mode LOAD</b> → estimation basée sur la charge d'entraînement (TSS)</li>
              <li>Le TTE estimé tient compte du volume et de l'intensité des 7 derniers jours</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Risque Glycolytique -->
      <div class="card pagebreakAvoid mt">
        <h3>⚠️ Risque Glycolytique</h3>
        <p class="muted">Le risque glycolytique est un indicateur de la dépendance de l'athlète aux glucides à l'intensité cible de son objectif.</p>
        
        <!-- Graphique échelle Risque Glycolytique -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="70" viewBox="0 0 400 70" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#16a34a"/>
                <stop offset="25%" style="stop-color:#16a34a"/>
                <stop offset="50%" style="stop-color:#3b82f6"/>
                <stop offset="75%" style="stop-color:#d97706"/>
                <stop offset="100%" style="stop-color:#dc2626"/>
              </linearGradient>
            </defs>
            <!-- Barre segmentée -->
            <rect x="10" y="20" width="95" height="20" rx="0" fill="#16a34a"/>
            <rect x="105" y="20" width="95" height="20" rx="0" fill="#3b82f6"/>
            <rect x="200" y="20" width="95" height="20" rx="0" fill="#d97706"/>
            <rect x="295" y="20" width="95" height="20" rx="0" fill="#dc2626"/>
            <!-- Labels zones dans barres -->
            <text x="57" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">FAIBLE</text>
            <text x="152" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">MODÉRÉ</text>
            <text x="247" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">ÉLEVÉ</text>
            <text x="342" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">CRITIQUE</text>
            <!-- Marqueurs -->
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="start">0</text>
            <text x="105" y="55" font-size="9" fill="#666" text-anchor="middle">25</text>
            <text x="200" y="55" font-size="9" fill="#666" text-anchor="middle">50</text>
            <text x="295" y="55" font-size="9" fill="#666" text-anchor="middle">75</text>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="end">100</text>
            <!-- Indicateur si disponible -->
            ${raceReadiness.nutritionalRiskIndex ? (() => {
              const levelToPosition: Record<string, number> = { low: 12.5, moderate: 37.5, high: 62.5, critical: 87.5 };
              const pos = 10 + ((levelToPosition[raceReadiness.nutritionalRiskIndex.level] || 50) / 100) * 380;
              return `
                <polygon points="${pos},17 ${pos - 5},7 ${pos + 5},7" fill="#111"/>
                <text x="${pos}" y="65" font-size="10" fill="#111" text-anchor="middle" font-weight="700">▲ ${raceReadiness.nutritionalRiskIndex.label}</text>
              `;
            })() : ''}
          </svg>
        </div>
        
        <div class="alert alertWarning mt">
          <b>Important</b> : Cet indicateur n'est pas un jugement de performance, mais un outil d'aide à la décision pour orienter l'entraînement et la stratégie nutritionnelle.
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>🧩 Composantes du risque</h4>
            <ul class="muted">
              <li><b>VLamax</b> – vitesse de production du lactate</li>
              <li><b>TTE</b> – capacité à maintenir une intensité élevée</li>
              <li><b>Durée et intensité</b> de l'épreuve visée</li>
            </ul>
            <p class="muted mt">Un risque élevé signifie que l'athlète utilise rapidement ses réserves de glucides et peut rencontrer une baisse de performance si la nutrition et l'endurance ne sont pas adaptées.</p>
          </div>
          <div>
            <h4>📊 Interprétation des zones</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeSuccess">0 – 25</span></td><td><b>Faible</b> → profil endurant</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">26 – 50</span></td><td><b>Modéré</b> → nutrition stratégique</td></tr>
                <tr><td><span class="badge badgeWarning">51 – 75</span></td><td><b>Élevé</b> → dépendance glucidique</td></tr>
                <tr><td><span class="badge badgeError">76 – 100</span></td><td><b>Critique</b> → risque défaillance</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Race Readiness -->
      <div class="card pagebreakAvoid mt">
        <h3>🎯 Race Readiness</h3>
        <p class="muted">Race Readiness est un outil d'aide à la décision destiné aux coachs et staffs. Il évalue la cohérence entre le profil physiologique actuel de l'athlète et les exigences de son objectif.</p>
        
        <!-- Graphique Race Readiness avec jauge circulaire -->
        <div class="mt" style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <!-- Arc de fond -->
            <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" stroke-width="12"/>
            <!-- Arc coloré selon score -->
            <circle cx="60" cy="60" r="50" fill="none" 
              stroke="${raceReadiness.score >= 80 ? '#16a34a' : raceReadiness.score >= 60 ? '#d97706' : '#dc2626'}" 
              stroke-width="12"
              stroke-dasharray="${(raceReadiness.score / 100) * 314} 314"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <!-- Valeur centrale -->
            <text x="60" y="55" font-size="28" font-weight="700" fill="${raceReadiness.score >= 80 ? '#16a34a' : raceReadiness.score >= 60 ? '#d97706' : '#dc2626'}" text-anchor="middle">${raceReadiness.score}</text>
            <text x="60" y="72" font-size="10" fill="#666" text-anchor="middle">%</text>
          </svg>
          <div style="flex:1">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
              <!-- Mini barres pour chaque pilier -->
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">VLamax</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.vlamax * 4}%;background:${raceReadiness.details.vlamax >= 20 ? '#16a34a' : raceReadiness.details.vlamax >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.vlamax}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">TTE</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.endurance * 4}%;background:${raceReadiness.details.endurance >= 20 ? '#16a34a' : raceReadiness.details.endurance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.endurance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">FTP/kg</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.puissance * 4}%;background:${raceReadiness.details.puissance >= 20 ? '#16a34a' : raceReadiness.details.puissance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.puissance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">Fraîcheur</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.fraicheur * 4}%;background:${raceReadiness.details.fraicheur >= 18 ? '#16a34a' : raceReadiness.details.fraicheur >= 12 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.fraicheur}/25</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="alert ${raceReadiness.score >= 80 ? 'alertSuccess' : raceReadiness.score >= 60 ? 'alertWarning' : 'alertError'}">
          <b>${raceReadiness.label}</b> pour ${getObjectifLabel(athlete.goal)}
        </div>
        
        <div class="alert alertInfo mt">
          <b>⚠️ Attention</b> : Ce score ne constitue ni une prédiction de performance ni une garantie de résultat. Il doit être interprété avec le contexte d'entraînement.
        </div>
        
        <h4 class="mt">🏛️ Les 4 piliers du score</h4>
        <div class="grid4 mt">
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">⚡ VLamax effectif</div>
            <p style="font-size:11px;margin-top:4px">Dominance glucidique vs lipidique. Interprété selon la distance.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">🔥 Puissance durable</div>
            <p style="font-size:11px;margin-top:4px">FTP ou allure seuil – toujours liée au TTE.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">⏱️ TTE effectif</div>
            <p style="font-size:11px;margin-top:4px">Tolérance à l'effort prolongé. Central pour longue distance.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">🎯 Objectif sportif</div>
            <p style="font-size:11px;margin-top:4px">IM ≠ Sprint ≠ Marathon. Pondération spécifique.</p>
          </div>
        </div>
        
        <h4 class="mt">📈 Indice de confiance</h4>
        <ul class="muted">
          <li><b>&gt; 80%</b> – Données fiables, score exploitable</li>
          <li><b>60-80%</b> – Données partielles, interpréter avec prudence</li>
          <li><b>&lt; 60%</b> – Données insuffisantes, compléter le profil</li>
        </ul>
        <p class="muted" style="font-style:italic;font-size:11px">La confiance diminue de 1% par semaine depuis le dernier test.</p>
      </div>
      
      <!-- Économie de Course -->
      <div class="card pagebreakAvoid mt">
        <h3>🏃 Économie de Course</h3>
        <p class="muted">En course à pied, la performance dépend autant de l'économie de mouvement que des capacités métaboliques. Une mauvaise économie augmente la consommation énergétique et les besoins nutritionnels.</p>
        
        <div class="grid2 mt">
          <div>
            <h4>📖 Définition opérationnelle</h4>
            <p class="muted">L'économie de course représente le coût énergétique pour maintenir une allure donnée. À VLamax et VO₂max égaux, l'athlète le plus économique :</p>
            <ul class="muted">
              <li>Performe mieux</li>
              <li>Consomme moins de glucides</li>
              <li>Fatigue moins vite</li>
            </ul>
          </div>
          <div>
            <h4>📊 Données utilisées</h4>
            <ul class="muted">
              <li>Allure à une intensité donnée (ex : allure marathon)</li>
              <li>Fréquence cardiaque associée</li>
              <li>Stabilité de la FC dans le temps (dérive)</li>
              <li>Historique de charge (TTE effectif)</li>
            </ul>
            <p class="muted" style="font-style:italic;font-size:11px">Aucune mesure de laboratoire obligatoire.</p>
          </div>
        </div>
      </div>
      
      <!-- Nutrition Prédictive -->
      <div class="card pagebreakAvoid mt">
        <h3>❤️ Nutrition Prédictive</h3>
        <p class="muted">Les besoins glucidiques sont estimés à partir des caractéristiques physiologiques de l'athlète (VLamax, endurance, économie de mouvement).</p>
        
        <div class="alert alertInfo mt">
          Ces valeurs sont des plages recommandées, destinées à guider la stratégie nutritionnelle et non à remplacer les tests terrain.
        </div>
        
        <h4 class="mt">🧬 Principes clés</h4>
        <ul class="muted">
          <li><b>VLamax élevé</b> → forte combustion glucidique</li>
          <li><b>TTE élevé</b> → meilleure capacité à soutenir une intensité</li>
          <li><b>Économie faible</b> → surcoût énergétique</li>
          <li><b>CAP &gt; Vélo</b> → contrainte mécanique + digestive plus élevée</li>
        </ul>
      </div>
      
      <!-- Fondements Scientifiques -->
      <div class="card pagebreakAvoid mt">
        <h3>🧠 Fondements scientifiques</h3>
        <p class="muted">Cette méthodologie s'appuie sur des modèles énergétiques reconnus et des données terrain validées :</p>
        <ul class="muted">
          <li>Modèles énergétiques (Mader, INSCYD-like)</li>
          <li>Relations VLamax ↔ oxydation glucidique</li>
          <li>Concepts utilisés par Dan Lorang, WKO, INSCYD</li>
          <li>Données terrain + logique staff (pas de boîte noire)</li>
        </ul>
        <div class="alert alertSuccess mt">
          <b>✅ Objectif transparence</b> : chaque score est explicable et chaque recommandation est justifiée.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // J. QUALITÉ DES DONNÉES
  // =============================================
  const qualiteHTML = `
    <section id="qualite" class="section pagebreakAvoid">
      <h2>J. Qualité des données</h2>
      
      <div class="card ${completude.score >= 80 ? 'cardSuccess' : completude.score >= 50 ? 'cardWarning' : 'cardError'}">
        <div class="grid2">
          <div>
            <h3>Score de complétude</h3>
            <div class="big">${completude.score}%</div>
            <div class="progressBar mt">
              <div class="progressFill" style="width:${completude.score}%; background:${completude.score >= 80 ? 'var(--success)' : completude.score >= 50 ? 'var(--warning)' : 'var(--error)'}"></div>
            </div>
          </div>
          <div>
            ${completude.manquants.length > 0 ? `
              <h4>⚠️ Manque pour améliorer</h4>
              <ul class="muted">
                ${completude.manquants.map(m => `<li>${htmlEscape(m)}</li>`).join("")}
              </ul>
            ` : '<div class="alert alertSuccess">✅ Données complètes</div>'}
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>🔍 Traçabilité des sources</h3>
        <table>
          <thead>
            <tr><th>Métrique</th><th>Valeur</th><th>Source</th><th>Confiance</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><b>VLamax</b></td>
              <td>${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</td>
              <td>${htmlEscape(vlamax.label)}</td>
              <td><span class="badge ${vlamax.confidence >= 0.7 ? 'badgeSuccess' : vlamax.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(vlamax.confidence)}</span></td>
            </tr>
            <tr>
              <td><b>TTE</b></td>
              <td>${tte.tte_min} min</td>
              <td>${tte.source === "observed" ? "Mesuré (OBSERVED)" : tte.source === "estimated" ? "Estimé (LOAD)" : "Inconnu"}</td>
              <td><span class="badge ${tte.confidence >= 0.7 ? 'badgeSuccess' : tte.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(tte.confidence)}</span></td>
            </tr>
            <tr>
              <td><b>Race Readiness</b></td>
              <td>${raceReadiness.score}%</td>
              <td>Calculé (VLamax + TTE + FTP/kg + Fraîcheur)</td>
              <td><span class="badge ${raceReadiness.confidence >= 0.7 ? 'badgeSuccess' : raceReadiness.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(raceReadiness.confidence)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // =============================================
  // FOOTER
  // =============================================
  const footerHTML = `
    <div class="footer">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height:40px; width:auto;" />` : ''}
          <div>
            <b>${htmlEscape(brandMain)}</b> — ${htmlEscape(brandSub)}<br>
            <span class="muted">Rapport généré le ${coverDate} à ${createdAt.toLocaleTimeString("fr-FR")}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="muted">VLamax: ${htmlEscape(vlamax.label)} • TTE: ${tte.source === "observed" ? "mesuré" : "estimé"}</div>
          <div class="muted" style="margin-top:6px;">⚠️ Ce rapport guide la décision mais ne remplace pas un avis médical.</div>
        </div>
      </div>
    </div>
  `;

  // =============================================
  // ASSEMBLE HTML
  // =============================================
  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${htmlEscape(title)}</title>
        ${css}
      </head>
      <body>
        ${coverHTML}
        
        <div class="noPrint">
          <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;background:var(--primary);color:white;border:none;border-radius:8px;">
            🖨️ Imprimer / Enregistrer en PDF
          </button>
          <span class="muted" style="margin-left:12px;">Conseil: dans le dialogue d'impression, choisissez "Enregistrer en PDF".</span>
        </div>

        ${tocHTML}
        ${profilHTML}
        ${executifHTML}
        ${compassHTML}
        ${indicateursHTML}
        ${raceReadinessHTML}
        ${lorangHTML}
        ${zonesHTML}
        ${snapshotsHTML}
        ${testsHTML}
        ${checkinsHTML}
        ${comprendreHTML}
        ${qualiteHTML}
        
        <!-- DISCLAIMER SCIENTIFIQUE -->
        <section id="disclaimer" class="section pagebreakAvoid">
          <h2>9. Mentions Scientifiques & Disclaimer</h2>
          <div class="card">
            <h3>🔬 Fondements scientifiques</h3>
            <p class="muted">Ce rapport s'appuie sur des principes reconnus de physiologie de l'exercice (école allemande, VLamax, TTE, métabolisme énergétique). Les modèles utilisés sont inspirés des travaux de référence (Mader, INSCYD-like) et des concepts appliqués par Dan Lorang.</p>
          </div>
          <div class="alert alertWarning mt">
            <b>⚠️ Avertissement:</b> Ce rapport est un outil d'aide à la décision destiné aux coachs et staffs. Il ne remplace ni un test médical, ni l'expertise du coach, ni un avis médical professionnel. Les estimations nutritionnelles sont indicatives et doivent être ajustées selon la tolérance individuelle.
          </div>
        </section>
        
        ${footerHTML}
      </body>
    </html>
  `;
}

// =============================================
// EXPORT CSV
// =============================================

function buildCSV(payload: ExportPayload): string {
  const { athlete, effectiveSnapshot, effectiveRefs, vlamax, tte, raceReadiness, snapshotHistory, tests, completude } = payload;
  
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0 
    ? effectiveRefs.ftp / effectiveRefs.weightKg 
    : null;
  
  let csv = "Champ,Valeur\n";
  csv += `Nom,${athlete.name}\n`;
  csv += `Objectif,${getObjectifLabel(athlete.goal)}\n`;
  csv += `Date export,${new Date().toLocaleDateString("fr-FR")}\n`;
  csv += `Complétude,${completude.score}%\n`;
  csv += `\n`;
  csv += `=== INDICATEURS EFFECTIFS ===\n`;
  csv += `VLamax,${vlamax.value !== null ? vlamax.value.toFixed(2) : "—"}\n`;
  csv += `VLamax source,${vlamax.label}\n`;
  csv += `VLamax confiance,${(vlamax.confidence * 100).toFixed(0)}%\n`;
  csv += `VLamax verrouillée,${vlamax.isLocked ? "Oui" : "Non"}\n`;
  csv += `TTE (min),${tte.tte_min}\n`;
  csv += `TTE source,${tte.source}\n`;
  csv += `TTE confiance,${(tte.confidence * 100).toFixed(0)}%\n`;
  csv += `TTE cible,${tte.target}\n`;
  csv += `Race Readiness,${raceReadiness.score}/100\n`;
  csv += `Race Readiness label,${raceReadiness.label}\n`;
  csv += `\n`;
  csv += `=== RÉFÉRENCES EFFECTIVES ===\n`;
  csv += `FCmax,${effectiveRefs.fcMax ?? "—"}\n`;
  csv += `VMA,${effectiveRefs.vma ?? "—"}\n`;
  csv += `FTP,${effectiveRefs.ftp ?? "—"}\n`;
  csv += `Poids,${effectiveRefs.weightKg ? effectiveRefs.weightKg.toFixed(1) : "—"}\n`;
  csv += `FTP/kg,${ftpKg ? ftpKg.toFixed(2) : "—"}\n`;
  csv += `VO2max,${effectiveRefs.vo2max ? effectiveRefs.vo2max.toFixed(1) : "—"}\n`;
  
  if (effectiveSnapshot) {
    csv += `\n`;
    csv += `=== SNAPSHOT EFFECTIF ===\n`;
    csv += `Date,${effectiveSnapshot.date}\n`;
    csv += `Source,${effectiveSnapshot.source || "manual"}\n`;
    csv += `Cycle,${effectiveSnapshot.cycle_tag || "—"}\n`;
    csv += `TSS 7d,${effectiveSnapshot.tss_7d ?? "—"}\n`;
  }

  if (snapshotHistory.length > 0) {
    csv += `\n`;
    csv += `=== HISTORIQUE SNAPSHOTS ===\n`;
    csv += `Date,FTP,Poids,FTP/kg,TSS_7d,VO2max,VLamax,Source\n`;
    snapshotHistory
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(snap => {
        const snapFtpKg = snap.ftp && snap.weight_kg ? (snap.ftp / snap.weight_kg).toFixed(2) : "";
        csv += `${snap.date},${snap.ftp ?? ""},${snap.weight_kg ?? ""},${snapFtpKg},${snap.tss_7d ?? ""},${snap.vo2max ?? ""},${snap.vlamax ?? ""},${snap.source || ""}\n`;
      });
  }

  if (tests.length > 0) {
    csv += `\n`;
    csv += `=== HISTORIQUE TESTS ===\n`;
    csv += `Date,Type,Nom,VLamax,Fiabilité,Note\n`;
    tests
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(t => {
        csv += `${t.date},${t.type || ""},${t.name || ""},${t.vlamax ?? ""},${t.reliability ?? ""},${(t.note || "").replace(/,/g, ";")}\n`;
      });
  }

  return csv;
}

// =============================================
// COMPONENT
// =============================================

export function ExportTools({ athlete, snapshots, tests, checkins = [], staffMode = false }: ExportToolsProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const payload = buildExportPayload(athlete, snapshots, tests, checkins);
  const exportCheck = canExport(payload);

  const handleExportCSV = () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    const csv = buildCSV(payload);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${athlete.name.replace(/\s+/g, "_")}_2FC_Lab.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Export CSV terminé", {
      description: `Fichier téléchargé`
    });
  };

  const handleExportPDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    setIsGeneratingPdf(true);
    toast.info("Génération du PDF en cours...", { duration: 3000 });
    
    try {
      // Convert logo to base64 for embedding in the PDF
      const logoBase64 = await imageToBase64(logoUrl);
      
      const html = buildStaffGradeReportHTML(payload, logoBase64);
      
      // Créer un iframe caché pour charger le HTML complet
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "210mm"; // A4 width
      iframe.style.height = "297mm";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      
      // Écrire le HTML dans l'iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Impossible de créer l'iframe");
      }
      
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      
      // Attendre que le contenu soit chargé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const contentBody = iframeDoc.body;
      
      // Options pour html2pdf
      const options = {
        margin: [8, 8, 8, 8],
        filename: `rapport-staff-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: { 
          scale: 1.5,
          useCORS: true,
          letterRendering: true,
          logging: false,
          windowWidth: 794, // A4 width in pixels at 96 DPI
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" as const
        },
        pagebreak: { mode: ["css", "legacy"] }
      };
      
      // Générer et télécharger le PDF
      await html2pdf().set(options).from(contentBody).save();
      
      // Nettoyer l'iframe
      document.body.removeChild(iframe);
      
      toast.success("PDF généré avec succès", {
        description: `Fichier téléchargé: ${options.filename}`
      });
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF", {
        description: "Veuillez réessayer"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!exportCheck.ok) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{exportCheck.reason}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportCSV}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportPDF}
        disabled={isGeneratingPdf}
        className="gap-2"
      >
        {isGeneratingPdf ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {isGeneratingPdf ? "Génération..." : "📄 Export PDF"}
      </Button>
    </div>
  );
}

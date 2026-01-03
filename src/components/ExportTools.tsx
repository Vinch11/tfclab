// =============================================
// OUTILS EXPORT PDF – RAPPORT STAFF-GRADE COMPLET
// Two For Coaching Lab – Export Premium
// =============================================

import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
import { getEffectiveSnapshot, getEffectiveRefs, type EffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, type TTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, type RaceReadinessEffectif, getTargets, getRaceWeights } from "@/lib/raceReadinessEffectif";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";
import { reglesDanLorang, getPrioriteLabel, getSeancesRecommandees, PrioriteType } from "@/types/reglesDanLorang";
import { SEANCES } from "@/types/seances";
import logoUrl from "@/assets/logo-2fc.png";

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
    reportDate: new Date().toISOString()
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
    tests, snapshotHistory, checkins, completude, reportDate 
  } = payload;
  
  const refs = getAthleteRefsForZones(effectiveRefs);
  const targets = getTargets(athlete.goal || "IM");
  const weights = getRaceWeights(athlete.goal || "IM");

  const brandMain = "Two For Coaching Lab";
  const brandSub = "Staff-grade Performance Intelligence";
  const createdAt = new Date(reportDate);
  const title = `${brandMain} — Rapport Performance — ${athlete.name || "Athlète"}`;

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
      .cover { min-height: 90vh; display:flex; flex-direction:column; justify-content:space-between; border:1px solid var(--border); border-radius: 18px; padding: 28px; background: linear-gradient(180deg, #ffffff, var(--soft)); position: relative; overflow:hidden; margin-bottom: 24px; }
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
      <div class="coverTop">
        <div class="brand" style="display:flex; align-items:center; gap:16px;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height:120px; width:auto;" />` : ''}
          <div>
            <div class="tag tagPrimary">${htmlEscape(brandMain)}</div>
            <div class="brandSub">${htmlEscape(brandSub)}</div>
          </div>
        </div>
        <div>
          <div class="tag">Rapport Performance</div>
          <div class="tag" style="margin-left:6px">${coverDate}</div>
        </div>
      </div>

      <div class="coverMid">
        <div style="font-size:14px;color:var(--muted);">Rapport Performance Athlète</div>
        <div class="coverTitle">${coverAthlete}</div>
        <div class="coverMeta">
          <div class="tag"><b>Objectif:</b> ${coverObjective}</div>
          <div class="tag"><b>Snapshot:</b> ${snapshotDate}</div>
          <div class="tag"><b>Cycle:</b> ${htmlEscape(cycleTag)}</div>
          <div class="tag"><b>Source:</b> ${htmlEscape(snapshotSource)}</div>
          ${completudeBadge}
          <span class="tag tagPrimary">Complétude: ${completude.score}%</span>
        </div>
      </div>

      <div class="coverBottom">
        <div class="card">
          <h3>Indicateurs clés</h3>
          <div class="grid3 mt">
            <div>
              <span class="muted">VLamax</span><br>
              <span class="medium ${vlamax.value !== null && vlamax.value > 0.45 ? 'warning' : vlamax.value !== null && vlamax.value < 0.28 ? 'error' : 'success'}">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</span>
              ${vlamax.isLocked ? '<br><span class="locked">🔒 Mesurée</span>' : ''}
            </div>
            <div>
              <span class="muted">TTE</span><br>
              <span class="medium ${tte.tte_min < (tte.target || 45) ? 'warning' : 'success'}">${tte.tte_min} min</span>
            </div>
            <div>
              <span class="muted">Race Readiness</span><br>
              <span class="medium ${raceReadiness.score >= 80 ? 'success' : raceReadiness.score >= 60 ? 'warning' : 'error'}">${raceReadiness.score}%</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Références</h3>
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

      <div class="watermark">${htmlEscape(brandMain.split(" ")[0])}</div>
    </section>
  `;

  // =============================================
  // SOMMAIRE
  // =============================================
  const tocHTML = `
    <div class="toc mb">
      <div class="tocTitle">📑 Sommaire</div>
      <div class="tocRow"><a href="#executif">A. Résumé exécutif</a></div>
      <div class="tocRow"><a href="#indicateurs">B. Indicateurs clés + Interprétation</a></div>
      <div class="tocRow"><a href="#race">C. Race Readiness (Staff)</a></div>
      <div class="tocRow"><a href="#lorang">D. Analyse Dan Lorang</a></div>
      <div class="tocRow"><a href="#zones">E. Zones d'entraînement</a></div>
      <div class="tocRow"><a href="#historique-snapshots">F. Historique snapshots</a></div>
      <div class="tocRow"><a href="#historique-tests">G. Historique tests</a></div>
      ${checkins.length > 0 ? '<div class="tocRow"><a href="#checkins">H. Check-ins & Monitoring</a></div>' : ''}
      <div class="tocRow"><a href="#qualite">I. Qualité des données</a></div>
    </div>
  `;

  // =============================================
  // B. RÉSUMÉ EXÉCUTIF
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

  const executifHTML = `
    <section id="executif" class="section pagebreakAvoid">
      <h2>A. Résumé exécutif</h2>
      <div class="card cardHighlight">
        <h3>📋 Synthèse Coach (5 points clés)</h3>
        <ol style="margin:10px 0;padding-left:20px;">
          <li><b>État actuel:</b> ${raceReadiness.label} — Score Race Readiness: ${raceReadiness.score}% pour objectif ${getObjectifLabel(athlete.goal)}.</li>
          <li><b>Points forts:</b> ${pointsForts.length > 0 ? pointsForts.slice(0, 2).join(", ") : "À développer"}.</li>
          <li><b>Points limitants:</b> ${pointsLimitants.length > 0 ? pointsLimitants.slice(0, 2).join(", ") : "Aucun majeur"}.</li>
          <li><b>Priorité bloc:</b> ${lorang.prioriteLabel || "Maintien"}.</li>
          <li><b>Risque nutritionnel:</b> ${raceReadiness.nutritionalRiskIndex ? `${raceReadiness.nutritionalRiskIndex.label} (${raceReadiness.nutritionalRiskIndex.icon})` : "Non calculé (données manquantes)"}.</li>
        </ol>
      </div>
      
      <div class="grid4 mt">
        <div class="card">
          <div class="muted">VLamax effectif</div>
          <div class="big ${vlamax.value !== null && vlamax.value > 0.45 ? 'warning' : 'success'}">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</div>
          <div class="muted">Conf: ${fmtPct(vlamax.confidence)}</div>
        </div>
        <div class="card">
          <div class="muted">TTE effectif</div>
          <div class="big ${tte.tte_min < (tte.target || 45) ? 'warning' : 'success'}">${tte.tte_min} min</div>
          <div class="muted">Cible: ${tte.target} min</div>
        </div>
        <div class="card">
          <div class="muted">FTP / FTP/kg</div>
          <div class="big">${effectiveRefs.ftp ?? "—"} W</div>
          <div class="muted">${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
        </div>
        <div class="card">
          <div class="muted">TSS 7d / Poids</div>
          <div class="big">${effectiveSnapshot?.tss_7d ?? "—"}</div>
          <div class="muted">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
        </div>
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
  // F. ZONES
  // =============================================
  const zonesHTML = `
    <section id="zones" class="section pagebreak">
      <h2>E. Zones d'entraînement</h2>
      
      <div class="grid3">
        <div class="card">
          <h3>❤️ Zones Cardiaques (FCmax)</h3>
          ${effectiveRefs.fcMax ? `
            <ul class="muted">
              <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z1", refs))}</li>
              <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z2", refs))}</li>
              <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z3", refs))}</li>
              <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z4", refs))}</li>
              <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z5", refs))}</li>
            </ul>
          ` : '<div class="alert alertWarning">FCmax manquante — Renseignez FCmax dans les références athlète.</div>'}
        </div>
        <div class="card">
          <h3>🏃 Zones Course (VMA)</h3>
          ${effectiveRefs.vma ? `
            <ul class="muted">
              <li>${htmlEscape(zoneAbs("allure", "course", "Z1", refs))}</li>
              <li>${htmlEscape(zoneAbs("allure", "course", "Z2", refs))}</li>
              <li>${htmlEscape(zoneAbs("allure", "course", "Z3", refs))}</li>
              <li>${htmlEscape(zoneAbs("allure", "course", "Z4b", refs))}</li>
              <li>${htmlEscape(zoneAbs("allure", "course", "Z6", refs))}</li>
            </ul>
          ` : '<div class="alert alertWarning">VMA manquante — Renseignez VMA dans les références athlète.</div>'}
        </div>
        <div class="card">
          <h3>🚴 Zones Vélo (FTP)</h3>
          ${effectiveRefs.ftp ? `
            <ul class="muted">
              <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z1", refs))}</li>
              <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z2", refs))}</li>
              <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z3", refs))}</li>
              <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z4", refs))}</li>
              <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z5", refs))}</li>
            </ul>
          ` : '<div class="alert alertWarning">FTP manquante — Renseignez FTP dans le snapshot.</div>'}
        </div>
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
  // J. QUALITÉ DES DONNÉES
  // =============================================
  const qualiteHTML = `
    <section id="qualite" class="section pagebreakAvoid">
      <h2>I. Qualité des données</h2>
      
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
        ${executifHTML}
        ${indicateursHTML}
        ${raceReadinessHTML}
        ${lorangHTML}
        ${zonesHTML}
        ${snapshotsHTML}
        ${testsHTML}
        ${checkinsHTML}
        ${qualiteHTML}
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
    
    // Convert logo to base64 for embedding in the PDF
    const logoBase64 = await imageToBase64(logoUrl);
    
    const html = buildStaffGradeReportHTML(payload, logoBase64);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup bloquée", {
        description: "Autorise les popups pour exporter en PDF."
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try { w.focus(); } catch {}
    }, 300);
    
    toast.success("Rapport PDF généré", {
      description: "Cliquez sur Imprimer pour enregistrer en PDF."
    });
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
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        📄 Export PDF Staff
      </Button>
    </div>
  );
}

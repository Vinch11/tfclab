/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B — TARGET TABLE (source unique des valeurs physiologiques)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Toutes les valeurs autorisées (watts, allures s/km, s/100m, bpm) sont
 * calculées UNE fois côté client, à partir de :
 *   - `athleteData` (ftp, vma, css, fcMax, paceThresholdSecPerKm)
 *   - `deriveRaceTargets` (racePace/racePower selon objectif)
 * Puis :
 *   1) injectées dans le userPrompt comme "🔢 VALEURS AUTORISÉES"
 *   2) envoyées à l'edge dans `planConfig._targetTable`
 *   3) utilisées par le validateur post-merge (valueCheck.ts)
 *
 * Aucun nombre du plan (watts, s/km, s/100m, bpm) ne doit provenir d'ailleurs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { TRAINING_ZONES } from "@/lib/trainingZonesDefinition";
import { deriveRaceTargets, mapObjectiveToSport } from "@/lib/deriveRaceTargets";

export type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5" | "Z6" | "Z7";
export type Range = [number, number];

export interface TargetTable {
  // Vélo
  ftpW: number | null;
  bikeZonesW: Partial<Record<ZoneKey, Range>>;
  sstW: Range | null;                  // 88-94% FTP
  racePowerW: number | null;
  racePowerRange: Range | null;        // ±5W
  // Course
  vmaKmh: number | null;
  runPacesSecPerKm: Partial<Record<ZoneKey, Range>>;  // sec/km
  racePaceSecPerKm: number | null;
  racePaceRange: Range | null;         // ±5 s/km
  // Nat
  cssSecPer100m: number | null;
  cssRange: Range | null;              // ±3 s/100m
  swimZonesSecPer100m: Partial<Record<"CSS_easy" | "CSS_race" | "CSS_hard", Range>>;
  // Cardio
  fcMax: number | null;
  fcZonesBpm: Partial<Record<ZoneKey, Range>>;
  // Meta
  meta: {
    objective: string | null;
    ambition: string | null;
    sport: string;
    generatedAt: number;
  };
}

function paceSecFromVma(vmaKmh: number, pct: number): number {
  const speedKmh = (pct / 100) * vmaKmh;
  return Math.round(3600 / speedKmh);
}

export interface BuildTargetTableInput {
  ftp?: number | null;
  vma?: number | null;
  css?: number | null;
  fcMax?: number | null;
  paceThresholdSecPerKm?: number | null;
  objective?: string | null;
  ambition?: string | null;
  weeklyHours?: number | null;
  trainingLevel?: "untrained" | "light" | "trained" | "highly_trained" | null;
}

/**
 * Construit la table de valeurs autorisées, source UNIQUE pour le plan.
 * - Watts et pace: bornes zones ×FTP / ×VMA (arrondies)
 * - racePower: dérivé du % FTP correspondant à racePace estimée (fallback: 88% FTP)
 * - racePace: deriveRaceTargets (paceTargets.allureSemiCible), sinon seuil
 * - CSS: ±3s/100m autour du CSS observé (pas de zones swim canoniques).
 */
export function buildTargetTable(input: BuildTargetTableInput): TargetTable {
  const ftp = typeof input.ftp === "number" && input.ftp > 0 ? Math.round(input.ftp) : null;
  const vma = typeof input.vma === "number" && input.vma > 0 ? input.vma : null;
  const css = typeof input.css === "number" && input.css > 0 ? Math.round(input.css) : null;
  const fcMax = typeof input.fcMax === "number" && input.fcMax > 0 ? Math.round(input.fcMax) : null;

  const bikeZonesW: Partial<Record<ZoneKey, Range>> = {};
  const runPaces: Partial<Record<ZoneKey, Range>> = {};
  const fcZones: Partial<Record<ZoneKey, Range>> = {};

  for (const z of TRAINING_ZONES) {
    const zid = z.id as ZoneKey;
    if (ftp) {
      bikeZonesW[zid] = [
        Math.round((z.ftp.min / 100) * ftp),
        Math.round((z.ftp.max / 100) * ftp),
      ];
    }
    if (vma) {
      // pace min = plus vite (borne max VMA%), pace max = plus lent
      const paceFast = paceSecFromVma(vma, z.vma.max);
      const paceSlow = paceSecFromVma(vma, z.vma.min || 40);
      runPaces[zid] = [paceFast, paceSlow];
    }
    if (fcMax && z.fcMax) {
      fcZones[zid] = [
        Math.round((z.fcMax.min / 100) * fcMax),
        Math.round((z.fcMax.max / 100) * fcMax),
      ];
    }
  }

  // Sweet Spot 88-94% FTP
  const sstW: Range | null = ftp ? [Math.round(0.88 * ftp), Math.round(0.94 * ftp)] : null;

  // Race targets (allure course cible)
  let racePaceSecPerKm: number | null = null;
  let racePaceRange: Range | null = null;
  let racePowerW: number | null = null;
  let racePowerRange: Range | null = null;

  try {
    const derived = deriveRaceTargets({
      vmaKmh: vma,
      thresholdPaceSecPerKm: input.paceThresholdSecPerKm ?? null,
      objective: input.objective || "",
      ambition: input.ambition || "age_group",
      weeklyHours: input.weeklyHours ?? null,
      trainingLevel: input.trainingLevel ?? null,
      sport: mapObjectiveToSport(input.objective),
    });
    if (derived.paceTargets) {
      racePaceSecPerKm = derived.paceTargets.allureSemiCible;
      racePaceRange = [racePaceSecPerKm - 5, racePaceSecPerKm + 5];
    }
    // Race power : approximation basée sur la famille de distance/ambition
    // (défauts triathlon 70.3=88% FTP, IM=76% FTP, sinon 90% seuil)
    if (ftp) {
      const objL = (input.objective || "").toLowerCase();
      let pctFtp = 0.90;
      if (objL.includes("70.3") || objL.includes("703") || objL.includes("half iron")) pctFtp = 0.85;
      else if (objL.includes("ironman") || objL === "im") pctFtp = 0.76;
      else if (objL.includes("sprint")) pctFtp = 0.95;
      else if (objL.includes("olympic") || objL.includes("olympique")) pctFtp = 0.92;
      racePowerW = Math.round(pctFtp * ftp);
      racePowerRange = [racePowerW - 5, racePowerW + 5];
    }
  } catch {
    // silent: derivedRaceTargets peut échouer (données insuffisantes)
  }

  // CSS : bandes larges
  const cssRange: Range | null = css ? [css - 3, css + 3] : null;
  const swimZonesSecPer100m: TargetTable["swimZonesSecPer100m"] = {};
  if (css) {
    swimZonesSecPer100m.CSS_easy = [css + 5, css + 15];   // easy = plus lent
    swimZonesSecPer100m.CSS_race = [css - 2, css + 2];
    swimZonesSecPer100m.CSS_hard = [css - 5, css - 1];    // hard = plus vite
  }

  return {
    ftpW: ftp,
    bikeZonesW,
    sstW,
    racePowerW,
    racePowerRange,
    vmaKmh: vma,
    runPacesSecPerKm: runPaces,
    racePaceSecPerKm,
    racePaceRange,
    cssSecPer100m: css,
    cssRange,
    swimZonesSecPer100m,
    fcMax,
    fcZonesBpm: fcZones,
    meta: {
      objective: input.objective ?? null,
      ambition: input.ambition ?? null,
      sport: mapObjectiveToSport(input.objective),
      generatedAt: Date.now(),
    },
  };
}

function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Rend un bloc texte compact pour injection dans le userPrompt.
 * Le LLM doit TOUJOURS choisir un nombre dans cette table.
 */
export function formatTargetTableBlock(t: TargetTable): string {
  const lines: string[] = [];
  lines.push("🔢 VALEURS AUTORISÉES (uniques, calculées par le moteur — ne recalcule JAMAIS)");
  if (t.ftpW) {
    const zones = Object.entries(t.bikeZonesW)
      .map(([z, r]) => `${z}=${r![0]}-${r![1]}W`).join(" · ");
    lines.push(`• Vélo (FTP=${t.ftpW}W) : ${zones}`);
    if (t.sstW) lines.push(`  SST=${t.sstW[0]}-${t.sstW[1]}W (88-94% FTP)`);
    if (t.racePowerW && t.racePowerRange) {
      lines.push(`  racePower=${t.racePowerW}W (±5W → ${t.racePowerRange[0]}-${t.racePowerRange[1]}W)`);
    }
  }
  if (t.vmaKmh) {
    const paces = Object.entries(t.runPacesSecPerKm)
      .map(([z, r]) => `${z}=${fmtPace(r![0])}-${fmtPace(r![1])}/km`).join(" · ");
    lines.push(`• Course (VMA=${t.vmaKmh.toFixed(1)}km/h) : ${paces}`);
    if (t.racePaceSecPerKm && t.racePaceRange) {
      lines.push(`  racePace=${fmtPace(t.racePaceSecPerKm)}/km (±5s → ${fmtPace(t.racePaceRange[0])}-${fmtPace(t.racePaceRange[1])}/km)`);
    }
  }
  if (t.cssSecPer100m && t.cssRange) {
    lines.push(`• Nat CSS=${fmtPace(t.cssSecPer100m)}/100m (±3s → ${fmtPace(t.cssRange[0])}-${fmtPace(t.cssRange[1])}/100m)`);
  }
  if (t.fcMax) {
    const fcs = Object.entries(t.fcZonesBpm)
      .map(([z, r]) => `${z}=${r![0]}-${r![1]}bpm`).join(" · ");
    lines.push(`• FC (FCmax=${t.fcMax}bpm) : ${fcs}`);
  }
  lines.push("RÈGLE ABSOLUE : tout watt, allure ou temps/100m dans tes détails DOIT provenir de cette table.");
  return lines.join("\n");
}

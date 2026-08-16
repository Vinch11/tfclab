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
import { deriveTrainingZones, makeStandardPctToAbsolute, estimateRunThresholdPaceSecPerKm } from "@/lib/zones/deriveTrainingZones";


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
    /** Provenance des bornes de zones injectées (par sport). */
    zoneSource: { bike: "derived" | "standard"; run: "derived" | "standard" };
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
  /** Physiologie pour les zones dérivées (repli grille standard si absente). */
  vlamax?: number | null;
  vlamaxRun?: number | null;
  vo2max?: number | null;
  weightKg?: number | null;
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

  // Zones dérivées de la physiologie (repli silencieux sur la grille standard).
  const bikeSet = deriveTrainingZones({
    sport: "bike",
    ftp,
    fcMax,
    vlamax: input.vlamax ?? null,
    vo2max: input.vo2max ?? null,
    weightKg: input.weightKg ?? null,
  });
  // Allure seuil : mesurée si dispo, sinon estimée depuis la VMA (0.90 × VMA).
  const runThresholdPace =
    (typeof input.paceThresholdSecPerKm === "number" && input.paceThresholdSecPerKm > 0
      ? input.paceThresholdSecPerKm
      : estimateRunThresholdPaceSecPerKm(vma, null)) ?? null;
  const runSet = deriveTrainingZones({
    sport: "run",
    vma,
    paceThresholdSecPerKm: runThresholdPace,
    paceThresholdEstimated: !(
      typeof input.paceThresholdSecPerKm === "number" && input.paceThresholdSecPerKm > 0
    ),
    fcMax,
    vlamax: input.vlamaxRun ?? input.vlamax ?? null,
    vo2max: input.vo2max ?? null,
    weightKg: input.weightKg ?? null,
  });
  const bikeAbs = makeStandardPctToAbsolute(bikeSet, {
    sport: "bike",
    ftp,
    fcMax,
    vlamax: input.vlamax ?? null,
    vo2max: input.vo2max ?? null,
  });
  const runAbs = makeStandardPctToAbsolute(runSet, {
    sport: "run",
    vma,
    paceThresholdSecPerKm: input.paceThresholdSecPerKm ?? null,
    fcMax,
    vlamax: input.vlamaxRun ?? input.vlamax ?? null,
    vo2max: input.vo2max ?? null,
  });

  for (const z of TRAINING_ZONES) {
    const zid = z.id as ZoneKey;
    if (ftp) {
      bikeZonesW[zid] = bikeAbs
        ? [Math.round(bikeAbs(z.ftp.min)), Math.round(bikeAbs(z.ftp.max))]
        : [
            Math.round((z.ftp.min / 100) * ftp),
            Math.round((z.ftp.max / 100) * ftp),
          ];
    }
    if (vma) {
      // pace min = plus vite (borne max), pace max = plus lent
      const minPct = z.vma.min || 40;
      const paceFast = runAbs
        ? Math.round(3600 / runAbs(z.vma.max))
        : paceSecFromVma(vma, z.vma.max);
      const paceSlow = runAbs
        ? Math.round(3600 / runAbs(minPct))
        : paceSecFromVma(vma, minPct);
      runPaces[zid] = [paceFast, paceSlow];
    }
    if (fcMax) {
      // FC : bornes dérivées (Karvonen ancré seuil) si les zones le sont,
      // sinon repli sur la grille tabulée %FCmax.
      const derivedFcPct = hrSet?.source === "derived"
        ? getDerivedZone(hrSet, legacyToZone6(zid as LegacyZoneId))?.fcMaxPct ?? null
        : null;
      const pct = derivedFcPct ?? z.fcMax;
      if (pct) {
        fcZones[zid] = [
          Math.round((pct.min / 100) * fcMax),
          Math.round((pct.max / 100) * fcMax),
        ];
      }
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
      zoneSource: {
        bike: bikeAbs ? "derived" : "standard",
        run: runAbs ? "derived" : "standard",
      },
    },

  };
}

function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * PHASE 2B v2 — Bloc INTENSITÉS (RELATIF UNIQUEMENT) injecté dans le prompt.
 * Le modèle n'écrit JAMAIS de valeur absolue (W, min/km, s/100m, bpm).
 * L'app traduit à l'affichage depuis la targetTable (source unique).
 */
export function formatTargetTableBlock(_t: TargetTable): string {
  const lines: string[] = [];
  lines.push("🔢 INTENSITÉS — RELATIF UNIQUEMENT (grille TFCL Z1→Z7)");
  lines.push("Exprime TOUTE intensité en RELATIF : zones (Z1..Z7), %FTP, %VMA, %CSS ou CSS±Xs/100m.");
  lines.push("INTERDIT d'écrire des watts, min/km, s/100m ou bpm absolus — l'application les calcule pour l'athlète.");
  lines.push("");
  lines.push("Zones TFCL (vocabulaire canonique de la bibliothèque) :");
  for (const z of TRAINING_ZONES) {
    lines.push(`  • ${z.id.padEnd(3)} ${z.label} — %FTP ${z.ftp.min}-${z.ftp.max} · %VMA ${z.vma.min}-${z.vma.max}${z.fcMax ? ` · %FCmax ${z.fcMax.min}-${z.fcMax.max}` : " · %FCmax N/A"}`);
  }
  lines.push('  • Z4 nu = union Z4a+Z4b (préfère toujours préciser "Z4a" ou "Z4b").');
  lines.push("");
  lines.push("Choisis la zone par INTENTION (Z4a Marathon/Sweet Spot, Z4b Semi, Z5 Seuil MLSS, Z6 VO2max/VMA, Z7 Neuromusculaire).");
  lines.push("Pour la natation : CSS ou CSS±Xs (ex : 'CSS+5s', 'CSS-2s'). %CSS ∈ [80,120].");
  lines.push("RÈGLE ABSOLUE : aucun nombre absolu (W, /km, /100m, bpm) dans title/details.");
  return lines.join("\n");
}

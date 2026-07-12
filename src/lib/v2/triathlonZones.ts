// ============================================================================
// TRIATHLON ZONES — SOURCE UNIQUE (bike + run) — Deno mirror
// ⚠️ DUPLIQUÉ dans src/lib/v2/triathlonZones.ts — toute modif aux deux.
// ----------------------------------------------------------------------------
// Objectif : éliminer la dérive de zones vélo/course entre séances d'un même
// plan triathlon (audit Cath — Z2 vélo qui varie 95→124W sous le même label).
// Une seule fonction produit toutes les zones bike/run + race target, avec
// borne TTE appliquée sur la puissance race vélo (capBikeRaceIF).
// ============================================================================

import { capBikeRaceIF, type RaceBikeAmbition } from "./racePowerCap";

export interface TriathlonZonesInput {
  ftpW: number | null;
  vmaKmh: number | null;
  thresholdPaceSecPerKm?: number | null;
  objective: string;                 // "703" | "im" | libellé équivalent
  ambition: string;                  // finisher/age_group/competitor/elite/world_class
  tteMinBike?: number | null;
  raceDurationMinBike?: number | null;
  raceDurationMinRun?: number | null;
}

export interface ZoneWattRange { name: string; lo: number; hi: number; pctLo: number; pctHi: number; }
export interface ZonePaceRange { name: string; loSecPerKm: number; hiSecPerKm: number; pctLo: number; pctHi: number; }

export interface TriathlonZonesResult {
  bike: {
    ftpW: number | null;
    zones: ZoneWattRange[];                 // Z1..Z6 (Coggan-like, TFCL)
    racePowerW: number | null;              // watts race (borné TTE)
    raceIF: number;                         // fraction FTP (borné TTE)
    raceIfWasCapped: boolean;
    rationale: string;
  } | null;
  run: {
    vmaKmh: number | null;
    zones: ZonePaceRange[];                 // Z1..Z6
    racePaceSecPerKm: number | null;        // pace race spécifique (info)
  } | null;
  meta: {
    objective: string;
    ambition: RaceBikeAmbition;
    generatedAt: string;
  };
}

// Zones vélo TFCL (calées sur % FTP, cohérentes avec zonesTable du prompt)
const BIKE_ZONE_DEFS: Array<{ name: string; pctLo: number; pctHi: number }> = [
  { name: "Z1 Récupération",        pctLo: 40, pctHi: 55 },
  { name: "Z2 Endurance",           pctLo: 56, pctHi: 75 },
  { name: "Z3 Tempo",               pctLo: 76, pctHi: 90 },
  { name: "Z4 Sweet Spot / Seuil",  pctLo: 88, pctHi: 105 },
  { name: "Z5 VO2max",              pctLo: 106, pctHi: 120 },
  { name: "Z6 Anaérobie",           pctLo: 121, pctHi: 150 },
];

// Zones course TFCL (calées sur % VMA)
const RUN_ZONE_DEFS: Array<{ name: string; pctLo: number; pctHi: number }> = [
  { name: "Z1 Récupération",        pctLo: 50, pctHi: 60 },
  { name: "Z2 Endurance",           pctLo: 60, pctHi: 70 },
  { name: "Z3 Tempo",               pctLo: 70, pctHi: 78 },
  { name: "Z4 Seuil (Marathon/Semi)", pctLo: 78, pctHi: 88 },
  { name: "Z5 MLSS / Seuil haut",   pctLo: 88, pctHi: 92 },
  { name: "Z6 VO2max / VMA",        pctLo: 95, pctHi: 105 },
];

const AMB_MAP: Record<string, RaceBikeAmbition> = {
  finisher: "finisher", finish: "finisher",
  age_group: "age_group", perf: "age_group",
  competitor: "competitor", sub: "competitor",
  elite: "elite", pro: "elite",
  world_class: "world_class",
};

function normAmb(a: string): RaceBikeAmbition {
  const k = (a || "").toLowerCase().trim();
  return (AMB_MAP[k] ?? "age_group");
}

/** Fraction VMA cible pour l'allure race spécifique triathlon (info). */
function raceRunFraction(objective: string, ambition: RaceBikeAmbition): number {
  const obj = (objective || "").toLowerCase();
  const is703 = obj.includes("70.3") || obj === "703";
  const isIM  = obj.includes("ironman") || obj === "im";
  // Base 70.3 (~semi long) / IM (~marathon défensif)
  const base = is703 ? 0.82 : isIM ? 0.75 : 0.83;
  const bonus = ambition === "world_class" ? 0.03 : ambition === "elite" ? 0.02
    : ambition === "competitor" ? 0.01 : ambition === "finisher" ? -0.02 : 0;
  return Math.max(0.60, Math.min(0.90, base + bonus));
}

export function deriveTriathlonZones(input: TriathlonZonesInput): TriathlonZonesResult {
  const amb = normAmb(input.ambition);
  const ftp = typeof input.ftpW === "number" && input.ftpW > 0 ? Math.round(input.ftpW) : null;
  const vma = typeof input.vmaKmh === "number" && input.vmaKmh > 0 ? input.vmaKmh : null;

  // BIKE
  let bike: TriathlonZonesResult["bike"] = null;
  if (ftp) {
    const zones: ZoneWattRange[] = BIKE_ZONE_DEFS.map((z) => ({
      name: z.name,
      pctLo: z.pctLo,
      pctHi: z.pctHi,
      lo: Math.round(ftp * z.pctLo / 100),
      hi: Math.round(ftp * z.pctHi / 100),
    }));
    const cap = capBikeRaceIF({
      objective: input.objective,
      ambition: amb,
      tteMin: input.tteMinBike ?? null,
      raceDurationMin: input.raceDurationMinBike ?? null,
    });
    const raceIF = cap ? cap.cappedPctFTP / 100 : (amb === "elite" || amb === "world_class" ? 0.78 : 0.72);
    const racePowerW = Math.round(ftp * raceIF);
    bike = {
      ftpW: ftp,
      zones,
      racePowerW,
      raceIF,
      raceIfWasCapped: !!cap?.wasCapped,
      rationale: cap?.rationale ?? "IF race par défaut (TTE indisponible)",
    };
  }

  // RUN
  let run: TriathlonZonesResult["run"] = null;
  if (vma) {
    const zones: ZonePaceRange[] = RUN_ZONE_DEFS.map((z) => ({
      name: z.name,
      pctLo: z.pctLo,
      pctHi: z.pctHi,
      // hi% VMA = pace la plus rapide (secs plus bas)
      loSecPerKm: Math.round(3600 / (vma * z.pctHi / 100)),
      hiSecPerKm: Math.round(3600 / (vma * z.pctLo / 100)),
    }));
    const frac = raceRunFraction(input.objective, amb);
    const racePaceSecPerKm = Math.round(3600 / (vma * frac));
    run = { vmaKmh: vma, zones, racePaceSecPerKm };
  }

  return {
    bike,
    run,
    meta: { objective: input.objective, ambition: amb, generatedAt: new Date().toISOString() },
  };
}

/** Formate en bloc markdown injectable dans le prompt IA. */
export function formatTriathlonZonesForPrompt(r: TriathlonZonesResult): string {
  const lines: string[] = [];
  lines.push(`\n#### 🎯 ZONES CANONIQUES TRIATHLON — SOURCE UNIQUE (${r.meta.objective} · ${r.meta.ambition})`);
  lines.push(`⚠️ Ces zones sont **CALCULÉES** à partir du profil (FTP + VMA + TTE). Tu DOIS utiliser CES valeurs EXACTES pour toute prescription vélo/course. Toute variation de "Z2 vélo" d'une séance à l'autre est INTERDITE.\n`);

  if (r.bike) {
    lines.push(`**VÉLO (FTP = ${r.bike.ftpW}W)**`);
    lines.push(`| Zone | % FTP | Watts |`);
    lines.push(`|------|-------|-------|`);
    for (const z of r.bike.zones) {
      lines.push(`| ${z.name} | ${z.pctLo}-${z.pctHi}% | ${z.lo}-${z.hi}W |`);
    }
    lines.push(`- 🏁 **Race power (borné TTE)** : ${r.bike.racePowerW}W (IF ${r.bike.raceIF.toFixed(2)}) ${r.bike.raceIfWasCapped ? "⚠️ bridé par TTE" : "✅"}`);
    lines.push(`  - ${r.bike.rationale}`);
    lines.push(`  - ⛔ Toute séance "brick race pace", "long ride @race", "T2 race" DOIT cibler ${r.bike.racePowerW}W (±5%), JAMAIS au-delà.\n`);
  } else {
    lines.push(`_FTP indisponible → zones vélo non générées._\n`);
  }

  if (r.run) {
    const fmt = (s: number) => `${Math.floor(s / 60)}'${String(Math.round(s % 60)).padStart(2, "0")}"`;
    lines.push(`**COURSE (VMA = ${r.run.vmaKmh?.toFixed(1)} km/h)**`);
    lines.push(`| Zone | % VMA | Allure /km |`);
    lines.push(`|------|-------|------------|`);
    for (const z of r.run.zones) {
      lines.push(`| ${z.name} | ${z.pctLo}-${z.pctHi}% | ${fmt(z.loSecPerKm)}–${fmt(z.hiSecPerKm)} |`);
    }
    lines.push(`- 🏁 **Allure race triathlon** : ${fmt(r.run.racePaceSecPerKm!)}/km`);
    lines.push(`  - Toute séance "long run @race pace", "brick run", "race sim" DOIT cibler cette allure (±10 sec/km).\n`);
  } else {
    lines.push(`_VMA indisponible → zones course non générées._\n`);
  }

  return lines.join("\n");
}

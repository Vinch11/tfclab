/**
 * Pools de sources V3 par famille DET « coach » — niveau BIBLIOTHÈQUE, réutilisable.
 *
 * Chaque pool est la liste exacte des sources V3 EXISTANTES admises par le
 * scénario CI de la famille (v332/v351 course, v320 triathlon, rôles V402),
 * avec les seules doses revues dans les bornes déclarées de chaque source.
 * Aucune séance créée, aucune dose inventée.
 *
 * Statut honnête : ce pool est une preuve d'ADMISSION INGÉNIERIE (scénario CI),
 * PAS une qualification scientifique indépendante : `independentScientificReview`
 * reste `false`. Le plan produit reste non prescriptif.
 *
 * L'empreinte `pinnedFingerprint` fige id + empreinte sportive de chaque source :
 * toute modification d'une source de la bibliothèque invalide le pool (refus
 * nommé) jusqu'à nouvelle revue du pool.
 */
import { fingerprintV3SportingSource } from "../../../scripts/library-v3/sportingQualification800";
import { canonicalJson, sha256Hex } from "@/lib/plan/appendOnlyPlanVersionSave";
import type { CoachFamilyKey } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { findSource, type SourceQualification } from "./coachDetContext";

const n = (p: string, xs: string[]) => xs.map((x) => `${p}${x}`);
const RUN_BASE = n("V3P_RUN_", ["001","003","008","009","011","012","013","020","021","023","024","025","026","027","028","029","031","032","037","038","041","044","047","050","076","077","078","079","080","081","082","083","084","085","119","130","137","139","142","140","145","151","152","153","154","155","156","157","158","159","160","167","169","172"]);
const RUN_TAPER = n("V3P_RUN_", ["020","105","110","115","120","125","135","150","190","195","200"]);
const CROSS_BIKE = n("V3P_BIKE_", ["001","002","017","057","085","090"]);
const STRENGTH = Array.from({ length: 15 }, (_, i) => `V3P_STRENGTH_${101 + i}`);
const TRI_COMMON = [
  ...n("V3P_BIKE_", ["002","017","090","057","085","089","016","142","147","152","149","154","114","199"]),
  ...n("V3P_RUN_", ["001","041","003","031","032","037","038","084","085","137","142","167","172","139","169","119"]),
  ...n("V3P_SWIM_", ["001","002","003","012","021","027","041","042","043","044","045","046","047","048","049","050","101","102","103","132","133","160"]),
];
const TRI_ROLE = [
  ...n("V3P_SWIM_", ["087","088","100","022","025","026","028","031","035","036","037","057"]),
  ...n("V3P_BIKE_", ["013","091","092","105","110","125"]),
  ...n("V3P_RUN_", ["105","110","115","125","130"]),
];
const TRI_DOSES: Record<string, Partial<SourceQualification>> = { V3P_BIKE_002: { targetDurationMin: 65 }, V3P_BIKE_016: { targetDurationMin: 139 } };

export interface FamilySourcePool {
  family: CoachFamilyKey;
  /** Scénario CI dont la liste est reprise à l'identique. */
  ciScenario: string;
  ids: readonly string[];
  /** Doses revues, toujours dans les bornes déclarées de la source. */
  doses: Readonly<Record<string, Partial<SourceQualification>>>;
  independentScientificReview: false;
  pinnedFingerprint: string;
}

const uniq = (xs: string[]) => [...new Set(xs)];
const POOLS_RAW: Record<CoachFamilyKey, Omit<FamilySourcePool, "pinnedFingerprint">> = {
  marathon: { family: "marathon", ciScenario: "v351–v357 marathon route (coachDetRun.test)", independentScientificReview: false,
    ids: uniq([...RUN_BASE, ...RUN_TAPER, "V3P_RUN_136", "V3P_RUN_094", ...STRENGTH, ...CROSS_BIKE]),
    doses: { V3P_RUN_136: { targetDurationMin: 51, allowWorksetChange: true }, V3P_RUN_094: { targetDurationMin: 28, allowWorksetChange: true },
      V3P_RUN_001: { targetDurationMin: 28 }, V3P_RUN_155: { targetDurationMin: 28, allowWorksetChange: true } } },
  semi_marathon: { family: "semi_marathon", ciScenario: "v332 semi + affûtage étendu (V402)", independentScientificReview: false,
    ids: uniq([...RUN_BASE, ...RUN_TAPER, ...CROSS_BIKE, ...STRENGTH]),
    doses: { V3P_RUN_160: { targetDurationMin: 25, allowWorksetChange: true } } },
  triathlon_703: { family: "triathlon_703", ciScenario: "v320 70.3 + rôles V3 V402", independentScientificReview: false,
    ids: uniq([...TRI_COMMON, "V3P_BIKE_012", "V3P_BIKE_084", "V3P_SWIM_199", ...TRI_ROLE, "V3P_BIKE_185", "V3P_RUN_165", ...STRENGTH]), doses: TRI_DOSES },
  triathlon_ironman: { family: "triathlon_ironman", ciScenario: "v320 Ironman + rôles V3 V402 (refusé par le solveur borné)", independentScientificReview: false,
    ids: uniq([...TRI_COMMON, "V3P_BIKE_038", "V3P_BIKE_081", "V3P_SWIM_194", ...TRI_ROLE, "V3P_BIKE_180", ...STRENGTH]), doses: TRI_DOSES },
};

/** Empreinte du contenu courant de la bibliothèque pour un pool. */
export async function computePoolFingerprint(ids: readonly string[]): Promise<string | null> {
  const rows: Array<[string, string]> = [];
  for (const id of [...ids].sort()) { const w = findSource(id); if (!w) return null; rows.push([id, fingerprintV3SportingSource(w)]); }
  return sha256Hex(`tfcl.det.family-pool.v1\n${canonicalJson(rows)}`);
}

/** Empreintes figées lors de la revue du pool (recalculées par `familySourcePools.test.ts`). */
export const PINNED_POOL_FINGERPRINTS: Record<CoachFamilyKey, string> = {
  marathon: "506ef5194a2359d26859b3df4edde2ef1a257ddfc76c75394e9ea4fdf62e2580",
  semi_marathon: "54e2bf2c8f4acef04e7b20729ccb2d63601cc6a8610931d9cf7f02a069fc5695",
  triathlon_703: "106505b06e0a0a71501c3101bb9d0958f33e9d997efe6c3cbe04f94be05b0535",
  triathlon_ironman: "99cec932df53d3125222ba82cc3ae91880d70623bc86c703db7fc79e06a558da",
};

export function familySourcePool(family: CoachFamilyKey): FamilySourcePool {
  return { ...POOLS_RAW[family], pinnedFingerprint: PINNED_POOL_FINGERPRINTS[family] };
}

/** Vérifie que la bibliothèque courante correspond exactement au pool revu. */
export async function poolLibraryProblems(pool: FamilySourcePool): Promise<string[]> {
  const fp = await computePoolFingerprint(pool.ids);
  if (!fp) return [`bibliothèque : une source du pool ${pool.family} est absente du catalogue courant`];
  if (fp !== pool.pinnedFingerprint) return [`bibliothèque : le pool de séances ${pool.family} a changé depuis sa revue (empreinte différente) — nouvelle revue du pool requise (administration de la bibliothèque)`];
  return [];
}

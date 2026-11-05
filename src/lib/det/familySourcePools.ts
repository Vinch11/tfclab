import {evaluateV3Workout} from '../../../scripts/library-v3/catalogueRuntime';
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
const TRAIL_RUN = n('V3P_RUN_', ['003','031','032','035','038','084','085','086','089','092','014','016','025','028','033','066','068','087','090','101','102','103','104','105','125','130','136','137','139','167','168','169']);
const TRAIL_OTHER = [...n('V3P_BIKE_', ['001','013','048','049','092','105']),...Array.from({length:20},(_,i)=>`V3P_STRENGTH_${101+i}`)];
const trailPool=(family:CoachFamilyKey,threshold:boolean):Omit<FamilySourcePool,'pinnedFingerprint'>=>({family,ciScenario:'V360 terrain/history/source-bound contract',ids:[...TRAIL_RUN.filter(id=>!['003','031','032','035','038','084','085','086','089','092'].some(x=>id.endsWith(x))||(evaluateV3Workout(findSource(id)!).minutes??Infinity)<=(family==='trail_short'?129:family==='trail_mountain'?157:190)).filter(id=>threshold?!['167','168','169'].some(x=>id.endsWith(x)):!['136','137','139'].some(x=>id.endsWith(x))),...TRAIL_OTHER],doses:threshold?{V3P_RUN_136:{targetDurationMin:51,allowWorksetChange:true}}:{},independentScientificReview:false});
const POOLS_RAW: Record<CoachFamilyKey, Omit<FamilySourcePool, "pinnedFingerprint">> = {
  trail_short:trailPool('trail_short',false),
  trail_mountain:trailPool('trail_mountain',true),
  trail_ultra:{...trailPool('trail_ultra',true),doses:{V3P_RUN_136:{targetDurationMin:51,allowWorksetChange:true},V3P_RUN_085:{targetDurationMin:190,allowWorksetChange:true}}},
  '10k': { family: '10k', ciScenario: 'v358 strict 10 km 8/10/12 weeks (7 h) + reviewed multi-event recovery sources V406', independentScientificReview: false,
    ids: uniq([...RUN_BASE, ...RUN_TAPER, ...CROSS_BIKE, ...STRENGTH, ...n('V3P_RUN_', ['018','073','074','075','095','136','102','104','202'])]),
    doses: { V3P_RUN_136: { targetDurationMin: 51, allowWorksetChange: true }, V3P_RUN_001: { targetDurationMin: 28 } } },
  marathon: { family: "marathon", ciScenario: "v351–v357 marathon route + V406 multi-event 40 weeks", independentScientificReview: false,
    ids: uniq([...RUN_BASE, ...RUN_TAPER, "V3P_RUN_136", "V3P_RUN_094", "V3P_RUN_102", "V3P_RUN_104", "V3P_RUN_202", ...STRENGTH, ...CROSS_BIKE]),
    doses: { V3P_RUN_136: { targetDurationMin: 51, allowWorksetChange: true }, V3P_RUN_094: { targetDurationMin: 28, allowWorksetChange: true },
      V3P_RUN_001: { targetDurationMin: 28 }, V3P_RUN_155: { targetDurationMin: 28, allowWorksetChange: true } } },
  semi_marathon: { family: "semi_marathon", ciScenario: "v332 semi + affûtage étendu V402 + V406 10 km B → semi A", independentScientificReview: false,
    ids: uniq([...RUN_BASE, ...RUN_TAPER, ...CROSS_BIKE, ...STRENGTH, ...n("V3P_RUN_", ["102","104","136","202"])]),
    doses: { V3P_RUN_160: { targetDurationMin: 25, allowWorksetChange: true }, V3P_RUN_136: { targetDurationMin: 51, allowWorksetChange: true }, V3P_RUN_001: { targetDurationMin: 28 } } },
  triathlon_703: { family: "triathlon_703", ciScenario: "v320 70.3 + rôles V3 V402", independentScientificReview: false,
    ids: uniq([...TRI_COMMON, "V3P_BIKE_012", "V3P_BIKE_084", "V3P_SWIM_199", ...TRI_ROLE, "V3P_BIKE_185", "V3P_RUN_165", ...STRENGTH]), doses: TRI_DOSES },
  triathlon_ironman: { family: "triathlon_ironman", ciScenario: "v320 Ironman + rôles V3 V402 + composition IM V404 (revue individuelle requise)", independentScientificReview: false,
    ids: uniq([...TRI_COMMON, "V3P_BIKE_038", "V3P_BIKE_081", "V3P_SWIM_194", ...TRI_ROLE, "V3P_BIKE_180", ...STRENGTH]),
    // Existing endurance source: 15 min warmup + 125 min under LT1 + 10 min
    // cooldown, within its declared 96–144 min main-block range. The normal
    // app's moderate-risk IM profile requires a 150 min long-bike minimum;
    // the historical high-risk 139 min review cannot satisfy that contract.
    doses: { ...TRI_DOSES, V3P_BIKE_016: { targetDurationMin: 150 } } },
};

/** Empreinte du contenu courant de la bibliothèque pour un pool. */
export async function computePoolFingerprint(ids: readonly string[]): Promise<string | null> {
  const rows: Array<[string, string]> = [];
  for (const id of [...ids].sort()) { const w = findSource(id); if (!w) return null; rows.push([id, fingerprintV3SportingSource(w)]); }
  return sha256Hex(`tfcl.det.family-pool.v1\n${canonicalJson(rows)}`);
}

/** Empreintes figées lors de la revue du pool (recalculées par `familySourcePools.test.ts`). */
export const PINNED_POOL_FINGERPRINTS: Record<CoachFamilyKey, string> = {
  trail_short:'1bb681a3b63b82a747e46c9e4fc3877049156125eb800774eee9ed3edf8b5e9c',trail_mountain:'10babddc10605e6982c84ffe5ff3b6253034433475046adfdabacfd6015de4e3',trail_ultra:'f7d55c4b3010e9de08b51c9322ba367fce27be21feb0139cb8afe4068a097f26',
  '10k': "ffdf63ced9d92dd535df3a2563a26984c7c6da07be8e74dead6e9e05cbb19575",
  marathon: "1457c1388a6e66956c88b535a43a1738fdc6d8e0bc22f746eab53c472f4031a9",
  semi_marathon: "c82ac4baf3b66fd9d623fe966f86ffe3f8ebc5c10c2c5e232007b9a7a53db836",
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

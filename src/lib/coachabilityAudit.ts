/**
 * Coachability Audit — TFCL™
 *
 * Calcule un score 0-100 indiquant à quel point on peut se fier au moteur
 * pour coacher un athlète sur un objectif donné, en fonction de la
 * fraîcheur et de la qualité des données disponibles.
 *
 * Score par objectif (run/trail/bike/tri/70.3/IM) car les exigences de données
 * diffèrent selon la discipline et la distance.
 */

export type CoachabilityObjective =
  | "run_short"      // 5/10/20km, semi
  | "run_marathon"
  | "trail_short"    // <30km
  | "trail_mountain" // 30-60km montagne
  | "trail_ultra"    // >60km
  | "tri_703"
  | "tri_im"
  | "bike";

export interface CoachabilityCriterion {
  id: string;
  label: string;
  weight: number;          // poids dans le score final
  score: number;           // 0-100
  status: "ok" | "partial" | "missing" | "stale";
  detail: string;          // explication concrète
  fix?: string;            // action pour améliorer
}

export interface CoachabilityReport {
  objective: CoachabilityObjective;
  objectiveLabel: string;
  score: number;                   // 0-100 final pondéré
  reliability: "high" | "medium" | "low" | "insufficient";
  verdict: string;                 // résumé 1 phrase
  criteria: CoachabilityCriterion[];
  topGaps: string[];               // top 3 manques à combler
}

type SnapshotLike = {
  date?: string;
  sport_main?: string | null;
  // bike
  ftp?: number | null;
  pmax_5s?: number | null;
  map5min_w?: number | null;
  p30s_w?: number | null;
  p60s_w?: number | null;
  weight_kg?: number | null;
  // metabo
  vo2max?: number | null;
  vlamax?: number | null;
  vlamax_run?: number | null;
  vlamax_source?: string | null;
  vlamax_protocol?: string | null;
  // run
  vma?: number | null;
  pace_threshold_sec_per_km?: number | null;
  sprint_15s_distance?: number | null;
  running_power_threshold?: number | null;
  // chronos
  time_5k_sec?: number | null;
  time_5k_date?: string | null;
  time_10k_sec?: number | null;
  time_10k_date?: string | null;
  time_20k_sec?: number | null;
  time_20k_date?: string | null;
  time_half_sec?: number | null;
  time_half_date?: string | null;
  time_marathon_sec?: number | null;
  time_marathon_date?: string | null;
  // durabilité / charge
  tte_observed_min?: number | null;
  tte_mode?: string | null;
  tss_7d?: number | null;
  run_hr_drift_pct?: number | null;
  run_duration_min?: number | null;
  // global
  confidence?: number | null;
  fc_max?: number | null;
};

const OBJECTIVE_LABELS: Record<CoachabilityObjective, string> = {
  run_short: "Course route 5/10/20km / Semi",
  run_marathon: "Marathon",
  trail_short: "Trail court (<30km)",
  trail_mountain: "Trail montagne 30-60km",
  trail_ultra: "Ultra (>60km)",
  tri_703: "Ironman 70.3",
  tri_im: "Ironman",
  bike: "Cyclisme route",
};

/**
 * Mappe l'objectif texte d'un athlète vers un objectif coachability.
 */
export function inferObjective(goal?: string | null): CoachabilityObjective {
  const g = (goal ?? "").toLowerCase();
  if (g === "marathon") return "run_marathon";
  if (g === "im") return "tri_im";
  if (g === "703") return "tri_703";
  if (g.includes("ultra") || g.includes("100")) return "trail_ultra";
  if (g.startsWith("trail")) {
    if (g.includes("mont") || g.includes("40") || g.includes("50") || g.includes("60")) return "trail_mountain";
    return "trail_short";
  }
  if (["semi", "5k", "10k", "20k", "starttorun"].includes(g)) return "run_short";
  if (g.includes("bike") || g.includes("cyclo") || g.includes("velo")) return "bike";
  return "run_short";
}

/**
 * Fraîcheur d'une donnée datée → score 0-100.
 * <30j: 100, <60j: 80, <90j: 55, <180j: 30, sinon 10
 */
function freshnessScore(dateIso?: string | null): number {
  if (!dateIso) return 0;
  const d = new Date(dateIso).getTime();
  if (!Number.isFinite(d)) return 0;
  const days = (Date.now() - d) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 100;
  if (days <= 60) return 80;
  if (days <= 90) return 55;
  if (days <= 180) return 30;
  return 10;
}

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function statusFromScore(s: number): CoachabilityCriterion["status"] {
  if (s >= 80) return "ok";
  if (s >= 50) return "partial";
  if (s > 10) return "stale";
  return "missing";
}

/**
 * Critères communs à tous les objectifs.
 */
function commonCriteria(snap: SnapshotLike): CoachabilityCriterion[] {
  const out: CoachabilityCriterion[] = [];
  const snapAge = freshnessScore(snap.date);
  out.push({
    id: "snapshot_freshness",
    label: "Fraîcheur du snapshot physiologique",
    weight: 15,
    score: snapAge,
    status: statusFromScore(snapAge),
    detail: snap.date
      ? `Dernier snapshot du ${snap.date} (${Math.round((Date.now() - new Date(snap.date).getTime()) / 86_400_000)}j).`
      : "Aucun snapshot disponible.",
    fix: snapAge < 80 ? "Créer un nouveau snapshot pour rafraîchir le profil physiologique." : undefined,
  });

  const tss = num(snap.tss_7d);
  out.push({
    id: "training_load",
    label: "Charge d'entraînement (TSS 7j)",
    weight: 8,
    score: tss && tss > 0 ? (tss > 200 ? 100 : 60 + tss * 0.2) : 0,
    status: tss && tss > 0 ? statusFromScore(tss > 200 ? 100 : 60 + tss * 0.2) : "missing",
    detail: tss && tss > 0 ? `TSS 7j = ${Math.round(tss)}.` : "Charge 7j absente — sync activités probablement manquante.",
    fix: !tss ? "Connecter Garmin/Strava ou importer des FIT pour suivre la charge." : undefined,
  });

  const conf = num(snap.confidence);
  out.push({
    id: "global_confidence",
    label: "Confiance globale du moteur",
    weight: 7,
    score: conf !== null ? Math.round(conf * 100) : 50,
    status: conf !== null ? statusFromScore(conf * 100) : "partial",
    detail: conf !== null ? `Le moteur s'auto-évalue à ${Math.round(conf * 100)}% de confiance.` : "Pas d'auto-évaluation disponible.",
  });

  return out;
}

/**
 * Critères bike/triathlon : FTP, MAP, Pmax 5s, VLamax bike.
 */
function bikeCriteria(snap: SnapshotLike, weight: number): CoachabilityCriterion[] {
  const ftp = num(snap.ftp);
  const map = num(snap.map5min_w);
  const pmax = num(snap.pmax_5s);
  const vla = num(snap.vlamax);

  const ftpScore = ftp ? 100 : 0;
  const mapScore = map ? 100 : 50;
  const pmaxScore = pmax ? 100 : 30;
  const vlaScore = vla
    ? snap.vlamax_source === "lab" ? 100
    : snap.vlamax_source === "sprint" ? 85
    : 60
    : 0;

  return [
    { id: "bike_ftp", label: "FTP / seuil vélo", weight: weight * 0.30, score: ftpScore,
      status: statusFromScore(ftpScore),
      detail: ftp ? `FTP = ${ftp}W.` : "FTP manquant — pilier pour zones, NP, scénarios race.",
      fix: !ftp ? "Test 20min, ramp ou CP via courbe de puissance." : undefined },
    { id: "bike_map", label: "MAP 5 min", weight: weight * 0.20, score: mapScore,
      status: statusFromScore(mapScore),
      detail: map ? `MAP = ${map}W.` : "MAP 5min absent — affaiblit la modélisation Mader inverse.",
      fix: !map ? "Test 5min max sur home-trainer." : undefined },
    { id: "bike_pmax", label: "Pmax 5s (sprint)", weight: weight * 0.20, score: pmaxScore,
      status: statusFromScore(pmaxScore),
      detail: pmax ? `Pmax 5s = ${pmax}W.` : "Sprint 5s absent — confiance VLamax plafonnée à 0.65.",
      fix: !pmax ? "Sprint 5s max départ debout, capteur calibré." : undefined },
    { id: "bike_vlamax", label: "VLamax vélo", weight: weight * 0.30, score: vlaScore,
      status: statusFromScore(vlaScore),
      detail: vla
        ? `VLamax = ${vla.toFixed(2)} mmol/L/s (source: ${snap.vlamax_source ?? "estimée"}).`
        : "VLamax vélo non estimée.",
      fix: !vla || snap.vlamax_source !== "lab" && snap.vlamax_source !== "sprint"
        ? "Sprint 15s terrain (gratuit) ou test labo lactate."
        : undefined },
  ];
}

/**
 * Critères run : VMA, pace seuil, VLamax run, sprint 15s, chronos récents.
 */
function runCriteria(
  snap: SnapshotLike,
  weight: number,
  needMarathonChrono: boolean
): CoachabilityCriterion[] {
  const vma = num(snap.vma);
  const pace = num(snap.pace_threshold_sec_per_km);
  const vlaRun = num(snap.vlamax_run);
  const sprint = num(snap.sprint_15s_distance);

  // Best chrono parmi 5/10/20/semi/marathon
  const chronos = [
    { d: 5, sec: snap.time_5k_sec, date: snap.time_5k_date },
    { d: 10, sec: snap.time_10k_sec, date: snap.time_10k_date },
    { d: 20, sec: snap.time_20k_sec, date: snap.time_20k_date },
    { d: 21.1, sec: snap.time_half_sec, date: snap.time_half_date },
    { d: 42.2, sec: snap.time_marathon_sec, date: snap.time_marathon_date },
  ].filter((c) => c.sec && c.sec > 0);

  const bestChronoFresh = chronos.length
    ? Math.max(...chronos.map((c) => freshnessScore(c.date)))
    : 0;
  const hasMarathonOrSemi = chronos.some((c) => c.d >= 21);

  const vmaScore = vma ? 100 : pace ? 60 : 20;
  const paceScore = pace ? 100 : vma ? 50 : 0;
  const vlaScore = vlaRun
    ? snap.vlamax_source === "lab" ? 100
    : sprint ? 85 : 60
    : sprint ? 50 : 0;

  let chronoScore = bestChronoFresh;
  if (needMarathonChrono && !hasMarathonOrSemi) chronoScore = Math.min(chronoScore, 30);

  return [
    { id: "run_vma", label: "VMA / vVO2max", weight: weight * 0.25, score: vmaScore,
      status: statusFromScore(vmaScore),
      detail: vma ? `VMA = ${vma} km/h.` : "VMA absente — sera dérivée des chronos (moins précis).",
      fix: !vma ? "Test VMA terrain (Léger-Boucher, 1500m, 6min) ou ramp tapis." : undefined },
    { id: "run_pace_threshold", label: "Allure seuil", weight: weight * 0.20, score: paceScore,
      status: statusFromScore(paceScore),
      detail: pace ? `Allure seuil = ${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km.` : "Pace seuil non renseigné — extrapolé via Daniels VDOT.",
      fix: !pace ? "Test seuil 30min ou 2x20min terrain." : undefined },
    { id: "run_vlamax", label: "VLamax course", weight: weight * 0.20, score: vlaScore,
      status: statusFromScore(vlaScore),
      detail: vlaRun
        ? `VLamax run = ${vlaRun.toFixed(2)} mmol/L/s.`
        : sprint ? `Sprint 15s = ${sprint}m mais VLamax non calculée.`
        : "Aucune donnée glycolytique course.",
      fix: !sprint ? "Sprint 15s terrain départ lancé (mesure distance ou GPS)." : undefined },
    { id: "run_chronos", label: needMarathonChrono ? "Chronos récents (semi/marathon)" : "Chronos course récents", weight: weight * 0.35, score: chronoScore,
      status: statusFromScore(chronoScore),
      detail: chronos.length
        ? `${chronos.length} chrono${chronos.length > 1 ? "s" : ""} disponible${chronos.length > 1 ? "s" : ""}, meilleur fraîcheur ${bestChronoFresh}/100.`
        : "Aucun chrono de course saisi.",
      fix: chronoScore < 70
        ? needMarathonChrono
          ? "Saisir un chrono semi ou marathon récent (<3 mois)."
          : "Saisir un chrono 10/20km récent (<3 mois)."
        : undefined },
  ];
}

/**
 * Critères durabilité (long & trail).
 */
function durabilityCriteria(snap: SnapshotLike, weight: number): CoachabilityCriterion[] {
  const tte = num(snap.tte_observed_min);
  const drift = num(snap.run_hr_drift_pct);
  const dur = num(snap.run_duration_min);

  const tteScore = tte ? (tte > 40 ? 100 : 60) : 30;
  const driftScore = drift !== null && dur && dur > 60 ? 100 : drift !== null ? 60 : 20;

  return [
    { id: "tte_observed", label: "TTE (Time To Exhaustion)", weight: weight * 0.55, score: tteScore,
      status: statusFromScore(tteScore),
      detail: tte ? `TTE observé = ${tte}min.` : "TTE non mesuré — durabilité estimée via TSS uniquement.",
      fix: !tte ? "Effort soutenu @ FTP ou seuil jusqu'à exhaustion (cible ≥40min)." : undefined },
    { id: "drift", label: "Dérive cardiaque longue (FIT)", weight: weight * 0.45, score: driftScore,
      status: statusFromScore(driftScore),
      detail: drift !== null && dur ? `Drift ${drift.toFixed(1)}% sur ${dur}min.` : "Aucune sortie longue analysée.",
      fix: driftScore < 60 ? "Importer un FIT ≥ 90min (vélo ou course Z2 stable)." : undefined },
  ];
}

/**
 * Calcule le rapport de coachabilité pour un objectif donné.
 */
export function computeCoachability(
  snapshot: SnapshotLike | null,
  objective: CoachabilityObjective
): CoachabilityReport {
  const label = OBJECTIVE_LABELS[objective];

  if (!snapshot) {
    return {
      objective,
      objectiveLabel: label,
      score: 0,
      reliability: "insufficient",
      verdict: "Aucun snapshot disponible — impossible de coacher avec fiabilité.",
      criteria: [],
      topGaps: ["Créer un premier snapshot physiologique."],
    };
  }

  const criteria: CoachabilityCriterion[] = [...commonCriteria(snapshot)];

  switch (objective) {
    case "bike":
      criteria.push(...bikeCriteria(snapshot, 50));
      criteria.push(...durabilityCriteria(snapshot, 20));
      break;
    case "tri_703":
      criteria.push(...bikeCriteria(snapshot, 35));
      criteria.push(...runCriteria(snapshot, 25, false));
      criteria.push(...durabilityCriteria(snapshot, 15));
      break;
    case "tri_im":
      criteria.push(...bikeCriteria(snapshot, 30));
      criteria.push(...runCriteria(snapshot, 25, true));
      criteria.push(...durabilityCriteria(snapshot, 25));
      break;
    case "run_short":
      criteria.push(...runCriteria(snapshot, 65, false));
      criteria.push(...durabilityCriteria(snapshot, 5));
      break;
    case "run_marathon":
      criteria.push(...runCriteria(snapshot, 50, true));
      criteria.push(...durabilityCriteria(snapshot, 20));
      break;
    case "trail_short":
      criteria.push(...runCriteria(snapshot, 55, false));
      criteria.push(...durabilityCriteria(snapshot, 15));
      break;
    case "trail_mountain":
      criteria.push(...runCriteria(snapshot, 40, true));
      criteria.push(...durabilityCriteria(snapshot, 30));
      break;
    case "trail_ultra":
      criteria.push(...runCriteria(snapshot, 30, true));
      criteria.push(...durabilityCriteria(snapshot, 40));
      break;
  }

  // Score pondéré
  const totalWeight = criteria.reduce((acc, c) => acc + c.weight, 0);
  const weighted = criteria.reduce((acc, c) => acc + c.score * c.weight, 0);
  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;

  let reliability: CoachabilityReport["reliability"];
  if (score >= 80) reliability = "high";
  else if (score >= 60) reliability = "medium";
  else if (score >= 35) reliability = "low";
  else reliability = "insufficient";

  // Top gaps : 3 critères avec le plus gros impact (poids × (100-score))
  const topGaps = [...criteria]
    .map((c) => ({ c, impact: c.weight * (100 - c.score) }))
    .filter((x) => x.impact > 50 && x.c.fix)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((x) => x.c.fix!)
    .filter(Boolean);

  const verdict =
    reliability === "high"
      ? `Données solides — vous pouvez coacher avec confiance sur ${label}.`
      : reliability === "medium"
      ? `Données correctes mais perfectibles. Le coaching reste fiable, croisez avec votre œil terrain.`
      : reliability === "low"
      ? `Trop de données manquantes. Le moteur produit des estimations à manier avec prudence.`
      : `Données insuffisantes. Récolter des mesures avant de bâtir une stratégie.`;

  return {
    objective,
    objectiveLabel: label,
    score,
    reliability,
    verdict,
    criteria,
    topGaps,
  };
}

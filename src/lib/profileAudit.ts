/**
 * Profile Audit Engine — TFCL™
 * 
 * Détecte les incohérences de données dans un snapshot physiologique
 * et explique pourquoi le moteur V2 produit certains résultats surprenants.
 * 
 * Inspiré de la méthode d'analyse manuelle :
 * "Ce n'est pas un bug mais le résultat de problèmes de données".
 */

export type AuditSeverity = "critical" | "warning" | "info" | "ok";

export interface AuditFinding {
  id: string;
  severity: AuditSeverity;
  title: string;
  detail: string;       // explication concrète (chiffres + comparaison à la norme)
  consequence: string;  // ce que ça fait au moteur
  fix: string;          // action recommandée pour le coach
  fields: string[];     // colonnes snapshot concernées
}

export interface ProfileAuditReport {
  athleteName: string;
  snapshotDate: string;
  overallVerdict: "clean" | "minor" | "moderate" | "severe";
  summary: string;        // résumé 1 phrase ("ce n'est pas un bug, c'est ...")
  findings: AuditFinding[];
  stats: {
    critical: number;
    warning: number;
    info: number;
  };
}

// Type souple — on accepte n'importe quel snapshot avec ces champs optionnels
type SnapshotLike = {
  ftp?: number | null;
  pmax_5s?: number | null;
  map5min_w?: number | null;
  p30s_w?: number | null;
  p60s_w?: number | null;
  weight_kg?: number | null;
  vo2max?: number | null;
  vlamax?: number | null;
  vlamax_run?: number | null;
  vlamax_source?: string | null;
  tte_observed_min?: number | null;
  tte_mode?: string | null;
  tss_7d?: number | null;
  vma?: number | null;
  css?: number | null;
  confidence?: number | null;
  sport_main?: string | null;
  fc_max?: number | null;
  date?: string;
};

/**
 * Audit principal : exécute toutes les règles et retourne un rapport
 */
export function auditProfile(
  snapshot: SnapshotLike,
  athleteName = "Athlète",
  athleteGoal?: string | null
): ProfileAuditReport {
  const findings: AuditFinding[] = [];

  const ftp = num(snapshot.ftp);
  const pmax = num(snapshot.pmax_5s);
  const map = num(snapshot.map5min_w);
  const p30 = num(snapshot.p30s_w);
  const p60 = num(snapshot.p60s_w);
  const weight = num(snapshot.weight_kg);
  const vo2 = num(snapshot.vo2max);
  // Sport-aware: profils CAP purs → vlamax_run prime sur vlamax (bike)
  const isRunSport = sport === "run" || sport === "cap";
  const vlamax = isRunSport
    ? (num(snapshot.vlamax_run) ?? num(snapshot.vlamax))
    : num(snapshot.vlamax);
  const tte = num(snapshot.tte_observed_min);
  const tss7d = num(snapshot.tss_7d);
  const conf = num(snapshot.confidence);
  const sport = (snapshot.sport_main ?? "bike").toLowerCase();
  const sportNorm = sport === "velo" ? "bike" : sport;
  const isBikeSport = sport === "bike" || sport === "both" || sport === "velo";

  // ─── RÈGLE 0: Cohérence sport_main vs objectif athlète ──────────────
  if (athleteGoal) {
    const g = athleteGoal.toLowerCase();
    const isRunGoal = ["semi", "marathon", "starttorun", "5k", "10k"].includes(g) || g.startsWith("trail") || g.includes("ultra");
    const isTriGoal = g === "im" || g === "703";
    if (isRunGoal && sportNorm !== "run") {
      findings.push({
        id: "sport_goal_mismatch",
        severity: "critical",
        title: "Sport principal incohérent avec l'objectif",
        detail: `Objectif = ${athleteGoal} (course) mais sport_main = "${snapshot.sport_main ?? "bike (défaut)"}". Le dashboard route vers le pipeline ${sportNorm} qui ignore VMA, pace seuil, sprint 15s et puissance course.`,
        consequence: "VLamax, FatMax et zones affichés divergent des valeurs CAP testing (ex: dashboard 0.44 vs CAP 0.56). Diagnostic et plan IA partent sur le mauvais profil métabolique.",
        fix: `Passer sport_main du snapshot à "run". Tous les futurs snapshots seront auto-déduits depuis l'objectif.`,
        fields: ["sport_main"],
      });
    } else if (isTriGoal && sportNorm !== "tri" && sportNorm !== "bike") {
      findings.push({
        id: "sport_goal_mismatch",
        severity: "warning",
        title: "Sport principal possiblement incohérent",
        detail: `Objectif = ${athleteGoal} (triathlon) mais sport_main = "${snapshot.sport_main}".`,
        consequence: "Pipeline diagnostic peut ignorer une partie des données disciplines.",
        fix: `Pour un triathlète, sport_main = "tri" ou "bike" selon la discipline limitante.`,
        fields: ["sport_main"],
      });
    }
  }

  // ─── RÈGLE 1: MAP ≤ FTP (incohérence majeure) ──────────────
  if (isBikeSport && ftp && map) {
    const ratio = ftp / map;
    if (map <= ftp) {
      findings.push({
        id: "map_below_ftp",
        severity: "critical",
        title: "MAP 5min inférieur ou égal au FTP",
        detail: `MAP = ${map}W mais FTP = ${ftp}W (ratio FTP/MAP = ${ratio.toFixed(2)}). Physiologiquement, le MAP doit être ~125-140% du FTP.`,
        consequence: "Le moteur Mader-First ne peut pas calculer correctement la VLamax et le profil métabolique. Le score G s'effondre.",
        fix: `Refaire un test 5min max ou corriger le MAP. Valeur attendue ≈ ${Math.round(ftp * 1.30)}-${Math.round(ftp * 1.40)}W.`,
        fields: ["ftp", "map5min_w"],
      });
    } else if (ratio > 0.88) {
      findings.push({
        id: "map_too_close_ftp",
        severity: "warning",
        title: "FTP très proche du MAP",
        detail: `FTP/MAP = ${ratio.toFixed(2)} (${ftp}W / ${map}W). La fourchette physiologique typique est 0.72-0.85.`,
        consequence: "Le moteur classe l'athlète comme 'profil hybride extrême' et tire la VLamax vers le bas.",
        fix: "Vérifier soit que le FTP n'est pas surestimé (refaire un test 20min/ramp), soit que le MAP n'est pas sous-estimé.",
        fields: ["ftp", "map5min_w"],
      });
    }
  }

  // ─── RÈGLE 2: Pmax/FTP hors range physiologique ──────────────
  if (isBikeSport && ftp && pmax) {
    const r = pmax / ftp;
    if (r < 1.8) {
      findings.push({
        id: "pmax_ratio_low",
        severity: "warning",
        title: "Ratio Pmax/FTP très bas",
        detail: `Pmax 5s / FTP = ${r.toFixed(2)} (${pmax}W / ${ftp}W). La fourchette typique est 2.5-3.5 chez un athlète entraîné.`,
        consequence: "Le composant 'capacité anaérobie' du score VLamax tombe à 0 → estime un profil ultra-endurant peut-être à tort.",
        fix: "Refaire un sprint maximal 5s sur home-trainer (force relâchée, démarrage debout). Vérifier la calibration capteur.",
        fields: ["pmax_5s", "ftp"],
      });
    } else if (r > 4.5) {
      findings.push({
        id: "pmax_ratio_extreme",
        severity: "warning",
        title: "Ratio Pmax/FTP extrême",
        detail: `Pmax 5s / FTP = ${r.toFixed(2)}. Au-delà de 4.0, suspecter une erreur de mesure ou un FTP très sous-estimé.`,
        consequence: "Le moteur peut surestimer la VLamax et classer l'athlète sprinter alors qu'il est endurant.",
        fix: "Vérifier la calibration du capteur de puissance et la cohérence du FTP courant.",
        fields: ["pmax_5s", "ftp"],
      });
    }
  }

  // ─── RÈGLE 3: VLamax au plancher avec confiance basse ──────────────
  if (vlamax !== null && vlamax <= 0.23 && (conf === null || conf < 0.7)) {
    findings.push({
      id: "vlamax_floor",
      severity: "warning",
      title: "VLamax bloquée au plancher physiologique",
      detail: `VLamax = ${vlamax.toFixed(2)} mmol/L/s, confiance ${conf !== null ? Math.round(conf * 100) + "%" : "inconnue"}. La borne minimale du moteur est 0.20.`,
      consequence: "La valeur n'est probablement pas réelle : le moteur a clampé au plancher faute de données suffisantes ou cohérentes.",
      fix: "Faire un test sprint 15s terrain ou un test labo lactate pour ancrer la vraie valeur, ou corriger les données d'entrée incohérentes (MAP, Pmax, FTP).",
      fields: ["vlamax", "pmax_5s", "map5min_w"],
    });
  }

  // ─── RÈGLE 4: VO2max élevé vs FTP/kg modeste (déséquilibre) ──────────────
  if (isBikeSport && vo2 && ftp && weight) {
    const ftpKg = ftp / weight;
    if (vo2 >= 55 && ftpKg < 3.8) {
      findings.push({
        id: "vo2_ftp_imbalance",
        severity: "info",
        title: "VO2max élevé mais FTP/kg modeste",
        detail: `VO2max ${vo2} ml/kg/min mais FTP/kg = ${ftpKg.toFixed(1)} W/kg. Un VO2max ≥ 55 supporte typiquement un FTP/kg ≥ 4.0.`,
        consequence: "Le moteur Mader inverse en déduit une VLamax très basse (faible contribution glycolytique mécaniquement).",
        fix: "Soit le VO2max est surestimé (auto-déclaré ?), soit le FTP est sous-évalué — refaire un test seuil récent.",
        fields: ["vo2max", "ftp", "weight_kg"],
      });
    }
  }

  // ─── RÈGLE 5: Pmax 5s manquant (impacte fortement V2) ──────────────
  if (isBikeSport && !pmax && ftp) {
    findings.push({
      id: "pmax_missing",
      severity: "warning",
      title: "Sprint 5s max non renseigné",
      detail: "Aucune valeur Pmax 5s. Le moteur utilise un ratio par défaut prudent (1.9), ce qui appauvrit l'estimation VLamax.",
      consequence: "Confiance VLamax plafonnée à 0.65, fourchette d'incertitude ±0.10.",
      fix: "Ajouter un sprint 5s récent (home-trainer ou sprint terrain). Ajoute +15 points de confiance au moteur.",
      fields: ["pmax_5s"],
    });
  }

  // ─── RÈGLE 6: TTE manquant ──────────────
  if (isBikeSport && !tte && ftp) {
    findings.push({
      id: "tte_missing",
      severity: "warning",
      title: "TTE non observé",
      detail: "Aucun Time To Exhaustion mesuré. Le moteur estime via TSS 7j, ce qui dégrade la précision durabilité.",
      consequence: "Le composant durabilité est forfaitaire → impact sur le profil métabolique et la stratégie pacing.",
      fix: "Faire un test TTE (effort soutenu @ FTP jusqu'à exhaustion, target ≥ 40min) et l'enregistrer comme observé.",
      fields: ["tte_observed_min", "tte_mode"],
    });
  }

  // ─── RÈGLE 7: Pas de VLamax mesurée + pas de test ──────────────
  if (!vlamax && !snapshot.vlamax_source) {
    findings.push({
      id: "vlamax_no_source",
      severity: "info",
      title: "Aucune source VLamax (labo ni terrain)",
      detail: "Le moteur estime via fusion 4-méthodes mais sans ancrage mesuré.",
      consequence: "Confiance plafonnée à 0.70 même si toutes les autres données sont parfaites.",
      fix: "Réaliser un test sprint 15s terrain (gratuit) ou test labo lactate pour passer en mode 'mesuré' (confiance 0.95).",
      fields: ["vlamax", "vlamax_source"],
    });
  }

  // ─── RÈGLE 8: Charge 7j zéro ──────────────
  if (!tss7d || tss7d === 0) {
    findings.push({
      id: "tss_zero",
      severity: "info",
      title: "Charge hebdomadaire (TSS 7j) à zéro",
      detail: "TSS 7j = 0. Soit l'athlète est en arrêt, soit les activités ne sont pas remontées.",
      consequence: "Le moteur ne peut pas calibrer la fatigue ni ajuster les recommandations volume.",
      fix: "Vérifier la sync activités (Garmin/Strava/FIT). Si vrai arrêt, ignorer cette alerte.",
      fields: ["tss_7d"],
    });
  }

  // ─── RÈGLE 9: Cohérence P30s/P60s vs FTP ──────────────
  if (isBikeSport && ftp && p30 && p60) {
    if (p30 <= p60) {
      findings.push({
        id: "p30_below_p60",
        severity: "critical",
        title: "P30s ≤ P60s (impossible)",
        detail: `P30s = ${p30}W mais P60s = ${p60}W. La courbe de puissance doit être strictement décroissante.`,
        consequence: "Erreur de saisie ou de sync. Casse la modélisation CP/W'.",
        fix: "Corriger l'une des deux valeurs. Typiquement P30s ≈ 1.4×FTP, P60s ≈ 1.2×FTP.",
        fields: ["p30s_w", "p60s_w"],
      });
    }
    if (p60 < ftp) {
      findings.push({
        id: "p60_below_ftp",
        severity: "warning",
        title: "P60s inférieur au FTP",
        detail: `P60s = ${p60}W < FTP = ${ftp}W. Une puissance maintenue 1min doit dépasser le FTP (typiquement 110-130%).`,
        consequence: "Suspect un FTP surestimé OU une donnée P60s issue d'un effort non maximal.",
        fix: "Refaire test FTP (ramp ou 20min) et/ou un test P60s max.",
        fields: ["p60s_w", "ftp"],
      });
    }
  }

  // ─── RÈGLE 10: Confiance globale basse ──────────────
  if (conf !== null && conf < 0.5) {
    findings.push({
      id: "global_confidence_low",
      severity: "warning",
      title: "Confiance globale du snapshot très faible",
      detail: `Confiance = ${Math.round(conf * 100)}%. Le moteur signale lui-même qu'il manque de données fiables.`,
      consequence: "Toutes les recommandations en aval (priorités, plan IA, nutrition) héritent de cette incertitude.",
      fix: "Compléter les champs manquants identifiés ci-dessus avant de prendre des décisions stratégiques.",
      fields: ["confidence"],
    });
  }

  // ─── Synthèse ──────────────
  const stats = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  let verdict: ProfileAuditReport["overallVerdict"] = "clean";
  if (stats.critical > 0) verdict = "severe";
  else if (stats.warning >= 2) verdict = "moderate";
  else if (stats.warning >= 1 || stats.info >= 2) verdict = "minor";

  const summary = buildSummary(verdict, stats, findings);

  return {
    athleteName,
    snapshotDate: snapshot.date ?? new Date().toISOString().slice(0, 10),
    overallVerdict: verdict,
    summary,
    findings,
    stats,
  };
}

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n !== 0 ? n : v === 0 ? 0 : null;
}

function buildSummary(
  verdict: ProfileAuditReport["overallVerdict"],
  stats: ProfileAuditReport["stats"],
  findings: AuditFinding[]
): string {
  if (verdict === "clean") {
    return "✅ Le profil est cohérent. Le moteur dispose des données nécessaires pour produire des recommandations fiables.";
  }
  const topCritical = findings.find((f) => f.severity === "critical");
  if (topCritical) {
    return `⚠️ Ce n'est pas un bug, c'est le résultat d'une incohérence majeure dans les données : ${topCritical.title.toLowerCase()}. Le moteur fait ce qu'il peut avec ce qu'on lui donne.`;
  }
  const others = stats.critical + stats.warning;
  return `⚠️ Ce n'est pas un bug, c'est le résultat de ${others} problème${others > 1 ? "s" : ""} de données qui empêche${others > 1 ? "nt" : ""} le moteur de produire un diagnostic optimal.`;
}

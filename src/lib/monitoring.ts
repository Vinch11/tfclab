// =============================================
// SUIVI LONGITUDINAL & ALERTES
// Tendances VLamax / Confiance / SPM
// Détection outliers + dérives
// =============================================

import { Athlete, ObjectifType } from "@/types/athlete";
import { StoredTestResult } from "@/types/testLibrary";
import { Alert, AlertLevel, MonthlyVLamaxData, TrendResult, RefStatus } from "@/types/monitoring";
import { analysePhysiologiqueComplete } from "./physiologicalModel";

// =============================================
// UTILITAIRES STATS
// =============================================

function mean(arr: number[]): number | null {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  if (m === null) return 0;
  const v = arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function monthKey(d: string): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// =============================================
// EXTRACTION TESTS VLAMAX
// =============================================

export function getVLamaxTestsOnly(athlete: Athlete): StoredTestResult[] {
  const tests = athlete.tests || [];
  return tests
    .filter(t => t.type === "VLAMAX" && typeof t.vlamax === "number" && !isNaN(t.vlamax))
    .map(t => ({ ...t, date: t.date || new Date().toISOString() }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// =============================================
// STATUT RÉFÉRENCES
// =============================================

export function getRefStatus(athlete: Athlete): RefStatus {
  const refs = athlete.refs || { fcMax: null, vma: null, ftp: null, css: null };
  const missing: string[] = [];
  
  if (!refs.fcMax) missing.push("FCmax");
  if (!refs.vma) missing.push("VMA");
  if (!refs.ftp) missing.push("FTP");
  // css optionnel
  
  return { refs, missing };
}

// =============================================
// DÉTECTION OUTLIERS
// =============================================

export function detectOutliers(values: number[]): boolean[] {
  if (values.length < 4) return Array(values.length).fill(false);
  
  const m = mean(values);
  const sd = stdev(values);
  
  if (m === null || sd === 0) return Array(values.length).fill(false);
  
  return values.map(v => Math.abs(v - m) > 2.5 * sd);
}

// =============================================
// AGRÉGATION MENSUELLE VLAMAX
// =============================================

export function aggregateMonthlyVLamax(vTests: StoredTestResult[]): MonthlyVLamaxData[] {
  const buckets: Record<string, StoredTestResult[]> = {};
  
  vTests.forEach(t => {
    const k = monthKey(t.date);
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(t);
  });

  return Object.keys(buckets).sort().map(k => {
    const arr = buckets[k];
    let s = 0, w = 0;
    
    arr.forEach(t => {
      const fiab = t.fiabilite ?? 0.5;
      if (t.vlamax !== null) {
        s += t.vlamax * fiab;
        w += fiab;
      }
    });
    
    const v = w > 0 ? s / w : null;
    const fiabs = arr.map(x => (x.fiabilite ?? 0.5) * 100);
    const conf = fiabs.length ? Math.round(fiabs.reduce((a, b) => a + b, 0) / fiabs.length) : 0;
    
    return { month: k, vlamax: v, confPct: conf, n: arr.length };
  });
}

// =============================================
// TENDANCE (SLOPE)
// =============================================

export function computeTrend(series: MonthlyVLamaxData[]): TrendResult {
  const pts = series.filter(x => typeof x.vlamax === "number").slice(-3);
  
  if (pts.length < 2) return { dir: "stable", slope: 0 };

  const first = pts[0].vlamax!;
  const last = pts[pts.length - 1].vlamax!;
  const months = pts.length - 1;
  const slope = (last - first) / months;

  let dir: "up" | "down" | "stable" = "stable";
  if (slope > 0.03) dir = "up";
  else if (slope < -0.03) dir = "down";
  
  return { dir, slope };
}

// =============================================
// ALERTES
// =============================================

export function computeAlerts(athlete: Athlete): Alert[] {
  const alerts: Alert[] = [];

  // Références manquantes
  const ref = getRefStatus(athlete);
  if (ref.missing.length) {
    alerts.push({
      level: "warn",
      title: "Références manquantes",
      detail: `Renseigner: ${ref.missing.join(", ")} (zones & cibles chiffrées).`
    });
  }

  // Tests VLamax
  const vTests = getVLamaxTestsOnly(athlete);
  if (vTests.length === 0) {
    alerts.push({
      level: "info",
      title: "Aucun test VLamax",
      detail: "Faire passer au moins 1 test VLamax (bibliothèque) pour activer le modèle."
    });
    return alerts;
  }

  // Confiance
  const fiabs = vTests.map(t => (t.fiabilite ?? 0.5));
  const conf = Math.round((fiabs.reduce((a, b) => a + b, 0) / fiabs.length) * 100);
  if (conf < 60) {
    alerts.push({
      level: "warn",
      title: "Confiance VLamax faible",
      detail: `Confiance moyenne ${conf}%. Multiplier les tests fiables (vélo sprint 5–10s, protocole strict).`
    });
  }

  // Outliers
  const values = vTests.map(t => t.vlamax!);
  const out = detectOutliers(values);
  const outCount = out.filter(Boolean).length;
  if (outCount) {
    alerts.push({
      level: "warn",
      title: "Tests incohérents (outliers)",
      detail: `${outCount} test(s) divergent fortement. Vérifier protocole, fatigue, capteur, conditions.`
    });
  }

  // Dérive mensuelle
  const monthly = aggregateMonthlyVLamax(vTests);
  const trend = computeTrend(monthly);
  if (trend.dir === "up") {
    alerts.push({
      level: "warn",
      title: "VLamax en hausse",
      detail: `Tendance +${trend.slope.toFixed(2)}/mois. Risque glycolytique ↑ (IM/marathon). Réduire séances B et renforcer A + D pendant 2 semaines.`
    });
  } else if (trend.dir === "down") {
    alerts.push({
      level: "info",
      title: "VLamax en baisse",
      detail: `Tendance ${trend.slope.toFixed(2)}/mois. Si objectif marathon/IM: OK. Si besoin de réserve (fin de course), maintenir 1 séance B légère/7–10j.`
    });
  }

  // Données obsolètes
  const lastDate = vTests[vTests.length - 1].date;
  const days = daysBetween(lastDate, new Date().toISOString());
  if (days > 45) {
    alerts.push({
      level: "info",
      title: "Tests VLamax anciens",
      detail: `Dernier test il y a ${days} jours. Refaire un test pour valider le modèle.`
    });
  }

  return alerts;
}

// =============================================
// RECOMMANDATION BLOC
// =============================================

export function computeBlockRecommendation(athlete: Athlete): string {
  const vTests = getVLamaxTestsOnly(athlete);
  
  if (vTests.length === 0) {
    return "📌 Priorité: réaliser 2 tests VLamax fiables à 7–10 jours d'intervalle (mêmes conditions).";
  }

  const vo2max = athlete.vo2max || 50;
  const physio = analysePhysiologiqueComplete(
    vTests.map(t => ({ nom: t.nom, vlamax: t.vlamax!, fiabilite: t.fiabilite || 0.5 })),
    vo2max,
    athlete.objectif
  );

  if (physio.confiance < 60) {
    return "📌 Priorité: augmenter la fiabilité (répéter les tests, protocole strict, capteur fiable). Ne pas changer agressivement la programmation.";
  }

  if (physio.vlamaxPonderee === null) {
    return "📌 Priorité: compléter tests VLamax.";
  }

  const monthly = aggregateMonthlyVLamax(vTests);
  const trend = computeTrend(monthly);

  if (trend.dir === "up") {
    return "✅ Bloc 14 jours: 70% A (Z2/Z3), 10% B, 10% C, 10% D. Objectif: baisser VLamax et stabiliser endurance.";
  }
  if (trend.dir === "down") {
    return "✅ Bloc 14 jours: 60% A, 15% B (court/qualité), 10% C, 15% D. Objectif: préserver réserve sans compromettre l'aérobie.";
  }

  return "✅ Bloc 14 jours: maintenir équilibre. 60% A, 15–20% B, 10–15% C, 10–15% D selon fatigue.";
}

// =============================================
// COULEURS ALERTES
// =============================================

export function getAlertColor(level: AlertLevel): { bg: string; text: string; icon: string } {
  switch (level) {
    case "error":
      return { bg: "bg-red-500/20", text: "text-red-400", icon: "🚨" };
    case "warn":
      return { bg: "bg-amber-500/20", text: "text-amber-400", icon: "⚠️" };
    case "info":
      return { bg: "bg-blue-500/20", text: "text-blue-400", icon: "ℹ️" };
    default:
      return { bg: "bg-muted/30", text: "text-muted-foreground", icon: "✅" };
  }
}

export function getTrendColor(dir: "up" | "down" | "stable"): { bg: string; text: string; icon: string } {
  switch (dir) {
    case "up":
      return { bg: "bg-red-500/20", text: "text-red-400", icon: "📈" };
    case "down":
      return { bg: "bg-green-500/20", text: "text-green-400", icon: "📉" };
    case "stable":
      return { bg: "bg-blue-500/20", text: "text-blue-400", icon: "➡️" };
    default:
      return { bg: "bg-muted/30", text: "text-muted-foreground", icon: "—" };
  }
}

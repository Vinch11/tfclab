/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PMC Engine — Performance Management Chart (Banister 1991, adapté triathlon/trail)
 *
 * Modèle :
 *   CTL(j) = CTL(j-1) + (TSS(j) - CTL(j-1)) / 42   → Forme (chronique 42j)
 *   ATL(j) = ATL(j-1) + (TSS(j) - ATL(j-1)) / 7    → Fatigue (aigüe 7j)
 *   TSB(j) = CTL(j-1) - ATL(j-1)                   → Fraîcheur (balance)
 *
 * Réf. : Banister EW, Calvert TW (1980, 1991), Coggan & Allen (2010).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type PMCSport = 'velo' | 'cap' | 'natation' | 'renfo' | 'brick';

export type PMCFormZone =
  | 'peak'
  | 'build'
  | 'recovery'
  | 'transition'
  | 'freshness';

export interface PMCDataPoint {
  date: string; // YYYY-MM-DD
  tss: number;
  sport: PMCSport;
}

export interface PMCResult {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
  formZone: PMCFormZone;
  formLabel: string;
  formColor: string;
}

export interface PMCSummary {
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
  trend: 'improving' | 'stable' | 'declining' | 'overreaching';
  raceReadinessScore: number;
  optimalRaceWindow: string;
  warnings: string[];
}

// ─── Zones de forme ────────────────────────────────────────────────────────
const FORM_ZONES: Record<PMCFormZone, { label: string; color: string }> = {
  peak:        { label: 'Pic de forme',            color: '#10b981' }, // vert
  freshness:   { label: 'Fraîcheur',               color: '#06b6d4' }, // cyan
  build:       { label: 'En construction',         color: '#3b82f6' }, // bleu
  recovery:    { label: 'Récupération nécessaire', color: '#f97316' }, // orange
  transition:  { label: 'Surmenage — risque',      color: '#ef4444' }, // rouge
};

function classifyTSB(tsb: number): PMCFormZone {
  if (tsb > 15) return 'peak';
  if (tsb > 5) return 'freshness';
  if (tsb > -10) return 'build';
  if (tsb > -30) return 'recovery';
  return 'transition';
}

// ─── Helpers date ──────────────────────────────────────────────────────────
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}

// ═══════════════════════════════════════════════════════════════════════════
// computePMC — calcule CTL/ATL/TSB jour par jour sur N jours
// ═══════════════════════════════════════════════════════════════════════════
export function computePMC(
  dataPoints: PMCDataPoint[],
  days: number = 90
): PMCResult[] {
  if (!dataPoints || dataPoints.length === 0) return [];

  // Agréger par date
  const tssByDate = new Map<string, number>();
  for (const p of dataPoints) {
    if (!p.date || !Number.isFinite(p.tss)) continue;
    tssByDate.set(p.date, (tssByDate.get(p.date) ?? 0) + p.tss);
  }

  const sortedDates = [...tssByDate.keys()].sort();
  const firstDate = sortedDates[0];
  const today = toISODate(new Date());
  const startDate = addDays(today, -(days - 1));

  // Itérer depuis le premier point pour init CTL/ATL stable, sortir N jours
  const iterStart = firstDate < startDate ? firstDate : startDate;
  const totalDays = daysBetween(iterStart, today) + 1;

  let ctl = 0;
  let atl = 0;
  const allResults: PMCResult[] = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(iterStart, i);
    const tss = tssByDate.get(date) ?? 0;

    const prevCtl = ctl;
    const prevAtl = atl;
    ctl = prevCtl + (tss - prevCtl) / 42;
    atl = prevAtl + (tss - prevAtl) / 7;
    const tsb = prevCtl - prevAtl;

    const zone = classifyTSB(tsb);
    allResults.push({
      date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      tss,
      formZone: zone,
      formLabel: FORM_ZONES[zone].label,
      formColor: FORM_ZONES[zone].color,
    });
  }

  // Ne renvoyer que les N derniers jours
  return allResults.slice(-days);
}

// ═══════════════════════════════════════════════════════════════════════════
// computePMCSummary — analyse les 7 derniers jours
// ═══════════════════════════════════════════════════════════════════════════
export function computePMCSummary(results: PMCResult[]): PMCSummary {
  if (results.length === 0) {
    return {
      currentCTL: 0,
      currentATL: 0,
      currentTSB: 0,
      trend: 'stable',
      raceReadinessScore: 0,
      optimalRaceWindow: 'Données insuffisantes',
      warnings: ['Aucune donnée disponible'],
    };
  }

  const last = results[results.length - 1];
  const last7 = results.slice(-7);
  const prev7 = results.slice(-14, -7);

  const avgCtlLast = last7.reduce((s, r) => s + r.ctl, 0) / last7.length;
  const avgCtlPrev = prev7.length > 0
    ? prev7.reduce((s, r) => s + r.ctl, 0) / prev7.length
    : avgCtlLast;

  const ctlDelta = avgCtlLast - avgCtlPrev;
  let trend: PMCSummary['trend'] = 'stable';
  if (last.tsb < -25) trend = 'overreaching';
  else if (ctlDelta > 2) trend = 'improving';
  else if (ctlDelta < -2) trend = 'declining';

  // Score de préparation course : idéal TSB = +10
  const raceReadinessScore = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.abs(last.tsb - 10) * 2))
  );

  // Fenêtre optimale : ramener TSB vers +10
  let optimalRaceWindow = 'Maintenant — fraîcheur optimale';
  if (last.tsb < -10) {
    const daysToFresh = Math.ceil(Math.abs(last.tsb - 10) / 3);
    optimalRaceWindow = `dans ${daysToFresh}-${daysToFresh + 4} jours`;
  } else if (last.tsb > 20) {
    optimalRaceWindow = 'Risque de désaffûtage — courir bientôt';
  } else if (last.tsb > 5 && last.tsb <= 20) {
    optimalRaceWindow = 'Fenêtre ouverte (0-7 jours)';
  }

  const warnings: string[] = [];
  if (last.tsb < -20) warnings.push('Fatigue élevée (TSB < -20) — risque blessure');
  if (last.tsb < -30) warnings.push('Surmenage critique — récupération impérative');
  if (ctlDelta < -3) warnings.push('CTL en chute — détraining en cours');
  if (last.ctl < 30 && prev7.length > 0) warnings.push('Charge chronique faible — base insuffisante');

  return {
    currentCTL: last.ctl,
    currentATL: last.atl,
    currentTSB: last.tsb,
    trend,
    raceReadinessScore,
    optimalRaceWindow,
    warnings,
  };
}

export const PMC_FORM_ZONES = FORM_ZONES;

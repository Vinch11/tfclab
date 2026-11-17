import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { calculateLactateProduction, computeMLSS } from '@/lib/v2/maderMetabolicModel';
import { generateMaderPowerDurationCurve } from '@/lib/v2/maderPowerDurationCurve';
import { positive } from './labProfile';

/** Nolio sport ids, aligned with the nolio-records import. */
export const NOLIO_BIKE_SPORTS = [14, 18];
export const NOLIO_RUN_SPORTS = [2, 52];
export interface NolioRecordRow { cat: string; record_type: string; sport_id: number; item_seconds: number; value: number; date_recorded: string | null }
export interface EnvelopePoint { durationSec: number; value: number; date: string | null }

const FIT_MIN_SEC = 30, FIT_MAX_SEC = 1200;
export const monthsBefore = (d: string, m: number) => { const x = new Date(d.slice(0, 10) + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() - m); return x.toISOString().slice(0, 10); };

/** Best observed record per duration within both bounds, without altering observed values. */
export function nolioEnvelope(rows: NolioRecordRow[], cat: 'ppr' | 'par' | 'phrr', sports: number[] | null, refDate: string, windowMonths = 24, startDate?: string): EnvelopePoint[] {
  const from = startDate ?? monthsBefore(refDate, windowMonths);
  const best = new Map<number, EnvelopePoint>();
  for (const r of rows) {
    if (r.cat !== cat || r.record_type !== 'time' || (sports && !sports.includes(r.sport_id))) continue;
    const date = r.date_recorded?.slice(0, 10);
    if (!positive(r.value) || !positive(r.item_seconds) || !date || date < from || date > refDate.slice(0, 10)) continue;
    const cur = best.get(r.item_seconds);
    if (!cur || r.value > cur.value) best.set(r.item_seconds, { durationSec: r.item_seconds, value: r.value, date });
  }
  const pts = [...best.values()].sort((a, b) => a.durationSec - b.durationSec);
  if (cat === 'phrr') return pts;
  return pts;
}

export interface BikeFit { vo2max: number; vlamax: number; mlssW: number; mlssPct: number; errorPct: number; n: number; atBound: boolean; points: { durationSec: number; observed: number; bilan: number | null; fitted: number; date: string | null }[] }

/**
 * Least-squares fit of VO₂max and VLamax on the Nolio power–duration envelope (30 s – 20 min; shorter efforts are neuromuscular, not glycolytic).
 * Asymmetric: the model must reach real records (records are a lower bound of capacity).
 * VO₂max bounded to ±15 % of the bilan, VLamax to 0.15–0.90 mmol/L/s.
 */
export function fitBikeOnNolio(input: CoachingCompassInput, env: EnvelopePoint[]): BikeFit | null {
  if (!positive(input.vo2max) || !positive(input.poids)) return null;
  const pts = env.filter(p => p.durationSec >= FIT_MIN_SEC && p.durationSec <= FIT_MAX_SEC);
  if (pts.length < 4 || !pts.some(p => p.durationSec <= 120) || !pts.some(p => p.durationSec >= 300)) return null;
  const durs = pts.map(p => p.durationSec), weight = input.poids;
  let best: { vo2: number; vla: number; loss: number } | null = null;
  for (let vo2 = input.vo2max * 0.85; vo2 <= input.vo2max * 1.15 + 1e-9; vo2 += 0.5) {
    for (let vla = 0.15; vla <= 0.9 + 1e-9; vla += 0.01) {
      const curve = generateMaderPowerDurationCurve({ vo2max: vo2, vlamax: vla, weight }, durs).points;
      let loss = 0;
      curve.forEach((m, i) => { const r = Math.log(m.powerWatts / pts[i].value); loss += (r < 0 ? 4 : 1) * r * r; });
      if (!best || loss < best.loss) best = { vo2, vla, loss };
    }
  }
  if (!best) return null;
  const vo2 = Math.round(best.vo2 * 10) / 10, vla = Math.round(best.vla * 100) / 100;
  const fitted = generateMaderPowerDurationCurve({ vo2max: vo2, vlamax: vla, weight }, durs).points;
  const bv = input.vlamaxEffectif.value;
  const bilan = positive(bv) ? generateMaderPowerDurationCurve({ vo2max: input.vo2max, vlamax: bv, weight }, durs).points : null;
  const mlss = computeMLSS({ vo2max: vo2, vlamax: vla, weight });
  if (!mlss) return null;
  const errorPct = Math.round(Math.sqrt(fitted.reduce((s, m, i) => s + ((m.powerWatts - pts[i].value) / pts[i].value) ** 2, 0) / pts.length) * 1000) / 10;
  const atBound = Math.abs(best.vo2 - input.vo2max * 0.85) < 0.3 || Math.abs(best.vo2 - input.vo2max * 1.15) < 0.6 || vla <= 0.15 || vla >= 0.9;
  return { atBound, vo2max: vo2, vlamax: vla, mlssW: mlss.power, mlssPct: mlss.intensityPct, errorPct, n: pts.length,
    points: pts.map((p, i) => ({ durationSec: p.durationSec, observed: p.value, bilan: bilan?.[i].powerWatts ?? null, fitted: fitted[i].powerWatts, date: p.date })) };
}

export interface RunFit { csKmh: number; dPrimeM: number; vma6Kmh: number | null; n: number }
/** Critical speed / D′ from Nolio best paces between 3 and 20 min (distance = CS·t + D′). Running only. */
export function fitRunOnNolio(env: EnvelopePoint[]): RunFit | null {
  const pts = env.filter(p => p.durationSec >= 180 && p.durationSec <= 1200);
  if (pts.length < 3) return null;
  const xs = pts.map(p => p.durationSec), ys = pts.map(p => p.value * p.durationSec);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const cs = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const d = my - cs * mx;
  if (!positive(cs) || d < 0) return null;
  const six = env.find(p => p.durationSec === 360);
  return { csKmh: Math.round(cs * 36) / 10, dPrimeM: Math.round(d), vma6Kmh: six ? Math.round(six.value * 36) / 10 : null, n: pts.length };
}

/**
 * Display kinetics for 100%lab: Mader production, and an elimination curve anchored so both
 * cross exactly at the canonical MLSS (oxidative removal grows sub-linearly with VO₂, exponent 0.35).
 */
export function labLactateKinetics(intensityPct: number, vo2max: number, vlamax: number, weight: number) {
  const mlss = computeMLSS({ vo2max, vlamax, weight });
  if (!mlss) return null;
  const production = calculateLactateProduction(intensityPct, vlamax);
  const elimination = calculateLactateProduction(mlss.intensityPct, vlamax) * Math.pow(intensityPct / mlss.intensityPct, 0.35);
  return { production, elimination };
}

export type CheckLevel = 'ok' | 'warn' | 'alert';
export interface CoherenceCheck { key: string; label: string; bilan: string; nolio: string; gapPct: number | null; level: CheckLevel; note: string; sport: 'bike' | 'run' | 'both' }
const level = (gap: number, warn: number, alert: number): CheckLevel => Math.abs(gap) >= alert ? 'alert' : Math.abs(gap) >= warn ? 'warn' : 'ok';
const pct = (a: number, b: number) => Math.round((a - b) / b * 100);

/** Cross-checks between the stored bilan and Nolio-derived values. Contradictions are shown, never hidden. */
export function coherenceChecks(input: CoachingCompassInput, snapshot: { ftp?: number | null; map5min_w?: number | null; pmax_5s?: number | null; vma?: number | null; pace_threshold_sec_per_km?: number | null; fc_max?: number | null }, bike: BikeFit | null, bikeEnv: EnvelopePoint[], run: RunFit | null, hrEnv: EnvelopePoint[]): CoherenceCheck[] {
  const out: CoherenceCheck[] = [];
  const at = (d: number) => bikeEnv.find(p => p.durationSec === d)?.value;
  if (bike) {
    if (positive(snapshot.ftp)) { const g = pct(snapshot.ftp, bike.mlssW); out.push({ key: 'ftp', sport: 'bike', label: 'FTP ↔ MLSS recalé', bilan: `${snapshot.ftp} W`, nolio: `${bike.mlssW} W`, gapPct: g, level: level(g, 5, 10), note: 'Le MLSS issu de la courbe Nolio doit rester proche de la FTP du bilan.' }); }
    if (positive(input.vo2max)) { const g = pct(bike.vo2max, input.vo2max); out.push({ key: 'vo2', sport: 'bike', label: 'VO₂max', bilan: `${input.vo2max}`, nolio: `${bike.vo2max}`, gapPct: g, level: level(g, 5, 10), note: 'VO₂max qui explique le mieux vos records Nolio.' }); }
    const bv = input.vlamaxEffectif.value;
    if (positive(bv)) { const g = pct(bike.vlamax, bv); out.push({ key: 'vla', sport: 'bike', label: 'VLamax vélo', bilan: bv.toFixed(2), nolio: bike.vlamax.toFixed(2), gapPct: g, level: level(g, 15, 30), note: 'VLamax qui reproduit vos sprints et efforts courts Nolio.' }); }
  }
  const p300 = at(300);
  if (positive(snapshot.map5min_w) && positive(p300)) { const g = pct(snapshot.map5min_w, p300); out.push({ key: 'p300', sport: 'bike', label: 'Record 5 min', bilan: `${snapshot.map5min_w} W`, nolio: `${p300} W`, gapPct: g, level: level(g, 5, 10), note: 'Meilleur 5 min Nolio sur la période sélectionnée comparé au bilan.' }); }
  const p5 = at(5);
  if (positive(snapshot.pmax_5s) && positive(p5)) { const g = pct(snapshot.pmax_5s, p5); out.push({ key: 'p5', sport: 'bike', label: 'Record 5 s', bilan: `${snapshot.pmax_5s} W`, nolio: `${p5} W`, gapPct: g, level: level(g, 8, 15), note: 'Meilleur 5 s Nolio comparé au bilan.' }); }
  if (run && positive(snapshot.vma) && run.vma6Kmh) { const g = pct(snapshot.vma, run.vma6Kmh); out.push({ key: 'vma', sport: 'run', label: 'VMA ↔ meilleur 6 min', bilan: `${snapshot.vma} km/h`, nolio: `${run.vma6Kmh} km/h`, gapPct: g, level: level(g, 5, 10), note: 'Une VMA bien au-dessus du meilleur 6 min Nolio est à vérifier.' }); }
  if (run && positive(snapshot.pace_threshold_sec_per_km)) { const thr = Math.round(36000 / snapshot.pace_threshold_sec_per_km) / 10; const g = pct(thr, run.csKmh); out.push({ key: 'cs', sport: 'run', label: 'Allure seuil ↔ vitesse critique', bilan: `${thr} km/h`, nolio: `${run.csKmh} km/h`, gapPct: g, level: level(g, 5, 10), note: 'La vitesse critique Nolio (3–20 min) se situe normalement juste au-dessus du seuil.' }); }
  const sustained = hrEnv.filter(p => p.durationSec >= 60);
  const hrMax = sustained.length ? Math.max(...sustained.map(p => p.value)) : null;
  if (positive(snapshot.fc_max) && positive(hrMax)) { const g = pct(snapshot.fc_max, hrMax); out.push({ key: 'hr', sport: 'both', label: 'FC max', bilan: `${snapshot.fc_max} bpm`, nolio: `${hrMax} bpm`, gapPct: g, level: level(g, 3, 6), note: 'FC la plus haute tenue au moins 1 min dans Nolio (les pics plus courts sont souvent des artefacts de capteur).' }); }
  return out;
}

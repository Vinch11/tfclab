import { CRITICAL_POLICY, type CriticalSport } from './criticalEfforts';
import type { StoredCriticalSport } from './criticalMetrics';
import { detectAllIntervals } from '@/engines/plan/wbalPostProcessor';

/**
 * Proposals only: never edits a session. The coach accepts each one.
 * Reserve balance between repetitions uses the exponential W′bal recovery
 * (Skiba 2012, τ = 546·e^(−0.01·DCP) + 316 s, recovery assumed at 50 % CP).
 * Running has no validated equivalent: a fixed τ = 377 s (Skiba mean) is used
 * and every running recovery proposal is flagged as indicative.
 */
export const PROPOSAL_POLICY = { maxRepFraction: 0.9, minEndFraction: 0.1, restStepSec: 15, maxRestFactor: 2, maxRestSec: 600, runTauSec: 377, bikeRecoveryFractionOfCp: 0.5 };
export const ACCEPTED_MARKER = '[Ajustement repères critiques validé coach]';

export interface IntervalSpec { reps: number; durationSec: number; target: number; restSec: number; text: string }
export interface CriticalProposal {
  sport: CriticalSport; interval: IntervalSpec; repFraction: number; endFraction: number;
  kind: 'consistent' | 'rest' | 'duration' | 'reps';
  proposed: { restSec?: number; durationSec?: number; reps?: number };
  message: string; indicative: boolean;
}

export function tauSec(sport: CriticalSport, critical: number): number {
  if (sport === 'running') return PROPOSAL_POLICY.runTauSec;
  return 546 * Math.exp(-0.01 * critical * (1 - PROPOSAL_POLICY.bikeRecoveryFractionOfCp)) + 316;
}

/** Reserve fraction left after the last repetition. */
export function endBalanceFraction(i: IntervalSpec, m: StoredCriticalSport, sport: CriticalSport): number {
  const used = (i.target - m.critical) * i.durationSec, tau = tauSec(sport, m.critical);
  let bal = m.reserve;
  for (let r = 0; r < i.reps; r++) {
    bal -= used;
    if (r < i.reps - 1) bal = m.reserve - (m.reserve - bal) * Math.exp(-i.restSec / tau);
  }
  return bal / m.reserve;
}

export function detectRunIntervals(text: string): IntervalSpec[] {
  const re = /(\d{1,2})\s*[x×]\s*(\d{1,4}(?:[.,]\d+)?)\s*(km|m|min|mn|s|sec)\b[^.\n]*?(?:@|à|a)\s*(?:(\d{1,2})[:'’](\d{2})\s*(?:\/\s*km|min\/km)|(\d{1,2}(?:[.,]\d)?)\s*km\/h)[^.\n]*?(?:r(?:écup(?:ération)?)?|repos|rest)\s*[=:]?\s*(\d{1,3})\s*(min|mn|s|sec|'|")?/gi;
  const out: IntervalSpec[] = [];
  for (const m of text.matchAll(re)) {
    const reps = +m[1], amount = +m[2].replace(',', '.'), unit = m[3].toLowerCase();
    const speed = m[4] ? 1000 / (+m[4] * 60 + +m[5]) : +m[6].replace(',', '.') / 3.6;
    const durationSec = unit === 'km' ? amount * 1000 / speed : unit === 'm' ? amount / speed : unit.startsWith('m') ? amount * 60 : amount;
    const restUnit = (m[8] ?? 'min').toLowerCase();
    const restSec = restUnit === 's' || restUnit === 'sec' || restUnit === '"' ? +m[7] : +m[7] * 60;
    if (reps >= 2 && reps <= 30 && speed > 0 && Number.isFinite(durationSec)) out.push({ reps, durationSec: Math.round(durationSec), target: speed, restSec, text: m[0] });
  }
  return out;
}

export function detectBikeIntervals(text: string, ftp: number | null, cp: number): IntervalSpec[] {
  return detectAllIntervals(text).flatMap(i => {
    const ref = i.intensityRef === 'CP' ? cp : ftp;
    if (!ref) return [];
    return [{ reps: i.reps, durationSec: i.durationSec, target: ref * i.pctIntensity / 100, restSec: i.originalRestSec, text: i.fullMatch ?? i.originalRestText }];
  });
}

export function proposeForInterval(i: IntervalSpec, m: StoredCriticalSport, sport: CriticalSport): CriticalProposal | null {
  if (i.target <= m.critical || i.durationSec < CRITICAL_POLICY.minSec || i.durationSec > CRITICAL_POLICY.maxSec) return null;
  const indicative = sport === 'running';
  const repFraction = (i.target - m.critical) * i.durationSec / m.reserve;
  const endFraction = endBalanceFraction(i, m, sport);
  const base = { sport, interval: i, repFraction, endFraction, indicative };
  if (repFraction > PROPOSAL_POLICY.maxRepFraction) {
    const step = PROPOSAL_POLICY.restStepSec;
    const d = Math.floor(PROPOSAL_POLICY.maxRepFraction * m.reserve / (i.target - m.critical) / step) * step;
    if (d >= CRITICAL_POLICY.minSec) return { ...base, kind: 'duration', proposed: { durationSec: d }, message: `Une répétition consomme ${Math.round(repFraction * 100)} % de la réserve : raccourcir à ${fmt(d)}.` };
    return { ...base, kind: 'duration', proposed: {}, message: `Une répétition consomme ${Math.round(repFraction * 100)} % de la réserve : baisser la cible (non calculé ici).` };
  }
  if (endFraction >= PROPOSAL_POLICY.minEndFraction) return { ...base, kind: 'consistent', proposed: {}, message: `Cohérent : environ ${Math.round(endFraction * 100)} % de la réserve restante à la fin.` };
  const maxRest = Math.min(PROPOSAL_POLICY.maxRestSec, Math.max(i.restSec, i.restSec * PROPOSAL_POLICY.maxRestFactor));
  for (let r = i.restSec + PROPOSAL_POLICY.restStepSec; r <= maxRest; r += PROPOSAL_POLICY.restStepSec) {
    if (endBalanceFraction({ ...i, restSec: r }, m, sport) >= PROPOSAL_POLICY.minEndFraction) return { ...base, kind: 'rest', proposed: { restSec: r }, message: `Récupération ${fmt(i.restSec)} → ${fmt(r)} pour garder ≥ 10 % de réserve.` };
  }
  let reps = i.reps - 1;
  while (reps >= 2 && endBalanceFraction({ ...i, reps }, m, sport) < PROPOSAL_POLICY.minEndFraction) reps--;
  if (reps >= 2) return { ...base, kind: 'reps', proposed: { reps }, message: `Réserve épuisée avant la fin : ${i.reps} → ${reps} répétitions (récupération inchangée).` };
  return { ...base, kind: 'reps', proposed: {}, message: 'Réserve épuisée avant la fin : séance à revoir par le coach.' };
}

export function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? (s ? `${m}min${String(s).padStart(2, '0')}` : `${m}min`) : `${s}s`;
}

export function acceptanceNote(p: CriticalProposal, m: StoredCriticalSport): string {
  const ref = p.sport === 'cycling' ? `CP ${Math.round(m.critical)} W, W′ ${(m.reserve / 1000).toFixed(1)} kJ` : `VC ${(m.critical * 3.6).toFixed(2)} km/h, D′ ${Math.round(m.reserve)} m`;
  return `${ACCEPTED_MARKER} (${ref}, tests du ${m.latestEffortDate}) ${p.interval.text.trim()} : ${p.message}${p.indicative ? ' Récupération course indicative.' : ''}`;
}

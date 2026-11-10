export const TEST_DAY_GROUPS: Array<{ title: string; fields: DetectedField[] }> = [
  { title: 'J1 · Sprint', fields: ['pmax_5s', 'p30s_w', 'p60s_w', 'sprint_15s'] },
  { title: 'J3 · Aérobie max', fields: ['map5min_w', 'vma'] },
  { title: 'J5 · Seuil', fields: ['test20min_w', 'ftp'] },
  { title: 'Durabilité, économie et contexte', fields: ['run_hr_drift_pct', 'run_power_cost', 'fc_max'] },
];

/**
 * « Trouver les tests de la période » — détection des efforts de test dans les
 * séances Nolio d'une période. Règle coach : pour chaque test, le meilleur
 * résultat mesuré de la période est retenu, puis le coach valide.
 * Jamais de VLamax, CSS ou durée au seuil déduite ici ; la FTP n'est qu'une
 * proposition « à vérifier » (95 % d'un test 20 min), remplie seulement par le coach.
 */
import type { SnapshotRecordFields } from '@/lib/nolioV2Records';

type Stat = { value?: number | null } | null | undefined;
export interface DetectionLap { distance?: number | null; duration?: number | null; stats?: { heartrate_avg?: Stat; heartrate_max?: Stat; watts_avg?: Stat; elevation_gain?: Stat } | null }
export interface DetectionSession {
  id: string; name: string; date: string; sportBase: 'cycling' | 'running';
  laps?: DetectionLap[]; bikeLaps?: DetectionLapPower[]; time?: Array<number | null>; watts?: Array<number | null>;
}
export type DetectedField = 'pmax_5s' | 'p30s_w' | 'p60s_w' | 'map5min_w' | 'sprint_15s' | 'vma' | 'test20min_w' | 'run_hr_drift_pct' | 'run_power_cost' | 'ftp' | 'fc_max';
export interface DetectionLapPower { duration?: number | null; watts?: number | null; hrMax?: number | null }
export interface DetectedTest {
  field: DetectedField; label: string; value: number; display: string; unit: string;
  sessionId: string; sessionName: string; date: string; evidence: string;
  /** false = information seulement (ex. test 20 min : jamais converti en FTP automatiquement). */
  fillable: boolean;
  /** measured = effort de test retrouvé ; check = proposition à vérifier ; info = information seulement. */
  confidence: 'measured' | 'check' | 'info';
  /** Autres séances candidates, du meilleur au moins bon. */
  alternatives: Array<{ sessionName: string; date: string; display: string; value: number }>;
}

const BIKE_WINDOWS: Array<[DetectedField, number, string]> = [
  ['pmax_5s', 5, 'Vélo — sprint 5 s'], ['p30s_w', 30, 'Vélo — 30 s'],
  ['p60s_w', 60, 'Vélo — 60 s'], ['map5min_w', 300, 'Vélo — puissance 5 min'],
];

/** Meilleure puissance moyenne sur `seconds`, sur un signal rééchantillonné à 1 s. */
export function bestMeanPower(time: Array<number | null>, watts: Array<number | null>, seconds: number): number | null {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < Math.min(time.length, watts.length); i++) {
    const t = time[i], w = watts[i];
    if (typeof t === 'number' && Number.isFinite(t)) pts.push([t, typeof w === 'number' && Number.isFinite(w) && w >= 0 ? w : 0]);
  }
  if (pts.length < 2) return null;
  pts.sort((a, b) => a[0] - b[0]);
  const start = Math.ceil(pts[0][0]), end = Math.floor(pts[pts.length - 1][0]);
  if (end - start + 1 < seconds) return null;
  const series: number[] = []; let j = 0;
  for (let t = start; t <= end; t++) {
    while (j < pts.length - 2 && pts[j + 1][0] < t) j++;
    const [t0, w0] = pts[j], [t1, w1] = pts[j + 1];
    // Trou d'enregistrement > 5 s : puissance nulle, jamais interpolée.
    series.push(t1 - t0 > 5 ? 0 : t1 === t0 ? w0 : w0 + ((w1 - w0) * (t - t0)) / (t1 - t0));
  }
  let sum = 0; for (let i = 0; i < seconds; i++) sum += series[i];
  let best = sum;
  for (let i = seconds; i < series.length; i++) { sum += series[i] - series[i - seconds]; if (sum > best) best = sum; }
  return best / seconds;
}

const paceText = (kmh: number) => { const s = Math.round(3600 / kmh); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km`; };

export function detectPeriodTests(sessions: DetectionSession[]): DetectedTest[] {
  type Cand = { value: number; display: string; s: DetectionSession; evidence: string; rank?: number };
  const cands = new Map<DetectedField, Cand[]>();
  const push = (f: DetectedField, c: Cand) => cands.set(f, [...(cands.get(f) ?? []), c]);

  for (const s of sessions) {
    if (s.sportBase === 'cycling' && s.time && s.watts) {
      for (const [field, sec] of BIKE_WINDOWS) {
        const p = bestMeanPower(s.time, s.watts, sec);
        if (p && p > 0) push(field, { value: Math.round(p), display: `${Math.round(p)} W`, s, evidence: `meilleure moyenne ${sec < 60 ? sec + ' s' : sec / 60 + ' min'} de la séance` });
      }
    }
    // Test 20 min (protocole FTP) : tour vélo isolé de 19 à 21 min, effort réel du test.
    for (const lap of s.sportBase === 'cycling' ? s.bikeLaps ?? [] : []) {
      const t = Number(lap.duration), w = Number(lap.watts);
      if (t >= 1140 && t <= 1260 && w > 0) {
        push('test20min_w', { value: Math.round(w), display: `${Math.round(w)} W sur ${Math.round(t / 60)} min`, s, evidence: 'tour de test 20 min' });
        // Proposition à vérifier : convention 95 % du test 20 min, jamais une mesure.
        push('ftp', { value: Math.round(w * 0.95), display: `${Math.round(w * 0.95)} W`, s, evidence: `95 % du test 20 min (${Math.round(w)} W) — à vérifier` });
      }
    }
    // FC max : plus haute FC enregistrée sur un tour (vélo ou course), à vérifier (capteur, pics parasites).
    const hrs = [...(s.bikeLaps ?? []).map(l => Number(l.hrMax)), ...(s.laps ?? []).map(l => Number(l.stats?.heartrate_max?.value))].filter(h => Number.isFinite(h) && h >= 120 && h <= 230);
    if (hrs.length) { const h = Math.max(...hrs); push('fc_max', { value: h, display: `${h} bpm`, s, evidence: 'plus haute FC enregistrée de la séance — à vérifier' }); }
    if (s.sportBase === 'running' && s.laps) {
      for (const lap of s.laps) {
        const d = Number(lap.distance), t = Number(lap.duration);
        if (!Number.isFinite(d) || !Number.isFinite(t) || d <= 0 || t <= 0) continue;
        // Sprint : tour isolé de 15 s (±1 s), distance mesurée par la montre.
        if (t >= 14 && t <= 16) {
          const m = Math.round((d * 15) / t * 10) / 10;
          if (m >= 30 && m <= 200) push('sprint_15s', { value: m, display: `${m} m`, s, evidence: `tour de ${Math.round(t)} s · ${Math.round(d * 10) / 10} m` });
        }
      }
      // Test VMA : effort continu de 5 à 7 min, en un tour ou en tours consécutifs
      // (ex. tours automatiques de 400 m). Le meilleur bloc de la séance est retenu.
      const laps = s.laps.map(l => ({ d: Number(l.distance), t: Number(l.duration) }));
      let bestVma: { kmh: number; d: number; t: number; n: number } | null = null;
      for (let i = 0; i < laps.length; i++) {
        let d = 0, t = 0;
        for (let j = i; j < laps.length; j++) {
          if (!Number.isFinite(laps[j].d) || !Number.isFinite(laps[j].t) || laps[j].d <= 0 || laps[j].t <= 0) break;
          d += laps[j].d; t += laps[j].t;
          if (t > 420) break;
          if (t >= 300) { const kmh = (d / t) * 3.6; if (!bestVma || kmh > bestVma.kmh) bestVma = { kmh, d, t, n: j - i + 1 }; }
        }
      }
      const drift = runDrift(s.laps);
      if (drift) push('run_hr_drift_pct', { value: drift.pct, display: `${drift.pct} %`, s,
        evidence: `${drift.minutes} min stables analysées (échauffement exclu) · allure/FC ${drift.first} → ${drift.second}`, rank: drift.minutes });
      const cost = runPowerCost(s.laps);
      if (cost) push('run_power_cost', { value: cost.wPerKmh, display: `${cost.wPerKmh} W par km/h à ${cost.kmh} km/h`, s,
        evidence: `${cost.minutes} min de tours stables · ${cost.hr} bpm de moyenne`, rank: cost.minutes });
      if (bestVma) {
        const kmh = Math.round(bestVma.kmh * 10) / 10;
        if (kmh >= 8 && kmh <= 30) push('vma', { value: kmh, display: `${kmh} km/h (${paceText(kmh)})`, s,
          evidence: `${bestVma.n > 1 ? bestVma.n + ' tours consécutifs' : 'tour'} · ${Math.floor(bestVma.t / 60)}:${String(Math.round(bestVma.t % 60)).padStart(2, '0')} · ${Math.round(bestVma.d)} m` });
      }
    }
  }

  const labels: Record<DetectedField, [string, string]> = {
    pmax_5s: ['Vélo — sprint 5 s', 'W'], p30s_w: ['Vélo — 30 s', 'W'], p60s_w: ['Vélo — 60 s', 'W'],
    map5min_w: ['Vélo — puissance 5 min', 'W'], run_hr_drift_pct: ['Course — dérive cardiaque (durabilité, estimation)', '%'], run_power_cost: ['Course — coût en puissance (économie, information)', 'W par km/h'], test20min_w: ['Vélo — test 20 min (protocole FTP)', 'W'], ftp: ['Vélo — FTP', 'W'], fc_max: ['FC max', 'bpm'], sprint_15s: ['Course — distance en 15 s', 'm'], vma: ['Course — VMA', 'km/h'],
  };
  const out: DetectedTest[] = [];
  for (const field of Object.keys(labels) as DetectedField[]) {
    // Dérive et coût : la séance stable la plus longue est la plus représentative (pas « la meilleure valeur »).
    const list = (cands.get(field) ?? []).sort((a, b) => a.rank !== undefined && b.rank !== undefined ? b.rank - a.rank : b.value - a.value);
    if (!list.length) continue;
    const best = list[0];
    // Une seule alternative par séance.
    const seen = new Set([best.s.id]);
    const alternatives = list.slice(1).filter(c => !seen.has(c.s.id) && seen.add(c.s.id)).slice(0, 3)
      .map(c => ({ sessionName: c.s.name, date: c.s.date, display: c.display, value: c.value }));
    const confidence: DetectedTest['confidence'] = field === 'test20min_w' || field === 'run_power_cost' ? 'info' : field === 'ftp' || field === 'fc_max' || field === 'run_hr_drift_pct' ? 'check' : 'measured';
    out.push({ field, confidence, fillable: confidence !== 'info', label: labels[field][0], unit: labels[field][1], value: best.value, display: best.display,
      sessionId: best.s.id, sessionName: best.s.name, date: best.s.date, evidence: best.evidence, alternatives });
  }
  return out;
}

export function detectedToFields(tests: DetectedTest[]): SnapshotRecordFields {
  return Object.fromEntries(tests.filter(t => t.fillable).map(t => [t.field, String(t.value)])) as SnapshotRecordFields;
}

const statValue = (x: Stat) => (x && typeof x.value === 'number' && Number.isFinite(x.value) ? x.value : null);
type SteadyLap = { d: number; t: number; hr: number; w: number | null };

/** Tours d'endurance stables après 10 min d'échauffement : allure ±8 % autour de la médiane, FC présente, peu de dénivelé. */
function steadyLaps(laps: DetectionLap[]): SteadyLap[] {
  let elapsed = 0; const kept: SteadyLap[] = [];
  for (const l of laps) {
    const d = Number(l.distance), t = Number(l.duration), hr = statValue(l.stats?.heartrate_avg);
    const start = elapsed; elapsed += Number.isFinite(t) ? t : 0;
    if (start < 600 || !(d > 0) || !(t >= 60) || !hr || hr < 60) continue;
    const gain = statValue(l.stats?.elevation_gain);
    if (gain !== null && gain / (d / 1000) > 15) continue;
    kept.push({ d, t, hr, w: statValue(l.stats?.watts_avg) });
  }
  if (kept.length < 4) return [];
  const speeds = kept.map(k => k.d / k.t).sort((a, b) => a - b); const med = speeds[Math.floor(speeds.length / 2)];
  // Séance trop fractionnée (intervalles) : non représentative.
  const steady = kept.filter(k => Math.abs(k.d / k.t - med) / med <= 0.08);
  return steady.length >= kept.length * 0.8 ? steady : [];
}

/** Dérive Pa:HR (découplage) entre 1re et 2e moitié de la partie stable, ≥ 40 min. */
export function runDrift(laps: DetectionLap[]) {
  const st = steadyLaps(laps); const total = st.reduce((a, l) => a + l.t, 0);
  if (total < 2400) return null;
  let acc = 0; const h1: SteadyLap[] = [], h2: SteadyLap[] = [];
  for (const l of st) { (acc + l.t / 2 <= total / 2 ? h1 : h2).push(l); acc += l.t; }
  if (!h1.length || !h2.length) return null;
  const ratio = (g: SteadyLap[]) => { const t = g.reduce((a, l) => a + l.t, 0); const v = g.reduce((a, l) => a + l.d, 0) / t; const hr = g.reduce((a, l) => a + l.hr * l.t, 0) / t; return v / hr; };
  const r1 = ratio(h1), r2 = ratio(h2);
  const pct = Math.round(((r1 - r2) / r1) * 1000) / 10;
  return { pct: Math.max(0, pct), minutes: Math.round(total / 60), first: (r1 * 1000).toFixed(2), second: (r2 * 1000).toFixed(2) };
}

/** Puissance nécessaire par km/h sur les tours stables : à comparer pour le même athlète et le même capteur. */
export function runPowerCost(laps: DetectionLap[]) {
  const st = steadyLaps(laps).filter(l => l.w && l.w > 0); const total = st.reduce((a, l) => a + l.t, 0);
  if (total < 1200) return null;
  const kmh = (st.reduce((a, l) => a + l.d, 0) / total) * 3.6; const w = st.reduce((a, l) => a + (l.w as number) * l.t, 0) / total;
  const hr = st.reduce((a, l) => a + l.hr * l.t, 0) / total;
  return { wPerKmh: Math.round((w / kmh) * 10) / 10, kmh: Math.round(kmh * 10) / 10, hr: Math.round(hr), minutes: Math.round(total / 60) };
}

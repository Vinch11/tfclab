import type { DbTest } from '@/hooks/useCloudData';
import { validTestDate } from '@/lib/testMeasurementReview';

const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const text = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : null;
export const TEST_CHANNELS = { watts: { label: 'Puissance', unit: 'W' }, speed: { label: 'Vitesse', unit: 'km/h' }, heartrate: { label: 'Fréquence cardiaque', unit: 'bpm' }, distance: { label: 'Distance sprint', unit: 'm' } } as const;
export type TestChannel = keyof typeof TEST_CHANNELS;
export interface TestCurve { id: string; name: string; sport: 'bike' | 'run'; date: string; protocol: string | null; sensor: string | null; points: { x: number; watts: number | null; speed: number | null; heartrate: number | null; distance: number | null }[]; axis: 'time' | 'attempt'; channels: TestChannel[]; measures: { label: string; value: number; unit: string }[]; thresholds: { label: string; value: number; channel: TestChannel }[] }
const fields: [string, string, string][] = [
  ['puissanceMax', 'Puissance maximale', 'W'], ['p5s', 'Puissance 5 s', 'W'], ['p15s', 'Puissance 15 s', 'W'], ['p30s', 'Puissance 30 s', 'W'], ['p60s', 'Puissance 60 s', 'W'], ['power_avg', 'Puissance moyenne', 'W'], ['hrAvg', 'FC moyenne', 'bpm'], ['hrMax', 'FC maximale', 'bpm'], ['hr_start', 'FC début', 'bpm'], ['hr_end', 'FC fin', 'bpm'], ['bestDistance', 'Distance sprint retenue', 'm'], ['tteObserved', 'Durée au seuil déclarée', 'min'], ['tte_minutes', 'Durée au seuil déclarée', 'min'], ['paceThreshold', 'Allure seuil enregistrée', 's/km'], ['pace_threshold_sec_per_km', 'Allure seuil enregistrée', 's/km'], ['ftp_target', 'Puissance cible déclarée', 'W'], ['economyScore', 'Économie estimée', '/100'], ['fatmaxW', 'FatMax estimée', 'W'],
];
/** Only stored raw observations. No snapshot/model threshold is attached to an older test. */
export function storedTestCurves(tests: DbTest[], athleteId: string): TestCurve[] {
  return tests.filter(t => t.athlete_id === athleteId).flatMap<TestCurve>(test => {
    const raw = object(test.raw);
    const sportName = String(test.sport || raw.sport || '').toLowerCase();
    const sport = ['bike', 'cycling', 'velo', 'vélo'].includes(sportName) ? 'bike' : ['run', 'running', 'cap', 'course'].includes(sportName) ? 'run' : null;
    if (!sport) return [];
    const streams = object(raw.streams);
    const times = Array.isArray(streams.time) ? streams.time : [];
    const values = (channel: string, i: number) => Array.isArray(streams[channel]) && number(streams[channel][i]) ? streams[channel][i] as number : null;
    const speedUnit = text(streams.speed_unit);
    const points: TestCurve['points'] = times.flatMap((time, i) => {
      if (!number(time) || (i > 0 && (!number(times[i - 1]) || time <= Number(times[i - 1])))) return [];
      const speed = values('speed', i);
      return [{ x: time, watts: sport === 'bike' ? values('watts', i) : null, speed: sport === 'run' && speed != null ? speedUnit === 'm/s' ? speed * 3.6 : speedUnit === 'km/h' ? speed : null : null, heartrate: values('heartrate', i), distance: null }];
    });
    let axis: TestCurve['axis'] = 'time';
    if (!points.length && sport === 'run' && Array.isArray(raw.sprint_attempts)) {
      axis = 'attempt';
      raw.sprint_attempts.forEach((distance, i) => { if (number(distance) && distance > 0) points.push({ x: i + 1, distance, watts: null, speed: null, heartrate: null }); });
    }
    const channels = (Object.keys(TEST_CHANNELS) as TestChannel[]).filter(c => points.some(p => p[c] != null));
    const thresholds: TestCurve['thresholds'] = [];
    const pace = raw.paceThreshold ?? raw.pace_threshold_sec_per_km;
    if (sport === 'run' && number(pace) && pace > 0) thresholds.push({ label: 'Seuil course enregistré', value: 3600 / pace, channel: 'speed' });
    if (sport === 'bike' && number(raw.ftp_target) && raw.ftp_target > 0) thresholds.push({ label: 'Cible déclarée (pas un seuil certifié)', value: raw.ftp_target, channel: 'watts' });
    const declaredDate = raw.testDate;
    return [{ id: test.id, name: test.name, sport, date: validTestDate(declaredDate) ? declaredDate : test.date.slice(0, 10), protocol: text(raw.protocolId) ?? text(raw.protocol) ?? text(raw.dayKey), sensor: text(raw.sensor) ?? text(raw.device), points, axis, channels, thresholds, measures: fields.flatMap(([key, label, unit]) => number(raw[key]) && (raw[key] as number) > 0 ? [{ label, value: raw[key] as number, unit }] : []) }];
  }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function compatibleTestCurves(a: TestCurve, b: TestCurve, channel: TestChannel): boolean {
  return a.sport === b.sport && a.axis === b.axis && a.protocol != null && a.protocol === b.protocol && a.channels.includes(channel) && b.channels.includes(channel);
}
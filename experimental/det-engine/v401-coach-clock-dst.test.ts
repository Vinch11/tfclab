import { describe, expect, it } from 'vitest';
import { clockFor, clockProblems, resolveLocalInstant, isRealYmd } from './v401-coach-inputs-core';

const TZ = 'Europe/Brussels';
const localOf = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

describe('V401 horaires coach — instant réel, sans décalage silencieux', () => {
  it('2027-03-28 01:00 reste 01:00 locale (offset +60, ancien défaut : 00:00)', () => {
    const r = resolveLocalInstant(TZ, '2027-03-28', 60);
    expect(r).toMatchObject({ status: 'ok', utcOffsetMinutes: 60 });
    if (r.status === 'ok') expect(localOf(r.utcIso)).toBe('2027-03-28 01:00');
  });
  it('2027-10-31 01:00 reste 01:00 locale (offset +120, ancien défaut : 02:00)', () => {
    const r = resolveLocalInstant(TZ, '2027-10-31', 60);
    expect(r).toMatchObject({ status: 'ok', utcOffsetMinutes: 120 });
    if (r.status === 'ok') expect(localOf(r.utcIso)).toBe('2027-10-31 01:00');
  });
  it('aller-retour local→UTC→local sur toute une année, chaque créneau non ambigu', () => {
    for (let d = 0; d < 365; d++) for (const minute of [0, 60, 150, 360, 1080, 1439]) {
      const ymd = new Date(Date.UTC(2027, 0, 1 + d)).toISOString().slice(0, 10);
      const r = resolveLocalInstant(TZ, ymd, minute);
      if (r.status !== 'ok') continue;
      expect(localOf(r.utcIso)).toBe(`${ymd} ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
    }
  });
  it('heure inexistante (02:30 le 28 mars) ⇒ refus', () => {
    expect(resolveLocalInstant(TZ, '2027-03-28', 150).status).toBe('nonexistent');
  });
  it('heure ambiguë (02:30 le 31 octobre) ⇒ refus sans choix explicite, choix respecté sinon', () => {
    expect(resolveLocalInstant(TZ, '2027-10-31', 150)).toEqual({ status: 'ambiguous', utcOffsetsMinutes: [120, 60] });
    const start = '2027-10-25'; // lundi ; dimanche = index 6 = 31/10
    const base = { timeZone: TZ, minutesBySport: { run: [null, null, null, null, null, null, 150] } };
    expect(clockFor(base, start)({ week: 1, dayIndex: 6, sport: 'run' })).toBeNull();
    expect(clockProblems(base, start, 1)).toEqual([expect.stringMatching(/2027-10-31 02:30 : heure ambiguë/)]);
    const chosen = { ...base, ambiguousChoices: { '2027-10-31': 'second' as const } };
    expect(clockFor(chosen, start)({ week: 1, dayIndex: 6, sport: 'run' })).toEqual({ provenance: 'coach_confirmed', minuteOfDay: 150, utcOffsetMinutes: 60 });
    expect(clockProblems(chosen, start, 1)).toEqual([]);
  });
  it('créneau inexistant listé précisément par clockProblems', () => {
    const c = { timeZone: TZ, minutesBySport: { run: [null, null, null, null, null, null, 150] } };
    expect(clockProblems(c, '2027-03-22', 1)).toEqual([expect.stringMatching(/run 2027-03-28 02:30 : heure inexistante/)]);
  });
  it('date ou fuseau invalides ⇒ refus', () => {
    expect(isRealYmd('2027-02-30')).toBe(false);
    expect(resolveLocalInstant(TZ, '2027-02-30', 60).status).toBe('invalid');
    expect(clockProblems({ timeZone: TZ, minutesBySport: {} }, '2027-02-30', 1)).toEqual(['date de début invalide']);
    expect(clockProblems({ timeZone: 'Mars/Olympus', minutesBySport: {} }, '2027-03-01', 1)[0]).toMatch(/fuseau horaire invalide/);
  });
});

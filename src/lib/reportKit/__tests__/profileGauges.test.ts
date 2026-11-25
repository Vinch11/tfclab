import { describe, expect, it } from 'vitest';
import { extraGauges, gaugeSentence, swimGauge } from '../profileGauges';
import { garminBoxHTML } from '../garminBox';
import { metricSourceLabel } from '../../coachingCompass/presentation';
import type { FactorRow } from '../../coachingCompass/factorStates';

const snap = { id: 's', athlete_id: 'a', date: '2026-11-25', source: 'manual', ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, css: 110, fc_max: 192, fc_repos: 48, weight_kg: null, critical_metrics: null };
const d = { athlete: { id: 'a', goal: 'IM' }, ambition: { current: 'competitor' }, effectiveSnapshot: snap, effectiveRefs: { ftp: 188, vma: 13, fcMax: 192, css: 110 }, tests: [] };
const vmaRow = { key: 'vma', label: 'VMA', unit: 'km/h', value: 13, zone: { low: 13.9, high: 15.5, point: null }, tier: 'measured', state: 'below', basis: null, evidence: [], engineNote: null } as FactorRow;

describe('Ton profil en un regard : cadrans complémentaires', () => {
  it('vélo : intensité de course visée en % de la CP ; W/kg et durabilité à mesurer avec le test qui les donne', () => {
    const r = extraGauges(d, 'bike', [], true);
    expect(r.gauges.map(g => g.row.key)).toEqual(['racePct']);
    expect(r.pending.map(p => p.need)).toEqual(['Poids dans la fiche athlète', 'Durability Day vélo, ou 2 sorties longues dans Nolio']);
  });
  it('course : seuil en allure et en % de la VMA', () => {
    const r = extraGauges(d, 'run', [vmaRow], true);
    const thr = r.gauges.find(g => g.row.key === 'thresholdSpeed')!;
    expect(thr.display!(thr.row.value!)).toBe('5:05/km');
    expect(Math.round(r.gauges.find(g => g.row.key === 'thresholdPctVma')!.row.value!)).toBe(91);
  });
  it('natation : CSS affichée en allure /100 m', () => {
    const g = swimGauge(d, true)!;
    expect(g.display!(g.row.value!)).toBe('1:50/100 m');
  });
  it('chaque repère a sa phrase pédagogique', () => {
    for (const key of ['vo2max', 'vlamax', 'tte', 'ftpkg', 'vma', 'racePct', 'durability', 'thresholdSpeed', 'thresholdPctVma', 'css'])
      expect(gaugeSentence(key, 'run', true).length).toBeGreaterThan(30);
  });
});

describe('VLamax et zones Garmin', () => {
  it('la VLamax des tests de terrain s’affiche « Mesure TFCL » ; une mesure labo reste « Labo »', () => {
    expect(metricSourceLabel('estimation', 'vlamax')).toContain('Mesure TFCL');
    expect(metricSourceLabel('test_labo', 'vlamax')).toBe('🧪 Labo');
    expect(metricSourceLabel('estimation')).toBe('📐 Estimation');
  });
  it('encadré Garmin : 5 zones avec puissance et FC', () => {
    const zones = [1, 2, 3, 4, 5].map(n => ({ n, color: ['gris', 'bleu', 'vert', 'orange', 'rouge'][n - 1], tfcl: 'Z' + n, hr: [100 + n * 10, 110 + n * 10], min: n === 1 ? 0 : 100 + n * 20, max: n === 5 ? null : 120 + n * 20 })) as never;
    const html = garminBoxHTML(zones, 'bike', true);
    expect(html.match(/<tr><td>/g)?.length).toBe(5);
    expect(html).toContain('Zones Garmin · vélo');
    expect(html).toContain('ta montre');
  });
});

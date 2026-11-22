import { describe, expect, it } from 'vitest';
import { buildExpressEdition } from './expressEdition';

describe('rapports Express', () => {
  const profile = { name: 'Camille', goal: 'Marathon', ambition: 'Finisher', date: '2026-11-17',
    logo: '', sport: 'run' as const, snapshot: { fc_max: 185, weight_kg: null }, calendar: [],
    evidence: '<section id="staff-evidence">Note réservée au coach</section>' };
  it('raconte le point de départ et le contrôle sans inventer de limiteur ni de programme', () => {
    const html = buildExpressEdition({ ...profile, coach: false });
    expect(html).toContain('185 bpm');
    expect(html).toContain('À renseigner');
    expect(html).toContain('Aucune séance à venir');
    expect(html).toContain('Au prochain bilan');
    expect(html).not.toMatch(/Note réservée au coach|Bloc ciblé par le moteur/);
  });
  it('conserve les sources privées dans le rapport coach et signale un calendrier inaccessible', () => {
    const html = buildExpressEdition({ ...profile, coach: true, calendar: null });
    expect(html).toContain('Note réservée au coach');
    expect(html).toContain('n’a pas pu être lu');
    expect(html).not.toContain('Aucune séance à venir');
  });
});

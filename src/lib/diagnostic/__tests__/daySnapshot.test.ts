import { describe, expect, it, vi } from 'vitest';
import { campaignBase, completeDaySnapshot, saveDaySnapshot, CAMPAIGN_DAYS } from '../daySnapshot';

const bikeDay = {
  id: 'bike', athlete_id: 'a1', date: '2026-11-10', source: 'bike_track_day', created_at: '2026-11-10T10:00:00Z',
  ftp: 241, map5min_w: 300, pmax_5s: 900, weight_kg: 60, vlamax: 0.35, vlamax_source: 'estimated',
  field_sources: { ftp: { source: 'cp_test', protocol: 'Bike Day' } },
  critical_metrics: { cycling: { critical: 250, reserve: 18000, status: 'confirmed', efforts: [], warnings: [], latestEffortDate: '2026-11-10' } },
};

describe('bilan de campagne des Days', () => {
  it('le Track Day complète le bilan du Bike Day : valeurs vélo, CP et provenance conservées', () => {
    const day = { athlete_id: 'a1', date: '2026-11-12', source: 'track_day', vma: 14, pace_threshold_sec_per_km: 300,
      field_sources: { pace_threshold_sec_per_km: { source: 'track_day_cs' } },
      critical_metrics: { trackDay: { sec1500: 400 }, running: { critical: 3.3, reserve: 150, status: 'confirmed', efforts: [], warnings: [], latestEffortDate: '2026-11-12' } } };
    const base = campaignBase([bikeDay], 'a1', null, day.date);
    const { payload, carried } = completeDaySnapshot(day as never, base);
    expect(payload).toMatchObject({ vma: 14, ftp: 241, map5min_w: 300, pmax_5s: 900, vlamax: 0.35, vlamax_source: 'estimated' });
    expect(Object.keys(payload.critical_metrics as object).sort()).toEqual(['cycling', 'running', 'trackDay']);
    expect(payload.field_sources).toEqual({ ftp: { source: 'cp_test', protocol: 'Bike Day' }, pace_threshold_sec_per_km: { source: 'track_day_cs' } });
    expect(carried).toEqual(expect.arrayContaining(['ftp', 'map5min_w', 'weight_kg']));
  });

  it("une FTP saisie sans provenance n'hérite pas de celle de l'ancienne, ni la VLamax de sa source", () => {
    const day = { athlete_id: 'a1', date: '2026-11-12', source: 'tri_test_day', ftp: 230, vlamax: 0.4 };
    const { payload } = completeDaySnapshot(day as never, bikeDay as never);
    expect(payload.ftp).toBe(230);
    expect(payload.field_sources).toBeUndefined();
    expect(payload.vlamax_source).toBeUndefined();
  });

  it('pas de reprise au-delà de la campagne ni depuis un bilan postérieur', () => {
    expect(campaignBase([bikeDay], 'a1', null, '2027-02-01')).toBeNull();
    expect(campaignBase([bikeDay], 'a1', null, '2026-11-01')).toBeNull();
    expect(CAMPAIGN_DAYS).toBe(42);
  });

  it('enregistre puis active le bilan créé', async () => {
    const addSnapshot = vi.fn(async () => ({ id: 'new' }));
    const setActiveSnapshot = vi.fn(async () => true);
    const res = await saveDaySnapshot({ day: { athlete_id: 'a1', date: '2026-11-12', source: 'swim_pool_day', css: 95 } as never,
      snapshots: [bikeDay], activeSnapshotId: 'bike', addSnapshot, setActiveSnapshot });
    expect(addSnapshot).toHaveBeenCalledWith(expect.objectContaining({ css: 95, ftp: 241 }));
    expect(setActiveSnapshot).toHaveBeenCalledWith('a1', 'new');
    expect(res.activated).toBe(true);
  });
});

describe("TTE reprise quand un Day change le seuil", () => {
  it("FTP recalibrée de plus de 5 % : la TTE reprise sort des calculs", async () => {
    const { completeDaySnapshot } = await import("../daySnapshot");
    const base = { id: "b", athlete_id: "a", date: "2026-11-12", source: "manual", ftp: 210, tte_observed_min: 19 } as never;
    const { payload } = completeDaySnapshot({ athlete_id: "a", date: "2026-11-25", source: "bike_track_day", ftp: 188 } as never, base);
    const p = payload as Record<string, unknown>;
    expect(p.tte_observed_min).toBeNull();
    expect((p.field_sources as Record<string, { value: number; refW: number }>).tte_observed_min_record).toMatchObject({ value: 19, refW: 210 });
  });
});

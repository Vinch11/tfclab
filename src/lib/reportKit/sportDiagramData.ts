/**
 * Read-only report projection of the zones the athlete actually trains with.
 *
 * Les rapports affichent la grille des plans (Z1, Z2, Z3, Z4a, Z4b, Z5, Z6, Z7), avec les
 * watts, allures et FC calculés par `buildTargetTable` — la même table que les séances du
 * plan et l'export Nolio. Les repères physiologiques (MLSS, CP/CS, FatMax, VMA…) sont posés
 * sur cette grille avec leur source ; ils ne servent jamais de bornes. Aucun calcul de
 * prescription n'est ajouté ici.
 */
import { deriveTrainingZones, estimateRunThresholdPaceSecPerKm, type DerivedZoneSet } from '@/lib/zones/deriveTrainingZones';
import { buildTargetTable, type TargetTable, type ZoneKey, type Range } from '@/lib/plan/targetTable';
import { TRAINING_ZONES } from '@/lib/trainingZonesDefinition';
import { findMLSSPower } from '@/lib/v2/maderMetabolicModel';
import { anchoredBikeGrid, anchoredRunGrid, ANCHOR_SOURCE_LABELS, type AnchoredGrid } from '@/lib/zones/anchoredZoneGrid';
import { getObjectifLabel } from '@/types/athlete';
import { reportFieldEvidence } from './fieldEvidence';
import { garminFiveZones } from '@/lib/zones/garminZones';
import type { StoredDurability } from '@/lib/durability/longSessionDurability';
import type { ReportZoneLandmark, ReportZoneRow, ReportZoneSet } from '@/lib/athleteProfileReport/types';

type Sport = 'bike' | 'run';
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const pace = (sec: number) => {
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const ZONE_IDS = TRAINING_ZONES.map(z => z.id as ZoneKey);

type Num = number | null | undefined;
/** Champs du payload d'export lus pour les zones (même provenance que le plan). */
export interface ZonePayload {
  athlete?: { id?: string; goal?: string | null } | null;
  ambition?: { current?: string | null } | null;
  effectiveRefs?: { ftp?: Num; vma?: Num; css?: Num; fcMax?: Num; vo2max?: Num; weightKg?: Num } | null;
  effectiveSnapshot?: { date: string; athlete_id?: string; critical_metrics?: unknown; fc_repos?: Num;
    pace_threshold_sec_per_km?: Num; vlamax?: Num; vlamax_run?: Num; map5min_w?: Num; field_sources?: unknown; ftp?: Num; vma?: Num; fc_max?: Num; weight_kg?: Num; vo2max?: Num } | null;
  coachingCompass?: { profile?: { fatmax?: { value?: Num } } } | null;
  /** TTE effective (même entrée que la génération du plan) : borne la puissance de course. */
  tte?: { tte_min?: Num } | null;
}
const objectiveLabel = (goal: string | null | undefined) => getObjectifLabel((goal ?? '') as Parameters<typeof getObjectifLabel>[0]);

/** Inputs identiques à ceux du plan (AIPlanViewer / génération) pour obtenir les mêmes chiffres. */
export function reportTargetTable(payload: ZonePayload | null | undefined): TargetTable | null {
  const refs = payload?.effectiveRefs;
  const snap = payload?.effectiveSnapshot;
  if (!positive(refs?.ftp) && !positive(refs?.vma)) return null;
  try {
    return buildTargetTable({
      ftp: refs?.ftp ?? null, vma: refs?.vma ?? null, css: refs?.css ?? null, fcMax: refs?.fcMax ?? null,
      fcRest: snap?.fc_repos ?? null, paceThresholdSecPerKm: snap?.pace_threshold_sec_per_km ?? null,
      vlamax: snap?.vlamax ?? null, vlamaxRun: snap?.vlamax_run ?? null,
      vo2max: refs?.vo2max ?? null, weightKg: refs?.weightKg ?? null,
      objective: payload?.athlete?.goal ?? null, ambition: payload?.ambition?.current ?? null,
      tteMinBike: positive(payload?.tte?.tte_min) ? payload!.tte!.tte_min : null,
      snapshot: snap ?? null,
    });
  } catch {
    return null;
  }
}

/** Grille ancrée du rapport (mêmes entrées que la table des plans) — null si le sport n'est pas ancré. */
function reportGrid(payload: ZonePayload | null | undefined, table: TargetTable, sport: 'bike' | 'run'): AnchoredGrid | null {
  if (table.meta.zoneSource[sport] !== 'anchored') return null;
  const refs = payload?.effectiveRefs ?? {}, snap = payload?.effectiveSnapshot;
  if (!snap) return null;
  const input = { ...snap, ftp: refs.ftp ?? snap.ftp, vma: refs.vma ?? snap.vma, fc_max: refs.fcMax ?? snap.fc_max, weight_kg: refs.weightKg ?? snap.weight_kg, vo2max: refs.vo2max ?? snap.vo2max };
  const opts = { ambition: payload?.ambition?.current ?? null };
  return sport === 'bike' ? anchoredBikeGrid(input, opts) : anchoredRunGrid(input, opts);
}
const pctText = (x: number) => Math.round(x * 100) + ' %';
function anchoredAnchors(grid: AnchoredGrid): string[] {
  const unit = grid.sport === 'bike' ? 'CP' : 'CS';
  const crit = grid.sport === 'bike' ? `${Math.round(grid.critical)} W` : `${grid.critical.toFixed(1).replace('.', ',')} km/h`;
  return [
    `Zones ancrées sur le seuil critique (${unit}) : ${crit} · ${ANCHOR_SOURCE_LABELS[grid.source]}${grid.measured ? '' : ' (estimation)'}.`,
    `Premier seuil ≈ ${pctText(grid.firstThreshold / grid.critical)} de la ${unit} (haut de Z2) ; MLSS ≈ ${pctText(grid.mlss / grid.critical)} de la ${unit} (dans Z5).`,
    ...grid.alerts,
  ];
}

function zoneOf(ranges: Partial<Record<ZoneKey, Range>>, value: number): string | null {
  // Les bornes voisines se touchent : une valeur posée sur une borne reste dans la zone la moins
  // intense (la VMA est le haut de Z6, pas le bas de Z7).
  // Les bornes de la table sont arrondies (W, s/km) : on compare la valeur arrondie de la même façon.
  const v = Math.round(value);
  return ZONE_IDS.find(id => {
    const r = ranges[id];
    return !!r && v >= Math.min(r[0], r[1]) && v <= Math.max(r[0], r[1]);
  }) ?? null;
}

/** Une plage (puissance ou allure de course) peut chevaucher deux zones : « Z2–Z3 », de la plus facile à la plus intense. */
export function zoneSpan(ranges: Partial<Record<ZoneKey, Range>>, a: number, b: number): string | null {
  const za = zoneOf(ranges, a), zb = zoneOf(ranges, b);
  if (!za || !zb || za === zb) return za ?? zb;
  const [lo, hi] = [za, zb].sort((x, y) => ZONE_IDS.indexOf(x as ZoneKey) - ZONE_IDS.indexOf(y as ZoneKey));
  return `${lo}–${hi}`;
}

function zoneRows(table: TargetTable, sport: Sport, grid: AnchoredGrid | null = null): ReportZoneRow[] {
  const ranges = sport === 'bike' ? table.bikeZonesW : table.runPacesSecPerKm;
  const ids = ZONE_IDS.filter(id => ranges[id]);
  return ids.map((id, i) => {
    const def = TRAINING_ZONES.find(z => z.id === id)!;
    const [a, b] = ranges[id]!;
    const first = i === 0, last = i === ids.length - 1;
    let absolute: string, pctRef: string, refLabel: string;
    if (sport === 'bike') {
      // Grille ancrée : pourcentages de la CP (la base annoncée des zones), sinon de la FTP.
      const ref = grid ? grid.critical : table.ftpW!;
      const pct = (w: number) => Math.round(w / ref * 100);
      absolute = first ? `< ${b} W` : last ? `> ${a} W` : `${a}–${b} W`;
      pctRef = first ? `< ${pct(b)} %` : last ? `> ${pct(a)} %` : `${pct(a)}–${pct(b)} %`;
      refLabel = grid ? '% CP' : '% FTP';
    } else {
      // [rapide, lent] en s/km.
      // Grille ancrée : pourcentages de la vitesse critique (km/h), sinon de la VMA.
      const vma = grid ? grid.critical : table.vmaKmh;
      const pct = (sec: number) => vma ? Math.round(3600 / sec / vma * 100) : null;
      absolute = first ? `plus lent que ${pace(a)}/km` : last ? `plus rapide que ${pace(b)}/km` : `${pace(a)}–${pace(b)}/km`;
      const lo = pct(b), hi = pct(a);
      pctRef = lo == null || hi == null ? '' : first ? `< ${hi} %` : last ? `> ${lo} %` : `${lo}–${hi} %`;
      refLabel = grid ? '% CS' : '% VMA';
    }
    // Grille ancrée : FC propre au sport (un triathlète n'a pas la même FC à vélo et en course).
    const hr = (grid ? grid.zones.find(z => z.id === id)?.hr ?? null : null) ?? table.fcZonesBpm[id];
    return {
      id, label: def.label, condition: `${def.positionSeuils} · ${def.description}`,
      pctRef, refLabel, absolute,
      heartRate: hr ? `${hr[0]}–${hr[1]} bpm` : null,
      hrPct: hr && table.fcMax ? `${Math.round(hr[0] / table.fcMax * 100)}–${Math.round(hr[1] / table.fcMax * 100)} %` : null,
    };
  });
}

function bikeLandmarks(payload: ZonePayload, table: TargetTable, grid: AnchoredGrid | null = null): ReportZoneLandmark[] {
  const refs = payload?.effectiveRefs, snap = payload?.effectiveSnapshot;
  const ftp = table.ftpW;
  if (!ftp) return [];
  const out: ReportZoneLandmark[] = [];
  const add = (label: string, watts: number, source: string, shown = `${Math.round(watts)} W`, span?: [number, number]) =>
    out.push({ label, value: shown, zone: span ? zoneSpan(table.bikeZonesW, span[0], span[1]) : zoneOf(table.bikeZonesW, watts), source });
  const fatmaxPct = payload?.coachingCompass?.profile?.fatmax?.value;
  if (positive(fatmaxPct)) add('FatMax', ftp * fatmaxPct / 100, 'Estimation du modèle');
  if (table.racePowerRange) {
    const [lo, hi] = table.racePowerRange;
    // Sous Z2 (zone « récupération ») : on dit pourquoi, sinon l'athlète croit à une erreur.
    const belowZ2 = zoneSpan(table.bikeZonesW, lo, hi) === 'Z1';
    const why = !belowZ2 ? 'Repère des séances du plan'
      : table.raceBike?.limitedBy === 'tte' ? 'Volontairement sous Z2 : bornée tant que ta tenue au seuil (TTE) est courte'
      : 'Volontairement sous Z2 : de longues heures à tenir, puis la course à pied';
    add('Puissance de course · ' + objectiveLabel(payload?.athlete?.goal), (lo + hi) / 2, why, `${lo}–${hi} W`, [lo, hi]);
  }
  if (grid) {
    add('Premier seuil (estimé)', grid.firstThreshold, `≈ ${pctText(grid.firstThreshold / grid.critical)} de la CP`);
    add('MLSS (estimé)', grid.mlss, `≈ ${pctText(grid.mlss / grid.critical)} de la CP`);
  } else if (positive(snap?.vlamax) && positive(refs?.vo2max) && positive(refs?.weightKg)) {
    const mlss = findMLSSPower({ vo2max: refs.vo2max, vlamax: snap.vlamax, weight: refs.weightKg });
    if (positive(mlss)) add('MLSS', mlss, 'Modèle métabolique (VO₂max et VLamax du bilan)');
  }
  add('FTP', ftp, 'Bilan');
  const critical = reportFieldEvidence(snap).critical.cycling;
  if (critical && critical.coachReview?.verdict !== 'reject')
    add('Puissance critique (CP)', critical.critical, critical.status === 'confirmed' ? 'Confirmée par le coach' : 'Estimation non confirmée');
  if (positive(snap?.map5min_w)) add('Puissance max 5 min', snap.map5min_w, 'Bilan');
  return out;
}

function runLandmarks(payload: ZonePayload, table: TargetTable, derived: DerivedZoneSet | null, grid: AnchoredGrid | null = null): ReportZoneLandmark[] {
  const snap = payload?.effectiveSnapshot;
  const out: ReportZoneLandmark[] = [];
  const add = (label: string, secPerKm: number, source: string, shown = `${pace(secPerKm)}/km`, span?: [number, number]) =>
    out.push({ label, value: shown, zone: span ? zoneSpan(table.runPacesSecPerKm, span[0], span[1]) : zoneOf(table.runPacesSecPerKm, secPerKm), source });
  const race = objectiveLabel(payload?.athlete?.goal);
  if (table.racePaceRange) {
    const [fast, slow] = table.racePaceRange;
    add('Allure de course · ' + race, (fast + slow) / 2, 'Repère des séances du plan', `${pace(fast)}–${pace(slow)}/km`, [fast, slow]);
  } else {
    const marker = derived?.markers.find(m => m.id === 'race_specific');
    const m = marker?.absolute?.match(/^(\d+):(\d\d)–(\d+):(\d\d)\/km$/);
    if (m) add('Allure de course · ' + race, ((+m[1] * 60 + +m[2]) + (+m[3] * 60 + +m[4])) / 2,
      'Calculée depuis ton allure au seuil', `${m[1]}:${m[2]}–${m[3]}:${m[4]}/km`, [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]);
  }
  if (grid) {
    add('Premier seuil (estimé)', 3600 / grid.firstThreshold, `≈ ${pctText(grid.firstThreshold / grid.critical)} de la CS`);
    add('MLSS (estimé)', 3600 / grid.mlss, `≈ ${pctText(grid.mlss / grid.critical)} de la CS`);
  }
  if (positive(snap?.pace_threshold_sec_per_km)) add('Allure au seuil', snap.pace_threshold_sec_per_km, 'Bilan');
  const critical = reportFieldEvidence(snap).critical.running;
  if (critical && critical.coachReview?.verdict !== 'reject')
    add('Vitesse critique (CS)', 1000 / critical.critical, critical.status === 'confirmed' ? 'Confirmée par le coach' : 'Estimation non confirmée');
  if (table.vmaKmh) add('VMA', 3600 / table.vmaKmh, 'Bilan');
  return out;
}

/** Same zones as the athlete's plan sessions; physiological landmarks placed on them. */
export function reportSportZoneSets(payload: any): ReportZoneSet[] {
  const refs = payload?.effectiveRefs;
  const snap = payload?.effectiveSnapshot;
  const table = reportTargetTable(payload);
  if (!table) return [];
  const goal = payload?.athlete?.goal ?? null;
  const sets: ReportZoneSet[] = [];
  if (table.ftpW) {
    // Ancres et provenance : même dérivation que la table du plan.
    const derived = deriveTrainingZones({ sport: 'bike', ftp: table.ftpW, fcMax: refs?.fcMax ?? null, fcRest: snap?.fc_repos ?? null,
      vlamax: snap?.vlamax ?? null, vo2max: refs?.vo2max ?? null, weightKg: refs?.weightKg ?? null, raceObjective: goal });
    const race = table.racePowerRange;
    const grid = reportGrid(payload, table, 'bike');
    sets.push({
      sportLabel: 'Vélo', source: table.meta.zoneSource.bike === 'standard' ? 'standard' : 'derived', confidence: derived.confidence, anchors: grid ? anchoredAnchors(grid) : derived.anchors ?? [],
      summary: grid ? `Tes zones partent de ton seuil critique à vélo : ${Math.round(grid.critical)} W.${grid.measured ? '' : ' Un test le confirmera.'}` : undefined,
      fallbackReason: derived.fallbackReason, zones: zoneRows(table, 'bike', grid), landmarks: bikeLandmarks(payload, table, grid),
      ...(grid ? { critical: grid.critical, garmin: garminFiveZones(grid, refs?.fcMax ?? null) } : {}),
      markers: race ? [{ id: 'race_specific', label: 'Puissance de course', absolute: `${race[0]}–${race[1]} W` }] : [],
    });
  }
  if (table.vmaKmh) {
    const threshold = snap?.pace_threshold_sec_per_km ?? estimateRunThresholdPaceSecPerKm(table.vmaKmh, null);
    const derived = deriveTrainingZones({ sport: 'run', vma: table.vmaKmh, paceThresholdSecPerKm: threshold ?? null,
      paceThresholdEstimated: !positive(snap?.pace_threshold_sec_per_km), fcMax: refs?.fcMax ?? null, fcRest: snap?.fc_repos ?? null,
      vlamax: snap?.vlamax_run ?? snap?.vlamax ?? null, vo2max: refs?.vo2max ?? null, weightKg: refs?.weightKg ?? null, raceObjective: goal });
    const grid = reportGrid(payload, table, 'run');
    sets.push({
      sportLabel: 'Course à pied', source: table.meta.zoneSource.run === 'standard' ? 'standard' : 'derived', confidence: derived.confidence, anchors: grid ? anchoredAnchors(grid) : derived.anchors ?? [],
      summary: grid ? `Tes zones partent de ta vitesse critique en course : ${pace(3600 / grid.critical)}/km.${grid.measured ? '' : ' Un test la confirmera.'}` : undefined,
      fallbackReason: derived.fallbackReason, zones: zoneRows(table, 'run', grid), landmarks: runLandmarks(payload, table, derived, grid),
      ...(grid ? { critical: grid.critical, garmin: garminFiveZones(grid, refs?.fcMax ?? null) } : {}),
    });
  }
  return sets;
}

export function reportSportDurability(payload: any): StoredDurability {
  const snapshot = payload?.effectiveSnapshot;
  if (!snapshot || (payload.athlete?.id && snapshot.athlete_id !== payload.athlete.id)) return {};
  return reportFieldEvidence(snapshot).durability;
}

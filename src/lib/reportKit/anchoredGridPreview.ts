/**
 * Aperçu coach : grille actuelle des plans contre grille ancrée sur le seuil critique.
 * Affichage seul, tant que ZONE_GRID_MODE vaut "current" ; sert à vérifier la grille
 * corrigée sur de vrais athlètes avant activation.
 */
import { buildTargetTable, type ZoneKey } from '@/lib/plan/targetTable';
import { anchoredBikeGrid, anchoredRunGrid, ANCHOR_SOURCE_LABELS, ANCHORED_ZONE_IDS, type AnchoredGrid } from '@/lib/zones/anchoredZoneGrid';
import { ZONE_GRID_MODE } from '@/lib/zones/zoneGridConfig';
import { reportTargetTable, type ZonePayload } from './sportDiagramData';
import { esc } from './index';

const pace = (sec: number) => `${Math.floor(Math.round(sec) / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;

function cell(grid: AnchoredGrid, id: ZoneKey): string {
  const z = grid.zones.find(x => x.id === id);
  if (!z) return '—';
  if (grid.sport === 'bike') return z.max == null ? `> ${Math.round(z.min)} W` : z.min <= 0 ? `< ${Math.round(z.max)} W` : `${Math.round(z.min)}–${Math.round(z.max)} W`;
  return z.max == null ? `plus rapide que ${pace(3600 / z.min)}/km` : z.min <= 0 ? `plus lent que ${pace(3600 / z.max)}/km` : `${pace(3600 / z.max)}–${pace(3600 / z.min)}/km`;
}

function current(range: [number, number] | undefined, sport: 'bike' | 'run', first: boolean, last: boolean): string {
  if (!range) return '—';
  if (sport === 'bike') return first ? `< ${range[1]} W` : last ? `> ${range[0]} W` : `${range[0]}–${range[1]} W`;
  return first ? `plus lent que ${pace(range[0])}/km` : last ? `plus rapide que ${pace(range[1])}/km` : `${pace(range[0])}–${pace(range[1])}/km`;
}

function sportBlock(label: string, grid: AnchoredGrid, table: ReturnType<typeof buildTargetTable>, threshold: number | null | undefined): string {
  const ranges = grid.sport === 'bike' ? table.bikeZonesW : table.runPacesSecPerKm;
  const critical = grid.sport === 'bike' ? `${Math.round(grid.critical)} W` : `${grid.critical.toFixed(1)} km/h (${pace(3600 / grid.critical)}/km)`;
  const fromThreshold = grid.source !== 'critical_confirmed' && grid.source !== 'vma_estimate';
  const basis = grid.sport === 'bike'
    ? (fromThreshold && threshold ? ` = FTP du bilan ${Math.round(threshold)} W ÷ 0,965 (la FTP reste dans Z5)` : '')
    : (fromThreshold && threshold ? ` = allure seuil du bilan ${pace(threshold)}/km × 1,01 (l'allure seuil reste dans Z5)` : grid.source === 'vma_estimate' ? ' = VMA × % du niveau (calculateur TFCL)' : '');
  const rows = ANCHORED_ZONE_IDS.map((id, i) => {
    const z = grid.zones.find(x => x.id === id);
    return `<tr><td>${id}</td><td>${esc(current(ranges[id as ZoneKey], grid.sport, i === 0, i === ANCHORED_ZONE_IDS.length - 1))}</td><td><b>${esc(cell(grid, id as ZoneKey))}</b></td><td>${z?.hr ? (i === 0 ? `< ${z.hr[1]} bpm` : `${z.hr[0]}–${z.hr[1]} bpm`) : '—'}</td></tr>`;
  }).join('');
  return `<h3>${esc(label)}</h3>
    <p>Haut de Z5 (${grid.sport === 'bike' ? 'CP' : 'CS'}${grid.source === 'critical_confirmed' ? '' : ' estimée'}) : <b>${esc(critical)}</b>${esc(basis)} · ${esc(ANCHOR_SOURCE_LABELS[grid.source])}${grid.measured ? '' : ' · <b>estimation</b>'}</p>
    <table><thead><tr><th>Zone</th><th>Grille actuelle des plans</th><th>Grille corrigée</th><th>FC corrigée</th></tr></thead><tbody>${rows}</tbody></table>
    ${grid.alerts.length ? `<ul>${grid.alerts.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p>Aucune alerte sur les valeurs du bilan utilisées par cette grille.</p>'}`;
}

/** Section HTML du rapport coach ; vide si la grille ancrée est déjà active ou incalculable. */
export function anchoredGridPreviewHTML(payload: ZonePayload | null | undefined): string {
  if (ZONE_GRID_MODE === 'anchored') return '';
  const table = reportTargetTable(payload);
  const snap = payload?.effectiveSnapshot;
  if (!table || !snap) return '';
  const refs: NonNullable<ZonePayload['effectiveRefs']> = payload?.effectiveRefs ?? {};
  const input = { ...snap, ftp: refs.ftp ?? snap.ftp, vma: refs.vma ?? snap.vma, fc_max: refs.fcMax ?? snap.fc_max, weight_kg: refs.weightKg ?? snap.weight_kg, vo2max: refs.vo2max ?? snap.vo2max };
  const opts = { ambition: payload?.ambition?.current ?? null };
  const bike = table.ftpW ? anchoredBikeGrid(input, opts) : null;
  const run = table.vmaKmh ? anchoredRunGrid(input, opts) : null;
  if (!bike && !run) return '';
  return `<section class="edition-section" id="grille-corrigee"><h2>Grille corrigée — aperçu, non activée</h2>
    <p>Mêmes zones Z1–Z7, limites ancrées sur le seuil critique (CP vélo, CS course) calculé depuis le bilan. Les plans utilisent toujours la grille actuelle. Comparer les deux colonnes avec le ressenti et les données de séance de l'athlète.</p>
    ${bike ? sportBlock('Vélo', bike, table, input.ftp) : ''}${run ? sportBlock('Course à pied', run, table, input.pace_threshold_sec_per_km) : ''}</section>`;
}

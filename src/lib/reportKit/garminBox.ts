/**
 * Encadré « Zones Garmin » des rapports : les 5 zones à recopier dans la montre,
 * mêmes chiffres et mêmes couleurs que la carte du tableau de bord.
 */
import type { GarminZone } from '@/lib/zones/garminZones';
// esc local : garminBox est importé par pedagogy (CSS au chargement), sans dépendre de ./index.
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

const COLOR: Record<GarminZone['color'], [string, string]> = {
  gris: ['#a1a1aa', 'Gris'], bleu: ['#0ea5e9', 'Bleu'], vert: ['#10b981', 'Vert'], orange: ['#f97316', 'Orange'], rouge: ['#dc2626', 'Rouge'],
};
const pace = (kmh: number) => { const s = Math.round(3600 / kmh); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function intensity(sport: 'bike' | 'run', z: GarminZone): string {
  if (sport === 'bike') return z.max == null ? `> ${Math.round(z.min)} W` : z.min <= 0 ? `< ${Math.round(z.max)} W` : `${Math.round(z.min)}–${Math.round(z.max)} W`;
  return z.max == null ? `plus vite que ${pace(z.min)}/km` : z.min <= 0 ? `plus lent que ${pace(z.max)}/km` : `${pace(z.max)}–${pace(z.min)}/km`;
}

export const GARMIN_BOX_CSS = `
.garmin-box{border:1px solid #cadde9;border-radius:14px;padding:12px 14px;margin:14px 0;background:#f7fbfe;break-inside:avoid}
.garmin-box h3{font-size:15px;margin:0 0 4px}.garmin-box p{font-size:12px;color:#3d5a70;margin:4px 0}
.garmin-box table{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
.garmin-box th{text-align:left;font-weight:600;color:#56708a;padding:4px 6px 4px 0}.garmin-box td{border-top:1px solid #dbe7ef;padding:5px 6px 5px 0}
.garmin-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}`;

export function garminBoxHTML(zones: GarminZone[] | undefined, sport: 'bike' | 'run', athlete: boolean): string {
  if (!zones?.length) return '';
  const hasHr = zones.some(z => z.hr);
  return `<div class="garmin-box" data-garmin="${sport}"><h3>Zones Garmin · ${sport === 'bike' ? 'vélo' : 'course à pied'}</h3>
    <p>${athlete ? 'À recopier dans ta montre' : 'À recopier dans la montre de l’athlète'} (5 zones, ${sport === 'bike' ? 'puissance' : 'allure'}${hasHr ? ' et fréquence cardiaque' : ''}). Bleu → vert : premier seuil. Orange → rouge : seuil critique.</p>
    <table><thead><tr><th>Zone</th>${hasHr ? '<th>FC (bpm)</th>' : ''}<th>${sport === 'bike' ? 'Puissance' : 'Allure'}</th><th>Zones TFCL</th></tr></thead><tbody>
    ${zones.map(z => `<tr><td><span class="garmin-dot" style="background:${COLOR[z.color][0]}"></span>${z.n} · ${COLOR[z.color][1]}</td>${hasHr ? `<td>${z.hr ? (z.n === 1 ? `&lt; ${z.hr[1]}` : `${z.hr[0]}–${z.hr[1]}`) : '—'}</td>` : ''}<td>${esc(intensity(sport, z))}</td><td>${esc(z.tfcl)}</td></tr>`).join('')}
    </tbody></table>
    <p>Intervalles courts (orange, rouge) : ${athlete ? 'suis' : 'suivre'} ${sport === 'bike' ? 'la puissance' : 'l’allure'}, pas la FC, qui met 1 à 2 minutes à monter.</p></div>`;
}

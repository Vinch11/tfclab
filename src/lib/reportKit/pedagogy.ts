/** Detailed personal sport diagrams: resolved zones, energy markers and stored long sessions only. */
import { esc, num, RK } from './index';
import { metricSourceLabel } from '../coachingCompass/presentation';
import type { DurabilitySport, StoredDurabilitySport } from '../durability/longSessionDurability';

export interface PersonalComparison {
  key?: string;
  label: string;
  value: number | null;
  target?: number | null;
  unit: string;
  source?: string;
}

export interface SportDiagramZone {
  id: string;
  label: string;
  condition: string;
  absolute: string | null;
  heartRate: string | null;
  pctRef?: string;
  refLabel?: string;
}

export interface SportDiagramInput {
  sport: DurabilitySport;
  comparisons: PersonalComparison[];
  tte: PersonalComparison[];
  zones: SportDiagramZone[];
  durability?: StoredDurabilitySport | null;
}

export const PEDAGOGY_CSS = `
.sport-diagram{margin:22px 0;break-inside:auto;border:1px solid ${RK.line};border-radius:18px;background:${RK.surface};overflow:hidden}
.diagram-heading{padding:18px 20px 14px;border-bottom:1px solid ${RK.line};background:${RK.primarySoft}}
.diagram-heading .diagram-kicker{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:${RK.primary};font-weight:600}
.diagram-heading h3{font-size:22px;line-height:1.25;margin:4px 0 0;color:${RK.ink}}
.diagram-block{padding:18px 20px;border-bottom:1px solid ${RK.line};break-inside:avoid}
.diagram-block:last-child{border-bottom:0}
.diagram-block h4{font-size:15px;line-height:1.35;margin:0 0 4px;color:${RK.ink}}
.diagram-intro{font-size:11px;line-height:1.55;color:${RK.muted};margin:0 0 14px}
.energy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.energy-marker{min-width:0;padding:12px 13px;border-radius:12px;background:${RK.paper};border-top:3px solid ${RK.primary}}
.energy-marker .energy-label{font-size:11px;line-height:1.4;color:${RK.inkSoft};font-weight:600;min-height:31px}
.energy-value{font-size:27px;line-height:1.2;color:${RK.ink};font-weight:600;margin-top:7px;font-variant-numeric:tabular-nums}
.energy-value small{font-size:11px;color:${RK.muted};font-weight:400}
.energy-target{font-size:10.5px;line-height:1.5;color:${RK.mint};margin-top:5px}
.energy-meaning{font-size:10.5px;line-height:1.5;color:${RK.muted};margin-top:6px}
.energy-source{font-size:9px;line-height:1.4;color:${RK.faint};margin-top:6px}
.zone-direction{display:flex;align-items:center;gap:8px;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:${RK.faint};margin:12px 0 8px}
.zone-direction span:nth-child(2){height:1px;background:${RK.line};flex:1}
.zone-head,.zone-row{display:grid;grid-template-columns:42px minmax(150px,1.25fr) minmax(130px,1fr) minmax(95px,.7fr);gap:10px;align-items:center}
.zone-head{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:${RK.faint};padding:0 10px 6px}
.zone-row{padding:10px;border-top:1px solid ${RK.lineSoft};min-height:56px}
.zone-id{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:${RK.surface};font-size:11px;font-weight:700}
.zone-name{font-size:12px;line-height:1.35;color:${RK.ink};font-weight:600}
.zone-condition{font-size:10px;line-height:1.4;color:${RK.muted};margin-top:2px}
.zone-absolute{font-size:14px;line-height:1.35;color:${RK.ink};font-weight:600;overflow-wrap:anywhere}
.zone-reference{font-size:9px;line-height:1.4;color:${RK.faint};margin-top:2px}
.zone-hr{font-size:12px;line-height:1.4;color:${RK.inkSoft};font-variant-numeric:tabular-nums}
.zone-hr small{display:block;font-size:9px;color:${RK.faint}}
.tte-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:14px}
.tte-marker{padding:12px 14px;border:1px solid ${RK.line};border-radius:12px;background:${RK.paper}}
.tte-label{font-size:11px;color:${RK.inkSoft};font-weight:600}
.tte-numbers{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:5px}
.tte-numbers strong{font-size:26px;color:${RK.ink};font-variant-numeric:tabular-nums}
.tte-numbers span{font-size:11px;color:${RK.mint}}
.tte-gap{font-size:10.5px;color:${RK.muted};margin-top:3px}
.tte-track{height:8px;border-radius:4px;background:${RK.surfaceAlt};position:relative;margin-top:12px}
.tte-track .tte-target{position:absolute;top:-3px;width:2px;height:14px;background:${RK.mint}}
.tte-track .tte-value{position:absolute;top:-4px;width:12px;height:16px;border-radius:4px;background:${RK.primary};transform:translateX(-6px)}
.durability-summary{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:10px 0 4px}
.durability-summary strong{font-size:29px;line-height:1.2;color:${RK.ink}}
.durability-summary span{font-size:11px;color:${RK.muted}}
.durability-session{padding:12px 0;border-top:1px solid ${RK.lineSoft}}
.durability-session-head{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:${RK.inkSoft};margin-bottom:8px}
.durability-session-head strong{color:${RK.ink}}
.durability-pair{display:grid;grid-template-columns:minmax(105px,.7fr) minmax(0,1.5fr) minmax(75px,.5fr);gap:9px;align-items:center;margin:6px 0;font-size:10px}
.durability-pair>span:first-child{color:${RK.muted}}
.durability-pair>strong{text-align:right;font-size:11px;color:${RK.ink};font-variant-numeric:tabular-nums}
.durability-track{height:12px;background:${RK.surfaceAlt};border-radius:3px;overflow:hidden}
.durability-track>span{display:block;height:100%;background:${RK.primary};border-radius:3px}
.durability-pair.late .durability-track>span{background:${RK.amber}}
.diagram-note{font-size:10px;line-height:1.55;color:${RK.muted};margin:10px 0 0}
.diagram-source{font-size:9px;color:${RK.faint};margin-top:5px}
@media screen and (max-width:640px){
  .diagram-heading,.diagram-block{padding:15px 14px}.diagram-heading h3{font-size:20px}
  .energy-grid,.tte-grid{grid-template-columns:1fr}.energy-marker .energy-label{min-height:0}.energy-value{font-size:26px}
  .zone-head{display:none}.zone-row{grid-template-columns:38px minmax(0,1fr);gap:8px;padding:11px 4px}
  .zone-row>div:nth-child(3){grid-column:2;min-width:0}.zone-absolute{font-size:16px;white-space:normal}.zone-hr{grid-column:2}.zone-hr small{display:inline;margin-left:5px}
  .durability-pair{grid-template-columns:92px minmax(0,1fr) 70px;gap:6px}.durability-session-head{flex-wrap:wrap}
}
`;

const ZONE_COLORS = [RK.faint, RK.mint, RK.primary, RK.amber, RK.danger, RK.ink] as const;
const known = (r: PersonalComparison) => r.value != null && Number.isFinite(r.value) && r.value > 0;
const decimalsFor = (unit: string) => unit === 'min' ? 0 : ['mmol/L/s', 'W/kg'].includes(unit) ? 2 : 1;
const display = (r: PersonalComparison, value: number) => `${num(value, decimalsFor(r.unit))} ${esc(r.unit)}`;

function energyMeaning(key: string | undefined, sport: DurabilitySport): string {
  switch (key) {
    case 'vo2max': return 'Plafond d’utilisation de l’oxygène, commun aux deux sports.';
    case 'vlamax': return sport === 'bike' ? 'Production rapide de lactate : elle influence la dépense de sucre à vélo.' : 'Production rapide de lactate propre à la course lorsqu’elle est enregistrée.';
    case 'ftpkg': return 'Puissance de seuil rapportée au poids : un repère du coup de pédale.';
    case 'fatmax': return 'Intensité vélo où l’oxydation des graisses est maximale ; jamais convertie en allure.';
    case 'vma': return 'Vitesse de référence pour régler les efforts intenses en course.';
    default: return sport === 'bike' ? 'Repère personnel enregistré pour le vélo.' : 'Repère personnel enregistré pour la course.';
  }
}

function energyHTML(input: SportDiagramInput): string {
  const rows = input.comparisons.filter(r => r.key !== 'tte' && known(r));
  if (!rows.length) return '';
  return `<div class="diagram-block energy-block"><h4>Énergie · tes repères physiologiques</h4><p class="diagram-intro">Les chiffres ci-dessous viennent du bilan affiché dans ton compass. La cible, lorsqu’elle existe, est reprise sans modification.</p><div class="energy-grid">${rows.map(r => {
    const target = r.target != null && Number.isFinite(r.target) && r.target > 0 ? r.target : null;
    return `<div class="energy-marker" data-energy="${esc(r.key ?? '')}"><div class="energy-label">${esc(r.label)}</div><div class="energy-value">${num(r.value, decimalsFor(r.unit))} <small>${esc(r.unit)}</small></div>${target != null ? `<div class="energy-target">Cible du compass : ${display(r, target)}</div>` : ''}<div class="energy-meaning">${energyMeaning(r.key, input.sport)}</div>${r.source ? `<div class="energy-source">${esc(metricSourceLabel(r.source))}</div>` : ''}</div>`;
  }).join('')}</div></div>`;
}

function zonesHTML(input: SportDiagramInput): string {
  const rows = input.zones.filter(z => (z.absolute && z.absolute !== '—') || z.pctRef);
  if (!rows.length) return '';
  const unit = input.sport === 'bike' ? 'watts' : 'allure au kilomètre';
  return `<div class="diagram-block zones-block"><h4>Zones d’effort · de la récupération à l’intensité maximale</h4><p class="diagram-intro">Chaque plage est exprimée en ${unit}, avec la fréquence cardiaque lorsqu’elle est disponible. Les zones affichées restent propres à ${input.sport === 'bike' ? 'ton vélo' : 'ta course'}.</p><div class="zone-direction"><span>Plus facile</span><span></span><span>Plus intense</span></div><div class="zone-head"><span>Zone</span><span>Ce que tu travailles</span><span>Ta plage personnelle</span><span>Cardio</span></div>${rows.map((z, i) => {
    const zoneNumber = Number(z.id.match(/\d/)?.[0] ?? i + 1);
    const color = ZONE_COLORS[Math.max(0, Math.min(ZONE_COLORS.length - 1, zoneNumber - 1))];
    return `<div class="zone-row" data-zone="${esc(z.id)}"><span class="zone-id" style="background:${color}">${esc(z.id)}</span><div><div class="zone-name">${esc(z.label)}</div><div class="zone-condition">${esc(z.condition)}</div></div><div><div class="zone-absolute">${esc(z.absolute && z.absolute !== '—' ? z.absolute : z.pctRef)}</div>${z.absolute && z.absolute !== '—' && z.pctRef ? `<div class="zone-reference">${esc(z.pctRef)}${z.refLabel ? ` · ${esc(z.refLabel)}` : ''}</div>` : z.refLabel ? `<div class="zone-reference">${esc(z.refLabel)}</div>` : ''}</div><div class="zone-hr">${z.heartRate ? esc(z.heartRate) : '—'}${z.heartRate ? '<small>fréquence cardiaque</small>' : ''}</div></div>`;
  }).join('')}</div>`;
}

function tteHTML(rows: PersonalComparison[]): string {
  const valid = rows.filter(known);
  if (!valid.length) return '';
  return `<div class="tte-grid">${valid.map(r => {
    const value = r.value ?? 0;
    const target = r.target != null && Number.isFinite(r.target) && r.target > 0 ? r.target : null;
    const max = Math.max(value, target ?? 0, 1) * 1.12;
    const gap = target == null ? 'Aucune cible définie dans le compass.' : value < target ? `${display(r, target - value)} restent pour atteindre la cible.` : value > target ? `${display(r, value - target)} au-dessus de la cible.` : 'La cible est atteinte.';
    return `<div class="tte-marker"><div class="tte-label">${esc(r.label)}</div><div class="tte-numbers"><strong>${display(r, value)}</strong>${target != null ? `<span>cible ${display(r, target)}</span>` : ''}</div><div class="tte-track" aria-hidden="true">${target != null ? `<span class="tte-target" style="left:${(target / max * 100).toFixed(2)}%"></span>` : ''}<span class="tte-value" style="left:${(value / max * 100).toFixed(2)}%"></span></div><div class="tte-gap">${gap}</div>${r.source ? `<div class="diagram-source">${esc(metricSourceLabel(r.source))}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

function durabilityHTML(sport: DurabilitySport, d?: StoredDurabilitySport | null): string {
  if (!d) return '';
  const signed = (v: number) => `${v > 0 ? '+' : ''}${num(v, 1)} %`;
  return `<div class="durability-summary"><strong>${signed(d.meanChangePct)}</strong><span>variation moyenne entre le début et la fin de ${d.sessions.length} sorties longues</span></div><p class="diagram-intro">Pour chaque sortie, le meilleur effort de 20 minutes du début est comparé à celui du dernier tiers. Les barres montrent les valeurs réellement enregistrées ; elles ne représentent pas une évolution entre les dates.</p>${d.sessions.map(s => {
    const max = Math.max(s.early, s.late, 1);
    const earlyLabel = sport === 'bike' ? `${num(s.early, 1)} W` : 'Meilleur 20 min';
    const lateLabel = sport === 'bike' ? `${num(s.late, 1)} W` : signed(s.changePct);
    return `<div class="durability-session"><div class="durability-session-head"><span><strong>${esc(s.date)}</strong> · ${esc(s.name)}</span><span>${s.durationMin} min · ${signed(s.changePct)}</span></div><div class="durability-pair"><span>Début · 20 min</span><div class="durability-track"><span style="width:${(s.early / max * 100).toFixed(2)}%"></span></div><strong>${earlyLabel}</strong></div><div class="durability-pair late"><span>Fin · 20 min</span><div class="durability-track"><span style="width:${(s.late / max * 100).toFixed(2)}%"></span></div><strong>${lateLabel}</strong></div></div>`;
  }).join('')}<p class="diagram-note">Estimation à vérifier avec ton coach : elle dépend de l’effort réellement produit en fin de sortie. En course, la vitesse brute du capteur n’est pas convertie en allure lorsque son unité n’est pas documentée.</p>`;
}

/** One detailed diagram per sport; missing values stay absent rather than becoming neutral placeholders. */
export function sportDiagramHTML(input: SportDiagramInput): string {
  const durability = durabilityHTML(input.sport, input.durability);
  const tte = tteHTML(input.tte);
  const title = input.sport === 'bike' ? 'Vélo · énergie, zones et durabilité' : 'Course · énergie, zones et durabilité';
  return `<figure class="sport-diagram" data-sport="${input.sport}"><div class="diagram-heading"><div class="diagram-kicker">Ton profil en chiffres</div><h3>${title}</h3></div>${energyHTML(input)}${zonesHTML(input)}${tte || durability ? `<div class="diagram-block durability-block"><h4>Durabilité · seuil et fin de sortie longue</h4><p class="diagram-intro">Le TTE indique le temps tenu au seuil. Les sorties longues montrent, séparément, ce que tu conserves après une charge prolongée.</p>${tte}${durability}</div>` : ''}</figure>`;
}

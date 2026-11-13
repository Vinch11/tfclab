/** Read-only diagrams: spatial layout is schematic, never a physiological scale. */
import { esc, RK } from './index';
import { getDoctrineDomain } from '../zones/tfclDoctrine';

export type DiagramSport = 'bike' | 'run';
export const PEDAGOGY_CSS = `
.didactic{margin:20px 0;padding:18px 0;border-top:1px solid ${RK.line};break-inside:avoid;color:${RK.ink}}
.didactic h3{font-size:16px;margin:0 0 6px;letter-spacing:0}
.didactic>p,.didactic figcaption{font-size:11px;line-height:1.6;color:${RK.muted};margin:6px 0}
.didactic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}
.didactic-item{border-bottom:3px solid var(--diagram-tone);padding:14px 12px;background:var(--diagram-soft);border-radius:6px}
.didactic-item b{display:block;font-size:13px;margin:8px 0 5px;color:${RK.ink}}
.didactic-item p{font-size:11px;margin:0;line-height:1.5;color:${RK.body}}
.didactic-item svg{display:block;width:66px;height:58px;color:var(--diagram-tone)}
.didactic-value{display:block;font-size:17px;font-weight:600;margin:7px 0;color:var(--diagram-tone)}
.didactic-boundaries{display:flex;justify-content:space-evenly;gap:12px;font-size:11px;color:${RK.muted}}
.didactic-axis{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${RK.muted};border-top:1px solid ${RK.line};padding-top:7px}
.didactic-pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:12px 0}
.didactic-pair>div{padding:14px;background:${RK.surface};border-left:3px solid ${RK.mint};border-radius:0 6px 6px 0}
.didactic-pair>div+div{border-color:${RK.amber}}
.didactic-pair b{display:block;font-size:13px;margin-bottom:6px}
.didactic-pair p{margin:6px 0;font-size:11px}
.zone-ribbon{display:grid;grid-template-columns:36px minmax(0,1fr) minmax(90px,auto);align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid ${RK.lineSoft};font-size:11px}
.zone-ribbon>span:first-child{font-weight:700;color:${RK.mint};text-transform:uppercase}.zone-ribbon strong{font-size:12px}.zone-ribbon small{display:block;color:${RK.muted};margin-top:3px}.zone-ribbon>span:last-child{font-weight:600;text-align:right}
@media screen and (max-width:640px){.didactic-grid{grid-template-columns:1fr}.didactic-item{display:grid;grid-template-columns:68px 1fr;column-gap:12px}.didactic-item svg{grid-row:1/5}.didactic-item b{margin-top:0}.didactic-pair{grid-template-columns:1fr}.zone-ribbon{grid-template-columns:30px minmax(0,1fr)}.zone-ribbon>span:last-child{grid-column:2;text-align:left}.didactic-boundaries{flex-wrap:wrap}}
@media print{.didactic{break-inside:avoid}.didactic-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;

const glyph = (kind: 'oxygen' | 'threshold' | 'fast') => {
  const paths = {
    oxygen: '<circle cx="33" cy="29" r="23"/><path d="M13 29h40M33 6c-15 14-15 32 0 46M33 6c15 14 15 32 0 46"/>',
    threshold: '<path d="M7 41h52M11 30h44M33 9v32M18 18h30M18 18l-10 17h20zM48 18l-10 17h20z"/>',
    fast: '<path d="M38 5L14 32h18l-4 21 24-30H34z"/>',
  };
  return `<svg viewBox="0 0 66 58" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
};
const tile = (title: string, body: string, kind: 'oxygen' | 'threshold' | 'fast', tone: 'mint' | 'amber' | 'danger', value?: string) => `<div class="didactic-item" style="--diagram-tone:${RK[tone]};--diagram-soft:${RK[`${tone}Soft`]}">${glyph(kind)}<b>${esc(title)}</b>${value ? `<span class="didactic-value">${esc(value)}</span>` : ''}<p>${esc(body)}</p></div>`;

export function effortDomainsHTML(sport: DiagramSport): string {
  const moderate = getDoctrineDomain('moderate_lt1');
  const heavy = getDoctrineDomain('tempo');
  const severe = getDoctrineDomain('vo2max');
  const bike = sport === 'bike';
  return `<figure class="didactic"><h3>${bike ? 'Quand les watts montent' : 'Quand tu accélères'}</h3><p>Trois domaines pour comprendre ce qui change dans ton corps.</p><div class="didactic-grid" data-domains="${moderate.metabolic},${heavy.metabolic},${severe.metabolic}">${tile('Endurance confortable', bike ? 'Sous LT1, tu pédales avec une respiration aisée. Tu construis ton endurance.' : 'Sous LT1, tu cours avec une respiration aisée. Tu construis ton endurance.', 'oxygen', 'mint')}${tile('Effort soutenu', 'Entre LT1 et MLSS, la respiration devient plus présente. Un équilibre reste possible, mais la fatigue augmente.', 'threshold', 'amber')}${tile('Effort intense', bike ? 'Au-dessus du MLSS, tenir ces watts devient limité dans le temps : les efforts se fractionnent.' : 'Au-dessus du MLSS, tenir cette vitesse devient limité dans le temps : les efforts se fractionnent.', 'fast', 'danger')}</div><div class="didactic-boundaries"><span>LT1 · première frontière</span><span>MLSS · limite de l’équilibre du lactate</span></div><div class="didactic-axis"><span>${bike ? 'Watts plus bas' : 'Vitesse plus basse'}</span><span aria-hidden="true">⟶</span><span>${bike ? 'Watts plus hauts' : 'Vitesse plus haute'}</span></div><figcaption>Schéma explicatif, sans échelle numérique : les largeurs ne représentent ni tes zones ni le temps que tu peux tenir.</figcaption></figure>`;
}

export function enginePedagogyHTML(sport: DiagramSport, markers: { vo2?: string; threshold?: string; vma?: string } = {}): string {
  return `<figure class="didactic"><h3>${sport === 'bike' ? 'Comprendre ton moteur vélo' : 'Comprendre ton moteur de course'}</h3><div class="didactic-grid">${tile('VO₂max · ton plafond', 'La quantité maximale d’oxygène utilisée. Un grand plafond aide, mais ne dit pas à lui seul à quelle intensité tu peux tenir.', 'oxygen', 'mint', markers.vo2)}${tile(sport === 'bike' ? 'Seuil · tes watts soutenus' : 'Seuil · ton allure soutenue', 'Un repère d’effort soutenu. Le seuil n’est pas une durée : le temps tenu se lit séparément.', 'threshold', 'amber', markers.threshold)}${tile(sport === 'bike' ? 'VLamax · la voie rapide' : 'VMA · ton repère de vitesse', sport === 'bike' ? 'Le débit maximal de la voie glycolytique, pas la force musculaire. Sa contribution change avec l’intensité.' : 'La vitesse associée au plafond aérobie dans un test de course. Elle dépend aussi du coût de ta foulée.', 'fast', 'danger', sport === 'run' ? markers.vma : undefined)}</div><figcaption>Des rôles complémentaires, pas trois notes à additionner. Les chiffres affichés reprennent les repères du bilan ; les dessins ne représentent pas une mesure.</figcaption></figure>`;
}

export function endurancePedagogyHTML(sport: DiagramSport, tte?: string): string {
  const bike = sport === 'bike';
  return `<figure class="didactic"><h3>Tenir un effort ≠ garder ses capacités</h3><div class="didactic-pair"><div><b>TTE · combien de temps au seuil ?</b><svg viewBox="0 0 260 56" width="100%" height="56" aria-hidden="true"><path d="M15 40V16h205v24" fill="none" stroke="${RK.mint}" stroke-width="3"/><path d="M15 48h220" stroke="${RK.line}"/><circle cx="220" cy="16" r="4" fill="${RK.mint}"/></svg>${tte ? `<span class="didactic-value">${esc(tte)}</span>` : ''}<p>${bike ? 'À une puissance seuil définie, combien de minutes peux-tu continuer sans interruption ?' : 'À une allure seuil définie, combien de minutes peux-tu continuer sans interruption ?'}</p></div><div><b>Durabilité · que reste-t-il après la fatigue ?</b><svg viewBox="0 0 260 56" width="100%" height="56" aria-hidden="true"><rect x="18" y="12" width="82" height="28" rx="4" fill="${RK.amberSoft}" stroke="${RK.amber}"/><path d="M113 26h34m-8-6 8 6-8 6" fill="none" stroke="${RK.amber}" stroke-width="2"/><rect x="160" y="12" width="82" height="28" rx="4" fill="${RK.amberSoft}" stroke="${RK.amber}"/></svg><p>${bike ? 'Comparer les watts au début et à la fin de sorties longues.' : 'Comparer la vitesse au début et à la fin de sorties longues.'} Une moyenne sur plusieurs séances décrit la tendance observée, pas une garantie pour la course.</p></div></div><figcaption>Schémas de principe, sans durée ni hauteur proportionnelle à tes capacités. Un TTE connu ne permet pas de déduire ta durabilité.</figcaption></figure>`;
}

export function zoneRibbonHTML(rows: Array<{ id: string; label: string; absolute: string | null; heartRate?: string | null }>): string {
  const known = rows.filter(r => r.absolute && !/insuffis|manquant|^—$/.test(r.absolute));
  if (!known.length) return '';
  return `<figure class="didactic"><h3>Tes repères de séance, en clair</h3>${known.map(r => `<div class="zone-ribbon"><span>${esc(r.id)}</span><div><strong>${esc(r.label)}</strong>${r.heartRate && r.heartRate !== '—' ? `<small>Cardio : ${esc(r.heartRate)}</small>` : ''}</div><span>${esc(r.absolute)}</span></div>`).join('')}<figcaption>Valeurs reprises des zones du bilan. Chaque ligne a la même hauteur : ce n’est pas une répartition du temps d’entraînement.</figcaption></figure>`;
}
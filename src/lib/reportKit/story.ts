import bikePhoto from '@/assets/report-cycling-road.jpg';
import runPhoto from '@/assets/report-running-path.jpg';
import bikeEndurance from '@/assets/report-cycling-endurance.jpg';
import runEndurance from '@/assets/report-running-endurance.jpg';
/**
 * Récit des rapports athlète (Performance, Profil) — présentation uniquement.
 * Aucun calcul physiologique : met en forme des valeurs déjà enregistrées.
 * Une série absente reste signalée, jamais reconstruite.
 */
import { esc, RK } from './index';

export const STORY_STEPS = ['Où j’en suis', 'Ce qui me freine', 'Pourquoi', 'Ce que nous travaillons', 'L’essentiel à retenir'] as const;

export const STORY_CSS = `
@media screen{body{background:linear-gradient(180deg,${RK.primarySoft},${RK.surface} 420px)}}
.sport-photo{width:100%;height:220px;object-fit:cover;border-radius:20px;margin-bottom:18px;display:block}
.energy-ill{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
.energy-ill svg{flex:1 1 220px;max-width:100%;height:auto}
.page svg{max-width:100%;height:auto}
@media screen and (max-width:640px){.page{padding:20px 16px!important}.grid2,.grid3{grid-template-columns:1fr!important}.card table{display:block;overflow-x:auto;font-size:11px}.card{overflow-x:auto;-webkit-overflow-scrolling:touch}.card > svg{min-width:0}.sport-turn{padding:28px 20px!important}.sport-turn h1{font-size:26px}.sport-photo{height:150px}h1{font-size:24px!important}.lead{font-size:14px!important;line-height:1.6}}
.sport-turn{min-height:0!important;display:flex;flex-direction:column;justify-content:center;padding:56px 48px!important;border-radius:28px;background:linear-gradient(135deg,${RK.primarySoft},${RK.surface})}
.sport-turn.run{background:linear-gradient(135deg,${RK.mintSoft},${RK.surface})}
.sport-turn .n{font-size:64px;font-weight:700;line-height:1;color:${RK.primary};opacity:.35}
.sport-turn.run .n{color:${RK.mint}}
.sport-turn h1{font-size:34px;margin:8px 0 10px}
.sport-turn ol{margin:10px 0 0;padding-left:18px;font-size:12px;line-height:1.8;color:${RK.body}}
.story-rail{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}
.story-rail span{font-size:9.6px;letter-spacing:.02em;padding:4px 10px;border-radius:999px;background:${RK.surfaceAlt};color:${RK.muted}}
.story-rail span.on{background:${RK.primary};color:${RK.surface};font-weight:600}
.story-rail span.done{background:${RK.primarySoft};color:${RK.primary}}
.insight{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.insight div{border-left:3px solid ${RK.primary};padding:6px 0 6px 12px}
.insight div+div{border-left-color:${RK.mint}}
.insight b{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${RK.muted};margin-bottom:3px}
.insight p{margin:0;font-size:11.6px;line-height:1.55}
@media screen and (max-width:800px){.insight{grid-template-columns:1fr}}
`;

export function storyRail(active: number): string {
  return `<div class="story-rail" aria-label="Fil du rapport">${STORY_STEPS.map((s, i) => `<span class="${i === active ? 'on' : i < active ? 'done' : ''}">${i + 1}. ${esc(s)}</span>`).join('')}</div>`;
}

export function insight(shows: string, changes: string): string {
  return `<div class="insight"><div><b>Ce que cela montre chez toi</b><p>${esc(shows)}</p></div><div><b>Ce que cela change pour ton entraînement</b><p>${esc(changes)}</p></div></div>`;
}

type Sport = 'bike' | 'run';
const fr = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Points de contrôle propres au sport et aux questions encore ouvertes. */
export function sportControls(o: { sports: Sport[]; tteKnown: boolean; vlamaxPriority: boolean; longEvent: boolean }): string[] {
  const out: string[] = [];
  if (o.sports.includes('bike')) out.push('Vélo : refaire le même test de seuil (durée, parcours ou home-trainer, capteur de puissance) pour comparer la puissance et la FC.');
  if (o.sports.includes('run')) out.push('Course : refaire le même test de seuil ou d’allure (même terrain, même montre ou capteur) pour comparer allure et FC.');
  if (!o.tteKnown) out.push('Temps tenu au seuil non mesuré : un test continu jusqu’à l’arrêt, après validation du seuil, répondra à cette question.');
  if (o.vlamaxPriority) out.push(`Sprint court ${o.sports.includes('run') && !o.sports.includes('bike') ? 'en course' : 'à vélo'} en début et fin de bloc, même protocole, pour suivre le profil glycolytique.`);
  if (o.longEvent) out.push('Sortie longue de référence : dérive cardiaque et allure ou puissance sur la seconde moitié, pour commencer à documenter la durabilité.');
  if (o.longEvent) out.push('Noter le ravitaillement réellement pris (g/h) et la tolérance digestive sur les séances de plus de 2 h.');
  return out;
}

/** Sports racontés par le rapport, dérivés de l’objectif (présentation uniquement). */
export function reportSports(goal: string | null | undefined, isRunning: boolean): Sport[] {
  const g = String(goal ?? '');
  if (/tri|ironman|\bIM\b|70[.,]3|duathlon/i.test(g)) return ['bike', 'run'];
  if (isRunning || /km|marathon|semi|trail|course|run|5k|10k|ultra/i.test(g)) return ['run'];
  return ['bike'];
}
export const isLongEvent = (goal: string | null | undefined) => /marathon|semi|ironman|\bIM\b|70[.,]3|trail|ultra/i.test(String(goal ?? ''));

const TURN: Record<Sport, { title: string; question: string; steps: string[] }> = {
  bike: { title: 'Ton parcours vélo', question: 'Ici, on ne parle que de vélo : puissance, seuil et carburants mesurés ou modélisés en watts.', steps: ['Où se situe ton seuil à vélo', 'Ce qui alimente ton coup de pédale', 'Manger en roulant'] },
  run: { title: 'Ton parcours course à pied', question: 'Ici, on ne parle que de course : allures, VMA, seuil et économie. Aucune valeur vélo n’est convertie en allure.', steps: ['Tes repères de vitesse et de seuil', 'Ton économie et ton temps tenu au seuil'] },
};

/** Page de transition entre deux parcours sportifs. */
const abs = (u: string) => (typeof window !== 'undefined' ? new URL(u, window.location.origin).href : u);

export function sportPhoto(sport: Sport, endurance = false): string {
  const photo = endurance ? (sport === 'bike' ? bikeEndurance : runEndurance) : (sport === 'bike' ? bikePhoto : runPhoto);
  return `<figure class="sport-figure"><img src="${abs(photo)}" width="1536" height="1024" alt="${sport === 'bike' ? 'Cyclisme sur route' : 'Course à pied en plein air'}" /><figcaption>Illustration sportive</figcaption></figure>`;
}

/** Values and internal targets already resolved upstream; no invented scale or sport conversion. */
export function personalMarkers(rows: { label: string; value: number | null; display: string; unit: string; target?: [number, number] | null; scale?: [number, number] }[]): string {
  return `<div class="personal-markers">${rows.filter(r => r.value != null && Number.isFinite(r.value) && r.value > 0).map(r => {
    const range = r.scale;
    const pct = (v: number) => range ? Math.max(0, Math.min(100, (v - range[0]) / Math.max(0.0001, range[1] - range[0]) * 100)) : 0;
    const target = r.target;
    const digits = r.unit.includes("mmol") ? 2 : 1;
    return `<div class="personal-marker"><div class="marker-heading"><strong>${esc(r.label)}</strong><span>${esc(r.display)} <small>${esc(r.unit)}</small></span></div>${range ? `<div class="marker-track">${target ? `<span class="marker-target" style="left:${pct(target[0])}%;width:${Math.max(1, pct(target[1]) - pct(target[0]))}%"></span>` : ''}<span class="marker-dot" style="left:${pct(r.value ?? 0)}%"></span></div><div class="marker-caption"><span>${fr(range[0], digits)}</span>${target ? `<span>Cible personnelle : ${fr(target[0], digits)}${target[1] !== target[0] ? `–${fr(target[1], digits)}` : ''} ${esc(r.unit)}</span>` : ''}<span>${fr(range[1], digits)}</span></div>` : ''}</div>`;
  }).join('')}</div>`;
}

export function sportTransition(sport: Sport, index: number, total: number, steps?: string[]): string {
  const t = TURN[sport];
  const lead = sport === 'bike' ? 'Tes watts, ton endurance et l’énergie pour rouler : voici tes repères vélo.' : 'Tes allures, ta foulée et ton endurance : voici tes repères de course. Aucune valeur vélo n’est convertie en allure.';
  return `<header class="chapter-opening ${sport}">${sportPhoto(sport)}<div class="eyebrow">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')} · ${sport === 'bike' ? 'Vélo' : 'Course à pied'}</div><h1>${t.title}</h1><p class="lead">${lead}</p></header>`;
}

export function sharedTransition(_total: number): string { return ''; }

/** Compact editorial flow on screen and paper, without sparse forced chapter pages. */
export const ATHLETE_VISUAL_CSS = `
.page:not(.cover){min-height:0;height:auto;overflow:visible;page-break-after:auto;break-after:auto;margin-bottom:0;padding-top:9mm;padding-bottom:9mm}
.page:not(.cover) h1,.page:not(.cover) h2,.page:not(.cover) h3{break-after:avoid}
h1,h2,h3,.kpi .v{letter-spacing:0}
.chapter-opening{margin-bottom:20px;break-inside:avoid}
.sport-figure{margin:0 0 18px;position:relative;break-inside:avoid}
.sport-figure img{width:100%;height:260px;object-fit:cover;border-radius:8px;display:block}
.sport-figure figcaption{font-size:9px;color:${RK.muted};margin-top:4px}
.personal-markers{display:grid;gap:18px;padding:12px 0}
.personal-marker{break-inside:avoid;border-bottom:1px solid ${RK.lineSoft};padding-bottom:12px}
.marker-heading{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13px;color:${RK.ink}}
.marker-heading>span{font-size:22px;font-weight:600;white-space:nowrap}.marker-heading small{font-size:10px;color:${RK.muted};font-weight:400}
.marker-track{position:relative;height:12px;background:${RK.surfaceAlt};border-radius:6px;margin:12px 6px 6px}
.marker-target{position:absolute;top:0;height:100%;background:${RK.mintSoft};border:1px solid ${RK.mint};border-radius:4px}
.marker-dot{position:absolute;width:16px;height:16px;top:-2px;transform:translateX(-50%);border:3px solid ${RK.surface};border-radius:50%;background:${RK.primary};outline:1px solid ${RK.primary}}
.marker-caption{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:${RK.muted}}
@media screen and (max-width:640px){.sport-figure img{height:210px}.marker-heading{flex-wrap:wrap}.marker-caption{font-size:10px}.page:not(.cover){padding:20px 16px}.idgrid{grid-template-columns:1fr 1fr}}
@media print{.page:not(.cover){margin:0 auto}.chapter-opening{break-before:auto}.sport-figure img{height:65mm}.card{break-inside:avoid}.foot{margin-top:14px}}
`;

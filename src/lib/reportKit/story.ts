/**
 * Récit des rapports athlète (Performance, Profil) — présentation uniquement.
 * Aucun calcul physiologique : met en forme des valeurs déjà enregistrées.
 * Une série absente reste signalée, jamais reconstruite.
 */
import { esc, RK } from './index';
import { storedTestCurves, type TestCurve } from '@/lib/coachingCompass/testCurves';
import type { DbTest } from '@/hooks/useCloudData';

export const STORY_STEPS = ['Où j’en suis', 'Ce qui me freine', 'Pourquoi', 'Ce que nous travaillons', 'Comment voir mes progrès'] as const;

export const STORY_CSS = `
.story-rail{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}
.story-rail span{font-size:9.6px;letter-spacing:.02em;padding:4px 10px;border-radius:999px;background:${RK.surfaceAlt};color:${RK.muted}}
.story-rail span.on{background:${RK.primary};color:${RK.surface};font-weight:600}
.story-rail span.done{background:${RK.primarySoft};color:${RK.primary}}
.insight{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.insight div{border-left:3px solid ${RK.primary};padding:6px 0 6px 12px}
.insight div+div{border-left-color:${RK.mint}}
.insight b{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${RK.muted};margin-bottom:3px}
.insight p{margin:0;font-size:11.6px;line-height:1.55}
.evo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.evo{padding:14px 16px;border-radius:18px;background:${RK.surface};border:1px solid ${RK.lineSoft}}
.evo h3{margin:0 0 4px}
@media screen and (max-width:800px){.insight,.evo-grid{grid-template-columns:1fr}}
`;

export function storyRail(active: number): string {
  return `<div class="story-rail" aria-label="Fil du rapport">${STORY_STEPS.map((s, i) => `<span class="${i === active ? 'on' : i < active ? 'done' : ''}">${i + 1}. ${esc(s)}</span>`).join('')}</div>`;
}

export function insight(shows: string, changes: string): string {
  return `<div class="insight"><div><b>Ce que cela montre chez toi</b><p>${esc(shows)}</p></div><div><b>Ce que cela change pour ton entraînement</b><p>${esc(changes)}</p></div></div>`;
}

type Sport = 'bike' | 'run';
interface SnapLike { athlete_id?: string; date?: string | null; [k: string]: unknown }
const fin = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const fr = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

function spark(values: { date: string; v: number }[], color: string): string {
  const W = 260, H = 70, P = 8;
  const min = Math.min(...values.map(p => p.v)), max = Math.max(...values.map(p => p.v));
  const span = max - min || 1;
  const x = (i: number) => P + (values.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (values.length - 1));
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const pts = values.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Évolution enregistrée">${values.length > 1 ? `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>` : ''}${values.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" fill="${color}"/>`).join('')}</svg>`;
}

/** Séries de bilans par sport, valeurs telles qu’enregistrées (pas de mesure certifiée). */
export function snapshotSeries(snapshots: SnapLike[], athleteId: string, sport: Sport) {
  const own = snapshots.filter(s => s.athlete_id === athleteId && typeof s.date === 'string').sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const fields: { key: string; label: string; unit: string; d: number; map?: (v: number) => number }[] = sport === 'bike'
    ? [{ key: 'vo2max', label: 'VO₂max', unit: 'ml/kg/min', d: 1 }, { key: 'ftp', label: 'FTP', unit: 'W', d: 0 }]
    : [{ key: 'vo2max', label: 'VO₂max', unit: 'ml/kg/min', d: 1 }, { key: 'vma', label: 'VMA', unit: 'km/h', d: 1 }, { key: 'pace_threshold_sec_per_km', label: 'Vitesse au seuil', unit: 'km/h', d: 1, map: v => 3600 / v }];
  return fields.map(f => ({ ...f, points: own.flatMap(s => { const v = fin(s[f.key]); return v == null ? [] : [{ date: String(s.date).slice(0, 10), v: f.map ? f.map(v) : v }]; }) }));
}

function testGroups(curves: TestCurve[]) {
  const groups = new Map<string, TestCurve[]>();
  for (const c of curves) {
    const k = `${c.protocol ?? c.name}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  return [...groups.values()].map(g => [...g].sort((a, b) => a.date.localeCompare(b.date)));
}

export function evolutionSectionHTML(opts: { athleteId: string; tests: DbTest[]; snapshots: SnapLike[]; sports: Sport[] }): string {
  const label: Record<Sport, string> = { bike: 'Vélo', run: 'Course à pied' };
  const curves = opts.athleteId ? storedTestCurves(opts.tests ?? [], opts.athleteId) : [];
  const blocks = opts.sports.map(sport => {
    const groups = testGroups(curves.filter(c => c.sport === sport));
    const tests = groups.map(g => {
      const main = (c: TestCurve) => c.measures[0];
      const first = main(g[0]);
      const sameUnit = g.every(c => main(c) && main(c).label === first?.label);
      const pts = sameUnit && first ? g.map(c => ({ date: c.date, v: main(c).value })) : [];
      const last = g[g.length - 1], prev = g.length > 1 ? g[g.length - 2] : null;
      const lm = main(last), pm = prev ? main(prev) : null;
      const delta = lm && pm && lm.label === pm.label ? ` · ${lm.value - pm.value >= 0 ? '+' : ''}${fr(lm.value - pm.value)} ${esc(lm.unit)} depuis le ${esc(prev!.date)}` : '';
      return `<div class="evo"><h3>${esc(last.name)}</h3><p class="muted" style="margin:0 0 6px;font-size:10px">${g.length} test${g.length > 1 ? 's' : ''} · protocole ${esc(last.protocol ?? 'non renseigné')} · capteur ${esc(last.sensor ?? 'non renseigné')}</p>${pts.length ? spark(pts, sport === 'bike' ? RK.primary : RK.mint) : ''}<p style="margin:6px 0 0;font-size:11.4px">${lm ? `Dernier : <strong>${fr(lm.value)} ${esc(lm.unit)}</strong> (${esc(lm.label)}, ${esc(last.date)})${delta}` : 'Résultat résumé non exploitable.'}</p>${last.points.length < 2 ? '<p class="muted" style="margin:4px 0 0;font-size:9.8px">Série continue non enregistrée : seul le résumé est comparé.</p>' : ''}</div>`;
    });
    const snaps = snapshotSeries(opts.snapshots ?? [], opts.athleteId, sport).filter(s => s.points.length >= 2 && !(sport === 'run' && s.key === 'vo2max' && opts.sports.includes('bike'))).map(s => {
      const a = s.points[0], b = s.points[s.points.length - 1];
      return `<div class="evo"><h3>${esc(s.label)} — bilans</h3><p class="muted" style="margin:0 0 6px;font-size:10px">${s.points.length} bilans · valeurs enregistrées, provenance selon le bilan</p>${spark(s.points, RK.amber)}<p style="margin:6px 0 0;font-size:11.4px">${fr(a.v, s.d)} → <strong>${fr(b.v, s.d)} ${esc(s.unit)}</strong> (${esc(a.date)} → ${esc(b.date)})</p></div>`;
    });
    const body = [...tests, ...snaps];
    return `<h2>${label[sport]}</h2>${body.length ? `<div class="evo-grid">${body.join('')}</div>` : '<p class="muted">Aucun test ni historique comparable enregistré pour ce sport : la première mesure servira de point de départ.</p>'}`;
  }).join('');
  return `${storyRail(4)}<div class="eyebrow">Évolutions observées</div><h1>Ce qui a réellement changé</h1><p class="lead">Uniquement les tests et bilans enregistrés, datés, avec leur protocole. Deux tests ne se comparent bien que s’ils suivent le même protocole et des conditions proches ; une série manquante n’est jamais reconstruite.</p>${blocks}`;
}

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

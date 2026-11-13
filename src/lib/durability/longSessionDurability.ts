/**
 * Durabilité « à vérifier » à partir des sorties longues Nolio.
 * Par séance : meilleur effort de 20 min dans la première partie (après 10 min
 * d'échauffement) comparé au meilleur effort de 20 min dans le dernier tiers.
 * Moyenne sur plusieurs séances. Jamais une mesure certifiée ; n'alimente
 * ni les limiteurs ni les plans.
 */
export type DurabilitySport = 'bike' | 'run';
export interface DurabilitySession { id: string; date: string; name: string; durationMin: number; early: number; late: number; changePct: number }
export interface StoredDurabilitySport {
  status: 'estimate';
  method: 'best20_early_vs_last_third';
  unit: 'W' | 'vitesse';
  meanChangePct: number;
  sessions: DurabilitySession[];
  from: string; to: string; savedAt: string;
}
export type StoredDurability = Partial<Record<DurabilitySport, StoredDurabilitySport>>;

export const MIN_DURATION_MIN: Record<DurabilitySport, number> = { bike: 120, run: 90 };
export const MIN_SESSIONS = 2;
const WINDOW_S = 20 * 60;

/** Meilleure moyenne glissante sur WINDOW_S entre [startS, endS], échantillons datés. */
function bestWindow(time: number[], value: Array<number | null>, startS: number, endS: number): number | null {
  let best: number | null = null; let sum = 0; let n = 0; let j = 0;
  const idx: number[] = [];
  for (let i = 0; i < time.length; i++) { if (time[i] >= startS && time[i] <= endS && value[i] != null && Number.isFinite(value[i] as number)) idx.push(i); }
  for (let k = 0; k < idx.length; k++) {
    sum += value[idx[k]] as number; n++;
    while (time[idx[k]] - time[idx[j]] > WINDOW_S) { sum -= value[idx[j]] as number; n--; j++; }
    if (time[idx[k]] - time[idx[j]] >= WINDOW_S * 0.95 && n > 0) { const m = sum / n; if (best == null || m > best) best = m; }
  }
  return best;
}

/** Retourne null si la séance ne convient pas (trop courte, flux absent ou incohérent). */
export function sessionDurability(sport: DurabilitySport, s: { id: string; date: string; name: string }, time: number[] | undefined, value: Array<number | null> | undefined): DurabilitySession | null {
  if (!time?.length || !value || value.length !== time.length) return null;
  for (let i = 1; i < time.length; i++) if (!(time[i] > time[i - 1])) return null;
  const total = time[time.length - 1] - time[0];
  const durationMin = total / 60;
  if (durationMin < MIN_DURATION_MIN[sport]) return null;
  const t0 = time[0];
  const early = bestWindow(time, value, t0 + 600, t0 + total / 3);
  const late = bestWindow(time, value, t0 + (2 * total) / 3, t0 + total);
  if (early == null || late == null || early <= 0) return null;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { ...s, durationMin: Math.round(durationMin), early: r(early), late: r(late), changePct: r(((late - early) / early) * 100) };
}

export function summarizeDurability(sport: DurabilitySport, sessions: DurabilitySession[], from: string, to: string, savedAt: string): StoredDurabilitySport | null {
  if (sessions.length < MIN_SESSIONS) return null;
  const mean = sessions.reduce((a, s) => a + s.changePct, 0) / sessions.length;
  return { status: 'estimate', method: 'best20_early_vs_last_third', unit: sport === 'bike' ? 'W' : 'vitesse', meanChangePct: Math.round(mean * 10) / 10, sessions, from, to, savedAt };
}

export function parseStoredDurability(raw: unknown): StoredDurability {
  let v = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return {}; } }
  const d = (v as { durability?: unknown } | null)?.durability as Record<string, StoredDurabilitySport> | undefined;
  const out: StoredDurability = {};
  for (const sp of ['bike', 'run'] as const) {
    const s = d?.[sp];
    if (s && s.status === 'estimate' && Number.isFinite(s.meanChangePct) && Array.isArray(s.sessions) && s.sessions.length >= MIN_SESSIONS) out[sp] = s;
  }
  return out;
}

/** Lecture en langage de la discipline. */
export function durabilityReading(sport: DurabilitySport, d: StoredDurabilitySport): string {
  const what = sport === 'bike' ? 'ta meilleure puissance sur 20 minutes' : 'ta meilleure vitesse sur 20 minutes';
  const end = sport === 'bike' ? 'en fin de longue sortie vélo' : 'en fin de sortie longue en course';
  const pct = Math.abs(d.meanChangePct).toLocaleString('fr-FR');
  const trend = d.meanChangePct <= -0.5 ? `baisse en moyenne de ${pct} %` : d.meanChangePct >= 0.5 ? `monte en moyenne de ${pct} %` : 'reste stable';
  return `Sur ${d.sessions.length} séances, ${what} ${trend} ${end}, par rapport au début de séance. Ce chiffre dépend de ce que tu as réellement poussé en fin de séance : il reste à vérifier avec ton coach.`;
}

/** Ajoute la durabilité au JSON des métriques critiques sans toucher aux autres clés. */
export function withDurability(raw: unknown, sport: DurabilitySport, value: StoredDurabilitySport): string {
  let v: Record<string, unknown> = {};
  if (typeof raw === 'string') { try { v = JSON.parse(raw) ?? {}; } catch { v = {}; } } else if (raw && typeof raw === 'object') v = { ...(raw as Record<string, unknown>) };
  const d = { ...((v.durability as Record<string, unknown>) ?? {}), [sport]: value };
  return JSON.stringify({ ...v, durability: d });
}

const escH = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Page du rapport Profil Athlète : durabilité par sport, jamais mélangée. */
export function durabilityReportHTML(raw: unknown, sports: DurabilitySport[]): string {
  const d = parseStoredDurability(raw);
  const block = (sp: DurabilitySport) => {
    const v = d[sp];
    const title = sp === 'bike' ? 'Vélo · tenir les watts en fin de sortie' : 'Course · tenir l’allure en fin de sortie longue';
    if (!v) return `<div class="card" style="margin-top:12px"><h3>${title}</h3><p class="muted" style="margin:0">Données insuffisantes : pas encore deux ${sp === 'bike' ? 'sorties vélo de plus de 2 h' : 'sorties longues de plus d’1 h 30'} analysées. Tenir ${sp === 'bike' ? 'longtemps au seuil' : 'longtemps à l’allure seuil'} ne suffit pas à le prouver.</p></div>`;
    const max = Math.max(...v.sessions.map(s => Math.abs(s.changePct)), 5);
    const bars = v.sessions.map(s => `<div style="display:flex;align-items:center;gap:8px;font-size:10.5px;margin:4px 0"><span style="width:84px" class="muted">${escH(s.date)}</span><span style="flex:1;height:8px;border-radius:4px;background:#eee;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.round((Math.abs(s.changePct) / max) * 100)}%;border-radius:4px;background:${s.changePct < 0 ? '#C77D4A' : '#177A53'}"></span></span><strong style="width:54px;text-align:right">${s.changePct > 0 ? '+' : ''}${s.changePct.toLocaleString('fr-FR')} %</strong></div>`).join('');
    return `<div class="card" style="margin-top:12px"><h3>${title} <span class="muted" style="font-weight:400">· à vérifier</span></h3><div style="font-size:28px;font-weight:700;margin:4px 0">${v.meanChangePct > 0 ? '+' : ''}${v.meanChangePct.toLocaleString('fr-FR')} %</div><p style="margin:0 0 8px">${escH(durabilityReading(sp, v))}</p>${bars}<p class="muted" style="margin:8px 0 0;font-size:9.5px">Méthode : meilleur effort de 20 min dans le premier tiers (après 10 min) comparé au dernier tiers de chaque séance · ${v.sessions.length} séances du ${escH(v.from)} au ${escH(v.to)}. N’a pas modifié tes priorités ni ton plan.</p></div>`;
  };
  return `<div class="eyebrow">${sports.length === 1 ? (sports[0] === 'bike' ? 'Vélo · ' : 'Course · ') : ''}Ta durabilité</div><h1>Ce que tu gardes en fin de séance longue</h1><p class="lead">La durabilité, c’est ce qu’il te reste quand la séance dure : la même puissance ou la même allure après plusieurs heures. On la lit sur tes vraies sorties longues, sport par sport, en moyenne sur plusieurs séances.</p>${sports.map(block).join('')}`;
}

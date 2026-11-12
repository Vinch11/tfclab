import { speedMetresPerSecond, type ReviewedRecord } from './nolioV2Records';

export type CriticalSport = 'running' | 'cycling';
export interface CriticalEffort {
  id: string; sport: CriticalSport; durationSec: number; value: number;
  date: string; session: string; conditions: string; source: 'manual' | 'nolio';
  confirmed: boolean;
  measurement?: 'distance' | 'power';
}
export interface CriticalFit {
  critical: number; reserve: number; r2: number | null; residualPct: number;
  sensitivityPct: number | null; errors: string[]; warnings: string[];
  status: 'insufficient' | 'estimate' | 'review' | 'eligible';
}
// Conservative application policy, not universal physiological cutoffs.
export const CRITICAL_POLICY = { minSec: 120, maxSec: 900, minSpanRatio: 3, maxAgeDays: 42, maxDateSpanDays: 28, maxResidualPct: 5, maxSensitivityPct: 10 };

function regress(points: { t: number; y: number }[]) {
  const n = points.length, x = points.reduce((s,p)=>s+p.t,0)/n, y = points.reduce((s,p)=>s+p.y,0)/n;
  const denominator = points.reduce((s,p)=>s+(p.t-x)**2,0);
  if (!denominator) return null;
  const critical = points.reduce((s,p)=>s+(p.t-x)*(p.y-y),0)/denominator;
  const reserve = y-critical*x;
  const residuals = points.map(p=>p.y-critical*p.t-reserve);
  const total = points.reduce((s,p)=>s+(p.y-y)**2,0);
  return { critical, reserve, r2: n>2 && total>0 ? 1-residuals.reduce((s,v)=>s+v*v,0)/total : null,
    residualPct: Math.max(...residuals.map((v,i)=>Math.abs(v)/points[i].y*100)) };
}

export function fitCriticalEfforts(efforts: CriticalEffort[], sport: CriticalSport, today: string): CriticalFit {
  const errors: string[] = [], warnings: string[] = [];
  const empty: CriticalFit = {critical:0,reserve:0,r2:null,residualPct:0,sensitivityPct:null,errors,warnings,status:'insufficient'};
  if (efforts.length<2) { errors.push('Deux efforts distincts au minimum sont nécessaires.'); return empty; }
  if (efforts.some(e=>e.sport!==sport)) errors.push('Les sports ne peuvent pas être mélangés.');
  const power = sport === 'cycling' || efforts[0]?.measurement === 'power';
  if (efforts.some(e => (e.sport === 'cycling' || e.measurement === 'power') !== power)) errors.push('Puissances et distances ne peuvent pas être mélangées.');
  if (new Set(efforts.map(e=>e.durationSec)).size!==efforts.length) errors.push('Durées dupliquées : retenir un seul effort par durée.');
  if (new Set(efforts.map(e=>e.id)).size!==efforts.length) errors.push('Un effort a été retenu plusieurs fois.');
  if (efforts.some(e=>!Number.isFinite(e.value)||e.value<=0||!Number.isFinite(e.durationSec)||e.durationSec<CRITICAL_POLICY.minSec||e.durationSec>CRITICAL_POLICY.maxSec)) errors.push('Efforts admissibles : 2 à 15 minutes, avec des valeurs positives.');
  if (Math.max(...efforts.map(e=>e.durationSec))/Math.min(...efforts.map(e=>e.durationSec))<CRITICAL_POLICY.minSpanRatio) errors.push('Le plus long effort doit durer au moins trois fois le plus court.');
  if (errors.length) return empty;
  const points = efforts.map(e=>({t:e.durationSec,y:power?e.value*e.durationSec:e.value}));
  const fit = regress(points);
  if (!fit || !Number.isFinite(fit.critical) || !Number.isFinite(fit.reserve) || fit.critical<=0 || fit.reserve<=0) { errors.push('Modèle incompatible : pente ou réserve non positive.'); return empty; }
  const sorted = [...efforts].sort((a,b)=>a.durationSec-b.durationSec);
  if (sorted.some((e,i)=>i>0&&(power?e.value:e.value/e.durationSec)>=(power?sorted[i-1].value:sorted[i-1].value/sorted[i-1].durationSec))) errors.push('La puissance ou vitesse moyenne doit diminuer avec la durée.');
  const omitted = points.length>=3 ? points.map((_,i)=>regress(points.filter((_,j)=>j!==i))).filter(p=>p!==null) : [];
  const sensitivityPct = omitted.length ? Math.max(...omitted.map(p=>Math.max(Math.abs(p.critical-fit.critical)/fit.critical,Math.abs(p.reserve-fit.reserve)/fit.reserve)*100)) : null;
  if (fit.residualPct>CRITICAL_POLICY.maxResidualPct) errors.push('Écarts du modèle trop importants pour la prescription.');
  if (sensitivityPct!==null&&sensitivityPct>CRITICAL_POLICY.maxSensitivityPct) errors.push('Résultat trop sensible aux efforts retenus pour la prescription.');
  const now = Date.parse(today+'T00:00:00Z');
  const dates = efforts.map(e=>Date.parse(e.date+'T00:00:00Z'));
  if (!Number.isFinite(now)||dates.some(d=>!Number.isFinite(d)||d>now||now-d>CRITICAL_POLICY.maxAgeDays*86400000)) warnings.push('Date absente, future ou effort datant de plus de 42 jours.');
  if (Math.max(...dates)-Math.min(...dates)>CRITICAL_POLICY.maxDateSpanDays*86400000) warnings.push('Les efforts couvrent plus de 28 jours.');
  if (efforts.some(e=>!e.session.trim()||!e.conditions.trim())) warnings.push('Séance et conditions à documenter pour chaque effort.');
  if (new Set(efforts.map(e=>e.conditions.trim().toLowerCase())).size>1) warnings.push('Conditions différentes : ne pas valider ces efforts ensemble.');
  if (sport === 'running' && power) warnings.push('Puissance course : estimation spécifique au capteur, sans prescription automatique.');
  if (efforts.length===2) warnings.push('Deux points : qualité d’ajustement non vérifiable ; troisième effort requis avant prescription dans TFCL.');
  const confirmed = efforts.every(e=>e.confirmed);
  return {...fit,sensitivityPct,errors,warnings,status:!confirmed?'estimate':errors.length||warnings.length?'review':'eligible'};
}

export function criticalEffortsFromRecords(records: ReviewedRecord[], runningPower = false): CriticalEffort[] {
  return records.flatMap((r,i)=>{
    if (!r.inner_val || !r.value || !['running','cycling'].includes(r.sportBase)) return [];
    const sport = r.sportBase as CriticalSport;
    let durationSec: number, value: number;
    if (sport==='cycling' || runningPower) {
      if(r.cat!=='ppr'||r.unit!=='W'||r.record_type!=='time') return [];
      durationSec=r.inner_val; value=r.value;
    } else {
      if(r.cat!=='par') return [];
      const speed=speedMetresPerSecond(r); if(speed===null) return [];
      durationSec=r.record_type==='time'?r.inner_val:r.record_type==='distance'?r.inner_val/speed:0;
      value=speed*durationSec;
    }
    if(durationSec<CRITICAL_POLICY.minSec||durationSec>CRITICAL_POLICY.maxSec||!Number.isFinite(value)) return [];
    return [{id:`nolio-${r.training_id??i}-${r.sport_id??sport}-${r.cat}-${durationSec}`,sport,durationSec,value,date:r.date?.slice(0,10)??'',session:[r.training_id,r.training_name].filter(Boolean).join(' · '),conditions:r.sport_name??'',source:'nolio' as const,confirmed:false,measurement:sport==='cycling'||runningPower?'power' as const:'distance' as const}];
  });
}

/** Single continuous effort only; deliberately no recovery/repetition prediction. */
export function previewCriticalInterval(fit: CriticalFit, sport: CriticalSport, durationSec: number, target: number) {
  if (fit.status!=='eligible'||!Number.isFinite(durationSec)||durationSec<CRITICAL_POLICY.minSec||durationSec>CRITICAL_POLICY.maxSec||!Number.isFinite(target)||target<=fit.critical) return null;
  const used=(target-fit.critical)*durationSec;
  return {used, fraction:used/fit.reserve, sport, warning:used>fit.reserve?'Sollicitation supérieure à la réserve estimée pour un effort continu.':null};
}
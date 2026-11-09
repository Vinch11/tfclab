export function ownsPersonalConnection(appEmail: unknown, nolioEmail: unknown): boolean {
  return typeof appEmail === 'string' && typeof nolioEmail === 'string' && appEmail.trim().length > 0 && appEmail.trim().toLowerCase() === nolioEmail.trim().toLowerCase();
}

export function validPeriod(from: unknown, to: unknown): boolean {
  const valid = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  return valid(from) && valid(to) && from <= to;
}

export function canReadTestSession(athlete:unknown,training:unknown,athletes:{id?:unknown;has_api_access?:unknown}[],sessions:{id?:unknown}[],complete:boolean):boolean {
  return complete && typeof athlete==='string' && /^usr_[A-Za-z0-9_-]+$/.test(athlete) && typeof training==='string' && /^trn_[A-Za-z0-9_-]+$/.test(training)
    && athletes.some(a=>a.id===athlete&&a.has_api_access===true) && sessions.some(s=>s.id===training);
}
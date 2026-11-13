import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import type { CalibrationEvidence } from '@/lib/calibration';
import { parseStoredCriticalMetrics } from '@/lib/criticalMetrics';

type Data = Record<string, unknown>;
const object = (v: unknown): Data => v && typeof v === 'object' && !Array.isArray(v) ? v as Data : {};
const text = (v: unknown): string => typeof v === 'string' && v.trim() ? v : '';
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

export interface StaffEvidenceRow {
  date: string; sport: string; label: string; result: string;
  source: string; protocol: string; sensor: string; status: string;
}

// Units belong to the stored input, never to a diagnostic/model projection.
const fields: [string, string, string, string][] = [
  ['weight_kg', 'Poids', 'kg', 'Contexte'], ['fc_max', 'FC maximale', 'bpm', 'Non précisé'],
  ['fc_repos', 'FC repos', 'bpm', 'Contexte'], ['vo2max', 'VO₂max', 'ml/kg/min', 'Non précisé'],
  ['ftp', 'FTP', 'W', 'Vélo'], ['pmax_5s', 'Puissance 5 s', 'W', 'Vélo'],
  ['p30s_w', 'Puissance 30 s', 'W', 'Vélo'], ['p60s_w', 'Puissance 60 s', 'W', 'Vélo'],
  ['map5min_w', 'Puissance 5 min', 'W', 'Vélo'], ['vlamax', 'VLamax', 'mmol/L/s', 'Vélo'],
  ['vma', 'VMA', 'km/h', 'Course'], ['pace_threshold_sec_per_km', 'Allure seuil', 's/km', 'Course'],
  ['sprint_15s_distance', 'Distance sprint 15 s', 'm', 'Course'],
  ['running_power_1s', 'Puissance 1 s', 'W', 'Course'], ['running_power_5s', 'Puissance 5 s', 'W', 'Course'],
  ['running_power_30s', 'Puissance 30 s', 'W', 'Course'], ['running_power_60s', 'Puissance 60 s', 'W', 'Course'],
  ['running_power_5min', 'Puissance 5 min', 'W', 'Course'], ['running_power_threshold', 'Puissance seuil', 'W', 'Course'],
  ['vlamax_run', 'VLamax', 'mmol/L/s', 'Course'], ['tte_observed_min', 'Durée déclarée au seuil', 'min', 'Vélo'],
  ['tte_observed_min_run', 'Durée déclarée au seuil', 'min', 'Course'],
  ['run_duration_min', 'Durée séance de référence', 'min', 'Course'],
  ['run_hr_drift_pct', 'Dérive cardiaque de séance', '%', 'Course'], ['css', 'CSS', 's/100 m', 'Natation'],
];

function documentation(raw: unknown) {
  const r = object(raw);
  return {
    sensor: text(r.sensor) || text(r.device) || text(r.device_name) || 'Capteur non renseigné',
    protocol: [text(r.protocol) || text(r.protocol_name), text(r.conditions), text(r.notes)].filter(Boolean).join(' · ') || 'Protocole non documenté',
  };
}

const rawLabels: Record<string, [string, string]> = {
  p5s: ['Puissance 5 s', 'W'], p15s: ['Puissance 15 s', 'W'], p30s: ['Puissance 30 s', 'W'],
  p60s: ['Puissance 60 s', 'W'], p5min: ['Puissance 5 min', 'W'], p20min: ['Puissance 20 min', 'W'],
  powerSprint1: ['Sprint 1', 'W'], powerSprint2: ['Sprint 2', 'W'], power12min: ['Puissance 12 min', 'W'],
  distSprint1: ['Distance sprint 1', 'm'], distSprint2: ['Distance sprint 2', 'm'], dist12min: ['Distance 12 min', 'm'],
  bestDistance: ['Distance sprint retenue', 'm'], distance6min: ['Distance 6 min', 'm'],
  hrMax: ['FC maximale', 'bpm'], hrAvg: ['FC moyenne', 'bpm'], hrAvg12min: ['FC moyenne 12 min', 'bpm'],
  hrDrift: ['Dérive cardiaque', '%'], driftPct: ['Dérive cardiaque', '%'],
  tteObserved: ['Durée déclarée au seuil', 'min'], tteObservedMin: ['Durée déclarée au seuil', 'min'],
  vma: ['VMA enregistrée', 'km/h'], paceThreshold: ['Allure seuil', 's/km'],
  runPowerMax: ['Puissance maximale course', 'W'], runPowerThreshold: ['Puissance seuil course', 'W'],
};

/** Only recognized observation fields; unknown numeric model outputs never become evidence. */
function rawResults(raw: unknown, prefix = '', depth = 0): string[] {
  if (depth > 3) return [];
  return Object.entries(object(raw)).flatMap(([key, value]) => {
    if (/confidence|reliability|quality|score|estimated|model|vlamax|weight|calibrat|token|secret|password/i.test(key) || ['pgly', 'egly', 'lactate', 'p15', 'p12', 'v15', 'v12', 'srRun'].includes(key)) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    const label = rawLabels[key];
    if (label && typeof value === 'number' && Number.isFinite(value)) return [`${label[0]} : ${value} ${label[1]}`];
    return rawResults(value, path, depth + 1);
  });
}

export function staffEvidenceRows(athleteId: string, snapshot: DbSnapshot | null, tests: DbTest[], evidences: CalibrationEvidence[] = []): StaffEvidenceRow[] {
  const rows: StaffEvidenceRow[] = [];
  if (snapshot?.athlete_id === athleteId) {
    const raw = object(snapshot), sources = object(raw.field_sources);
    const docs = documentation(raw);
    for (const [key, label, unit, sport] of fields) {
      const value = raw[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (value === 0 && key !== 'run_hr_drift_pct')) continue;
      const source = sources[key];
      const sourceText = text(source) || text(object(source).source);
      rows.push({ date: snapshot.date, sport, label, result: `${value} ${unit}`,
        source: sourceText || `Bilan : ${snapshot.source || 'origine non renseignée'} — source du champ non documentée`,
        ...documentation(source),
        protocol: documentation(source).protocol === 'Protocole non documenté' ? docs.protocol : documentation(source).protocol,
        status: /vlamax/.test(key) ? 'Valeur enregistrée ; mesure directe non certifiée' : 'Valeur enregistrée ; protocole et mesure à vérifier',
      });
    }
    const critical = parseStoredCriticalMetrics(snapshot.critical_metrics);
    for (const key of ['cycling', 'running', 'runningPower'] as const) {
      for (const effort of critical[key]?.efforts ?? []) {
        if (!(effort.value > 0) || !(effort.durationSec > 0) || !Number.isFinite(effort.value) || !Number.isFinite(effort.durationSec)) continue;
        rows.push({ date: effort.date, sport: key === 'cycling' ? 'Vélo' : key === 'runningPower' ? 'Course — puissance capteur' : 'Course — distance',
          label: effort.session || 'Effort enregistré', result: `${effort.value} ${key === 'running' ? 'm' : 'W'} sur ${effort.durationSec} s`,
          source: effort.source === 'nolio' ? 'Record Nolio' : 'Saisie coach',
          protocol: effort.conditions || 'Conditions non renseignées', sensor: 'Voir conditions ; capteur non identifié séparément',
          status: effort.confirmed ? 'Effort confirmé par le coach ; CP/W′ ou CS/D′ restent ajustés par modèle' : 'Record / effort non confirmé — pas un test certifié',
        });
      }
    }
  }
  for (const test of tests.filter(t => t.athlete_id === athleteId)) {
    rows.push({ date: test.date, sport: test.sport || 'Non précisé', label: `${test.name} (${test.type})`,
      result: rawResults(test.raw).join(' · ') || 'Aucun résultat brut numérique exploitable enregistré',
      source: text(object(test.raw).source) || 'Test enregistré', ...documentation(test.raw),
      protocol: [documentation(test.raw).protocol, test.note].filter(Boolean).join(' · '),
      status: 'Test enregistré ; validation du protocole non déduite du nom ou de la fiabilité',
    });
  }
  for (const e of evidences.filter(e => e.athlete_id === athleteId)) {
    rows.push({ date: e.date, sport: text(object(e.raw_values).sport) || 'Non précisé', label: e.evidence_type,
      result: rawResults(e.raw_values).join(' · ') || 'Résultat brut non renseigné', source: e.source_type,
      ...documentation(e.raw_values), status: e.validity === 'OK' ? 'Preuve marquée valide — pas une mesure de durabilité' : e.validity === 'INVALID' ? 'Preuve invalide — ne pas utiliser' : 'Preuve à vérifier',
    });
  }
  return rows;
}

export function buildStaffEvidenceHTML(athleteId: string, snapshot: DbSnapshot | null, tests: DbTest[], evidences: CalibrationEvidence[] = []): string {
  const rows = staffEvidenceRows(athleteId, snapshot, tests, evidences);
  const table = (items: StaffEvidenceRow[]) => `<table><thead><tr><th>Date / sport</th><th>Résultat enregistré</th><th>Source / statut</th><th>Test, capteur et conditions</th></tr></thead><tbody>${items.map(r => `<tr><td>${esc(r.date)}<br>${esc(r.sport)}</td><td><b>${esc(r.label)}</b><br>${esc(r.result)}</td><td>${esc(r.source)}<br>${esc(r.status)}</td><td>${esc(r.protocol)}<br>${esc(r.sensor)}</td></tr>`).join('')}</tbody></table>`;
  const sports = [...new Set(rows.map(r => r.sport))];
  return `<section id="staff-evidence" class="section pagebreak"><h2>Mesures, tests et capteurs — données enregistrées</h2>
    <p>Les valeurs ci-dessous sont les entrées du bilan de référence et les résultats enregistrés, sans recalcul théorique. La date du bilan n’est pas nécessairement la date du test. Une saisie ou un record ne certifie pas un protocole.</p>
    ${snapshot?.athlete_id === athleteId && snapshot.coach_notes ? `<h3>Notes de provenance du bilan</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(snapshot.coach_notes)}</p>` : ''}
    ${rows.length ? sports.map(sport => `<h3>${esc(sport)}</h3>${table(rows.filter(r => r.sport === sport))}`).join('') : '<p>Aucune mesure ou résultat brut enregistré pour cet athlète.</p>'}
    <h3>Ce que ces données ne permettent pas de certifier</h3><p>Un capteur absent reste non renseigné : Nolio ou FIT désignent une origine, pas un appareil. Les watts course et vélo ne sont pas interchangeables. W′/D′ sont des paramètres ajustés, pas des mesures de force. Le TTE exige un effort continu à seuil préalablement validé, jusqu’à épuisement ; un arrêt volontaire donne seulement un minimum. La durabilité exige une comparaison avant/après effort prolongé ; le TTE et la dérive seuls ne suffisent pas. FatMax mesurée exige un protocole métabolique documenté : aucun test n’est inventé ici.</p></section>`;
}
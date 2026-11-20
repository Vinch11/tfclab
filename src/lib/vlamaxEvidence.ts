/** Blood lactate accumulation is a sport- and protocol-specific proxy (Wackerhage et al., 2025). */
interface SnapshotEvidence {
  source?: string | null;
  vlamax?: number | null;
  vlamax_run?: number | null;
  vlamax_source?: string | null;
  vlamax_protocol?: string | null;
}

export function protocolSport(value?: string | null) {
  const text = (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/natation|swim|nage/.test(text)) return 'natation';
  if (/\bcap\b|course|running|\brun\b/.test(text)) return 'cap';
  if (/cycl|velo|bike/.test(text)) return 'velo';
  return null;
}

export function hasLactateProtocol(source?: string | null, protocol?: string | null) {
  const description = (protocol ?? '').toLowerCase();
  if (/sans (?:prise de sang|lactate|labo)|without (?:blood|lactate)|no lactate/.test(description)) return false;
  return /^(?:lab|labo|test_labo|lactate_lab|vlamax_lab)$/i.test(source ?? '') ||
    /labo|prise de sang|blood lactate|lab measurement|sprint lactate/i.test(description);
}

export function hasRunVlamaxMeasurementEvidence(s: SnapshotEvidence): boolean {
  if (!hasLactateProtocol(s.vlamax_source, s.vlamax_protocol)) return false;
  const sport = protocolSport(s.vlamax_protocol);
  if (sport) return sport === 'cap';
  // Historical generic staff declarations were written when entering cycling lactate.
  return s.vlamax == null || s.source !== 'staff' && s.vlamax_source === 'test_labo';
}

export function hasBikeVlamaxMeasurementEvidence(s: SnapshotEvidence): boolean {
  if (s.source === 'staff') return true;
  if (!hasLactateProtocol(s.vlamax_source, s.vlamax_protocol)) return false;
  const sport = protocolSport(s.vlamax_protocol);
  return sport === 'velo' || (sport == null && s.vlamax_run == null);
}

/** Staff mode has separate blood lactate inputs. Keep the two declarations independent on edit. */
export function staffLactateUpdate(previous: SnapshotEvidence, bike: number | null, run: number | null) {
  const bikeChanged = bike !== (previous.vlamax ?? null);
  const runChanged = run !== (previous.vlamax_run ?? null);
  if (!bikeChanged && !runChanged) return {};
  const bikeMeasured = bike != null && (bikeChanged || hasBikeVlamaxMeasurementEvidence(previous));
  const runMeasured = run != null && (runChanged || hasRunVlamaxMeasurementEvidence(previous));
  const runProtocol = runChanged || !previous.vlamax_protocol
    ? 'Sprint lactate course (saisie coach)'
    : protocolSport(previous.vlamax_protocol) === 'cap' ? previous.vlamax_protocol : ('Course · ' + previous.vlamax_protocol).slice(0, 100);
  return {
    ...(bikeMeasured ? { source: 'staff' } : previous.source === 'staff' ? { source: 'manual' } : {}),
    ...(runChanged || hasLactateProtocol(previous.vlamax_source, previous.vlamax_protocol) ? {
      vlamax_source: runMeasured ? 'lab' : null,
      vlamax_protocol: runMeasured ? runProtocol : null,
    } : {}),
    ...(runChanged && run == null ? { vlamax_is_reference: false } : {}),
  };
}

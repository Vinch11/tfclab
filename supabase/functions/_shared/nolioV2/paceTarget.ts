/** Versioned transport choice, saved only on newly generated plans. Old
 * archives keep their original payload/ledger identity and m/s transport. */
export const PACE_TARGET_FORMAT = 'pace-v1';

/** Preserve all source decimal seconds; never round a prescribed pace to
 * whole seconds. The provider dry-run must accept the resulting raw target
 * before the ordinary sender can create anything. */
export function formatPaceSeconds(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const text = String(seconds);
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const minutes = Math.floor(seconds / 60);
  const whole = Math.floor(seconds) % 60;
  const fraction = text.includes('.') ? '.' + text.split('.')[1] : '';
  const pace = `${minutes}:${String(whole).padStart(2, '0')}${fraction}`;
  return parsePaceSeconds(pace) === seconds ? pace : null;
}

export function parsePaceSeconds(value: unknown): number | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  const match = /^(\d+):([0-5]\d(?:\.\d+)?)$/.exec(value);
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/**
 * Vérificateur fail-closed injecté dans la préparation pure des scénarios DET
 * quand elle tourne dans le laboratoire navigateur (les tests, eux, injectent
 * le vrai `expect` de vitest). Seuls les comparateurs réellement utilisés par
 * cette préparation existent ; tout autre appel lève une erreur.
 */
export class DetLabCheckFailed extends Error {
  constructor(public readonly matcher: string, detail: string) {
    super(`DET_LAB_CHECK_FAILED:${matcher}:${detail}`.slice(0, 300));
  }
}

const canon = (v: unknown): string => {
  const norm = (x: unknown): unknown => {
    if (x === undefined) return "__undefined__";
    if (x === null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(norm);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x as object).sort()) {
      const val = (x as Record<string, unknown>)[k];
      if (val !== undefined) out[k] = norm(val);
    }
    return out;
  };
  return JSON.stringify(norm(v));
};

const num = (v: unknown, m: string): number => {
  if (typeof v !== "number" || Number.isNaN(v)) throw new DetLabCheckFailed(m, "not_a_number");
  return v;
};

export function strictCheck(actual: unknown) {
  const fail = (m: string, d: string) => { throw new DetLabCheckFailed(m, d); };
  return {
    toBe: (e: unknown) => { if (!Object.is(actual, e)) fail("toBe", `${String(actual)}!==${String(e)}`); },
    toEqual: (e: unknown) => { if (canon(actual) !== canon(e)) fail("toEqual", "structural_mismatch"); },
    toBeDefined: () => { if (actual === undefined) fail("toBeDefined", "undefined"); },
    toBeTruthy: () => { if (!actual) fail("toBeTruthy", "falsy"); },
    toBeGreaterThan: (e: number) => { if (!(num(actual, "toBeGreaterThan") > e)) fail("toBeGreaterThan", `${actual}<=${e}`); },
    toBeGreaterThanOrEqual: (e: number) => { if (!(num(actual, "toBeGreaterThanOrEqual") >= e)) fail("toBeGreaterThanOrEqual", `${actual}<${e}`); },
    toBeLessThanOrEqual: (e: number) => { if (!(num(actual, "toBeLessThanOrEqual") <= e)) fail("toBeLessThanOrEqual", `${actual}>${e}`); },
    toHaveLength: (n: number) => {
      const len = (actual as { length?: unknown } | null | undefined)?.length;
      if (len !== n) fail("toHaveLength", `${String(len)}!==${n}`);
    },
  };
}

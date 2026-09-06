import { describe, it, expect } from "vitest";
import { isPacingEnvelopeDataInsufficient } from "../PacingEnvelopeCard";
import type { PacingEnvelopeInput, PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 4). L'ancien
 * garde comparait `input.vlamaxEffectif?.value === null` et
 * `input.tteEffectif?.tte_min === 0` : quand vlamaxEffectif/tteEffectif sont
 * eux-mêmes `null` (l'état normal "jamais calculé", le cas le plus fréquent
 * pour un athlète tout juste créé), l'optional chaining renvoie `undefined`
 * — jamais égal à `null` ni à `0` — donc le garde ne se déclenchait JAMAIS
 * dans ce cas pourtant le plus courant d'absence totale de données.
 */

const DUMMY_ENVELOPE = {} as PacingEnvelopeResult;

function makeInput(overrides: Partial<PacingEnvelopeInput> = {}): PacingEnvelopeInput {
  return {
    vlamaxEffectif: null,
    tteEffectif: null,
    fatmax: null,
    potentielPhysiologiqueScore: null,
    fatigueIndex: null,
    raceObjective: "70.3",
    sport: "bike",
    ftp: null,
    ...overrides,
  } as PacingEnvelopeInput;
}

describe("isPacingEnvelopeDataInsufficient — vlamaxEffectif/tteEffectif null (jamais calculé) déclenche bien le garde", () => {
  it("athlète tout juste créé (vlamaxEffectif=null, tteEffectif=null, ftp=null) : insuffisant", () => {
    expect(isPacingEnvelopeDataInsufficient(makeInput(), DUMMY_ENVELOPE)).toBe(true);
  });

  it("pas d'enveloppe calculable (envelope=null) : toujours insuffisant, quelles que soient les données", () => {
    const input = makeInput({ ftp: 250 });
    expect(isPacingEnvelopeDataInsufficient(input, null)).toBe(true);
  });

  it("vlamaxEffectif présent mais value=null, tteEffectif source \"unknown\" : toujours insuffisant", () => {
    const input = makeInput({
      vlamaxEffectif: { value: null, source: "estimated", confidence: 0 } as any,
      tteEffectif: { tte_min: 0, source: "unknown", confidence: 0, label: "—" } as any,
    });
    expect(isPacingEnvelopeDataInsufficient(input, DUMMY_ENVELOPE)).toBe(true);
  });

  it("FTP renseigné seul suffit à ne PAS déclencher le garde", () => {
    const input = makeInput({ ftp: 250 });
    expect(isPacingEnvelopeDataInsufficient(input, DUMMY_ENVELOPE)).toBe(false);
  });

  it("vlamaxEffectif avec une valeur réelle suffit à ne PAS déclencher le garde", () => {
    const input = makeInput({
      vlamaxEffectif: { value: 0.45, source: "measured", confidence: 0.9 } as any,
    });
    expect(isPacingEnvelopeDataInsufficient(input, DUMMY_ENVELOPE)).toBe(false);
  });

  it("tteEffectif avec une source connue et un tte_min > 0 suffit à ne PAS déclencher le garde", () => {
    const input = makeInput({
      tteEffectif: { tte_min: 45, source: "measured", confidence: 0.8, label: "45 min" } as any,
    });
    expect(isPacingEnvelopeDataInsufficient(input, DUMMY_ENVELOPE)).toBe(false);
  });
});

/**
 * Trail Session Alternatives — v2 (context-aware)
 * ----------------------------------------------------------------------
 * Pour chaque séance trail (montée, descente, SL avec D+, race-sim
 * montagne…), propose 2–3 façons de la réaliser hors montagne :
 *   • 🏔️ Montagne (référence — séance d'origine)
 *   • 🏙️ Parc / boucles vallonnées (urbain outdoor)
 *   • 🏃 Tapis incliné
 *   • 🦔 Hérisson — côtes courtes répétées (parking, talus, escaliers)
 *
 * v2 : les hints sont calculés à partir des métriques extraites du titre +
 * détails (durée, reps×durée, %incl, D+ cumulé, intensité). On reste
 * mapping pur côté code, mais l'alternative reflète la structure réelle de
 * la séance d'origine au lieu d'une formule générique.
 */

export type TrailAltKind = "mountain" | "urban" | "treadmill" | "hedgehog";

export interface TrailAlternative {
  kind: TrailAltKind;
  icon: string;       // emoji court, rendu inline
  label: string;      // libellé court
  hint: string;       // équivalence pratique adaptée à la séance
}

const TRAIL_HINT = /(trail|d\+|deniv|dénivel|montée|montee|monte\b|descente|côte|cote\b|cotes\b|côtes|sentier|montagne|escalier|rando|verti(?:cal|kilo)|kmv)/i;

type SessionKind =
  | "race_sim"
  | "long_run_dplus"
  | "vma_cote"
  | "seuil_cote"
  | "descente"
  | "endurance_dplus";

interface SessionContext {
  durationMin: number | null;       // durée totale estimée (min)
  repsCount: number | null;          // nb répétitions (ex: "8×400m" → 8)
  repsLabel: string | null;          // ex: "8×400m", "5×6min"
  dPlusM: number | null;             // D+ cumulé (m)
  intensity: string | null;          // ex: "Z2", "seuil", "VMA"
  inclinePct: [number, number] | null; // fourchette % inclinaison si déjà mentionnée
}

function parseDurationMin(text: string): number | null {
  // Forme h:mm collée — "2h30", "1h45" (pas d'espace, mm sur 2 chiffres)
  const hmStrict = text.match(/\b(\d{1,2})\s*h\s*(\d{2})\b/i);
  if (hmStrict) {
    const h = parseInt(hmStrict[1], 10);
    const m = parseInt(hmStrict[2], 10);
    if (h >= 1 && h <= 12 && m < 60) return h * 60 + m;
  }
  // Forme h seule — "3h", "2 h" (pas suivi d'un autre chiffre pour éviter "3h 3h Z2" → 3h03)
  const hOnly = text.match(/\b(\d{1,2})\s*h\b(?!\s*\d)/i);
  if (hOnly) {
    const h = parseInt(hOnly[1], 10);
    if (h >= 1 && h <= 12) return h * 60;
  }
  // Forme min — "90 min", "45min"
  const m = text.match(/\b(\d{2,3})\s*min\b/i);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 20 && v <= 480) return v;
  }
  return null;
}


function parseReps(text: string): { count: number | null; label: string | null } {
  // Ex: "8×400m", "5x6min", "10 × 30/30", "3×8min"
  const m = text.match(/(\d{1,2})\s*[×x*]\s*(\d{1,4})\s*(m\b|min|'|s\b|sec|\/\d+)/i);
  if (!m) return { count: null, label: null };
  return { count: parseInt(m[1], 10), label: `${m[1]}×${m[2]}${m[3].replace(/\s/g, "")}` };
}

function parseDPlus(text: string): number | null {
  // "1200 m D+", "+800m", "800 m D+", "D+: 1500"
  const m = text.match(/(\d{2,4})\s*m?\s*(?:D\+|d\+|de denivel|de déniv|de\s*d\+)/i)
    || text.match(/\+\s*(\d{2,4})\s*m\b/);
  if (m) {
    const v = parseInt(m[1], 10);
    if (v >= 100 && v <= 9000) return v;
  }
  return null;
}

function parseIntensity(text: string): string | null {
  if (/sweet[\s-]?spot|sst\b/i.test(text)) return "Sweet Spot";
  if (/seuil|threshold|lt2|mlss|tempo/i.test(text)) return "Seuil";
  if (/vma\b|vo2max|vo2\s*max/i.test(text)) return "VMA";
  if (/z2\b|fondamentale|endurance fondamentale/i.test(text)) return "Z2";
  if (/z1\b|récup|recup/i.test(text)) return "Z1";
  if (/z3\b|tempo/i.test(text)) return "Z3";
  return null;
}

function parseIncline(text: string): [number, number] | null {
  // "5-8%", "à 6%", "incl. 4-7%"
  const range = text.match(/(\d{1,2})\s*[-–à]\s*(\d{1,2})\s*%/);
  if (range) return [parseInt(range[1], 10), parseInt(range[2], 10)];
  const single = text.match(/(\d{1,2})\s*%/);
  if (single) {
    const v = parseInt(single[1], 10);
    if (v >= 1 && v <= 20) return [v, v];
  }
  return null;
}

function extractContext(text: string): SessionContext {
  return {
    durationMin: parseDurationMin(text),
    repsCount: parseReps(text).count,
    repsLabel: parseReps(text).label,
    dPlusM: parseDPlus(text),
    intensity: parseIntensity(text),
    inclinePct: parseIncline(text),
  };
}

function detectKind(text: string): SessionKind | null {
  const t = text.toLowerCase();
  if (!TRAIL_HINT.test(t)) return null;
  if (/race[\s-]?sim|simulation course|simul course|simulation race|race day/.test(t)) return "race_sim";
  if (/descente|excentr/.test(t)) return "descente";
  if (/vma|30\/30|15\/15|sprint.*côte|sprint.*cote|côtes? courtes?|cotes? courtes?/.test(t)) return "vma_cote";
  if (/seuil|tempo|sweet[\s-]?spot|sst\b|threshold/.test(t)) return "seuil_cote";
  if (/(sl\b|sortie longue|long run|endurance longue|\b2h|\b3h|\b4h)/.test(t)) return "long_run_dplus";
  return "endurance_dplus";
}

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }
  return `${min} min`;
}

function inclineHint(ctx: SessionContext, fallback: string): string {
  if (ctx.inclinePct) {
    const [a, b] = ctx.inclinePct;
    return a === b ? `${a}%` : `${a}–${b}%`;
  }
  return fallback;
}

/**
 * Retourne les alternatives pour une séance donnée.
 * Renvoie [] si la séance n'est pas trail / pas pertinente.
 */
export function getTrailSessionAlternatives(input: {
  sport?: string;
  title?: string;
  details?: string;
}): TrailAlternative[] {
  const sport = (input.sport || "").toLowerCase();
  if (/swim|natation|bike|v[ée]lo|repos|rest|muscu|force|renfo/.test(sport)) return [];

  const text = `${input.title ?? ""} ${input.details ?? ""}`.trim();
  const kind = detectKind(text);
  if (!kind) return [];

  const ctx = extractContext(text);
  const durStr = ctx.durationMin ? formatDuration(ctx.durationMin) : null;
  const dPlusStr = ctx.dPlusM ? `${ctx.dPlusM} m D+` : null;

  const mountain: TrailAlternative = {
    kind: "mountain",
    icon: "🏔️",
    label: "Montagne (référence)",
    hint: [durStr, dPlusStr, ctx.intensity].filter(Boolean).join(" · ")
      || "Terrain trail réel — version prescrite",
  };

  switch (kind) {
    case "race_sim": {
      const target = durStr ? `viser ${durStr}` : "viser la durée prescrite";
      const dplusTarget = dPlusStr ? ` et ${dPlusStr}` : "";
      const tapisCap = ctx.durationMin && ctx.durationMin > 150 ? "≤ 2h30 sur tapis (au-delà : outdoor)" : `${durStr ?? "durée prescrite"} sur tapis 4–7%`;
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Parc / boucles vallonnées",
          hint: `Sac lesté + matériel jour J, ${target}${dplusTarget}`,
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Tapis incliné — race-sim",
          hint: `${tapisCap} · test nutrition complet`,
        },
      ];
    }

    case "long_run_dplus": {
      const urbanLoops = ctx.dPlusM
        ? `Boucles répétées pour cumuler ${ctx.dPlusM} m D+ (≈${Math.round(ctx.dPlusM / 50)} × bosse 50 m)`
        : "Cumuler le D+ par boucles répétées (≥ 2 h outdoor)";
      const tapisDur = ctx.durationMin
        ? (ctx.durationMin > 120
            ? `≤ 2h sur tapis ${inclineHint(ctx, "3–8%")} puis bascule outdoor`
            : `${durStr} sur tapis ${inclineHint(ctx, "3–8%")} Z2`)
        : `≤ 2 h à ${inclineHint(ctx, "3–8%")} Z2`;
      return [
        mountain,
        { kind: "urban", icon: "🏙️", label: "Parc / boucles vallonnées", hint: urbanLoops },
        { kind: "treadmill", icon: "🏃", label: "Tapis incliné progressif", hint: tapisDur },
      ];
    }

    case "vma_cote": {
      const reps = ctx.repsLabel
        ? `Reproduire ${ctx.repsLabel} côte 6–10 %, récup descente facile`
        : "8–12 × 30–60 s côte 6–10 %, récup descente facile";
      const tapis = ctx.repsLabel
        ? `Fartlek ${ctx.repsLabel} à ${inclineHint(ctx, "6–10%")} incl., allure VMA`
        : `Fartlek 30/30 ou 1'/1' à ${inclineHint(ctx, "6–10%")} incl., allure VMA`;
      return [
        mountain,
        { kind: "hedgehog", icon: "🦔", label: "Hérisson — côtes courtes", hint: reps },
        { kind: "treadmill", icon: "🏃", label: "Tapis VMA inclinée", hint: tapis },
      ];
    }

    case "seuil_cote": {
      const intensityLabel = ctx.intensity || "Z3–Z4";
      const cote = ctx.repsLabel
        ? `${ctx.repsLabel} ${intensityLabel} sur côte 4–8 %, récup descente`
        : `3–5 × 6–10 min ${intensityLabel} sur côte 4–8 %, récup descente`;
      const tapis = ctx.durationMin && ctx.durationMin <= 90
        ? `${durStr} dont blocs ${intensityLabel} à ${inclineHint(ctx, "3–6%")} incl.`
        : `Bloc continu 20–40 min à ${inclineHint(ctx, "3–6%")} incl. au seuil`;
      return [
        mountain,
        { kind: "urban", icon: "🏙️", label: "Côte longue urbaine", hint: cote },
        { kind: "treadmill", icon: "🏃", label: "Tapis seuil progressif", hint: tapis },
      ];
    }

    case "descente":
      return [
        mountain,
        {
          kind: "urban",
          icon: "🏙️",
          label: "Sentier vallonné / parc",
          hint: ctx.repsLabel
            ? `${ctx.repsLabel} descentes en contrôle excentrique, montée trot`
            : "Répétitions descentes 200–500 m en contrôle excentrique",
        },
        {
          kind: "treadmill",
          icon: "🏃",
          label: "Salle — excentrique guidé",
          hint: "Tapis ne descend pas → squats + step-down + Nordic curls excentriques",
        },
      ];

    case "endurance_dplus":
    default: {
      const urbanHint = ctx.dPlusM
        ? `Cumuler ~${ctx.dPlusM} m D+ par petites bosses (parc, ponts)`
        : "Reproduire le D+/h cible par cumul de petites bosses";
      const tapisHint = durStr
        ? `${durStr} à ${inclineHint(ctx, "3–6%")} incl. en continu (chaîne postérieure)`
        : `Incl. ${inclineHint(ctx, "3–6%")} en continu pour solliciter la chaîne postérieure`;
      return [
        mountain,
        { kind: "urban", icon: "🏙️", label: "Parc / boucles vallonnées", hint: urbanHint },
        { kind: "treadmill", icon: "🏃", label: "Tapis incliné Z2", hint: tapisHint },
      ];
    }
  }
}

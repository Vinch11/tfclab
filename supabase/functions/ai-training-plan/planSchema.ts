/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1A — Schéma Zod miroir de ParsedPlan (src/lib/aiPlanParser.ts)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Correspondance ParsedPlan (client) ↔ zPlanChunk (sortie LLM) :
 *
 *   ParsedPlan.title                     ← zPlanChunk.title            (LLM)
 *   ParsedPlan.diagnostic                ← zPlanChunk.diagnostic       (LLM, chunk 1)
 *   ParsedPlan.strategicRecap            ← zPlanChunk.strategicRecap   (LLM, chunk 1)
 *   ParsedPlan.phases[]                  ← zPlanChunk.phases[]         (LLM, chunk 1)
 *   ParsedPlan.weeks[].weekNumber        ← zWeek.weekNumber            (LLM)
 *   ParsedPlan.weeks[].phase             ← zWeek.phase (enum)          (LLM)
 *   ParsedPlan.weeks[].theme             ← zWeek.theme                 (LLM)
 *   ParsedPlan.weeks[].phaseObjective    ← zWeek.phaseObjective        (LLM)
 *   ParsedPlan.weeks[].coachNotes        ← zWeek.weeklyNotes           (LLM)
 *   ParsedPlan.weeks[].volumeTarget      ← SUPPRIMÉ (contrainte N°4)
 *   ParsedPlan.weeks[].computedVolumeMin ← COMPUTED côté client (Σ durationMin)
 *   ParsedPlan.weeks[].sessions[]        ← zWeek.sessions[]            (LLM)
 *     .dayName                           ← zSession.day (enum)         (LLM)
 *     .dayIndex                          ← DÉRIVÉ du day côté merge
 *     .sport                             ← zSession.sport (enum)       (LLM)
 *     .title                             ← zSession.title              (LLM)
 *     .details                           ← zSession.details            (LLM)
 *     .isRest                            ← DÉRIVÉ (sport === "rest")
 *   Nouveaux champs structurés (Phase 1A) :
 *     zSession.isKeySession              ← remplace le marqueur 🔑
 *     zSession.catalogId                 ← enum runtime (contrainte N°2)
 *     zSession.custom                    ← discriminant
 *     zSession.durationMin               ← source unique du volume hebdo (contrainte N°4)
 *     zSession.zones                     ← liste des zones prescrites (Z1..Z5, RPE, %FTP…)
 *
 * Contrainte N°2 (ENUM RUNTIME) — `catalogId` est validé contre
 * `z.enum(allowedIds)` construit AU RUNTIME depuis les IDs du catalogue
 * filtré injecté POUR CE CHUNK. `custom:true` ⇒ `catalogId=null`.
 * `custom:false` ⇒ `catalogId` obligatoire ET membre de l'enum.
 *
 * Contrainte N°4 (VOLUME) — aucun champ `volume`/`volumeTarget` déclaré
 * n'est présent dans le schéma. Le volume hebdomadaire est recalculé côté
 * client par `Σ durationMin` groupé par sport.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { z } from "npm:zod@3.23.8";

// Marqueurs B3 strictement critical : D+ chiffré, trail technique / massif géographique, etc.
// "vallonné" seul reste warning (terrain vallonné légitime en route/tri).
// "massif" nu retiré (faux positif : "volume massif", "travail massif", "repas glucidique massif").
// Conservé uniquement en contexte géographique : "en massif", "massif des/du/central", "moyenne montagne".
export const TRAIL_DETAILS_CRITICAL_RX = /(?:\b\d{2,}\s*m\s*D\+\b|\bD\+\s*\d{2,}\s*m\b|\+\s*\d{2,}\s*m\b|montée\s+sèche|b[âa]tons|power[-\s]?hike|vertical[-\s]?km|\bVK\b|\ben\s+massif\b|\bmassif\s+(?:des?|du|central)\b|moyenne\s+montagne|\bardennes\b|\bvosges\b|\balpes\b|\bpyr[ée]n[ée]es\b|sentier\s+technique|trail\s+technique)/i;
export const TRAIL_DETAILS_WARNING_RX = /vallonn[ée]/i;

// ─────────────────────────────────────────────────────────────────────────────
// Enums fermés
// ─────────────────────────────────────────────────────────────────────────────

export const zDay = z.enum([
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
]);
export type DayLower = z.infer<typeof zDay>;

export const DAY_INDEX: Record<DayLower, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3,
  vendredi: 4, samedi: 5, dimanche: 6,
};
export const DAY_CAPITALIZED: Record<DayLower, string> = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
  vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

export const zSport = z.enum([
  "swim", "bike", "run", "brick", "strength", "recovery", "rest",
]);
export type Sport = z.infer<typeof zSport>;

export const zPhase = z.enum(["base", "build", "peak", "taper"]);
export type Phase = z.infer<typeof zPhase>;

// ─────────────────────────────────────────────────────────────────────────────
// Récap stratégique (miroir ParsedPlan.strategicRecap)
// ─────────────────────────────────────────────────────────────────────────────

export const zStrategicLimiter = z.object({
  rank: z.number().int().positive(),
  name: z.string().min(1),
  status: z.string(),
  block: z.string(),
  weeks: z.string(),
  keySessions: z.string(),
});

export const zStrategicRecap = z.object({
  limiters: z.array(zStrategicLimiter),
  synergies: z.array(z.string()),
});

const zPhaseSummary = z.object({
  name: z.string().min(1),
  weeks: z.string(),                    // ex "S1-S6"
  objective: z.string().optional(),
  // pas de champ `volume` — contrainte N°4
});

// ─────────────────────────────────────────────────────────────────────────────
// Session — union discriminée sur `custom` + gestion du repos
// ─────────────────────────────────────────────────────────────────────────────

const zSessionBase = {
  day: zDay,
  title: z.string().min(1),
  details: z.string().default(""),
  isKeySession: z.boolean().default(false),
  durationMin: z.number().int().nonnegative(),
  zones: z.array(z.string()).default([]),
};

/**
 * Construit le schéma d'une session. `allowedIds` alimente l'enum runtime
 * pour les séances catalogue (`custom: false`).
 */
function buildSessionSchema(allowedIds: string[]) {
  const hasIds = allowedIds.length > 0;

  // Séance de repos — aucune donnée métabolique.
  const zSessionRest = z.object({
    ...zSessionBase,
    sport: z.literal("rest"),
    custom: z.literal(true),
    catalogId: z.null(),
    durationMin: z.literal(0),
  });

  // Séance custom (non-rest).
  const zSessionCustom = z.object({
    ...zSessionBase,
    sport: z.enum(["swim", "bike", "run", "brick", "strength", "recovery"]),
    custom: z.literal(true),
    catalogId: z.null(),
  });

  // Séance issue du catalogue → catalogId ∈ enum runtime.
  const catalogIdSchema = hasIds
    // z.enum requires a non-empty tuple; cast to satisfy TS.
    ? z.enum(allowedIds as [string, ...string[]])
    : z.string().min(1); // fallback si catalog vide (rare, log warning côté handler)

  const zSessionRef = z.object({
    ...zSessionBase,
    sport: z.enum(["swim", "bike", "run", "brick", "strength", "recovery"]),
    custom: z.literal(false),
    catalogId: catalogIdSchema,
  });

  return z.union([zSessionRest, zSessionRef, zSessionCustom]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fabrique du schéma d'un chunk (contrainte N°2)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildPlanChunkSchemaOptions {
  /** Nombre exact de semaines attendu dans le chunk (regenerateWeek → 1). undefined = pas de contrainte. */
  expectedWeekCount?: number;
  /** Chunk 1 attend `diagnostic` / `strategicRecap` / `phases`. Sinon optionnel. */
  isFirstChunk?: boolean;
}

export function buildPlanChunkSchema(
  allowedIds: string[],
  opts: BuildPlanChunkSchemaOptions = {},
) {
  const zSession = buildSessionSchema(allowedIds);

  const zWeek = z.object({
    weekNumber: z.number().int().positive(),
    phase: zPhase,
    theme: z.string().default(""),
    phaseObjective: z.string().optional(),
    weeklyNotes: z.string().optional(),
    sessions: z.array(zSession).min(1),
  });

  const weeksSchema = opts.expectedWeekCount !== undefined
    ? z.array(zWeek).length(opts.expectedWeekCount)
    : z.array(zWeek).min(1);

  return z.object({
    title: opts.isFirstChunk ? z.string().min(1) : z.string().optional(),
    diagnostic: opts.isFirstChunk ? z.string().optional() : z.string().optional(),
    strategicRecap: opts.isFirstChunk ? zStrategicRecap.optional() : zStrategicRecap.optional(),
    phases: opts.isFirstChunk ? z.array(zPhaseSummary).optional() : z.array(zPhaseSummary).optional(),
    weeks: weeksSchema,
  });
}

export type PlanChunk = z.infer<ReturnType<typeof buildPlanChunkSchema>>;
export type PlanWeek = PlanChunk["weeks"][number];
export type PlanSession = PlanWeek["sessions"][number];

// ─────────────────────────────────────────────────────────────────────────────
// Extraction des IDs autorisés depuis le dump catalogue Markdown
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrait les IDs de séances depuis le catalogue sérialisé
 * (produit par `serializeCatalogForPrompt` — cf. src/lib/workoutCatalogBuilder.ts).
 *
 * Format attendu (lignes du tableau Markdown) :
 *   `| B_LCW_XXX_YY | B | Objectif... | phases | dur | struct |`
 *
 * On extrait le 1er champ (ID) de chaque ligne qui commence par `|` et
 * dont le 1er token est un identifiant en MAJUSCULES/CHIFFRES/_.
 */
export function extractCatalogIdsFromDump(dump: string | null | undefined): string[] {
  if (!dump) return [];
  const ids = new Set<string>();
  const lines = dump.split("\n");
  const idRx = /^\|\s*([A-Z][A-Z0-9_]+)\s*\|/;
  for (const line of lines) {
    const m = line.match(idRx);
    if (m && m[1] !== "ID") ids.add(m[1]);
  }
  return Array.from(ids);
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatage compact des erreurs Zod pour le retry
// ─────────────────────────────────────────────────────────────────────────────

export interface FormattedZodIssue {
  path: string;
  message: string;
  code: string;
}

export function collectZodIssues(err: z.ZodError, maxItems = Number.POSITIVE_INFINITY): FormattedZodIssue[] {
  const out: FormattedZodIssue[] = [];
  const pushIssue = (issue: z.ZodIssue, inheritedPath: (string | number)[] = []) => {
    if (out.length >= maxItems) return;
    const ownPath = issue.path.length > 0 ? issue.path : inheritedPath;
    if (issue.code === "invalid_union") {
      const unionErrors = (issue as z.ZodInvalidUnionIssue).unionErrors;
      unionErrors.forEach((unionErr, unionIndex) => {
        unionErr.errors.forEach(nested => {
          if (out.length >= maxItems) return;
          const nestedPath = nested.path.length > 0 ? nested.path : ownPath;
          out.push({
            path: nestedPath.join(".") || "(root)",
            message: `[union#${unionIndex}] ${nested.message}`,
            code: nested.code,
          });
        });
      });
      return;
    }
    out.push({
      path: ownPath.join(".") || "(root)",
      message: issue.message,
      code: issue.code,
    });
  };
  err.errors.forEach(issue => pushIssue(issue));
  return out.slice(0, maxItems);
}

export function formatZodErrors(err: z.ZodError, maxItems = 15): string {
  return collectZodIssues(err, maxItems).map(e => `- ${e.path}: ${e.message}`).join("\n");
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Reconciliateur déterministe post-génération (client-only)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Passe granularité SEMAINE (pas chunk). Pour chaque séance placée :
 *   1. PHASE       — si ficheAllowedPhases ne contient pas la phase de la semaine
 *                    → substituer par une fiche de même sport + même intention.
 *   2. DURÉE       — si sizing-matrix duration hors plage fiche
 *                    → substituer par candidat dont [dmin,dmax] la contient.
 *   3. DISCIPLINE  — si sport fiche ≠ sport séance
 *                    → substituer par fiche du bon sport / même intention.
 *   4. QUOTA
 *      a. FLOOR    — sport sous minimum ET 0 séance → INSÉRER depuis catalogue
 *      b. CEILING  — sport dépasse max → RETIRER la moins prioritaire
 *      c. re-vérifier SL floor via présence (déjà géré côté serveur, on ne
 *         casse rien : on préserve les séances key/SL des trims).
 *
 * Idempotence : max 2 passes ; en cas de conflit persistant → log
 * "reconcile_conflict" et on laisse B10/B11 le remonter.
 *
 * Contraintes :
 *   - Utilise `ficheAllowedPhases` (SOURCE UNIQUE avec B11).
 *   - Ne touche pas au traducteur d'intensités ni au parseur zone.
 *   - N'insère jamais silencieusement : chaque action journalisée.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheAllowedPhases, type PlanPhase } from "@/lib/plan/phaseNormalization";
import { intentFamilyOf } from "@/lib/plan/intentFamily";

// ── Types ───────────────────────────────────────────────────────────────────
type SchemaSport = "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest";
type NormSport = SchemaSport | "other";

export interface ReconcilerCounters {
  phase_substituted: number;
  phase_unresolved: number;
  id_substituted_duration: number;
  duration_unresolved: number;
  discipline_substituted: number;
  discipline_unresolved: number;
  quota_floor_inserted_from_catalog: number;
  quota_floor_unresolved: number;
  quota_ceiling_trimmed: number;
  reconcile_conflict: number;
  id_remapped_to_neighbor: number;
  id_remap_no_intent_match_fallback_custom: number;
}

export interface ReconcilerResult {
  counters: ReconcilerCounters;
  logs: string[];
}


// ── Index fiches ────────────────────────────────────────────────────────────
const FICHES_BY_ID: Map<string, LibraryWorkout> = (() => {
  const m = new Map<string, LibraryWorkout>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();
function ficheFor(id: string | null | undefined): LibraryWorkout | null {
  if (!id) return null;
  return FICHES_BY_ID.get(id.toUpperCase()) ?? null;
}

// ── Normalisation sport ────────────────────────────────────────────────────
function normSport(s: string | null | undefined): NormSport {
  const x = (s ?? "").toLowerCase();
  if (x === "swim" || x === "natation") return "swim";
  if (x === "bike" || x === "cyclisme" || x === "vélo" || x === "velo") return "bike";
  if (x === "run" || x === "course" || x === "trail") return "run";
  if (x === "brick") return "brick";
  if (x === "strength" || x === "renforcement" || x === "renfo" || x === "str") return "strength";
  if (x === "recovery" || x === "récup" || x === "recup" || x === "récupération") return "recovery";
  if (x === "rest" || x === "repos" || x === "off") return "rest";
  return "other";
}

// ── Helpers fiche ──────────────────────────────────────────────────────────
function ficheMainZoneMax(w: LibraryWorkout): number {
  const mains = (w.structure || []).filter(p => /main/i.test(p.part || ""));
  let mx = 0;
  for (const p of mains) for (const z of (p.zones || [])) {
    const m = String(z).match(/z\s*([1-7])/i);
    if (m) mx = Math.max(mx, Number(m[1]));
  }
  return mx;
}
function ficheMedian(w: LibraryWorkout): number {
  const [a, b] = w.durationMin;
  return Math.round((a + b) / 2);
}
function ficheDurationContains(w: LibraryWorkout, dur: number): boolean {
  const [a, b] = w.durationMin;
  return dur >= a && dur <= b;
}

// ── Score d'intention (même cat, goals partagés, famille zone) ─────────────
function intentScore(original: LibraryWorkout, candidate: LibraryWorkout): number {
  let score = 0;
  if (original.cat && candidate.cat && original.cat === candidate.cat) score += 4;
  const og = new Set((original.goals ?? []) as string[]);
  const cg = new Set((candidate.goals ?? []) as string[]);
  let shared = 0;
  for (const g of og) if (cg.has(g)) shared++;
  score += shared * 2;
  const oMax = ficheMainZoneMax(original);
  const cMax = ficheMainZoneMax(candidate);
  const oFamily = oMax <= 2 ? "easy" : oMax <= 4 ? "threshold" : "vo2";
  const cFamily = cMax <= 2 ? "easy" : cMax <= 4 ? "threshold" : "vo2";
  if (oFamily === cFamily) score += 2;
  if (original.necessite === candidate.necessite) score += 1;
  return score;
}

interface FindOpts {
  sport: NormSport;
  weekPhase: PlanPhase;
  targetDur: number;
  original?: LibraryWorkout | null;
  requireDurationContains?: boolean;
  requirePhase?: boolean;
}

function findReplacement(opts: FindOpts, excludeId?: string): LibraryWorkout | null {
  const { sport, weekPhase, targetDur, original } = opts;
  const requireDur = opts.requireDurationContains !== false;
  const requirePhase = opts.requirePhase !== false;
  let best: { w: LibraryWorkout; key: number } | null = null;
  for (const w of WorkoutLibrary) {
    if (excludeId && w.id.toUpperCase() === excludeId.toUpperCase()) continue;
    if (normSport(w.sport) !== sport) continue;
    if (requirePhase) {
      const allowed = ficheAllowedPhases(w);
      if (allowed.size > 0 && !allowed.has(weekPhase)) continue;
    }
    if (requireDur && targetDur > 0 && !ficheDurationContains(w, targetDur)) continue;
    const durPenalty = targetDur > 0 ? Math.abs(ficheMedian(w) - targetDur) / 10 : 0;
    const intent = original ? intentScore(original, w) : 0;
    const key = intent * 100 - durPenalty; // maximize intent, tiebreak by duration proximity
    if (!best || key > best.key) best = { w, key };
  }
  return best?.w ?? null;
}

// ── Mutation session avec fiche ────────────────────────────────────────────
function assignFiche(session: PlanSession, fiche: LibraryWorkout, keepDuration?: number): void {
  const mut = session as any;
  const struct = (fiche.structure || []).map(p => `${p.part}: ${p.text}`).join(" | ");
  const zones = new Set<string>();
  for (const p of (fiche.structure || [])) for (const z of (p.zones || [])) zones.add(z);
  mut.title = fiche.objectif || fiche.id;
  mut.details = `${struct}. [ID: ${fiche.id}]`;
  mut.catalogId = fiche.id;
  mut.custom = false;
  mut.zones = Array.from(zones);
  mut.sport = normSport(fiche.sport);
  const [a, b] = fiche.durationMin;
  if (typeof keepDuration === "number" && keepDuration > 0) {
    mut.durationMin = Math.min(b, Math.max(a, keepDuration));
  } else if ((session.durationMin ?? 0) < a || (session.durationMin ?? 0) > b) {
    mut.durationMin = Math.round((a + b) / 2);
  }
}

// ── Passe unique ───────────────────────────────────────────────────────────
function runOnePass(
  chunks: PlanChunk[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
  counters: ReconcilerCounters,
  logs: string[],
): boolean {
  let anyChange = false;
  const ctx: { week?: number; day?: string; sport?: string; catalogId?: string | null; family?: string } = {};
  try {

  for (const chunk of chunks) {
    for (const week of chunk.weeks ?? []) {
      const weekPhase = week.phase as PlanPhase;
      const quotaEntry = quotasByWeek[week.weekNumber] ?? null;

      // ── STEP 1-3 : per-session substitutions ───────────────────────────
      for (const s of (week.sessions ?? []) as PlanSession[]) {
        if ((s as any).isRest || s.sport === "rest") continue;
        if (s.custom) continue; // custom = pas de fiche à contrôler
        const fiche = ficheFor(s.catalogId);
        if (!fiche) continue;
        ctx.week = week.weekNumber; ctx.day = s.day; ctx.sport = s.sport; ctx.catalogId = s.catalogId;

        // 1. PHASE
        ctx.family = "phase";
        const allowed = ficheAllowedPhases(fiche);
        if (allowed.size > 0 && !allowed.has(weekPhase)) {
          const repl = findReplacement({
            sport: normSport(s.sport),
            weekPhase,
            targetDur: s.durationMin ?? 0,
            original: fiche,
          }, fiche.id);
          if (repl) {
            const before = fiche.id;
            assignFiche(s, repl, s.durationMin);
            counters.phase_substituted++;
            anyChange = true;
            logs.push(`[phase_substituted] W${week.weekNumber}/${s.day} ${before}(${[...allowed].join(",")}) → ${repl.id} (phase=${weekPhase})`);
            continue; // re-evaluate on next pass
          } else {
            counters.phase_unresolved++;
            logs.push(`[phase_unresolved] W${week.weekNumber}/${s.day} sport=${s.sport} fiche=${fiche.id} weekPhase=${weekPhase} allowed=${[...allowed].join(",")}`);
          }
        }

        // Reload fiche after possible mutation
        const fiche2 = ficheFor(s.catalogId);
        if (!fiche2) continue;

        // 2. DURÉE
        ctx.family = "durée";
        const targetDur = s.durationMin ?? 0;
        if (targetDur > 0 && !ficheDurationContains(fiche2, targetDur)) {
          const repl = findReplacement({
            sport: normSport(s.sport),
            weekPhase,
            targetDur,
            original: fiche2,
            requireDurationContains: true,
          }, fiche2.id);
          if (repl) {
            const before = fiche2.id;
            assignFiche(s, repl, targetDur);
            counters.id_substituted_duration++;
            anyChange = true;
            logs.push(`[id_substituted_duration] W${week.weekNumber}/${s.day} ${before}(${fiche2.durationMin[0]}-${fiche2.durationMin[1]}) → ${repl.id} target=${targetDur}min`);
          } else {
            counters.duration_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber}/${s.day} durée ${targetDur}min hors plage fiche ${fiche2.id} ${fiche2.durationMin[0]}-${fiche2.durationMin[1]} — pas de candidat phase=${weekPhase} sport=${s.sport}`);
            counters.reconcile_conflict++;
          }
        }

        // 3. DISCIPLINE
        ctx.family = "discipline";
        const fiche3 = ficheFor(s.catalogId);
        if (!fiche3) continue;
        const fSp = normSport(fiche3.sport);
        const iSp = normSport(s.sport);
        if (fSp !== "other" && iSp !== "other" && fSp !== iSp) {
          const repl = findReplacement({
            sport: iSp,
            weekPhase,
            targetDur: s.durationMin ?? 0,
            original: fiche3,
          }, fiche3.id);
          if (repl) {
            const before = fiche3.id;
            assignFiche(s, repl, s.durationMin);
            counters.discipline_substituted++;
            anyChange = true;
            logs.push(`[discipline_substituted] W${week.weekNumber}/${s.day} ${before}(${fSp}) → ${repl.id}(${iSp})`);
          } else {
            counters.discipline_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber}/${s.day} discipline: session=${iSp} fiche=${fiche3.id}(${fSp}) — pas de candidat`);
            counters.reconcile_conflict++;
          }
        }
      }

      // ── STEP 4 : QUOTAS ─────────────────────────────────────────────────
      if (!quotaEntry) continue;
      const q = quotaEntry.quota;
      const floors = quotaEntry.floors;
      const isTaperOrRace = quotaEntry.weekType === "race";

      // Recompte
      const bySport = new Map<string, PlanSession[]>();
      for (const s of (week.sessions ?? []) as PlanSession[]) {
        if ((s as any).isRest || s.sport === "rest") continue;
        const arr = bySport.get(s.sport) ?? [];
        arr.push(s);
        bySport.set(s.sport, arr);
      }
      const cnt = (sp: string) => (bySport.get(sp)?.length ?? 0);

      // 4a. FLOOR — insertion depuis catalogue
      ctx.family = "quota-floor"; ctx.week = week.weekNumber; ctx.day = undefined; ctx.sport = undefined; ctx.catalogId = undefined;
      if (!isTaperOrRace) {
        const specs: Array<{ sport: SchemaSport; min: number }> = [
          { sport: "swim", min: q.swim.min },
          { sport: "bike", min: q.bike.min },
          { sport: "run", min: q.run.min },
          { sport: "strength", min: q.strength.min },
        ];
        for (const sp of specs) {
          if (sp.min < 1) continue;
          if (cnt(sp.sport) > 0) continue;
          const floor =
            sp.sport === "bike" && floors.longRideWeekly && floors.slLongRideMin ? floors.slLongRideMin :
            sp.sport === "run" && floors.longRunWeekly && floors.slLongRunMin ? floors.slLongRunMin :
            sp.sport === "strength" ? 45 : 60;
          const repl = findReplacement({
            sport: sp.sport as NormSport,
            weekPhase,
            targetDur: floor,
            original: null,
            requireDurationContains: true,
          });
          if (!repl) {
            counters.quota_floor_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber} floor ${sp.sport}: min=${sp.min} présent=0 pas de fiche catalogue phase=${weekPhase} ≥${floor}min`);
            counters.reconcile_conflict++;
            continue;
          }
          const dayCounts = new Map<string, number>();
          for (const s of (week.sessions ?? []) as PlanSession[]) {
            dayCounts.set(s.day, (dayCounts.get(s.day) ?? 0) + 1);
          }
          const targetDay = (["mardi","jeudi","samedi","dimanche","mercredi","vendredi","lundi"] as const)
            .find(d => (dayCounts.get(d) ?? 0) < q.maxSessionsPerDay) ?? "mercredi";
          const [a, b] = repl.durationMin;
          const dur = Math.min(b, Math.max(a, floor));
          const zones = new Set<string>();
          for (const p of (repl.structure || [])) for (const z of (p.zones || [])) zones.add(z);
          const struct = (repl.structure || []).map(p => `${p.part}: ${p.text}`).join(" | ");
          const newSess: any = {
            day: targetDay,
            title: repl.objectif || repl.id,
            details: `${struct}. [ID: ${repl.id}]`,
            isKeySession: floor >= 60,
            durationMin: dur,
            zones: Array.from(zones),
            sport: sp.sport,
            custom: false,
            catalogId: repl.id,
          };
          (week.sessions as any[]).push(newSess);
          counters.quota_floor_inserted_from_catalog++;
          anyChange = true;
          logs.push(`[quota_floor_inserted_from_catalog] W${week.weekNumber} ${sp.sport} min=${sp.min} inséré ${repl.id} (${dur}min) le ${targetDay}`);
        }
      }

      // 4b. CEILING — trim
      ctx.family = "quota-ceiling";
      const trimSpecs: Array<{ sport: SchemaSport; max: number }> = [
        { sport: "swim", max: q.swim.max },
        { sport: "bike", max: q.bike.max },
        { sport: "run", max: q.run.max },
        { sport: "strength", max: q.strength.max },
      ];
      for (const sp of trimSpecs) {
        // recompute (may have inserted above)
        const arr = ((week.sessions ?? []) as PlanSession[]).filter(s => s.sport === sp.sport);
        if (arr.length <= sp.max) continue;
        // Priorité de retrait : plus haut = retirer d'abord
        const scored = arr.map(s => {
          let removeScore = 0;
          if ((s as any).isKeySession) removeScore -= 100;
          const fSp = normSport(sp.sport);
          const dur = s.durationMin ?? 0;
          if (sp.sport === "bike" && floors.slLongRideMin && dur >= floors.slLongRideMin) removeScore -= 80;
          if (sp.sport === "run" && floors.slLongRunMin && dur >= floors.slLongRunMin) removeScore -= 80;
          const zMax = (() => {
            let mx = 0;
            for (const z of (s.zones ?? [])) {
              const m = String(z).match(/z\s*([1-7])/i);
              if (m) mx = Math.max(mx, Number(m[1]));
            }
            return mx;
          })();
          if (zMax <= 2) removeScore += 5;
          if (zMax >= 5) removeScore -= 10;
          // sessions courtes Z1/Z2 = premières à sauter
          if (dur > 0 && dur < 60 && zMax <= 2) removeScore += 10;
          return { s, removeScore };
        }).sort((a, b) => b.removeScore - a.removeScore);
        const toRemove = arr.length - sp.max;
        for (let k = 0; k < toRemove; k++) {
          const victim = scored[k];
          if (!victim || victim.removeScore < 0) {
            logs.push(`[reconcile_conflict] W${week.weekNumber} ${sp.sport} surplus=${arr.length}>max=${sp.max} — aucune séance non-clé à retirer`);
            counters.reconcile_conflict++;
            break;
          }
          const idx = (week.sessions as PlanSession[]).indexOf(victim.s);
          if (idx >= 0) {
            (week.sessions as PlanSession[]).splice(idx, 1);
            counters.quota_ceiling_trimmed++;
            anyChange = true;
            logs.push(`[quota_ceiling_trimmed] W${week.weekNumber} ${sp.sport} max=${sp.max} retiré ${victim.s.day} "${victim.s.title}" (${victim.s.durationMin}min, catalogId=${victim.s.catalogId ?? "custom"})`);
          }
        }
      }
    }
  }

  return anyChange;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ [reconciler_exception] family=${ctx.family ?? "?"} W${ctx.week ?? "?"}/${ctx.day ?? "?"} sport=${ctx.sport ?? "?"} catalogId=${ctx.catalogId ?? "?"} — ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
      e,
    );
    logs.push(`[reconciler_exception] family=${ctx.family ?? "?"} W${ctx.week ?? "?"}/${ctx.day ?? "?"} sport=${ctx.sport ?? "?"} catalogId=${ctx.catalogId ?? "?"} — ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

// ── API publique ───────────────────────────────────────────────────────────
export function runReconciler(
  chunks: PlanChunk[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
  maxPasses = 2,
): ReconcilerResult {
  const counters: ReconcilerCounters = {
    phase_substituted: 0,
    phase_unresolved: 0,
    id_substituted_duration: 0,
    duration_unresolved: 0,
    discipline_substituted: 0,
    discipline_unresolved: 0,
    quota_floor_inserted_from_catalog: 0,
    quota_floor_unresolved: 0,
    quota_ceiling_trimmed: 0,
    reconcile_conflict: 0,
  };
  const logs: string[] = [];
  for (let i = 0; i < maxPasses; i++) {
    const changed = runOnePass(chunks, quotasByWeek, counters, logs);
    if (!changed) break;
  }
  return { counters, logs };
}

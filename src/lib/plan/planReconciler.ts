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
import { startToRunMaxSessionMin } from "@/engines/plan/sessionSizingMatrix";
import {
  parseAthleteConstraints,
  toConstraintSport,
  constraintSportLabel,
  WEEK_DAYS,
  type AthleteConstraintRules,
  type WeekDay,
} from "@/lib/plan/constraintRules";


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
  zone_hydrated?: number;
  early_consolidation_replaced?: number;
  taper_weeks_enforced?: number;
  s2r_duration_capped?: number;
  s2r_week_resequenced?: number;
  s2r_ladder_smoothed?: number;
  s2r_long_run_removed?: number;
  race_day_inserted?: number;
  constraint_day_moved?: number;
  constraint_day_unresolved?: number;
  constraint_banned_sport_removed?: number;

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
  /** Si fourni, restreint les candidats aux IDs présents dans cet ensemble
   *  (catalogue effectivement injecté au LLM). Évite d'introduire par
   *  substitution phase/durée/discipline un ID absent du catalogue, ce qui
   *  reproduirait un FAIL B5 après coup. */
  restrictToIds?: Set<string>;
}

function findReplacement(opts: FindOpts, excludeId?: string): LibraryWorkout | null {
  const { sport, weekPhase, targetDur, original, restrictToIds } = opts;
  const requireDur = opts.requireDurationContains !== false;
  const requirePhase = opts.requirePhase !== false;
  let best: { w: LibraryWorkout; key: number } | null = null;
  for (const w of WorkoutLibrary) {
    if (excludeId && w.id.toUpperCase() === excludeId.toUpperCase()) continue;
    if (restrictToIds && !restrictToIds.has(w.id.toUpperCase())) continue;
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
  restrictToIds?: Set<string>,
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
            restrictToIds,
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
            restrictToIds,
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
            restrictToIds,
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
            restrictToIds,
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

// ── Hydratation de zone (filet post-génération) ────────────────────────────
// Réutilise ficheMainZoneMax (déjà défini plus haut). Ne touche QUE les séances
// non-custom dont l'instance ne contient PAS la zone-max de la fiche
// (dilution réelle, même critère que B10). Ajout non-destructif : la zone-max
// est insérée dans le tableau `zones`, les zones existantes (warm-up, récup)
// sont conservées.
const CARDIO_SPORTS_FOR_HYDRATION = new Set<NormSport>(["swim", "bike", "run", "brick"]);
function instanceMaxZone(s: PlanSession): number {
  let mx = 0;
  for (const z of ((s as any).zones ?? [])) {
    const m = String(z).match(/z\s*([1-7])/i);
    if (m) mx = Math.max(mx, Number(m[1]));
  }
  return mx;
}
function hydrateDilutedZones(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        if ((s as any).custom === true) continue;
        const id = (s as any).catalogId as string | null | undefined;
        if (!id) continue;
        const fiche = ficheFor(id);
        if (!fiche) continue;
        const sp = normSport(fiche.sport);
        if (!CARDIO_SPORTS_FOR_HYDRATION.has(sp)) continue;
        const fMax = ficheMainZoneMax(fiche);
        if (fMax < 3) continue; // fiche facile → pas de bloc intense à garantir
        const zonesArr: string[] = ((s as any).zones ?? []).map((z: unknown) => String(z));
        const already = zonesArr.some(z => new RegExp(`z\\s*${fMax}`, "i").test(z));
        if (already) continue;
        const iMax = instanceMaxZone(s);
        const cur = new Set<string>(zonesArr);
        cur.add(`Z${fMax}`);
        (s as any).zones = Array.from(cur);
        counters.zone_hydrated = (counters.zone_hydrated ?? 0) + 1;
        logs.push(
          `[zone_hydrated] S${wk.weekNumber} ${(s as any).day ?? ""} · ${id} — bloc intense Z${fMax} restauré (instance était max Z${iMax})`,
        );
      }
    }
  }
}

// ── Semaine de consolidation impossible avant S4 ───────────────────────────
// La fiche S2R_CONSOLIDATION_WEEK_SESSION demande de « répéter exactement le
// format de la semaine précédente » : elle n'a aucun sens en S1-S3 (il n'y a
// pas encore de volume antérieur à répéter). Filet déterministe : on la
// remplace par la fiche marche-course de base et on réécrit le texte.
const CONSOLIDATION_ID = "S2R_CONSOLIDATION_WEEK_SESSION";
const CONSOLIDATION_MIN_WEEK = 4;
const CONSOLIDATION_FALLBACK_ID = "S2R_WALK_RUN_1_2";

function ficheToText(f: LibraryWorkout): string {
  return (f.structure ?? [])
    .map(p => `${p.part}: ${p.text}`)
    .join(" | ");
}

function fixEarlyConsolidationSessions(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  const fallback = ficheFor(CONSOLIDATION_FALLBACK_ID);
  if (!fallback) return;
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      if ((wk.weekNumber ?? 0) >= CONSOLIDATION_MIN_WEEK) continue;
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        if ((s as any).catalogId !== CONSOLIDATION_ID) continue;
        (s as any).catalogIdOrigin = CONSOLIDATION_ID;
        (s as any).catalogId = fallback.id;
        (s as any).title = fallback.objectif;
        (s as any).details = `${ficheToText(fallback)} [ID: ${fallback.id}]`;
        counters.early_consolidation_replaced =
          (counters.early_consolidation_replaced ?? 0) + 1;
        logs.push(
          `[early_consolidation_replaced] S${wk.weekNumber} ${(s as any).day ?? ""} ${CONSOLIDATION_ID} → ${fallback.id} (palier impossible avant S${CONSOLIDATION_MIN_WEEK})`,
        );
      }
    }
  }
}

// ── Start to Run : plafond déterministe de durée + interdiction "sortie longue"
// Un plan Start to Run s'adresse à un débutant ou à une reprise post-blessure
// grave : aucune séance ne doit dépasser le plafond hebdo (35 min en S1-S2 →
// 60 min en fin de plan), et le vocabulaire "sortie longue" est banni au profit
// de "marche-course progressive".
const S2R_LONG_RUN_RE = /sortie longue|long ?run|SL\b/i;

function capStartToRunSessions(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const weekNumber = wk.weekNumber ?? 1;
      const cap = startToRunMaxSessionMin(weekNumber);
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        const sport = String((s as any).sport ?? "").toLowerCase();
        if (sport === "rest") continue;
        // Renfo fondation : 30 min max quelle que soit la semaine.
        const localCap = sport === "strength" ? Math.min(30, cap) : cap;
        const dur = (s as any).durationMin ?? 0;
        if (dur > localCap) {
          (s as any).durationMin = localCap;
          counters.s2r_duration_capped = (counters.s2r_duration_capped ?? 0) + 1;
          logs.push(
            `[s2r_duration_capped] S${weekNumber} ${(s as any).day ?? ""} "${(s as any).title ?? ""}" ${dur}min → ${localCap}min (plafond débutant)`,
          );
        }
        const title = String((s as any).title ?? "");
        if (S2R_LONG_RUN_RE.test(title)) {
          (s as any).title = title
            .replace(/sortie longue/gi, "marche-course progressive")
            .replace(/long ?run/gi, "marche-course progressive")
            .replace(/\bSL\b/g, "marche-course");
          (s as any).isLongSession = false;
          counters.s2r_long_run_removed = (counters.s2r_long_run_removed ?? 0) + 1;
          logs.push(
            `[s2r_long_run_removed] S${weekNumber} ${(s as any).day ?? ""} "${title}" → "${(s as any).title}" (pas de sortie longue en Start to Run)`,
          );
        }
      }
    }
  }
}

// ── Start to Run : échelle de progression marche-course ────────────────────
// Rang croissant = exposition à l'impact croissante (ratio course/marche puis
// course continue). Deux filets déterministes en découlent :
//  (1) intra-semaine : la première séance de la semaine doit être la plus
//      douce (première exposition), la dernière la plus exigeante ;
//  (2) inter-semaines : pas de saut de plus d'un palier d'une semaine à
//      l'autre (progression graduelle — pas de S7 → S9 sans marche
//      intermédiaire).
const S2R_LADDER: Record<string, number> = {
  S2R_WALK_RUN_1_2: 1,
  S2R_WALK_RUN_2_2: 2,
  S2R_WALK_RUN_3_1: 3,
  S2R_WALK_RUN_5_1: 4,
  S2R_CONTINUOUS_15: 5,
  S2R_CONTINUOUS_20_25: 6,
  S2R_CONTINUOUS_30_LONG: 7,
  S2R_FIRST_5K_WALK_RUN: 8,
};
const S2R_BY_RANK = new Map<number, string>(
  Object.entries(S2R_LADDER).map(([id, r]) => [r, id]),
);

const DAY_RANK: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
};

/** Réécrit une séance sur la fiche cible (titre + détails + catalogId). */
function applyFiche(s: PlanSession, fiche: LibraryWorkout): void {
  (s as any).catalogIdOrigin = (s as any).catalogIdOrigin ?? (s as any).catalogId;
  (s as any).catalogId = fiche.id;
  (s as any).title = fiche.objectif;
  (s as any).details = `${ficheToText(fiche)} [ID: ${fiche.id}]`;
}

function orderStartToRunWeek(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const slots = ((wk.sessions ?? []) as PlanSession[])
        .filter(s => S2R_LADDER[String((s as any).catalogId ?? "")] !== undefined)
        .sort(
          (a, b) =>
            (DAY_RANK[String((a as any).day ?? "").toLowerCase()] ?? 9) -
            (DAY_RANK[String((b as any).day ?? "").toLowerCase()] ?? 9),
        );
      if (slots.length < 2) continue;
      const ranks = slots
        .map(s => S2R_LADDER[String((s as any).catalogId)])
        .sort((a, b) => a - b);
      const already = slots.every(
        (s, i) => S2R_LADDER[String((s as any).catalogId)] === ranks[i],
      );
      if (already) continue;
      slots.forEach((s, i) => {
        const wanted = S2R_BY_RANK.get(ranks[i]);
        if (!wanted || wanted === (s as any).catalogId) return;
        const before = String((s as any).catalogId);
        const fiche = ficheFor(wanted);
        if (!fiche) return;
        applyFiche(s, fiche);
        counters.s2r_week_resequenced = (counters.s2r_week_resequenced ?? 0) + 1;
        logs.push(
          `[s2r_week_resequenced] S${wk.weekNumber} ${(s as any).day ?? ""} ${before} → ${wanted} (première exposition = format le plus doux)`,
        );
      });
    }
  }
}

function enforceStartToRunLadder(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  const allWeeks = chunks
    .flatMap(ch => ch.weeks ?? [])
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  let prevMax = 0;
  for (const wk of allWeeks) {
    const slots = ((wk.sessions ?? []) as PlanSession[]).filter(
      s => S2R_LADDER[String((s as any).catalogId ?? "")] !== undefined,
    );
    if (!slots.length) continue;
    const allowedMax = prevMax === 0 ? 2 : prevMax + 1;
    for (const s of slots) {
      const rank = S2R_LADDER[String((s as any).catalogId)];
      if (rank <= allowedMax) continue;
      const wanted = S2R_BY_RANK.get(allowedMax);
      const fiche = wanted ? ficheFor(wanted) : null;
      if (!fiche) continue;
      const before = String((s as any).catalogId);
      applyFiche(s, fiche);
      counters.s2r_ladder_smoothed = (counters.s2r_ladder_smoothed ?? 0) + 1;
      logs.push(
        `[s2r_ladder_smoothed] S${wk.weekNumber} ${(s as any).day ?? ""} ${before}(rang ${rank}) → ${fiche.id}(rang ${allowedMax}) — palier manquant, progression graduelle imposée`,
      );
    }
    prevMax = Math.max(
      prevMax,
      ...slots.map(s => S2R_LADDER[String((s as any).catalogId)] ?? 0),
    );
  }
}




// ── Affûtage : nombre minimal de semaines `taper` (Mujika & Padilla 2003,
//    Bosquet 2007 : 2 à 3 semaines de réduction de volume pour les épreuves
//    longues). Règle déterministe : on reclasse les N dernières semaines du
//    plan en `taper` si l'IA n'en a pas produit assez.
export function minTaperWeeksFor(objectiveKey: string, totalWeeks: number): number {
  const full =
    ["IM", "TrailUltra"].includes(objectiveKey) ? 3
    : ["703", "Marathon", "Semi", "Trail", "TrailMountain"].includes(objectiveKey) ? 2
    : 1;
  // Plan court : on rogne l'affûtage plutôt que les phases de développement.
  return Math.max(1, Math.min(full, Math.floor(totalWeeks * 0.2)));
}

function enforceTaperWeeks(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  objectiveKey: string | null | undefined,
): void {
  if (!objectiveKey) return;
  const allWeeks = chunks
    .flatMap(ch => (ch.weeks ?? []))
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  const totalWeeks = allWeeks.length;
  if (totalWeeks < 4) return;

  const required = minTaperWeeksFor(objectiveKey, totalWeeks);
  const current = allWeeks.filter(w => w.phase === "taper").length;
  if (current >= required) return;

  // On ne reclasse QUE des semaines terminales (pas de trou au milieu).
  const missing = required - current;
  const candidates = allWeeks
    .slice(Math.max(0, totalWeeks - required))
    .filter(w => w.phase !== "taper");
  let done = 0;
  for (const w of candidates) {
    if (done >= missing) break;
    const before = w.phase;
    w.phase = "taper";
    done++;
    counters.taper_weeks_enforced = (counters.taper_weeks_enforced ?? 0) + 1;
    logs.push(
      `[taper_weeks_enforced] S${w.weekNumber} ${before} → taper (objectif=${objectiveKey}, requis=${required}, présentes=${current})`,
    );
  }
  if (done < missing) {
    logs.push(
      `[taper_weeks_unresolved] objectif=${objectiveKey} requis=${required} obtenues=${current + done}`,
    );
  }
}


// ── Jour de course (Rule 9) : la semaine terminale doit contenir le Jour J.
//    Certains plans (chemin JSON) s'arrêtent à l'activation pré-course sans
//    jamais matérialiser l'épreuve. Filet déterministe : on insère une séance
//    « 🏁 COURSE OBJECTIF — Jour J » le dimanche de la dernière semaine.
const RACE_DAY_RX = /🏁|jour\s*j\b|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

const RACE_DAY_SPEC: Record<string, { sport: "run" | "bike" | "brick" | "swim"; durationMin: number; label: string }> = {
  IM: { sport: "brick", durationMin: 720, label: "Ironman" },
  "703": { sport: "brick", durationMin: 330, label: "Ironman 70.3" },
  Olympique: { sport: "brick", durationMin: 165, label: "Triathlon olympique" },
  Sprint: { sport: "brick", durationMin: 90, label: "Triathlon sprint" },
  Marathon: { sport: "run", durationMin: 240, label: "Marathon" },
  Semi: { sport: "run", durationMin: 110, label: "Semi-marathon" },
  "10K": { sport: "run", durationMin: 50, label: "10 km" },
  "5K": { sport: "run", durationMin: 25, label: "5 km" },
  Trail: { sport: "run", durationMin: 300, label: "Trail" },
  TrailShort: { sport: "run", durationMin: 150, label: "Trail court" },
  TrailMountain: { sport: "run", durationMin: 420, label: "Trail montagne" },
  TrailUltra: { sport: "run", durationMin: 900, label: "Ultra-trail" },
};

/** Étapes du Long Course Weekend (format 3 jours éclaté). */
const LCW_STAGES: Array<{
  day: "vendredi" | "samedi" | "dimanche";
  sport: "swim" | "bike" | "run";
  durationMin: number;
  label: string;
  details: string;
}> = [
  {
    day: "vendredi",
    sport: "swim",
    durationMin: 55,
    label: "Étape 1 · Natation (1.9 km)",
    details:
      "Étape natation du Long Course Weekend, vendredi soir. Échauffement à sec + 400 m progressifs, " +
      "départ contrôlé (30 premières minutes sous l'allure cible), sighting régulier. " +
      "Recharge glycogénique immédiate en sortie d'eau (protocole inter-étapes).",
  },
  {
    day: "samedi",
    sport: "bike",
    durationMin: 180,
    label: "Étape 2 · Vélo (90 km)",
    details:
      "Étape vélo du Long Course Weekend, samedi. Pacing IF 0.78-0.82 (pas de brique derrière : " +
      "puissance légèrement plus haute autorisée), nutrition 80-100 g CHO/h. " +
      "Recharge agressive dès l'arrivée + nuit courte anticipée avant l'étape course.",
  },
  {
    day: "dimanche",
    sport: "run",
    durationMin: 110,
    label: "Étape 3 · Course à pied (semi-marathon)",
    details:
      "Étape course du Long Course Weekend, dimanche, sur jambes fatiguées des deux étapes précédentes. " +
      "Départ 10-15 s/km au-dessus de l'allure semi fraîche, ravitaillement à chaque poste, " +
      "gestion thermique et relance progressive sur les 7 derniers kilomètres.",
  },
];

function makeRaceSession(
  day: string,
  title: string,
  details: string,
  sport: string,
  durationMin: number,
): PlanSession {
  return {
    day,
    title,
    details,
    isKeySession: true,
    durationMin,
    zones: [] as string[],
    sport,
    custom: true as const,
    catalogId: null,
  } as unknown as PlanSession;
}

function ensureRaceDaySession(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  objectiveKey: string | null | undefined,
  isLcw3Day = false,
): void {
  const allWeeks = chunks
    .flatMap(ch => (ch.weeks ?? []))
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  const last = allWeeks[allWeeks.length - 1];
  if (!last) return;

  const sessions = (last.sessions ?? []) as PlanSession[];

  // ── Format Long Course Weekend : 3 étapes (Ven natation / Sam vélo / Dim course).
  if (isLcw3Day) {
    for (const stage of LCW_STAGES) {
      const dayLower = stage.day;
      const existing = sessions.filter(
        s => String((s as { day?: string }).day ?? "").toLowerCase() === dayLower,
      );
      const hasRace = existing.some(s => RACE_DAY_RX.test(`${s.title ?? ""} ${s.details ?? ""}`));
      if (hasRace) continue;

      const stageSession = makeRaceSession(
        stage.day,
        `🏁 COURSE OBJECTIF — ${stage.label}`,
        stage.details,
        stage.sport,
        stage.durationMin,
      );
      const restIdx = sessions.findIndex(
        s =>
          String((s as { day?: string }).day ?? "").toLowerCase() === dayLower &&
          (s.sport === "rest" || s.sport === "recovery"),
      );
      if (restIdx >= 0) sessions.splice(restIdx, 1, stageSession);
      else sessions.push(stageSession);

      counters.race_day_inserted = (counters.race_day_inserted ?? 0) + 1;
      logs.push(
        `[race_day_inserted] S${last.weekNumber} — LCW ${stage.day} : ${stage.label} (${stage.sport}, ${stage.durationMin} min)`,
      );
    }
    last.sessions = sessions;
    return;
  }

  const already = sessions.some(s =>
    RACE_DAY_RX.test(`${s.title ?? ""} ${s.details ?? ""}`),
  );
  if (already) return;

  const spec = RACE_DAY_SPEC[String(objectiveKey ?? "")] ?? {
    sport: "run" as const,
    durationMin: 90,
    label: String(objectiveKey ?? "Course objectif"),
  };

  const raceSession = makeRaceSession(
    "dimanche",
    `🏁 COURSE OBJECTIF — Jour J (${spec.label})`,
    `Jour de course. Échauffement selon protocole, pacing conforme à la stratégie validée ` +
      `(allure/puissance cible, contrôle des premières minutes), nutrition et hydratation ` +
      `selon le plan de ravitaillement établi en amont.`,
    spec.sport,
    spec.durationMin,
  );

  // Remplace la séance de repos du dimanche si elle existe, sinon on ajoute.
  const sundayRestIdx = sessions.findIndex(s => s.day === "dimanche" && s.sport === "rest");
  if (sundayRestIdx >= 0) sessions.splice(sundayRestIdx, 1, raceSession);
  else sessions.push(raceSession);
  last.sessions = sessions;

  counters.race_day_inserted = (counters.race_day_inserted ?? 0) + 1;
  logs.push(
    `[race_day_inserted] S${last.weekNumber} — Jour J ajouté (objectif=${objectiveKey ?? "?"}, sport=${spec.sport}, ${spec.durationMin} min)`,
  );
}



// ── API publique ───────────────────────────────────────────────────────────


// ── Contraintes athlète (filet déterministe) ───────────────────────────────
// Le champ libre "Contraintes" est injecté en tête de prompt (edge function),
// mais le modèle peut encore placer une séance sur un jour interdit. Ce filet
// DÉPLACE la séance sur le premier jour libre de la même semaine (jamais de
// suppression silencieuse) et supprime les disciplines totalement interdites.
function normalizeDayLabel(raw: string | null | undefined): WeekDay | null {
  const d = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!d) return null;
  return (
    WEEK_DAYS.find(
      (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === d,
    ) ?? null
  );
}

function enforceAthleteConstraints(
  chunks: PlanChunk[],
  rules: AthleteConstraintRules,
  counters: ReconcilerCounters,
  logs: string[],
): void {
  if (!rules.hasHardRules) return;

  for (const chunk of chunks) {
    for (const week of (chunk as any)?.weeks ?? []) {
      const sessions: PlanSession[] = Array.isArray(week?.sessions) ? week.sessions : [];
      const weekNum = week?.weekNumber ?? week?.week ?? "?";

      // 1) Disciplines totalement interdites
      if (rules.bannedSports.length > 0) {
        for (let i = sessions.length - 1; i >= 0; i--) {
          const cs = toConstraintSport((sessions[i] as any)?.sport);
          if (cs !== "any" && rules.bannedSports.includes(cs)) {
            logs.push(
              `[constraint_banned_sport] S${weekNum} — suppression "${(sessions[i] as any)?.title ?? (sessions[i] as any)?.catalogId ?? "?"}" (${constraintSportLabel(cs)} interdit par le coach)`,
            );
            sessions.splice(i, 1);
            counters.constraint_banned_sport_removed =
              (counters.constraint_banned_sport_removed ?? 0) + 1;
          }
        }
      }

      // 2) Jours interdits → déplacement
      if (rules.dayBans.length === 0) continue;
      for (const s of sessions) {
        const day = normalizeDayLabel((s as any)?.day);
        if (!day) continue;
        const cs = toConstraintSport((s as any)?.sport);
        const hit = rules.dayBans.find(
          (b) => b.day === day && (b.sport === "any" || b.sport === cs),
        );
        if (!hit) continue;

        const bannedForThis = new Set(
          rules.dayBans
            .filter((b) => b.sport === "any" || b.sport === cs)
            .map((b) => b.day),
        );
        const load: Record<string, number> = {};
        for (const other of sessions) {
          const d = normalizeDayLabel((other as any)?.day);
          if (d) load[d] = (load[d] ?? 0) + 1;
        }
        const candidates = WEEK_DAYS.filter((d) => !bannedForThis.has(d)).sort(
          (a, b) => (load[a] ?? 0) - (load[b] ?? 0),
        );
        const target = candidates[0];
        if (!target || (load[target] ?? 0) >= 2) {
          counters.constraint_day_unresolved =
            (counters.constraint_day_unresolved ?? 0) + 1;
          logs.push(
            `[constraint_day_unresolved] S${weekNum} — "${(s as any)?.title ?? "?"}" reste sur ${day} (aucun jour libre disponible)`,
          );
          continue;
        }
        (s as any).day = target;
        counters.constraint_day_moved = (counters.constraint_day_moved ?? 0) + 1;
        logs.push(
          `[constraint_day_moved] S${weekNum} — "${(s as any)?.title ?? (s as any)?.catalogId ?? "?"}" ${day} → ${target} (contrainte : « ${hit.source} »)`,
        );
      }
    }
  }
}

export interface RunReconcilerOptions {
  /** Clé d'objectif normalisée (normalizeObjectiveKey) — pilote l'affûtage minimal. */
  objectiveKey?: string | null;
  /** Format Long Course Weekend (3 jours éclatés Ven/Sam/Dim) — 3 étapes de course. */
  isLcw3Day?: boolean;
  /** Champ libre "Contraintes" saisi par le coach (jours off, sports interdits, blessures). */
  constraints?: string | null;
}


export function runReconciler(
  chunks: PlanChunk[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
  maxPasses = 2,
  injectedCatalogIds?: ReadonlyArray<string> | ReadonlySet<string>,
  opts: RunReconcilerOptions = {},
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
    id_remapped_to_neighbor: 0,
    id_remap_no_intent_match_fallback_custom: 0,
  };
  const logs: string[] = [];

  // ── Filet de mapping voisin (Reco 3 + Reco B) ──
  // Passe PRÉLIMINAIRE : remap catalogId absent du catalogue injecté vers
  //   un voisin sûr du catalogue injecté (5 garde-fous stricts).
  // Passe POSTÉRIEURE : runOnePass (phase/durée/discipline) restreint ses
  //   candidats à `injected` grâce à `restrictToIds`, mais on relance quand
  //   même le filet voisin après pour nettoyer tout ID hors-catalogue qui
  //   aurait été introduit par une insertion FLOOR ou par un chemin non
  //   couvert. Coût : quelques ms, gain : garantit qu'aucun catalogId final
  //   n'est absent du catalogue injecté (sauf pur_hallucination irrattrapable).
  const debugStats = {
    injectedCatalogIdsProvided: injectedCatalogIds != null,
    injectedSize: 0,
    sessionsScanned: 0,
    sessionsWithCatalogId: 0,
    idsAlreadyInInjected: 0,
    idsAbsentInLibrary: 0,       // pur_hallucination
    idsCandidateForSubstitution: 0,
  };
  let injected: Set<string> | undefined;
  let injectedByBucket: Map<string, LibraryWorkout[]> | undefined;
  if (injectedCatalogIds) {
    injected = injectedCatalogIds instanceof Set
      ? new Set([...injectedCatalogIds].map(x => String(x).toUpperCase()))
      : new Set(Array.from(injectedCatalogIds as ReadonlyArray<string>).map(x => String(x).toUpperCase()));
    debugStats.injectedSize = injected.size;
    if (injected.size > 0) {
      injectedByBucket = new Map<string, LibraryWorkout[]>();
      for (const w of WorkoutLibrary) {
        if (!injected.has(w.id.toUpperCase())) continue;
        const key = `${normSport(w.sport)}::${intentFamilyOf(w)}`;
        const arr = injectedByBucket.get(key) ?? [];
        arr.push(w);
        injectedByBucket.set(key, arr);
      }
    }
  }

  function neighborRemapPass(passLabel: "pre" | "post"): { substituted: number; noSafe: number } {
    if (!injected || !injectedByBucket) return { substituted: 0, noSafe: 0 };
    let substituted = 0;
    let noSafe = 0;
    for (const chunk of chunks) {
      for (const week of chunk.weeks ?? []) {
        const weekPhase = week.phase as PlanPhase;
        for (const s of (week.sessions ?? []) as PlanSession[]) {
          if ((s as any).isRest || s.sport === "rest") continue;
          if (passLabel === "pre") debugStats.sessionsScanned++;
          if (s.custom) continue;
          const cid = s.catalogId;
          if (!cid) continue;
          if (passLabel === "pre") debugStats.sessionsWithCatalogId++;
          const idUp = cid.toUpperCase();
          if (injected.has(idUp)) {
            if (passLabel === "pre") debugStats.idsAlreadyInInjected++;
            continue;
          }
          const original = FICHES_BY_ID.get(idUp);
          if (!original) {
            if (passLabel === "pre") debugStats.idsAbsentInLibrary++;
            continue; // pur_hallucination
          }
          if (passLabel === "pre") debugStats.idsCandidateForSubstitution++;
          const sessionSport = normSport(s.sport);
          const origFamily = intentFamilyOf(original);
          const bucket = injectedByBucket.get(`${sessionSport}::${origFamily}`) ?? [];
          const origMedian = ficheMedian(original);
          const targetDur = s.durationMin ?? origMedian;
          const durBound = Math.max(1, Math.round(0.25 * (targetDur || origMedian || 60)));
          let best: { w: LibraryWorkout; score: number; intent: number; candMedian: number } | null = null;
          const rejects = { phase_incompatible: 0, duration_out_of_range: 0, score_too_low: 0 };
          let sameSportOtherFamily = 0;
          if (bucket.length === 0) {
            for (const [key, arr] of injectedByBucket) {
              if (key.startsWith(`${sessionSport}::`)) sameSportOtherFamily += arr.length;
            }
          }
          for (const cand of bucket) {
            if (cand.id.toUpperCase() === idUp) continue;
            const allowedPhases = ficheAllowedPhases(cand);
            if (allowedPhases.size > 0 && !allowedPhases.has(weekPhase)) { rejects.phase_incompatible++; continue; }
            const candMedian = ficheMedian(cand);
            if (Math.abs(candMedian - (targetDur || origMedian)) > durBound) { rejects.duration_out_of_range++; continue; }
            const intent = intentScore(original, cand);
            if (intent < 1) { rejects.score_too_low++; continue; }
            const durPenalty = Math.abs(candMedian - targetDur) / 10;
            const score = intent * 100 - durPenalty;
            if (!best || score > best.score) best = { w: cand, score, intent, candMedian };
          }
          if (best) {
            const before = original.id;
            (s as any).catalogIdOrigin = before;
            (s as any).catalogIdSubstituted = true;
            const origAllowedPhases = ficheAllowedPhases(original);
            const reason = origAllowedPhases.size > 0 && !origAllowedPhases.has(weekPhase)
              ? "retiré_par_filtre_phase"
              : "retiré_aval_filtre";
            const deltaPct = origMedian > 0
              ? Math.round((100 * Math.abs(best.candMedian - origMedian)) / origMedian)
              : 0;
            assignFiche(s, best.w, s.durationMin);
            counters.id_remapped_to_neighbor++;
            substituted++;
            logs.push(
              `[catalog_id_substituted] pass=${passLabel} S${week.weekNumber} ${s.day} ${before} → ${best.w.id} [reason=${reason}, family=${origFamily}, score=${best.intent}, Δdur=${deltaPct}%]`,
            );
          } else {
            counters.id_remap_no_intent_match_fallback_custom++;
            noSafe++;
            let dominant: string;
            if (bucket.length === 0) {
              dominant = sameSportOtherFamily > 0
                ? `family_mismatch (sameSportOtherFamily=${sameSportOtherFamily})`
                : "sport_mismatch (aucun voisin même discipline)";
            } else {
              const entries = Object.entries(rejects).sort((a, b) => b[1] - a[1]);
              dominant = `${entries[0][0]} (${entries.map(([k, v]) => `${k}=${v}`).join(", ")}, bucket=${bucket.length})`;
            }
            logs.push(
              `[catalog_id_no_safe_neighbor] pass=${passLabel} S${week.weekNumber} ${s.day} id=${cid} sport=${sessionSport} famille=${origFamily} — dominant=${dominant} — B5 flaggera`,
            );
          }
        }
      }
    }
    return { substituted, noSafe };
  }

  // Passe préliminaire (avant runOnePass)
  const preStats = neighborRemapPass("pre");
  logs.push(
    `[recon_substitute_debug] injectedProvided=${debugStats.injectedCatalogIdsProvided} injectedSize=${debugStats.injectedSize} ` +
    `sessionsScanned=${debugStats.sessionsScanned} sessionsWithCatalogId=${debugStats.sessionsWithCatalogId} ` +
    `alreadyInInjected=${debugStats.idsAlreadyInInjected} absentInLibrary=${debugStats.idsAbsentInLibrary} ` +
    `candidateForSubstitution=${debugStats.idsCandidateForSubstitution} ` +
    `→ substituted(pre)=${preStats.substituted} noSafeNeighbor(pre)=${preStats.noSafe}`
  );

  // runOnePass — restreint aux IDs du catalogue injecté quand disponible,
  // pour ne PAS réintroduire d'ID hors-catalogue via phase/durée/discipline.
  let anyOnePassChange = false;
  for (let i = 0; i < maxPasses; i++) {
    const changed = runOnePass(chunks, quotasByWeek, counters, logs, injected);
    if (changed) anyOnePassChange = true;
    if (!changed) break;
  }

  // Passe POSTÉRIEURE — filet final : nettoie tout ID hors-catalogue qui
  // aurait été introduit malgré tout (ex : insertion FLOOR sans injected).
  // Gated : ne relance que si runOnePass a effectivement muté quelque chose,
  // sinon rien de nouveau à nettoyer et on éviterait de doubler les compteurs
  // noSafeNeighbor sur les cas déjà rejetés en pré-passe.
  if (anyOnePassChange && injected && injected.size > 0) {
    const postStats = neighborRemapPass("post");
    logs.push(
      `[recon_substitute_debug_post] substituted(post)=${postStats.substituted} noSafeNeighbor(post)=${postStats.noSafe}`
    );
  }

  fixEarlyConsolidationSessions(chunks, counters, logs);
  if (String(opts.objectiveKey ?? "").toLowerCase().includes("start")) {
    capStartToRunSessions(chunks, counters, logs);
  }
  enforceTaperWeeks(chunks, counters, logs, opts.objectiveKey);
  ensureRaceDaySession(chunks, counters, logs, opts.objectiveKey, !!opts.isLcw3Day);

  hydrateDilutedZones(chunks, counters, logs);
  enforceAthleteConstraints(chunks, parseAthleteConstraints(opts.constraints), counters, logs);
  return { counters, logs };
}



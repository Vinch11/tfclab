import { checkSessionCatalogue, sessionSportMatchesCard, type ContractSession, type CatalogueContract } from "../../../supabase/functions/_shared/sessionCatalogueContract";
import { normalizeRepairGoal, type RepairWorkoutMetadata } from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { WorkoutLibrary } from "../workoutLibrary";
import { buildRepairWorkoutMetadata } from "./repairCatalogMetadata";
import { parseWhenPhases } from "./phaseNormalization";
import { extractCatalogId } from "../catalogIdExtractor";
const catalog = WorkoutLibrary.map(buildRepairWorkoutMetadata);
interface PlanLike { weeklyQuotas?: Record<number, { terrainAvailability?: string; weekType?: string; phase?: string }>; weeks: Array<{ weekNumber: number; phase: string; cycleObjective?: string; sessions: Array<ContractSession & { isRest?: boolean }> }>; }
/** Contexte de contrôle d'une semaine : le même pour la validation et la réparation finale. */
function weekContract(plan: PlanLike, week: PlanLike["weeks"][number], objective?: string): CatalogueContract {
 const q = plan.weeklyQuotas?.[week.weekNumber];
 return { catalog, terrainAvailability: q?.terrainAvailability, objective: week.cycleObjective || objective, weekType: q?.weekType,
  phase: q?.phase ?? (["base", "build", "peak", "taper"].includes(week.phase) ? week.phase : [...parseWhenPhases(week.phase)][0]) };
}

/** Validate the current prescription, never mutate it to make an ID fit. */
export function validateSessionCataloguePlan(plan: PlanLike, objective?: string) {
 return plan.weeks.flatMap(week => week.sessions.flatMap((session, index) => {
  if (session.isRest || session.sport === "rest") return [];
  const catalogId = extractCatalogId(session.title ?? "", session.details ?? "", session.catalogId);
  const result = checkSessionCatalogue({ ...session, catalogId }, weekContract(plan, week, objective));
  return [
   ...result.errors.map(code => ({ rule: code === "catalogue_duration" ? "catalogue_duration" : "catalogue_prescription_incompatible", severity: code === "catalogue_duration" ? "warning" as const : "error" as const, week: week.weekNumber,
    message: `S${week.weekNumber} séance ${index + 1} [${catalogId ?? "événement"}] : ${code}` })),
   ...result.unknown.map(code => ({ rule: "catalogue_prescription_unverified", severity: "warning" as const, week: week.weekNumber,
    message: `S${week.weekNumber} séance ${index + 1} [${catalogId ?? "sans ID"}] : ${code}` })),
  ];
 }));
}

export const CATALOGUE_REPAIR_NOTE = "Ajusté par TFCL : la séance prévue ne convenait pas à cette semaine (phase, proximité de course ou intensité) — remplacée par une séance compatible.";
const FALLBACK_FAMILIES = new Set(["endurance_fondamentale", "race_pace", "recuperation", "technique"]);
const blocking = (errors: string[]) => errors.filter(e => e !== "catalogue_duration");

/**
 * Dernière passe de la génération (27/11/2026) : chaque séance est contrôlée avec EXACTEMENT les règles
 * de la sauvegarde (`checkSessionCatalogue`, même contexte de semaine). Une séance refusée est remplacée
 * par la fiche du même sport qui passe ce contrôle — même intention de préférence, sinon endurance,
 * allure course, récupération ou technique —, et le texte de la séance le dit. Une compétition ne porte
 * jamais de fiche. Sans fiche compatible, la séance reste telle quelle (la sauvegarde la signalera).
 * Mute le plan reçu ; renvoie une ligne par séance modifiée.
 */
export function repairCatalogueContractPlan(plan: PlanLike & { weeks: Array<{ sessions: Array<{ catalogId?: string | null; custom?: boolean; variantKey?: string; zones?: string[] }> }> }, objective?: string): string[] {
 const log: string[] = [];
 for (const week of plan.weeks) {
  const contract = weekContract(plan, week, objective);
  const usedThisWeek = new Set(week.sessions.map(s => s.catalogId).filter(Boolean) as string[]);
  week.sessions.forEach((session, index) => {
   if (session.isRest || session.sport === "rest") return;
   const catalogId = extractCatalogId(session.title ?? "", session.details ?? "", session.catalogId);
   const errors = blocking(checkSessionCatalogue({ ...session, catalogId }, contract).errors);
   if (!errors.length) return;
   if (errors.includes("race_catalog_conflict")) {
    session.catalogId = null; session.custom = true;
    session.details = (session.details ?? "").replace(/\s*\[ID:\s*[^\]]+\]/g, "");
    log.push(`S${week.weekNumber} séance ${index + 1} : compétition sans fiche d'entraînement`);
    return;
   }
   const original = catalogId ? catalog.find(m => m.id === catalogId) : undefined;
   const candidate = bestCompatibleCard(session, contract, original, usedThisWeek);
   if (!candidate) { log.push(`S${week.weekNumber} séance ${index + 1} [${catalogId ?? "?"}] : aucune fiche compatible (${errors.join(", ")})`); return; }
   session.catalogId = candidate.id; session.custom = false; session.variantKey = undefined;
   session.title = candidate.title;
   session.zones = [...candidate.zones];
   session.details = `${CATALOGUE_REPAIR_NOTE} ${candidate.structure}. [ID: ${candidate.id}]`;
   usedThisWeek.add(candidate.id);
   log.push(`S${week.weekNumber} séance ${index + 1} [${catalogId ?? "?"}] (${errors.join(", ")}) → ${candidate.id}`);
  });
 }
 return log;
}

function bestCompatibleCard(session: ContractSession, contract: CatalogueContract, original: RepairWorkoutMetadata | undefined, used: Set<string>): RepairWorkoutMetadata | null {
 let best: { m: RepairWorkoutMetadata; score: number } | null = null;
 const goal = normalizeRepairGoal(contract.objective);
 const dur = session.durationMin ?? 0;
 for (const m of catalog) {
  if (m.id === original?.id || !sessionSportMatchesCard(session.sport, m)) continue;
  const sameIntent = !!original && m.intentFamily === original.intentFamily;
  if (!sameIntent && !FALLBACK_FAMILIES.has(m.intentFamily)) continue;
  const trial: ContractSession = { day: session.day, dayName: session.dayName, sport: session.sport, durationMin: session.durationMin,
   catalogId: m.id, custom: false, title: m.title, details: m.structure, zones: m.zones };
  if (blocking(checkSessionCatalogue(trial, contract).errors).length) continue;
  const fits = dur > 0 && dur >= m.durationMin[0] && dur <= m.durationMin[1];
  // Une fiche écrite pour l'objectif de l'athlète passe avant une fiche d'un autre objectif (ex. Start to Run).
  const goals = m.goals.map(g => normalizeRepairGoal(g)).filter(Boolean);
  const forObjective = !goal || !goals.length ? 0 : goals.includes(goal) ? 60 : -80;
  const median = (m.durationMin[0] + m.durationMin[1]) / 2;
  const family = m.intentFamily === "recuperation" ? 0 : 10;
  const score = (sameIntent ? 50 : 0) + forObjective + family + (fits ? 60 : 0) - Math.abs(median - dur) / 3
   - (used.has(m.id) ? 15 : 0) - (original && m.mainZoneMax > original.mainZoneMax ? 10 : 0);
  if (!best || score > best.score) best = { m, score };
 }
 return best?.m ?? null;
}

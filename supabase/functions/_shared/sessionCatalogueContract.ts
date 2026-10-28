import { evaluateRepairSportingEquivalence, isCompleteRepairWorkoutMetadata, normalizeRepairGoal, normalizeRepairSport, type RepairWorkoutMetadata, type RepairCompatibilityContext } from "./repairSportingEquivalence.ts";
import { classifyIntentEvidence } from "./intentEvidence.ts";
import { catalogueWeeklyUsageCapacity } from "./catalogueWeeklyFrequency.ts";
import { isRaceDaySession } from "./raceDayIdentity.ts";
export interface ContractSession { title?: string; details?: string; sport?: string; catalogId?: string | null; custom?: boolean; durationMin?: number; zones?: string[]; variantKey?: string; }
export interface CatalogueContract { phase?: string; weekType?: string; objective?: string; catalog: RepairWorkoutMetadata[]; }
const maxZone = (zones: string[]) => Math.max(0, ...zones.flatMap(z => [...z.matchAll(/\bZ\s*([1-7])/gi)].map(m => Number(m[1]))));
/** Only explicit numeric variant ranges are executable. Free prose is not a waiver. */
function variantRange(text: string | undefined): [number, number] | null {
 if (!text) return null;
 const m = text.match(/^\s*(?:Z[12]\s+)?(\d+)\s*[–-]\s*(\d+)\s*(?:min|'|’)\s*$/i);
 return m && Number(m[1]) <= Number(m[2]) ? [Number(m[1]), Number(m[2])] : null;
}
export function catalogueEligibility(metadata: RepairWorkoutMetadata, context: RepairCompatibilityContext): string[] {
 if (!isCompleteRepairWorkoutMetadata(metadata)) return ["candidate_metadata_incomplete"];
 // Existing sporting rules validate phase, objective and recovery/taper load.
 const effective = normalizeRepairSport(metadata.sport) === "brick" && !metadata.mainZoneMax
  ? { ...metadata, mainZoneMax: maxZone(metadata.zones) } : metadata;
 return evaluateRepairSportingEquivalence(effective, effective, { ...context, operation: "replacement" }).reasons;
}
export function checkSessionCatalogue(session: ContractSession, contract: CatalogueContract): { errors: string[]; unknown: string[] } {
 const errors: string[] = [], unknown: string[] = [];
 if (isRaceDaySession(session)) {
  if (session.catalogId || session.custom === false) errors.push("race_catalog_conflict");
  return { errors, unknown };
 }
 if (!session.catalogId) return { errors, unknown }; // genuine custom training/legacy handled by other controls
 const metadata = contract.catalog.find(m => m.id === session.catalogId);
 if (!isCompleteRepairWorkoutMetadata(metadata)) return { errors, unknown: ["catalogue_metadata_missing"] };
 errors.push(...catalogueEligibility(metadata, contract));
 if (!session.sport) unknown.push("sport_not_preserved");
 else if (normalizeRepairSport(session.sport) !== normalizeRepairSport(metadata.sport)) errors.push("catalogue_sport");
 const variants = metadata.variants;
 const variant = session.variantKey ? variantRange(variants?.[session.variantKey]) : null;
 if (session.variantKey && !variant) return { errors: [...errors, "catalogue_variant_unavailable"], unknown: [...unknown, "variant_not_executable"] };
 if (session.variantKey && contract.objective && normalizeRepairGoal(session.variantKey) !== normalizeRepairGoal(contract.objective)) errors.push("variant_goal_mismatch");
 const range = variant ?? metadata.durationMin;
 if (typeof session.durationMin === "number") {
  if (session.durationMin < range[0] || session.durationMin > range[1]) errors.push("catalogue_duration");
 } else unknown.push("duration_not_preserved");
 const zones = session.zones?.length ? session.zones : [...(session.details ?? "").matchAll(/\bZ\s*([1-7](?:[ab])?)/gi)].map(m => `Z${m[1]}`);
 const observed = maxZone(zones);
 const variantZones = variant ? [...(variants?.[session.variantKey!] ?? "").matchAll(/\bZ([1-7])/gi)].map(m => `Z${m[1]}`) : [];
 const expected = variantZones.length ? maxZone(variantZones) : metadata.mainZoneMax || maxZone(metadata.zones);
 if (!observed) unknown.push("intensity_not_declared");
 else if (expected >= 3 && observed < expected) errors.push("catalogue_intensity_diluted");
 else if (expected > 0 && observed > expected) errors.push("catalogue_intensity_exceeded");
 const intent = classifyIntentEvidence(session.title ?? "", observed);
 const sourceTitleIntent = classifyIntentEvidence(metadata.title, expected);
 const expectedIntent = variantZones.length ? classifyIntentEvidence(variants?.[session.variantKey!] ?? "", expected).family : metadata.intentFamily;
 if (session.title !== metadata.title && intent.source === "pattern" && !["brick", "other"].includes(intent.family) &&
   !["brick", "other"].includes(expectedIntent) && intent.family !== expectedIntent &&
   (sourceTitleIntent.source !== "pattern" || intent.family !== sourceTitleIntent.family)) errors.push("catalogue_physiological_intent");
 // Reuse the same repetition-pattern notion as B10: compare explicit patterns only.
 const pattern = (text: string) => {
  const m = text.match(/(\d+)\s*[x×]\s*(\d+)\s*(min|'|’|sec|s)/i);
  return m ? [Number(m[1]), Number(m[2]) * (/^(s|sec)$/.test(m[3]) ? 1 : 60)] : null;
 };
 const a = pattern(metadata.structure), b = pattern(session.details ?? "");
 if (a && b && (Math.max(a[0], b[0]) / Math.max(1, Math.min(a[0], b[0])) >= 3 &&
   Math.max(a[1], b[1]) / Math.max(1, Math.min(a[1], b[1])) >= 3)) errors.push("catalogue_structure");
 if (a && !b) unknown.push("structure_not_verified");
 return { errors: [...new Set(errors)], unknown };
}
export function catalogueForWeek(catalog: RepairWorkoutMetadata[], context: RepairCompatibilityContext, minima: Partial<Record<"swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "totalSessions", { min?: number }>> = {}) {
 const eligible = catalog.filter(m => catalogueEligibility(m, context).length === 0);
 const sports = new Set(["swim", "bike", "run", "brick", "strength", "recovery"]);
 // Required sessions do not imply distinct catalogue IDs. Apply the SAME
 // explicit frequency caps as final validation; never choose repetitions.
 const capacityBySport = Object.entries(minima).filter(([sport, range]) => sports.has(sport) && (range.min ?? 0) > 0).map(([sport, range]) => {
  const cards = [...new Map(eligible.filter(m => normalizeRepairSport(m.sport) === sport).map(m => [m.id, m])).values()];
  return { sport, required: range.min ?? 0, distinct: cards.length,
   capacity: cards.reduce((sum, card) => sum + catalogueWeeklyUsageCapacity(card), 0) };
 });
 const missingSports = capacityBySport.filter(c => c.capacity < c.required).map(c => c.sport);
 const limitedDiversitySports = capacityBySport.filter(c => c.distinct < c.required && c.capacity >= c.required).map(c => c.sport);
 return { eligible, missingSports, limitedDiversitySports };
}

export function executableCatalogueVariants(metadata: RepairWorkoutMetadata, objective?: string): Record<string, string> {
 return Object.fromEntries(Object.entries(metadata.variants ?? {}).filter(([key, text]) => variantRange(text) !== null && (!objective || normalizeRepairGoal(key) === normalizeRepairGoal(objective))));
}

/** Executable duration alternatives already accepted by checkSessionCatalogue.
 * Operational feasibility only: no prose variant becomes a numeric waiver. */
export function executableCatalogueDurationRanges(metadata: RepairWorkoutMetadata, objective?: string): Array<[number,number]> {
 const ranges:Array<[number,number]>=[metadata.durationMin];
 for(const [key,text] of Object.entries(metadata.variants??{})) {
  if(objective && normalizeRepairGoal(key)!==normalizeRepairGoal(objective))continue;
  const range=variantRange(text);
  if(range)ranges.push(range);
 }
 return ranges;
}

/** Same executable key inventory for prompt and provider schema; bindings remain checked by Zod. */
export function executableCatalogueVariantsForWeeks(contracts:Record<number,CatalogueContract>,allowedIds?:readonly string[]) {
 return Object.fromEntries(Object.entries(contracts).map(([week,contract])=>[week,Object.fromEntries(contract.catalog
  .filter(m=>(!allowedIds||allowedIds.includes(m.id))&&catalogueEligibility(m,contract).length===0)
  .map(m=>[m.id,executableCatalogueVariants(m,contract.objective)] as const).filter(([,variants])=>Object.keys(variants).length>0))]));
}

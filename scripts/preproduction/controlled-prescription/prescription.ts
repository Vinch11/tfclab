/** Offline-only preparation. NOT wired into either deployed generation function.
 * A decision-engine stimulus is required: a layout role alone is not a stimulus.
 * No model, persistence, defaults for physiology, or repair of model prescription.
 */
import { catalogueEligibility, checkSessionCatalogue, executableCatalogueVariants, type CatalogueContract } from '../../../supabase/functions/_shared/sessionCatalogueContract';
import { normalizeRepairSport, type RepairIntentFamily } from '../../../supabase/functions/_shared/repairSportingEquivalence';
import { catalogueWeeklyUsageCapacity } from '../../../supabase/functions/_shared/catalogueWeeklyFrequency';

export interface PrescriptionSlot {
  reference: string;
  week: number;
  day: string;
  sport: string;
  /** Must come from an explicit decision, never inferred from “quality”. */
  intent: RepairIntentFamily;
  /** Identifier resolved by the TFCL doctrine, not a percent-VMA string. */
  domain: string;
  minMinutes: number;
  maxMinutes: number;
  /** Selected numeric variant only, not prose adaptation. */
  variantKey?: string;
  allowedCatalogIds: readonly string[];
  approvedPrerequisites: readonly string[];
  approvedSpecialContexts: readonly string[];
  isKeySession: boolean;
}
export interface Prescription {
  reference: string; week: number; day: string; sport: string; domain: string;
  catalogId: string; title: string; details: string; durationMin: number;
  zones: string[]; intent: RepairIntentFamily; variantKey?: string; isKeySession: boolean;
}
export type PrescriptionResult =
  | { status: 'ready'; sessions: Prescription[]; coachReviewRequired: boolean }
  | { status: 'blocked'; sessions: []; reason: string; reference?: string };

/** A bounded search, not greedy ID repair: budgets and frequency caps are hard
 * constraints. Diversity breaks ties between equivalent prescriptions only. */
export function prescribeSlots(
  slots: readonly PrescriptionSlot[],
  contracts: Record<number, CatalogueContract>,
  budgets: Record<number, number>,
  options: { initialLoadKnown: boolean; priorUsage?: ReadonlyMap<string, number>; searchLimit?: number },
): PrescriptionResult {
  const blocked = (reason: string, reference?: string): PrescriptionResult => ({status:'blocked', sessions:[], reason, reference});
  if (!slots.length) return blocked('prescription_slots_unavailable');
  if (new Set(slots.map(s=>s.reference)).size !== slots.length) return blocked('prescription_reference_duplicate');
  const candidates: Array<Array<Prescription & { cap: number }>> = [];
  for (const slot of slots) {
    const contract=contracts[slot.week];
    if (!slot.reference || !Number.isInteger(slot.week) || slot.week<1 || !slot.day || !slot.domain || slot.intent==='other') return blocked('prescription_stimulus_unavailable',slot.reference);
    if (!Number.isFinite(slot.minMinutes) || slot.minMinutes<=0 || !Number.isFinite(slot.maxMinutes) || slot.maxMinutes<slot.minMinutes) return blocked('prescription_dose_unavailable',slot.reference);
    if (!contract?.objective || !contract.phase || !contract.weekType || !Number.isFinite(budgets[slot.week]) || budgets[slot.week]<=0) return blocked('prescription_contract_unavailable',slot.reference);
    const choices: Array<Prescription & {cap:number}>=[];
    for (const card of contract.catalog) {
      if (!slot.allowedCatalogIds.includes(card.id) || card.intentFamily!==slot.intent || normalizeRepairSport(card.sport)!==slot.sport || catalogueEligibility(card,contract).length) continue;
      if (card.prerequisiteKeys.some(p=>!slot.approvedPrerequisites.includes(p)) || (card.specialContext && !slot.approvedSpecialContexts.includes(card.specialContext))) continue;
      let range=card.durationMin;
      let details=card.structure;
      let zones=[...card.zones];
      if (slot.variantKey) {
        const text=executableCatalogueVariants(card,contract.objective)[slot.variantKey];
        const match=text?.match(/(\d+)\s*[–-]\s*(\d+)/);
        if (!match) continue;
        range=[Number(match[1]),Number(match[2])];
        // A numeric duration variant does not authorize dilution of stimulus.
        const variantZones=[...text.matchAll(/\bZ([1-7])/gi)].map(m=>`Z${m[1]}`);
        if (variantZones.length && variantZones.some(z=>Number(z.slice(1))!==card.mainZoneMax)) continue;
        if (variantZones.length) zones=variantZones;
        details=`${card.structure}\nVariante ${slot.variantKey} : ${text}`;
      }
      const durationMin=Math.max(range[0],slot.minMinutes);
      if (durationMin>Math.min(range[1],slot.maxMinutes)) continue;
      const session:Prescription={reference:slot.reference,week:slot.week,day:slot.day,sport:slot.sport,domain:slot.domain,
        catalogId:card.id,title:card.title,details,durationMin,zones,intent:card.intentFamily,variantKey:slot.variantKey,isKeySession:slot.isKeySession};
      const validation=checkSessionCatalogue(session,contract);
      if (validation.errors.length || validation.unknown.length) continue;
      choices.push({...session,cap:catalogueWeeklyUsageCapacity(card)});
    }
    if (!choices.length) return blocked('prescription_candidate_unavailable',slot.reference);
    candidates.push(choices);
  }
  const usage=new Map<string,number>(), totals=new Map<number,number>();
  const selected:Prescription[]=[];
  let visits=0, exhausted=false;
  const search=(index:number):boolean=>{
    if (index===slots.length) return true;
    if (++visits>(options.searchLimit??10000)) {exhausted=true;return false;}
    const sorted=[...candidates[index]].sort((a,b)=>{
      const count=(s:Prescription)=>(options.priorUsage?.get(s.catalogId)??0)+selected.filter(p=>p.catalogId===s.catalogId).length;
      return count(a)-count(b) || a.durationMin-b.durationMin || a.catalogId.localeCompare(b.catalogId);
    });
    for (const choice of sorted) {
      const key=`${choice.week}:${choice.catalogId}`, count=usage.get(key)??0, minutes=totals.get(choice.week)??0;
      if (count>=choice.cap || minutes+choice.durationMin>budgets[choice.week]) continue;
      const {cap:_,...session}=choice;
      selected.push(session);usage.set(key,count+1);totals.set(choice.week,minutes+choice.durationMin);
      if (search(index+1)) return true;
      selected.pop();usage.set(key,count);totals.set(choice.week,minutes);
      if (exhausted) return false;
    }
    return false;
  };
  return search(0)?{status:'ready',sessions:selected,coachReviewRequired:!options.initialLoadKnown}:blocked(exhausted?'prescription_search_limit':'prescription_budget_or_frequency_conflict');
}

/** The AI receives references for commentary. It owns NO prescription fields.
 * Whole-response rejection precedes hydration, with exact reference coverage. */
export function hydrateExplanations(prescribed: readonly Prescription[], response: unknown): Array<Prescription & { explanation: string }> {
  if (!Array.isArray(response) || response.length!==prescribed.length || new Set(prescribed.map(s=>s.reference)).size!==prescribed.length) throw Error('PRESCRIPTION_REFERENCE_COVERAGE');
  const explanations=new Map<string,string>();
  for (const raw of response) {
    if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('PRESCRIPTION_RESPONSE_INVALID');
    const row=raw as Record<string,unknown>;
    if (Object.keys(row).some(k=>!['reference','week','explanation'].includes(k))) throw Error('PRESCRIPTION_FIELD_FORBIDDEN');
    const session=prescribed.find(s=>s.reference===row.reference);
    if (!session || session.week!==row.week || typeof row.explanation!=='string' || row.explanation.length>6000 || explanations.has(session.reference)) throw Error('PRESCRIPTION_REFERENCE_INVALID');
    explanations.set(session.reference,row.explanation);
  }
  return prescribed.map(s=>({...s,zones:[...s.zones],explanation:explanations.get(s.reference)??''}));
}

/** Mechanical completeness only. Sporting quota/progression/event validators
 * must still run on the assembled plan before any save. */
export function assertCompleteWeeks(weeks: readonly {weekNumber:number}[], totalWeeks:number): void {
  if (!Number.isInteger(totalWeeks) || totalWeeks<1 || weeks.length!==totalWeeks || weeks.some((w,i)=>w.weekNumber!==i+1)) throw Error('PLAN_WEEK_COVERAGE');
}
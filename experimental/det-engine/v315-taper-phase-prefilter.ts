/**
 * DET V3.15 experimental preview of the existing NATIVE taper phase rule.
 * It mirrors only the forbidden taper content check in planValidator.ts,
 * to exclude inadmissible candidates BEFORE DFS. Final native validation
 * is entirely unchanged and remains mandatory.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
const forbiddenTaper=/chantier|force\s*max|blocs?\s*concentré|build|\bvo2\s*max\b|\bvma\b|fractionn[eé]|\bseuil\b/i;
const paceDenominator=/\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*%\s*(?:de\s*)?(?:la\s*)?(?:vma|vo2\s*max|ftp)/gi;
const raceSport=/^(?:run|course|bike|vélo|swim|natation|brick|triathlon)$/i;
export function candidateViolatesNativeTaperPhase(session:ParsedSession):boolean{
  if(session.isRest)return false;
  // Ignore only genuine declared race booking. Do not exempt simulations,
  // activations, or manually written "course" headers without source proof.
  if(session.custom===true&&session.catalogId==null&&
     session.durationMin===0&&session.title.startsWith('COURSE :')&&
     session.details.startsWith('Épreuve déclarée ; durée à confirmer')&&
     raceSport.test(session.sport))return false;
  const text=(session.title+' '+session.details).replace(paceDenominator,'');
  return forbiddenTaper.test(text);
}

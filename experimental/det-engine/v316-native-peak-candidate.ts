/**
 * Experimental V3.16 early screen. Mirrors ONLY the native normal "peak"
 * (Race-Specific) forbidden and specificity regex patterns.
 * Source in planValidator.ts remains the final authority.
 * Never use this for ultra-trail compressed peak, or for production.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
const forbiddenPeak=/force\s*max\s*3.?[45]|adaptation|fondation.*progressi/i;
const raceSpecific=/race.?pace|race.?sim|simulation\s*(ironman|marathon|70\.3|course|semi)|allure\s*(course|marathon|semi)|gut\s*train|brique.*(race|course)/i;
const stripDenominator=(text:string)=>text.replace(
  /\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*%\s*(?:de\s*)?(?:la\s*)?(?:vma|vo2\s*max|ftp)/gi,'');
const text=(s:ParsedSession)=>stripDenominator(s.title+' '+s.details);
export const violatesNativeNormalPeak=(s:ParsedSession):boolean=>
  !s.isRest&&forbiddenPeak.test(text(s));
export const hasSourceVisibleRaceSpecificity=(s:ParsedSession):boolean=>
  !s.isRest&&raceSpecific.test(text(s));

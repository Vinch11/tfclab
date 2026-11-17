import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';

/** Only explicitly named IM pace blocks are corrected; unrelated threshold work is untouched. */
export function normalizeIronmanPaceText(text:string):string {
 const domain=getDoctrineDomain('im_pace');
 const zone=domain.zone;
 return text
  .replace(/(allure\s+(?:cible\s+)?(?:marathon\s+IM|Ironman|IM))(\s*(?:en|—|[-–])?\s*)Z4[ab]?/gi,`$1$2${zone}`)
  .replace(/(allure\s+(?:cible\s+)?marathon\s+IM\s*\()Z(?:3\/Z4a|4a)(\s*\/\s*\d+(?:[–-]\d+)?\s*%\s*VMA)?/gi,`$1${zone}`)
  .replace(/(allure\s+spécifique\s+(?:course\s+)?Ironman\s*\()Z4[ab]?/gi,`$1${zone}`);
}
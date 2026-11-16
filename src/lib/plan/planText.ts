/** Remove generator artefacts only; never interpret a conditional as a prescription. */
export function cleanPlanText(text: string): string {
  return text
    .replace(/\[ID:\s*(?:null|undefined)\s*\]/gi, '')
    .replace(/\(?\s*=\s*S\d+\s+globale\)/gi, '')
    .replace(/\bglobale\)/gi, '')
    // Window artefacts in week titles: "Semaine 6 globale — X" → "X", leading "— X" → "X".
    .replace(/^\s*Semaine\s+\d+\s+globale\s*[—–-]\s*/i, '')
    .replace(/^\s*[—–-]\s+/, '')
    .replace(/[^.!?\n]*(?:ajouter|ajoutez)\s+[^.!?\n]*\bsi\s+(?:Build|Peak|Base|Taper)\b[^.!?\n]*/gi, '')
    .replace(/[ \t]{2,}/g, ' ').trim();
}
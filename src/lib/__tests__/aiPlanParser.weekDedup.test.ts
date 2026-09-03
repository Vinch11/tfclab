import { describe, it, expect } from "vitest";
import { parseAIPlan } from "../aiPlanParser";

/**
 * Bug réel (audit fiabilité génération de plan IA) : le chemin Markdown legacy
 * (supabase/functions/ai-training-plan/index.ts) régénère et RESTREAME
 * intégralement une semaine déjà émise pour la corriger — recap stratégique
 * manquant chunk 1 (AUDIT FIX #3) et nettoyage contamination trail (assertion
 * post-génération) — sans jamais retirer la version originale déjà streamée
 * (le protocole SSE ne relaie que des deltas ajoutés, jamais un "retrait" ;
 * confirmé côté client : `fullText += content` dans useAITrainingPlan.ts).
 *
 * Le client reçoit donc les DEUX versions de la semaine corrigée, dans
 * l'ordre : originale (contaminée / avant correction) PUIS corrigée. La
 * règle de dédoublonnage ici ("garder l'existant si nombre de séances
 * réelles égal ou supérieur") gardait donc systématiquement la PREMIÈRE
 * version dès que la correction avait le MÊME nombre de séances réelles que
 * l'original — cas courant : nettoyer une contamination change le contenu
 * d'une séance, pas le nombre de séances de la semaine. Le correctif
 * server-side "réussissait" (logs "✅ cleaned") sans jamais atteindre le plan
 * final affiché au coach.
 */
function buildWeekBlock(weekNumber: number, sessionTitle: string): string {
  return `### Semaine ${weekNumber} — Test
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | ${sessionTitle} | Détails de la séance. |
| Mardi | Repos | Repos complet | Récupération. |
`;
}

describe("parseAIPlan — dédoublonnage de semaine (protocole SSE additive-only)", () => {
  it("même nombre de séances réelles (cas contamination trail nettoyée) : la SECONDE occurrence (corrigée) l'emporte", () => {
    const markdown = `# Plan TFCL™ — Marathon Test — 4 semaines

${buildWeekBlock(1, "Sortie longue montagne +1200m D+")}
${buildWeekBlock(1, "Sortie longue vallonnée")}
`;
    const plan = parseAIPlan(markdown);
    const week1 = plan.weeks.find(w => w.weekNumber === 1);
    expect(week1).toBeDefined();
    const realSession = week1!.sessions.find(s => !s.isRest);
    expect(realSession?.title).toBe("Sortie longue vallonnée");
  });

  it("nouvelle occurrence avec STRICTEMENT MOINS de séances réelles : garde l'existant (pas de régression)", () => {
    const fuller = `### Semaine 1 — Test
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | Seuil | Détails. |
| Mercredi | CAP | EF | Détails. |
| Vendredi | Repos | Repos complet | Récupération. |
`;
    const partial = `### Semaine 1 — Test (tronquée)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération. |
`;
    const markdown = `# Plan TFCL™ — Marathon Test — 4 semaines

${fuller}
${partial}
`;
    const plan = parseAIPlan(markdown);
    const week1 = plan.weeks.find(w => w.weekNumber === 1);
    expect(week1).toBeDefined();
    const realSessions = week1!.sessions.filter(s => !s.isRest);
    expect(realSessions.length).toBe(2);
    expect(realSessions.map(s => s.title)).toEqual(["Seuil", "EF"]);
  });

  it("nouvelle occurrence avec STRICTEMENT PLUS de séances réelles : remplace (comportement historique préservé)", () => {
    const partial = `### Semaine 1 — Test
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération. |
`;
    const fuller = `### Semaine 1 — Test (complète)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | Seuil | Détails. |
| Mercredi | CAP | EF | Détails. |
`;
    const markdown = `# Plan TFCL™ — Marathon Test — 4 semaines

${partial}
${fuller}
`;
    const plan = parseAIPlan(markdown);
    const week1 = plan.weeks.find(w => w.weekNumber === 1);
    expect(week1).toBeDefined();
    const realSessions = week1!.sessions.filter(s => !s.isRest);
    expect(realSessions.length).toBe(2);
  });
});

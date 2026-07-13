/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1A — System prompt en mode JSON structuré
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Réutilise INTÉGRALEMENT les défenses sémantiques du prompt Markdown existant
 * (verrous sport, ratios Lorang, W'bal, nutrition guardrails, hard-ban trail,
 * masters/RED-S/etc.), puis ajoute un "appendix JSON" qui :
 *   - impose la sortie JSON conforme au schéma injecté à chaque appel ;
 *   - désactive explicitement toutes les instructions de format Markdown
 *     (H1 déterministe, tableau `| Jour | Type | ... |`, colonne Détails,
 *     marqueur 🔑, en-têtes de bloc, etc.). Ces règles sont écrasées, PAS
 *     supprimées, pour ne pas casser le chemin Markdown historique tant que
 *     la Phase 1B n'a pas migré le viewer/parser client.
 *   - énonce les invariants du schéma : discriminant `custom`, enum
 *     `catalogId` du catalogue injecté, `isKeySession` en booléen, `sport`
 *     enum fermé, durée en minutes uniquement.
 *
 * Utilisé uniquement par le chemin JSON (feature-flag serveur).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getSystemPrompt, type SystemPromptProfile } from "./systemPrompt.ts";

const JSON_MODE_APPENDIX = `
═══════════════════════════════════════════════════════════════════════════════
🔧 MODE SORTIE JSON STRUCTURÉ — SURCHARGE FORMAT (Phase 1A TFCL™)
═══════════════════════════════════════════════════════════════════════════════

Tu produis UNIQUEMENT un objet JSON valide, conforme au schéma décrit ci-dessous.
Toutes les défenses sémantiques ci-dessus (verrous sport, ratios, Lorang, W'bal,
guardrails, hard-ban, master/RED-S, trail, etc.) restent EN VIGUEUR.
Seules les règles de FORMAT Markdown sont désactivées.

## RÈGLES DE FORMAT — DÉSACTIVÉES DANS CE MODE

Les instructions suivantes présentes plus haut dans ce prompt sont ANNULÉES :
- ❌ Titre H1 \`# Plan TFCL™ — …\` (le \`title\` du JSON le remplace)
- ❌ Format tableau Markdown \`| Jour | Type | Sport | ... |\` et sa colonne "Détails"
- ❌ Marqueur emoji 🔑 pour séance clé (utiliser le booléen \`isKeySession\`)
- ❌ En-têtes de bloc \`## Bloc N : …\`, \`### Semaine N — …\`
- ❌ Récapitulatifs / résumés en prose entre les semaines
- ❌ Toute mention de "volume hebdomadaire déclaré" (le volume est recalculé
  côté client à partir de \`durationMin\` par session)

## FORMAT DE SORTIE OBLIGATOIRE

Un unique objet JSON à la racine, sans balise Markdown \`\`\`json, sans texte
avant/après, sans commentaire. Le schéma est celui décrit à chaque requête.

Champs principaux :
{
  "title": "…",                        // chunk 1 uniquement
  "diagnostic": "…",                   // chunk 1 uniquement (facultatif)
  "strategicRecap": { … },             // chunk 1 uniquement (facultatif)
  "phases": [{ "name": "…", "weeks": "S1-S6", "objective": "…" }],  // chunk 1
  "weeks": [
    {
      "weekNumber": 1,
      "phase": "base" | "build" | "peak" | "taper",
      "theme": "…",
      "phaseObjective": "…",           // facultatif
      "weeklyNotes": "…",              // facultatif — remplace coachNotes
      "sessions": [
        {
          "day": "lundi" | "mardi" | … | "dimanche",
          "sport": "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest",
          "title": "…",
          "details": "…",              // texte libre : structure warm-up/main/cool-down
          "isKeySession": true | false,
          "custom": true | false,
          "catalogId": "B_BIKE_TEMPO" | null,
          "durationMin": 60,
          "zones": ["Z2", "Z3"]
        }
      ]
    }
  ]
}

## INVARIANTS À RESPECTER (VALIDATION ZOD SERVER-SIDE)

1. \`sessions[].custom = false\` ⇒ \`catalogId\` DOIT être un identifiant présent
   dans le catalogue injecté ci-dessous. Aucun ID inventé.
2. \`sessions[].custom = true\` ⇒ \`catalogId = null\`.
3. \`sessions[].sport = "rest"\` ⇒ \`custom = true\`, \`catalogId = null\`,
   \`durationMin = 0\`. Utilisé pour marquer un jour de repos explicite.
4. \`sessions[].zones\` est un tableau de labels (Z1..Z5, "RPE 6", "88% FTP"…).
5. \`sessions[].durationMin\` : entier positif en MINUTES (pas d'heures).
6. Chaque semaine \`weeks[i]\` DOIT contenir au moins une session. Un jour off
   se déclare via une session \`sport: "rest"\`, jamais par l'absence de session.
7. Les \`weekNumber\` demandés dans la requête doivent tous être présents, sans
   trou ni doublon.
8. Ratio catalogue ≥ 80 % : au moins 80 % des sessions non-rest doivent avoir
   \`custom = false\` avec un \`catalogId\` valide.
9. Verrou sport : la contrainte "un slot d'un sport donné = un ID du même
   sport" reste absolue (voir bloc "règle non-cross-sport" plus haut).

## EN CAS DE DOUTE SUR UN ID

Si aucun ID du catalogue ne correspond exactement au besoin d'une session,
préfère \`custom = true\` (+ \`catalogId = null\`) plutôt que d'inventer un ID.
Un ID invalide fera échouer la validation et provoquera un retry coûteux.

═══════════════════════════════════════════════════════════════════════════════
`;

export function getSystemPromptJSON(profile?: SystemPromptProfile): string {
  return `${getSystemPrompt(profile)}\n${JSON_MODE_APPENDIX}`;
}

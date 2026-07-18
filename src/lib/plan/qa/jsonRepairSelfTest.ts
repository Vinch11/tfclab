/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Negative test harness — filet de réparation JSON conservatrice
 * ═══════════════════════════════════════════════════════════════════════════════
 * Miroir CLIENT-ONLY de la logique edge (`supabase/functions/ai-training-plan/
 * generateChunkJSON.ts` → `conservativeJsonRepair` + `extractJsonPayload`).
 *
 * But : PROUVER que le filet répare bien virgule traînante / BOM / rééquilibrage
 * d'accolades ≤3, sans dépendre d'un appel gateway qui ne produirait pas
 * spontanément un payload malformé.
 *
 * ⚠️ Cette copie doit rester alignée avec la fonction edge. En cas de divergence,
 *    la vérité fait foi côté edge — mettre à jour ce miroir.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export function extractJsonPayloadClient(raw: string): { json: string; unwrapped: boolean } {
  let text = raw.replace(/^\uFEFF/, "").trim();
  let unwrapped = false;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim().length > 0) {
    text = fence[1].trim();
    unwrapped = true;
  }
  if (!/^[{[]/.test(text)) {
    const start = text.search(/[{[]/);
    if (start === -1) throw new Error("EXTRACT_JSON: aucun délimiteur JSON trouvé");
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0, end = -1, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inString) {
        if (escaped) { escaped = false; }
        else if (c === "\\") { escaped = true; }
        else if (c === '"') { inString = false; }
        continue;
      }
      if (c === '"') { inString = true; continue; }
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) throw new Error("EXTRACT_JSON: JSON non équilibré (probable troncature)");
    text = text.slice(start, end + 1);
    unwrapped = true;
  }
  return { json: text, unwrapped };
}

export function conservativeJsonRepairClient(
  input: string,
): { text: string; changed: boolean; repairs: string[] } {
  let text = input;
  const repairs: string[] = [];

  const before1 = text;
  text = text.replace(/,(\s*[}\]])/g, "$1");
  if (text !== before1) repairs.push("trailing_comma");

  const before2 = text;
  text = text.replace(/^\uFEFF/, "");
  if (text !== before2) repairs.push("bom");

  const opensCurly = (text.match(/{/g) || []).length;
  const closesCurly = (text.match(/}/g) || []).length;
  const opensSquare = (text.match(/\[/g) || []).length;
  const closesSquare = (text.match(/\]/g) || []).length;
  const missingCurly = opensCurly - closesCurly;
  const missingSquare = opensSquare - closesSquare;
  if (
    missingCurly >= 0 && missingSquare >= 0 &&
    missingCurly + missingSquare > 0 && missingCurly + missingSquare <= 3
  ) {
    text = text + "]".repeat(missingSquare) + "}".repeat(missingCurly);
    repairs.push(`balance_close(sq=${missingSquare},cu=${missingCurly})`);
  }

  return { text, changed: repairs.length > 0, repairs };
}

export interface RepairTestCase {
  name: string;
  input: string;
  expectRepairs: string[]; // sous-ensemble à retrouver
  expectValidJson: boolean;
}

export interface RepairTestResult {
  name: string;
  pass: boolean;
  actualRepairs: string[];
  parsedOk: boolean;
  firstError?: string;
  recoveredAfterRepair: boolean;
  detail: string;
}

const CASES: RepairTestCase[] = [
  {
    name: "trailing_comma dans un objet",
    input: `{"a":1,"b":2,}`,
    expectRepairs: ["trailing_comma"],
    expectValidJson: true,
  },
  {
    name: "BOM UTF-8 en tête (strip via extract)",
    input: `\uFEFF{"ok":true}`,
    expectRepairs: [], // BOM est retiré par extractJsonPayload avant la passe repair
    expectValidJson: true,
  },
  {
    name: "accolade manquante (1)",
    input: `{"weeks":[{"n":1},{"n":2}]`,
    expectRepairs: ["balance_close"],
    expectValidJson: true,
  },
  {
    name: "combo trailing_comma + 2 fermetures",
    input: `{"weeks":[{"n":1,},{"n":2,}`,
    expectRepairs: ["trailing_comma", "balance_close"],
    expectValidJson: true,
  },
  {
    name: "irréparable (4 fermetures manquantes)",
    input: `{"a":{"b":{"c":{"d":{"e":1`,
    expectRepairs: [],
    expectValidJson: false,
  },
];

/**
 * Exécute les cas malformés et vérifie que le filet répare (ou refuse
 * proprement) comme attendu.
 */
export function runJsonRepairSelfTest(): RepairTestResult[] {
  return CASES.map(tc => runOne(tc));
}

function runOne(tc: RepairTestCase): RepairTestResult {
  // 1) extractJsonPayload (peut throw sur troncature)
  let payload = tc.input;
  try {
    payload = extractJsonPayloadClient(tc.input).json;
  } catch {
    // extraction failed → laisse tel quel pour tenter la réparation directe
  }

  // 2) parse direct
  let firstError: string | undefined;
  try {
    JSON.parse(payload);
    return {
      name: tc.name,
      pass: tc.expectRepairs.length === 0 && tc.expectValidJson,
      actualRepairs: [],
      parsedOk: true,
      recoveredAfterRepair: false,
      detail: "JSON parsé sans réparation.",
    };
  } catch (e) {
    firstError = e instanceof Error ? e.message : String(e);
  }

  // 3) réparation conservatrice
  const rep = conservativeJsonRepairClient(payload);
  let parsedOk = false;
  if (rep.changed) {
    try {
      JSON.parse(rep.text);
      parsedOk = true;
    } catch { /* insuffisant */ }
  }

  const expectedFound = tc.expectRepairs.every(exp =>
    rep.repairs.some(r => r.startsWith(exp)),
  );
  const pass = parsedOk === tc.expectValidJson && (tc.expectRepairs.length === 0 || expectedFound);

  return {
    name: tc.name,
    pass,
    actualRepairs: rep.repairs,
    parsedOk,
    firstError,
    recoveredAfterRepair: parsedOk,
    detail: parsedOk
      ? `réparé via [${rep.repairs.join(",")}]`
      : `NON réparé — firstError="${firstError ?? "?"}" repairs=[${rep.repairs.join(",") || "aucune"}]`,
  };
}

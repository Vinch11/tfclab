// Extraction robuste du JSON depuis une sortie LLM potentiellement enrobée
// (fences markdown, préambule, texte de conclusion, BOM).
// Retourne { json, unwrapped } — unwrapped=true si un nettoyage a été nécessaire.
export function extractJsonPayload(raw: string): { json: string; unwrapped: boolean } {
  let text = raw.replace(/^\uFEFF/, "").trim();
  let unwrapped = false;

  // 1. Fences ```json ... ``` ou ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim().length > 0) {
    text = fence[1].trim();
    unwrapped = true;
  }

  // 2. Si ça ne commence toujours pas par { ou [, extraire du premier
  //    délimiteur ouvrant au dernier délimiteur fermant équilibré.
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

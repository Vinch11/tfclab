/**
 * Formats fiche structure text (Main, Warm-up, ...) into readable HTML.
 *
 * Handles:
 *  - **bold** markdown
 *  - Numbered items "1) ... 2) ..." → ordered list
 *  - Bullet markers "• " or " - " → unordered list
 *  - Sentence breaks after ". " when block is long
 *
 * Returns sanitized HTML (input already escaped).
 */

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function formatFicheText(raw: string): string {
  if (!raw) return "";
  const escaped = escapeHTML(raw);

  // Try numbered list: split on " N) " patterns (>= 2 occurrences)
  const numMatches = escaped.match(/\b\d+\)\s/g);
  if (numMatches && numMatches.length >= 2) {
    // Capture any intro before first "1) "
    const firstIdx = escaped.search(/\b1\)\s/);
    const intro = firstIdx > 0 ? escaped.slice(0, firstIdx).trim() : "";
    const rest = firstIdx >= 0 ? escaped.slice(firstIdx) : escaped;
    const parts = rest
      .split(/\s*\b(\d+)\)\s+/)
      .filter((p) => p !== "");
    // parts = [num, text, num, text, ...]
    const items: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const text = parts[i + 1];
      if (text) items.push(`<li>${applyBold(text.trim())}</li>`);
    }
    return `${intro ? `<p style="margin:0 0 4px 0;">${applyBold(intro)}</p>` : ""}<ol style="margin:2px 0 0 18px;padding:0;">${items.join("")}</ol>`;
  }

  // Bullet list: split on " • " or starting "• "
  if (/(^|\s)•\s/.test(escaped)) {
    const segments = escaped.split(/\s*•\s+/).filter((s) => s.trim());
    if (segments.length >= 2) {
      const intro = !/^•/.test(raw.trim()) ? segments.shift() : null;
      const items = segments.map((t) => `<li>${applyBold(t.trim())}</li>`).join("");
      return `${intro ? `<p style="margin:0 0 4px 0;">${applyBold(intro.trim())}</p>` : ""}<ul style="margin:2px 0 0 18px;padding:0;">${items}</ul>`;
    }
  }

  // Long paragraph: break on ". " when > 220 chars
  if (escaped.length > 220) {
    const sentences = escaped
      .split(/(?<=[.!?])\s+(?=[A-ZÉÈÀÂÊÎÔÛÇ«])/)
      .filter((s) => s.trim());
    if (sentences.length >= 2) {
      return sentences
        .map((s) => `<p style="margin:0 0 3px 0;">${applyBold(s.trim())}</p>`)
        .join("");
    }
  }

  return applyBold(escaped);
}

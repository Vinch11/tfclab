import { applyBevelPrintTheme } from "@/lib/print/bevelPrintTheme";

export interface OpenPrintableHTMLOptions {
  /** Shown in the helper banner (not used for downloads). */
  filenameHint?: string;
  /** Automatically open the print dialog after opening (desktop only recommended). */
  autoPrint?: boolean;
  /** Add the helper banner inside the HTML (recommended). */
  includeInstructions?: boolean;
}

export function isIOSDevice(): boolean {
  const ua = navigator.userAgent || "";
  const classicIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ often reports as Mac
  const iPadOS = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return classicIOS || Boolean(iPadOS);
}

function injectBefore(html: string, needle: string, insertion: string): string {
  const idx = html.toLowerCase().lastIndexOf(needle.toLowerCase());
  if (idx === -1) return html + insertion;
  return html.slice(0, idx) + insertion + html.slice(idx);
}

function withPrintHelper(html: string, filenameHint?: string): string {
  const isIOS = isIOSDevice();
  const name = filenameHint ? `« ${escapeHtml(filenameHint)} »` : "ce document";

  const style = `
    <style>
      .tfc-print-helper{position:sticky;top:0;z-index:9999;margin:0 0 16px 0;padding:12px 14px;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
      .tfc-print-helper h3{margin:0 0 6px 0;font-size:14px;line-height:1.2;}
      .tfc-print-helper p{margin:0;font-size:12px;line-height:1.35;opacity:.85;}
      .tfc-print-helper code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;}
      @media print { .tfc-print-helper{display:none !important;} }
    </style>
  `;

  const helper = `
    <div class="tfc-print-helper">
      <h3>Impression / Enregistrement PDF</h3>
      <p>
        ${isIOS
          ? `Sur iPhone/iPad : ouvrez <b>Partager</b> → <b>Imprimer</b> → pincez l’aperçu puis <b>Partager</b> → <b>Enregistrer dans Fichiers</b> (PDF).`
          : `Sur ordinateur : <code>Ctrl+P</code> (Windows) ou <code>Cmd+P</code> (Mac) puis choisissez “Enregistrer en PDF”.`}
        <br/>Document : ${name}
      </p>
    </div>
  `;

  // Ensure helper CSS is in <head> when possible
  let out = html;
  if (html.toLowerCase().includes("</head>")) {
    out = injectBefore(out, "</head>", style);
  } else {
    out = style + out;
  }

  if (out.toLowerCase().includes("<body")) {
    // Insert right after opening body tag if possible
    const bodyOpenIdx = out.toLowerCase().indexOf("<body");
    const bodyTagEnd = out.indexOf(">", bodyOpenIdx);
    if (bodyTagEnd !== -1) {
      out = out.slice(0, bodyTagEnd + 1) + helper + out.slice(bodyTagEnd + 1);
      return out;
    }
  }

  // Fallback: insert before </body> or append
  return out.toLowerCase().includes("</body>")
    ? injectBefore(out, "</body>", helper)
    : out + helper;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Opens a printable HTML document in a new tab/window, with a robust fallback for popup blockers.
 * Uses a Blob URL (avoids URL-length limits).
 */
export function openPrintableHTML(html: string, options: OpenPrintableHTMLOptions = {}): void {
  const finalHtml = options.includeInstructions === false
    ? html
    : withPrintHelper(html, options.filenameHint);

  const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank", "noopener,noreferrer");

  // Popup blocked → fall back to same-tab navigation
  if (!win) {
    window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  if (options.autoPrint && !isIOSDevice()) {
    // Give the new tab time to render.
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        // Ignore
      }
    }, 600);
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

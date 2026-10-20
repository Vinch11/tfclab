/**
 * Export robuste multi-plateformes pour un fichier texte généré côté client
 * (JSON, Markdown...). Le pattern Blob + `<a download>` seul échoue
 * silencieusement sur iOS Safari et dans certains contextes PWA/webview
 * (iframe sans `allow-downloads`, perte du geste utilisateur après un await,
 * navigateur in-app sans gestionnaire de téléchargement) — cf. le bug connu
 * "Exporter un rapport ne fait rien" sur iOS Safari référencé dans
 * playwright.config.ts et src/pages/__e2e/MobileNavHarness.tsx.
 *
 * Ordre d'essai :
 *   1) Web Share API avec fichier — marche sur iOS/Android, y compris en iframe.
 *   2) Téléchargement blob classique via `<a download>` — desktop.
 *   3) Fallback ultime : nouvel onglet affichant le contenu en `<pre>`
 *      (iOS Safari in-app browser / iframe sans allow-downloads), avec un
 *      bouton "Copier" best-effort.
 */
export type ExportFileMethod = "share" | "download" | "window" | "cancelled" | "none";

export interface ExportFileResult {
  method: ExportFileMethod;
}

export async function exportTextFile(
  content: string,
  filename: string,
  mimeType: string,
): Promise<ExportFileResult> {
  // 1) Web Share API avec fichier
  try {
    const file = new File([content], filename, { type: mimeType });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] }) && typeof navigator.share === "function") {
      await navigator.share({ files: [file], title: filename });
      return { method: "share" };
    }
  } catch (e) {
    // AbortError = l'utilisateur a annulé la feuille de partage → ne pas
    // enchaîner sur un fallback qu'il n'a pas demandé.
    if (e instanceof Error && e.name === "AbortError") return { method: "cancelled" };
    // sinon on tente le téléchargement classique ci-dessous
  }

  // 2) Téléchargement blob classique
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { method: "download" };
  } catch { /* fallback ci-dessous */ }

  // 3) Fallback ultime : nouvel onglet avec le contenu
  try {
    const win = window.open("", "_blank");
    if (win) {
      const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      win.document.write(
        `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title>` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<style>body{font:13px/1.4 ui-monospace,Menlo,monospace;padding:12px;margin:0;white-space:pre-wrap;word-break:break-word}` +
        `header{position:sticky;top:0;background:#111;color:#fff;padding:8px 12px;margin:-12px -12px 12px;font-family:system-ui}` +
        `button{background:#fff;color:#111;border:0;padding:6px 10px;border-radius:6px;font-weight:600}</style></head>` +
        `<body><header>${filename} &nbsp;` +
        `<button onclick="navigator.clipboard.writeText(document.getElementById('c').innerText)">Copier</button>` +
        `</header><pre id="c">${escaped}</pre></body></html>`,
      );
      win.document.close();
      return { method: "window" };
    }
  } catch { /* ignore */ }

  return { method: "none" };
}

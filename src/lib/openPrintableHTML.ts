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

/**
 * App installée sur l'écran d'accueil (mode standalone). Sur iOS, `window.
 * print()` ne produit AUCUNE UI dans ce mode — pas d'erreur, pas de dialogue :
 * le bouton "Imprimer" ne fait simplement rien, ce qui explique la confusion
 * ("je ne sais plus imprimer") signalée par le coach. Aucun contournement JS
 * pur n'existe pour rouvrir le vrai chrome Safari depuis un WKWebView
 * standalone — d'où le bouton "Partager" (Web Share API) ajouté en repli,
 * qui fonctionne lui en mode standalone.
 */
function isStandalonePWA(): boolean {
  return (
    (navigator as any).standalone === true ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches)
  );
}

/** Partage le document comme fichier HTML via le share sheet natif (AirDrop, Fichiers, Mail…). */
async function shareReportFile(html: string, filenameHint?: string): Promise<boolean> {
  try {
    const nav = navigator as any;
    if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
    const safeName = (filenameHint ?? "rapport").replace(/[^a-zA-Z0-9-_ ]+/g, "_").trim() || "rapport";
    const file = new File([html], `${safeName}.html`, { type: "text/html" });
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file], title: filenameHint ?? "Rapport" });
    return true;
  } catch {
    return false;
  }
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
 * Fallback iOS / popup bloqué : affiche le document dans une surcouche plein écran
 * (iframe srcdoc) avec une barre d'actions Imprimer / Fermer.
 * iOS Safari refuse d'ouvrir une URL blob: dans un onglet, d'où cette approche.
 */
const PRINT_OVERLAY_STYLE_ID = "tfc-print-overlay-style";

/**
 * Bug réel (retour coach, capture d'écran) : le bouton "Imprimer / PDF" de la
 * surcouche ouvrait bien le dialogue d'impression iOS, mais avec une
 * pagination délirante (457 pages pour un rapport d'une poignée de pages).
 * Cause : `frame.contentWindow.print()` imprime le document DE L'IFRAME, qui
 * porte le `transform: scale(...)` appliqué par `syncHeight()` pour
 * l'aperçu écran (mise à l'échelle dans la largeur mobile) — Safari iOS
 * calcule la pagination sur cette boîte transformée au lieu du rendu
 * visuel réel, explosant le nombre de pages. On imprime donc la fenêtre
 * TOP-LEVEL (dont l'impression est fiable, cf. le bouton "Imprimer" déjà
 * robuste de `CoachChecklistPage`), avec une feuille de style imprimée qui
 * masque tout sauf la surcouche et neutralise le scale/position/overflow
 * posés pour l'aperçu écran (sinon l'iframe serait rognée à la hauteur de
 * l'écran au lieu de son contenu réel).
 */
function injectPrintOnlyStyle(filenameHint?: string): void {
  document.getElementById(PRINT_OVERLAY_STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = PRINT_OVERLAY_STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#tfc-print-overlay) { display: none !important; }
      #tfc-print-overlay {
        position: static !important;
        inset: auto !important;
        height: auto !important;
        display: block !important;
      }
      #tfc-print-overlay .tfc-print-bar,
      #tfc-print-overlay .tfc-print-hint { display: none !important; }
      #tfc-print-overlay .tfc-print-scroller {
        position: static !important;
        overflow: visible !important;
        height: auto !important;
      }
      #tfc-print-overlay .tfc-print-stage {
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
      #tfc-print-overlay .tfc-print-frame {
        transform: none !important;
        position: static !important;
      }
    }
  `;
  document.head.appendChild(style);
  if (filenameHint) document.title = filenameHint;
}

function removePrintOnlyStyle(): void {
  document.getElementById(PRINT_OVERLAY_STYLE_ID)?.remove();
}

function openInlineOverlay(html: string, filenameHint?: string): void {
  const existing = document.getElementById("tfc-print-overlay");
  if (existing) existing.remove();
  removePrintOnlyStyle();

  const overlay = document.createElement("div");
  overlay.id = "tfc-print-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;flex-direction:column;";

  const bar = document.createElement("div");
  bar.className = "tfc-print-bar";
  bar.style.cssText =
    "flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top));border-bottom:1px solid rgba(0,0,0,.12);background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;";

  const title = document.createElement("span");
  title.textContent = filenameHint ?? "Rapport";
  title.style.cssText =
    "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;color:#111;";

  const btnStyle =
    "flex:0 0 auto;min-height:36px;padding:8px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.15);background:#111;color:#fff;font-size:13px;font-weight:600;";

  const printBtn = document.createElement("button");
  printBtn.textContent = "Imprimer / PDF";
  printBtn.style.cssText = btnStyle;

  const nav = navigator as any;
  const canShareFiles = typeof nav.canShare === "function" && (() => {
    try {
      return nav.canShare({ files: [new File([""], "test.html", { type: "text/html" })] });
    } catch {
      return false;
    }
  })();
  const shareBtn = document.createElement("button");
  shareBtn.textContent = "Partager";
  shareBtn.style.cssText = btnStyle + "background:#fff;color:#111;";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Fermer";
  closeBtn.style.cssText = btnStyle + "background:#fff;color:#111;";

  // App installée à l'écran d'accueil (standalone) : window.print() n'ouvre
  // aucune UI dans ce mode sur iOS (limitation plateforme, pas un bug de ce
  // code) — on le signale clairement et on met en avant "Partager" (Web
  // Share API), qui lui fonctionne en standalone.
  const hint = document.createElement("div");
  hint.className = "tfc-print-hint";
  if (isStandalonePWA()) {
    hint.textContent = "📱 Depuis l'app installée, \"Imprimer\" peut ne rien faire (limitation iOS). Utilise plutôt \"Partager\" → Enregistrer dans Fichiers, puis ouvre le fichier et imprime/exporte en PDF depuis là.";
    hint.style.cssText =
      "flex:0 0 auto;padding:6px 12px;font-size:11.5px;line-height:1.4;color:#7a4b00;background:#fff6e5;border-bottom:1px solid rgba(0,0,0,.08);";
  }

  // iOS Safari ne scrolle pas à l'intérieur d'une iframe : on l'étire à la
  // hauteur du contenu et on scrolle le conteneur parent à la place.
  const scroller = document.createElement("div");
  scroller.className = "tfc-print-scroller";
  scroller.style.cssText =
    "flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#fff;";

  // Le document est mis en page pour une largeur A4 : on force cette largeur
  // dans l'iframe (sinon Safari imprime la mise en page « mobile » écrasée)
  // et on la réduit visuellement pour l'écran.
  const DOC_WIDTH = 820;
  const stage = document.createElement("div");
  stage.className = "tfc-print-stage";
  stage.style.cssText = "position:relative;width:100%;overflow:hidden;";

  const frame = document.createElement("iframe");
  frame.className = "tfc-print-frame";
  frame.style.cssText = `display:block;width:${DOC_WIDTH}px;border:0;background:#fff;transform-origin:top left;`;
  frame.setAttribute("scrolling", "no");
  frame.setAttribute("title", filenameHint ?? "Rapport");

  const syncHeight = () => {
    try {
      const d = frame.contentDocument;
      if (!d?.body) return;
      const h = Math.max(
        d.body.scrollHeight,
        d.documentElement?.scrollHeight ?? 0,
        d.body.offsetHeight,
      );
      if (h > 0) frame.style.height = `${h + 40}px`;
      const available = stage.clientWidth || scroller.clientWidth || DOC_WIDTH;
      const scale = Math.min(1, available / DOC_WIDTH);
      frame.style.transform = `scale(${scale})`;
      stage.style.height = `${(h + 40) * scale}px`;
    } catch {
      // Ignore
    }
  };


  const originalTitle = document.title;
  const restoreTitle = () => { document.title = originalTitle; };
  printBtn.onclick = () => {
    injectPrintOnlyStyle(filenameHint);
    window.print();
  };
  shareBtn.onclick = () => {
    void shareReportFile(html, filenameHint);
  };
  closeBtn.onclick = () => {
    document.body.style.overflow = "";
    restoreTitle();
    removePrintOnlyStyle();
    window.removeEventListener("afterprint", restoreTitle);
    overlay.remove();
  };
  window.addEventListener("afterprint", restoreTitle);

  bar.append(title, printBtn, ...(canShareFiles ? [shareBtn] : []), closeBtn);
  overlay.append(bar);
  if (hint.textContent) overlay.append(hint);
  stage.append(frame);
  scroller.append(stage);
  overlay.append(scroller);
  document.body.appendChild(overlay);

  document.body.style.overflow = "hidden";

  const doc = frame.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  } else {
    frame.srcdoc = html;
  }

  frame.addEventListener("load", syncHeight);
  // Le contenu (images, polices) peut arriver après le premier rendu.
  [100, 400, 1000, 2500].forEach((ms) => setTimeout(syncHeight, ms));
  window.addEventListener("resize", syncHeight);
  try {
    const inner = frame.contentDocument;
    if (inner?.body && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncHeight).observe(inner.body);
    }
  } catch {
    // Ignore
  }

}

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

/**
 * Imprime la page actuellement affichée (boutons "Imprimer" qui utilisent les
 * classes Tailwind `print:*` sur la page en cours, plutôt qu'un rapport HTML
 * généré à part). Sur iOS en mode standalone (app installée sur l'écran
 * d'accueil), `window.print()` ne produit AUCUNE UI (cf. isStandalonePWA) —
 * c'est la cause de "je ne sais plus imprimer" quand ces boutons ne font
 * visiblement rien. Dans ce cas, on bascule sur un instantané statique de la
 * page affichée dans la même surcouche robuste (bouton Imprimer + repli
 * Partager) que les rapports générés, plutôt que de laisser le clic sans
 * aucun effet visible.
 */
export function printCurrentDocument(filenameHint?: string): void {
  if (isIOSDevice() && isStandalonePWA()) {
    const baseTag = `<base href="${window.location.href}">`;
    const snapshot = injectBefore(stripScripts(document.documentElement.outerHTML), "</head>", baseTag);
    openInlineOverlay(`<!doctype html>${snapshot}`, filenameHint);
    return;
  }
  window.print();
}

/**
 * Opens a printable HTML document in a new tab/window, with a robust fallback for popup blockers.
 * Uses a Blob URL (avoids URL-length limits). Sur iOS (et si le popup est bloqué),
 * bascule sur une surcouche plein écran interne.
 */
export function openPrintableHTML(html: string, options: OpenPrintableHTMLOptions = {}): void {
  // Socle de design Bevel commun à tous les rapports exportés.
  const themed = applyBevelPrintTheme(html);
  const finalHtml = options.includeInstructions === false
    ? themed
    : withPrintHelper(themed, options.filenameHint);

  // iOS ne sait pas naviguer vers une URL blob: → surcouche interne directement.
  if (isIOSDevice()) {
    openInlineOverlay(finalHtml, options.filenameHint);
    return;
  }

  const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Bug réel (retour coach : "j'ai un fichier de 0 octets" à l'impression) —
  // `window.open(url, "_blank", "noopener,noreferrer")` : la spec impose que
  // le navigateur renvoie TOUJOURS `null` quand `noopener` est passé, MÊME
  // quand la popup s'ouvre avec succès (c'est le but de `noopener` : ne pas
  // donner de référence à l'appelant). Le code croyait donc systématiquement
  // la popup bloquée, et appelait `URL.revokeObjectURL(url)` immédiatement —
  // alors que l'onglet réellement ouvert était encore en train de charger ce
  // même blob: URL. Course perdue → onglet vide → PDF de 0 octet à l'impression.
  // Fix : ouvrir SANS `noopener` pour récupérer une vraie référence (détection
  // de blocage fiable), puis couper `opener` manuellement une fois la
  // référence obtenue — même garantie de sécurité (pas de reverse-tabnabbing),
  // sans perdre la détection. `noreferrer` était de toute façon sans effet
  // ici : une URL blob: n'envoie jamais d'en-tête Referer.
  let win: Window | null = null;
  try {
    win = window.open(url, "_blank");
    if (win) {
      try { win.opener = null; } catch { /* best effort */ }
    }
  } catch {
    win = null;
  }

  // Popup bloqué → surcouche interne (fiable partout, aucune navigation requise)
  if (!win) {
    URL.revokeObjectURL(url);
    openInlineOverlay(finalHtml, options.filenameHint);
    return;
  }

  if (options.autoPrint) {
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


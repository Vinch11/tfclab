import { applyBevelPrintTheme } from "@/lib/print/bevelPrintTheme";

/** Largeur (px) pour laquelle les rapports générés sont mis en page (~A4). */
const DOC_WIDTH = 820;

/**
 * Bug réel (retour coach, persistant même après un re-déploiement confirmé) :
 * plusieurs rapports générés (buildDiagnosticProtocolHTML.ts,
 * buildTestingWeekProtocolHTML.ts, ExportTools.tsx, ObjectiveStrategyCard.tsx)
 * embarquent LEUR PROPRE bouton "🖨️ Imprimer / PDF" dans le HTML généré.
 * Depuis la bascule vers une vraie page d'impression dédiée (voir
 * `openPrintPreviewDocument` ci-dessous), ce document est TOUJOURS la
 * fenêtre top-level (plus jamais une iframe de surcouche) : `window.print()`
 * y est donc toujours correct, sans détour. Le nom de cette constante est
 * conservé (import existant dans 4 fichiers + leurs tests) mais elle est
 * désormais une simple référence à `window.print()`.
 */
export const EMBEDDED_PRINT_ONCLICK = "window.print()";

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
 * le bouton "Imprimer" ne fait simplement rien. Limitation de plateforme
 * (aucun contournement JS pur n'existe pour rouvrir le vrai chrome Safari
 * depuis un WKWebView standalone) — d'où le bouton "Partager" (Web Share
 * API) ajouté dans la bannière d'aide, qui lui fonctionne en standalone.
 */
function isStandalonePWA(): boolean {
  return (
    (navigator as any).standalone === true ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches)
  );
}

function injectBefore(html: string, needle: string, insertion: string): string {
  const idx = html.toLowerCase().lastIndexOf(needle.toLowerCase());
  if (idx === -1) return html + insertion;
  return html.slice(0, idx) + insertion + html.slice(idx);
}

/**
 * Bug réel (retour coach, persistant même après avoir retiré les marges
 * @page non supportées par Safari — toujours "des centaines de pages") :
 * aucun des documents générés ne déclare de `<meta name="viewport">` (sauf
 * ExportTools.tsx, qui déclare `width=device-width` — tout aussi
 * problématique). Ces documents sont mis en page pour une largeur ~A4
 * (DOC_WIDTH, 820px), pas pour un écran de
 * téléphone. Mobile Safari n'imprime pas en reflowant selon `@page` comme
 * un moteur de pagination classique : il découpe une CAPTURE du rendu
 * écran en tranches de la hauteur d'une page papier. Sans largeur fixée,
 * la page peut hériter de la largeur ÉTROITE de l'écran du téléphone
 * plutôt que la largeur virtuelle ~980px que Safari utilise d'habitude pour
 * les pages "desktop" sans viewport déclaré — le texte reflow alors sur une
 * hauteur totale démesurée, qui une fois tranchée en pages A4 donne des
 * centaines de pages quasi vides. Fixe la largeur de rendu à celle pour
 * laquelle le document est réellement mis en page, indépendamment de la
 * largeur d'écran réelle.
 */
function ensureFixedViewport(html: string, width: number): string {
  const meta = `<meta name="viewport" content="width=${width}">`;
  const existingMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  if (existingMatch) {
    return html.replace(existingMatch[0], meta);
  }
  if (html.toLowerCase().includes("</head>")) {
    return injectBefore(html, "</head>", meta);
  }
  return meta + html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsString(s: string): string {
  return JSON.stringify(s);
}

/**
 * Bannière d'aide + actions, injectée dans le document généré. Le bouton
 * "Imprimer / PDF" appelle directement `window.print()` : depuis la
 * décision coach du 2026-10-22, ce document est TOUJOURS la fenêtre
 * top-level d'une vraie page dédiée (`/print-preview`), jamais une iframe —
 * aucun détour n'est donc nécessaire. "Partager" (Web Share API, détecté à
 * l'exécution) reste utile pour le cas iOS "app installée à l'écran
 * d'accueil", où `window.print()` ne produit aucune UI (limitation de
 * plateforme, pas un bug de ce code).
 */
function withPrintHelper(html: string, filenameHint?: string): string {
  const isIOS = isIOSDevice();
  const name = filenameHint ? `« ${escapeHtml(filenameHint)} »` : "ce document";
  const shareTitle = escapeJsString(filenameHint ?? "Rapport");
  const shareFileName = escapeJsString(
    (filenameHint ?? "rapport").replace(/[^a-zA-Z0-9-_ ]+/g, "_").trim() || "rapport"
  );

  const style = `
    <style>
      .tfc-print-helper{position:sticky;top:0;z-index:9999;margin:0 0 16px 0;padding:12px 14px;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
      .tfc-print-helper .tfc-print-helper-text{flex:1;min-width:200px;}
      .tfc-print-helper h3{margin:0 0 6px 0;font-size:14px;line-height:1.2;}
      .tfc-print-helper p{margin:0;font-size:12px;line-height:1.35;opacity:.85;}
      .tfc-print-helper code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;}
      .tfc-print-helper button{flex:0 0 auto;min-height:36px;padding:8px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.15);background:#111;color:#fff;font-size:13px;font-weight:600;cursor:pointer;}
      .tfc-print-helper button.tfc-print-helper-share{background:#fff;color:#111;}
      @media print { .tfc-print-helper{display:none !important;} }
    </style>
  `;

  const helper = `
    <div class="tfc-print-helper">
      <div class="tfc-print-helper-text">
        <h3>Impression / Enregistrement PDF</h3>
        <p>
          ${isIOS
            ? `Appuyez sur <b>Imprimer / PDF</b>, puis pincez l'aperçu et choisissez <b>Enregistrer dans Fichiers</b> (PDF).`
            : `Cliquez sur <b>Imprimer / PDF</b>, ou <code>Ctrl+P</code> (Windows) / <code>Cmd+P</code> (Mac), puis choisissez "Enregistrer en PDF".`}
          <br/>Document : ${name}
        </p>
      </div>
      <button type="button" onclick="window.print()">Imprimer / PDF</button>
      <button type="button" class="tfc-print-helper-share" id="tfc-print-helper-share" style="display:none;">Partager</button>
    </div>
    <script>
      (function () {
        try {
          var nav = window.navigator;
          var canShareFiles = typeof nav.canShare === "function" && (function () {
            try {
              return nav.canShare({ files: [new File([""], "test.html", { type: "text/html" })] });
            } catch (e) {
              return false;
            }
          })();
          if (!canShareFiles) return;
          var btn = document.getElementById("tfc-print-helper-share");
          if (!btn) return;
          btn.style.display = "";
          btn.addEventListener("click", function () {
            try {
              var html = document.documentElement.outerHTML;
              var file = new File(["<!doctype html>" + html], ${shareFileName} + ".html", { type: "text/html" });
              if (nav.canShare({ files: [file] })) {
                nav.share({ files: [file], title: ${shareTitle} });
              }
            } catch (e) {
              /* ignore */
            }
          });
        } catch (e) {
          /* ignore */
        }
      })();
    </script>
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

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

/** Clé sessionStorage utilisée pour relayer un document vers `/print-preview`. */
const PRINT_PREVIEW_STORAGE_PREFIX = "tfc:printPreview:";

/**
 * Décision coach explicite (2026-10-22, suite à un retour de PDF
 * ENTIÈREMENT VIDE à l'impression sur PC) : remplace le mécanisme
 * `blob:` + `window.open()` (et, avant lui pour iOS, la surcouche iframe
 * plein écran) par une VRAIE page du site (`/print-preview`, voir
 * `src/pages/PrintPreviewPage.tsx`), chargée par une navigation NORMALE
 * (même origine, pas de `blob:`), qui réaffiche le document déjà généré
 * puis laisse l'utilisateur déclencher l'impression native dessus.
 *
 * Pourquoi : une `blob:` URL n'est valable que dans le contexte du
 * document qui l'a créée ; sa fiabilité face à l'impression RÉELLE et
 * interactive d'un navigateur (Ctrl+P → aperçu → "Enregistrer en PDF")
 * n'est garantie par aucune spécification — seule l'API CDP
 * `Page.printToPDF` (utilisée par les tests automatisés, y compris ceux de
 * ce fichier) est documentée comme fiable sur ce type d'URL ; elle ne
 * couvre pas le chemin réellement emprunté par un clic humain sur
 * "Imprimer" dans un vrai navigateur. En relayant le document via
 * `sessionStorage` vers une page RÉELLEMENT servie par l'application
 * (même mécanisme qu'une navigation normale, exactement comme le bouton
 * "Imprimer" déjà robuste de `CoachChecklistPage`), on élimine cette classe
 * entière de risques — sur desktop ET iPhone, avec le même code.
 *
 * `sessionStorage` est transmis automatiquement à l'onglet ouvert par
 * `window.open()` (copie, spec HTML — même origine, même session) : pas de
 * requête réseau supplémentaire, pas de limite de taille d'URL.
 */
function openPrintPreviewDocument(html: string, filenameHint?: string, autoPrint?: boolean): void {
  const key = `${PRINT_PREVIEW_STORAGE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(key, html);
  } catch {
    // Document inhabituellement volumineux (quota sessionStorage dépassé) —
    // mieux vaut prévenir que d'ouvrir un onglet qui échouera silencieusement.
    window.alert(
      "Ce document est trop volumineux pour l'aperçu d'impression. Réduisez le contenu exporté ou contactez le support."
    );
    return;
  }

  const url = `/print-preview?d=${encodeURIComponent(key)}${autoPrint ? "&autoPrint=1" : ""}${
    filenameHint ? `&title=${encodeURIComponent(filenameHint)}` : ""
  }`;

  let win: Window | null = null;
  try {
    win = window.open(url, "_blank");
  } catch {
    win = null;
  }

  if (!win) {
    try { sessionStorage.removeItem(key); } catch { /* best effort */ }
    window.alert(
      "La fenêtre d'impression a été bloquée par votre navigateur. Autorisez les pop-ups pour ce site, puis réessayez."
    );
  }
}

/**
 * Imprime la page actuellement affichée (boutons "Imprimer" qui utilisent les
 * classes Tailwind `print:*` sur la page en cours, plutôt qu'un rapport HTML
 * généré à part). Sur iOS en mode standalone (app installée sur l'écran
 * d'accueil), `window.print()` ne produit AUCUNE UI (cf. isStandalonePWA).
 * Dans ce cas, on remplace le document COURANT (pas de nouvel onglet : le
 * mode standalone ne garantit pas qu'une vraie fenêtre séparée s'ouvre) par
 * un instantané statique de la page affichée, avec les mêmes boutons
 * Imprimer / Partager que les rapports générés.
 */
export function printCurrentDocument(filenameHint?: string): void {
  if (isIOSDevice() && isStandalonePWA()) {
    const baseTag = `<base href="${window.location.href}">`;
    const snapshot = injectBefore(stripScripts(document.documentElement.outerHTML), "</head>", baseTag);
    const finalHtml = withPrintHelper(`<!doctype html>${snapshot}`, filenameHint);
    document.open();
    document.write(finalHtml);
    document.close();
    return;
  }
  window.print();
}

/**
 * Ouvre un document HTML imprimable dans une page dédiée (`/print-preview`),
 * sur desktop comme sur iPhone — voir `openPrintPreviewDocument` ci-dessus
 * pour le détail de ce choix.
 */
export function openPrintableHTML(html: string, options: OpenPrintableHTMLOptions = {}): void {
  // Socle de design Bevel commun à tous les rapports exportés.
  const themed = applyBevelPrintTheme(html);
  const withViewport = ensureFixedViewport(themed, DOC_WIDTH);
  const finalHtml = options.includeInstructions === false
    ? withViewport
    : withPrintHelper(withViewport, options.filenameHint);

  openPrintPreviewDocument(finalHtml, options.filenameHint, options.autoPrint);
}

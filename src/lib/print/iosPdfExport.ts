/**
 * Export PDF natif pour iPhone/iPad.
 *
 * Pourquoi : sur iOS, `window.print()` est peu fiable (aucune UI depuis l'app
 * installée sur l'écran d'accueil, pagination cassée dans une iframe, onglet
 * `about:blank` vide en mode standalone). Plutôt que de dépendre de
 * l'impression Safari, on fabrique un VRAI fichier PDF dans le navigateur
 * (html2canvas → jsPDF, page A4 par page A4), puis on le propose via le
 * menu Partager natif (Enregistrer dans Fichiers, AirDrop, Mail…) — qui
 * fonctionne aussi en mode app installée.
 *
 * Le partage exige un geste utilisateur récent : la génération étant
 * asynchrone, on affiche un écran final avec un bouton « Enregistrer le PDF »
 * (nouveau tap = nouveau geste valide).
 */

const DOC_WIDTH = 820;
/** Hauteur CSS d'une page A4 pour une largeur de DOC_WIDTH px. */
const PAGE_HEIGHT = Math.round((DOC_WIDTH * 297) / 210);
/** Résolution : 1.6 garde chaque tranche bien sous la limite canvas iOS. */
const RENDER_SCALE = 1.6;

function makeOverlay(): { root: HTMLDivElement; setBody: (nodes: Node[]) => void } {
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;";
  const card = document.createElement("div");
  card.style.cssText =
    "background:#fff;color:#111;border-radius:16px;padding:20px;max-width:340px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:12px;text-align:center;";
  root.append(card);
  document.body.append(root);
  return {
    root,
    setBody: (nodes) => {
      card.replaceChildren(...nodes);
    },
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css: string, text?: string) {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (text) e.textContent = text;
  return e;
}

const BTN =
  "min-height:44px;padding:10px 14px;border-radius:12px;border:1px solid rgba(0,0,0,.15);font-size:15px;font-weight:600;";

function safeFileName(hint?: string): string {
  const base = (hint ?? "rapport").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (base.replace(/[^a-zA-Z0-9-_ ]+/g, "_").trim() || "rapport") + ".pdf";
}

/** Vrai si la tranche capturée ne contient que du blanc (échantillon réduit). */
function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  try {
    const s = document.createElement("canvas");
    s.width = 64;
    s.height = 90;
    const ctx = s.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(canvas, 0, 0, s.width, s.height);
    const d = ctx.getImageData(0, 0, s.width, s.height).data;
    for (let p = 0; p < d.length; p += 4) {
      if (d[p] < 245 || d[p + 1] < 245 || d[p + 2] < 245) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function renderPdf(
  html: string,
  filenameHint: string | undefined,
  onProgress: (txt: string) => void,
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-${DOC_WIDTH * 3}px;top:0;width:${DOC_WIDTH}px;height:${PAGE_HEIGHT}px;border:0;background:#fff;`;
  document.body.append(frame);

  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("iframe document unavailable");
    doc.open();
    doc.write(html);
    doc.close();

    // Attendre images + polices.
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") resolve();
      else frame.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 3000);
    });
    try {
      await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 300));

    const body = doc.body;
    // Éléments réservés à l'écran : bandeau d'aide, boutons imprimer.
    // .page-break (page-break-after: always) est une directive d'impression
    // native, sans effet utile ici — on pagine nous-mêmes par hauteur fixe.
    // Retour coach (iPhone) : bannière de chapitre chevauchant le texte qui
    // la précède, uniquement à l'endroit où un <div class="page-break">
    // suit immédiatement un élément à bordure (.footer) — pas reproduit
    // sous Chromium. Neutralisé avant capture plutôt que de dépendre de ce
    // comportement.
    const ignore = (node: Element) =>
      node.classList?.contains("tfc-print-helper") ||
      node.classList?.contains("no-print") ||
      node.classList?.contains("page-break") ||
      node.tagName === "BUTTON";
    doc.querySelectorAll(".tfc-print-helper, .no-print, .page-break, button").forEach((n) => {
      (n as HTMLElement).style.display = "none";
    });

    const totalHeight = Math.max(body.scrollHeight, doc.documentElement.scrollHeight, PAGE_HEIGHT);
    const pageCount = Math.max(1, Math.ceil(totalHeight / PAGE_HEIGHT));

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    // Bug réel (iPhone) : le fichier enregistré depuis le visualiseur PDF
    // natif ("Ouvrir le PDF" → Partager → Enregistrer dans Fichiers) se
    // nommait "Unknown.pdf" — une URL blob: n'a pas de nom de fichier, et
    // c'est le titre interne du PDF que ce visualiseur utilise comme nom
    // suggéré à l'enregistrement.
    pdf.setProperties({ title: safeFileName(filenameHint).replace(/\.pdf$/i, "") });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    // Retour coach ("pas de marges") : chaque page était placée plein
    // cadre (x=0, y=0, largeur = toute la page). Marge uniforme de 12mm —
    // l'image garde son ratio d'origine (déjà celui d'une page A4, via
    // PAGE_HEIGHT), donc une simple mise à l'échelle depuis la largeur
    // utile suffit à conserver les proportions.
    const MARGIN_MM = 12;
    const usableW = pageW - 2 * MARGIN_MM;
    const marginScale = usableW / pageW;

    // Décalage de page SANS dépendre du défilement.
    // Historique : l'option `scrollY` de html2canvas est ignorée sur Safari
    // iOS réel (le clone interne ne défile pas comme demandé) → retour coach
    // 08/10 : "15 pages, toutes identiques" alors que Chromium simulé était
    // correct. On décale donc directement le contenu (body en position
    // relative, top = -y) avant chaque capture : html2canvas reclone le DOM à
    // chaque appel et capture toujours la fenêtre 0..PAGE_HEIGHT, qui contient
    // alors la bonne tranche, quel que soit le moteur.
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    body.style.position = "relative";

    try {
      for (let i = 0; i < pageCount; i++) {
        onProgress(`Page ${i + 1} / ${pageCount}…`);
        const y = i * PAGE_HEIGHT;
        const h = Math.min(PAGE_HEIGHT, totalHeight - y);
        body.style.top = `${-y}px`;
        // windowHeight = UNE page : jamais de canvas géant (limite iOS).
        const canvas = await html2canvas(doc.documentElement, {
          backgroundColor: "#ffffff",
          scale: RENDER_SCALE,
          useCORS: true,
          logging: false,
          windowWidth: DOC_WIDTH,
          windowHeight: PAGE_HEIGHT,
          width: DOC_WIDTH,
          height: h,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: ignore,
        });
        // Le clone html2canvas est souvent plus compact que la mesure live
        // (WebKit : ~25 % plus court) → pages finales entièrement blanches.
        // Dès qu'une tranche est vide, tout le reste l'est aussi : on arrête.
        if (i > 0 && isBlankCanvas(canvas)) {
          canvas.width = 0;
          canvas.height = 0;
          break;
        }
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        const imgH = (h / PAGE_HEIGHT) * pageH * marginScale;
        pdf.addImage(img, "JPEG", MARGIN_MM, MARGIN_MM, usableW, imgH);
        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      body.style.position = prevPosition;
      body.style.top = prevTop;
    }

    return pdf.output("blob");
  } finally {
    frame.remove();
  }
}

/**
 * Génère le PDF puis propose de l'enregistrer/partager. Rejette si la
 * génération échoue (l'appelant retombe alors sur l'aperçu imprimable).
 */
export async function exportPdfOnIOS(html: string, filenameHint?: string): Promise<void> {
  const overlay = makeOverlay();
  const status = el("p", "margin:0;font-size:13px;color:#555;", "Démarrage…");
  overlay.setBody([
    el("p", "margin:0;font-size:16px;font-weight:700;", "Préparation du PDF"),
    status,
  ]);

  let blob: Blob;
  try {
    blob = await renderPdf(html, filenameHint, (t) => (status.textContent = t));
  } catch (err) {
    overlay.root.remove();
    throw err;
  }

  const fileName = safeFileName(filenameHint);
  const file = new File([blob], fileName, { type: "application/pdf" });
  // Objet URL dérivé du File nommé (pas du Blob brut) : certains
  // visualiseurs utilisent le nom du File associé à l'URL blob: comme nom
  // suggéré à l'enregistrement.
  const url = URL.createObjectURL(file);
  const close = () => {
    overlay.root.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const canShare = typeof nav.share === "function" && !!nav.canShare?.({ files: [file] });

  const nodes: Node[] = [
    el("p", "margin:0;font-size:16px;font-weight:700;", "PDF prêt"),
    el("p", "margin:0;font-size:13px;color:#555;", `${fileName} · ${(blob.size / 1024).toFixed(0)} Ko`),
  ];

  if (canShare) {
    const shareBtn = el("button", BTN + "background:#111;color:#fff;", "Enregistrer / partager le PDF");
    shareBtn.onclick = async () => {
      try {
        await nav.share({ files: [file], title: filenameHint ?? "Rapport" });
        close();
      } catch {
        /* annulé par l'utilisateur : on laisse l'écran ouvert */
      }
    };
    nodes.push(shareBtn);
  }

  // Bug réel (iPhone) : un <a download target=_blank> vers un blob: ne fait
  // RIEN sur iOS (l'attribut download sur blob est ignoré, surtout dans une
  // iframe). On ouvre explicitement le PDF dans le visualiseur natif d'iOS
  // (qui a son propre bouton Partager → Enregistrer dans Fichiers).
  const note = el("p", "margin:0;font-size:12px;line-height:1.4;color:#7a4b00;display:none;");
  const openBtn = el("button", BTN + "background:" + (canShare ? "#fff;color:#111;" : "#111;color:#fff;"), "Ouvrir le PDF");
  openBtn.onclick = () => {
    let w: Window | null = null;
    try {
      w = window.open(url, "_blank");
    } catch {
      w = null;
    }
    if (w) return;
    const inFrame = (() => {
      try {
        return window.top !== window.self;
      } catch {
        return true;
      }
    })();
    if (!inFrame) {
      // Ouvre le PDF à la place de la page (bouton retour pour revenir).
      window.location.assign(url);
      return;
    }
    note.textContent =
      "Ouverture bloquée dans cet aperçu. Ouvre l'app depuis son adresse (tfcl.twoforcoaching.be) pour enregistrer le PDF.";
    note.style.display = "block";
  };
  nodes.push(openBtn, note);

  const closeBtn = el("button", BTN + "background:#fff;color:#111;", "Fermer");
  closeBtn.onclick = close;
  nodes.push(closeBtn);

  overlay.setBody(nodes);
}

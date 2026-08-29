/**
 * reportKit — Socle de design PARTAGÉ par les rapports imprimables TFCL
 * (Rapport de Performance, Rapport Profil Athlète, Rapport Staff…).
 *
 * Une seule charte : format A4 paginé, typographie Outfit, cartes blanches
 * sur papier off-white, KPI, tableaux hairline, pastilles de statut,
 * page de garde sombre dégradée.
 *
 * Les builders restent PURS : ils ne calculent rien, ils composent des pages.
 */

export const RK = {
  ink: "#14131A",
  inkSoft: "#2A2833",
  body: "#3A3844",
  muted: "#6E6B78",
  faint: "#97949F",
  line: "#E7E4DC",
  lineSoft: "#F0EEE8",
  paper: "#FAF9F5",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEDE7",
  primary: "#5555E0",
  primarySoft: "#F3F2FB",
  mint: "#177A53",
  mintSoft: "#E4F5EE",
  amber: "#9A6708",
  amberSoft: "#FBF1DC",
  danger: "#A83E62",
  dangerSoft: "#FBE6EC",
} as const;

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Autorise **gras** dans les textes éditoriaux, après échappement. */
export function rich(s: unknown): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function num(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(decimals).replace(".", ",");
}

/** Feuille de style commune à tous les rapports. */
export const REPORT_KIT_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; background:#EDEAE2; font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:${RK.ink}; }
  /* display:flex column (plutôt qu'un bloc + .foot en position:absolute) :
     Safari/WebKit a un bug d'impression documenté où un élément positionné en
     absolute à l'intérieur d'un conteneur dont la hauteur vient de min-height
     (pas d'une height fixe), combiné à page-break-after:always, fait sauter
     une page quasi-blanche après CHAQUE page — le pied de page absolu "fuit"
     hors de la zone imprimable calculée par Safari et déclenche une 2e page
     physique avant que le saut forcé n'en déclenche une 3e. Chrome ne
     reproduit pas ce bug (d'où le fait qu'il ait pu passer inaperçu en test).
     Avec flex column + .foot en margin-top:auto (flux normal, plus jamais en
     position:absolute), le pied de page est ancré en bas du flux du document
     plutôt que positionné par rapport à une hauteur potentiellement mal
     recalculée par le moteur d'impression — élimine la cause déclenchante
     plutôt que de compenser un symptôme dont l'ampleur exacte varie par
     moteur de rendu. */
  .page { width:210mm; min-height:297mm; padding:16mm 15mm 14mm; background:${RK.paper}; margin:0 auto 8px; position:relative; page-break-after:always; overflow:hidden; display:flex; flex-direction:column; }
  .page:last-child { page-break-after:auto; }
  .eyebrow { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:${RK.faint}; font-weight:600; }
  h1 { font-size:27px; line-height:1.12; margin:6px 0 4px; font-weight:600; letter-spacing:-.02em; }
  h2 { font-size:20px; margin:2px 0 8px; font-weight:600; letter-spacing:-.01em; }
  h3 { font-size:13px; margin:0 0 5px; font-weight:600; }
  p { font-size:11.6px; line-height:1.6; color:${RK.body}; margin:0 0 9px; }
  .lead { font-size:13px; line-height:1.55; color:${RK.inkSoft}; }
  .muted { color:${RK.muted}; }
  .rule { height:1px; background:${RK.line}; margin:10px 0 14px; }
  .card { background:${RK.surface}; border:1px solid ${RK.line}; border-radius:14px; padding:14px 16px; page-break-inside:avoid; break-inside:avoid; }
  .card + .card { margin-top:10px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .kpi { background:${RK.surface}; border:1px solid ${RK.line}; border-radius:12px; padding:10px 12px; }
  .kpi .k { font-size:9.6px; text-transform:uppercase; letter-spacing:.08em; color:${RK.faint}; font-weight:600; }
  .kpi .v { font-size:21px; font-weight:600; margin-top:3px; letter-spacing:-.02em; }
  .kpi .u { font-size:10px; color:${RK.muted}; margin-left:3px; font-weight:400; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  thead { display:table-header-group; }
  tr { page-break-inside:avoid; break-inside:avoid; }
  th { text-align:left; font-size:9.4px; text-transform:uppercase; letter-spacing:.08em; color:${RK.faint}; padding:6px 8px; border-bottom:1px solid ${RK.line}; font-weight:600; }
  td { padding:7px 8px; border-bottom:1px solid ${RK.lineSoft}; vertical-align:top; line-height:1.45; font-variant-numeric:tabular-nums; }
  tr:last-child td { border-bottom:none; }
  .pill { display:inline-block; font-size:9.4px; font-weight:600; padding:2px 8px; border-radius:999px; }
  .pill.ok { background:${RK.mintSoft}; color:${RK.mint}; }
  .pill.mid { background:${RK.amberSoft}; color:${RK.amber}; }
  .pill.bad { background:${RK.dangerSoft}; color:${RK.danger}; }
  .pill.na { background:${RK.surfaceAlt}; color:${RK.muted}; }
  .pill.info { background:${RK.primarySoft}; color:${RK.primary}; }
  .note { background:${RK.primarySoft}; border-left:3px solid ${RK.primary}; border-radius:0 8px 8px 0; padding:9px 12px; font-size:11px; line-height:1.55; color:${RK.inkSoft}; }
  .note.warn { background:#FDF4E3; border-left-color:#C8860D; }
  .note.bad { background:${RK.dangerSoft}; border-left-color:${RK.danger}; }
  .foot { margin-top:auto; padding-top:5px; display:flex; justify-content:space-between; font-size:9px; color:${RK.faint}; border-top:1px solid ${RK.line}; }
  .bar { height:6px; background:${RK.surfaceAlt}; border-radius:3px; overflow:hidden; margin-top:5px; }
  .bar > span { display:block; height:100%; background:${RK.primary}; border-radius:3px; }
  /* Page de garde */
  .cover { background:linear-gradient(150deg,#14131A 0%,#232049 52%,#3B349B 100%); color:#fff; display:flex; flex-direction:column; justify-content:space-between; }
  .cover h1 { font-size:40px; color:#fff; letter-spacing:-.03em; }
  .cover .eyebrow { color:#A9A4E6; }
  .cover p { color:#D7D4E8; }
  .cover .logo { height:74px; width:auto; object-fit:contain; }
  .idgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:16px; }
  .idcell { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); border-radius:10px; padding:9px 11px; }
  .idcell .k { font-size:9.2px; text-transform:uppercase; letter-spacing:.1em; color:#A9A4E6; font-weight:600; }
  .idcell .v { font-size:14px; font-weight:600; margin-top:2px; }
  .avoid { page-break-inside:avoid; break-inside:avoid; }
  @media print { body { background:#fff; } .page { margin:0; } }
`;

export interface ReportFootInfo {
  athleteName: string;
  generatedAt: string;
  page: number;
  totalPages: number;
  reportLabel?: string;
}

export function reportFoot(f: ReportFootInfo): string {
  const label = f.reportLabel ?? "TFC Lab · Potentiel Physiologique TFCL™";
  return `<div class="foot"><span>${esc(label)} — ${esc(f.athleteName)}</span><span>${esc(f.generatedAt)} · page ${f.page}/${f.totalPages}</span></div>`;
}

export function kpiCell(k: { label: string; value: string | number; unit?: string }): string {
  return `<div class="kpi"><div class="k">${esc(k.label)}</div><div class="v">${esc(k.value)}${k.unit ? `<span class="u">${esc(k.unit)}</span>` : ""}</div></div>`;
}

export interface CoverOptions {
  eyebrow: string;
  title: string;
  intro: string;
  identity: Array<{ label: string; value: string }>;
  highlights?: Array<{ label: string; value: string; unit?: string }>;
  footnote: string;
  logoBase64?: string | null;
}

export function coverPage(o: CoverOptions): string {
  return `
  <section class="page cover">
    <div>
      ${o.logoBase64 ? `<img class="logo" src="${o.logoBase64}" alt="TFC Lab" />` : ""}
      <div class="eyebrow" style="margin-top:26px">${esc(o.eyebrow)}</div>
      <h1>${esc(o.title)}</h1>
      <p style="max-width:120mm;font-size:13.5px;line-height:1.6">${esc(o.intro)}</p>
      <div class="idgrid">
        ${o.identity.map((i) => `<div class="idcell"><div class="k">${esc(i.label)}</div><div class="v">${esc(i.value)}</div></div>`).join("")}
      </div>
    </div>
    <div>
      ${
        o.highlights?.length
          ? `<div class="idgrid">${o.highlights
              .slice(0, 3)
              .map(
                (k) =>
                  `<div class="idcell"><div class="k">${esc(k.label)}</div><div class="v">${esc(k.value)}${k.unit ? ` <span style="font-size:10px;color:#A9A4E6">${esc(k.unit)}</span>` : ""}</div></div>`,
              )
              .join("")}</div>`
          : ""
      }
      <p style="margin-top:22px;font-size:10.4px;color:#A9A4E6">${esc(o.footnote)}</p>
    </div>
  </section>`;
}

/** Enveloppe HTML complète (police Outfit + CSS partagé + CSS spécifique). */
export function reportDocument(opts: {
  title: string;
  body: string;
  extraCSS?: string;
}): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${REPORT_KIT_CSS}${opts.extraCSS ?? ""}</style></head>
<body>${opts.body}</body></html>`;
}

/** Lien Google Fonts (Outfit) à injecter dans un <head> existant. */
export const REPORT_KIT_FONT_LINK = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />`;

/**
 * Peau Bevel pour les rapports HISTORIQUES en flux continu (Rapport Staff),
 * qui ne sont pas paginés en sections `.page`.
 *
 * Elle remappe les classes historiques (.card, .tag, .badge, .alert, .cover…)
 * sur la charte du reportKit : typographie Outfit, papier off-white,
 * cartes hairline, pastilles pastel, tableaux sans quadrillage lourd.
 * À injecter APRÈS la feuille de style d'origine pour la surcharger.
 */
export const REPORT_KIT_SKIN_CSS = `
<style id="tfcl-report-kit-skin">
  :root {
    --fg:${RK.ink}; --muted:${RK.muted}; --border:${RK.line}; --bg:${RK.paper};
    --soft:${RK.surfaceAlt}; --success:${RK.mint}; --warning:${RK.amber};
    --error:${RK.danger}; --primary:${RK.primary};
  }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background:${RK.paper} !important; }
  body {
    font-family:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;
    color:${RK.ink}; font-size:12px; line-height:1.55; padding:18mm 15mm;
    max-width:230mm; margin:0 auto;
  }
  h1,h2,h3,h4 { font-family:"Outfit",-apple-system,sans-serif !important; letter-spacing:-.02em; }
  h1 { font-size:30px; font-weight:600; }
  h2 {
    font-size:20px; font-weight:600; color:${RK.ink};
    border-bottom:1px solid ${RK.line}; padding-bottom:6px; margin:26px 0 12px;
  }
  h3 { font-size:13.5px; font-weight:600; color:${RK.ink}; }
  h4 { font-size:12px; font-weight:600; color:${RK.muted}; text-transform:uppercase; letter-spacing:.06em; }
  p { font-size:11.6px; line-height:1.6; color:${RK.body}; }
  .muted { color:${RK.muted}; }
  td, th, .big, .medium, .kv .v, .kpi .v { font-variant-numeric: tabular-nums; }

  /* Cartes */
  .card { border:1px solid ${RK.line} !important; border-radius:14px !important; background:${RK.surface} !important; box-shadow:none !important; }
  .cardHighlight { border-color:${RK.primary}33 !important; background:${RK.primarySoft} !important; }
  .cardSuccess { border-color:${RK.mint}33 !important; background:${RK.mintSoft} !important; }
  .cardWarning { border-color:${RK.amber}33 !important; background:${RK.amberSoft} !important; }
  .cardError { border-color:${RK.danger}33 !important; background:${RK.dangerSoft} !important; }
  .toc { background:${RK.surface}; border-color:${RK.line}; border-radius:14px; }
  .tocRow { border-bottom:1px solid ${RK.lineSoft}; }
  .tocRow a { color:${RK.ink}; }

  /* Pastilles */
  .tag { border-radius:999px; border:1px solid ${RK.line}; background:${RK.surfaceAlt}; color:${RK.inkSoft}; font-size:10.5px; font-weight:500; }
  .tagPrimary { background:${RK.primarySoft}; border-color:${RK.primary}33; color:${RK.primary}; }
  .badge { border-radius:999px; padding:2px 9px; font-size:9.4px; letter-spacing:.02em; text-transform:none; font-weight:600; }
  .badgeSuccess { background:${RK.mintSoft}; color:${RK.mint}; }
  .badgeWarning { background:${RK.amberSoft}; color:${RK.amber}; }
  .badgeError { background:${RK.dangerSoft}; color:${RK.danger}; }
  .badgePrimary { background:${RK.primarySoft}; color:${RK.primary}; }
  .success { color:${RK.mint}; } .warning { color:${RK.amber}; } .error { color:${RK.danger}; }

  /* Encadrés */
  .alert { border-radius:0 10px 10px 0; font-size:11px; line-height:1.55; padding:10px 13px; }
  .alertInfo { background:${RK.primarySoft}; border-left:3px solid ${RK.primary}; }
  .alertWarning { background:${RK.amberSoft}; border-left:3px solid ${RK.amber}; }
  .alertError { background:${RK.dangerSoft}; border-left:3px solid ${RK.danger}; }
  .alertSuccess { background:${RK.mintSoft}; border-left:3px solid ${RK.mint}; }

  /* Tableaux hairline */
  table { border-collapse:collapse; font-size:11px; }
  th {
    background:transparent !important; border:none !important;
    border-bottom:1px solid ${RK.line} !important;
    font-size:9.4px; font-weight:600; text-transform:uppercase;
    letter-spacing:.08em; color:${RK.faint} !important; padding:6px 8px !important;
  }
  td { border:none !important; border-bottom:1px solid ${RK.lineSoft} !important; padding:7px 8px !important; }

  /* Jauges */
  .progressBar { background:${RK.surfaceAlt}; border-radius:999px; height:7px; }
  .progressFill { border-radius:999px; }

  /* Page de garde : bandeau dégradé Bevel */
  .coverBanner {
    background:linear-gradient(150deg,#14131A 0%,#232049 52%,#3B349B 100%) !important;
    border-radius:16px !important; padding:30px 28px !important;
  }
  .coverBanner::before { display:none !important; }
  .coverLogo { height:84px !important; background:transparent !important; padding:0 !important; filter:none !important; }
  .coverBrandName { font-weight:600; font-size:24px; text-shadow:none; letter-spacing:-.02em; }
  .coverBrandTagline { color:#A9A4E6; text-transform:uppercase; letter-spacing:.14em; font-size:10px; }
  .coverBannerBadge { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); font-weight:500; font-size:11px; }
  .coverTitle { font-size:38px; font-weight:600; letter-spacing:-.03em; }
  .watermark { display:none !important; }

  .footer { border-top:1px solid ${RK.line}; color:${RK.faint}; font-size:9.5px; }
  .noPrint { background:${RK.primarySoft}; border-radius:12px; }

  @media print {
    @page { size:A4; margin:12mm; }
    html, body { background:#FFFFFF !important; }
    body { padding:0; max-width:none; }
    .card { background:#FFFFFF !important; }
  }
</style>`;

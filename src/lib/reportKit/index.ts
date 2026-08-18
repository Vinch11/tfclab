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
  .page { width:210mm; min-height:297mm; padding:16mm 15mm 14mm; background:${RK.paper}; margin:0 auto 8px; position:relative; page-break-after:always; overflow:hidden; }
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
  .foot { position:absolute; left:15mm; right:15mm; bottom:8mm; display:flex; justify-content:space-between; font-size:9px; color:${RK.faint}; border-top:1px solid ${RK.line}; padding-top:5px; }
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

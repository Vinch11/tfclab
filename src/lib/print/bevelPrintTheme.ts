/**
 * bevelPrintTheme — Socle de design partagé par TOUS les rapports exportés
 * (mini-rapport, Essentiels, audit scientifique, protocoles de test,
 * race readiness, simulation de course, plan IA, bibliothèque de séances).
 *
 * Objectif : reprendre l'esthétique Bevel de l'application (typographie Outfit,
 * palette périwinkle / mint / ambre, cartes douces, grilles pointillées)
 * tout en restant lisible à l'impression papier :
 *  - fond papier blanc pur (pas l'off-white écran, qui grise le rendu)
 *  - dégradés de coin très atténués + `print-color-adjust: exact`
 *  - rayons de carte réduits (14px au lieu de 28px, trop rond sur A4)
 *  - couleurs pastel assombries ~15 % pour rester contrastées sur papier
 *
 * Ce module n'est PAS un thème Tailwind : les rapports sont des documents HTML
 * autonomes ouverts dans un nouvel onglet, ils n'ont donc pas accès à index.css.
 */

/** Palette Bevel adaptée impression (hex, déjà assombrie pour le papier). */
export const BEVEL_PRINT_COLORS = {
  ink: "#14131A",
  inkSoft: "#2B2933",
  muted: "#5C5966",
  faint: "#97949F",
  line: "#E7E4DC",
  surface: "#FAF9F5",
  surfaceAlt: "#F2F0E9",
  paper: "#FFFFFF",

  primary: "#5555E0", // périwinkle
  primarySoft: "#EDEDFC",
  mint: "#1F9D6B",
  mintSoft: "#E4F5EE",
  amber: "#C8860D",
  amberSoft: "#FBF0DA",
  danger: "#D0433A",
  dangerSoft: "#FAE6E4",
  sky: "#1C8FC4",
  skySoft: "#E2F1F9",
  violet: "#7A56C2",
  violetSoft: "#EFE9FA",
} as const;

/** Séquence de couleurs pour les séries de graphiques (SVG des rapports). */
export const BEVEL_PRINT_SERIES = [
  BEVEL_PRINT_COLORS.primary,
  BEVEL_PRINT_COLORS.mint,
  BEVEL_PRINT_COLORS.amber,
  BEVEL_PRINT_COLORS.sky,
  BEVEL_PRINT_COLORS.violet,
  BEVEL_PRINT_COLORS.danger,
] as const;

export function bevelPrintSeriesColor(index: number): string {
  return BEVEL_PRINT_SERIES[index % BEVEL_PRINT_SERIES.length];
}

/**
 * Feuille de style globale injectée dans le <head> de chaque rapport.
 * Volontairement placée en dernier pour surcharger les styles historiques,
 * sans toucher aux styles inline propres à chaque bloc.
 */
export const BEVEL_PRINT_CSS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style id="tfcl-bevel-print">
  :root {
    --bp-ink: ${BEVEL_PRINT_COLORS.ink};
    --bp-ink-soft: ${BEVEL_PRINT_COLORS.inkSoft};
    --bp-muted: ${BEVEL_PRINT_COLORS.muted};
    --bp-faint: ${BEVEL_PRINT_COLORS.faint};
    --bp-line: ${BEVEL_PRINT_COLORS.line};
    --bp-surface: ${BEVEL_PRINT_COLORS.surface};
    --bp-surface-alt: ${BEVEL_PRINT_COLORS.surfaceAlt};
    --bp-primary: ${BEVEL_PRINT_COLORS.primary};
    --bp-primary-soft: ${BEVEL_PRINT_COLORS.primarySoft};
    --bp-mint: ${BEVEL_PRINT_COLORS.mint};
    --bp-amber: ${BEVEL_PRINT_COLORS.amber};
    --bp-danger: ${BEVEL_PRINT_COLORS.danger};
    --bp-radius: 14px;
  }

  /* Rendu fidèle des fonds/dégradés à l'impression */
  html, body, * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ── Typographie Bevel (Outfit) ─────────────────────────────────────── */
  body, table, input, button, select, textarea {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }
  body {
    background: #FFFFFF !important;
    color: var(--bp-ink) !important;
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
  }
  h1, h2, h3, h4, h5 {
    font-family: 'Outfit', -apple-system, sans-serif !important;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--bp-ink);
  }
  h1 { letter-spacing: -0.03em; }
  /* Chiffres alignés, comme dans l'app */
  td, th, .bp-num, [class*="metric"], [class*="value"] {
    font-variant-numeric: tabular-nums;
  }

  /* ── Cartes Bevel : rayon doux, filet clair, dégradé de coin discret ── */
  .card, .pillar, .section, .block, section[class*="card"], div[class*="card"] {
    border-radius: var(--bp-radius) !important;
  }
  .bp-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid var(--bp-line);
    border-radius: var(--bp-radius);
    padding: 16px 18px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    background-image: radial-gradient(120% 90% at 100% 0%, rgba(85,85,224,0.055) 0%, rgba(85,85,224,0) 58%);
  }
  .bp-card--accent {
    background-image: radial-gradient(120% 90% at 100% 0%, rgba(31,157,107,0.06) 0%, rgba(31,157,107,0) 58%);
  }

  /* ── En-tête de rapport ─────────────────────────────────────────────── */
  .bp-header {
    position: relative;
    border-radius: var(--bp-radius);
    padding: 22px 24px;
    margin-bottom: 18px;
    color: #FFFFFF;
    background: linear-gradient(135deg, #5555E0 0%, #6C55D8 55%, #7A56C2 100%);
  }
  .bp-header h1 { color: #FFFFFF; margin: 0 0 4px 0; }
  .bp-header .subtitle, .bp-header p { color: rgba(255,255,255,0.82); }

  /* ── Badges / pastilles de statut ───────────────────────────────────── */
  .bp-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
  }
  .bp-badge--ok { background: ${BEVEL_PRINT_COLORS.mintSoft}; color: ${BEVEL_PRINT_COLORS.mint}; border-color: ${BEVEL_PRINT_COLORS.mint}33; }
  .bp-badge--warn { background: ${BEVEL_PRINT_COLORS.amberSoft}; color: ${BEVEL_PRINT_COLORS.amber}; border-color: ${BEVEL_PRINT_COLORS.amber}33; }
  .bp-badge--bad { background: ${BEVEL_PRINT_COLORS.dangerSoft}; color: ${BEVEL_PRINT_COLORS.danger}; border-color: ${BEVEL_PRINT_COLORS.danger}33; }
  .bp-badge--info { background: ${BEVEL_PRINT_COLORS.primarySoft}; color: ${BEVEL_PRINT_COLORS.primary}; border-color: ${BEVEL_PRINT_COLORS.primary}33; }
  .bp-badge--muted { background: var(--bp-surface-alt); color: var(--bp-muted); border-color: var(--bp-line); }

  /* ── Tableaux : filets hairline, en-tête discret ────────────────────── */
  table { border-collapse: collapse; }
  table th {
    font-weight: 600;
    color: var(--bp-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 9.5px;
    border-bottom: 1px solid var(--bp-line);
  }
  table td { border-color: var(--bp-line) !important; }
  tbody tr:nth-child(even) td { background: rgba(242,240,233,0.45); }

  /* ── Graphiques SVG : grilles pointillées, courbes arrondies ────────── */
  svg .grid line, svg line.grid, svg .bp-grid {
    stroke: var(--bp-line);
    stroke-dasharray: 2 6;
    stroke-width: 0.6;
  }
  svg .axis line, svg .axis path, svg .domain { stroke: var(--bp-line); }
  svg text { font-family: 'Outfit', sans-serif; fill: var(--bp-muted); }
  svg polyline, svg path.line, svg .bp-series {
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Barres de progression / jauges */
  .bp-gauge-track { fill: var(--bp-surface-alt); }
  .bp-gauge-band { fill: ${BEVEL_PRINT_COLORS.mintSoft}; }
  .bp-gauge-pointer { stroke: var(--bp-ink); }

  hr { border: none; border-top: 1px solid var(--bp-line); }
  a { color: var(--bp-primary); }
  code, pre { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

  @media print {
    body { background: #FFFFFF !important; }
    .bp-card, .card, .pillar { box-shadow: none !important; }
  }
</style>
`;

/**
 * Injecte le socle Bevel dans un document HTML complet.
 * Idempotent : ne fait rien si le socle est déjà présent.
 */
export function applyBevelPrintTheme(html: string): string {
  if (html.includes('id="tfcl-bevel-print"')) return html;
  const idx = html.toLowerCase().lastIndexOf("</head>");
  if (idx === -1) return BEVEL_PRINT_CSS + html;
  return html.slice(0, idx) + BEVEL_PRINT_CSS + html.slice(idx);
}

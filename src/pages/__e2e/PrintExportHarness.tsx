/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HARNESS DEV-ONLY — openPrintableHTML() isolé pour tests Playwright
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pourquoi un harness plutôt que tester l'export réel depuis AIPlanViewer :
 * générer un vrai plan nécessite une session Supabase + un appel Gemini —
 * hors de portée d'un test navigateur automatisé, et explicitement interdit
 * (consigne coach : "Aucun appel Gemini"). `openPrintableHTML()` elle-même ne
 * dépend d'aucune donnée athlète ni d'aucune session — seulement du HTML
 * qu'on lui passe. Le monter seul ici, avec un document HTML synthétique
 * représentatif (34 semaines, 7 séances/semaine, avec fiche complète par
 * séance), permet un test RÉEL du clic → ouverture de `/print-preview` →
 * impression native, sans dépendre de la génération de plan.
 *
 * Route exposée UNIQUEMENT en dev (`import.meta.env.DEV` dans App.tsx) —
 * jamais présente dans un build de production.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { openPrintableHTML } from "@/lib/openPrintableHTML";

/**
 * Document HTML synthétique représentatif d'un plan de 34 semaines, avec la
 * même structure CSS d'impression que `src/lib/aiPlanPDFExport.ts`
 * (pagination, fiche complète par séance). Les marqueurs textuels
 * permettent au test Playwright de vérifier précisément la présence de la
 * première semaine, de la dernière semaine, et de la dernière séance dans
 * le PDF généré par le moteur d'impression réel du navigateur.
 */
function buildSyntheticPlanHtml({ weeks = 34, sessionsPerWeek = 7 }: { weeks?: number; sessionsPerWeek?: number } = {}) {
  const weekBlocks: string[] = [];
  for (let w = 1; w <= weeks; w++) {
    const rows: string[] = [];
    for (let s = 1; s <= sessionsPerWeek; s++) {
      const isLast = w === weeks && s === sessionsPerWeek;
      const label = isLast ? "TFC_DERNIERE_SEANCE Jour J" : `TFC_SEANCE_S${w}J${s}`;
      rows.push(`
      <tr class="session-row" style="background:${s % 2 === 0 ? "#ffffff" : "#FAF9F5"};">
        <td style="padding:6px 10px;border:1px solid #DAD6CC;">Jour ${s}</td>
        <td style="padding:6px 10px;border:1px solid #DAD6CC;">Sport</td>
        <td style="padding:6px 10px;border:1px solid #DAD6CC;">${label}</td>
        <td style="padding:6px 10px;border:1px solid #DAD6CC;font-size:11px;">Détails de la séance semaine ${w} jour ${s} — description physiologique réaliste assez longue pour occuper plusieurs lignes dans la cellule du tableau.</td>
      </tr>
      <tr class="fiche-row"><td colspan="4" style="padding:6px 10px;border:1px solid #ddd;background:#FAF9F5;"><div class="fiche-box">Fiche complète bibliothèque — structure détaillée pour la séance S${w}J${s}.</div></td></tr>
      `);
    }
    weekBlocks.push(`
      <div class="week-block" style="margin-bottom:28px;">
        <h3 style="margin:0 0 6px 0;font-size:15px;color:#14131A;background:#EDEDFC;padding:8px 12px;border-radius:6px;border-left:4px solid #5555E0;">
          ${w === 1 ? "TFC_SEMAINE_1 — " : ""}${w === weeks ? "TFC_SEMAINE_FINALE — " : ""}Semaine ${w} — Thème semaine ${w}
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;border:1px solid #DAD6CC;">
          <thead>
            <tr style="background:#F2F0E9;">
              <th style="padding:6px 10px;border:1px solid #DAD6CC;">Jour</th>
              <th style="padding:6px 10px;border:1px solid #DAD6CC;">Sport</th>
              <th style="padding:6px 10px;border:1px solid #DAD6CC;">Séance</th>
              <th style="padding:6px 10px;border:1px solid #DAD6CC;">Détails</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `);
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Plan de test ${weeks} semaines</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #222; background: #fff; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    @media print {
      .no-print { display: none !important; }
      @page { size: A4 landscape; margin: 8mm 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      body { padding: 0 !important; max-width: none !important; font-size: 11px; line-height: 1.35; }
      .week-block { margin-bottom: 14px !important; }
      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      .fiche-box { font-size: 9.5px !important; line-height: 1.3 !important; padding: 4px 6px !important; }
      td, th { font-size: 10px !important; padding: 4px 6px !important; vertical-align: top; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#e3f2fd;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;">
    📄 Utilisez Ctrl+P → Imprimer en PDF pour exporter ce plan.
  </div>
  <h1>Plan de test ${weeks} semaines</h1>
  <p>${weeks}/${weeks} semaines</p>
  ${weekBlocks.join("")}
  <footer style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center;">
    Plan généré par TFCL™ Plan Generator (test)
  </footer>
</body>
</html>`;
}

export default function PrintExportHarness() {
  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <button
        data-testid="open-print-preview"
        onClick={() => {
          const html = buildSyntheticPlanHtml({ weeks: 34, sessionsPerWeek: 7 });
          openPrintableHTML(html, { filenameHint: "Plan test 34 semaines", includeInstructions: true });
        }}
      >
        Ouvrir la vue d'impression (plan 34 semaines)
      </button>
      <button
        data-testid="open-print-preview-short"
        onClick={() => {
          const html = buildSyntheticPlanHtml({ weeks: 2, sessionsPerWeek: 3 });
          openPrintableHTML(html, { filenameHint: "Plan test court", includeInstructions: true });
        }}
      >
        Ouvrir la vue d'impression (plan court)
      </button>
    </div>
  );
}

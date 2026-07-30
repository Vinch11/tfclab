import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import {
import { applyBevelPrintTheme } from "@/lib/print/bevelPrintTheme";
  WAHOO_WORKOUTS,
  getCategoryLabel,
  getRiskLabel,
  getAxisLabel,
  WahooCategory,
} from "@/data/wahooMapping";

const CATEGORY_ORDER: WahooCategory[] = [
  "RECOVERY",
  "WARMUP",
  "Z2_ENDURANCE",
  "Z2_LONG",
  "TEMPO_DURABILITY",
  "FORCE_ENDURANCE",
  "THRESHOLD_MLSS",
  "VO2_MAP",
  "ANAEROBIC_AC",
  "NEUROMUSCULAR_NM",
  "UNKNOWN",
];

export function WahooPrintableList() {
  const printRef = useRef<HTMLDivElement>(null);

  const workoutsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    const workouts = WAHOO_WORKOUTS.filter((w) => w.category === category);
    if (workouts.length > 0) {
      acc[category] = workouts.sort((a, b) =>
        a.wahoo_name.localeCompare(b.wahoo_name)
      );
    }
    return acc;
  }, {} as Record<WahooCategory, typeof WAHOO_WORKOUTS>);

  const getStyles = () => `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      font-size: 10px; 
      line-height: 1.4;
      padding: 20px;
      color: #14131A;
      background: white;
    }
    h1 { font-size: 18px; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { font-size: 13px; background: #f0f0f0; padding: 6px 10px; margin: 15px 0 8px 0; border-left: 4px solid #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #333; color: white; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 9px; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
    .sport { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: 600; }
    .bike { background: #EDEDFC; color: #3C3CB8; }
    .run { background: #E4F5EE; color: #157A52; }
    .risk-0 { color: #1F9D6B; }
    .risk-1 { color: #C8860D; }
    .risk-2 { color: #D4711C; }
    .risk-3 { color: #D0433A; }
    .effect { font-size: 8px; }
    .effect-down { color: #1F9D6B; }
    .effect-up { color: #D0433A; }
    .effect-neutral { color: #6E6B78; }
    .annotation { font-style: italic; color: #555; font-size: 8px; max-width: 250px; }
    .duration { white-space: nowrap; }
    .total { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
    @media print {
      body { padding: 10px; }
      h2 { break-after: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
    }
  `;

  const getHtmlContent = () => {
    if (!printRef.current) return "";
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bibliothèque Wahoo SYSTM - Two For Coaching</title>
          <style>${getStyles()}</style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(applyBevelPrintTheme(getHtmlContent()));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownloadPDF = () => {
    // Open in new window with print dialog - user can save as PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlWithPdfInstructions = getHtmlContent().replace(
      "</body>",
      `<p style="text-align: center; margin-top: 30px; padding: 15px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; font-size: 12px;">
        <strong>💡 Pour sauvegarder en PDF :</strong> Utilisez Ctrl+P (ou Cmd+P sur Mac) puis sélectionnez "Enregistrer au format PDF" comme destination.
      </p></body>`
    );

    printWindow.document.write(applyBevelPrintTheme(htmlWithPdfInstructions));
    printWindow.document.close();
    printWindow.focus();
  };

  const getEffectClass = (effect: "down" | "up" | "neutral") => {
    if (effect === "down") return "effect-down";
    if (effect === "up") return "effect-up";
    return "effect-neutral";
  };

  const getEffectSymbol = (effect: "down" | "up" | "neutral") => {
    if (effect === "down") return "↓";
    if (effect === "up") return "↑";
    return "–";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Liste imprimable</h2>
          <p className="text-sm text-muted-foreground">
            {WAHOO_WORKOUTS.length} séances Wahoo SYSTM
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Sauvegarder PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* Hidden content for print/PDF */}
      <div ref={printRef} className="hidden">
        <h1>Bibliothèque Wahoo SYSTM – Two For Coaching</h1>

        {CATEGORY_ORDER.map((category) => {
          const workouts = workoutsByCategory[category];
          if (!workouts || workouts.length === 0) return null;

          return (
            <div key={category}>
              <h2>
                {getCategoryLabel(category)} ({workouts.length})
              </h2>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "18%" }}>Nom</th>
                    <th style={{ width: "6%" }}>Sport</th>
                    <th style={{ width: "8%" }}>Durée</th>
                    <th style={{ width: "12%" }}>Axe principal</th>
                    <th style={{ width: "6%" }}>VLamax</th>
                    <th style={{ width: "6%" }}>TTE</th>
                    <th style={{ width: "8%" }}>Risque</th>
                    <th style={{ width: "36%" }}>Annotation staff</th>
                  </tr>
                </thead>
                <tbody>
                  {workouts.map((w) => (
                    <tr key={w.wahoo_id}>
                      <td>
                        <strong>{w.wahoo_name}</strong>
                      </td>
                      <td>
                        <span className={`sport ${w.sport}`}>
                          {w.sport === "bike" ? "Vélo" : "Course"}
                        </span>
                      </td>
                      <td className="duration">
                        {w.duration_min_range[0]}-{w.duration_min_range[1]} min
                      </td>
                      <td>{getAxisLabel(w.primary_axis)}</td>
                      <td>
                        <span className={`effect ${getEffectClass(w.vlamax_effect)}`}>
                          {getEffectSymbol(w.vlamax_effect)}
                        </span>
                      </td>
                      <td>
                        <span className={`effect ${getEffectClass(w.tte_effect)}`}>
                          {getEffectSymbol(w.tte_effect)}
                        </span>
                      </td>
                      <td className={`risk-${w.risk_level}`}>
                        {getRiskLabel(w.risk_level)}
                      </td>
                      <td className="annotation">{w.staff_annotation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <p className="total">
          Total : {WAHOO_WORKOUTS.length} séances • Généré le{" "}
          {new Date().toLocaleDateString("fr-FR")}
        </p>
      </div>

      {/* On-screen preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-3 border-b">
          <h3 className="font-medium text-sm">Aperçu du document</h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto p-4 bg-background">
          {CATEGORY_ORDER.map((category) => {
            const workouts = workoutsByCategory[category];
            if (!workouts || workouts.length === 0) return null;

            return (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold mb-2 bg-muted p-2 rounded">
                  {getCategoryLabel(category)} ({workouts.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Nom</th>
                        <th className="text-left p-2 font-medium">Sport</th>
                        <th className="text-left p-2 font-medium">Durée</th>
                        <th className="text-left p-2 font-medium">Axe principal</th>
                        <th className="text-left p-2 font-medium">VLamax</th>
                        <th className="text-left p-2 font-medium">TTE</th>
                        <th className="text-left p-2 font-medium">Risque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workouts.map((w) => (
                        <tr key={w.wahoo_id} className="border-b border-border/50">
                          <td className="p-2 font-medium">{w.wahoo_name}</td>
                          <td className="p-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                w.sport === "bike"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              }`}
                            >
                              {w.sport === "bike" ? "Vélo" : "Course"}
                            </span>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {w.duration_min_range[0]}-{w.duration_min_range[1]} min
                          </td>
                          <td className="p-2">{getAxisLabel(w.primary_axis)}</td>
                          <td className="p-2">
                            <span
                              className={
                                w.vlamax_effect === "down"
                                  ? "text-green-600"
                                  : w.vlamax_effect === "up"
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              }
                            >
                              {getEffectSymbol(w.vlamax_effect)}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                w.tte_effect === "up"
                                  ? "text-green-600"
                                  : w.tte_effect === "down"
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              }
                            >
                              {getEffectSymbol(w.tte_effect)}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                w.risk_level === 0
                                  ? "text-green-600"
                                  : w.risk_level === 1
                                    ? "text-yellow-600"
                                    : w.risk_level === 2
                                      ? "text-orange-600"
                                      : "text-red-600"
                              }
                            >
                              {getRiskLabel(w.risk_level)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

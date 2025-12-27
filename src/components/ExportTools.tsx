// =============================================
// OUTILS EXPORT CSV / PDF
// =============================================

import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { calculerScoreGlobal, genererBadges } from "@/lib/iaRecommandations";
import { toast } from "sonner";

interface ExportToolsProps {
  athlete: Athlete;
}

export function ExportTools({ athlete }: ExportToolsProps) {
  const handleExportCSV = () => {
    const snapshot = getDernierSnapshot(athlete);
    const vlamax = snapshot 
      ? calculVLamaxAvecConfiance(snapshot, athlete.objectif).vlamax 
      : 0;
    const score = calculerScoreGlobal(athlete);
    const badges = genererBadges(athlete).filter(b => b.obtenu);

    let csv = "Champ,Valeur\n";
    csv += `Nom,${athlete.nom}\n`;
    csv += `Objectif,${athlete.objectif}\n`;
    csv += `Score Global,${score}\n`;
    csv += `VLamax,${vlamax.toFixed(2)}\n`;
    csv += `Badges,"${badges.map(b => b.nom).join(", ")}"\n`;
    
    if (snapshot) {
      csv += `\nDernier Snapshot\n`;
      csv += `Date,${snapshot.date}\n`;
      csv += `Sport,${snapshot.sport}\n`;
      csv += `Poids,${snapshot.poids}\n`;
      if (snapshot.ftp) csv += `FTP,${snapshot.ftp}\n`;
      if (snapshot.vma) csv += `VMA,${snapshot.vma}\n`;
      if (snapshot.vo2max) csv += `VO2max,${snapshot.vo2max}\n`;
    }

    // Historique
    if (athlete.historique.length > 0) {
      csv += `\nHistorique Snapshots\n`;
      csv += `Date,Sport,Poids,FTP,VMA,VO2max\n`;
      athlete.historique.forEach(snap => {
        csv += `${snap.date},${snap.sport},${snap.poids},${snap.ftp || ""},${snap.vma || ""},${snap.vo2max || ""}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${athlete.nom.replace(/\s+/g, "_")}_VLamax.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Export CSV terminé", {
      description: `Fichier ${athlete.nom}_VLamax.csv téléchargé`
    });
  };

  const handleExportPDF = () => {
    const snapshot = getDernierSnapshot(athlete);
    const vlamax = snapshot 
      ? calculVLamaxAvecConfiance(snapshot, athlete.objectif).vlamax 
      : 0;
    const score = calculerScoreGlobal(athlete);
    const badges = genererBadges(athlete).filter(b => b.obtenu);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport ${athlete.nom} - Vince's Lab</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #1a1a1a;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e5e5;
          }
          .header h1 {
            margin: 0 0 8px 0;
            color: #2563eb;
          }
          .header p {
            margin: 0;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e5e5;
          }
          .metric-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .metric-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
          }
          .metric-card .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .badges {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .badge {
            background: #e5e5e5;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
          }
          .bar-container {
            margin: 10px 0;
          }
          .bar-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 14px;
          }
          .bar {
            height: 12px;
            background: #e5e5e5;
            border-radius: 6px;
            overflow: hidden;
          }
          .bar-fill {
            height: 100%;
            background: #2563eb;
            border-radius: 6px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e5e5;
          }
          th {
            background: #f8f9fa;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Vince's Lab - Two For Coaching</h1>
          <p>Rapport de performance pour ${athlete.nom}</p>
          <p style="font-size: 12px; margin-top: 8px;">Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
        </div>

        <div class="section">
          <h2>Informations Athlète</h2>
          <table>
            <tr><th>Nom</th><td>${athlete.nom}</td></tr>
            <tr><th>Objectif</th><td>${athlete.objectif}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Métriques Clés</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="value">${score}</div>
              <div class="label">Score Global</div>
            </div>
            <div class="metric-card">
              <div class="value">${vlamax.toFixed(2)}</div>
              <div class="label">VLamax</div>
            </div>
            <div class="metric-card">
              <div class="value">${snapshot?.poids || "-"}</div>
              <div class="label">Poids (kg)</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Performance</h2>
          <div class="bar-container">
            <div class="bar-label">
              <span>Score Global</span>
              <span>${score}/100</span>
            </div>
            <div class="bar">
              <div class="bar-fill" style="width: ${score}%"></div>
            </div>
          </div>
          <div class="bar-container">
            <div class="bar-label">
              <span>VLamax</span>
              <span>${vlamax.toFixed(2)}</span>
            </div>
            <div class="bar">
              <div class="bar-fill" style="width: ${Math.min(vlamax * 100, 100)}%"></div>
            </div>
          </div>
        </div>

        ${badges.length > 0 ? `
        <div class="section">
          <h2>Badges Obtenus</h2>
          <div class="badges">
            ${badges.map(b => `<span class="badge">${b.icon} ${b.nom}</span>`).join("")}
          </div>
        </div>
        ` : ""}

        ${athlete.historique.length > 0 ? `
        <div class="section">
          <h2>Historique</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sport</th>
                <th>Poids</th>
                <th>FTP/VMA</th>
              </tr>
            </thead>
            <tbody>
              ${athlete.historique.slice(-5).map(snap => `
                <tr>
                  <td>${snap.date}</td>
                  <td style="text-transform: capitalize">${snap.sport}</td>
                  <td>${snap.poids} kg</td>
                  <td>${snap.ftp ? snap.ftp + "W" : snap.vma ? snap.vma + " km/h" : "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ` : ""}

        <div class="footer">
          <p>Vince's Lab by Two For Coaching</p>
          <p>Basé sur la méthodologie Dan Lorang</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    toast.success("Rapport PDF généré", {
      description: "La fenêtre d'impression s'ouvre..."
    });
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportCSV}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportPDF}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </Button>
    </div>
  );
}

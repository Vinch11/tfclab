/**
 * AmbitionTargetsTable - Tableau récapitulatif des exigences par objectif ET niveau d'ambition
 * Pour l'Academy
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Printer, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { AMBITION_TARGETS, normalizeObjective } from "@/lib/physiologicalTargets";
import { 
  AmbitionLevel, 
  AMBITION_LEVELS_ORDERED, 
  AMBITION_DEFINITIONS,
  getAmbitionDefinition 
} from "@/types/ambitionLevel";

// =============================================
// TYPES
// =============================================

type ObjectiveFilter = "all" | "triathlon" | "running" | "trail";

const OBJECTIVE_CATEGORIES: Record<string, ObjectiveFilter[]> = {
  IM: ["triathlon"],
  "703": ["triathlon"],
  Marathon: ["running"],
  Semi: ["running"],
  Trail: ["trail"],
  TrailLong: ["trail"],
  Ultra: ["trail"],
  Sprint: ["triathlon"],
  Olympic: ["triathlon"],
};

const OBJECTIVE_LABELS: Record<string, string> = {
  IM: "Ironman",
  "703": "70.3 / Half",
  Marathon: "Marathon",
  Semi: "Semi-Marathon",
  Trail: "Trail (40-80km)",
  TrailLong: "Trail Long (80km+)",
  Ultra: "Ultra (100km+)",
  Sprint: "Sprint",
  Olympic: "Olympique",
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function generatePrintHtml(objectives: string[], ambition: AmbitionLevel | "all"): string {
  const ambitions = ambition === "all" ? AMBITION_LEVELS_ORDERED : [ambition];
  
  const styles = `
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 9px; }
      .header { text-align: center; margin-bottom: 15px; }
      .header h1 { font-size: 16px; margin: 0; color: #3C3CB8; }
      .header p { margin: 5px 0 0; color: #6E6B78; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 8px; }
      th, td { border: 1px solid #E7E4DC; padding: 4px 6px; text-align: center; }
      th { background: #F2F0E9; font-weight: 600; }
      .obj-col { text-align: left; font-weight: 500; }
      .finisher { background: #F2F0E9; }
      .age_group { background: #EDEDFC; }
      .competitor { background: #FBF0DA; }
      .elite { background: #EFE9FA; }
      .footer { margin-top: 10px; text-align: center; font-size: 8px; color: #97949F; }
    </style>
  `;

  const tableRows = objectives.map(obj => {
    const label = OBJECTIVE_LABELS[obj] || obj;
    const targets = AMBITION_TARGETS[obj];
    if (!targets) return "";

    const cells = ambitions.map(amb => {
      const t = targets[amb];
      const def = getAmbitionDefinition(amb);
      return `
        <td class="${amb}">
          <div><strong>VLamax:</strong> ${t.vlamax.optimal.toFixed(2)}</div>
          <div><strong>TTE:</strong> ${t.tte_min}min</div>
          <div><strong>FTP/kg:</strong> ${t.ftp_kg_min.toFixed(1)}</div>
        </td>
      `;
    }).join("");

    return `<tr><td class="obj-col">${label}</td>${cells}</tr>`;
  }).join("");

  const headerCells = ambitions.map(amb => {
    const def = getAmbitionDefinition(amb);
    return `<th class="${amb}">${def.icon} ${def.label}</th>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cibles Physiologiques par Ambition</title>
  ${styles}
</head>
<body>
  <div class="header">
    <h1>🎯 Exigences Physiologiques par Objectif et Ambition</h1>
    <p>Two For Coaching Lab Academy • ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Objectif</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">
    VLamax en mmol/L/s (valeur optimale) • TTE en minutes • FTP/kg en W/kg (minimum)
  </div>
</body>
</html>`;
}

// =============================================
// MAIN COMPONENT
// =============================================

interface AmbitionTargetsTableProps {
  className?: string;
}

export function AmbitionTargetsTable({ className }: AmbitionTargetsTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<ObjectiveFilter>("all");
  const [ambitionFilter, setAmbitionFilter] = useState<AmbitionLevel | "all">("all");

  const filteredObjectives = useMemo(() => {
    return Object.keys(AMBITION_TARGETS).filter(obj => {
      if (categoryFilter === "all") return true;
      const categories = OBJECTIVE_CATEGORIES[obj] || [];
      return categories.includes(categoryFilter);
    });
  }, [categoryFilter]);

  const displayedAmbitions = useMemo(() => {
    if (ambitionFilter === "all") return AMBITION_LEVELS_ORDERED;
    return [ambitionFilter];
  }, [ambitionFilter]);

  const handlePrint = () => {
    const html = generatePrintHtml(filteredObjectives, ambitionFilter);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-primary" />
            Exigences par objectif et ambition
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Imprimer
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ObjectiveFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="triathlon">Triathlon</SelectItem>
              <SelectItem value="running">Course</SelectItem>
              <SelectItem value="trail">Trail</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={ambitionFilter} onValueChange={(v) => setAmbitionFilter(v as AmbitionLevel | "all")}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Ambition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les ambitions</SelectItem>
              {AMBITION_LEVELS_ORDERED.map(amb => {
                const def = getAmbitionDefinition(amb);
                return (
                  <SelectItem key={amb} value={amb}>
                    {def.icon} {def.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[120px]">Objectif</TableHead>
                {displayedAmbitions.map(amb => {
                  const def = getAmbitionDefinition(amb);
                  return (
                    <TableHead key={amb} className="text-center min-w-[100px]">
                      <div className={cn("flex items-center justify-center gap-1", def.color)}>
                        <span>{def.icon}</span>
                        <span className="hidden sm:inline">{def.label}</span>
                        <span className="sm:hidden">{def.shortLabel}</span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjectives.map(obj => {
                const targets = AMBITION_TARGETS[obj];
                if (!targets) return null;
                
                return (
                  <TableRow key={obj} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {OBJECTIVE_LABELS[obj] || obj}
                    </TableCell>
                    {displayedAmbitions.map(amb => {
                      const t = targets[amb];
                      const def = getAmbitionDefinition(amb);
                      
                      return (
                        <TableCell key={amb} className="text-center">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-muted-foreground">VLamax</span>
                              <span className="font-mono font-medium">{t.vlamax.optimal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between px-1">
                              <span className="text-muted-foreground">TTE</span>
                              <span className="font-mono font-medium">{t.tte_min}min</span>
                            </div>
                            <div className="flex items-center justify-between px-1">
                              <span className="text-muted-foreground">FTP/kg</span>
                              <span className="font-mono font-medium">{t.ftp_kg_min.toFixed(1)}</span>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t bg-muted/20 text-[10px] text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            <span><strong>VLamax:</strong> valeur optimale (mmol/L/s)</span>
            <span><strong>TTE:</strong> minimum requis (minutes)</span>
            <span><strong>FTP/kg:</strong> minimum requis (W/kg)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

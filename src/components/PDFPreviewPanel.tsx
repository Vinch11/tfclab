/**
 * PDF Preview Panel
 * Aperçu live du rapport PDF montrant les sections sélectionnées
 * avec miniatures visuelles dans l'ordre personnalisé
 */

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Eye, 
  EyeOff,
  ChevronRight,
  Compass,
  Activity,
  Target,
  Utensils,
  Clock,
  BookOpen,
  TestTube2,
  BarChart3,
  User,
  Flame,
  Heart,
  Zap,
  Shield,
  Medal,
  TrendingUp,
  Settings,
  CheckSquare,
  List,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSectionOrder, SECTION_LABELS } from "./ReportSectionOrderEditor";
import type { ReportSections } from "./ExportTools";

interface PDFPreviewPanelProps {
  sections: ReportSections;
  athleteName?: string;
  className?: string;
}

// Icônes et couleurs par section
const SECTION_ICONS: Record<keyof ReportSections, React.ComponentType<{ className?: string }>> = {
  synthese: FileText,
  compass: Compass,
  profilMetabolique: Activity,
  vlamaxZoneConfidence: Zap,
  indicateurs: BarChart3,
  pacingEnvelope: BarChart3,
  potentielPhysiologiqueRunning: Target,
  injuryRisk: AlertTriangle,
  nutritionV2: Utensils,
  fatmaxTFCL: Flame,
  ambitionTargets: Medal,
  ambitionPredictions: Target,
  evolutionCharts: TrendingUp,
  ageAdjustment: User,
  ambitionLegend: List,
  zones: Activity,
  historique: Clock,
  tests: TestTube2,
  testsCalibration: TestTube2,
  calibrationEvidence: TestTube2,
  fitImports: FileText,
  checkins: Heart,
  comprendre: BookOpen,
  qualite: CheckSquare,
  roadmap: BarChart3,
  lactateCurve: TrendingUp,
  substrateCurve: Flame,
  performancePrediction: Target,
  facteursLimitants: AlertTriangle,
  leviersAction: Settings,
  cpWprimeWbal: Zap,
  lactateCorrespondence: Activity,
  cycleIntelligence: TrendingUp,
};

// Catégories avec couleurs
const SECTION_CATEGORIES: Record<keyof ReportSections, { label: string; color: string }> = {
  synthese: { label: "Synthèse", color: "bg-primary/20 text-primary" },
  compass: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  profilMetabolique: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  vlamaxZoneConfidence: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  indicateurs: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  potentielPhysiologique: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  disponibiliteTFCL: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  raceSimulation: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pacingEnvelope: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  longDistancePacing: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  doubleBoucleCAP: { label: "Running", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  potentielPhysiologiqueRunning: { label: "Running", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  pacingEnvelopeRunning: { label: "Running", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  injuryRisk: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  nutritionV2: { label: "Nutrition", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  fatmaxTFCL: { label: "Nutrition", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ambitionTargets: { label: "Objectifs", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  ambitionPredictions: { label: "Objectifs", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  evolutionCharts: { label: "Historique", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
  ageAdjustment: { label: "Profil", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  ambitionLegend: { label: "Objectifs", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  zones: { label: "Entraînement", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  historique: { label: "Historique", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
  tests: { label: "Tests", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  testsCalibration: { label: "Tests", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  calibrationEvidence: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  fitImports: { label: "Tests", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  checkins: { label: "Suivi", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  comprendre: { label: "Aide", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  qualite: { label: "Qualité", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  roadmap: { label: "Entraînement", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  lactateCurve: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  substrateCurve: { label: "Analyse", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  performancePrediction: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  facteursLimitants: { label: "Analyse", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  leviersAction: { label: "Entraînement", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  cpWprimeWbal: { label: "Performance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

// Descriptions courtes pour l'aperçu
const SECTION_DESCRIPTIONS: Partial<Record<keyof ReportSections, string>> = {
  synthese: "Vue d'ensemble et recommandations clés",
  compass: "Boussole métabolique à 5 axes",
  profilMetabolique: "Radar chart complet du profil",
  indicateurs: "VLamax, TTE, FTP/kg, VO₂max",
  potentielPhysiologique: "Score de préparation course",
  disponibiliteTFCL: "État de disponibilité du jour",
  raceSimulation: "Scénarios de pacing et nutrition",
  pacingEnvelope: "Corridors Safe/Risk/Forbidden basés VLamax",
  longDistancePacing: "LDRI et seuils glycogène (>90min)",
  injuryRisk: "Évaluation du risque de blessure CAP",
  nutritionV2: "Besoins glucidiques personnalisés",
  fatmaxTFCL: "Zone d'oxydation lipidique optimale",
  ambitionTargets: "Objectifs par niveau d'ambition",
  zones: "Zones d'entraînement personnalisées",
  tests: "Historique des tests effectués",
  qualite: "Complétude et traçabilité des données",
};

export function PDFPreviewPanel({ 
  sections, 
  athleteName = "Athlète",
  className 
}: PDFPreviewPanelProps) {
  // Sections dans l'ordre personnalisé
  const orderedSections = useMemo(() => {
    const order = getSectionOrder();
    return order.map(key => ({
      key,
      label: SECTION_LABELS[key],
      visible: sections[key],
      Icon: SECTION_ICONS[key],
      category: SECTION_CATEGORIES[key],
      description: SECTION_DESCRIPTIONS[key],
    }));
  }, [sections]);
  
  const visibleSections = orderedSections.filter(s => s.visible);
  const hiddenCount = orderedSections.filter(s => !s.visible).length;
  
  // Estimer le nombre de pages
  const estimatedPages = useMemo(() => {
    let pages = 1; // Cover
    const sectionsPerPage = 2.5;
    pages += Math.ceil(visibleSections.length / sectionsPerPage);
    return Math.max(2, pages);
  }, [visibleSections.length]);
  
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Aperçu du rapport</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          ~{estimatedPages} pages
        </Badge>
      </div>
      
      {/* Preview container - simule une page A4 */}
      <div className="relative border rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Cover page miniature */}
        <div className="bg-gradient-to-b from-primary/10 to-primary/5 p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <FileText className="w-3 h-3 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-foreground truncate max-w-[150px]">
                Rapport Staff — {athleteName}
              </div>
              <div className="text-[8px] text-muted-foreground">
                Two For Coaching Lab™
              </div>
            </div>
          </div>
        </div>
        
        {/* Sections list */}
        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-1">
            {visibleSections.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <EyeOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Aucune section sélectionnée</p>
              </div>
            ) : (
              visibleSections.map((section, index) => {
                const Icon = section.Icon;
                return (
                  <div 
                    key={section.key}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Page indicator */}
                    <div className="flex-shrink-0 w-4 h-4 rounded-sm bg-muted flex items-center justify-center">
                      <span className="text-[8px] font-medium text-muted-foreground">
                        {index + 2}
                      </span>
                    </div>
                    
                    {/* Section info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] font-medium truncate">
                          {section.label}
                        </span>
                      </div>
                      {section.description && (
                        <p className="text-[8px] text-muted-foreground truncate mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Category badge */}
                    <Badge 
                      variant="secondary" 
                      className={cn("text-[7px] px-1 py-0 h-3.5 flex-shrink-0", section.category.color)}
                    >
                      {section.category.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Footer - stats */}
        <div className="border-t bg-muted/30 px-3 py-2 flex items-center justify-between">
          <div className="text-[9px] text-muted-foreground">
            <span className="font-medium text-foreground">{visibleSections.length}</span> sections
            {hiddenCount > 0 && (
              <span className="ml-1">• {hiddenCount} masquées</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <ChevronRight className="w-2.5 h-2.5" />
            L'ordre suit vos préférences
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-1">
        {Array.from(new Set(visibleSections.map(s => s.category.label))).slice(0, 4).map(cat => {
          const categoryInfo = visibleSections.find(s => s.category.label === cat)?.category;
          if (!categoryInfo) return null;
          return (
            <Badge 
              key={cat} 
              variant="secondary" 
              className={cn("text-[7px] px-1.5 py-0", categoryInfo.color)}
            >
              {cat}
            </Badge>
          );
        })}
        {Array.from(new Set(visibleSections.map(s => s.category.label))).length > 4 && (
          <Badge variant="outline" className="text-[7px] px-1.5 py-0">
            +{Array.from(new Set(visibleSections.map(s => s.category.label))).length - 4}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default PDFPreviewPanel;

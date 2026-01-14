import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  ChevronLeft, 
  BookOpen, 
  Scale,
  Compass,
  Layers,
  ShieldCheck,
  FileText,
  Target,
  Zap,
  Clock,
  Bike,
  Apple,
  Mountain,
  Timer,
  Printer,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharteLectureAcademy } from "@/components/CharteLectureAcademy";
import { Badge } from "@/components/ui/badge";
import { UNIFIED_TARGETS } from "@/lib/physiologicalTargets";
import { AmbitionTargetsTable } from "@/components/AmbitionTargetsTable";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Catégories d'objectifs pour le filtre
type ObjectiveCategory = "all" | "triathlon" | "running" | "trail";

const OBJECTIVE_CATEGORIES: Record<string, ObjectiveCategory[]> = {
  IM: ["triathlon"],
  "703": ["triathlon"],
  Marathon: ["running"],
  Semi: ["running"],
  Trail: ["trail"],
  TrailShort: ["trail"],
  TrailMountain: ["trail"],
  TrailUltra: ["trail"],
};

const getCategoryIcon = (category: ObjectiveCategory) => {
  switch (category) {
    case "triathlon": return <Bike className="h-4 w-4" />;
    case "running": return <Timer className="h-4 w-4" />;
    case "trail": return <Mountain className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: ObjectiveCategory) => {
  switch (category) {
    case "triathlon": return "Triathlon";
    case "running": return "Course";
    case "trail": return "Trail";
    default: return "Tous";
  }
};

// Helper pour générer le HTML d'export des cibles
const generateTargetsPdfHtml = () => {
  const styles = `
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
      .header h1 { font-size: 18px; margin: 0; color: #1e40af; }
      .header p { margin: 5px 0 0; color: #6b7280; font-size: 10px; }
      .objective-card { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 12px; page-break-inside: avoid; }
      .objective-header { background: #f3f4f6; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 12px; }
      .objective-body { display: flex; gap: 10px; padding: 10px; }
      .level-col { flex: 1; padding: 8px; border-radius: 4px; }
      .level-perf { background: #dcfce7; border: 1px solid #86efac; }
      .level-inter { background: #dbeafe; border: 1px solid #93c5fd; }
      .level-title { font-weight: 600; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; }
      .level-perf .level-title { color: #166534; }
      .level-inter .level-title { color: #1e40af; }
      .metric { display: flex; gap: 6px; margin-bottom: 4px; font-size: 10px; }
      .metric-label { color: #6b7280; min-width: 70px; }
      .metric-value { font-weight: 500; font-family: 'SF Mono', Monaco, monospace; }
      .legend { margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 6px; font-size: 9px; color: #1e40af; }
      .footer { margin-top: 15px; text-align: center; font-size: 8px; color: #9ca3af; }
    </style>
  `;

  const objectivesHtml = Object.entries(UNIFIED_TARGETS).map(([key, levels]) => `
    <div class="objective-card">
      <div class="objective-header">${key}</div>
      <div class="objective-body">
        <div class="level-col level-perf">
          <div class="level-title">Performance</div>
          <div class="metric"><span class="metric-label">VLamax:</span><span class="metric-value">${levels.performance.vlamax.min.toFixed(2)} – ${levels.performance.vlamax.max.toFixed(2)} (opt: ${levels.performance.vlamax.optimal.toFixed(2)})</span></div>
          <div class="metric"><span class="metric-label">TTE min:</span><span class="metric-value">${levels.performance.tte_min} min</span></div>
          <div class="metric"><span class="metric-label">FTP/kg min:</span><span class="metric-value">${levels.performance.ftp_kg_min.toFixed(1)} W/kg</span></div>
          ${levels.performance.nutrition_bike_gph.max > 0 ? `<div class="metric"><span class="metric-label">Nutri. vélo:</span><span class="metric-value">${levels.performance.nutrition_bike_gph.min}–${levels.performance.nutrition_bike_gph.max} g/h</span></div>` : ''}
          ${levels.performance.nutrition_run_gph?.max > 0 ? `<div class="metric"><span class="metric-label">Nutri. CAP:</span><span class="metric-value">${levels.performance.nutrition_run_gph.min}–${levels.performance.nutrition_run_gph.max} g/h</span></div>` : ''}
        </div>
        <div class="level-col level-inter">
          <div class="level-title">Intermédiaire</div>
          <div class="metric"><span class="metric-label">VLamax:</span><span class="metric-value">${levels.intermediaire.vlamax.min.toFixed(2)} – ${levels.intermediaire.vlamax.max.toFixed(2)} (opt: ${levels.intermediaire.vlamax.optimal.toFixed(2)})</span></div>
          <div class="metric"><span class="metric-label">TTE min:</span><span class="metric-value">${levels.intermediaire.tte_min} min</span></div>
          <div class="metric"><span class="metric-label">FTP/kg min:</span><span class="metric-value">${levels.intermediaire.ftp_kg_min.toFixed(1)} W/kg</span></div>
          ${levels.intermediaire.nutrition_bike_gph.max > 0 ? `<div class="metric"><span class="metric-label">Nutri. vélo:</span><span class="metric-value">${levels.intermediaire.nutrition_bike_gph.min}–${levels.intermediaire.nutrition_bike_gph.max} g/h</span></div>` : ''}
          ${levels.intermediaire.nutrition_run_gph?.max > 0 ? `<div class="metric"><span class="metric-label">Nutri. CAP:</span><span class="metric-value">${levels.intermediaire.nutrition_run_gph.min}–${levels.intermediaire.nutrition_run_gph.max} g/h</span></div>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cibles Physiologiques - Two For Coaching Lab</title>
  ${styles}
</head>
<body>
  <div class="header">
    <h1>🎯 Cibles Physiologiques par Objectif</h1>
    <p>Two For Coaching Lab • Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>
  ${objectivesHtml}
  <div class="legend">
    💡 <strong>Note :</strong> Les alertes et recommandations utilisent le niveau <strong>Intermédiaire</strong> par défaut. Le niveau <strong>Performance</strong> sert de cible pour les athlètes avancés.
  </div>
  <div class="footer">Document généré par Two For Coaching Lab Academy</div>
</body>
</html>`;
};

const handlePrintTargets = () => {
  const html = generateTargetsPdfHtml();
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }
};

const handleDownloadTargetsPdf = () => {
  const html = generateTargetsPdfHtml();
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Données de la table des constantes physiologiques
const PHYSIOLOGICAL_CONSTANTS = [
  {
    domain: "Économie de course (CAP)",
    constant: "Coût énergétique de la course (ECOR)",
    value: "3.6 – 4.5 J·kg⁻¹·m⁻¹ (≈ 4.0 par défaut)",
    source: "di Prampero, Margaria",
    robustness: "Variable inter-individuelle",
    usage: "Conversion vitesse → puissance métabolique"
  },
  {
    domain: "Cyclisme",
    constant: "Efficacité mécanique",
    value: "20–24 %",
    source: "Coyle, Mader",
    robustness: "Stable",
    usage: "FTP, Pmax, TTE"
  },
  {
    domain: "Seuil aérobie (SV1)",
    constant: "Lactate ≈ 2 mmol/L",
    value: "2 mmol/L",
    source: "Mader, Heck",
    robustness: "Convention",
    usage: "Définition zones Z2–Z3"
  },
  {
    domain: "Seuil anaérobie (SV2 / MLSS)",
    constant: "Lactate ≈ 4 mmol/L",
    value: "4 mmol/L",
    source: "Heck (1985)",
    robustness: "Convention",
    usage: "TTE, endurance spécifique"
  },
  {
    domain: "Métabolisme",
    constant: "Conversion énergie ↔ lactate",
    value: "60–65 J·kg⁻¹ / mmol",
    source: "Mader",
    robustness: "Modélisation",
    usage: "Estimation VLamax"
  },
  {
    domain: "Cinétique VO₂",
    constant: "Part aérobie sur sprint",
    value: "20–35 % de VO₂max",
    source: "Whipp, Billat",
    robustness: "Dépend contexte",
    usage: "Correction VLamax sprint"
  },
  {
    domain: "Alactique (PCr)",
    constant: "Délai phosphocréatine",
    value: "5–7 secondes",
    source: "Bogdanis",
    robustness: "Moyenne population",
    usage: "Tests anaérobies"
  },
  {
    domain: "Endurance au seuil",
    constant: "TTE (MLSS)",
    value: "35–70 minutes",
    source: "Billat, INSCYD",
    robustness: "Concept robuste",
    usage: "Durabilité, Race Readiness"
  },
  {
    domain: "Substrats énergétiques",
    constant: "Relation VLamax ↔ glucides",
    value: "Relation inverse qualitative",
    source: "Mader, San Millán",
    robustness: "Forte",
    usage: "Nutrition prédictive (g/h)"
  },
  {
    domain: "Charge d'entraînement",
    constant: "TSS",
    value: "Modèle Coggan",
    source: "Coggan",
    robustness: "Indirecte",
    usage: "Proxy fatigue / TTE"
  }
];

export default function AcademyPage() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<ObjectiveCategory>("all");

  // Filtrer les objectifs selon la catégorie sélectionnée
  const filteredTargets = Object.entries(UNIFIED_TARGETS).filter(([key]) => {
    if (categoryFilter === "all") return true;
    const categories = OBJECTIVE_CATEGORIES[key] || [];
    return categories.includes(categoryFilter);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">🧠 Academy</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Référentiel scientifique officiel</p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <Tabs defaultValue="charte" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="charte" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Charte de lecture
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Référentiel scientifique
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="charte">
            <CharteLectureAcademy />
          </TabsContent>
          
          <TabsContent value="reference">
        <Accordion type="multiple" defaultValue={["fondements", "constantes", "hierarchie", "legal", "philosophie"]} className="space-y-4">
          
          {/* SECTION 1 — Fondements scientifiques */}
          <AccordionItem value="fondements" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📘 Fondements scientifiques de Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 sm:p-6">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Two For Coaching Lab est une application d'aide à la décision destinée aux coachs et athlètes d'endurance.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Elle s'appuie sur des modèles physiologiques issus de la littérature scientifique internationale, 
                    en particulier l'école allemande de physiologie de l'exercice (Mader, Heck, Billat), ainsi que sur 
                    des travaux plus récents en métabolisme, économie de locomotion et durabilité de la performance.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-foreground font-medium leading-relaxed text-sm sm:text-base">
                    L'application ne cherche pas à prédire la performance, mais à éclairer les décisions d'entraînement 
                    en rendant visibles les compromis physiologiques (performance, fatigue, risque).
                  </p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 2 — Table des constantes */}
          <AccordionItem value="constantes" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50 text-accent-foreground">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📊 Constantes physiologiques utilisées dans Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="overflow-x-auto -mx-4 px-4">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Domaine physiologique</TableHead>
                      <TableHead className="font-semibold">Constante utilisée</TableHead>
                      <TableHead className="font-semibold">Valeur de référence</TableHead>
                      <TableHead className="font-semibold">Source scientifique</TableHead>
                      <TableHead className="font-semibold">Robustesse</TableHead>
                      <TableHead className="font-semibold">Utilisation dans l'app</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PHYSIOLOGICAL_CONSTANTS.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{row.domain}</TableCell>
                        <TableCell className="text-muted-foreground">{row.constant}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{row.value}</TableCell>
                        <TableCell className="text-muted-foreground italic">{row.source}</TableCell>
                        <TableCell className="text-muted-foreground">{row.robustness}</TableCell>
                        <TableCell className="text-muted-foreground">{row.usage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 2.5 — Cibles physiologiques par objectif */}
          <AccordionItem value="cibles" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                  <Target className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">🎯 Cibles physiologiques par objectif</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground mb-4">
                Ces cibles sont utilisées par tous les indicateurs de l'application (alertes, priorités, recommandations). 
                Deux niveaux sont définis : <Badge variant="outline" className="mx-1">Performance</Badge> pour les athlètes compétitifs et 
                <Badge variant="outline" className="mx-1">Intermédiaire</Badge> pour les athlètes en progression.
              </p>

              {/* Actions : Filtre + Export */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Filtre par catégorie */}
                <ToggleGroup 
                  type="single" 
                  value={categoryFilter} 
                  onValueChange={(value) => value && setCategoryFilter(value as ObjectiveCategory)}
                  className="justify-start flex-wrap"
                >
                  <ToggleGroupItem value="all" aria-label="Tous les objectifs" className="gap-2">
                    {getCategoryIcon("all")}
                    <span className="hidden sm:inline">{getCategoryLabel("all")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="triathlon" aria-label="Triathlon" className="gap-2">
                    {getCategoryIcon("triathlon")}
                    <span className="hidden sm:inline">{getCategoryLabel("triathlon")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="running" aria-label="Course" className="gap-2">
                    {getCategoryIcon("running")}
                    <span className="hidden sm:inline">{getCategoryLabel("running")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="trail" aria-label="Trail" className="gap-2">
                    {getCategoryIcon("trail")}
                    <span className="hidden sm:inline">{getCategoryLabel("trail")}</span>
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Boutons d'export */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrintTargets} className="gap-2">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Imprimer</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadTargetsPdf} className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {filteredTargets.map(([key, levels]) => (
                  <Card key={key} className="border-border/50">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {key}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Performance Level */}
                        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                              Performance
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-muted-foreground">VLamax:</span>
                              <span className="font-mono font-medium">
                                {levels.performance.vlamax.min.toFixed(2)} – {levels.performance.vlamax.max.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">(opt: {levels.performance.vlamax.optimal.toFixed(2)})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-muted-foreground">TTE min:</span>
                              <span className="font-mono font-medium">{levels.performance.tte_min} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Bike className="h-3.5 w-3.5 text-orange-500" />
                              <span className="text-muted-foreground">FTP/kg min:</span>
                              <span className="font-mono font-medium">{levels.performance.ftp_kg_min.toFixed(1)} W/kg</span>
                            </div>
                            {levels.performance.nutrition_bike_gph.max > 0 && (
                              <div className="flex items-center gap-2">
                                <Apple className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-muted-foreground">Nutrition vélo:</span>
                                <span className="font-mono font-medium">
                                  {levels.performance.nutrition_bike_gph.min}–{levels.performance.nutrition_bike_gph.max} g/h
                                </span>
                              </div>
                            )}
                            {levels.performance.nutrition_run_gph && levels.performance.nutrition_run_gph.max > 0 && (
                              <div className="flex items-center gap-2">
                                <Apple className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-muted-foreground">Nutrition CAP:</span>
                                <span className="font-mono font-medium">
                                  {levels.performance.nutrition_run_gph.min}–{levels.performance.nutrition_run_gph.max} g/h
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Intermediaire Level */}
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                              Intermédiaire
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-muted-foreground">VLamax:</span>
                              <span className="font-mono font-medium">
                                {levels.intermediaire.vlamax.min.toFixed(2)} – {levels.intermediaire.vlamax.max.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">(opt: {levels.intermediaire.vlamax.optimal.toFixed(2)})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-muted-foreground">TTE min:</span>
                              <span className="font-mono font-medium">{levels.intermediaire.tte_min} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Bike className="h-3.5 w-3.5 text-orange-500" />
                              <span className="text-muted-foreground">FTP/kg min:</span>
                              <span className="font-mono font-medium">{levels.intermediaire.ftp_kg_min.toFixed(1)} W/kg</span>
                            </div>
                            {levels.intermediaire.nutrition_bike_gph.max > 0 && (
                              <div className="flex items-center gap-2">
                                <Apple className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-muted-foreground">Nutrition vélo:</span>
                                <span className="font-mono font-medium">
                                  {levels.intermediaire.nutrition_bike_gph.min}–{levels.intermediaire.nutrition_bike_gph.max} g/h
                                </span>
                              </div>
                            )}
                            {levels.intermediaire.nutrition_run_gph && levels.intermediaire.nutrition_run_gph.max > 0 && (
                              <div className="flex items-center gap-2">
                                <Apple className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-muted-foreground">Nutrition CAP:</span>
                                <span className="font-mono font-medium">
                                  {levels.intermediaire.nutrition_run_gph.min}–{levels.intermediaire.nutrition_run_gph.max} g/h
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">💡 Note :</strong> Les alertes et recommandations utilisent le niveau 
                    <Badge variant="outline" className="mx-1">Intermédiaire</Badge> par défaut pour les seuils de déclenchement. 
                    Le niveau <Badge variant="outline" className="mx-1">Performance</Badge> sert de cible pour les athlètes avancés.
                  </p>
                </CardContent>
              </Card>

              {/* Nouveau tableau par ambition */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  🎯 Tableau détaillé par niveau d'ambition
                </h4>
                <AmbitionTargetsTable />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 3 — Hiérarchie des données */}
          <AccordionItem value="hierarchie" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📐 Hiérarchie des données utilisées par l'app</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-secondary/30 bg-secondary/5">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Two For Coaching Lab applique une hiérarchie stricte des sources de données afin de limiter les erreurs d'interprétation :
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">1</span>
                      <div>
                        <p className="font-medium text-foreground">Mesures directes</p>
                        <p className="text-sm text-muted-foreground">Tests terrain structurés, tests laboratoire</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/80 text-primary-foreground text-sm font-bold shrink-0">2</span>
                      <div>
                        <p className="font-medium text-foreground">Observations terrain</p>
                        <p className="text-sm text-muted-foreground">TTE observé, dérive cardiaque, durabilité</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/60 text-primary-foreground text-sm font-bold shrink-0">3</span>
                      <div>
                        <p className="font-medium text-foreground">Estimations modélisées</p>
                        <p className="text-sm text-muted-foreground">VLamax, TTE, nutrition prédictive</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">4</span>
                      <div>
                        <p className="font-medium text-foreground">Valeurs par défaut</p>
                        <p className="text-sm text-muted-foreground">Uniquement en absence totale de données</p>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  
                  <p className="text-foreground font-medium leading-relaxed text-sm sm:text-base">
                    Chaque indicateur affiché dans l'application est associé à un indice de confiance reflétant cette hiérarchie.
                  </p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 4 — Cadre légal & limites */}
          <AccordionItem value="legal" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">⚖️ Cadre scientifique et limites d'utilisation</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    <strong className="text-foreground">Two For Coaching Lab est un outil d'aide à la décision.</strong>
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Il ne remplace ni un test physiologique en laboratoire, ni un avis médical, ni l'expertise d'un coach.
                  </p>
                  
                  <Separator />
                  
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Les valeurs de VLamax, TTE, Race Readiness, nutrition prédictive et indices de risque sont des 
                    <strong className="text-foreground"> estimations probabilistes</strong> basées sur des modèles reconnus, 
                    mais dépendantes du contexte individuel (fatigue, stress, âge, discipline, historique).
                  </p>

                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <p className="text-foreground font-semibold text-center text-sm sm:text-base">
                        Les décisions finales d'entraînement appartiennent toujours au coach et à l'athlète.
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 5 — Philosophie */}
          <AccordionItem value="philosophie" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">🧭 Philosophie Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4 sm:p-6 space-y-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      <strong className="text-foreground">Nous ne cherchons pas à automatiser l'entraînement.</strong>
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      Nous cherchons à rendre visibles les mécanismes physiologiques, les compromis et les risques.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      Two For Coaching Lab structure l'information, explique le "pourquoi", et laisse le contrôle humain au centre du processus.
                    </p>
                  </div>

                  <Separator />

                  {/* Citation finale en évidence */}
                  <Card className="border-2 border-primary/40 bg-primary/10">
                    <CardContent className="p-6 sm:p-8">
                      <blockquote className="text-center space-y-2">
                        <p className="text-lg sm:text-xl font-semibold text-foreground italic">
                          "Nous n'essayons pas de prédire la performance,
                        </p>
                        <p className="text-lg sm:text-xl font-semibold text-foreground italic">
                          nous essayons d'éclairer la décision d'entraînement."
                        </p>
                      </blockquote>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

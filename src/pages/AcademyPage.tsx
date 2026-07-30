import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Download,
  Beaker,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  TrendingUp
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
import { applyBevelPrintTheme } from "@/lib/print/bevelPrintTheme";


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
    printWindow.document.write(applyBevelPrintTheme(html));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }
};

const handleDownloadTargetsPdf = () => {
  const html = generateTargetsPdfHtml();
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(applyBevelPrintTheme(html));
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
    usage: "Durabilité, Potentiel Physiologique"
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="charte" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Charte</span>
              <span className="sm:hidden">Charte</span>
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Référentiel</span>
              <span className="sm:hidden">Réf.</span>
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Simulation</span>
              <span className="sm:hidden">Simu.</span>
            </TabsTrigger>
            <TabsTrigger value="protocols" className="flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              <span className="hidden sm:inline">Protocoles</span>
              <span className="sm:hidden">Proto.</span>
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
                    <strong className="text-foreground">Two For Coaching Lab Method™</strong> est une méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes, estimer des profils énergétiques, et guider la prise de décision stratégique.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Elle ne remplace ni l'expertise humaine du coach, ni un test physiologique de laboratoire.
                    Elle structure, hiérarchise et contextualise les informations disponibles afin de réduire l'incertitude et d'augmenter la cohérence des choix d'entraînement.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    S'inspire des travaux scientifiques reconnus (Mader, Heck, Jones, Burnley, Seiler) — implémentation indépendante, originale et propriétaire.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-foreground font-medium leading-relaxed text-sm sm:text-base">
                    La Two For Coaching Lab Method™ est un outil d'aide à la décision, pas une vérité physiologique absolue.
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
                    Les valeurs de VLamax, TTE, Potentiel Physiologique, nutrition prédictive et indices de risque sont des 
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

          {/* TAB: SIMULATION DE COURSE */}
          <TabsContent value="simulation">
            <div className="space-y-6">
              {/* Introduction */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Target className="w-5 h-5" />
                    </div>
                    🏁 Simulation de Course TFCL™
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    La Simulation de Course TFCL™ compare des <strong className="text-foreground">scénarios de pacing et de nutrition</strong> en fonction 
                    de votre profil métabolique. Elle ne prédit pas un résultat exact.
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium text-foreground">
                      💡 Philosophie TFCL™ : "Privilégier toujours une décision robuste à une précision illusoire."
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Toggle BASIC / PRO */}
              <Tabs defaultValue="basic" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>BASIC — Décision robuste</span>
                  </TabsTrigger>
                  <TabsTrigger value="pro" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>PRO — Analyse complète</span>
                  </TabsTrigger>
                </TabsList>

                {/* BASIC Content */}
                <TabsContent value="basic" className="space-y-4">
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Version simplifiée basée sur des indicateurs robustes. 
                        <strong className="text-foreground"> Recommandée si les données sont partielles.</strong>
                      </p>
                    </CardContent>
                  </Card>

                  <Accordion type="multiple" defaultValue={["basic-why", "basic-inputs"]} className="space-y-3">
                    {/* Leçon 1: Pourquoi une version BASIC ? */}
                    <AccordionItem value="basic-why" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Leçon 1 : Pourquoi une version simplifiée ?
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <p>
                          <strong className="text-foreground">La version BASIC n'est PAS une version dégradée.</strong> Elle est 
                          volontairement plus conservative et plus robuste.
                        </p>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Quand utiliser la version BASIC ?</p>
                          <ul className="space-y-1 pl-4">
                            <li>• Données physiologiques incomplètes</li>
                            <li>• Première course sur un format donné</li>
                            <li>• Athlète loisir ou autonome</li>
                            <li>• Besoin d'une décision rapide et sûre</li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm">
                            ⚠️ <strong>Ce que BASIC ne fait pas :</strong> pas de temps exact, pas de simulation segment par segment, 
                            pas de courbe de glycogène.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 2: Données utilisées */}
                    <AccordionItem value="basic-inputs" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Layers className="h-4 w-4 text-blue-500" />
                          Leçon 2 : Données utilisées en mode BASIC
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Donnée</TableHead>
                              <TableHead>Obligatoire</TableHead>
                              <TableHead>Utilisation</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>Type de course</TableCell>
                              <TableCell><Badge variant="default" className="bg-green-500">Oui</Badge></TableCell>
                              <TableCell>Définit durée et intensité</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Disponibilité TFCL™</TableCell>
                              <TableCell><Badge variant="outline">Recommandé</Badge></TableCell>
                              <TableCell>Module le risque global</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Potentiel Physiologique V2</TableCell>
                              <TableCell><Badge variant="outline">Recommandé</Badge></TableCell>
                              <TableCell>Zone d'intensité conseillée</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-sm">
                            💡 VLamax, FatMax et TTE ne sont <strong>PAS</strong> utilisés explicitement en mode BASIC.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 3: Outputs */}
                    <AccordionItem value="basic-outputs" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          Leçon 3 : Ce qui est affiché
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Élément</TableHead>
                              <TableHead>Valeurs</TableHead>
                              <TableHead>Signification</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>Zone d'intensité</TableCell>
                              <TableCell>Sous contrôle / Limite / À risque</TableCell>
                              <TableCell>Compatibilité avec l'état actuel</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Risque global</TableCell>
                              <TableCell>LOW / MODERATE / HIGH</TableCell>
                              <TableCell>Risque global de la course</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Scénario recommandé</TableCell>
                              <TableCell>Conservateur / Optimal / Agressif</TableCell>
                              <TableCell>Direction sans détails chiffrés</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                          <p className="text-sm">
                            ✅ <strong>Pas de temps exact.</strong> L'objectif est de guider la DÉCISION, pas de prédire un chrono.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 4: Garde-fous */}
                    <AccordionItem value="basic-guardrails" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Leçon 4 : Garde-fous automatiques
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Condition</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Message</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>Disponibilité &lt; 50%</TableCell>
                              <TableCell><Badge className="bg-amber-500">⚠️ Warning</Badge></TableCell>
                              <TableCell>Disponibilité faible : prudence.</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Risque blessure élevé</TableCell>
                              <TableCell><Badge className="bg-red-500">🚨 Critical</Badge></TableCell>
                              <TableCell>Attention aux scénarios agressifs.</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Chaleur forte</TableCell>
                              <TableCell><Badge className="bg-amber-500">⚠️ Warning</Badge></TableCell>
                              <TableCell>Adapter hydratation et pacing.</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-sm">
                            🎯 Ces garde-fous sont des <strong>recommandations</strong>. Le coach reste décisionnaire.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                {/* PRO Content */}
                <TabsContent value="pro" className="space-y-4">
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Version avancée intégrant <strong className="text-foreground">VLamax, TTE, FatMax et nutrition</strong>. 
                        Recommandée pour une analyse staff.
                      </p>
                    </CardContent>
                  </Card>

                  <Accordion type="multiple" defaultValue={["pro-requirements"]} className="space-y-3">
                    {/* Leçon 1: Données requises */}
                    <AccordionItem value="pro-requirements" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Layers className="h-4 w-4 text-purple-500" />
                          Leçon 1 : Données requises pour le mode PRO
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Donnée</TableHead>
                              <TableHead>Obligatoire</TableHead>
                              <TableHead>Impact si manquante</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>VLamax (discipline)</TableCell>
                              <TableCell><Badge className="bg-red-500">Critique</Badge></TableCell>
                              <TableCell>Dépendance glycolytique inconnue</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>TTE effectif</TableCell>
                              <TableCell><Badge className="bg-red-500">Critique</Badge></TableCell>
                              <TableCell>Point de rupture imprécis</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>FatMax TFCL™</TableCell>
                              <TableCell><Badge className="bg-amber-500">Important</Badge></TableCell>
                              <TableCell>Risque glycogène sous-estimé</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Nutrition (g/h)</TableCell>
                              <TableCell><Badge variant="outline">Optionnel</Badge></TableCell>
                              <TableCell>Valeur par défaut (60 g/h)</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm">
                            ⚠️ Si 2+ données manquantes → <strong>BASIC recommandé</strong>, PRO dégradé.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 2: Segments */}
                    <AccordionItem value="pro-segments" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          Leçon 2 : Analyse segment par segment
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <p>
                          La version PRO décompose la course en <strong className="text-foreground">segments (10% de la distance)</strong>. 
                          Pour chaque segment, l'app calcule un FuelRiskIndex et estime le glycogène restant.
                        </p>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Métrique</TableHead>
                              <TableHead>Plage</TableHead>
                              <TableHead>Signification</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>FuelRiskIndex</TableCell>
                              <TableCell>0–100</TableCell>
                              <TableCell>Risque d'épuisement glycogène</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Glycogène restant</TableCell>
                              <TableCell>0–100%</TableCell>
                              <TableCell>Réserves estimées</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Point de bascule</TableCell>
                              <TableCell>km X</TableCell>
                              <TableCell>Où le risque devient critique</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-sm">
                            🎯 <strong>Facteurs du FuelRiskIndex :</strong> Intensité &gt; FatMax (+20-40 pts), VLamax haute (+15-25 pts), 
                            TTE faible (+10-15 pts), Nutrition (-5 à -20 pts).
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 3: Scénarios */}
                    <AccordionItem value="pro-scenarios" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Scale className="h-4 w-4 text-green-500" />
                          Leçon 3 : Comparaison des 3 scénarios
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Scénario</TableHead>
                              <TableHead>Intensité</TableHead>
                              <TableHead>Risque</TableHead>
                              <TableHead>Succès</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>🛡️ Conservateur</TableCell>
                              <TableCell>-5% vs optimal</TableCell>
                              <TableCell><Badge className="bg-green-500">Faible</Badge></TableCell>
                              <TableCell>85–95%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>⚡ Optimal</TableCell>
                              <TableCell>Référence</TableCell>
                              <TableCell><Badge className="bg-amber-500">Modéré</Badge></TableCell>
                              <TableCell>70–85%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>🚀 Agressif</TableCell>
                              <TableCell>+5% vs optimal</TableCell>
                              <TableCell><Badge className="bg-red-500">Élevé</Badge></TableCell>
                              <TableCell>50–70%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Ce que chaque scénario affiche :</p>
                          <ul className="space-y-1 pl-4">
                            <li>• Temps estimé SOUS FORME DE PLAGE (ex: 3h05–3h15)</li>
                            <li>• Intensité cible (%FTP ou allure)</li>
                            <li>• Point de bascule (km où le risque augmente)</li>
                            <li>• Probabilité de succès</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Leçon 4: Nutrition */}
                    <AccordionItem value="pro-nutrition" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Apple className="h-4 w-4 text-amber-500" />
                          Leçon 4 : Intégration nutrition
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                        <p>
                          Les g/h planifiés sont intégrés dans le modèle Fuel & Risk. La nutrition <strong className="text-foreground">RÉDUIT</strong> 
                          le risque d'épuisement mais ne l'<strong className="text-foreground">ANNULE jamais</strong>.
                        </p>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Apport planifié</TableHead>
                              <TableHead>Réduction FuelRisk</TableHead>
                              <TableHead>Commentaire</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>&lt; 40 g/h</TableCell>
                              <TableCell>-5 pts</TableCell>
                              <TableCell>Insuffisant pour courses longues</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>60–80 g/h</TableCell>
                              <TableCell>-15 pts</TableCell>
                              <TableCell>Recommandé pour Ironman</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>&gt; 100 g/h</TableCell>
                              <TableCell>-20 pts max</TableCell>
                              <TableCell>Pas de bénéfice supplémentaire</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm">
                            ⚠️ Le modèle ne calcule PAS les grammes exacts nécessaires et ne prédit pas la tolérance gastrique.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
              </Tabs>

              {/* CTA */}
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => navigate("/race-simulation")} 
                  className="gap-2"
                  size="lg"
                >
                  <Target className="h-5 w-5" />
                  Accéder au Simulateur de Course
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="protocols">
            <div className="space-y-6">
              {/* Introduction */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Beaker className="w-5 h-5" />
                    </div>
                    Protocoles officiels TFCL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Ces protocoles standardisés permettent de calibrer les indicateurs physiologiques 
                    de Two For Coaching Lab™ avec une précision maximale. Ils sont conçus pour être 
                    réalisés sur le terrain par le coach et l'athlète.
                  </p>
                </CardContent>
              </Card>

              {/* Semaine de Référence TFCL */}
              <Card className="border-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate("/tfcl-testing-week")}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                      <Beaker className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Semaine de Référence TFCL</h3>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Programme de 7 jours pour calibrer la VLamax V2 Enhanced via les tests P30s, P60s, MAP 5min et TTE.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          P30s + P60s (Glycolytique)
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">
                          MAP 5min (Aérobie max)
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-orange-500/10 text-orange-600 border border-orange-500/20">
                          FTP + TTE (Durabilité)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Why Section */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="why" className="border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="h-4 w-4 text-primary" />
                      Pourquoi une Semaine de Référence ?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Problème :</strong> La VLamax V1 est estimée à partir de ratios indirects (FTP/Pmax). 
                      Cette méthode produit une incertitude de ±0.10 mmol/L/s, insuffisante pour un coaching de précision.
                    </p>
                    <p>
                      <strong className="text-foreground">Solution :</strong> La Semaine de Référence TFCL mesure directement les contributions 
                      glycolytique (P30s, P60s) et aérobie (MAP 5min), puis valide la durabilité (TTE). Résultat : une VLamax avec ±0.05 mmol/L/s d'incertitude.
                    </p>
                    <p>
                      <strong className="text-foreground">Impact :</strong> Zones d'intensité plus précises, nutrition prédictive fiable, 
                      recommandations d'entraînement contextualisées.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="validity" className="border rounded-lg bg-card mt-3">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-green-500" />
                      Conditions de validité
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Athlète reposé en début de semaine (pas de bloc intensif les 3 jours précédents)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Capteur de puissance calibré, environnement contrôlé (home trainer ou parcours plat)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Respect strict des protocoles d'échauffement et de récupération</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Qualité du protocole évaluée par le coach (1-5) pour pondérer la confiance</span>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="errors" className="border rounded-lg bg-card mt-3">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-orange-500" />
                      Erreurs fréquentes à éviter
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500">⚠️</span>
                        <span><strong>Sprint trop long :</strong> Partir trop fort sur le 60s → effondrement → P60s sous-estimée</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500">⚠️</span>
                        <span><strong>Cadence forcée :</strong> Cadence &gt;115 rpm non naturelle → biais glycolytique artificiel</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500">⚠️</span>
                        <span><strong>MAP irrégulière :</strong> Variabilité &gt;10% → test invalidé, à refaire</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500">⚠️</span>
                        <span><strong>TTE avec pacing agressif :</strong> Partir &gt;105% FTP → fatigue prématurée → TTE sous-estimé</span>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* CTA */}
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => navigate("/tfcl-testing-week")} 
                  className="gap-2"
                  size="lg"
                >
                  <Beaker className="h-5 w-5" />
                  Accéder à la Semaine de Référence TFCL
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: DÉCISION ROBUSTE */}
        </Tabs>
      </main>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  Search, 
  ChevronLeft, 
  BookOpen, 
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Users,
  Target,
  Shield,
  BarChart3,
  Settings,
  Bike,
  Footprints,
  CheckCircle2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { academySections, AcademySection, ContentBlock, TableData } from "@/data/academyContent";
import { loadAcademyHtml } from "@/lib/academy/academyDocxLoader";
import { useToast } from "@/hooks/use-toast";

export default function AcademyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [staffMode, setStaffMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxError, setDocxError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState("methodology");

  // Load DOCX content
  useEffect(() => {
    loadAcademyHtml()
      .then(setDocxHtml)
      .catch(() => setDocxError(true));
  }, []);

  // Filter sections based on search and staff mode
  const filteredSections = useMemo(() => {
    let sections = academySections;

    // Filter by staff level
    if (!staffMode) {
      sections = sections.filter((s) => s.level === "basic");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sections = sections.filter((section) => {
        // Match title
        if (section.title.toLowerCase().includes(query)) return true;
        // Match tags
        if (section.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
        // Match block content
        return section.blocks.some((block) => {
          if (typeof block.content === "string") {
            return block.content.toLowerCase().includes(query);
          }
          if (Array.isArray(block.content)) {
            return block.content.some((item) => item.toLowerCase().includes(query));
          }
          return false;
        });
      });
    }

    return sections;
  }, [staffMode, searchQuery]);

  // Copy to clipboard
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copié !", description: "Texte copié dans le presse-papier" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier", variant: "destructive" });
    }
  };

  // Render a content block
  const renderBlock = (block: ContentBlock, sectionId: string, blockIndex: number) => {
    // Skip staff-only blocks if not in staff mode
    if (block.staffOnly && !staffMode) return null;

    const blockId = `${sectionId}-${blockIndex}`;

    switch (block.type) {
      case "text":
        return (
          <div key={blockId} className="space-y-2">
            {block.title && (
              <h4 className="font-semibold text-foreground">{block.title}</h4>
            )}
            <p className="text-muted-foreground leading-relaxed">{block.content as string}</p>
          </div>
        );

      case "bullets":
        return (
          <div key={blockId} className="space-y-2">
            {block.title && (
              <h4 className="font-semibold text-foreground">{block.title}</h4>
            )}
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {(block.content as string[]).map((item, i) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        );

      case "table":
        const tableData = block.content as TableData;
        return (
          <div key={blockId} className="space-y-2">
            {block.title && (
              <h4 className="font-semibold text-foreground">{block.title}</h4>
            )}
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[600px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {tableData.headers.map((header, i) => (
                      <th key={i} className="text-left p-2 font-semibold text-foreground bg-muted/50">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      {row.map((cell, j) => (
                        <td key={j} className="p-2 text-muted-foreground">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "callout":
        const isStaffCallout = block.staffOnly;
        return (
          <Card 
            key={blockId} 
            className={`${isStaffCallout ? "border-amber-500/50 bg-amber-500/5" : "border-primary/30 bg-primary/5"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  {isStaffCallout ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    {block.title && (
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{block.title}</h4>
                        {isStaffCallout && (
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                            Staff
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-muted-foreground leading-relaxed">{block.content as string}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => handleCopy(block.content as string, blockId)}
                >
                  {copiedId === blockId ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Render section
  const renderSection = (section: AcademySection) => {
    // Filter blocks based on staff mode
    const visibleBlocks = section.blocks.filter(
      (block) => !block.staffOnly || staffMode
    );

    return (
      <AccordionItem key={section.id} value={section.id}>
        <AccordionTrigger className="hover:no-underline px-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="font-semibold text-left">{section.title}</span>
            {section.level === "staff" && (
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                Staff
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {section.tags.slice(0, 6).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            
            {/* Blocks */}
            <div className="space-y-4">
              {visibleBlocks.map((block, i) => renderBlock(block, section.id, i))}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  // Render Methodology Content (from MethodologyStaff component style)
  const renderMethodologyContent = () => (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-8">
      {/* Header principal */}
      <div className="glass-card p-6 border-primary/30 rounded-lg bg-card border">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">🧠 Méthodologie scientifique — Two For Coaching Lab</h1>
            <p className="text-muted-foreground">Référentiel officiel d'interprétation physiologique pour coachs et staff</p>
          </div>
        </div>
        <Separator className="my-4" />
        <p className="text-sm text-muted-foreground">
          Two For Coaching Lab est un laboratoire de performance destiné aux coachs et staffs d'endurance.
          L'application ne fournit pas de vérité absolue, mais des indicateurs physiologiques cohérents permettant de comprendre 
          comment un athlète produit, soutient et utilise son énergie selon son objectif.
          Toutes les analyses sont contextualisées, pondérées par la discipline et la distance, et conçues pour soutenir la décision humaine — jamais la remplacer.
        </p>
      </div>

      {/* Messages clés - Positionnement */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            ⚡ Messages clés à retenir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Race Readiness est un outil staff</strong>, pondéré par l'objectif de course
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">VLamax et TTE n'ont pas de valeur universelle</strong> — ils dépendent du sport et de l'objectif
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Vélo et course à pied</strong> obéissent à des logiques physiologiques différentes
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Two For Coaching Lab structure la décision du coach</strong>, il ne la remplace pas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1 : Race Readiness */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            🎯 Race Readiness — Score de préparation pondéré
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              Le score Race Readiness combine quatre dimensions physiologiques pour estimer la capacité de l'athlète 
              à performer sur son objectif de course. <strong className="text-foreground">Ce n'est pas un prédicteur de performance</strong>, 
              mais un indicateur de cohérence entre le profil physiologique actuel et les exigences de l'objectif.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Composantes du score</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">VLamax (Moteur glycolytique)</p>
                <p className="text-xs text-muted-foreground mt-1">Capacité anaérobie lactique — doit être dans la plage cible</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">TTE (Endurance au seuil)</p>
                <p className="text-xs text-muted-foreground mt-1">Time To Exhaustion — temps tenable à FTP/CSS</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">FTP/kg (Puissance relative)</p>
                <p className="text-xs text-muted-foreground mt-1">Puissance ou allure au seuil rapportée au poids</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">Fraîcheur</p>
                <p className="text-xs text-muted-foreground mt-1">État de fatigue, séance spécifique validée</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Pondération par objectif</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Le poids de chaque composante varie selon l'objectif. Un Ironman valorise davantage l'endurance (TTE) 
              et un VLamax bas, tandis qu'un 70.3 privilégie la puissance relative.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-foreground">Objectif</th>
                    <th className="text-center py-2 px-2 text-foreground">VLamax</th>
                    <th className="text-center py-2 px-2 text-foreground">TTE</th>
                    <th className="text-center py-2 px-2 text-foreground">FTP/kg</th>
                    <th className="text-center py-2 px-2 text-foreground">Fraîcheur</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">Ironman / Ultra</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">70.3 / Half</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">Marathon / Semi</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">35%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">15%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Trail</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">35%</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Interprétation</strong> : Un score de 75 pour un Ironman et un score de 75 pour un 70.3 
              ne signifient pas la même chose. Le score est <strong className="text-foreground">relatif à l'objectif déclaré</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 : VLamax */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            ⚡ VLamax — Capacité glycolytique maximale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              VLamax (mmol/L/s) représente la vitesse maximale de production de lactate par la voie glycolytique. 
              C'est un indicateur du "moteur anaérobie" de l'athlète. Une VLamax élevée favorise les efforts courts et intenses, 
              une VLamax basse favorise l'endurance et l'économie métabolique.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Plages cibles selon l'objectif</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="font-medium text-foreground text-sm">Ironman / Ultra-endurance</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.40 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="font-medium text-foreground text-sm">70.3 / Half Distance</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.45 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="font-medium text-foreground text-sm">Marathon / Semi-marathon</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.30 – 0.50 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="font-medium text-foreground text-sm">Trail</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.45 mmol/L/s</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border space-y-4">
            <h4 className="font-semibold text-foreground mb-2">💡 Pourquoi la VLamax n'est pas saisissable directement ?</h4>
            <p className="text-sm text-muted-foreground">
              La VLamax est une donnée physiologique complexe qui doit soit être <strong className="text-foreground">mesurée en laboratoire</strong>, 
              soit <strong className="text-foreground">estimée à partir de tests de terrain</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Pour garantir la <strong className="text-foreground">cohérence et la fiabilité</strong> des analyses, 
              Two For Coaching Lab calcule automatiquement la VLamax à partir des données du snapshot (FTP, Pmax 5s, poids).
            </p>
            <p className="text-sm text-muted-foreground">
              En <strong className="text-foreground">mode Staff</strong>, il est possible de renseigner une VLamax mesurée (lactate) qui devient alors la référence principale.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-semibold text-foreground mb-3">🔒 Hiérarchie des sources VLamax</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  #1
                </Badge>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">VLamax mesurée (lactate)</strong> — Confiance ~95% • Mode Staff uniquement
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  #2
                </Badge>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Test terrain structuré</strong> — Confiance ~75% • Sprint 15s, all-out, ramp test
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                  #3
                </Badge>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Estimation via snapshot</strong> — Confiance ~55% • Basée sur FTP/kg et Pmax
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-muted text-muted-foreground shrink-0">
                  #4
                </Badge>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Valeur par défaut</strong> — Confiance faible • Avertissement affiché
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Attention</strong> : Une VLamax "trop basse" peut indiquer un manque de capacité à relancer, 
              problématique en trail ou en course avec variations de rythme. L'optimum dépend du profil de course.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3 : TTE */}
      <Card className="border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Info className="w-5 h-5" />
            </div>
            ⏱️ TTE — Time To Exhaustion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              Le TTE (Time To Exhaustion) représente le temps maximal théorique qu'un athlète peut tenir à son seuil fonctionnel 
              (FTP en vélo, CSS en natation, allure seuil en course à pied). C'est un marqueur clé de l'endurance au seuil.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Cibles selon l'objectif</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Ironman</p>
                <p className="font-bold text-foreground">55+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">70.3</p>
                <p className="font-bold text-foreground">50+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Marathon</p>
                <p className="font-bold text-foreground">50+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Trail</p>
                <p className="font-bold text-foreground">55+ min</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <h4 className="font-semibold text-foreground mb-2">💡 TTE Effectif</h4>
            <p className="text-sm text-muted-foreground">
              Le TTE Effectif est calculé soit à partir d'une observation directe (test terrain ou course), 
              soit estimé via un modèle basé sur la charge d'entraînement (TSS/7j) et le profil métabolique.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">📊 Méthode PRO</strong> : Lorsque le mode TTE Pro est activé, 
              le calcul intègre le modèle de Dan Lorang pour une estimation plus précise basée sur VLamax et VO2max.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4 : Vélo vs Course à pied */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bike className="w-5 h-5" />
            </div>
            🚴‍♂️ Vélo vs 🏃‍♂️ Course à pied — Comprendre les différences physiologiques clés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">1️⃣</span> Le vélo et la course à pied ne sollicitent pas le métabolisme de la même façon
            </h4>
            <p className="text-muted-foreground text-sm">
              Dans Two For Coaching Lab, les indicateurs VLamax, TTE et Race Readiness doivent toujours être interprétés 
              en tenant compte du sport pratiqué.
            </p>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 mt-3">
              <p className="text-sm text-foreground font-medium">
                ➡️ Une même valeur physiologique n'a PAS la même signification en vélo et en course à pied.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">2️⃣</span> Économie de mouvement : la grande différence clé
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bike className="w-5 h-5 text-primary" />
                  <h5 className="font-semibold text-foreground">Vélo</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Mouvement contraint, mécanique et très stable</li>
                  <li>• Rendement élevé et mesurable directement via la puissance</li>
                  <li>• L'économie est principalement liée au rendement neuromusculaire et au positionnement</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-primary/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ Le vélo est un sport <strong>hautement prédictible</strong> physiologiquement
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Footprints className="w-5 h-5 text-accent" />
                  <h5 className="font-semibold text-foreground">Course à pied</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Mouvement libre, impactant, très dépendant de la technique</li>
                  <li>• L'économie de course varie énormément entre deux athlètes au même VO₂max</li>
                  <li>• La fatigue musculaire et tendineuse joue un rôle majeur</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-accent/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ En CAP, <strong>l'économie de course est souvent plus déterminante</strong> que le VO₂max ou le VLamax
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-muted-foreground italic text-center">
              "Les modèles physiologiques sont plus robustes en vélo qu'en course à pied.<br />
              Two For Coaching Lab adapte donc ses interprétations pour respecter la réalité du terrain."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Indice de Confiance */}
      <Card className="border-success/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <Shield className="w-5 h-5" />
            </div>
            🔬 Indice de confiance – Définition et usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p className="text-sm">
            L'indice de confiance indique le <strong className="text-foreground">niveau de fiabilité scientifique</strong> des valeurs affichées (VLamax, TTE, Race Readiness).
            Il ne mesure pas la performance de l'athlète, mais la <strong className="text-foreground">qualité des données</strong> utilisées pour produire l'analyse.
          </p>
          
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              <strong className="text-foreground">Une valeur élevée signifie</strong> que le résultat repose sur :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>des tests terrain structurés,</li>
              <li>des protocoles connus,</li>
              <li>ou des snapshots complets et cohérents.</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm">
              <strong className="text-foreground">Une valeur plus faible indique</strong> que la donnée est :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>estimée indirectement,</li>
              <li>ou calculée à partir de modèles physiologiques et de charge d'entraînement.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Zones Théoriques Content (from academyContent)
  const renderZonesContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher : SV2, Z4a, force, VLaMax..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {["Z4a", "Z4b", "SV1", "SV2", "VLaMax", "Force", "Zones"].map((tag) => (
          <Badge
            key={tag}
            variant={searchQuery === tag ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSearchQuery(searchQuery === tag ? "" : tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Sections */}
      {filteredSections.length > 0 ? (
        <Accordion type="multiple" className="space-y-2">
          {filteredSections.map(renderSection)}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Aucun résultat pour "{searchQuery}"
            </p>
            <Button
              variant="link"
              onClick={() => setSearchQuery("")}
              className="mt-2"
            >
              Effacer la recherche
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Source Document Section */}
      <div className="mt-8">
        <Accordion type="single" collapsible>
          <AccordionItem value="source-doc">
            <AccordionTrigger className="px-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Document source (DOCX)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Document brut — formatage automatique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {docxError ? (
                    <p className="text-muted-foreground text-sm">
                      Document source indisponible. Les sections structurées ci-dessus restent accessibles.
                    </p>
                  ) : docxHtml ? (
                    <ScrollArea className="h-[400px]">
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: docxHtml }}
                      />
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-sm">Chargement...</p>
                  )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h1 className="font-bold text-lg">Academy</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Staff Mode Toggle */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-500" />
                <div>
                  <Label htmlFor="staff-mode" className="font-semibold">Mode Staff</Label>
                  <p className="text-xs text-muted-foreground">
                    Affiche les définitions et points de vigilance avancés
                  </p>
                </div>
              </div>
              <Switch
                id="staff-mode"
                checked={staffMode}
                onCheckedChange={setStaffMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="methodology" className="gap-2">
              <Settings className="w-4 h-4" />
              Méthodologie
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Zones & Seuils
            </TabsTrigger>
          </TabsList>

          <TabsContent value="methodology">
            {renderMethodologyContent()}
          </TabsContent>

          <TabsContent value="zones">
            {renderZonesContent()}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

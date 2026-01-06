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
  Users
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
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* Staff Mode Toggle */}
          <Card>
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
      </main>
    </div>
  );
}

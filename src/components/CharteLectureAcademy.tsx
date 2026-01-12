// =============================================
// COMPOSANT ACADEMY - CHARTE DE LECTURE T4C
// Affiche la charte officielle dans l'Academy
// =============================================

import { useState } from "react";
import { 
  BookOpen, 
  Target, 
  BarChart3, 
  Microscope, 
  Scale, 
  Crosshair,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  CHARTE_SECTIONS,
  CHARTE_MODULES,
  CHARTE_PREAMBLE,
  CHARTE_CRITICAL_MESSAGE,
  type CharteSection,
  type CharteModule
} from "@/data/charteInterpretation";

// =============================================
// ICONS MAPPING
// =============================================

const SECTION_ICONS: Record<string, React.ReactNode> = {
  preambule: <Target className="w-5 h-5" />,
  ranges: <BarChart3 className="w-5 h-5" />,
  confidence: <Microscope className="w-5 h-5" />,
  sources: <Scale className="w-5 h-5" />,
  scores: <Scale className="w-5 h-5" />,
  targets: <Crosshair className="w-5 h-5" />,
  capabilities: <ClipboardList className="w-5 h-5" />,
};

// =============================================
// SECTION CARD COMPONENT
// =============================================

interface SectionCardProps {
  section: CharteSection;
}

function SectionCard({ section }: SectionCardProps) {
  return (
    <AccordionItem value={section.id} className="border rounded-lg bg-card">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {SECTION_ICONS[section.id] || <BookOpen className="w-5 h-5" />}
          </div>
          <span className="font-semibold text-left">
            {section.icon} {section.title}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* Content */}
          <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
            {section.content}
          </p>
          
          {/* Key Message */}
          {section.keyMessage && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-foreground font-medium text-sm flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  {section.keyMessage}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Examples */}
          {section.examples && section.examples.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Exemples :</p>
              <ul className="space-y-1">
                {section.examples.map((example, idx) => (
                  <li key={idx} className="text-xs font-mono text-foreground bg-background rounded px-2 py-1">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// =============================================
// MODULE CARD COMPONENT
// =============================================

interface ModuleCardProps {
  module: CharteModule;
  defaultOpen?: boolean;
}

function ModuleCard({ module, defaultOpen = false }: ModuleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="border-border bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {module.metricId}
                </Badge>
                {module.title}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Concept Physio */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">📚 Concept physiologique</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {module.conceptPhysio}
              </p>
            </div>
            
            <Separator />
            
            {/* How T4C Uses */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">🔧 Comment T4C l'utilise</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {module.howT4CUses}
              </p>
            </div>
            
            <Separator />
            
            {/* What it means / doesn't mean */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">✅ Ce que cela signifie</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {module.whatItMeans}
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">❌ Ce que cela ne signifie PAS</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {module.whatItDoesNotMean}
                </p>
              </div>
            </div>
            
            {/* Common Errors */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Erreurs d'interprétation fréquentes
              </h4>
              <ul className="space-y-1">
                {module.commonErrors.map((error, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            {/* Coach Usage */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">👨‍🏫 Usage coach</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {module.coachUsage}
              </p>
            </div>
            
            {/* Scientific Limits */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">⚗️ Limites scientifiques</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {module.scientificLimits}
              </p>
            </div>
            
            {/* Charte Reference */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-xs text-primary font-medium italic">
                  "{module.charteReference}"
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function CharteLectureAcademy() {
  return (
    <div className="space-y-6">
      {/* Header - Critical Message */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                📖 Comment lire un rapport Two For Coaching Lab
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {CHARTE_PREAMBLE.split('\n')[0]}
              </p>
              <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    ⚠️ {CHARTE_CRITICAL_MESSAGE}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charte Sections */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Principes fondamentaux
        </h3>
        <Accordion type="multiple" defaultValue={["preambule", "ranges"]} className="space-y-3">
          {CHARTE_SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </Accordion>
      </div>

      {/* Separator */}
      <Separator className="my-8" />

      {/* Charte Modules */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Microscope className="w-5 h-5 text-primary" />
          Modules par métrique
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Chaque métrique de l'application suit la structure de la charte. Cliquez sur un module pour voir le détail.
        </p>
        <div className="space-y-3">
          {CHARTE_MODULES.map((module, idx) => (
            <ModuleCard key={module.id} module={module} defaultOpen={idx === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CharteLectureAcademy;

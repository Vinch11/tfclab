// =============================================
// GLOSSAIRE CONTEXTUEL - TOOLTIP
// Affiche une définition au survol d'un terme
// =============================================

import { HelpCircle, BookOpen, ChevronRight } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGlossaryTerm, type GlossaryTerm } from "@/data/glossaryDefinitions";
import { useNavigate } from "react-router-dom";

// =============================================
// PROPS
// =============================================

interface GlossaryTooltipProps {
  termId: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

// =============================================
// CATEGORY BADGE COLORS
// =============================================

const CATEGORY_COLORS: Record<GlossaryTerm["category"], string> = {
  physiological: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  performance: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  training: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  metabolic: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

const CATEGORY_LABELS: Record<GlossaryTerm["category"], string> = {
  physiological: "Physiologie",
  performance: "Performance",
  training: "Entraînement",
  metabolic: "Métabolisme",
};

// =============================================
// MAIN COMPONENT
// =============================================

export function GlossaryTooltip({
  termId,
  children,
  showIcon = true,
  className = "",
}: GlossaryTooltipProps) {
  const navigate = useNavigate();
  const term = getGlossaryTerm(termId);

  if (!term) {
    // Si le terme n'existe pas, afficher juste le contenu sans tooltip
    return <>{children}</>;
  }

  const handleOpenAcademy = () => {
    navigate(`/academy?section=${termId}`);
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 cursor-help border-b border-dashed border-muted-foreground/50 hover:border-primary transition-colors ${className}`}
        >
          {children || term.term}
          {showIcon && (
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">{term.term}</h4>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-normal ${CATEGORY_COLORS[term.category]}`}
              >
                {CATEGORY_LABELS[term.category]}
              </Badge>
            </div>
          </div>

          {/* Short definition */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {term.shortDefinition}
          </p>

          {/* Example if available */}
          {term.example && (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Ex:</span> {term.example}
              </p>
            </div>
          )}

          {/* Related terms */}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {term.relatedTerms.slice(0, 3).map((related) => (
                <Badge 
                  key={related} 
                  variant="secondary" 
                  className="text-[10px] font-normal"
                >
                  {related}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs justify-between"
            onClick={handleOpenAcademy}
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              En savoir plus
            </span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// =============================================
// INLINE VARIANT (pour texte)
// =============================================

interface GlossaryInlineProps {
  termId: string;
  label?: string;
}

export function GlossaryInline({ termId, label }: GlossaryInlineProps) {
  const term = getGlossaryTerm(termId);
  if (!term) return <span>{label || termId}</span>;

  return (
    <GlossaryTooltip termId={termId} showIcon={false}>
      {label || term.term}
    </GlossaryTooltip>
  );
}

export default GlossaryTooltip;

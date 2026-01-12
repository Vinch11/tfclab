// =============================================
// BOUTON "COMMENT LIRE CE SCORE ?"
// Ouvre la section Academy correspondante
// =============================================

import { useState } from "react";
import { HelpCircle, BookOpen, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { 
  getCharteModuleContent, 
  CHARTE_CRITICAL_MESSAGE,
  type CharteModule 
} from "@/data/charteInterpretation";

// =============================================
// PROPS
// =============================================

interface MetricHelpButtonProps {
  metricId: string;
  variant?: "icon" | "button" | "link";
  size?: "sm" | "md";
  className?: string;
}

// =============================================
// QUICK HELP DIALOG CONTENT
// =============================================

interface QuickHelpContentProps {
  module: CharteModule;
  onOpenAcademy: () => void;
}

function QuickHelpContent({ module, onOpenAcademy }: QuickHelpContentProps) {
  return (
    <div className="space-y-4">
      {/* Key Message */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            ⚠️ {CHARTE_CRITICAL_MESSAGE}
          </p>
        </CardContent>
      </Card>

      {/* What it means */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">✅ Ce que cela signifie</h4>
        <p className="text-sm text-muted-foreground">{module.whatItMeans}</p>
      </div>

      {/* What it doesn't mean */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">❌ Ce que cela ne signifie PAS</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{module.whatItDoesNotMean}</p>
      </div>

      <Separator />

      {/* Common Errors (top 2) */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">🚫 Erreurs fréquentes</h4>
        <ul className="space-y-1">
          {module.commonErrors.slice(0, 2).map((error, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-amber-500">•</span>
              {error}
            </li>
          ))}
        </ul>
      </div>

      {/* Charte Reference */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <p className="text-xs text-primary italic">
            "{module.charteReference}"
          </p>
        </CardContent>
      </Card>

      {/* Link to Academy */}
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={onOpenAcademy}
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Voir le module complet dans l'Academy
        <ExternalLink className="w-3 h-3 ml-2" />
      </Button>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function MetricHelpButton({ 
  metricId, 
  variant = "icon", 
  size = "sm",
  className = "" 
}: MetricHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const module = getCharteModuleContent(metricId);
  
  if (!module) {
    return null;
  }

  const handleOpenAcademy = () => {
    setIsOpen(false);
    navigate(`/academy?section=${metricId}`);
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {variant === "icon" ? (
              <Button
                variant="ghost"
                size="icon"
                className={`${buttonSize} text-muted-foreground hover:text-primary ${className}`}
                onClick={() => setIsOpen(true)}
              >
                <HelpCircle className={iconSize} />
              </Button>
            ) : variant === "button" ? (
              <Button
                variant="outline"
                size="sm"
                className={`text-xs ${className}`}
                onClick={() => setIsOpen(true)}
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Comment lire ?
              </Button>
            ) : (
              <button
                className={`text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline flex items-center gap-1 ${className}`}
                onClick={() => setIsOpen(true)}
              >
                <HelpCircle className="w-3 h-3" />
                Comment lire ce score ?
              </button>
            )}
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Comment interpréter cette métrique ?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {module.metricId}
              </Badge>
              <DialogTitle className="text-lg">{module.title}</DialogTitle>
            </div>
            <DialogDescription>
              Guide d'interprétation selon la charte Two For Coaching Lab
            </DialogDescription>
          </DialogHeader>
          <QuickHelpContent module={module} onOpenAcademy={handleOpenAcademy} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MetricHelpButton;

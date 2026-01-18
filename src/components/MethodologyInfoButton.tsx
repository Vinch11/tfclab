/**
 * MethodologyInfoButton — Bouton d'information méthodologique TFCL™
 * 
 * Affiche une icône "ⓘ Méthodologie" qui ouvre un drawer/popover avec :
 * - Version actuelle du moteur
 * - Résumé scientifique
 * - Limites connues
 * - Lien vers Academy
 */

import { useState } from "react";
import { Info, BookOpen, AlertTriangle, FlaskConical, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  getEngineVersion, 
  getValidationBadge,
  VALIDATION_LEVELS,
  LEGAL_DISCLAIMER,
  type EngineId 
} from "@/lib/v2/physiologicalVersioning";
import { useIsMobile } from "@/hooks/use-mobile";

interface MethodologyInfoButtonProps {
  engineId: EngineId;
  className?: string;
  variant?: "icon" | "badge" | "inline";
  showLabel?: boolean;
}

export function MethodologyInfoButton({ 
  engineId, 
  className,
  variant = "icon",
  showLabel = false
}: MethodologyInfoButtonProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  const engine = getEngineVersion(engineId);
  const validationBadge = getValidationBadge(engineId);
  
  const content = (
    <div className="space-y-4">
      {/* Header avec version et badge */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">{engine.versionCode}</h4>
          <p className="text-xs text-muted-foreground">Mis à jour le {engine.date}</p>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs", validationBadge.color, validationBadge.bgColor)}
        >
          {validationBadge.icon} {validationBadge.label}
        </Badge>
      </div>
      
      <Separator />
      
      {/* Description */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" />
          Méthodologie
        </h5>
        <p className="text-xs text-muted-foreground">
          {engine.descriptionShort}
        </p>
        {engine.formula && (
          <div className="p-2 bg-muted/50 rounded text-[10px] font-mono overflow-x-auto">
            {engine.formula}
          </div>
        )}
      </div>
      
      {/* Hypothèses */}
      {engine.hypotheses.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium">Hypothèses</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            {engine.hypotheses.map((h, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-primary shrink-0">•</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Limites */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          Limites connues
        </h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          {engine.limits.map((l, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-amber-500 shrink-0">⚠</span>
              {l}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Confiance */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Plage de confiance</span>
          <span className="font-mono font-medium">
            {Math.round(engine.confidenceRange[0] * 100)}% – {Math.round(engine.confidenceRange[1] * 100)}%
          </span>
        </div>
      </div>
      
      {/* Références */}
      {engine.references.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Références scientifiques
          </h5>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            {engine.references.slice(0, 3).map((ref, i) => (
              <li key={i} className="text-[10px]">
                <span className="font-medium">{ref.authors}</span> ({ref.year})
                {ref.journal && <span className="italic"> — {ref.journal}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="p-2 bg-muted/20 rounded border border-dashed text-[10px] text-muted-foreground">
        {LEGAL_DISCLAIMER.short}
      </div>
    </div>
  );

  // Bouton trigger
  const trigger = variant === "badge" ? (
    <Button 
      variant="ghost" 
      size="sm"
      className={cn("h-auto p-1.5 gap-1 text-xs", className)}
    >
      <Info className="w-3.5 h-3.5" />
      {showLabel && <span>Méthodologie</span>}
    </Button>
  ) : variant === "inline" ? (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
        className
      )}
    >
      <Info className="w-3 h-3" />
      {showLabel && <span>{engine.versionCode}</span>}
    </span>
  ) : (
    <Button 
      variant="ghost" 
      size="icon" 
      className={cn("h-6 w-6", className)}
    >
      <Info className="w-4 h-4 text-muted-foreground" />
    </Button>
  );

  // Mobile: Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Méthodologie
            </DrawerTitle>
            <DrawerDescription>
              Détails du moteur de calcul {engine.versionCode}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 max-h-[60vh]">
            {content}
          </ScrollArea>
          <DrawerFooter>
            <Button variant="outline" className="gap-2" asChild>
              <a href="/academy" onClick={() => setOpen(false)}>
                <BookOpen className="w-4 h-4" />
                Voir dans Academy
                <ChevronRight className="w-4 h-4" />
              </a>
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost">Fermer</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <ScrollArea className="max-h-[400px] pr-2">
          {content}
        </ScrollArea>
        <Separator className="my-3" />
        <Button variant="outline" size="sm" className="w-full gap-2" asChild>
          <a href="/academy">
            <BookOpen className="w-4 h-4" />
            Voir dans Academy
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// =============================================
// BADGE COMPACT DE VALIDATION
// =============================================

interface ValidationBadgeProps {
  engineId: EngineId;
  showLabel?: boolean;
  className?: string;
}

export function ValidationBadge({ engineId, showLabel = true, className }: ValidationBadgeProps) {
  const badge = getValidationBadge(engineId);
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full",
        badge.bgColor,
        badge.color,
        className
      )}
      title={badge.description}
    >
      {badge.icon}
      {showLabel && <span>{badge.label}</span>}
    </span>
  );
}

// =============================================
// INLINE VERSION TAG
// =============================================

interface VersionTagProps {
  engineId: EngineId;
  className?: string;
}

export function VersionTag({ engineId, className }: VersionTagProps) {
  const engine = getEngineVersion(engineId);
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono",
        className
      )}
    >
      {engine.versionCode}
    </span>
  );
}

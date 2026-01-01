// =============================================
// VLAMAX BADGE - Affichage unifié de VLamax Effectif
// =============================================

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, FlaskConical, Camera, Calculator, HelpCircle } from "lucide-react";
import { 
  VLamaxEffectif, 
  VLamaxSource,
  getSourceColor, 
  getSourceBgColor, 
  getConfidenceColor,
  getConfidenceLabel,
  formatVLamaxDisplay 
} from "@/lib/vlamax-effectif";

interface VLamaxBadgeProps {
  vlamax: VLamaxEffectif;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

function getSourceIcon(source: VLamaxSource) {
  switch (source) {
    case "test":
      return <FlaskConical className="h-3 w-3" />;
    case "snapshot":
      return <Camera className="h-3 w-3" />;
    case "estimé":
      return <Calculator className="h-3 w-3" />;
    case "inconnu":
      return <HelpCircle className="h-3 w-3" />;
    default:
      return <Info className="h-3 w-3" />;
  }
}

export function VLamaxBadge({ vlamax, showDetails = true, size = "md" }: VLamaxBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };

  if (vlamax.value === null) {
    return (
      <Badge variant="outline" className={`${sizeClasses[size]} text-muted-foreground`}>
        VLamax inconnu
      </Badge>
    );
  }

  const badge = (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} ${getSourceBgColor(vlamax.source)} ${getSourceColor(vlamax.source)} border-current/20 gap-1.5`}
    >
      {getSourceIcon(vlamax.source)}
      <span className="font-mono font-semibold">{formatVLamaxDisplay(vlamax)}</span>
      <span className="opacity-70 text-[0.85em]">mmol/L/s</span>
    </Badge>
  );

  if (!showDetails) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getSourceIcon(vlamax.source)}
              <span className="font-medium">{vlamax.label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Confiance:</span>
              <span className={getConfidenceColor(vlamax.confidence)}>
                {Math.round(vlamax.confidence * 100)}% ({getConfidenceLabel(vlamax.confidence)})
              </span>
            </div>
            {vlamax.details && (
              <p className="text-xs text-muted-foreground">{vlamax.details}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Version inline pour affichage simple
interface VLamaxInlineProps {
  vlamax: VLamaxEffectif;
  showSource?: boolean;
}

export function VLamaxInline({ vlamax, showSource = true }: VLamaxInlineProps) {
  if (vlamax.value === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono font-semibold">{formatVLamaxDisplay(vlamax)}</span>
      {showSource && (
        <span className={`text-xs ${getSourceColor(vlamax.source)}`}>
          ({vlamax.label})
        </span>
      )}
    </span>
  );
}

// Version détaillée pour cards
interface VLamaxCardDisplayProps {
  vlamax: VLamaxEffectif;
  title?: string;
}

export function VLamaxCardDisplay({ vlamax, title = "VLamax Effectif" }: VLamaxCardDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <VLamaxBadge vlamax={vlamax} size="sm" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono">
          {vlamax.value !== null ? formatVLamaxDisplay(vlamax) : "—"}
        </span>
        <span className="text-sm text-muted-foreground">mmol/L/s</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`${getSourceBgColor(vlamax.source)} ${getSourceColor(vlamax.source)} px-2 py-0.5 rounded-full`}>
          {vlamax.label}
        </span>
        <span className={getConfidenceColor(vlamax.confidence)}>
          {getConfidenceLabel(vlamax.confidence)}
        </span>
      </div>
    </div>
  );
}

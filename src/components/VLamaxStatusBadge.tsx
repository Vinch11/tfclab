// =============================================
// VLAMAX STATUS BADGE - Composant unifié réutilisable
// Affiche VLamax, source et confiance de manière cohérente
// =============================================

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FlaskConical, Camera, Calculator, HelpCircle, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VLamaxEffectif, VLamaxSource } from "@/lib/vlamaxEffectif";

// =============================================
// HELPERS UI
// =============================================

function getSourceIcon(source: VLamaxSource, className?: string) {
  const iconClass = cn("shrink-0", className);
  switch (source) {
    case "test":
      return <FlaskConical className={iconClass} />;
    case "snapshot":
      return <Camera className={iconClass} />;
    case "estimated":
      return <Calculator className={iconClass} />;
    case "unknown":
      return <HelpCircle className={iconClass} />;
    default:
      return <TrendingUp className={iconClass} />;
  }
}

function getSourceColor(source: VLamaxSource): string {
  switch (source) {
    case "test":
      return "text-emerald-600 dark:text-emerald-400";
    case "snapshot":
      return "text-blue-600 dark:text-blue-400";
    case "estimated":
      return "text-amber-600 dark:text-amber-400";
    case "unknown":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

function getSourceBgColor(source: VLamaxSource): string {
  switch (source) {
    case "test":
      return "bg-emerald-100 dark:bg-emerald-900/30";
    case "snapshot":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "estimated":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "unknown":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-emerald-600 dark:text-emerald-400";
  if (confidence >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Très fiable";
  if (confidence >= 0.6) return "Fiable";
  if (confidence >= 0.4) return "Modéré";
  if (confidence >= 0.2) return "Faible";
  return "Très faible";
}

function getConfidenceIcon(confidence: number, className?: string) {
  const iconClass = cn("shrink-0", className);
  if (confidence >= 0.6) return <CheckCircle className={cn(iconClass, "text-emerald-500")} />;
  if (confidence >= 0.4) return <TrendingUp className={cn(iconClass, "text-amber-500")} />;
  return <AlertTriangle className={cn(iconClass, "text-red-500")} />;
}

function formatVLamaxValue(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}

function getSourceLabel(source: VLamaxSource): string {
  switch (source) {
    case "test":
      return "Test terrain";
    case "snapshot":
      return "Snapshot";
    case "estimated":
      return "Estimé";
    case "unknown":
      return "Inconnu";
    default:
      return source;
  }
}

// =============================================
// COMPOSANTS
// =============================================

interface VLamaxStatusBadgeProps {
  vlamax: VLamaxEffectif;
  showTooltip?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "badge" | "inline" | "compact";
  className?: string;
}

/**
 * Badge unifié pour afficher VLamax avec source et confiance
 */
export function VLamaxStatusBadge({ 
  vlamax, 
  showTooltip = true, 
  size = "md",
  variant = "badge",
  className 
}: VLamaxStatusBadgeProps) {
  const sizeClasses = {
    xs: { badge: "text-[10px] px-1.5 py-0.5 gap-1", icon: "h-2.5 w-2.5", value: "text-[10px]" },
    sm: { badge: "text-xs px-2 py-0.5 gap-1", icon: "h-3 w-3", value: "text-xs" },
    md: { badge: "text-sm px-2.5 py-1 gap-1.5", icon: "h-3.5 w-3.5", value: "text-sm" },
    lg: { badge: "text-base px-3 py-1.5 gap-2", icon: "h-4 w-4", value: "text-base" }
  };

  const sizes = sizeClasses[size];

  // Cas null
  if (vlamax.value === null) {
    return (
      <Badge variant="outline" className={cn(sizes.badge, "text-muted-foreground", className)}>
        {getSourceIcon(vlamax.source, sizes.icon)}
        <span>VLamax inconnue</span>
      </Badge>
    );
  }

  // Variante compact (juste valeur + icône source)
  if (variant === "compact") {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {getSourceIcon(vlamax.source, cn(sizes.icon, getSourceColor(vlamax.source)))}
        <span className={cn("font-mono font-semibold", sizes.value)}>
          {formatVLamaxValue(vlamax.value)}
        </span>
      </span>
    );
  }

  // Variante inline (valeur + source text)
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("font-mono font-semibold", sizes.value)}>
          {formatVLamaxValue(vlamax.value)}
        </span>
        <span className={cn("text-xs px-1.5 py-0.5 rounded", getSourceBgColor(vlamax.source), getSourceColor(vlamax.source))}>
          {getSourceLabel(vlamax.source)}
        </span>
      </span>
    );
  }

  // Construire le texte des détails
  const detailsText = vlamax.details 
    ? [vlamax.details.testName, vlamax.details.protocol, vlamax.details.date].filter(Boolean).join(" • ")
    : null;

  // Badge complet
  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        sizes.badge,
        getSourceBgColor(vlamax.source), 
        getSourceColor(vlamax.source), 
        "border-current/20",
        className
      )}
    >
      {getSourceIcon(vlamax.source, sizes.icon)}
      <span className="font-mono font-semibold">{formatVLamaxValue(vlamax.value)}</span>
      <span className="opacity-70 text-[0.85em]">mmol/L/s</span>
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getSourceIcon(vlamax.source, "h-4 w-4")}
              <span className="font-medium">{vlamax.label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {getConfidenceIcon(vlamax.confidence, "h-4 w-4")}
              <span className="text-muted-foreground">Confiance:</span>
              <span className={getConfidenceColor(vlamax.confidence)}>
                {Math.round(vlamax.confidence * 100)}% ({getConfidenceLabel(vlamax.confidence)})
              </span>
            </div>
            {detailsText && (
              <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
                {detailsText}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================
// VARIANTES SPÉCIALISÉES
// =============================================

interface VLamaxCardDisplayProps {
  vlamax: VLamaxEffectif;
  title?: string;
  showConfidenceBar?: boolean;
  className?: string;
}

/**
 * Affichage carte détaillé pour VLamax
 */
export function VLamaxCardDisplay({ 
  vlamax, 
  title = "VLamax Effectif",
  showConfidenceBar = true,
  className 
}: VLamaxCardDisplayProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <VLamaxStatusBadge vlamax={vlamax} size="sm" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono">
          {formatVLamaxValue(vlamax.value)}
        </span>
        <span className="text-sm text-muted-foreground">mmol/L/s</span>
      </div>
      {showConfidenceBar && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                vlamax.confidence >= 0.6 ? "bg-emerald-500" : 
                vlamax.confidence >= 0.4 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${vlamax.confidence * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={cn(
              "px-1.5 py-0.5 rounded",
              getSourceBgColor(vlamax.source),
              getSourceColor(vlamax.source)
            )}>
              {getSourceLabel(vlamax.source)}
            </span>
            <span className={getConfidenceColor(vlamax.confidence)}>
              {getConfidenceLabel(vlamax.confidence)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface VLamaxMetricRowProps {
  vlamax: VLamaxEffectif;
  className?: string;
}

/**
 * Ligne métrique compacte pour dashboards
 */
export function VLamaxMetricRow({ vlamax, className }: VLamaxMetricRowProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border",
      className
    )}>
      <span className="text-muted-foreground">VLamax:</span>
      <span className="font-mono font-bold">{formatVLamaxValue(vlamax.value)}</span>
      <span className={cn("px-2 py-0.5 rounded text-xs", getSourceBgColor(vlamax.source), getSourceColor(vlamax.source))}>
        {getSourceLabel(vlamax.source)}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className={cn("text-xs", getConfidenceColor(vlamax.confidence))}>
        conf {Math.round(vlamax.confidence * 100)}%
      </span>
    </div>
  );
}

// Export des helpers pour usage externe
export { 
  getSourceIcon, 
  getSourceColor, 
  getSourceBgColor, 
  getConfidenceColor, 
  getConfidenceLabel,
  getConfidenceIcon,
  formatVLamaxValue,
  getSourceLabel
};

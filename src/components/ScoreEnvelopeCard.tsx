/**
 * ScoreEnvelopeCard - Composant unifié combinant ScoreEnvelopeDisplay + MetricHelpButton
 * Pour un affichage cohérent des métriques partout dans l'app
 * 
 * MISE À JOUR: Intègre le système de badges scientifiques pour la transparence des données
 */

import { ScoreEnvelope } from "@/lib/scoreEnvelope";
import { ScoreEnvelopeDisplay } from "@/components/ScoreEnvelopeDisplay";
import { MetricHelpButton } from "@/components/MetricHelpButton";
import { ScientificBadge, createScientificMetadata, LowConfidenceWarning } from "@/components/ScientificBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// =============================================
// TYPES
// =============================================

interface ScoreEnvelopeCardProps {
  envelope: ScoreEnvelope;
  mode?: "athlete" | "staff";
  showHelp?: boolean;
  compact?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

interface ScoreEnvelopeCardGroupProps {
  envelopes: ScoreEnvelope[];
  mode?: "athlete" | "staff";
  showHelp?: boolean;
  columns?: 1 | 2 | 3 | 4;
  title?: string;
  className?: string;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function ScoreEnvelopeCard({
  envelope,
  mode = "athlete",
  showHelp = true,
  compact = false,
  showRecommendations = true,
  className,
}: ScoreEnvelopeCardProps) {
  
  // Mode compact inline (pas de card wrapper supplémentaire)
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <ScoreEnvelopeDisplay
          envelope={envelope}
          mode={mode}
          compact={true}
          showRecommendations={showRecommendations}
        />
        {showHelp && <MetricHelpButton metricId={envelope.metricId} size="sm" />}
      </div>
    );
  }

  // Mode carte avec header personnalisé incluant le bouton d'aide
  const scientificMetadata = createScientificMetadata(
    envelope.source,
    envelope.confidence,
    envelope.confidenceLabel,
    { academySection: envelope.metricId }
  );

  return (
    <Card className={cn("relative", className)}>
      {/* Header avec titre et bouton aide */}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {envelope.label}
          </CardTitle>
          {showHelp && (
            <MetricHelpButton 
              metricId={envelope.metricId} 
              size="sm" 
              variant="icon"
            />
          )}
        </div>
      </CardHeader>
      
      {/* Contenu du ScoreEnvelope */}
      <CardContent className="pt-0 px-4 pb-4">
        <ScoreEnvelopeCardContent 
          envelope={envelope} 
          mode={mode}
          showRecommendations={showRecommendations}
        />
        
        {/* Badge scientifique avec transparence */}
        <div className="mt-3 pt-2 border-t border-border/50">
          <ScientificBadge 
            metadata={scientificMetadata}
            metricName={envelope.metricId}
            compact={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// INTERNAL CONTENT COMPONENT (without Card wrapper)
// =============================================

interface ScoreEnvelopeCardContentProps {
  envelope: ScoreEnvelope;
  mode: "athlete" | "staff";
  showRecommendations?: boolean;
}

function ScoreEnvelopeCardContent({
  envelope,
  mode,
  showRecommendations = true,
}: ScoreEnvelopeCardContentProps) {
  const { value, range, unit, confidence, confidenceLabel, uncertaintyNote, why, recommendations, contextNote, source } = envelope;

  // Format helpers
  const formatValue = () => {
    if (value === null) return "—";
    if (envelope.metricId === "vlamax" || envelope.metricId === "ftpKg") {
      return value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  const formatRange = () => {
    if (!range) return "";
    if (envelope.metricId === "vlamax" || envelope.metricId === "ftpKg") {
      return `${range.low.toFixed(2)}–${range.high.toFixed(2)}`;
    }
    return `${Math.round(range.low)}–${Math.round(range.high)}`;
  };

  const getValueColor = () => {
    if (value === null) return "text-muted-foreground";
    if (confidence < 0.45) return "text-yellow-600";
    return "";
  };

  // Icônes et couleurs harmonisées selon le système de transparence scientifique
  const getSourceIcon = () => {
    switch (source) {
      case "MEASURED": return "🧪"; // Mesurée - cohérent avec badges
      case "ESTIMATED": return "📐"; // Estimée - cohérent avec badges
      case "MODELLED": return "🧠"; // Modélisée
      case "DERIVED": return "📊";
      default: return "❓";
    }
  };

  // Couleurs alignées sur le système de badges scientifiques
  const getSourceColor = () => {
    switch (source) {
      case "MEASURED": return "text-green-600 dark:text-green-400";
      case "ESTIMATED": return "text-amber-600 dark:text-amber-400";
      case "MODELLED": return "text-blue-600 dark:text-blue-400";
      default: return "text-muted-foreground";
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.85) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (confidence >= 0.65) return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  // Mode Athlète (simplifié)
  if (mode === "athlete") {
    return (
      <div className="space-y-2">
        {/* Valeur principale */}
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", getValueColor())}>
            {formatValue()}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        
        {/* Plage */}
        {range && (
          <p className="text-sm text-muted-foreground">
            ≈ {formatRange()} {unit}
          </p>
        )}

        {/* Badge confiance simple */}
        <div className="flex items-center gap-2 text-xs">
          <span>{getSourceIcon()}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getConfidenceColor())}>
            {confidenceLabel}
          </span>
        </div>
      </div>
    );
  }

  // Mode Staff (détaillé)
  return (
    <div className="space-y-3">
      {/* Valeur et source */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", getValueColor())}>
            {formatValue()}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span>{getSourceIcon()}</span>
          <span className="text-muted-foreground capitalize">{source.toLowerCase()}</span>
        </div>
      </div>

      {/* Plage d'incertitude */}
      {range && (
        <div className="text-sm">
          <span className="text-muted-foreground">Plage : </span>
          <span className="font-medium">{formatRange()}</span>
          {unit && <span className="text-muted-foreground"> {unit}</span>}
        </div>
      )}

      {/* Barre de confiance */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Confiance</span>
          <span className={cn("font-medium", getConfidenceColor().split(" ")[0])}>
            {confidenceLabel} ({Math.round(confidence * 100)}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", 
              confidence >= 0.85 ? "bg-green-500" :
              confidence >= 0.65 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Note d'incertitude */}
      <p className="text-xs text-muted-foreground italic">
        {uncertaintyNote}
      </p>

      {/* Pourquoi (staff) */}
      {why.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">📍 Pourquoi</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
            {why.map((item, i) => (
              <li key={i} className="list-disc">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommandations (staff) */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">💡 Pistes</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
            {recommendations.map((item, i) => (
              <li key={i} className="list-disc">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contexte */}
      {contextNote && (
        <p className="text-xs text-muted-foreground/80 italic border-t pt-2">
          {contextNote}
        </p>
      )}
    </div>
  );
}

// =============================================
// GROUP COMPONENT (multiple cards)
// =============================================

export function ScoreEnvelopeCardGroup({
  envelopes,
  mode = "athlete",
  showHelp = true,
  columns = 3,
  title,
  className,
}: ScoreEnvelopeCardGroupProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      )}
      <div className={cn("grid gap-4", gridCols[columns])}>
        {envelopes.map((envelope) => (
          <ScoreEnvelopeCard
            key={envelope.metricId}
            envelope={envelope}
            mode={mode}
            showHelp={showHelp}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================
// INLINE VARIANT (for tables, lists)
// =============================================

export function ScoreEnvelopeInlineCard({ 
  envelope,
  showHelp = true,
}: { 
  envelope: ScoreEnvelope;
  showHelp?: boolean;
}) {
  return (
    <ScoreEnvelopeCard
      envelope={envelope}
      mode="athlete"
      showHelp={showHelp}
      compact={true}
    />
  );
}

export default ScoreEnvelopeCard;

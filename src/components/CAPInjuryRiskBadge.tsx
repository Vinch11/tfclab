/**
 * CAP Injury Risk Badge Component
 * Affiche l'indice de risque blessure CAP avec explication pédagogique
 * Visible uniquement en Mode Staff
 */

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, Info, Shield, ShieldAlert } from "lucide-react";
import { useState } from "react";

import {
  type CAPInjuryRiskResult,
  getCAPRiskIcon,
} from "@/lib/capInjuryRisk";

interface CAPInjuryRiskBadgeProps {
  risk: CAPInjuryRiskResult;
  staffMode?: boolean;
  compact?: boolean;
}

export function CAPInjuryRiskBadge({
  risk,
  staffMode = false,
  compact = false,
}: CAPInjuryRiskBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Only show in staff mode
  if (!staffMode) return null;
  
  const icon = getCAPRiskIcon(risk.level);
  
  if (compact) {
    return (
      <Badge className={`${risk.bgColor} ${risk.color} border ${risk.borderColor} text-[10px] gap-1`}>
        <span>{icon}</span>
        <span>Risque CAP: {risk.label}</span>
      </Badge>
    );
  }
  
  return (
    <div className={`rounded-lg border p-3 ${risk.bgColor} ${risk.borderColor}`}>
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          {risk.level >= 2 ? (
            <ShieldAlert className={`h-5 w-5 ${risk.color}`} />
          ) : (
            <Shield className={`h-5 w-5 ${risk.color}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${risk.color}`}>
              Risque Blessure CAP: {risk.label}
            </span>
            <Badge variant="outline" className={`text-[10px] ${risk.color} ${risk.borderColor}`}>
              Score: {risk.totalScore}/4
            </Badge>
          </div>
          
          {/* Explanation */}
          <p className="text-xs text-muted-foreground mt-1">
            {risk.explanation}
          </p>
          
          {/* Pedagogical text */}
          <div className="flex items-start gap-1.5 mt-2 text-xs">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
            <span className={risk.color}>{risk.pedagogicalText}</span>
          </div>
          
          {/* Staff Analysis (collapsible) */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline mt-2">
              <span>Analyse staff détaillée</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-background/50 rounded p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {risk.staffAnalysis}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline version for option cards
 */
interface CAPRiskInlineProps {
  risk: CAPInjuryRiskResult;
  staffMode?: boolean;
}

export function CAPRiskInline({ risk, staffMode = false }: CAPRiskInlineProps) {
  if (!staffMode || risk.level < 2) return null;
  
  const icon = getCAPRiskIcon(risk.level);
  
  return (
    <div className={`flex items-start gap-1.5 text-xs mt-1.5 p-1.5 rounded ${risk.bgColor} border ${risk.borderColor}`}>
      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${risk.color}`} />
      <div>
        <span className={`font-medium ${risk.color}`}>
          {icon} Risque blessure CAP: {risk.label}
        </span>
        <p className="text-muted-foreground mt-0.5">
          {risk.pedagogicalText}
        </p>
      </div>
    </div>
  );
}

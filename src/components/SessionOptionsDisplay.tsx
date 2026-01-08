/**
 * Session Options Display Component
 * Displays validated duration options with pedagogical text and staff analysis
 */

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, XCircle } from "lucide-react";
import { useState } from "react";

import {
  type ValidatedOption,
  formatOptionForDisplay,
  getOptionRiskColor,
} from "@/lib/templates/optionValidator";

interface SessionOptionsDisplayProps {
  validOptions: ValidatedOption[];
  blockedOptions?: ValidatedOption[];
  genericOptionsRemoved?: string[];
  staffMode?: boolean;
}

export function SessionOptionsDisplay({
  validOptions,
  blockedOptions = [],
  genericOptionsRemoved = [],
  staffMode = false,
}: SessionOptionsDisplayProps) {
  const [showStaffAnalysis, setShowStaffAnalysis] = useState(false);
  
  const hasBlockedOptions = blockedOptions.length > 0 || genericOptionsRemoved.length > 0;
  
  if (validOptions.length === 0 && !staffMode) {
    return null;
  }
  
  return (
    <div className="mt-2 space-y-2">
      {/* Valid Options */}
      {validOptions.length > 0 && (
        <div className="space-y-1.5">
          {validOptions.map((validated, idx) => (
            <ValidOptionCard 
              key={idx} 
              validated={validated} 
              staffMode={staffMode} 
            />
          ))}
        </div>
      )}
      
      {/* Staff: Blocked/Generic Options */}
      {staffMode && hasBlockedOptions && (
        <Collapsible open={showStaffAnalysis} onOpenChange={setShowStaffAnalysis}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
            <AlertTriangle className="h-3 w-3" />
            <span>{blockedOptions.length + genericOptionsRemoved.length} option(s) masquée(s)</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showStaffAnalysis ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1">
            {blockedOptions.map((blocked, idx) => (
              <BlockedOptionCard key={`blocked-${idx}`} validated={blocked} />
            ))}
            {genericOptionsRemoved.map((generic, idx) => (
              <div 
                key={`generic-${idx}`}
                className="text-xs bg-red-100 dark:bg-red-900/20 rounded p-2 border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                  <XCircle className="h-3 w-3" />
                  <span className="font-medium">Option sans sport (INTERDIT)</span>
                </div>
                <p className="text-red-600 dark:text-red-400 mt-1">"{generic}"</p>
                <p className="text-muted-foreground mt-1 italic text-[10px]">
                  Toute option DOIT préciser le sport: VÉLO, CAP ou NATATION.
                </p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ValidOptionCard({ 
  validated, 
  staffMode 
}: { 
  validated: ValidatedOption; 
  staffMode: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const displayText = formatOptionForDisplay(validated);
  const riskColor = getOptionRiskColor(validated.riskLevel);
  
  return (
    <div className="text-xs bg-muted/30 rounded p-2 border">
      <div className="flex items-start gap-2">
        <Badge className={`shrink-0 text-[10px] ${riskColor}`}>
          {validated.option.sport}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{displayText}</p>
          
          {/* Pedagogical text */}
          {validated.pedagogicalText && (
            <p className="text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 shrink-0 mt-0.5 text-blue-500" />
              <span>{validated.pedagogicalText}</span>
            </p>
          )}
          
          {/* Staff Analysis */}
          {staffMode && validated.staffAnalysis && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger className="text-primary hover:underline flex items-center gap-1 mt-1">
                <span>Analyse staff</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 bg-primary/5 rounded p-2 text-muted-foreground">
                {validated.staffAnalysis}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        
        {validated.riskLevel === "LOW" && (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

function BlockedOptionCard({ validated }: { validated: ValidatedOption }) {
  return (
    <div className="text-xs bg-red-50 dark:bg-red-900/10 rounded p-2 border border-red-200 dark:border-red-800/50">
      <div className="flex items-start gap-2">
        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-700 dark:text-red-300 line-through">
            {validated.option.rawText}
          </p>
          <p className="text-red-600 dark:text-red-400 mt-1">
            {validated.reason}
          </p>
          {validated.staffAnalysis && (
            <p className="text-muted-foreground mt-1 italic text-[10px]">
              {validated.staffAnalysis}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

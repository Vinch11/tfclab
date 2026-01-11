/**
 * Wahoo Physiological Reading Component
 * Displays the Two For Coaching Lab interpretation of external workout sessions
 * 
 * Shows in Templates section under each session when:
 * - Staff mode is enabled, AND
 * - Session is identified as external/Wahoo-like
 */

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, Activity, AlertTriangle, CheckCircle2, Info, Zap, ExternalLink } from "lucide-react";
import { useState } from "react";

import {
  type PhysiologicalReading,
  type WahooWorkoutEffect,
  type PhysiologicalAlert,
  getEffetColor,
  getEffetSymbol,
  getStressColor,
  getRiskColor,
  getZoneColor,
} from "@/lib/wahoo/wahooWorkoutInterpreter";

interface WahooPhysiologicalReadingProps {
  reading: PhysiologicalReading;
  staffMode: boolean;
  athleteMode?: boolean;
}

function EffectRow({ 
  label, 
  effect, 
  showDetails = true 
}: { 
  label: string; 
  effect: "up" | "down" | "neutral"; 
  showDetails?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${getEffetColor(effect)}`}>
        {getEffetSymbol(effect)}
        {showDetails && (
          <span className="ml-1 text-xs">
            {effect === "up" ? "(↑)" : effect === "down" ? "(↓)" : "(=)"}
          </span>
        )}
      </span>
    </div>
  );
}

function StaffView({ reading }: { reading: PhysiologicalReading }) {
  const { effect, category, description, staffNote, alerts } = reading;
  
  if (!effect) return null;

  return (
    <div className="space-y-3">
      {/* Zone and Category Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={getZoneColor(effect.zoneDominante)}>
          {effect.zoneDominante}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {category}
        </Badge>
        <Badge 
          variant="outline" 
          className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Séance externe
        </Badge>
      </div>

      {/* Effects Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-muted/30 rounded-lg p-3">
        <EffectRow label="Effet VLamax" effect={effect.effetVLamax} />
        <EffectRow label="Effet TTE" effect={effect.effetTTE} />
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-muted-foreground">Stress NM</span>
          <span className={`text-sm font-medium ${getStressColor(effect.stressNeuromusculaire)}`}>
            {effect.stressNeuromusculaire}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-muted-foreground">Risque CAP</span>
          <Badge className={`text-xs ${getRiskColor(effect.risqueCAP)}`}>
            {effect.risqueCAP}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground italic">
          {description}
        </p>
      )}

      {/* Staff Note */}
      {staffNote && (
        <div className="flex items-start gap-2 text-sm bg-primary/5 rounded-lg p-3 border border-primary/10">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-foreground">{staffNote}</p>
        </div>
      )}

      {/* Contextual Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <AlertItem key={idx} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteView({ reading }: { reading: PhysiologicalReading }) {
  const { effect, category, alerts } = reading;
  
  if (!effect) return null;

  // Simplified message for athletes
  const getMessage = () => {
    if (effect.effetVLamax === "down" && effect.effetTTE === "up") {
      return "Cette séance développe ton endurance de base. Elle est cohérente avec un objectif longue distance.";
    }
    if (effect.effetVLamax === "up") {
      return "Cette séance travaille ta puissance explosive. À utiliser avec modération si tu prépares un Ironman ou 70.3.";
    }
    if (effect.zoneDominante === "Z4a" || effect.zoneDominante === "Z4b") {
      return "Cette séance développe ta puissance durable au seuil. Excellente pour améliorer ton allure course.";
    }
    if (effect.zoneDominante === "Z1") {
      return "Séance de récupération active. Important pour absorber les séances clés.";
    }
    return "Cette séance contribue à ton développement général.";
  };

  // Filter alerts for athlete view (only positives and important warnings)
  const athleteAlerts = alerts.filter(
    (a) => a.type === "positive" || (a.type === "warning" && a.message.includes("fatigue"))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={getZoneColor(effect.zoneDominante)}>
          {effect.zoneDominante}
        </Badge>
        <span className="text-sm text-muted-foreground">{category}</span>
      </div>
      
      <p className="text-sm text-foreground">
        {getMessage()}
      </p>

      {athleteAlerts.map((alert, idx) => (
        <div 
          key={idx}
          className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
            alert.type === "positive" 
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" 
              : "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          {alert.type === "positive" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
}

function AlertItem({ alert }: { alert: PhysiologicalAlert }) {
  const getAlertStyle = () => {
    switch (alert.type) {
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/20",
          border: "border-amber-200 dark:border-amber-700",
          text: "text-amber-800 dark:text-amber-300",
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      case "positive":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-700",
          text: "text-green-800 dark:text-green-300",
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-700",
          text: "text-blue-800 dark:text-blue-300",
          icon: <Info className="h-4 w-4" />,
        };
    }
  };

  const style = getAlertStyle();

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border ${style.bg} ${style.border} ${style.text}`}>
      <span className="shrink-0 mt-0.5">{style.icon}</span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{alert.message}</p>
        {alert.detail && (
          <p className="text-xs opacity-80">{alert.detail}</p>
        )}
      </div>
    </div>
  );
}

export function WahooPhysiologicalReading({ 
  reading, 
  staffMode,
  athleteMode = false,
}: WahooPhysiologicalReadingProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if not a Wahoo session
  if (!reading.isWahooSession) {
    return null;
  }

  // If no effect matched, show minimal indicator
  if (!reading.effect) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        <span>Séance externe (pattern non reconnu)</span>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
        <div className="flex items-center gap-2 flex-1">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Lecture physiologique — Two For Coaching Lab
          </span>
          {reading.alerts.some((a) => a.type === "warning") && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} 
        />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3 pl-6 border-l-2 border-primary/20 ml-2 mt-2">
        {athleteMode ? (
          <AthleteView reading={reading} />
        ) : staffMode ? (
          <StaffView reading={reading} />
        ) : (
          <AthleteView reading={reading} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * WorkoutAdvisoryCard — Two For Coaching Lab
 * 
 * Affiche le statut de recommandation d'une séance avec justification
 * Compatible Wahoo SYSTM, Zwift, Rouvy
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  Info,
  Lightbulb,
  Activity,
  Zap,
  Timer
} from "lucide-react";
import { 
  WorkoutAdvisory, 
  AdvisoryStatus,
  WORKOUT_ADVISORY_DISCLAIMER 
} from "@/lib/workoutAdvisoryEngine";

interface WorkoutAdvisoryCardProps {
  advisory: WorkoutAdvisory;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Composant principal pour afficher une recommandation de séance
 */
export function WorkoutAdvisoryCard({ 
  advisory, 
  showDetails = true,
  compact = false 
}: WorkoutAdvisoryCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (compact) {
    return <WorkoutAdvisoryBadge advisory={advisory} />;
  }
  
  return (
    <Card className={`border-l-4 ${getStatusBorderColor(advisory.status)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={advisory.status} />
            <CardTitle className="text-base font-semibold">
              {advisory.workout_name}
            </CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`${advisory.status_color} border-current`}
          >
            {advisory.status_emoji} {advisory.status_label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Message principal */}
        <div className="text-sm text-foreground">
          <span className="font-medium">Pourquoi ?</span>
          <p className="mt-1 text-muted-foreground">{advisory.why}</p>
        </div>
        
        {/* Détails supplémentaires */}
        {showDetails && advisory.why_details.length > 1 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              Voir les détails
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {advisory.why_details.slice(1).map((detail, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-muted-foreground/50">•</span>
                  {detail}
                </p>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Données utilisées */}
        <div className="flex flex-wrap gap-2 text-xs">
          <DataPill 
            icon={<Activity className="h-3 w-3" />}
            label="Fatigue"
            value={`${advisory.data_used.fatigue_pct.toFixed(0)}%`}
          />
          <DataPill 
            icon={<Zap className="h-3 w-3" />}
            label="VLamax"
            value={advisory.data_used.vlamax?.toFixed(2) ?? "N/A"}
          />
          <DataPill 
            icon={<Timer className="h-3 w-3" />}
            label="TTE"
            value={`${advisory.data_used.tte_min} min`}
          />
        </div>
        
        {/* Alternative suggérée */}
        {advisory.alternative_suggestion && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-foreground">Recommandation alternative :</span>
              <p className="text-muted-foreground">{advisory.alternative_suggestion}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Badge compact pour affichage inline
 */
export function WorkoutAdvisoryBadge({ advisory }: { advisory: WorkoutAdvisory }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{advisory.status_emoji}</span>
      <span className={`text-sm font-medium ${advisory.status_color}`}>
        {advisory.status_label}
      </span>
    </div>
  );
}

/**
 * Liste de recommandations avec résumé
 */
interface WorkoutAdvisoryListProps {
  advisories: WorkoutAdvisory[];
  contextSummary?: string;
  guardMessage?: string;
}

export function WorkoutAdvisoryList({ 
  advisories, 
  contextSummary,
  guardMessage 
}: WorkoutAdvisoryListProps) {
  const recommended = advisories.filter(a => a.status === "RECOMMENDED");
  const caution = advisories.filter(a => a.status === "CAUTION");
  const discouraged = advisories.filter(a => a.status === "DISCOURAGED");
  
  return (
    <div className="space-y-4">
      {/* Message de garde */}
      {guardMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{guardMessage}</p>
        </div>
      )}
      
      {/* Résumé du contexte */}
      {contextSummary && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{contextSummary}</p>
        </div>
      )}
      
      {/* Statistiques */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-green-600 dark:text-green-400">🟢</span>
          <span className="text-muted-foreground">{recommended.length} recommandées</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-600 dark:text-amber-400">🟡</span>
          <span className="text-muted-foreground">{caution.length} prudence</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-600 dark:text-red-400">🔴</span>
          <span className="text-muted-foreground">{discouraged.length} déconseillées</span>
        </div>
      </div>
      
      {/* Liste des séances par statut */}
      {discouraged.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
            Déconseillées actuellement
          </h4>
          {discouraged.map(a => (
            <WorkoutAdvisoryCard key={a.workout_id} advisory={a} />
          ))}
        </div>
      )}
      
      {caution.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Acceptable avec prudence
          </h4>
          {caution.map(a => (
            <WorkoutAdvisoryCard key={a.workout_id} advisory={a} />
          ))}
        </div>
      )}
      
      {recommended.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400">
            Recommandées
          </h4>
          {recommended.map(a => (
            <WorkoutAdvisoryCard key={a.workout_id} advisory={a} />
          ))}
        </div>
      )}
      
      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground italic text-center pt-2 border-t">
        {WORKOUT_ADVISORY_DISCLAIMER.split('\n')[0]}
      </p>
    </div>
  );
}

// =============================================
// HELPERS
// =============================================

function StatusIcon({ status }: { status: AdvisoryStatus }) {
  switch (status) {
    case "RECOMMENDED":
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case "CAUTION":
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    case "DISCOURAGED":
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  }
}

function getStatusBorderColor(status: AdvisoryStatus): string {
  switch (status) {
    case "RECOMMENDED": return "border-l-green-500";
    case "CAUTION": return "border-l-amber-500";
    case "DISCOURAGED": return "border-l-red-500";
  }
}

interface DataPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DataPill({ icon, label, value }: DataPillProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      {icon}
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

// =============================================
// EXEMPLE D'UTILISATION AFFICHÉ
// =============================================

export const EXAMPLE_ADVISORY_DISPLAY = `
Séance Wahoo 'The Shovel'
Statut : 🔴 Déconseillée actuellement

Pourquoi ?
• Fatigue élevée (72 %)
• VLamax déjà haut pour objectif Ironman
• Stress glycolytique élevé

Recommandation alternative :
→ Z2 longue ou Force basse cadence
`;

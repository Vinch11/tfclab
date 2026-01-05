// Composant affichant les suggestions Coach (Planner Advisory)

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlannerAdvice } from '@/types/plannerAdvice';
import {
  getSeverityLabel,
  getSeverityColor,
  getSeverityBgColor,
  getSourceIcon,
  getScopeLabel,
} from '@/lib/plannerAdvisoryEngine';
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachSuggestionsProps {
  advices: PlannerAdvice[];
  onApply: (advice: PlannerAdvice) => void;
  isApplying?: boolean;
  className?: string;
}

export function CoachSuggestions({ advices, onApply, isApplying, className }: CoachSuggestionsProps) {
  const [staffMode, setStaffMode] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (advices.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity: 0 | 1 | 2 | 3) => {
    switch (severity) {
      case 3: return <AlertCircle className="h-5 w-5" />;
      case 2: return <AlertTriangle className="h-5 w-5" />;
      case 1: return <Info className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  return (
    <Card className={cn('border-border/50 bg-card/80 backdrop-blur-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Coach Suggestions</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {advices.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="staff-mode" className="text-xs text-muted-foreground cursor-pointer">
              Mode staff
            </Label>
            <Switch
              id="staff-mode"
              checked={staffMode}
              onCheckedChange={setStaffMode}
              className="scale-75"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {advices.map((advice) => (
          <Collapsible
            key={advice.id}
            open={expandedId === advice.id}
            onOpenChange={(open) => setExpandedId(open ? advice.id : null)}
          >
            <div
              className={cn(
                'rounded-lg border p-3 transition-all',
                getSeverityBgColor(advice.severity)
              )}
            >
              <CollapsibleTrigger className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className={cn('shrink-0 mt-0.5', getSeverityColor(advice.severity))}>
                    {getSeverityIcon(advice.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{getSourceIcon(advice.source)}</span>
                      <h4 className="font-medium text-sm">{advice.title}</h4>
                      {advice.auto_applied && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Appliqué
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {advice.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getScopeLabel(advice.date_scope)}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', getSeverityColor(advice.severity))}>
                        {getSeverityLabel(advice.severity)}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {expandedId === advice.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-3">
                {/* Pourquoi cette suggestion - Mode Staff */}
                {staffMode && (
                  <div className="rounded-md bg-background/50 border border-border/50 p-3">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Pourquoi on te propose ça
                    </h5>
                    <p className="text-sm">{advice.why}</p>
                  </div>
                )}

                {/* Bouton Appliquer */}
                {advice.can_apply && !advice.auto_applied && (
                  <Button
                    size="sm"
                    onClick={() => onApply(advice)}
                    disabled={isApplying}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Appliquer cette suggestion
                  </Button>
                )}

                {advice.auto_applied && (
                  <p className="text-xs text-green-400 text-center">
                    Cette suggestion a été appliquée automatiquement
                  </p>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

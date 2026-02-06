/**
 * ValidationStatusCard — Statut de validation physiologique (Dashboard)
 * 
 * Affiche un encart résumant:
 * - Si la modélisation est suffisante
 * - Si un test labo est recommandé
 * - Classification des données (mesurées/estimées/modélisées)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  Stethoscope
} from 'lucide-react';
import { 
  PhysiologicalValidationStatus,
  LabTestRecommendation,
  USAGE_LEVELS,
  AthleteLevel,
  VALIDATION_TEXTS
} from '@/lib/v2/validationFramework';
import { cn } from '@/lib/utils';
import { getConfidenceLabel, getConfidenceColorClass } from '@/lib/confidenceDisplay';

// =============================================
// TYPES
// =============================================

interface ValidationStatusCardProps {
  status: PhysiologicalValidationStatus;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function ValidationStatusCard({ 
  status, 
  showDetails = true,
  compact = false,
  className 
}: ValidationStatusCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const statusConfig = getStatusConfig(status.status);
  const levelInfo = USAGE_LEVELS.find(l => l.level === status.athleteLevel);
  
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 p-2 rounded-lg border", statusConfig.bgClass, className)}>
        <statusConfig.icon className={cn("h-4 w-4", statusConfig.iconClass)} />
        <span className="text-sm font-medium">{status.message}</span>
      </div>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-3", statusConfig.headerBgClass)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <statusConfig.icon className={cn("h-5 w-5", statusConfig.iconClass)} />
            <div>
              <CardTitle className="text-base">{status.statusLabel}</CardTitle>
              <CardDescription className="text-sm">
                Statut de validation physiologique
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0", statusConfig.badgeClass)}>
            {status.statusEmoji} {status.status === 'modeling_sufficient' ? 'OK' : status.status === 'lab_recent_solid' ? 'Calibré' : 'À vérifier'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Message principal */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{status.message}</p>
          <p className="text-xs text-muted-foreground">{status.detailedMessage}</p>
        </div>
        
        {/* Fiabilité globale */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Fiabilité globale</span>
            <span className={cn("font-medium", getConfidenceColorClass(status.overallConfidence))}>{getConfidenceLabel(status.overallConfidence)}</span>
          </div>
          <Progress 
            value={status.overallConfidence * 100} 
            className="h-2"
          />
        </div>
        
        {/* Classification des données */}
        {showDetails && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-xs">Classification des données</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 pt-2">
              <DataClassificationList 
                classification={status.dataClassification} 
              />
              
              {/* Niveau athlète */}
              {levelInfo && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{levelInfo.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {levelInfo.twoForCoachingRole}
                  </p>
                </div>
              )}
              
              {/* Recommandation test labo */}
              {status.labRecommendation && status.labRecommendation.isRecommended && (
                <LabRecommendationSection recommendation={status.labRecommendation} />
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// SOUS-COMPOSANTS
// =============================================

function DataClassificationList({ 
  classification 
}: { 
  classification: PhysiologicalValidationStatus['dataClassification'] 
}) {
  return (
    <div className="space-y-2">
      {classification.measured.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-sm">🟢</span>
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-300">Mesurées</p>
            <p className="text-xs text-muted-foreground">{classification.measured.join(', ')}</p>
          </div>
        </div>
      )}
      
      {classification.estimated.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-sm">🟠</span>
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Estimées</p>
            <p className="text-xs text-muted-foreground">{classification.estimated.join(', ')}</p>
          </div>
        </div>
      )}
      
      {classification.modeled.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-sm">🔴</span>
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-300">Modélisées</p>
            <p className="text-xs text-muted-foreground">{classification.modeled.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LabRecommendationSection({ 
  recommendation 
}: { 
  recommendation: LabTestRecommendation 
}) {
  const urgencyConfig = getUrgencyConfig(recommendation.urgency);
  
  return (
    <div className={cn("p-3 rounded-lg border space-y-2", urgencyConfig.bgClass)}>
      <div className="flex items-center gap-2">
        <Stethoscope className={cn("h-4 w-4", urgencyConfig.iconClass)} />
        <span className="text-xs font-medium">{urgencyConfig.label}</span>
      </div>
      
      <ul className="space-y-1">
        {recommendation.messages.slice(0, 2).map((msg, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
            <span>•</span>
            <span>{msg}</span>
          </li>
        ))}
      </ul>
      
      {recommendation.testsToConsider.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tests suggérés : {recommendation.testsToConsider.slice(0, 2).join(', ')}
        </p>
      )}
    </div>
  );
}

// =============================================
// HELPERS
// =============================================

function getStatusConfig(status: PhysiologicalValidationStatus['status']) {
  switch (status) {
    case 'modeling_sufficient':
      return {
        icon: CheckCircle2,
        iconClass: 'text-green-600',
        bgClass: 'bg-green-500/10 border-green-500/30',
        headerBgClass: 'bg-green-500/5',
        badgeClass: 'border-green-500/50 text-green-700 dark:text-green-300',
      };
    case 'lab_recent_solid':
      return {
        icon: FlaskConical,
        iconClass: 'text-blue-600',
        bgClass: 'bg-blue-500/10 border-blue-500/30',
        headerBgClass: 'bg-blue-500/5',
        badgeClass: 'border-blue-500/50 text-blue-700 dark:text-blue-300',
      };
    case 'lab_recommended':
      return {
        icon: AlertTriangle,
        iconClass: 'text-amber-600',
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        headerBgClass: 'bg-amber-500/5',
        badgeClass: 'border-amber-500/50 text-amber-700 dark:text-amber-300',
      };
    case 'lab_outdated':
      return {
        icon: Clock,
        iconClass: 'text-orange-600',
        bgClass: 'bg-orange-500/10 border-orange-500/30',
        headerBgClass: 'bg-orange-500/5',
        badgeClass: 'border-orange-500/50 text-orange-700 dark:text-orange-300',
      };
    default:
      return {
        icon: Info,
        iconClass: 'text-muted-foreground',
        bgClass: 'bg-muted/50',
        headerBgClass: '',
        badgeClass: '',
      };
  }
}

function getUrgencyConfig(urgency: LabTestRecommendation['urgency']) {
  switch (urgency) {
    case 'essential':
      return {
        label: 'Test labo fortement recommandé',
        bgClass: 'bg-red-500/10 border-red-500/30',
        iconClass: 'text-red-600',
      };
    case 'strongly_advised':
      return {
        label: 'Test labo conseillé',
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        iconClass: 'text-amber-600',
      };
    case 'advised':
      return {
        label: 'Test labo bénéfique',
        bgClass: 'bg-blue-500/10 border-blue-500/30',
        iconClass: 'text-blue-600',
      };
    default:
      return {
        label: 'Test labo optionnel',
        bgClass: 'bg-muted/50',
        iconClass: 'text-muted-foreground',
      };
  }
}

// =============================================
// EXPORT ÉCHELLE D'UTILISATION
// =============================================

export function UsageLevelScale({ 
  currentLevel,
  className 
}: { 
  currentLevel?: AthleteLevel;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium">Échelle d'utilisation recommandée</h4>
      
      <div className="space-y-2">
        {USAGE_LEVELS.map((level) => {
          const isActive = level.level === currentLevel;
          
          return (
            <div 
              key={level.level}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                isActive 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium flex items-center gap-2">
                  {level.emoji} {level.label}
                  {isActive && <Badge variant="secondary" className="text-xs">Votre niveau</Badge>}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{level.description}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn(
                  level.modelingSufficiency === 'sufficient' 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-amber-600 dark:text-amber-400"
                )}>
                  {level.twoForCoachingRole}
                </span>
                <span className="text-muted-foreground">{level.labTestAdvice}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================
// AGE ADJUSTMENT INFO - Composant pédagogique
// Affiche les informations sur la prise en compte de l'âge
// =============================================

import { Info, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  calculateAge, 
  computeAgeAdjustmentIndex, 
  interpretVLamaxByAge, 
  getTTETargetForAge,
  getAgeNutritionAdjustment,
  AGE_METHODOLOGY,
  type AgeAdjustmentIndex 
} from "@/lib/ageAdjustment";

interface AgeAdjustmentInfoProps {
  birthDate: string | null | undefined;
  variant?: "badge" | "card" | "inline";
  showDetails?: boolean;
}

export function AgeAdjustmentInfo({ birthDate, variant = "badge", showDetails = false }: AgeAdjustmentInfoProps) {
  const age = calculateAge(birthDate);
  const ageIndex = computeAgeAdjustmentIndex(age);

  if (age === null) {
    return null;
  }

  const getCategoryColor = (category: AgeAdjustmentIndex["category"]) => {
    switch (category) {
      case "young":
        return "bg-success/10 text-success border-success/30";
      case "prime":
        return "bg-primary/10 text-primary border-primary/30";
      case "master1":
        return "bg-warning/10 text-warning border-warning/30";
      case "master2":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
    }
  };

  if (variant === "badge") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:opacity-80 ${getCategoryColor(ageIndex.category)}`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {age} ans
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {AGE_METHODOLOGY.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {AGE_METHODOLOGY.mainText}
            </p>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Principes clés :</h4>
              <ul className="space-y-1">
                {AGE_METHODOLOGY.principles.map((principle, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />
                    {principle}
                  </li>
                ))}
              </ul>
            </div>
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {AGE_METHODOLOGY.staffNote}
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "card") {
    return (
      <Card className={`border ${getCategoryColor(ageIndex.category)}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Profil d'âge : {age} ans
          </CardTitle>
          <CardDescription>{ageIndex.label}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {AGE_METHODOLOGY.staffNote}
          </p>
          {showDetails && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">Multiplicateur risque</span>
                <p className="font-medium">×{ageIndex.riskMultiplier.toFixed(2)}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">Ajustement AAI</span>
                <p className="font-medium">{(ageIndex.aai * 100).toFixed(0)}%</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getCategoryColor(ageIndex.category)}`}>
      <Clock className="h-3 w-3" />
      <span>{age} ans ({ageIndex.label})</span>
    </div>
  );
}

// =============================================
// COMPOSANT ALERTE ÂGE POUR RACE READINESS
// =============================================

interface AgeRiskAlertProps {
  birthDate: string | null | undefined;
  raceReadinessScore: number;
}

export function AgeRiskAlert({ birthDate, raceReadinessScore }: AgeRiskAlertProps) {
  const age = calculateAge(birthDate);
  const ageIndex = computeAgeAdjustmentIndex(age);

  // Pas d'alerte si jeune ou score élevé
  if (age === null || ageIndex.category === "young") {
    return null;
  }

  // Alerte si master avec score moyen/faible
  if ((ageIndex.category === "master1" || ageIndex.category === "master2") && raceReadinessScore < 80) {
    const isHighRisk = raceReadinessScore < 60 || ageIndex.category === "master2";
    
    return (
      <Alert variant={isHighRisk ? "destructive" : "default"} className="mt-3">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm">
          Ajustement âge ({age} ans)
        </AlertTitle>
        <AlertDescription className="text-xs">
          À niveau de préparation égal, l'âge modifie la tolérance au stress métabolique.
          {isHighRisk 
            ? " Priorité sur la fraîcheur et une nutrition conservative recommandée."
            : " Les recommandations sont ajustées en conséquence."
          }
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// =============================================
// COMPOSANT INTERPRÉTATION VLAMAX PAR ÂGE
// =============================================

interface VLamaxAgeInterpretationProps {
  birthDate: string | null | undefined;
  vlamax: number | null;
}

export function VLamaxAgeInterpretation({ birthDate, vlamax }: VLamaxAgeInterpretationProps) {
  const age = calculateAge(birthDate);
  const interpretation = interpretVLamaxByAge(vlamax, age);

  if (vlamax === null || age === null) {
    return null;
  }

  const getRiskColor = () => {
    switch (interpretation.riskLevel) {
      case "exploitable":
        return "text-success";
      case "surveiller":
        return "text-warning";
      case "risque":
        return "text-orange-500";
      case "prioritaire":
        return "text-destructive";
    }
  };

  const getRiskIcon = () => {
    switch (interpretation.riskLevel) {
      case "exploitable":
        return "🟢";
      case "surveiller":
        return "🟡";
      case "risque":
        return "🟠";
      case "prioritaire":
        return "🔴";
    }
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <span>{getRiskIcon()}</span>
          VLamax × Âge ({age} ans)
        </span>
        <Badge variant="outline" className={getRiskColor()}>
          {interpretation.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {interpretation.messageStaff}
      </p>
      <p className="text-xs font-medium text-primary">
        ▸ {interpretation.actionPrioritaire}
      </p>
    </div>
  );
}

// =============================================
// COMPOSANT CIBLE TTE AJUSTÉE PAR ÂGE
// =============================================

interface TTEAgeTargetProps {
  birthDate: string | null | undefined;
  objectif: string;
  currentTTE: number | null;
}

export function TTEAgeTarget({ birthDate, objectif, currentTTE }: TTEAgeTargetProps) {
  const age = calculateAge(birthDate);
  const targets = getTTETargetForAge(objectif, age);

  if (age === null) {
    return null;
  }

  const isOnTarget = currentTTE !== null && currentTTE >= targets.min;
  const isIdeal = currentTTE !== null && currentTTE >= targets.ideal;

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Cible TTE ajustée ({age} ans)
        </span>
        {isIdeal ? (
          <Badge variant="default" className="bg-success text-success-foreground">Optimal</Badge>
        ) : isOnTarget ? (
          <Badge variant="secondary">Acceptable</Badge>
        ) : (
          <Badge variant="destructive">En-dessous</Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Minimum</span>
          <p className="font-medium">{targets.min} min</p>
        </div>
        <div>
          <span className="text-muted-foreground">Idéal</span>
          <p className="font-medium">{targets.ideal} min</p>
        </div>
        {currentTTE !== null && (
          <div>
            <span className="text-muted-foreground">Actuel</span>
            <p className={`font-medium ${isOnTarget ? "text-success" : "text-destructive"}`}>
              {currentTTE} min
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// COMPOSANT NUTRITION AJUSTÉE PAR ÂGE
// =============================================

interface NutritionAgeAdjustmentProps {
  birthDate: string | null | undefined;
  baseCarbsMin: number;
  baseCarbsMax: number;
}

export function NutritionAgeAdjustment({ birthDate, baseCarbsMin, baseCarbsMax }: NutritionAgeAdjustmentProps) {
  const age = calculateAge(birthDate);
  const adjustment = getAgeNutritionAdjustment(age);

  if (age === null || adjustment.carbReductionFactor >= 1.0) {
    return null;
  }

  const adjustedMin = Math.round(baseCarbsMin * adjustment.carbReductionFactor);
  const adjustedMax = Math.round(baseCarbsMax * adjustment.carbReductionFactor);

  return (
    <Alert className="bg-warning/10 border-warning/30">
      <Clock className="h-4 w-4 text-warning" />
      <AlertTitle className="text-sm text-warning">
        Ajustement nutritionnel ({age} ans)
      </AlertTitle>
      <AlertDescription className="text-xs space-y-1">
        <p>{adjustment.messageStaff}</p>
        <p className="font-medium">
          Recommandation ajustée : {adjustedMin}–{adjustedMax} g/h 
          <span className="text-muted-foreground ml-1">
            (au lieu de {baseCarbsMin}–{baseCarbsMax} g/h)
          </span>
        </p>
      </AlertDescription>
    </Alert>
  );
}

// =============================================
// CHARGE RÉCENTE CARD
// Affichage et édition de la CRR (Charge Récente de Référence)
// Two For Coaching Lab – Staff-Grade
// =============================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Activity, 
  Edit2, 
  Info, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChargeRecenteReference,
  getCRRSourceColor,
  getCRRSourceBgColor,
  getCRRConfidenceLabel,
  getCRRTargets,
  CRRTargets
} from "@/lib/chargeRecenteReference";

// =============================================
// TYPES
// =============================================

interface ChargeRecenteCardProps {
  crr: ChargeRecenteReference;
  objectif: string;
  staffMode?: boolean;
  onUpdate?: (value: number) => Promise<void>;
  className?: string;
}

// =============================================
// COMPOSANT
// =============================================

export function ChargeRecenteCard({
  crr,
  objectif,
  staffMode = false,
  onUpdate,
  className
}: ChargeRecenteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(crr.value?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const targets = getCRRTargets(objectif);
  
  const handleSave = async () => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 2000) return;
    
    setIsLoading(true);
    try {
      await onUpdate?.(numValue);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Déterminer le statut
  const getStatus = () => {
    if (!crr.isValid || crr.value === null) {
      return { icon: AlertTriangle, color: "text-amber-500", label: "Non renseigné" };
    }
    if (crr.value < targets.chargeMinimale) {
      return { icon: TrendingDown, color: "text-blue-500", label: "Faible" };
    }
    if (crr.value > targets.chargeMaximale) {
      return { icon: AlertTriangle, color: "text-red-500", label: "Élevée" };
    }
    return { icon: CheckCircle, color: "text-green-500", label: "Optimal" };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">Charge Récente</CardTitle>
              <CardDescription className="text-xs">TSS 7 jours</CardDescription>
            </div>
          </div>
          
          {/* Badge source */}
          <Badge 
            variant="outline" 
            className={cn("text-xs", getCRRSourceBgColor(crr.source), getCRRSourceColor(crr.source))}
          >
            {crr.source}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Valeur principale */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {crr.value !== null ? crr.value : "—"}
            </span>
            <span className="text-sm text-muted-foreground">TSS/7j</span>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("w-5 h-5", status.color)} />
            <span className={cn("text-sm font-medium", status.color)}>{status.label}</span>
          </div>
        </div>
        
        {/* Barre de progression */}
        {crr.value !== null && (
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  crr.value < targets.chargeMinimale && "bg-blue-500",
                  crr.value >= targets.chargeMinimale && crr.value <= targets.chargeOptimale && "bg-green-500",
                  crr.value > targets.chargeOptimale && crr.value <= targets.chargeMaximale && "bg-amber-500",
                  crr.value > targets.chargeMaximale && "bg-red-500"
                )}
                style={{ 
                  width: `${Math.min(100, (crr.value / targets.chargeMaximale) * 100)}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{targets.chargeMinimale}</span>
              <span className="text-green-600 font-medium">{targets.chargeOptimale} (optimal)</span>
              <span>{targets.chargeMaximale}</span>
            </div>
          </div>
        )}
        
        {/* Confiance */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Confiance: {getCRRConfidenceLabel(crr.confidence)}</span>
          {crr.lastUpdated && (
            <span>Mis à jour: {crr.lastUpdated}</span>
          )}
        </div>
        
        {/* Warning message */}
        {crr.warningMessage && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{crr.warningMessage}</span>
          </div>
        )}
        
        {/* Mode staff: bouton édition */}
        {staffMode && onUpdate && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Edit2 className="w-4 h-4" />
                Ajuster la charge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajuster la Charge Récente</DialogTitle>
                <DialogDescription>
                  Cette valeur représente la charge réellement absorbée sur les 7 derniers jours.
                  Elle conditionne l'estimation du TTE, la robustesse et la race readiness.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="charge">TSS 7 jours</Label>
                  <Input
                    id="charge"
                    type="number"
                    placeholder="ex: 450"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    min={0}
                    max={2000}
                  />
                </div>
                
                {/* Cibles de référence */}
                <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                  <p className="font-medium">Cibles pour {targets.objectif}:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Minimum: {targets.chargeMinimale} TSS</li>
                    <li className="text-green-600">• Optimal: {targets.chargeOptimale} TSS</li>
                    <li>• Maximum: {targets.chargeMaximale} TSS</li>
                  </ul>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Info pédagogique (mode staff) */}
        {staffMode && (
          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                La charge récente conditionne le TTE estimé et l'axe Robustesse du Compass. 
                Une charge inconnue réduit la fiabilité des analyses.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      return { icon: AlertTriangle, color: "text-amber-500", label: "?" };
    }
    if (crr.value < targets.chargeMinimale) {
      return { icon: TrendingDown, color: "text-blue-500", label: "Faible" };
    }
    if (crr.value > targets.chargeMaximale) {
      return { icon: AlertTriangle, color: "text-red-500", label: "Élevée" };
    }
    return { icon: CheckCircle, color: "text-green-500", label: "OK" };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  return (
    <Card className={cn("", className)}>
      <CardContent className="px-3 py-2 space-y-2">
        {/* Ligne principale compacte */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Charge 7j</span>
            <span className="font-bold">
              {crr.value !== null ? crr.value : "—"}
            </span>
            <span className="text-xs text-muted-foreground">TSS</span>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("w-4 h-4", status.color)} />
            <span className={cn("text-sm font-medium", status.color)}>{status.label}</span>
            <Badge 
              variant="outline" 
              className={cn("text-xs h-5", getCRRSourceBgColor(crr.source), getCRRSourceColor(crr.source))}
            >
              {crr.source}
            </Badge>
          </div>
        </div>
        
        {/* Barre de progression compacte */}
        {crr.value !== null && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {targets.chargeMinimale}–{targets.chargeMaximale}
            </span>
          </div>
        )}
        
        {/* Warning message compact */}
        {crr.warningMessage && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{crr.warningMessage}</span>
          </div>
        )}
        
        {/* Mode staff: bouton édition inline */}
        {staffMode && onUpdate && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                <Edit2 className="w-3 h-3" />
                Ajuster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajuster la Charge Récente</DialogTitle>
                <DialogDescription>
                  TSS 7 jours – conditionne TTE, robustesse et race readiness.
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
                
                <div className="p-3 rounded-md bg-muted text-sm">
                  <span className="font-medium">Cibles {targets.objectif}: </span>
                  <span className="text-muted-foreground">
                    {targets.chargeMinimale} – <span className="text-green-600">{targets.chargeOptimale}</span> – {targets.chargeMaximale} TSS
                  </span>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Carte pour sélectionner la justification d'un TSS7j faible
 * Persiste automatiquement la valeur dans le snapshot
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { DbSnapshot } from "@/hooks/useCloudData";
import {
  LowCRRJustification,
  LOW_CRR_JUSTIFICATION_LABELS,
  LOW_CRR_JUSTIFICATION_EFFECTS,
} from "@/lib/wahoo/wahooSuggestionEngine";

interface LowCRRJustificationCardProps {
  snapshot: DbSnapshot | null;
  threshold?: number;
}

export function LowCRRJustificationCard({ 
  snapshot, 
  threshold = 250 
}: LowCRRJustificationCardProps) {
  const { updateSnapshot } = useCloudDataContext();

  const tss7d = snapshot?.tss_7d;
  const hasLowCRR = tss7d !== null && tss7d !== undefined && tss7d < threshold;
  const currentJustification = snapshot?.low_crr_justification as LowCRRJustification | undefined;

  const handleJustificationChange = async (value: string) => {
    if (!snapshot) return;
    const newValue = value === "none" ? null : value;
    await updateSnapshot(snapshot.id, { low_crr_justification: newValue });
  };

  // Don't render if TSS7j is not low
  if (!hasLowCRR) {
    return null;
  }

  return (
    <Card className="bg-amber-500/5 border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-amber-500">Charge récente faible</span>
          <Badge variant="outline" className="ml-auto text-xs">
            TSS7j : {tss7d}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Indiquez la raison de cette charge faible pour adapter les recommandations d'entraînement.
        </p>
        
        <Select
          value={currentJustification || "none"}
          onValueChange={handleJustificationChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez une raison..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Aucune justification</span>
            </SelectItem>
            {(Object.keys(LOW_CRR_JUSTIFICATION_LABELS) as LowCRRJustification[]).map((key) => (
              <SelectItem key={key} value={key}>
                <div className="flex flex-col">
                  <span>{LOW_CRR_JUSTIFICATION_LABELS[key]}</span>
                  <span className="text-xs text-muted-foreground">
                    {LOW_CRR_JUSTIFICATION_EFFECTS[key]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentJustification && (
          <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md border">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{LOW_CRR_JUSTIFICATION_LABELS[currentJustification]}</span>
              {" → "}
              {LOW_CRR_JUSTIFICATION_EFFECTS[currentJustification]}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * VLamaxV2Card — Carte affichant VLamax V2 avec plages et confiance
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { V2ConfidenceBadge } from "./V2ConfidenceBadge";
import { V2RangeBadge } from "./V2RangeBadge";
import { VLamaxRangeV2, getVLamaxCategoryColor, getVLamaxSourcesLabel } from "@/lib/v2";
import { Zap, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VLamaxV2CardProps {
  data: VLamaxRangeV2;
  sport?: "velo" | "cap" | "both";
}

export function VLamaxV2Card({ data, sport = "velo" }: VLamaxV2CardProps) {
  const sportLabel = sport === "cap" ? "CAP" : sport === "both" ? "Global" : "Vélo";
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax V2 ({sportLabel})
          </CardTitle>
          <V2ConfidenceBadge confidence={data.confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Valeur centrale */}
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight">
            {data.central.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">mmol/L/s</div>
        </div>

        {/* Plage réaliste */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground">Plage :</span>
          <V2RangeBadge min={data.min} max={data.max} />
        </div>

        {/* Catégorie */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Profil</span>
          <span className={cn("text-sm font-medium", getVLamaxCategoryColor(data.category))}>
            {data.categoryLabel}
          </span>
        </div>

        {/* Sources */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sources</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-[10px] cursor-help">
                  {data.sources.length} source{data.sources.length > 1 ? "s" : ""}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{getVLamaxSourcesLabel(data.sources)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Locked badge */}
        {data.isLocked && (
          <Badge className="w-full justify-center bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50">
            🔒 Valeur verrouillée (labo)
          </Badge>
        )}

        {/* Warnings */}
        {data.warnings.length > 0 && (
          <div className="space-y-1">
            {data.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Estimation Two For Coaching Lab V2™ — Interprétation coach requise</span>
        </div>
      </CardContent>
    </Card>
  );
}

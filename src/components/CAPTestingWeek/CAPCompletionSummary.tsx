/**
 * CAP Completion Summary - Shows progress through CAP testing week
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Target } from "lucide-react";
import { CAPCompletionStatus } from "@/data/capTestingWeek";
import { DbSnapshot } from "@/hooks/useCloudData";

interface CAPCompletionSummaryProps {
  status: CAPCompletionStatus;
  snapshot: DbSnapshot | null;
}

export function CAPCompletionSummary({ status, snapshot }: CAPCompletionSummaryProps) {
  const totalTests = 3; // Sprint 15s, VMA, Allure Seuil (core)
  const completedCount = status.completedTests.filter(t => 
    t.includes("D1") || t.includes("D3") || t.includes("Allure")
  ).length;
  const progressPercent = Math.round((completedCount / totalTests) * 100);

  return (
    <Card className={status.isComplete ? "border-green-500/30 bg-green-500/5" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Progression VLamax CAP
          </span>
          <Badge variant={status.isComplete ? "default" : "secondary"}>
            {progressPercent}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />
        
        <div className="grid grid-cols-2 gap-4">
          {/* Completed */}
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Complétés
            </p>
            <ul className="space-y-1">
              {status.completedTests.length > 0 ? (
                status.completedTests.map((test, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    ✓ {test}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground italic">Aucun test complété</li>
              )}
            </ul>
          </div>

          {/* Missing */}
          <div>
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Manquants
            </p>
            <ul className="space-y-1">
              {status.missingData.length > 0 ? (
                status.missingData.map((data, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    ○ {data}
                  </li>
                ))
              ) : (
                <li className="text-xs text-green-600 dark:text-green-400">Profil complet !</li>
              )}
            </ul>
          </div>
        </div>

        {/* Status message */}
        <div className={`p-2 rounded text-xs ${status.isComplete ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
          {status.message}
        </div>

        {/* Confidence adjustment */}
        {status.confidenceAdjustment !== 0 && (
          <p className="text-xs text-muted-foreground">
            Ajustement confiance protocole: {status.confidenceAdjustment > 0 ? "+" : ""}{(status.confidenceAdjustment * 100).toFixed(0)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * CAP Day Card - Displays a single day in the CAP Testing Week
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Timer, 
  Zap, 
  Target, 
  Activity,
  Moon,
  Play
} from "lucide-react";
import { CAPTestDay } from "@/data/capTestingWeek";

interface CAPDayCardProps {
  day: CAPTestDay;
  onStartTest: () => void;
  disabled?: boolean;
}

const iconMap = {
  rest: Activity,
  sprint: Zap,
  threshold: Target,
  vma: Timer,
  endurance: Activity,
  off: Moon,
};

const sessionTypeColors = {
  TEST: "bg-primary/10 text-primary border-primary/30",
  RECOVERY: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  REST: "bg-muted text-muted-foreground border-muted",
  VALIDATION: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

const sessionTypeLabels = {
  TEST: "Test",
  RECOVERY: "Récupération",
  REST: "Repos",
  VALIDATION: "Validation",
};

export function CAPDayCard({ day, onStartTest, disabled }: CAPDayCardProps) {
  const Icon = iconMap[day.icon] || Activity;
  const isTestDay = day.sessionType === "TEST";

  return (
    <Card className={`transition-all ${isTestDay ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isTestDay ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {day.dayKey}
                </Badge>
                <CardTitle className="text-base">{day.title}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{day.goal}</p>
            </div>
          </div>
          <Badge variant="outline" className={sessionTypeColors[day.sessionType]}>
            {sessionTypeLabels[day.sessionType]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {day.durationEstimateMin > 0 && (
              <span className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                ~{day.durationEstimateMin} min
              </span>
            )}
            {day.protocol.dataToRecord.length > 0 && (
              <span className="flex items-center gap-1">
                📊 {day.protocol.dataToRecord.length} données
              </span>
            )}
          </div>
          
          {isTestDay && (
            <Button 
              size="sm" 
              onClick={onStartTest}
              disabled={disabled}
              className="gap-1"
            >
              <Play className="w-4 h-4" />
              Commencer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

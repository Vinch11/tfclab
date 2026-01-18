/**
 * TFCL Day Card Component
 * Displays a single day of the testing week
 */

import { 
  Play, 
  Battery, 
  Zap, 
  Moon, 
  CheckCircle2,
  Clock,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TFCLTestDay } from "@/data/tfclTestingWeek";

interface TFCLDayCardProps {
  day: TFCLTestDay;
  onStartTest: () => void;
  disabled?: boolean;
}

const getSessionTypeConfig = (type: TFCLTestDay["sessionType"]) => {
  switch (type) {
    case "TEST":
      return {
        icon: Zap,
        color: "bg-red-500/10 text-red-500 border-red-500/30",
        badgeVariant: "destructive" as const,
        label: "TEST"
      };
    case "RECOVERY":
      return {
        icon: Battery,
        color: "bg-green-500/10 text-green-500 border-green-500/30",
        badgeVariant: "secondary" as const,
        label: "RÉCUP"
      };
    case "REST":
      return {
        icon: Moon,
        color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
        badgeVariant: "outline" as const,
        label: "REPOS"
      };
    case "VALIDATION":
      return {
        icon: CheckCircle2,
        color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
        badgeVariant: "secondary" as const,
        label: "VALIDATION"
      };
    default:
      return {
        icon: Clock,
        color: "bg-muted text-muted-foreground",
        badgeVariant: "outline" as const,
        label: "—"
      };
  }
};

export function TFCLDayCard({ day, onStartTest, disabled }: TFCLDayCardProps) {
  const config = getSessionTypeConfig(day.sessionType);
  const Icon = config.icon;

  const isTestDay = day.sessionType === "TEST";

  return (
    <Card className={`transition-all hover:shadow-md ${isTestDay ? 'border-primary/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Day indicator */}
          <div className={`p-3 rounded-lg border ${config.color} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-muted-foreground">
                  {day.dayKey}
                </span>
                <h3 className="font-semibold text-foreground truncate">
                  {day.title}
                </h3>
              </div>
              <Badge variant={config.badgeVariant} className="shrink-0">
                {config.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {day.goal}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {day.durationEstimateMin > 0 
                    ? `~${day.durationEstimateMin} min` 
                    : "Repos complet"}
                </span>
              </div>

              {isTestDay && (
                <Button 
                  size="sm" 
                  onClick={onStartTest}
                  disabled={disabled}
                  className="gap-1"
                >
                  <Play className="h-3 w-3" />
                  Lancer la fiche test
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}

              {day.sessionType === "VALIDATION" && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onStartTest}
                  disabled={disabled}
                  className="gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Enregistrer
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

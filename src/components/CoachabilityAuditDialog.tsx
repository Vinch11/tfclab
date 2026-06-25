import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gauge, CheckCircle2, AlertTriangle, AlertCircle, MinusCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeCoachability,
  inferObjective,
  type CoachabilityObjective,
  type CoachabilityCriterion,
} from "@/lib/coachabilityAudit";

interface CoachabilityAuditDialogProps {
  snapshot: any;
  athleteName: string;
  athleteGoal?: string | null;
  trigger?: React.ReactNode;
}

const OBJECTIVES: { value: CoachabilityObjective; label: string }[] = [
  { value: "run_short", label: "Course route 5/10/20km / Semi" },
  { value: "run_marathon", label: "Marathon" },
  { value: "trail_short", label: "Trail court (<30km)" },
  { value: "trail_mountain", label: "Trail montagne 30-60km" },
  { value: "trail_ultra", label: "Ultra (>60km)" },
  { value: "tri_703", label: "Ironman 70.3" },
  { value: "tri_im", label: "Ironman" },
  { value: "bike", label: "Cyclisme route" },
];

const reliabilityCfg = {
  high: { label: "Fiable", color: "text-success", bg: "bg-success/10", ring: "ring-success/30" },
  medium: { label: "Correct", color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/30" },
  low: { label: "Prudence", color: "text-warning", bg: "bg-warning/10", ring: "ring-warning/30" },
  insufficient: { label: "Insuffisant", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
};

const statusCfg: Record<CoachabilityCriterion["status"], { icon: any; color: string }> = {
  ok: { icon: CheckCircle2, color: "text-success" },
  partial: { icon: AlertCircle, color: "text-primary" },
  stale: { icon: AlertTriangle, color: "text-warning" },
  missing: { icon: MinusCircle, color: "text-destructive" },
};

export function CoachabilityAuditDialog({
  snapshot,
  athleteName,
  athleteGoal,
  trigger,
}: CoachabilityAuditDialogProps) {
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState<CoachabilityObjective>(() => inferObjective(athleteGoal));

  const report = useMemo(
    () => computeCoachability(snapshot ?? null, objective),
    [snapshot, objective]
  );

  const cfg = reliabilityCfg[report.reliability];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-2">
            <Gauge className="w-4 h-4" />
            Audit de coachabilité
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Audit de coachabilité — {athleteName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Score 0-100 : à quel point peut-on se fier au moteur pour bâtir le coaching de cet athlète sur l'objectif sélectionné ?
          </p>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-6 pb-6">

          {/* Sélecteur objectif */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Objectif :</span>
            <Select value={objective} onValueChange={(v) => setObjective(v as CoachabilityObjective)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score global */}
          <div className={cn("rounded-lg p-4 ring-1", cfg.bg, cfg.ring)}>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Score de coachabilité</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn("text-4xl font-bold tabular-nums", cfg.color)}>{report.score}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Badge className={cn("text-xs", cfg.bg, cfg.color, "border-0")}>{cfg.label}</Badge>
            </div>
            <Progress value={report.score} className="h-2 mt-3" />
            <p className="text-sm mt-3 text-foreground">{report.verdict}</p>
          </div>

          {/* Top gaps */}
          {report.topGaps.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                Pour gagner en fiabilité
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {report.topGaps.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-warning shrink-0">→</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Détail critères */}
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-2">
              {report.criteria.map((c) => {
                const Icon = statusCfg[c.status].icon;
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-md border border-border bg-card">
                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", statusCfg[c.status].color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{c.label}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {Math.round(c.score)}/100 · poids {Math.round(c.weight)}
                        </span>
                      </div>
                      <Progress value={c.score} className="h-1 mt-1.5" />
                      <p className="text-xs text-muted-foreground mt-1.5">{c.detail}</p>
                      {c.fix && (
                        <p className="text-xs text-foreground mt-1">
                          <span className="text-warning">Action : </span>{c.fix}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

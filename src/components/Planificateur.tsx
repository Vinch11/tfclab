// =============================================
// COMPOSANT PLANIFICATEUR PÉRIODISÉ
// Base → Build → Peak → Taper
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ChevronDown, ChevronRight, Target, Zap, TrendingUp, ArrowLeft } from "lucide-react";
import { Athlete, ObjectifType, getObjectifLabel } from "@/types/athlete";
import { MacroCycle, PlanWeek } from "@/types/planificateur";
import { 
  generateMacrocycle, 
  GoalPeriodization, 
  computePhases,
  getPhaseColor, 
  getSessionTypeColor 
} from "@/lib/planificateur";

interface PlanificateurProps {
  athlete: Athlete;
  onPlanGenerated?: (plan: MacroCycle) => void;
}

export function Planificateur({ athlete, onPlanGenerated }: PlanificateurProps) {
  const [goal, setGoal] = useState<ObjectifType>(athlete.objectif);
  const [totalWeeks, setTotalWeeks] = useState<number>(GoalPeriodization[goal]?.defaultWeeks || 16);
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  });
  const [plan, setPlan] = useState<MacroCycle | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());

  // Phases calculées
  const phases = useMemo(() => computePhases(goal, totalWeeks), [goal, totalWeeks]);

  const handleGenerate = () => {
    const newPlan = generateMacrocycle(athlete, goal, startDate, totalWeeks);
    setPlan(newPlan);
    onPlanGenerated?.(newPlan);
  };

  const toggleWeek = (weekIndex: number) => {
    setOpenWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekIndex)) {
        next.delete(weekIndex);
      } else {
        next.add(weekIndex);
      }
      return next;
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Vue formulaire
  if (!plan) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Planificateur Périodisé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Objectif</Label>
              <Select value={goal} onValueChange={(v) => {
                setGoal(v as ObjectifType);
                setTotalWeeks(GoalPeriodization[v]?.defaultWeeks || 16);
              }}>
                <SelectTrigger id="goal">
                  <SelectValue placeholder="Sélectionner l'objectif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IM">Ironman</SelectItem>
                  <SelectItem value="703">70.3 / Half Ironman</SelectItem>
                  <SelectItem value="Marathon">Marathon</SelectItem>
                  <SelectItem value="Semi">Semi-Marathon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weeks">Durée (semaines)</Label>
              <Input 
                id="weeks"
                type="number" 
                min={6} 
                max={30}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Math.max(6, Math.min(30, parseInt(e.target.value) || 16)))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Date de début</Label>
              <Input 
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Aperçu des phases */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Répartition des phases</h4>
            <div className="flex flex-wrap gap-2">
              {phases.map((phase) => {
                const colors = getPhaseColor(phase.name);
                return (
                  <Badge 
                    key={phase.name}
                    variant="outline"
                    className={`${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {phase.name}: {phase.weeks} sem.
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Infos athlète */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Athlète:</span>
                <span className="font-medium">{athlete.nom}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-muted-foreground">Objectif:</span>
                <span className="font-medium">{getObjectifLabel(goal)}</span>
              </div>
              {athlete.refs?.ftp && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-muted-foreground">FTP:</span>
                  <span className="font-medium">{athlete.refs.ftp}W</span>
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Générer le Macrocycle
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Vue plan généré
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Plan {getObjectifLabel(plan.goal)} – {athlete.nom}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setPlan(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Objectif:</span>
              <p className="font-medium">{getObjectifLabel(plan.goal)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Durée:</span>
              <p className="font-medium">{plan.totalWeeks} semaines</p>
            </div>
            <div>
              <span className="text-muted-foreground">Début:</span>
              <p className="font-medium">{formatDate(plan.startDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Zones:</span>
              <p className="font-medium">FC / Allure / Puissance</p>
            </div>
          </div>
        </div>

        {/* Semaines */}
        <div className="space-y-2">
          {plan.weeks.map((week) => (
            <WeekCard 
              key={week.weekIndex}
              week={week}
              isOpen={openWeeks.has(week.weekIndex)}
              onToggle={() => toggleWeek(week.weekIndex)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant carte de semaine
interface WeekCardProps {
  week: PlanWeek;
  isOpen: boolean;
  onToggle: () => void;
}

function WeekCard({ week, isOpen, onToggle }: WeekCardProps) {
  const phaseColors = getPhaseColor(week.phase);
  const dist = week.distribution;
  const distText = `A:${(dist.A * 100).toFixed(0)}% B:${(dist.B * 100).toFixed(0)}% C:${(dist.C * 100).toFixed(0)}% D:${(dist.D * 100).toFixed(0)}%`;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className={`
          p-3 rounded-lg border cursor-pointer transition-colors
          ${phaseColors.bg} ${phaseColors.border} hover:opacity-90
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">Semaine {week.weekIndex}</span>
              <Badge variant="outline" className={`${phaseColors.text} ${phaseColors.border} text-xs`}>
                {week.phase}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatDate(week.start)} → {formatDate(week.end)}</span>
              <span className="hidden md:inline">{distText}</span>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-24">Jour</TableHead>
                <TableHead className="w-16">Type</TableHead>
                <TableHead className="w-24">Sport</TableHead>
                <TableHead>Séance</TableHead>
                <TableHead className="w-20">Durée</TableHead>
                <TableHead>Zone cible</TableHead>
                <TableHead className="hidden lg:table-cell">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {week.sessions.map((session, idx) => {
                const typeColors = getSessionTypeColor(session.type);
                return (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{session.dayName}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${typeColors.bg} ${typeColors.text} text-xs`}
                      >
                        {session.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">{session.sport}</TableCell>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>
                      {session.durationMin > 0 ? `${session.durationMin} min` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{session.zoneTarget}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-48 truncate">
                      {session.notes}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

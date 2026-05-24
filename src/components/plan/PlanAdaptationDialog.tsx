/**
 * PlanAdaptationDialog — UI coach pour adapter un plan IA en cours
 *
 *  - Onglet "Patch rapide"        : transformations déterministes (Option 1)
 *  - Onglet "Régénérer fenêtre"   : régénération IA partielle (Option 2)
 *  - Onglet "Historique"          : journal des adaptations
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Zap, RefreshCw, History as HistoryIcon } from "lucide-react";
import { usePlanAdaptation, type PatchKind } from "@/hooks/usePlanAdaptation";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { AdaptationRecord } from "@/engines/plan/planAdaptationJournal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  coachId: string;
  athleteName?: string;
  currentPlan: ParsedPlan;
  athleteData: PlanAthleteData;
  baseConfig: PlanConfig;
  onAdapted?: () => void;
}

export function PlanAdaptationDialog({
  open,
  onOpenChange,
  athleteId,
  coachId,
  athleteName,
  currentPlan,
  athleteData,
  baseConfig,
  onAdapted,
}: Props) {
  const adapt = usePlanAdaptation();
  const [tab, setTab] = useState<"patch" | "window" | "history">("patch");
  const [history, setHistory] = useState<AdaptationRecord[]>([]);

  // ── Patch state
  const [patchKind, setPatchKind] = useState<PatchKind>("deload");
  const [targetWeek, setTargetWeek] = useState<number>(currentPlan.weeks[0]?.weekNumber ?? 1);
  const [dayIndex, setDayIndex] = useState<number>(1);
  const [reductionPct, setReductionPct] = useState<number>(25);
  const [newSport, setNewSport] = useState<"Vélo" | "Course" | "Natation" | "Home-trainer" | "Cross-training">(
    "Home-trainer"
  );
  const [weeksShift, setWeeksShift] = useState<number>(1);
  const [reason, setReason] = useState<string>("");

  // ── Window regen state
  const [fromWeek, setFromWeek] = useState<number>(currentPlan.weeks[0]?.weekNumber ?? 1);
  const [windowSize, setWindowSize] = useState<number>(3);

  useEffect(() => {
    if (open && tab === "history") {
      adapt.listHistory(athleteId).then(setHistory);
    }
  }, [open, tab, athleteId, adapt]);

  const handleApplyPatch = async () => {
    let options: Record<string, unknown> = { reason };
    switch (patchKind) {
      case "deload":
        options = { weekNumber: targetWeek, reductionPct: reductionPct / 100, reason };
        break;
      case "missed_session":
        options = { weekNumber: targetWeek, dayIndex, strategy: "move_next", reason };
        break;
      case "swap_modality":
        options = { weekNumber: targetWeek, dayIndex, newSport, reason };
        break;
      case "shift_race":
        options = { weeksShift, reason };
        break;
    }
    const res = await adapt.applyPatch({
      athleteId,
      coachId,
      currentPlan,
      triggeredBy: "coach_manual",
      kind: patchKind,
      options: options as never,
    });
    if (res && res.diff.length > 0) {
      onAdapted?.();
      onOpenChange(false);
    }
  };

  const handleWindowRegen = async () => {
    const toWeek = Math.min(fromWeek + windowSize - 1, currentPlan.totalWeeks);
    const merged = await adapt.regenerateWindow({
      athleteId,
      coachId,
      triggeredBy: "coach_manual",
      currentPlan,
      athleteData,
      baseConfig,
      fromWeek,
      toWeek,
      reason,
    });
    if (merged) {
      onAdapted?.();
      onOpenChange(false);
    }
  };

  const weeksOptions = currentPlan.weeks.map((w) => w.weekNumber);
  const dayLabels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adapter le plan {athleteName ? `— ${athleteName}` : ""}</DialogTitle>
          <DialogDescription>
            Modifier le plan IA en cours sans tout régénérer. Patch = instantané, Régénération fenêtre = ~15s IA.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="patch">
              <Zap className="w-4 h-4 mr-1" /> Patch rapide
            </TabsTrigger>
            <TabsTrigger value="window">
              <RefreshCw className="w-4 h-4 mr-1" /> Régénérer fenêtre
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="w-4 h-4 mr-1" /> Historique
            </TabsTrigger>
          </TabsList>

          {/* ─── PATCH ─── */}
          <TabsContent value="patch" className="space-y-4 mt-4">
            <div>
              <Label>Type de patch</Label>
              <Select value={patchKind} onValueChange={(v) => setPatchKind(v as PatchKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deload">Deload semaine (fatigue)</SelectItem>
                  <SelectItem value="missed_session">Reporter séance manquée</SelectItem>
                  <SelectItem value="swap_modality">Changer modalité (blessure)</SelectItem>
                  <SelectItem value="shift_race">Décaler date de course</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {patchKind !== "shift_race" && (
              <div>
                <Label>Semaine cible</Label>
                <Select value={String(targetWeek)} onValueChange={(v) => setTargetWeek(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weeksOptions.map((w) => (
                      <SelectItem key={w} value={String(w)}>Semaine {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {patchKind === "deload" && (
              <div>
                <Label>Intensité du deload : {reductionPct}%</Label>
                <Slider
                  value={[reductionPct]}
                  onValueChange={(v) => setReductionPct(v[0])}
                  min={10}
                  max={50}
                  step={5}
                />
              </div>
            )}

            {(patchKind === "missed_session" || patchKind === "swap_modality") && (
              <div>
                <Label>Jour</Label>
                <Select value={String(dayIndex)} onValueChange={(v) => setDayIndex(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayLabels.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {patchKind === "swap_modality" && (
              <div>
                <Label>Nouvelle modalité</Label>
                <Select value={newSport} onValueChange={(v) => setNewSport(v as typeof newSport)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home-trainer">Home-trainer</SelectItem>
                    <SelectItem value="Vélo">Vélo</SelectItem>
                    <SelectItem value="Course">Course</SelectItem>
                    <SelectItem value="Natation">Natation</SelectItem>
                    <SelectItem value="Cross-training">Cross-training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {patchKind === "shift_race" && (
              <div>
                <Label>Décalage (semaines, négatif = avancée)</Label>
                <Input
                  type="number"
                  value={weeksShift}
                  onChange={(e) => setWeeksShift(Number(e.target.value))}
                />
              </div>
            )}

            <div>
              <Label>Raison (optionnel)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Fatigue élevée 8/10, sommeil dégradé…"
                rows={2}
              />
            </div>

            <Button onClick={handleApplyPatch} disabled={adapt.isApplying} className="w-full">
              {adapt.isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Appliquer le patch
            </Button>
          </TabsContent>

          {/* ─── WINDOW REGEN ─── */}
          <TabsContent value="window" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Régénère une fenêtre de {windowSize} semaines via IA. Les semaines précédentes et suivantes restent intactes.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Démarrer à la semaine</Label>
                <Select value={String(fromWeek)} onValueChange={(v) => setFromWeek(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weeksOptions.map((w) => (
                      <SelectItem key={w} value={String(w)}>Semaine {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taille fenêtre : {windowSize} sem</Label>
                <Slider
                  value={[windowSize]}
                  onValueChange={(v) => setWindowSize(v[0])}
                  min={2}
                  max={5}
                  step={1}
                />
              </div>
            </div>

            <div>
              <Label>Motif</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VLamax a baissé de 0.10 — réorienter vers travail seuil…"
                rows={2}
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div>
                Fenêtre : <strong>S{fromWeek} → S{Math.min(fromWeek + windowSize - 1, currentPlan.totalWeeks)}</strong>
              </div>
              <div>Coût estimé : ~15s IA (vs ~2min régénération complète)</div>
            </div>

            <Button
              onClick={handleWindowRegen}
              disabled={adapt.isApplying || adapt.isRegenStreaming}
              className="w-full"
            >
              {(adapt.isApplying || adapt.isRegenStreaming) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {adapt.isRegenStreaming
                ? `Génération… ${adapt.regenProgress?.currentWeek ?? 0}/${adapt.regenProgress?.totalWeeks ?? windowSize}`
                : "Régénérer la fenêtre"}
            </Button>
          </TabsContent>

          {/* ─── HISTORY ─── */}
          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px] pr-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune adaptation enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((rec) => (
                    <div key={rec.id} className="border rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.adaptation_type === "patch" ? "secondary" : "default"}>
                          {rec.adaptation_type === "patch"
                            ? "Patch"
                            : rec.adaptation_type === "window_regen"
                            ? "Fenêtre IA"
                            : "Régen complète"}
                        </Badge>
                        <Badge variant="outline">{rec.triggered_by}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(rec.created_at).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      {rec.reason && <div className="text-xs">{rec.reason}</div>}
                      {rec.from_week != null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          S{rec.from_week}
                          {rec.to_week != null && rec.to_week !== rec.from_week ? `–S${rec.to_week}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

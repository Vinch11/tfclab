import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Plus,
  Trash2,
  Gauge,
  Zap,
  Activity,
  AlertTriangle,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FeedbackNolio,
  defaultFeedbackNolio,
  StabiliteType,
  EnergieType,
  rpeDescriptions,
  getRpeColor,
  getRpeBgColor,
  getEnergieLabel,
  getEnergieColor,
  analyzeFeedbackTrend,
} from "@/types/feedbackNolio";

interface FeedbackNolioManagerProps {
  feedbacks: FeedbackNolio[];
  onFeedbacksChange: (feedbacks: FeedbackNolio[]) => void;
}

export function FeedbackNolioManager({
  feedbacks,
  onFeedbacksChange,
}: FeedbackNolioManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFeedback, setNewFeedback] = useState<FeedbackNolio>({
    ...defaultFeedbackNolio,
    id: crypto.randomUUID(),
  });

  const handleAddFeedback = () => {
    if (!newFeedback.rpe) return;

    const feedbackToAdd: FeedbackNolio = {
      ...newFeedback,
      createdAt: new Date().toISOString(),
    };

    const updatedFeedbacks = [feedbackToAdd, ...feedbacks];
    onFeedbacksChange(updatedFeedbacks);
    setNewFeedback({ ...defaultFeedbackNolio, id: crypto.randomUUID() });
    setIsAdding(false);
  };

  const handleDeleteFeedback = (id: string) => {
    onFeedbacksChange(feedbacks.filter((f) => f.id !== id));
  };

  const trend = analyzeFeedbackTrend(feedbacks);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Feedback Post-Séance</h2>
            <p className="text-sm text-muted-foreground">Suivi de vos sensations</p>
          </div>
        </div>
        <Button
          variant={isAdding ? "outline" : "glow"}
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Feedback
            </>
          )}
        </Button>
      </div>

      {/* Trend Summary */}
      {feedbacks.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase">RPE Moyen</span>
            </div>
            <p className={cn("text-2xl font-bold font-mono", getRpeColor(trend.avgRpe))}>
              {trend.avgRpe}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground uppercase">Stabilité</span>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono",
              trend.stabilityScore >= 70 ? "text-success" : trend.stabilityScore >= 50 ? "text-warning" : "text-destructive"
            )}>
              {trend.stabilityScore}%
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground uppercase">Énergie</span>
            </div>
            <p className={cn("text-lg font-semibold", getEnergieColor(trend.dominantEnergie))}>
              {getEnergieLabel(trend.dominantEnergie)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground uppercase">État</span>
            </div>
            {trend.fatigueAlert ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Fatigue détectée</span>
              </div>
            ) : (
              <p className="text-lg font-semibold text-success">OK</p>
            )}
          </div>
        </div>
      )}

      {/* Add New Feedback Form */}
      {isAdding && (
        <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border animate-fade-in">
          <h3 className="text-sm font-medium text-foreground mb-4">Nouveau feedback</h3>
          
          {/* RPE Slider */}
          <div className="mb-6">
            <Label className="text-muted-foreground mb-3 block">
              RPE - Difficulté perçue: <span className={cn("font-bold", getRpeColor(newFeedback.rpe))}>{newFeedback.rpe}</span>
              <span className="text-xs ml-2">({rpeDescriptions[newFeedback.rpe]})</span>
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewFeedback({ ...newFeedback, rpe: value })}
                  className={cn(
                    "flex-1 h-10 rounded-lg transition-all duration-200 text-sm font-medium",
                    newFeedback.rpe === value
                      ? cn(getRpeBgColor(value), "text-primary-foreground scale-110")
                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Stabilité */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Stabilité de la séance</Label>
              <div className="flex gap-2">
                {(["stable", "instable"] as StabiliteType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewFeedback({ ...newFeedback, stabilite: s })}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border transition-all duration-200",
                      newFeedback.stabilite === s
                        ? s === "stable"
                          ? "border-success bg-success/10 text-success"
                          : "border-warning bg-warning/10 text-warning"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {s === "stable" ? "✓ Stable" : "⚡ Instable"}
                  </button>
                ))}
              </div>
            </div>

            {/* Énergie */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Profil énergétique ressenti</Label>
              <div className="flex gap-2">
                {(["diesel", "equilibre", "explosif"] as EnergieType[]).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewFeedback({ ...newFeedback, energie: e })}
                    className={cn(
                      "flex-1 py-3 px-3 rounded-lg border transition-all duration-200 text-sm",
                      newFeedback.energie === e
                        ? cn(
                            "border-current",
                            e === "diesel" && "bg-blue-400/10 text-blue-400 border-blue-400",
                            e === "equilibre" && "bg-success/10 text-success border-success",
                            e === "explosif" && "bg-accent/10 text-accent border-accent"
                          )
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {getEnergieLabel(e)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4 space-y-2">
            <Label className="text-muted-foreground">Notes (optionnel)</Label>
            <Textarea
              value={newFeedback.notes || ""}
              onChange={(e) => setNewFeedback({ ...newFeedback, notes: e.target.value })}
              className="bg-secondary/50 border-border focus:border-primary resize-none"
              placeholder="Sensations, observations..."
              rows={2}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="glow" onClick={handleAddFeedback}>
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* Feedback History */}
      <div className="space-y-3">
        {feedbacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun feedback enregistré</p>
            <p className="text-sm">Ajoutez votre premier feedback post-séance</p>
          </div>
        ) : (
          feedbacks.slice(0, 5).map((feedback) => (
            <div
              key={feedback.id}
              className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all duration-200 bg-secondary/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* RPE Badge */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                    getRpeBgColor(feedback.rpe),
                    "text-primary-foreground"
                  )}>
                    {feedback.rpe}
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground font-medium">
                        {format(new Date(feedback.createdAt || feedback.date), "d MMM yyyy", { locale: fr })}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        feedback.stabilite === "stable"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      )}>
                        {feedback.stabilite === "stable" ? "Stable" : "Instable"}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        feedback.energie === "diesel" && "bg-blue-400/10 text-blue-400",
                        feedback.energie === "equilibre" && "bg-success/10 text-success",
                        feedback.energie === "explosif" && "bg-accent/10 text-accent"
                      )}>
                        {getEnergieLabel(feedback.energie)}
                      </span>
                    </div>
                    {feedback.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {feedback.notes}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFeedback(feedback.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

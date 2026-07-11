/**
 * ═══════════════════════════════════════════════════════════════
 * TFCL™ GUIDANCE — Coach IA basé sur la méthodologie TFCL
 * 
 * Carte d'analyse IA contextuelle par athlète
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Brain, Flame, Sparkles, Trophy, Target, Loader2, RotateCcw, Send, MessageCircle, User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { calculateStreaks, getLevelName, getLevelIcon } from "@/lib/streaksEngine";
import { useAICoaching } from "@/hooks/useAICoaching";
import type { AICoachingAthleteContext } from "@/hooks/useAICoaching";
import { computeVLamaxBikeV2Enhanced } from "@/lib/v2/vlamaxBikeV2Enhanced";
import { getVlamaxForGoal } from "@/lib/vlamaxResolver";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import type { AmbitionLevel } from "@/types/ambitionLevel";
import type { TFCLCoachingCompassResult } from "@/lib/coachingCompass";

// ── Props ──────────────────────────────────────────────────────

export interface Phase3DashboardProps {
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  effectiveSnapshot?: {
    ftp?: number | null;
    weight_kg?: number | null;
    vlamax?: number | null;
    vlamax_run?: number | null;
    tte_observed_min?: number | null;
    vo2max?: number | null;
    pmax_5s?: number | null;
    p30s_w?: number | null;
    p60s_w?: number | null;
    map5min_w?: number | null;
    vma?: number | null;
    css?: number | null;
    fc_max?: number | null;
  } | null;
  ambition?: AmbitionLevel;
  compassResult?: TFCLCoachingCompassResult | null;
}

// ── Main Component ─────────────────────────────────────────────

export function Phase3Dashboard({
  athlete,
  snapshots,
  effectiveSnapshot,
  ambition,
}: Phase3DashboardProps) {
  const athleteSnapshots = useMemo(
    () => snapshots.filter((s) => s.athlete_id === athlete.id),
    [snapshots, athlete.id]
  );

  const streaks = useMemo(() => calculateStreaks(athleteSnapshots), [athleteSnapshots]);

  return (
    <AICoachingCard
      athlete={athlete}
      snapshot={effectiveSnapshot}
      snapshotCount={athleteSnapshots.length}
      ambition={ambition}
    />
  );
}

// ── Streaks & XP Card ──────────────────────────────────────────

function StreaksCard({ streaks }: { streaks: ReturnType<typeof calculateStreaks> }) {
  const levelName = getLevelName(streaks.level);
  const levelIcon = getLevelIcon(streaks.level);

  return (
    <Card className="overflow-hidden">
      {/* Level & XP header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Progression
          </CardTitle>
          <Badge variant="outline" className="text-sm gap-1">
            {levelIcon} Niv. {streaks.level} — {levelName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* XP Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">XP</span>
            <span className="font-mono font-semibold">{streaks.xp} XP</span>
          </div>
          <Progress value={streaks.levelProgress} className="h-2.5" />
          <p className="text-[11px] text-muted-foreground mt-1">
            {streaks.xpToNextLevel > 0
              ? `${streaks.xpToNextLevel} XP pour le niveau suivant`
              : "Niveau maximum atteint !"}
          </p>
        </div>

        {/* Streaks */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{streaks.currentStreak}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Série actuelle</p>
          </div>
          <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{streaks.bestStreak}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Meilleure série</p>
          </div>
        </div>

        {/* Progression Badges */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Objectifs de progression
          </p>
          <div className="space-y-2">
            {streaks.progressionBadges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-3">
                <span className={cn("text-base", !badge.earned && "opacity-40")}>
                  {badge.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-medium truncate",
                      badge.earned ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                      {badge.progress}%
                    </span>
                  </div>
                  <Progress value={badge.progress} className="h-1.5 mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── AI Coaching Card ───────────────────────────────────────────

function AICoachingCard({
  athlete,
  snapshot,
  snapshotCount,
  ambition,
  compassResult,
}: {
  athlete: DbAthlete;
  snapshot: Phase3DashboardProps["effectiveSnapshot"];
  snapshotCount: number;
  ambition?: AmbitionLevel;
  compassResult?: TFCLCoachingCompassResult | null;
}) {
  const { response, messages, isLoading, generateRecommendations, askFollowUp, reset } = useAICoaching();
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [questionInput, setQuestionInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleGenerate = () => {
    setHasGenerated(true);

    // Compute VLamax V2 Enhanced for diagnostic context
    let vlamaxComponents: AICoachingAthleteContext["vlamaxComponents"] = null;
    let vlamaxConfidence: number | null = null;
    let vlamaxConfidenceLabel: string | null = null;
    let vlamaxFormula: string | null = null;
    let vlamaxWarnings: string[] = [];

    if (snapshot?.ftp && snapshot.ftp > 0 && snapshot?.pmax_5s) {
      try {
        const v2Result = computeVLamaxBikeV2Enhanced({
          ftp: snapshot.ftp,
          p30s_w: snapshot.p30s_w ?? null,
          p60s_w: snapshot.p60s_w ?? null,
          map5min_w: snapshot.map5min_w ?? null,
          tte_min: snapshot.tte_observed_min ?? null,
          pmax_5s: snapshot.pmax_5s ?? null,
          weight_kg: snapshot.weight_kg ?? null,
          vo2max: snapshot.vo2max ?? null,
          objectif: athlete.goal || undefined,
        });

        if (v2Result.components) {
          vlamaxComponents = {
            mader_mlss: v2Result.components.mader_mlss,
            mader_tte: v2Result.components.mader_tte,
            scoreG: v2Result.components.scoreG,
            vlamax_from_wprime: v2Result.components.vlamax_from_wprime,
            fusion_method: v2Result.components.fusion_method,
            divergence: v2Result.components.divergence,
            S_pmax: v2Result.components.S_pmax,
            S30: v2Result.components.S30,
            S60: v2Result.components.S60,
            E: v2Result.components.E,
            D: v2Result.components.D,
            W: v2Result.components.W,
            wprimeKJ: v2Result.components.wprimeKJ,
          };
        }
        vlamaxConfidence = v2Result.confidence;
        vlamaxConfidenceLabel = v2Result.confidenceLabel;
        vlamaxFormula = v2Result.formula;
        vlamaxWarnings = v2Result.warnings;
      } catch (e) {
        console.warn("VLamax V2 computation for AI context failed:", e);
      }
    }

    generateRecommendations({
      nom: athlete.name,
      objectif: athlete.goal || undefined,
      ambition,
      ftp: snapshot?.ftp,
      weightKg: snapshot?.weight_kg,
      vlamax: snapshot?.vlamax,
      vlamaxRun: snapshot?.vlamax_run,
      vo2max: snapshot?.vo2max,
      vma: snapshot?.vma,
      css: snapshot?.css,
      fcMax: snapshot?.fc_max,
      tte: snapshot?.tte_observed_min,
      pmax5s: snapshot?.pmax_5s,
      p30s: snapshot?.p30s_w,
      p60s: snapshot?.p60s_w,
      map5min: snapshot?.map5min_w,
      snapshotCount,
      vlamaxComponents,
      vlamaxConfidence,
      vlamaxConfidenceLabel,
      vlamaxFormula,
      vlamaxWarnings,
      compassLimiter: compassResult?.limiter ? {
        type: compassResult.limiter.type,
        label: compassResult.limiter.label,
        description: compassResult.limiter.description,
        impactScore: compassResult.limiter.impactScore,
        confidence: compassResult.limiter.confidence,
      } : null,
      compassLeverage: compassResult?.leverage ? {
        type: compassResult.leverage.type,
        label: compassResult.leverage.label,
        description: compassResult.leverage.description,
        expectedAdaptations: compassResult.leverage.expectedAdaptations,
        workoutExamples: compassResult.leverage.workoutExamples,
        priority: compassResult.leverage.priority,
      } : null,
      compassDecision: compassResult?.decision ? {
        recommendedBlock: compassResult.decision.recommendedBlock,
        durationWeeks: compassResult.decision.durationWeeks,
        primaryWorkouts: compassResult.decision.primaryWorkouts,
        physiologicalTargets: compassResult.decision.physiologicalTargets,
        prohibitions: compassResult.decision.prohibitions,
        athleteMessage: compassResult.decision.athleteMessage,
        coachRationale: compassResult.decision.coachRationale,
      } : null,
      compassReadiness: compassResult?.readiness ? {
        potential: compassResult.readiness.potential,
        availability: compassResult.readiness.availability,
        governingFactor: compassResult.readiness.governingFactor,
      } : null,
    });
  };

  const handleAskQuestion = () => {
    const q = questionInput.trim();
    if (!q || isLoading) return;
    setQuestionInput("");
    askFollowUp(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const quickQuestions = [
    "Pourquoi cette VLamax ?",
    "Comment améliorer le TTE ?",
    "Quel est le limiteur principal ?",
    "Séances recommandées ?",
  ];

  return (
    <Card className={cn("overflow-hidden border-primary/20 transition-opacity", !isEnabled && "opacity-60")}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            TFCL™ Guidance
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasGenerated && isEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  setHasGenerated(false);
                  setQuestionInput("");
                }}
                className="h-8 text-xs gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={(v) => {
                setIsEnabled(v);
                if (!v) { reset(); setHasGenerated(false); setQuestionInput(""); }
              }}
              aria-label="Activer TFCL™ Guidance"
            />
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-4">
              <AnimatePresence mode="wait">
                {!hasGenerated ? (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-center py-6"
                  >
                    <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Analyse TFCL™ personnalisée pour{" "}
                      <strong>{athlete.name}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground/70 mb-4">
                      Limiteur prioritaire · Levier opérationnel · Q&A illimité
                    </p>
                    <Button onClick={handleGenerate} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Lancer l'analyse TFCL™
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col"
                  >
                    {/* Chat messages */}
                    <div className="max-h-[500px] overflow-y-auto space-y-3 pb-3">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-2",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                              <Brain className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}

                      {isLoading && messages.length === 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyse en cours...
                        </div>
                      )}

                      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          </div>
                          <span className="text-xs">Réflexion en cours...</span>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Quick questions after initial analysis */}
                    {messages.length === 1 && !isLoading && (
                      <div className="flex flex-wrap gap-1.5 py-2 border-t border-border/50">
                        {quickQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => askFollowUp(q)}
                            className="text-xs px-2.5 py-1 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Q&A input */}
                    {messages.length > 0 && (
                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Input
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Posez une question sur les métriques..."
                          disabled={isLoading}
                          className="text-sm h-9"
                        />
                        <Button
                          size="sm"
                          onClick={handleAskQuestion}
                          disabled={!questionInput.trim() || isLoading}
                          className="h-9 px-3"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default Phase3Dashboard;

/**
 * ═══════════════════════════════════════════════════════════════
 * TFCL™ GUIDANCE — Coach IA basé sur la méthodologie TFCL
 * 
 * Carte d'analyse IA contextuelle par athlète
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Brain, Flame, Sparkles, Trophy, Target, Loader2, RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { calculateStreaks, getLevelName, getLevelIcon } from "@/lib/streaksEngine";
import { useAICoaching } from "@/hooks/useAICoaching";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import type { AmbitionLevel } from "@/types/ambitionLevel";

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
    vma?: number | null;
    css?: number | null;
    fc_max?: number | null;
  } | null;
  ambition?: AmbitionLevel;
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
}: {
  athlete: DbAthlete;
  snapshot: Phase3DashboardProps["effectiveSnapshot"];
  snapshotCount: number;
  ambition?: AmbitionLevel;
}) {
  const { response, isLoading, generateRecommendations, reset } = useAICoaching();
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = () => {
    setHasGenerated(true);

    const lastSnapshotAge = snapshotCount > 0 ? undefined : undefined; // Could be computed

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
      snapshotCount,
    });
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            TFCL™ Guidance
          </CardTitle>
          {hasGenerated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setHasGenerated(false);
              }}
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardHeader>

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
                Limiteur prioritaire · Levier opérationnel · Recommandations
              </p>
              <Button onClick={handleGenerate} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Lancer l'analyse TFCL™
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isLoading && !response && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </div>
              )}
              {response && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              )}
              {isLoading && response && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Génération en cours...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default Phase3Dashboard;

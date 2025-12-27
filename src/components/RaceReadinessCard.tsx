import { useMemo } from "react";
import { Target, TrendingUp, Zap, Heart, Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete } from "@/types/athlete";
import { calculRaceReadiness, texteExplicatifAthlete, RaceReadinessResult } from "@/lib/raceReadiness";

interface RaceReadinessCardProps {
  athlete: Athlete;
}

export function RaceReadinessCard({ athlete }: RaceReadinessCardProps) {
  const readiness = useMemo(() => calculRaceReadiness(athlete), [athlete]);
  const texte = useMemo(() => texteExplicatifAthlete(athlete), [athlete]);

  if (!readiness) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Race Readiness</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
      </div>
    );
  }

  const scoreColor = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[readiness.color] || "text-muted-foreground";

  const scoreBg = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[readiness.color] || "bg-muted";

  const detailItems = [
    { key: "vlamax", label: "VLamax", icon: Zap, value: readiness.details.vlamax, color: "text-primary" },
    { key: "endurance", label: "Endurance", icon: Activity, value: readiness.details.endurance, color: "text-accent" },
    { key: "puissance", label: "Puissance", icon: TrendingUp, value: readiness.details.puissance, color: "text-warning" },
    { key: "fraicheur", label: "Fraîcheur", icon: Heart, value: readiness.details.fraicheur, color: "text-success" },
  ];

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Race Readiness</h2>
            <p className="text-sm text-muted-foreground">Score détaillé de préparation</p>
          </div>
        </div>
        <div className={cn("px-4 py-2 rounded-xl", `bg-${readiness.color}/10`)}>
          <span className={cn("font-semibold", scoreColor)}>{readiness.label}</span>
        </div>
      </div>

      {/* Main Score */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score Circle */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-secondary/30 border border-border">
          <div className="relative w-40 h-40">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="hsl(var(--secondary))"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={`hsl(var(--${readiness.color}))`}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(readiness.score / 100) * 440} 440`}
                className="transition-all duration-1000"
              />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-5xl font-bold font-mono", scoreColor)}>
                {readiness.score}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        {/* Detail Scores */}
        <div className="space-y-4">
          {detailItems.map((item) => (
            <div key={item.key} className="p-3 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <span className={cn("font-mono font-bold", item.color)}>
                  {item.value}/25
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", scoreBg)}
                  style={{ width: `${(item.value / 25) * 100}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Texte Explicatif */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          Analyse personnalisée
        </h3>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {texte.split('\n').map((line, i) => {
            if (line.includes('**')) {
              // Parse bold text
              const parts = line.split('**');
              return (
                <p key={i} className="mb-2">
                  {parts.map((part, j) => 
                    j % 2 === 1 ? (
                      <span key={j} className="font-semibold text-foreground">{part}</span>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
              );
            }
            if (line.startsWith('•')) {
              return <p key={i} className="ml-4 mb-1">{line}</p>;
            }
            return line ? <p key={i} className="mb-2">{line}</p> : <br key={i} />;
          })}
        </div>
      </div>
    </div>
  );
}

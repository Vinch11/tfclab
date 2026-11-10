import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ChunkProgress } from "@/hooks/useAITrainingPlan";

const fmt = (s: number) => `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, "0")} s`;

/** Affichage seul : dérive les étapes de l'avancement déjà fourni par le générateur. */
export function GenerationProgressPanel({ progress }: { progress: ChunkProgress | null }) {
  const start = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = (now - start.current) / 1000;
  const total = progress?.totalWeeks ?? 0;
  const week = Math.min(progress?.currentWeek ?? 0, total);
  const ratio = total > 0 ? week / total : 0;
  const pct = Math.round(5 + ratio * 90);
  const eta = ratio > 0.05 && ratio < 1 ? (elapsed / ratio) * (1 - ratio) : null;
  const stage = !progress || week === 0 ? 0 : ratio < 1 ? 1 : 2;
  const steps = [
    "Préparation : profil, limiteurs, catalogue et contraintes",
    progress && progress.totalChunks > 1
      ? `Écriture des semaines — bloc ${progress.currentChunk}/${progress.totalChunks}, semaine ${week}/${total}`
      : `Écriture des semaines${total ? ` — semaine ${week}/${total}` : ""}`,
    "Assemblage et contrôles finaux (règles, quotas, sécurité)",
  ];
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Génération en cours — {pct} %</span>
        <span className="text-muted-foreground">
          {fmt(elapsed)} écoulées{eta !== null ? ` · reste environ ${fmt(eta)}` : ""}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      <ol className="space-y-1.5 text-sm">
        {steps.map((label, i) => (
          <li key={i} className={`flex items-start gap-2 ${i > stage ? "text-muted-foreground" : ""}`}>
            {i < stage ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              : i === stage ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              : <Circle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Le plan interactif s'affichera à la fin. Ne fermez pas la page.</p>
    </div>
  );
}

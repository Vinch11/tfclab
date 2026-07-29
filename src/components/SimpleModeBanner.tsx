/**
 * SimpleModeBanner — Bandeau permanent du mode simplifié
 * Un seul clic pour révéler l'interface complète (pas de réglage caché).
 */

import { Sparkles, Eye } from "lucide-react";
import { useCoachLevel } from "@/hooks/useCoachLevel";

export function SimpleModeBanner() {
  const { isSimpleMode, setLevel } = useCoachLevel();

  if (!isSimpleMode) return null;

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-b border-border/40 bg-primary/5">
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
        <span className="font-medium text-foreground">Mode simplifié</span>
        <span className="hidden sm:inline"> — l'essentiel pour coacher sans se perdre</span>
      </p>
      <button
        onClick={() => setLevel("advanced")}
        className="ml-auto flex items-center gap-1 text-[11px] sm:text-xs font-medium text-primary hover:underline shrink-0"
      >
        <Eye className="h-3.5 w-3.5" />
        Voir tout
      </button>
    </div>
  );
}

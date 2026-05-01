/**
 * LimiterImpactCard — Encart inline expansible "Pourquoi c'est important ?"
 *
 * Affiche en 2 phrases (terrain + mécanisme) l'impact concret d'un limiteur
 * détecté. Format mobile-friendly (≥44px target), discret, ouvrable au tap.
 */

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLimiterImpactCopy } from "@/lib/limiterImpactCopy";
import type { UnifiedLimiter } from "@/lib/v2/unifiedLimiterDetection";

interface LimiterImpactCardProps {
  limiter: UnifiedLimiter | string | null | undefined;
  /** Override label affiché dans le bouton (sinon "Pourquoi c'est important ?") */
  triggerLabel?: string;
  /** Forcer ouvert par défaut */
  defaultOpen?: boolean;
  className?: string;
}

const ACCENT_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  destructive: {
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    text: "text-destructive",
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    text: "text-warning",
  },
  primary: {
    border: "border-primary/30",
    bg: "bg-primary/5",
    text: "text-primary",
  },
  muted: {
    border: "border-border",
    bg: "bg-muted/30",
    text: "text-muted-foreground",
  },
};

export function LimiterImpactCard({
  limiter,
  triggerLabel = "Pourquoi c'est important ?",
  defaultOpen = false,
  className,
}: LimiterImpactCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const copy = getLimiterImpactCopy(limiter);
  const styles = ACCENT_STYLES[copy.accent] ?? ACCENT_STYLES.muted;

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-left transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          styles.border,
          open ? styles.bg : "bg-transparent"
        )}
      >
        <span className={cn("flex items-center gap-2 text-xs font-medium", styles.text)}>
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "mt-1.5 px-3 py-2.5 rounded-md border space-y-1.5 animate-in fade-in-0 slide-in-from-top-1",
            styles.border,
            styles.bg
          )}
        >
          <p className="text-xs leading-relaxed text-foreground">
            <span className={cn("font-semibold", styles.text)}>Concrètement —</span>{" "}
            {copy.sentence1}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold">Pourquoi —</span> {copy.sentence2}
          </p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

export function VersionBadge({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const buildLabel = BUILD_TIME
    ? new Date(BUILD_TIME).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

  const handleClick = () => {
    navigator.clipboard?.writeText(`v${APP_VERSION}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={`font-mono text-[10px] leading-none px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
            title="Version de l'application"
          >
            v{APP_VERSION}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-0.5">
            <div className="font-medium">Version {APP_VERSION}</div>
            {buildLabel && (
              <div className="text-muted-foreground">Build : {buildLabel}</div>
            )}
            <div className="text-muted-foreground">
              {copied ? "Copié ✓" : "Cliquer pour copier"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

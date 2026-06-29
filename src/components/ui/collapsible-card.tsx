import { useState, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  /** Si fourni, l'état ouvert/fermé est persisté dans localStorage sous cette clé. */
  storageKey?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

/**
 * Carte repliable. Par défaut fermée.
 * Le contenu est démonté lorsqu'elle est fermée pour économiser le rendu.
 * Si `storageKey` est fourni, l'état est persistant via localStorage.
 */
export function CollapsibleCard({
  title,
  icon,
  defaultOpen = false,
  storageKey,
  className,
  headerClassName,
  contentClassName,
  children,
  rightSlot,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (!storageKey) return defaultOpen;
    try {
      const raw = localStorage.getItem(`tfcl_collapsible_${storageKey}`);
      if (raw === null) return defaultOpen;
      return raw === "1";
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`tfcl_collapsible_${storageKey}`, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);

  return (
    <Card className={className}>
      <CardHeader
        className={cn(
          "pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg",
          headerClassName
        )}
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {rightSlot}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className={cn("space-y-4", contentClassName)}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

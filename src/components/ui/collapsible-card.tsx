import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}

/**
 * Carte repliable. Par défaut fermée.
 * Le contenu est démonté lorsqu'elle est fermée pour économiser le rendu.
 */
export function CollapsibleCard({
  title,
  icon,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
  children,
  rightSlot,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
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

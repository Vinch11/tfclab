/**
 * Wrapper pour une section réorganisable
 * Fournit le handle de drag et les indicateurs visuels en mode édition
 * Supporte le toggle de visibilité
 */

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableSectionWrapperProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
  label?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

export function SortableSectionWrapper({
  id,
  children,
  isEditMode,
  label,
  isVisible = true,
  onToggleVisibility,
}: SortableSectionWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isEditMode) {
    return <div id={`section-${id}`} className="animate-in fade-in-0 duration-300">{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50",
        !isVisible && "opacity-60"
      )}
    >
      {/* Controls flottants */}
      <div className="absolute -left-2 sm:-left-3 top-4 z-10 flex flex-col gap-1">
        {/* Handle de drag — 44px touch target on mobile */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "bg-muted border border-border rounded-md p-1.5 sm:p-1.5",
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
            "flex items-center justify-center",
            "cursor-grab active:cursor-grabbing",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
            "hover:bg-primary/10 hover:border-primary/30",
            isDragging && "opacity-100"
          )}
          title={`Déplacer: ${label || id}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Bouton visibilité */}
        {onToggleVisibility && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className={cn(
              "h-10 w-10 sm:h-8 sm:w-8 p-0 bg-muted border border-border rounded-md",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
              isVisible 
                ? "text-primary hover:text-primary/80 hover:bg-primary/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={isVisible ? "Masquer cette section" : "Afficher cette section"}
          >
            {isVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      
      {/* Bordure en mode édition */}
      <div
        className={cn(
          "rounded-lg transition-all",
          "ring-2 ring-dashed",
          isVisible 
            ? "ring-primary/20" 
            : "ring-muted-foreground/20",
          isDragging && "ring-primary/50",
          !isVisible && "bg-muted/30"
        )}
      >
        {children}
      </div>
      
      {/* Label en mode édition */}
      {label && (
        <div className={cn(
          "absolute -top-2.5 left-12 px-2 bg-background text-xs font-medium flex items-center gap-1.5",
          isVisible ? "text-muted-foreground" : "text-muted-foreground/60"
        )}>
          {!isVisible && <EyeOff className="h-3 w-3" />}
          {label}
        </div>
      )}
    </div>
  );
}

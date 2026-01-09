/**
 * Wrapper pour rendre une section réorganisable via drag & drop
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableSectionWrapperProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  label?: string;
}

export function SortableSectionWrapper({
  id,
  children,
  isEditMode,
  label,
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
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Handle de drag */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
          "bg-muted border border-border rounded-md p-1.5",
          "cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-primary/10 hover:border-primary/30",
          isDragging && "opacity-100"
        )}
        title={`Déplacer: ${label || id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Bordure en mode édition */}
      <div
        className={cn(
          "rounded-lg transition-all",
          "ring-2 ring-dashed ring-primary/20",
          isDragging && "ring-primary/50"
        )}
      >
        {children}
      </div>
      
      {/* Label en mode édition */}
      {label && (
        <div className="absolute -top-2.5 left-8 px-2 bg-background text-xs text-muted-foreground font-medium">
          {label}
        </div>
      )}
    </div>
  );
}

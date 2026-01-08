/**
 * Staff Mode Toggle – Bascule Mode Athlète / Mode Staff
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffModeToggleProps {
  staffMode: boolean;
  onToggle: (value: boolean) => void;
  className?: string;
}

export function StaffModeToggle({ staffMode, onToggle, className }: StaffModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-muted/50", className)}>
      <div className="flex items-center gap-2">
        <User className={cn("w-4 h-4", !staffMode && "text-primary")} />
        <span className={cn("text-sm", !staffMode && "font-medium text-primary")}>
          Athlète
        </span>
      </div>
      
      <Switch
        checked={staffMode}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-primary"
      />
      
      <div className="flex items-center gap-2">
        <Shield className={cn("w-4 h-4", staffMode && "text-primary")} />
        <span className={cn("text-sm", staffMode && "font-medium text-primary")}>
          Staff
        </span>
      </div>
    </div>
  );
}
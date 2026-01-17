/**
 * V2Toggle — Toggle pour activer le mode V2 Scientifique (Beta)
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { V2_CONFIG } from "@/lib/v2";
import { FlaskConical } from "lucide-react";

interface V2ToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  compact?: boolean;
}

export function V2Toggle({ enabled, onToggle, compact = false }: V2ToggleProps) {
  if (!V2_CONFIG.ENABLED) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          id="v2-mode"
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="v2-mode" className="text-xs cursor-pointer">
          V2
        </Label>
        {enabled && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-primary/10 border-primary/30">
            Beta
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="v2-mode-full" className="font-medium cursor-pointer">
              {V2_CONFIG.LABEL}
            </Label>
            {V2_CONFIG.SHOW_BETA_BADGE && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Beta
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {V2_CONFIG.DESCRIPTION}
          </p>
        </div>
      </div>
      <Switch
        id="v2-mode-full"
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

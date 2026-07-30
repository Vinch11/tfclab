/**
 * QuickActionsPanel — Actions rapides Dashboard
 * Créer snapshot, Importer test, Générer plan IA, Simuler course
 */

import { useNavigate } from "react-router-dom";
import { Camera, Upload, Sparkles, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuickActionsPanelProps {
  onCreateSnapshot?: () => void;
  onImportTest?: () => void;
}

const actions = [
  {
    id: "snapshot",
    label: "Créer snapshot",
    icon: Camera,
    route: null as string | null,
    action: "snapshot" as const,
  },
  {
    id: "import-test",
    label: "Importer test",
    icon: Upload,
    route: "/diagnostic",
    action: null,
  },
  {
    id: "ai-plan",
    label: "Générer plan IA",
    icon: Sparkles,
    route: "/planning",
    action: null,
  },
  {
    id: "simulate",
    label: "Simuler course",
    icon: Play,
    route: "/race",
    action: null,
  },
];

export function QuickActionsPanel({ onCreateSnapshot, onImportTest }: QuickActionsPanelProps) {
  const navigate = useNavigate();

  const handleClick = (action: typeof actions[number]) => {
    if (action.action === "snapshot" && onCreateSnapshot) {
      onCreateSnapshot();
      return;
    }
    if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="py-3 px-3 sm:px-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions rapides</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => handleClick(action)}
                className="h-auto py-2 sm:py-2.5 px-2 sm:px-3 flex flex-col items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium bg-primary/[0.04] border border-primary/10 text-muted-foreground hover:bg-primary/[0.08] hover:border-primary/20 hover:text-primary transition-all shadow-none"
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/60" />
                <span className="text-center leading-tight truncate w-full">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

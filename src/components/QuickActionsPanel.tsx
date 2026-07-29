/**
 * QuickActionsPanel — Actions rapides Dashboard
 * Créer snapshot, Importer test, Générer plan IA, Simuler course
 */

import { useNavigate } from "react-router-dom";
import { Camera, Upload, Sparkles, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCoachLevel } from "@/hooks/useCoachLevel";

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
  const { isSimpleMode } = useCoachLevel();

  // En mode simplifié, on masque les actions qui pointent vers des pages repliées
  const visibleActions = isSimpleMode
    ? actions.filter((a) => a.id !== "simulate")
    : actions;

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
        <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${visibleActions.length}, minmax(0, 1fr))` }}>

          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleClick(action)}
                className="h-auto py-2 sm:py-2.5 px-2 sm:px-3 flex flex-col items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-center leading-tight truncate w-full">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

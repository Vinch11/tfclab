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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleClick(action)}
                className="h-auto py-2.5 px-3 flex flex-col items-center gap-1.5 text-xs font-medium hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
              >
                <Icon className="h-4 w-4" />
                <span className="text-center leading-tight">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

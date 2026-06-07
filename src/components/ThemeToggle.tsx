import { Moon, Sun, Gem } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ThemeIcons: Record<Theme, React.ElementType> = {
  dark: Moon,
  light: Sun,
  emerald: Gem,
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const config = useTheme().themeConfig[theme];
  const Icon = ThemeIcons[theme];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg shrink-0 relative overflow-hidden group"
          >
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            <span className="sr-only">Changer le thème ({config.label})</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover border-border">
          <div className="text-center">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">Cliquer pour changer</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { Download, CheckCircle, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, install, showIOSInstructions } = usePWAInstall();

  if (isInstalled) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-green-500 cursor-default"
        title="Application installée"
      >
        <CheckCircle className="h-5 w-5" />
      </Button>
    );
  }

  if (showIOSInstructions) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Installer l'application"
          >
            <Download className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Installer sur iOS</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-2">
                <span>1.</span>
                <span>Appuyez sur</span>
                <Share className="h-4 w-4 inline" />
                <span>(Partager)</span>
              </p>
              <p>2. Faites défiler et appuyez sur "Sur l'écran d'accueil"</p>
              <p>3. Appuyez sur "Ajouter"</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={install}
      className="text-muted-foreground hover:text-foreground"
      title="Installer l'application"
    >
      <Download className="h-5 w-5" />
    </Button>
  );
}

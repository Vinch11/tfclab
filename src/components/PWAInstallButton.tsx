import { Download, CheckCircle, Share, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, install, showIOSInstructions, isIOS } = usePWAInstall();

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

  // If native install prompt is available, use it
  if (isInstallable) {
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

  // Show manual instructions for all platforms
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
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Installer Two 4 Coaching Lab</h4>
          
          {showIOSInstructions ? (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Sur iOS (Safari)
              </p>
              <p className="flex items-center gap-2">
                <span>1.</span>
                <span>Appuyez sur</span>
                <Share className="h-4 w-4 inline" />
                <span>(Partager)</span>
              </p>
              <p>2. Faites défiler et appuyez sur "Sur l'écran d'accueil"</p>
              <p>3. Appuyez sur "Ajouter"</p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground space-y-3">
              <div className="space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Sur PC (Chrome/Edge)
                </p>
                <p>1. Cliquez sur l'icône d'installation dans la barre d'adresse</p>
                <p>2. Ou allez dans Menu (⋮) → "Installer Two 4 Coaching Lab"</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Sur Android (Chrome)
                </p>
                <p>1. Appuyez sur Menu (⋮)</p>
                <p>2. Sélectionnez "Installer l'application"</p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

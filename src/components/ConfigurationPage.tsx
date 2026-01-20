/**
 * Configuration Page - Gestion des thèmes et préférences utilisateur
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Settings, Palette, Check } from "lucide-react";
import { useTheme, THEME_CONFIG, THEME_ORDER, Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { LayoutPreferencesEditor } from "./LayoutPreferencesEditor";

export function ConfigurationPage() {
  const { theme, setTheme, themeConfig } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Configuration</CardTitle>
              <CardDescription>
                Personnalisez l'apparence et les préférences de l'application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section Thèmes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Thèmes</CardTitle>
          </div>
          <CardDescription>
            Choisissez le thème visuel qui vous convient le mieux
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_ORDER.map((themeKey) => {
              const config = themeConfig[themeKey];
              const isActive = theme === themeKey;
              
              return (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all duration-300",
                    "hover:shadow-lg hover:scale-[1.02]",
                    isActive
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  {/* Badge actif */}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Check className="w-3 h-3" />
                        Actif
                      </Badge>
                    </div>
                  )}

                  {/* Preview du thème */}
                  <ThemePreview themeKey={themeKey} />

                  {/* Infos du thème */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{config.icon}</span>
                      <h3 className="font-semibold text-lg">{config.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section Layout Preferences */}
      <LayoutPreferencesEditor />

      {/* Section Préférences générales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Autres préférences</CardTitle>
          <CardDescription>
            Options d'affichage supplémentaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div>
              <Label className="font-medium">Mode Coach (Staff)</Label>
              <p className="text-sm text-muted-foreground">
                Affiche les informations détaillées pour les coachs
              </p>
            </div>
            <Badge variant="outline">Via Dashboard</Badge>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground text-center py-2">
            TWO FOR COACHING LAB™ — Version TFCL-V2.0
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Preview visuel miniature du thème */
function ThemePreview({ themeKey }: { themeKey: Theme }) {
  const previewStyles: Record<Theme, { bg: string; card: string; primary: string; accent: string }> = {
    dark: {
      bg: "bg-[hsl(222,47%,8%)]",
      card: "bg-[hsl(222,47%,11%)]",
      primary: "bg-[hsl(180,80%,55%)]",
      accent: "bg-[hsl(25,95%,55%)]",
    },
    classic: {
      bg: "bg-[hsl(220,25%,96%)]",
      card: "bg-white",
      primary: "bg-[hsl(220,65%,35%)]",
      accent: "bg-[hsl(45,90%,48%)]",
    },
  };

  const styles = previewStyles[themeKey];

  return (
    <div className={cn("rounded-lg p-3 h-24", styles.bg)}>
      <div className={cn("rounded-md p-2 h-full flex gap-2", styles.card)}>
        {/* Sidebar miniature */}
        <div className={cn("w-3 rounded-sm", styles.primary)} />
        
        {/* Content area */}
        <div className="flex-1 space-y-1.5">
          <div className={cn("h-2 w-12 rounded-full", styles.primary)} />
          <div className="flex gap-1">
            <div className={cn("h-6 w-8 rounded", styles.accent, "opacity-60")} />
            <div className={cn("h-6 w-8 rounded", styles.primary, "opacity-40")} />
          </div>
          <div className="h-1.5 w-16 rounded-full bg-gray-400/30" />
        </div>
      </div>
    </div>
  );
}

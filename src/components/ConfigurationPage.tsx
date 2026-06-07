/**
 * Configuration Page - Gestion des thèmes et préférences utilisateur
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Palette, Check, LayoutDashboard, Trophy, BookOpen } from "lucide-react";
import { useTheme, THEME_CONFIG, THEME_ORDER, Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { AdvancedLayoutEditor } from "./AdvancedLayoutEditor";
import { ReportSectionOrderEditor } from "./ReportSectionOrderEditor";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useGettingStartedVisibility } from "./GettingStartedChecklist";
import { Button } from "@/components/ui/button";

export function ConfigurationPage() {
  const { theme, setTheme, themeConfig } = useTheme();
  const { preferences, setPreference } = useUserPreferences();
  const gettingStartedVisibility = useGettingStartedVisibility();

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

      {/* Section Layout Preferences - Éditeur Avancé */}
      <AdvancedLayoutEditor />

      {/* Section Ordre des Sections du Rapport */}
      <ReportSectionOrderEditor />

      {/* Section Préférences d'affichage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Préférences d'affichage</CardTitle>
          </div>
          <CardDescription>
            Personnalisez le comportement par défaut des composants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Potentiel Physiologique compact mode */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium text-base">Potentiel Physiologique — Mode compact</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Affiche une version résumée sur le Dashboard avec possibilité d'étendre les détails
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.potentielPhysiologiqueCompactMode ?? true}
              onCheckedChange={(checked) => setPreference('potentielPhysiologiqueCompactMode', checked)}
              className="ml-4"
            />
          </div>

          <Separator />

          {/* Staff mode info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
            <div>
              <Label className="font-medium">Mode Coach (Staff)</Label>
              <p className="text-sm text-muted-foreground">
                Affiche les informations détaillées pour les coachs
              </p>
            </div>
            <Badge variant="outline">Via Dashboard</Badge>
          </div>

          <Separator />

          {/* Getting Started Guide */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium text-base">Guide "Bien démarrer"</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {gettingStartedVisibility.isHidden 
                    ? "Le guide d'aide au démarrage est actuellement masqué"
                    : "Le guide d'aide au démarrage est visible sur le dashboard"}
                </p>
              </div>
            </div>
            <Button
              variant={gettingStartedVisibility.isHidden ? "default" : "outline"}
              size="sm"
              onClick={gettingStartedVisibility.isHidden ? gettingStartedVisibility.show : gettingStartedVisibility.hide}
              className="ml-4"
            >
              {gettingStartedVisibility.isHidden ? "Afficher" : "Masquer"}
            </Button>
          </div>

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
    light: {
      bg: "bg-[hsl(220,25%,96%)]",
      card: "bg-white",
      primary: "bg-[hsl(220,65%,35%)]",
      accent: "bg-[hsl(45,90%,48%)]",
    },
    emerald: {
      bg: "bg-[#043327]",
      card: "bg-[#064e3b]",
      primary: "bg-[#c9a84c]",
      accent: "bg-[#0d7a5f]",
    },
  };

  const styles = previewStyles[themeKey];

  return (
    <div className={cn("rounded-lg p-3 h-24", styles.bg)}>
      <div className={cn("rounded-md p-2 h-full flex gap-2", styles.card)}>
        <div className={cn("w-3 rounded-sm", styles.primary)} />
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

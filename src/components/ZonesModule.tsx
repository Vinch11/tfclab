import { useState, useEffect } from "react";
import { Heart, Zap, Timer, Info, Calculator, ChevronDown, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ZonesConfig, 
  getZoneTable, 
  zoneColors, 
  ZoneDefinition,
  computeAbsoluteRange,
  AthleteRefsForZones
} from "@/lib/zonesConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAthletes } from "@/contexts/AthleteContext";
import { useToast } from "@/hooks/use-toast";

const metricIcons = {
  cardiaque: Heart,
  puissance: Zap,
  allure: Timer,
};

interface ZonesModuleProps {
  className?: string;
  defaultMetric?: "cardiaque" | "puissance" | "allure";
  defaultSport?: string;
}

export function ZonesModule({ 
  className, 
  defaultMetric = "puissance", 
  defaultSport = "cyclisme" 
}: ZonesModuleProps) {
  const { currentAthlete, updateAthlete } = useAthletes();
  const { toast } = useToast();
  
  const [activeMetric, setActiveMetric] = useState<string>(defaultMetric);
  const [activeSport, setActiveSport] = useState<string>(defaultSport);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  
  // Références locales (éditables)
  const [localRefs, setLocalRefs] = useState<AthleteRefsForZones>({
    fcMax: null,
    vma: null,
    ftp: null,
    css: null
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Charger les refs de l'athlète actuel
  useEffect(() => {
    if (currentAthlete?.refs) {
      setLocalRefs({
        fcMax: currentAthlete.refs.fcMax ?? null,
        vma: currentAthlete.refs.vma ?? null,
        ftp: currentAthlete.refs.ftp ?? null,
        css: currentAthlete.refs.css ?? null
      });
    }
  }, [currentAthlete]);

  const metric = ZonesConfig[activeMetric];
  const availableSports = Object.keys(metric.sports);
  const zones = getZoneTable(activeMetric, activeSport);

  const handleMetricChange = (value: string) => {
    setActiveMetric(value);
    const newSports = Object.keys(ZonesConfig[value].sports);
    setActiveSport(newSports[0]);
  };

  const handleRefChange = (key: keyof AthleteRefsForZones, value: string) => {
    const numVal = value === "" ? null : parseFloat(value);
    setLocalRefs(prev => ({ ...prev, [key]: numVal }));
    setHasChanges(true);
  };

  const handleSaveRefs = () => {
    if (!currentAthlete) return;
    
    updateAthlete({
      ...currentAthlete,
      refs: {
        fcMax: localRefs.fcMax,
        vma: localRefs.vma,
        ftp: localRefs.ftp,
        css: localRefs.css
      }
    });
    
    setHasChanges(false);
    toast({
      title: "Références sauvegardées",
      description: "Les zones sont maintenant calculées automatiquement."
    });
  };

  const getZoneColor = (zoneKey: string) => {
    const baseKey = zoneKey.replace(/[ab]$/, "");
    return zoneColors[zoneKey] || zoneColors[baseKey] || zoneColors.Z1;
  };

  const getRelevantRef = (): { label: string; value: number | null; key: keyof AthleteRefsForZones } | null => {
    if (activeMetric === "cardiaque") {
      return { label: "FCmax (bpm)", value: localRefs.fcMax, key: "fcMax" };
    }
    if (activeMetric === "puissance" && activeSport === "cyclisme") {
      return { label: "FTP (W)", value: localRefs.ftp, key: "ftp" };
    }
    if (activeMetric === "allure" && activeSport === "course") {
      return { label: "VMA (km/h)", value: localRefs.vma, key: "vma" };
    }
    if (activeMetric === "allure" && activeSport === "natation") {
      return { label: "CSS (sec/100m)", value: localRefs.css, key: "css" };
    }
    return null;
  };

  const relevantRef = getRelevantRef();

  return (
    <div className={cn("glass-card p-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/10 text-accent">
          <Heart className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Zones d'Entraînement</h2>
          <p className="text-sm text-muted-foreground">
            {currentAthlete ? currentAthlete.nom : "Aucun athlète sélectionné"}
          </p>
        </div>
      </div>

      {/* Références Athlète */}
      {currentAthlete && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-foreground text-sm">Références de {currentAthlete.nom}</p>
            {hasChanges && (
              <Button size="sm" onClick={handleSaveRefs} className="gap-2">
                <Save className="w-4 h-4" />
                Sauver
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">FCmax (bpm)</Label>
              <Input
                type="number"
                placeholder="190"
                value={localRefs.fcMax ?? ""}
                onChange={(e) => handleRefChange("fcMax", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">VMA (km/h)</Label>
              <Input
                type="number"
                placeholder="18.0"
                step="0.1"
                value={localRefs.vma ?? ""}
                onChange={(e) => handleRefChange("vma", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">FTP (W)</Label>
              <Input
                type="number"
                placeholder="260"
                value={localRefs.ftp ?? ""}
                onChange={(e) => handleRefChange("ftp", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CSS (sec/100m)</Label>
              <Input
                type="number"
                placeholder="95"
                value={localRefs.css ?? ""}
                onChange={(e) => handleRefChange("css", e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Cardiaque = %FCmax • Allure course = %VMA • Puissance cyclisme = %FTP • Natation = %CSS
          </p>
        </div>
      )}

      {/* Metric Tabs */}
      <Tabs value={activeMetric} onValueChange={handleMetricChange} className="mb-6">
        <TabsList className="grid grid-cols-3 w-full">
          {Object.entries(ZonesConfig).map(([key, config]) => {
            const Icon = metricIcons[key as keyof typeof metricIcons];
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Sport Filter */}
      {availableSports.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {availableSports.map((sport) => (
            <Button
              key={sport}
              variant={activeSport === sport ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSport(sport)}
              className="capitalize"
            >
              {sport}
            </Button>
          ))}
        </div>
      )}

      {/* Reference Status */}
      {relevantRef && (
        <div className={cn(
          "p-3 rounded-lg mb-4 flex items-center gap-2",
          relevantRef.value ? "bg-success/10 border border-success/30" : "bg-warning/10 border border-warning/30"
        )}>
          {relevantRef.value ? (
            <>
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm">
                <strong>{relevantRef.label}:</strong> {relevantRef.value} — valeurs absolues calculées
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">
                Renseigne <strong>{relevantRef.label}</strong> pour afficher les valeurs absolues
              </span>
            </>
          )}
        </div>
      )}

      {/* Zones Table */}
      <div className="space-y-2 mb-6">
        {zones.map((zone, idx) => {
          const colors = getZoneColor(zone.key);
          const isExpanded = expandedZone === zone.key;
          const absResult = computeAbsoluteRange(activeMetric, activeSport, zone, localRefs);
          
          return (
            <div
              key={zone.key}
              className={cn(
                "rounded-xl border transition-all duration-200 cursor-pointer",
                colors.border,
                isExpanded ? colors.bg : "hover:bg-secondary/30"
              )}
              onClick={() => setExpandedZone(isExpanded ? null : zone.key)}
            >
              <div className="p-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm", colors.bg, colors.text)}>
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold", colors.text)}>{zone.key}</span>
                    <span className="font-medium text-foreground">{zone.name}</span>
                  </div>
                  {/* Valeurs absolues sous le nom */}
                  {absResult.ok && (
                    <p className="text-sm font-mono text-accent mt-0.5">{absResult.display}</p>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-right w-16">
                    <p className="text-muted-foreground text-xs">Min</p>
                    <p className="font-mono font-medium text-foreground">{zone.min}%</p>
                  </div>
                  <div className="text-right w-16">
                    <p className="text-muted-foreground text-xs">Max</p>
                    <p className="font-mono font-medium text-foreground">{zone.max}%</p>
                  </div>
                  {zone.cogH !== undefined && (
                    <div className="text-right w-16">
                      <p className="text-muted-foreground text-xs">Charge/h</p>
                      <p className="font-mono font-medium text-foreground">{zone.cogH}</p>
                    </div>
                  )}
                </div>

                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 animate-fade-in">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <p className="text-sm text-muted-foreground">{zone.desc}</p>
                    
                    {/* Valeurs absolues détaillées */}
                    {absResult.ok && absResult.lo !== undefined && absResult.hi !== undefined && (
                      <div className="mt-3 p-2 rounded bg-accent/10 border border-accent/30">
                        <p className="text-xs text-muted-foreground mb-1">Cible pour {currentAthlete?.nom || "l'athlète"}</p>
                        <p className="font-mono font-bold text-accent">{absResult.display}</p>
                      </div>
                    )}
                    
                    {!absResult.ok && absResult.note && (
                      <div className="mt-3 p-2 rounded bg-warning/10 border border-warning/30">
                        <p className="text-xs text-warning">{absResult.note}</p>
                      </div>
                    )}
                    
                    <div className="sm:hidden mt-3 flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Min: </span>
                        <span className="font-mono font-medium">{zone.min}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max: </span>
                        <span className="font-mono font-medium">{zone.max}%</span>
                      </div>
                      {zone.cogH !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Charge/h: </span>
                          <span className="font-mono font-medium">{zone.cogH}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
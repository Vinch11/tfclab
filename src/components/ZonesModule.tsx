import { useState } from "react";
import { Heart, Zap, Timer, Info, Calculator, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZonesConfig, getZoneTable, getZoneTarget, zoneColors, ZoneDefinition } from "@/lib/zonesConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const metricIcons = {
  cardiaque: Heart,
  puissance: Zap,
  allure: Timer,
};

const metricUnits: Record<string, Record<string, string>> = {
  cardiaque: { "tout sport": "bpm" },
  puissance: { course: "W", cyclisme: "W" },
  allure: { course: "km/h", natation: "sec/100m" },
};

const referenceLabels: Record<string, Record<string, string>> = {
  cardiaque: { "tout sport": "FCmax ou LTHR" },
  puissance: { course: "FTP Course", cyclisme: "FTP Vélo" },
  allure: { course: "VMA", natation: "CSS" },
};

interface ZonesModuleProps {
  className?: string;
}

export function ZonesModule({ className }: ZonesModuleProps) {
  const [activeMetric, setActiveMetric] = useState<string>("cardiaque");
  const [activeSport, setActiveSport] = useState<string>("tout sport");
  const [referenceValue, setReferenceValue] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [convertResult, setConvertResult] = useState<{ min: number; max: number } | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const metric = ZonesConfig[activeMetric];
  const availableSports = Object.keys(metric.sports);
  const zones = getZoneTable(activeMetric, activeSport);
  const unit = metricUnits[activeMetric]?.[activeSport] || "";
  const refLabel = referenceLabels[activeMetric]?.[activeSport] || "Référence";

  const handleMetricChange = (value: string) => {
    setActiveMetric(value);
    const newSports = Object.keys(ZonesConfig[value].sports);
    setActiveSport(newSports[0]);
    setConvertResult(null);
    setSelectedZone("");
  };

  const handleConvert = () => {
    const ref = parseFloat(referenceValue);
    if (!ref || ref <= 0 || !selectedZone) return;
    
    const result = getZoneTarget(activeMetric, activeSport, selectedZone, ref, unit);
    if (result) {
      setConvertResult({ min: result.absMin, max: result.absMax });
    }
  };

  const getZoneColor = (zoneKey: string) => {
    const baseKey = zoneKey.replace(/[ab]$/, "");
    return zoneColors[zoneKey] || zoneColors[baseKey] || zoneColors.Z1;
  };

  return (
    <div className={cn("glass-card p-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/10 text-accent">
          <Heart className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Zones d'Entraînement</h2>
          <p className="text-sm text-muted-foreground">Cardiaque • Puissance • Allure</p>
        </div>
      </div>

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
              onClick={() => {
                setActiveSport(sport);
                setConvertResult(null);
              }}
              className="capitalize"
            >
              {sport}
            </Button>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Comment lire ces zones :</p>
            <p>Les % sont exprimés par rapport à une référence athlète :</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li><strong>Puissance cyclisme</strong> : % FTP</li>
              <li><strong>Allure course</strong> : % VMA ou % vitesse seuil</li>
              <li><strong>Allure natation</strong> : % CSS</li>
              <li><strong>Cardiaque</strong> : % FCmax ou % LTHR</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Zones Table */}
      <div className="space-y-2 mb-6">
        {zones.map((zone, idx) => {
          const colors = getZoneColor(zone.key);
          const isExpanded = expandedZone === zone.key;
          
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
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-right w-20">
                    <p className="text-muted-foreground text-xs">Min</p>
                    <p className="font-mono font-medium text-foreground">{zone.min}%</p>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-muted-foreground text-xs">Max</p>
                    <p className="font-mono font-medium text-foreground">{zone.max}%</p>
                  </div>
                  {zone.cogH !== undefined && (
                    <div className="text-right w-20">
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

      {/* Converter Tool */}
      <div className="p-4 rounded-xl border border-border bg-secondary/20">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-accent" />
          <h3 className="font-medium text-foreground">Convertisseur % → valeurs absolues</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Zone</label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.key} value={z.key}>
                    {z.key} – {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{refLabel} (100%)</label>
            <Input
              type="number"
              placeholder="ex: 280"
              value={referenceValue}
              onChange={(e) => setReferenceValue(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={handleConvert} className="w-full">
              Calculer
            </Button>
          </div>

          <div className="flex items-end">
            {convertResult && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 w-full">
                <p className="text-xs text-muted-foreground">Cible</p>
                <p className="font-mono font-bold text-accent">
                  {convertResult.min.toFixed(1)} – {convertResult.max.toFixed(1)} {unit}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

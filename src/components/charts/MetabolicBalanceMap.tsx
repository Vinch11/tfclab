/**
 * Metabolic Balance Map™ — Graphique signature Two For Coaching Lab™
 * 
 * Graphique 2D à bulles :
 * - Axe X = VLamax effectif
 * - Axe Y = TTE effectif
 * - Taille bulle = FTP/kg
 * - Couleur = Risque blessure
 */

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Info, MapPin, Target, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAP_ZONES,
  MAP_PEDAGOGY,
  generateMetabolicBalanceMapData,
  generateMapExplanation,
  type MapInput,
  type MapDataPoint,
  type MapZone,
} from "@/lib/v2/metabolicBalanceMap";
import type { InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";

// ============================================
// TYPES
// ============================================

interface MetabolicBalanceMapProps {
  vlamax: number | null;
  tte: number | null;
  ftpKg: number | null;
  riskEnvelope: InjuryRiskEnvelope | null;
  confidence?: number;
  objectif: string;
  athleteName?: string;
  staffMode?: boolean;
  showProjection?: boolean;
  deltaVlamax?: number;
  deltaTTE?: number;
  className?: string;
}

// ============================================
// CUSTOM TOOLTIP
// ============================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  staffMode: boolean;
  onOpenExplanation: (data: MapDataPoint) => void;
}

const CustomTooltip = ({ active, payload, staffMode, onOpenExplanation }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as MapDataPoint;
  
  return (
    <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-foreground">{data.name}</p>
        <Badge 
          variant="outline" 
          className="text-xs"
          style={{ borderColor: data.position.color, color: data.position.color }}
        >
          Zone {data.position.zone}
        </Badge>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">VLamax:</span>
          <span className="font-mono">{data.vlamax.toFixed(2)} mmol/L/s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">TTE:</span>
          <span className="font-mono">{data.tte} min</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">FTP/kg:</span>
          <span className="font-mono">{data.ftpKg.toFixed(1)} W/kg</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Risque:</span>
          <span 
            className="font-medium"
            style={{ color: data.position.color }}
          >
            {data.riskLevel} ({data.riskScore}%)
          </span>
        </div>
        
        {staffMode && (
          <>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Confiance:</span>
              <span className="font-mono">{Math.round(data.confidence * 100)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Zone:</span>
              <span className="text-xs">{data.position.zoneName}</span>
            </div>
          </>
        )}
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 text-xs"
        onClick={() => onOpenExplanation(data)}
      >
        <HelpCircle className="w-3 h-3 mr-1" />
        Pourquoi cette position ?
      </Button>
    </div>
  );
};

// ============================================
// EXPLANATION DIALOG
// ============================================

interface ExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MapDataPoint | null;
  objectif: string;
}

const ExplanationDialog = ({ open, onOpenChange, data, objectif }: ExplanationDialogProps) => {
  if (!data) return null;
  
  const explanation = generateMapExplanation(data, objectif);
  const zone = MAP_ZONES.find(z => z.id === data.position.zone);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Zone {data.position.zone} — {zone?.label}
          </DialogTitle>
          <DialogDescription>
            {zone?.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Pourquoi vous êtes ici */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Pourquoi vous êtes ici
            </h4>
            <p className="text-sm text-muted-foreground">
              {explanation.why}
            </p>
          </div>
          
          {/* Ce que cela implique */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Ce que cela implique
            </h4>
            <ul className="space-y-1">
              {explanation.implications.map((impl, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {impl}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Ce que l'app recommande */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Ce que l'app recommande
            </h4>
            <ul className="space-y-1">
              {explanation.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Target className="w-3 h-3 text-success mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Profils types */}
          {zone && (
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Profils typiques :</strong> {zone.profiles.join(', ')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// ZONE LEGEND
// ============================================

const ZoneLegend = ({ zones, compact = false }: { zones: MapZone[]; compact?: boolean }) => {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {zones.map(zone => (
          <div 
            key={zone.id}
            className="flex items-center gap-1 text-xs"
          >
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: zone.colorHsl }}
            />
            <span className="text-muted-foreground">{zone.shortLabel}</span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {zones.map(zone => (
        <div 
          key={zone.id}
          className="flex items-center gap-2 p-1.5 rounded-md"
          style={{ backgroundColor: `${zone.colorHsl}15` }}
        >
          <div 
            className="w-4 h-4 rounded-sm shrink-0"
            style={{ backgroundColor: zone.colorHsl }}
          >
            <span className="flex items-center justify-center h-full text-[10px] font-bold text-white">
              {zone.shortLabel}
            </span>
          </div>
          <span className="text-muted-foreground truncate">{zone.label}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function MetabolicBalanceMap({
  vlamax,
  tte,
  ftpKg,
  riskEnvelope,
  confidence = 0.7,
  objectif,
  athleteName = "Athlète",
  staffMode = false,
  showProjection: initialShowProjection = false,
  deltaVlamax = -0.05,
  deltaTTE = 5,
  className
}: MetabolicBalanceMapProps) {
  const [showProjection, setShowProjection] = useState(initialShowProjection);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<MapDataPoint | null>(null);
  
  // Compute map data
  const mapData = useMemo(() => {
    const input: MapInput = {
      id: 'current',
      name: athleteName,
      vlamax,
      tte,
      ftpKg,
      riskEnvelope,
      confidence,
      label: 'Actuel'
    };
    
    return generateMetabolicBalanceMapData(input, showProjection, deltaVlamax, deltaTTE);
  }, [vlamax, tte, ftpKg, riskEnvelope, confidence, athleteName, showProjection, deltaVlamax, deltaTTE]);
  
  const isDataMissing = vlamax === null || tte === null;
  const isLowConfidence = confidence < 0.5;
  
  // Chart data
  const chartData = useMemo(() => {
    const points: MapDataPoint[] = [];
    if (mapData.current) {
      points.push(mapData.current);
    }
    if (showProjection && mapData.projected) {
      points.push(mapData.projected);
    }
    return points;
  }, [mapData, showProjection]);
  
  const handleOpenExplanation = (data: MapDataPoint) => {
    setSelectedData(data);
    setExplanationOpen(true);
  };
  
  return (
    <>
      <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Metabolic Balance Map™
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Two For Coaching Lab™ — Carte métabolique signature
              </CardDescription>
            </div>
            
            {mapData.current && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: mapData.current.position.color,
                  color: mapData.current.position.color
                }}
              >
                Zone {mapData.current.position.zone}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {isDataMissing ? (
            <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm text-center">
                {vlamax === null && tte === null 
                  ? "VLamax et TTE non disponibles"
                  : vlamax === null 
                    ? "VLamax non disponible"
                    : "TTE non disponible"}
              </p>
              <p className="text-xs mt-1">Créez un profil ou effectuez un test</p>
            </div>
          ) : (
            <>
              {/* Toggle Projection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-projection"
                    checked={showProjection}
                    onCheckedChange={setShowProjection}
                  />
                  <Label htmlFor="show-projection" className="text-xs cursor-pointer">
                    Afficher projection après ajustements
                  </Label>
                </div>
                <ZoneLegend zones={MAP_ZONES} compact />
              </div>
              
              {isLowConfidence && (
                <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    Confiance limitée ({Math.round(confidence * 100)}%) — interpréter avec prudence
                  </p>
                </div>
              )}
              
              {/* Chart */}
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    
                    {/* Zone backgrounds */}
                    {/* Zone A - Endurance durable (bottom-left) */}
                    <ReferenceArea
                      x1={0.20}
                      x2={0.38}
                      y1={50}
                      y2={80}
                      fill="hsl(var(--success))"
                      fillOpacity={0.12}
                    />
                    {/* Zone B - Équilibré (center) */}
                    <ReferenceArea
                      x1={0.38}
                      x2={0.50}
                      y1={42}
                      y2={55}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.12}
                    />
                    {/* Zone C - Puissant fragile (right-center) */}
                    <ReferenceArea
                      x1={0.50}
                      x2={0.70}
                      y1={35}
                      y2={50}
                      fill="hsl(var(--warning))"
                      fillOpacity={0.12}
                    />
                    {/* Zone D - Explosif (right-bottom) */}
                    <ReferenceArea
                      x1={0.55}
                      x2={0.90}
                      y1={25}
                      y2={40}
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.12}
                    />
                    
                    {/* Zone labels */}
                    <text x="15%" y="15%" className="fill-success text-[10px] font-medium">A</text>
                    <text x="45%" y="35%" className="fill-primary text-[10px] font-medium">B</text>
                    <text x="65%" y="50%" className="fill-warning text-[10px] font-medium">C</text>
                    <text x="80%" y="75%" className="fill-destructive text-[10px] font-medium">D</text>
                    
                    <XAxis
                      type="number"
                      dataKey="vlamax"
                      domain={[0.20, 0.90]}
                      tickCount={8}
                      tick={{ fontSize: 10 }}
                      label={{ 
                        value: 'VLamax (mmol/L/s)', 
                        position: 'bottom', 
                        fontSize: 11, 
                        offset: 15 
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="tte"
                      domain={[25, 80]}
                      tickCount={6}
                      tick={{ fontSize: 10 }}
                      label={{ 
                        value: 'TTE (min)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        fontSize: 11 
                      }}
                    />
                    
                    {/* Z-axis for bubble size */}
                    <ZAxis 
                      type="number" 
                      dataKey={(d: MapDataPoint) => d.position.size} 
                      range={[100, 600]} 
                    />
                    
                    <Tooltip 
                      content={
                        <CustomTooltip 
                          staffMode={staffMode} 
                          onOpenExplanation={handleOpenExplanation}
                        />
                      } 
                    />
                    
                    <Scatter data={chartData} fill="hsl(var(--primary))">
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.position.color}
                          stroke={entry.position.isDashed ? "hsl(var(--muted-foreground))" : "hsl(var(--background))"}
                          strokeWidth={entry.position.isDashed ? 2 : 3}
                          strokeDasharray={entry.position.isDashed ? "4 4" : undefined}
                          opacity={entry.id === 'projected' ? 0.6 : 1}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pedagogical text */}
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground italic text-center">
                  {MAP_PEDAGOGY.mainText}
                </p>
              </div>
              
              {/* Staff mode details */}
              {staffMode && mapData.current && (
                <div className="space-y-2">
                  <ZoneLegend zones={MAP_ZONES} />
                  
                  <div className="p-2 bg-muted/30 rounded-lg text-xs space-y-1">
                    <p>
                      <strong>Position:</strong> VLamax={mapData.current.vlamax.toFixed(2)}, TTE={mapData.current.tte}min
                    </p>
                    <p>
                      <strong>Zone:</strong> {mapData.current.position.zoneName} ({mapData.current.position.zone})
                    </p>
                    <p>
                      <strong>FTP/kg:</strong> {mapData.current.ftpKg.toFixed(1)} W/kg (taille bulle)
                    </p>
                    <p>
                      <strong>Risque:</strong> {mapData.current.riskLevel} ({mapData.current.riskScore}%)
                    </p>
                    <p>
                      <strong>Confiance:</strong> {Math.round(mapData.current.confidence * 100)}%
                      {mapData.current.position.isDashed && " (contour pointillé)"}
                    </p>
                  </div>
                  
                  {showProjection && mapData.projected && (
                    <div className="p-2 bg-success/10 border border-success/30 rounded-lg text-xs">
                      <p className="font-medium text-success mb-1">Projection après ajustements</p>
                      <p>
                        VLamax: {mapData.current.vlamax.toFixed(2)} → {mapData.projected.vlamax.toFixed(2)}
                      </p>
                      <p>
                        TTE: {mapData.current.tte} → {mapData.projected.tte} min
                      </p>
                      <p>
                        Zone: {mapData.current.position.zone} → {mapData.projected.position.zone}
                      </p>
                    </div>
                  )}
                  
                  <div className="text-[10px] text-muted-foreground">
                    <p><strong>Usage staff:</strong></p>
                    <ul className="list-disc list-inside">
                      {MAP_PEDAGOGY.staffUsage.map((use, i) => (
                        <li key={i}>{use}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Explanation Dialog */}
      <ExplanationDialog
        open={explanationOpen}
        onOpenChange={setExplanationOpen}
        data={selectedData}
        objectif={objectif}
      />
    </>
  );
}

export default MetabolicBalanceMap;

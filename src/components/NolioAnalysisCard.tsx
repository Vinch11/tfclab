/**
 * NolioAnalysisCard — Persistent Nolio analysis panel in Profil tab
 * Shows editable raw values from snapshot with live V2 recalculation + graphs
 * Auto-syncs to snapshot on edit
 */
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Bike, PersonStanding, Zap, ChevronDown, ChevronUp, FlaskConical,
  Save, RefreshCw, TrendingUp, AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine, Legend
} from "recharts";
import { computeVLamaxBikeV2Enhanced, VLamaxBikeV2EnhancedResult, getVLamaxV2EnhancedCategory } from "@/lib/v2/vlamaxBikeV2Enhanced";
import { computeVLamaxRunV2Enhanced, VLamaxRunV2EnhancedResult, getRunVLamaxCategory, getRunGlycolyticCategoryColor } from "@/lib/v2/vlamaxRunV2Enhanced";
import { generateMaderPowerDurationCurve, buildOverlayData } from "@/lib/v2/maderPowerDurationCurve";
import type { MaderProfile } from "@/lib/v2/maderMetabolicModel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface NolioAnalysisCardProps {
  snapshot: DbSnapshot;
  staffMode?: boolean;
  objectif?: string;
  onSnapshotUpdated?: () => void;
}

// Editable field component
function EditableField({
  label,
  value,
  unit,
  onChange,
  highlight,
  min = 0,
  max = 5000,
  step = 1,
}: {
  label: string;
  value: number | null;
  unit: string;
  onChange: (v: number | null) => void;
  highlight?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className={`p-2 rounded border ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-background/70"}`}>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            onChange(v);
          }}
          className="h-7 text-sm font-mono px-1.5 bg-transparent border-0 border-b border-border rounded-none focus-visible:ring-0 focus-visible:border-primary"
          min={min}
          max={max}
          step={step}
        />
        <span className="text-[10px] text-muted-foreground shrink-0">{unit}</span>
      </div>
    </div>
  );
}

export function NolioAnalysisCard({ snapshot, staffMode, objectif = "IM", onSnapshotUpdated }: NolioAnalysisCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable state — initialized from snapshot
  const [localValues, setLocalValues] = useState({
    pmax_5s: snapshot.pmax_5s ?? null as number | null,
    p30s_w: snapshot.p30s_w ?? null as number | null,
    p60s_w: snapshot.p60s_w ?? null as number | null,
    map5min_w: snapshot.map5min_w ?? null as number | null,
    ftp: snapshot.ftp ?? null as number | null,
    vma: snapshot.vma ? Number(snapshot.vma) : null as number | null,
    running_power_threshold: snapshot.running_power_threshold ? Number(snapshot.running_power_threshold) : null as number | null,
    running_power_1s: snapshot.running_power_1s ? Number(snapshot.running_power_1s) : null as number | null,
    running_power_5s: snapshot.running_power_5s ? Number(snapshot.running_power_5s) : null as number | null,
    running_power_30s: snapshot.running_power_30s ? Number(snapshot.running_power_30s) : null as number | null,
    running_power_60s: snapshot.running_power_60s ? Number(snapshot.running_power_60s) : null as number | null,
    running_power_5min: snapshot.running_power_5min ? Number(snapshot.running_power_5min) : null as number | null,
    pace_threshold_sec_per_km: snapshot.pace_threshold_sec_per_km ?? null as number | null,
  });

  const weight = snapshot.weight_kg ? Number(snapshot.weight_kg) : 70;
  const vo2max = snapshot.vo2max ? Number(snapshot.vo2max) : null;
  const sportMain = snapshot.sport_main ?? "bike";
  const isBike = sportMain === "bike";
  const isRun = sportMain === "run" || sportMain === "cap" || sportMain === "course";

  // Check if there's meaningful data
  const hasBikeData = (localValues.ftp ?? 0) > 0 && (localValues.pmax_5s ?? 0) > 0;
  const hasRunData = (localValues.running_power_threshold ?? 0) > 0 || ((localValues.vma ?? 0) > 0 && (localValues.pace_threshold_sec_per_km ?? 0) > 0);

  const updateField = useCallback((field: keyof typeof localValues, value: number | null) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
  }, []);

  // Auto-save to snapshot
  const saveToSnapshot = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("snapshots")
        .update({
          pmax_5s: localValues.pmax_5s,
          p30s_w: localValues.p30s_w,
          p60s_w: localValues.p60s_w,
          map5min_w: localValues.map5min_w,
          ftp: localValues.ftp,
          vma: localValues.vma,
          running_power_threshold: localValues.running_power_threshold,
          running_power_1s: localValues.running_power_1s,
          running_power_5s: localValues.running_power_5s,
          running_power_30s: localValues.running_power_30s,
          running_power_60s: localValues.running_power_60s,
          running_power_5min: localValues.running_power_5min,
          pace_threshold_sec_per_km: localValues.pace_threshold_sec_per_km,
        })
        .eq("id", snapshot.id);

      if (error) throw error;
      toast.success("Snapshot mis à jour — moteur V2 recalculé");
      onSnapshotUpdated?.();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du snapshot");
    } finally {
      setSaving(false);
    }
  }, [localValues, snapshot.id, onSnapshotUpdated]);

  // VLamax Bike V2 Enhanced — live recalculation
  const bikeV2Result = useMemo<VLamaxBikeV2EnhancedResult | null>(() => {
    if (!hasBikeData) return null;
    return computeVLamaxBikeV2Enhanced({
      ftp: localValues.ftp!,
      pmax_5s: localValues.pmax_5s!,
      p30s_w: localValues.p30s_w ?? null,
      p60s_w: localValues.p60s_w ?? null,
      map5min_w: localValues.map5min_w ?? null,
      weight_kg: weight,
      vo2max: vo2max,
      objectif,
    });
  }, [localValues, weight, vo2max, objectif, hasBikeData]);

  // VLamax Run V2 Enhanced — live recalculation
  const runV2Result = useMemo<VLamaxRunV2EnhancedResult | null>(() => {
    if (!hasRunData) return null;
    return computeVLamaxRunV2Enhanced({
      runPowerThreshold: localValues.running_power_threshold ?? 0,
      runPower1s: localValues.running_power_1s ?? null,
      runPower5s: localValues.running_power_5s ?? null,
      runPower30s: localValues.running_power_30s ?? null,
      runPower60s: localValues.running_power_60s ?? null,
      runPower5min: localValues.running_power_5min ?? null,
      weightKg: weight,
      vma: localValues.vma ?? null,
      paceThresholdSecPerKm: localValues.pace_threshold_sec_per_km ?? null,
    });
  }, [localValues, weight, hasRunData]);

  // Mader overlay (bike)
  const bikeOverlay = useMemo(() => {
    if (!bikeV2Result || !vo2max || vo2max <= 0) return null;
    const durations = [5, 10, 15, 30, 45, 60, 120, 180, 300, 600, 1200, 1800, 3600];
    const profile: MaderProfile = { vo2max, vlamax: bikeV2Result.value, weight };
    try {
      const maderCurve = generateMaderPowerDurationCurve(profile, durations);
      const data = maderCurve.points.map(p => ({
        label: p.durationSec < 60 ? `${p.durationSec}s` : p.durationSec < 3600 ? `${Math.round(p.durationSec / 60)}'` : `${(p.durationSec / 3600).toFixed(1)}h`,
        mader: Math.round(p.powerWatts),
        durationSec: p.durationSec,
      }));
      return { data, cp: maderCurve.cp, wPrime: maderCurve.wPrime };
    } catch { return null; }
  }, [bikeV2Result, vo2max, weight]);

  const formatPace = (secKm: number | null) => {
    if (!secKm) return "—";
    const m = Math.floor(secKm / 60);
    const s = Math.round(secKm % 60);
    return `${m}:${String(s).padStart(2, "0")}/km`;
  };

  // Early return AFTER all hooks
  if (!hasBikeData && !hasRunData) return null;

  return (
    <Card className="border-primary/20 bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <FlaskConical className="w-5 h-5 text-primary" />
              <CardTitle className="text-base flex-1">
                Analyse Nolio — Données & Moteur V2
              </CardTitle>
              <div className="flex items-center gap-2">
                {bikeV2Result && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Bike className="w-3 h-3" />
                    {bikeV2Result.value.toFixed(2)}
                  </Badge>
                )}
                {runV2Result && runV2Result.formula !== "insufficient" && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <PersonStanding className="w-3 h-3" />
                    {runV2Result.value.toFixed(2)}
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* === BIKE SECTION === */}
            {hasBikeData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Données Vélo</p>
                </div>

                {/* Editable bike fields */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <EditableField label="Pmax 5s" value={localValues.pmax_5s} unit="W" onChange={v => updateField("pmax_5s", v)} highlight />
                  <EditableField label="P30s" value={localValues.p30s_w} unit="W" onChange={v => updateField("p30s_w", v)} highlight />
                  <EditableField label="P60s" value={localValues.p60s_w} unit="W" onChange={v => updateField("p60s_w", v)} />
                  <EditableField label="MAP 5'" value={localValues.map5min_w} unit="W" onChange={v => updateField("map5min_w", v)} />
                  <EditableField label="FTP" value={localValues.ftp} unit="W" onChange={v => updateField("ftp", v)} highlight />
                </div>

                {/* V2 Result */}
                {bikeV2Result && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <p className="text-2xl font-mono font-bold text-primary">{bikeV2Result.value.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">[{bikeV2Result.rangeMin.toFixed(2)} – {bikeV2Result.rangeMax.toFixed(2)}] mmol/L/s</p>
                      </div>
                      <Badge variant="secondary">{getVLamaxV2EnhancedCategory(bikeV2Result.value)}</Badge>
                      <span className="text-xs text-muted-foreground">Confiance: <span className="font-medium text-foreground">{(bikeV2Result.confidence * 100).toFixed(0)}%</span></span>
                      <Badge variant="outline" className="text-[10px]">{bikeV2Result.formulaLabel}</Badge>
                    </div>

                    {/* Score G indices */}
                    {bikeV2Result.components && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                        {bikeV2Result.components.S_pmax != null && <IndexPill label="S_pmax" value={bikeV2Result.components.S_pmax} />}
                        {bikeV2Result.components.S30 != null && <IndexPill label="S30" value={bikeV2Result.components.S30} />}
                        {bikeV2Result.components.S60 != null && <IndexPill label="S60" value={bikeV2Result.components.S60} />}
                        {bikeV2Result.components.E != null && <IndexPill label="E (MAP)" value={bikeV2Result.components.E} />}
                        {bikeV2Result.components.D != null && <IndexPill label="D (TTE)" value={bikeV2Result.components.D} />}
                        <IndexPill label="Score G" value={bikeV2Result.components.scoreG} highlight />
                      </div>
                    )}

                    {bikeV2Result.warnings.length > 0 && (
                      <div className="space-y-0.5">
                        {bikeV2Result.warnings.map((w, i) => (
                          <p key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <AlertCircle className="w-3 h-3 shrink-0" />{w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Mader Power-Duration Overlay */}
                {bikeOverlay && bikeOverlay.data.length > 3 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-muted-foreground">🔬 Modèle Mader (prédiction)</p>
                      <Badge variant="outline" className="text-[10px]">CP={bikeOverlay.cp}W · W'={bikeOverlay.wPrime}kJ</Badge>
                    </div>
                    <div className="h-36 w-full rounded-lg border border-border bg-background/50 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bikeOverlay.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                            formatter={(v: number) => [`${v} W`, "Modèle Mader"]}
                          />
                          <ReferenceLine y={bikeOverlay.cp} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `CP ${bikeOverlay.cp}W`, position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                          <Line type="monotone" dataKey="mader" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2.5, fill: "hsl(var(--destructive))" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === RUN SECTION === */}
            {hasRunData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PersonStanding className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Données Course</p>
                </div>

                {/* Editable run fields — power */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <EditableField label="P1s" value={localValues.running_power_1s} unit="W" onChange={v => updateField("running_power_1s", v)} highlight />
                  <EditableField label="P5s" value={localValues.running_power_5s} unit="W" onChange={v => updateField("running_power_5s", v)} />
                  <EditableField label="P30s" value={localValues.running_power_30s} unit="W" onChange={v => updateField("running_power_30s", v)} highlight />
                  <EditableField label="P60s" value={localValues.running_power_60s} unit="W" onChange={v => updateField("running_power_60s", v)} />
                  <EditableField label="P5'" value={localValues.running_power_5min} unit="W" onChange={v => updateField("running_power_5min", v)} />
                  <EditableField label="Pseuil" value={localValues.running_power_threshold} unit="W" onChange={v => updateField("running_power_threshold", v)} highlight />
                </div>

                {/* Editable run fields — pace/VMA */}
                <div className="grid grid-cols-3 gap-2">
                  <EditableField label="VMA" value={localValues.vma} unit="km/h" onChange={v => updateField("vma", v)} highlight step={0.1} />
                  <EditableField label="Allure seuil" value={localValues.pace_threshold_sec_per_km} unit="s/km" onChange={v => updateField("pace_threshold_sec_per_km", v)} highlight />
                  <div className="p-2 rounded border border-border bg-background/70">
                    <Label className="text-[10px] text-muted-foreground">Allure seuil</Label>
                    <p className="text-sm font-mono text-foreground">{formatPace(localValues.pace_threshold_sec_per_km)}</p>
                  </div>
                </div>

                {/* V2 Run Result */}
                {runV2Result && runV2Result.formula !== "insufficient" && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <p className="text-2xl font-mono font-bold text-primary">{runV2Result.value.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">[{runV2Result.rangeMin.toFixed(2)} – {runV2Result.rangeMax.toFixed(2)}] mmol/L/s</p>
                      </div>
                      <Badge variant="secondary">{getRunVLamaxCategory(runV2Result.value)}</Badge>
                      <span className="text-xs text-muted-foreground">Confiance: <span className="font-medium text-foreground">{(runV2Result.confidence * 100).toFixed(0)}%</span></span>
                      <Badge variant="outline" className="text-[10px]">{runV2Result.formulaLabel}</Badge>
                    </div>

                    {/* Score G indices */}
                    {runV2Result.components && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                        {runV2Result.components.S1 != null && <IndexPill label="S1" value={runV2Result.components.S1} />}
                        {runV2Result.components.S5 != null && <IndexPill label="S5" value={runV2Result.components.S5} />}
                        {runV2Result.components.S30 != null && <IndexPill label="S30" value={runV2Result.components.S30} />}
                        {runV2Result.components.S60 != null && <IndexPill label="S60" value={runV2Result.components.S60} />}
                        {runV2Result.components.E != null && <IndexPill label="E" value={runV2Result.components.E} />}
                        <IndexPill label="Score G" value={runV2Result.components.scoreG} highlight />
                      </div>
                    )}

                    {/* Glycolytic Profile */}
                    {runV2Result.runGlycolyticProfile && (
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Zap className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-muted-foreground">Profil glycolytique :</span>
                        <Badge variant="outline" className={`text-[10px] capitalize ${getRunGlycolyticCategoryColor(runV2Result.runGlycolyticProfile.category)}`}>
                          {runV2Result.runGlycolyticProfile.category}
                        </Badge>
                        {runV2Result.runGlycolyticProfile.glycolyticIndex != null && (
                          <span className="text-muted-foreground font-mono">GI={runV2Result.runGlycolyticProfile.glycolyticIndex.toFixed(2)}</span>
                        )}
                      </div>
                    )}

                    {runV2Result.warnings.length > 0 && (
                      <div className="space-y-0.5">
                        {runV2Result.warnings.map((w, i) => (
                          <p key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <AlertCircle className="w-3 h-3 shrink-0" />{w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === SAVE BUTTON === */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button
                size="sm"
                onClick={saveToSnapshot}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Appliquer au snapshot
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Modifie les valeurs ci-dessus puis clique pour mettre à jour le snapshot et recalculer tout le dashboard.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function IndexPill({ label, value, highlight }: { label: string; value?: number | null; highlight?: boolean }) {
  const display = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
  return (
    <div className={`p-1.5 rounded border text-center ${highlight ? "border-primary/30 bg-primary/10" : "border-border bg-muted/30"}`}>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{display}</p>
    </div>
  );
}

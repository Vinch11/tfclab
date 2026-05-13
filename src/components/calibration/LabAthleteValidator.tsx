import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

type Sport = "bike" | "run";

interface Row {
  label: string;
  predicted: number | null;
  observed: number;
  unit: string;
  delta: number | null;
  severity: "ok" | "warning" | "critical" | "n/a";
  formula: string;
}

function severityBadge(s: Row["severity"]) {
  if (s === "ok") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
  if (s === "warning") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Écart</Badge>;
  if (s === "critical") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critique</Badge>;
  return <Badge variant="outline">N/A</Badge>;
}

function classify(absDelta: number, warnAt: number, critAt: number): Row["severity"] {
  if (absDelta <= warnAt) return "ok";
  if (absDelta <= critAt) return "warning";
  return "critical";
}

export function LabAthleteValidator() {
  const [sport, setSport] = useState<Sport>("bike");
  const [vlamax, setVlamax] = useState<string>("");
  const [mlssPct, setMlssPct] = useState<string>(""); // % de VO2max ou %FTP, attendu 50-95
  const [ce, setCe] = useState<string>(""); // ml O2/kg/km (run only)
  const [athleteName, setAthleteName] = useState<string>("");

  const rows: Row[] = useMemo(() => {
    const vla = parseFloat(vlamax);
    const obsMLSS = parseFloat(mlssPct);
    const ceVal = parseFloat(ce);
    if (!isFinite(vla) || vla <= 0 || !isFinite(obsMLSS) || obsMLSS <= 0) return [];

    const out: Row[] = [];

    if (sport === "bike") {
      // Mader simplifié 91 − 28·VLa (approximation pédagogique, pas le moteur α=1.98 N=44)
      const predicted = 91 - 28 * vla;
      const delta = obsMLSS - predicted;
      out.push({
        label: "MLSS bike (Mader simplifié)",
        predicted: Number(predicted.toFixed(1)),
        observed: obsMLSS,
        unit: "% VO2max",
        delta: Number(delta.toFixed(1)),
        severity: classify(Math.abs(delta), 4, 8),
        formula: "MLSS% = 91 − 28·VLa",
      });
    } else {
      // Modèle C calibré (Run MLSS)
      const pred = predictRunMLSSPctFromVLaCE(vla, isFinite(ceVal) ? ceVal : undefined);
      if (pred) {
        const delta = obsMLSS - pred.mlssPct;
        out.push({
          label: "MLSS run (Modèle C, RMSE 2.64%)",
          predicted: pred.mlssPct,
          observed: obsMLSS,
          unit: "% VO2max",
          delta: Number(delta.toFixed(1)),
          severity: classify(Math.abs(delta), 3, 6),
          formula: pred.trace.formula,
        });
      } else {
        out.push({
          label: "MLSS run (Modèle C)",
          predicted: null,
          observed: obsMLSS,
          unit: "% VO2max",
          delta: null,
          severity: "n/a",
          formula: "Nécessite VLa run + CE (ml O2/kg/km)",
        });
      }
    }

    return out;
  }, [sport, vlamax, mlssPct, ce]);

  const reset = () => {
    setVlamax(""); setMlssPct(""); setCe(""); setAthleteName("");
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          Valider mon athlète (mesure labo)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Saisis les valeurs <strong>mesurées en laboratoire</strong> (VLamax + MLSS, +CE pour la course). Le moteur calcule l'écart instantané vs les modèles TFCL.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="col-span-2 md:col-span-1">
            <Label className="text-xs">Sport</Label>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant={sport === "bike" ? "default" : "outline"} onClick={() => setSport("bike")} className="flex-1">Bike</Button>
              <Button size="sm" variant={sport === "run" ? "default" : "outline"} onClick={() => setSport("run")} className="flex-1">Run</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Athlète (optionnel)</Label>
            <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Nom" />
          </div>
          <div>
            <Label className="text-xs">VLamax mesurée</Label>
            <Input type="number" step="0.01" value={vlamax} onChange={(e) => setVlamax(e.target.value)} placeholder="ex: 0.55" />
            <p className="text-[10px] text-muted-foreground mt-1">mmol/L/s</p>
          </div>
          <div>
            <Label className="text-xs">MLSS observé</Label>
            <Input type="number" step="0.1" value={mlssPct} onChange={(e) => setMlssPct(e.target.value)} placeholder="ex: 78" />
            <p className="text-[10px] text-muted-foreground mt-1">% VO2max (50-95)</p>
          </div>
          {sport === "run" && (
            <div>
              <Label className="text-xs">CE</Label>
              <Input type="number" step="1" value={ce} onChange={(e) => setCe(e.target.value)} placeholder="ex: 200" />
              <p className="text-[10px] text-muted-foreground mt-1">ml O2/kg/km</p>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Saisis VLamax + MLSS pour calculer l'écart.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.label}</div>
                  {severityBadge(r.severity)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Prédit</div>
                    <div className="font-mono font-semibold">{r.predicted ?? "—"} {r.unit}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Observé</div>
                    <div className="font-mono font-semibold">{r.observed} {r.unit}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Δ</div>
                    <div className={`font-mono font-semibold ${
                      r.severity === "ok" ? "text-emerald-600" :
                      r.severity === "warning" ? "text-amber-600" :
                      r.severity === "critical" ? "text-destructive" : ""
                    }`}>
                      {r.delta !== null ? (r.delta > 0 ? "+" : "") + r.delta : "—"} {r.unit && r.delta !== null ? "pts" : ""}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{r.formula}</p>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser</Button>
            </div>
          </div>
        )}

        <div className="rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
          <div><strong>Seuils bike</strong> : OK ≤ 4 pts · Écart ≤ 8 pts · Critique &gt; 8 pts</div>
          <div><strong>Seuils run</strong> : OK ≤ 3 pts · Écart ≤ 6 pts · Critique &gt; 6 pts (RMSE Modèle C : 2.64%)</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LabAthleteValidator;

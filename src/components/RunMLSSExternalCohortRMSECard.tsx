/**
 * RunMLSSExternalCohortRMSECard
 * Comparatif AVANT / APRÈS l'ajout des 25 profils running externes.
 * - AVANT : RMSE baseline calibration interne (2.64% sur N=14+3)
 * - APRÈS : RMSE recalculé sur les 25 profils externes (predicted via Modèle C
 *           vs MLSS_pct_VO2max_observed fourni par la source).
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

const BASELINE_RMSE = 2.64;
const BASELINE_N = 17; // N=14 + 3 edge cases

interface ExternalRow {
  raw_values: Record<string, unknown>;
}

interface RMSEResult {
  n: number;
  rmse: number;
  bias: number;
  mae: number;
  within3pct: number;
  within5pct: number;
}

function computeRMSE(rows: ExternalRow[]): RMSEResult | null {
  const deltas: number[] = [];
  for (const r of rows) {
    const rv = r.raw_values || {};
    const vla = Number(rv.VLamax_labo_mmol_l_s);
    const ce = Number(rv.CE_estimated_inverse);
    const observed = Number(rv.MLSS_pct_VO2max_observed);
    if (!Number.isFinite(vla) || !Number.isFinite(ce) || !Number.isFinite(observed)) continue;
    const pred = predictRunMLSSPctFromVLaCE(vla, ce);
    if (!pred) continue;
    deltas.push(pred.mlssPct - observed);
  }
  if (deltas.length === 0) return null;
  const mse = deltas.reduce((a, d) => a + d * d, 0) / deltas.length;
  const rmse = Math.sqrt(mse);
  const bias = deltas.reduce((a, d) => a + d, 0) / deltas.length;
  const mae = deltas.reduce((a, d) => a + Math.abs(d), 0) / deltas.length;
  const within3 = (deltas.filter((d) => Math.abs(d) <= 3).length / deltas.length) * 100;
  const within5 = (deltas.filter((d) => Math.abs(d) <= 5).length / deltas.length) * 100;
  return {
    n: deltas.length,
    rmse: Number(rmse.toFixed(2)),
    bias: Number(bias.toFixed(2)),
    mae: Number(mae.toFixed(2)),
    within3pct: Number(within3.toFixed(0)),
    within5pct: Number(within5.toFixed(0)),
  };
}

export function RunMLSSExternalCohortRMSECard() {
  const { user } = useAuth();
  const [result, setResult] = useState<RMSEResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calibration_evidence")
        .select("raw_values")
        .eq("coach_id", user.id)
        .eq("evidence_type", "RUN_MLSS_EXTERNAL_COHORT")
        .limit(500);
      if (!error && data) {
        setResult(computeRMSE(data as ExternalRow[]));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const verdict = useMemo(() => {
    if (!result) return null;
    const ratio = result.rmse / BASELINE_RMSE;
    if (ratio <= 1.3) return { kind: "consistent" as const, label: "Modèle stable", Icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
    if (ratio <= 1.8) return { kind: "drifting" as const, label: "Légère dérive", Icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
    return { kind: "incoherent" as const, label: "Recalibration recommandée", Icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" };
  }, [result]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Comparatif RMSE — 25 profils running externes</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Chargement…</p></CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Comparatif RMSE — 25 profils running externes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun profil externe (<code>RUN_MLSS_EXTERNAL_COHORT</code>) trouvé pour ce compte.
          </p>
        </CardContent>
      </Card>
    );
  }

  const delta = Number((result.rmse - BASELINE_RMSE).toFixed(2));
  const deltaSign = delta > 0 ? "+" : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Comparatif RMSE — 25 profils running externes
          {verdict && (
            <Badge variant="outline" className={cn("ml-auto gap-1", verdict.cls)}>
              <verdict.Icon className="h-3 w-3" />
              {verdict.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AVANT / APRÈS */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
          <div className="p-3 bg-muted/40 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-1">AVANT</div>
            <div className="font-mono text-2xl font-bold">{BASELINE_RMSE}%</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Calibration interne · N={BASELINE_N}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="text-xs font-medium text-primary mb-1">APRÈS (+25 profils)</div>
            <div className="font-mono text-2xl font-bold text-primary">{result.rmse}%</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              N={result.n} externes · Δ {deltaSign}{delta}%
            </div>
          </div>
        </div>

        {/* Métriques détaillées */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Stat label="Biais moyen" value={`${result.bias > 0 ? "+" : ""}${result.bias}%`} />
          <Stat label="Erreur moy. (MAE)" value={`${result.mae}%`} />
          <Stat label="Dans ±3 pts" value={`${result.within3pct}%`} />
          <Stat label="Dans ±5 pts" value={`${result.within5pct}%`} />
        </div>

        {/* Explication simple */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <p>
                <strong>Le RMSE</strong>, c'est l'écart moyen entre <em>ce que le modèle prédit</em> (le seuil
                MLSS calculé à partir de la VLamax et du coût énergétique) et <em>ce qui a été
                observé</em> chez les athlètes. Plus c'est petit, plus le modèle est précis.
              </p>
              <p>
                <strong>Avant</strong>, on avait une marge d'erreur d'environ <strong>{BASELINE_RMSE}%</strong> sur
                un petit échantillon de {BASELINE_N} sportifs. <strong>Après</strong> avoir testé le modèle
                sur les <strong>25 nouveaux profils running</strong> (sprinters, marathoniens, ultra-traileurs,
                hybrides…), on est à <strong>{result.rmse}%</strong>.
              </p>
              <p>
                {verdict?.kind === "consistent" && (
                  <>✅ <strong>Bonne nouvelle</strong> : le modèle reste précis même sur ces profils variés
                  qu'il n'avait jamais vus. Il est généralisable.</>
                )}
                {verdict?.kind === "drifting" && (
                  <>⚠️ Le modèle est un peu moins précis sur cet échantillon élargi. À surveiller — peut-être
                  une recalibration légère sur certains profils extrêmes.</>
                )}
                {verdict?.kind === "incoherent" && (
                  <>❌ L'écart est trop grand : le modèle ne se généralise pas bien à ces profils. Il faudrait
                  recalibrer la formule pour intégrer ces nouveaux cas.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="font-mono text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

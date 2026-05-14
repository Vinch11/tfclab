/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX DIAGNOSTIC PAGE — Vue synthétique coach (P2)
 *
 * Affiche méthode-par-méthode la production VLamax pour l'athlète sélectionné,
 * et permet de capturer un snapshot de calibration traçable.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Camera, Beaker, AlertTriangle, History, Info } from "lucide-react";
import { toast } from "sonner";
import { RMSEExplainer } from "@/components/RMSEExplainer";

import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import {
  computeVLamaxBikeV2Enhanced,
  type VLamaxBikeV2EnhancedInput,
} from "@/lib/v2/vlamaxBikeV2Enhanced";
import {
  persistVLamaxTrace,
  loadVLamaxTraces,
  type VLamaxTracePayload,
} from "@/lib/v2/vlamaxTracePersistence";

function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

export default function VLamaxDiagnosticPage() {
  const navigate = useNavigate();
  const params = useParams<{ athleteId?: string }>();
  const { user } = useAuth();
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();
  const { snapshots } = useCloudDataContext();

  const athleteId = params.athleteId ?? selectedAthleteId ?? null;

  // Sync context selection if URL provides athleteId
  useEffect(() => {
    if (params.athleteId && params.athleteId !== selectedAthleteId) {
      setSelectedAthleteId(params.athleteId);
    }
  }, [params.athleteId, selectedAthleteId, setSelectedAthleteId]);

  const athlete = useMemo(
    () => athletes.find((a: any) => a.id === athleteId),
    [athletes, athleteId]
  );

  // Active snapshot
  const snapshot = useMemo(() => {
    if (!athleteId) return null;
    const list = snapshots.filter((s) => s.athlete_id === athleteId);
    if (list.length === 0) return null;
    if (athlete?.active_snapshot_id) {
      const active = list.find((s) => s.id === athlete.active_snapshot_id);
      if (active) return active;
    }
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
  }, [athleteId, snapshots, athlete]);

  // Build V2 input from snapshot
  const input: VLamaxBikeV2EnhancedInput | null = useMemo(() => {
    if (!snapshot) return null;
    return {
      ftp: snapshot.ftp ?? 0,
      p30s_w: snapshot.p30s_w as number | null,
      p60s_w: snapshot.p60s_w as number | null,
      map5min_w: snapshot.map5min_w as number | null,
      tte_min: snapshot.tte_observed_min ?? null,
      pmax_5s: snapshot.pmax_5s ?? undefined,
      weight_kg: snapshot.weight_kg ?? undefined,
      protocol_quality:
        ((snapshot as any).protocol_quality as 1 | 2 | 3 | 4 | 5) ?? 3,
      objectif: snapshot.objectif ?? "703",
      vo2max: snapshot.vo2max ?? undefined,
      sex: athlete?.refs?.sexe === "F" ? "F" : "H",
    };
  }, [snapshot, athlete]);

  const result = useMemo(() => {
    if (!input || !input.ftp) return null;
    return computeVLamaxBikeV2Enhanced(input);
  }, [input]);

  // Snapshot history (traces)
  const [traces, setTraces] = useState<
    Array<{ id: string; date: string; payload: VLamaxTracePayload }>
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const refreshHistory = async () => {
    if (!athleteId) return;
    setLoadingHistory(true);
    const data = await loadVLamaxTraces(athleteId, 20);
    setTraces(data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const [persisting, setPersisting] = useState(false);
  const handleSnapshot = async () => {
    if (!athleteId || !user || !input || !result) return;
    setPersisting(true);
    const r = await persistVLamaxTrace({
      athleteId,
      coachId: user.id,
      input,
      result,
    });
    setPersisting(false);
    if (r) {
      toast.success("Trace VLamax enregistrée");
      refreshHistory();
    } else {
      toast.error("Échec de l'enregistrement");
    }
  };

  const components = (result?.components ?? null) as any;
  const rfm = input && input.map5min_w ? input.ftp / input.map5min_w : null;

  // Tier label
  const tierLabel = (() => {
    if (!rfm) return "—";
    if (rfm > 0.95) return "rfm_suspect (>0.95)";
    if (rfm > 0.9) return "endurance_pp (0.90-0.95)";
    if (rfm > 0.8) return "hybrid (0.80-0.90)";
    return "pure (≤0.80)";
  })();

  return (
    <SidebarLayout
      activeTab="diagnostic"
      onTabChange={(tab) => navigate(`/${tab === "dashboard" ? "" : tab}`)}
      staffMode={false}
      onStaffModeChange={() => {}}
    >
      <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Beaker className="h-6 w-6 text-primary" />
                Diagnostic VLamax
              </h1>
              <p className="text-sm text-muted-foreground">
                {athlete?.name ?? "Aucun athlète sélectionné"} — vue
                méthode-par-méthode
              </p>
            </div>
          </div>
          <Button
            onClick={handleSnapshot}
            disabled={!result || persisting}
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            {persisting ? "Enregistrement…" : "Snapshot calibration"}
          </Button>
        </div>

        {!athlete && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Sélectionne un athlète pour afficher le diagnostic.
            </CardContent>
          </Card>
        )}

        {athlete && !snapshot && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun snapshot disponible pour cet athlète.
            </CardContent>
          </Card>
        )}

        {result && input && (
          <>
            {/* SYNTHÈSE */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Synthèse</CardTitle>
                  <RMSEExplainer
                    value={0.053}
                    unit="mmol/L/s"
                    tolerance={0.08}
                    context="Validation Billat N=9 coureurs (cohorte littérature 1996-2023)"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">VLamax</div>
                    <div className="text-3xl font-bold">
                      {fmt(result.value, 2)}
                    </div>
                    <div className="text-xs text-muted-foreground">mmol/L/s</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Plage</div>
                    <div className="text-lg font-semibold">
                      {fmt(result.rangeMin, 2)} – {fmt(result.rangeMax, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fiabilité</div>
                    <Badge variant="outline" className="mt-1">
                      {result.confidenceLabel}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round(result.confidence * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Formule</div>
                    <div className="text-sm font-medium">{result.formulaLabel}</div>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-2 rounded"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.pedagogicalMessage && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{result.pedagogicalMessage}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PROFIL ATHLÈTE / CONTEXTE */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contexte d'entrée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">FTP</div>
                    <div className="font-medium">{input.ftp} W</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">MAP 5 min</div>
                    <div className="font-medium">{input.map5min_w ?? "—"} W</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Pmax 5 s</div>
                    <div className="font-medium">{input.pmax_5s ?? "—"} W</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">P30 s</div>
                    <div className="font-medium">{input.p30s_w ?? "—"} W</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">P60 s</div>
                    <div className="font-medium">{input.p60s_w ?? "—"} W</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">TTE</div>
                    <div className="font-medium">{input.tte_min ?? "—"} min</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">VO₂max</div>
                    <div className="font-medium">{input.vo2max ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Poids</div>
                    <div className="font-medium">{input.weight_kg ?? "—"} kg</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">
                      rfm = FTP / MAP
                    </div>
                    <div className="font-medium">
                      {rfm ? rfm.toFixed(3) : "—"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">
                      Tier hybride
                    </div>
                    <div className="font-medium">{tierLabel}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MÉTHODES */}
            <MethodsBreakdown result={result} components={components} />

            {/* HISTORIQUE */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique des snapshots ({traces.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="text-sm text-muted-foreground">Chargement…</div>
                ) : traces.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aucun snapshot enregistré. Clique sur « Snapshot calibration »
                    pour capturer la trace actuelle.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {traces.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{t.date}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.payload.version} ·{" "}
                            {t.payload.result.formulaLabel}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">
                            {fmt(t.payload.result.value, 2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            conf {Math.round(t.payload.result.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHODS BREAKDOWN — Mader MLSS / Mader TTE / Score G + divergence + reason
// ═══════════════════════════════════════════════════════════════════════════════

interface MethodsBreakdownProps {
  result: ReturnType<typeof computeVLamaxBikeV2Enhanced>;
  components: any;
}

function MethodRow({
  label,
  value,
  finalValue,
  status,
  detail,
}: {
  label: string;
  value: number | null;
  finalValue: number;
  status: "active" | "excluded" | "unavailable";
  detail: string;
}) {
  const delta =
    value !== null && status !== "unavailable"
      ? Math.abs(value - finalValue)
      : null;
  const statusClass =
    status === "active"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : status === "excluded"
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-muted bg-muted/20 opacity-60";
  const statusLabel =
    status === "active" ? "Utilisé" : status === "excluded" ? "Écarté" : "N/D";
  return (
    <div className={`border rounded-md p-3 ${statusClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-sm">{label}</div>
        <Badge
          variant="outline"
          className={
            status === "active"
              ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/50"
              : status === "excluded"
              ? "text-amber-700 dark:text-amber-300 border-amber-500/50"
              : ""
          }
        >
          {statusLabel}
        </Badge>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-2xl font-bold">
          {value !== null ? value.toFixed(2) : "—"}
        </div>
        {delta !== null && (
          <div className="text-xs text-muted-foreground">
            Δ vs final : <span className="font-mono">{delta.toFixed(2)}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

function MethodsBreakdown({ result, components }: MethodsBreakdownProps) {
  const finalValue = result.value;
  const fusionMethod: string = components?.fusion_method ?? "—";
  const divergence: number | null = components?.divergence ?? null;
  const maderMLSS: number | null = components?.mader_mlss ?? null;
  const maderTTE: number | null = components?.mader_tte ?? null;
  const scoreG: number | null = components?.scoreG ?? null;
  // VLamax dérivée du Score G : engine = clamp(0.20 + range*scoreG)
  // range varie selon tier hybride (0.45 à 0.80) — on prend vlamax_raw quand fusion = scoreG_only,
  // sinon on affiche la valeur normalisée approximative pour comparaison.
  const vlamaxFromScoreG: number | null = (() => {
    if (scoreG === null) return null;
    if (fusionMethod === "scoreG_only" && components?.vlamax_raw)
      return Number(components.vlamax_raw);
    // approximation : range = 0.80 (tier pure/hybrid)
    return Number((0.2 + 0.8 * scoreG).toFixed(3));
  })();

  // Statuts
  const isExcludedByDivergence =
    divergence !== null && divergence > 0.2 && fusionMethod === "mader_primary";

  const mlssStatus: "active" | "excluded" | "unavailable" =
    maderMLSS === null ? "unavailable" : "active";
  const tteStatus: "active" | "excluded" | "unavailable" =
    maderTTE === null
      ? "unavailable"
      : isExcludedByDivergence || fusionMethod === "scoreG_only"
      ? "excluded"
      : "active";
  const scoreGStatus: "active" | "excluded" | "unavailable" =
    scoreG === null
      ? "unavailable"
      : isExcludedByDivergence
      ? "excluded"
      : "active";

  // Raison du choix final (texte)
  const reason = (() => {
    if (isExcludedByDivergence) {
      return `Divergence critique entre méthodes (Δmax = ${divergence!.toFixed(
        2
      )} > 0.20 mmol/L/s). Repli sur Mader MLSS seul (gold standard physiologique). Les autres méthodes sont écartées car les signaux sont physiologiquement incompatibles.`;
    }
    switch (fusionMethod) {
      case "mader_primary":
        if (maderTTE !== null && scoreG !== null)
          return "Triple validation : Mader MLSS (50 %) + Mader TTE (25 %) + Score G (25 %). C'est la fusion la plus robuste, utilisée quand les 3 sources sont disponibles et cohérentes.";
        if (scoreG !== null)
          return "Fusion Mader MLSS (65 %) + Score G (35 %). TTE indisponible ou exclu — la cohérence FTP/VO₂max reste validée par les indices de puissance.";
        return "Mader MLSS seul (TTE et Score G indisponibles).";
      case "mader_cross":
        return "Cross-validation Mader MLSS (60 %) + Mader TTE (40 %). Score G indisponible — les deux estimations métaboliques se valident mutuellement.";
      case "scoreG_only":
        return "Score G seul (Mader MLSS impossible — données métaboliques insuffisantes ou FTP/VO₂max incohérentes). Fiabilité réduite.";
      case "pmax_fallback":
        return "Fallback Pmax 5 s seul (toutes les autres méthodes ont échoué). Estimation grossière à interpréter avec prudence.";
      default:
        return "Méthode de fusion non identifiée.";
    }
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Décomposition méthode-par-méthode</span>
          {divergence !== null && (
            <Badge
              variant="outline"
              className={
                divergence > 0.2
                  ? "border-red-500/50 text-red-700 dark:text-red-300"
                  : divergence > 0.1
                  ? "border-amber-500/50 text-amber-700 dark:text-amber-300"
                  : "border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
              }
            >
              Δmax = {divergence.toFixed(2)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3 méthodes côte-à-côte */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MethodRow
            label="Mader MLSS (M1)"
            value={maderMLSS}
            finalValue={finalValue}
            status={mlssStatus}
            detail="Inverse de l'équation Mader-Heck à partir de FTP, VO₂max, poids. Gold standard physiologique."
          />
          <MethodRow
            label="Mader TTE (M2)"
            value={maderTTE}
            finalValue={finalValue}
            status={tteStatus}
            detail="Calibration via durabilité glycogénique (TTE observé). Validation croisée Rapoport 2010."
          />
          <MethodRow
            label="Score G (M3)"
            value={vlamaxFromScoreG}
            finalValue={finalValue}
            status={scoreGStatus}
            detail={`Faisceau d'indices Pmax/FTP/MAP/TTE/W'. Score G normalisé = ${
              scoreG !== null ? scoreG.toFixed(3) : "—"
            }.`}
          />
        </div>

        <Separator />

        {/* Valeur finale + raison */}
        <div className="rounded-md border bg-primary/5 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Valeur finale retenue
            </div>
            <div className="font-mono text-2xl font-bold">
              {finalValue.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              Méthode de fusion : {fusionMethod}
            </div>
            <p className="text-sm">{reason}</p>
          </div>
        </div>

        <Separator />

        {/* Sources fusionnées */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Indices puissance utilisés dans le Score G
          </div>
          <div className="flex flex-wrap gap-1">
            {result.sources.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {result.sources.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


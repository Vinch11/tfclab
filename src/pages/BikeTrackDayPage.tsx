/**
 * BikeTrackDayPage — TFCL Bike Day™
 * Protocole vélo 2h : FTP, VLamax, MAP, W' en une séance.
 *
 * Références :
 *  - Coggan & Allen 2010 (FTP from 20min × 0.95)
 *  - Hawley & Noakes 1992 (ramp test → FTP × 0.75)
 *  - Jones & Vanhatalo 2017 (CP / W')
 *  - Mader 1976 (VLamax glycolytique)
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bike, Activity, Zap, Target, Heart, Save, ArrowLeft, Download } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { toast } from "@/hooks/use-toast";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { supabase } from "@/integrations/supabase/client";
import { openDiagnosticProtocolPrint } from "@/lib/diagnostic/buildDiagnosticProtocolHTML";
import { NolioImportPeriodDialog } from "@/components/NolioImportPeriodDialog";
import { useTestFormPersistence } from "@/hooks/useTestFormPersistence";
import { Trash2 } from "lucide-react";

const num = (v: string): number => {
  const n = parseFloat((v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number, d = 1) => (Number.isFinite(n) && n > 0 ? n.toFixed(d) : "—");

/** P = (m·g·sin(atan(slope%/100)) + 0.25·v²) · v  — v en m/s */
function powerFromSpeed(massKg: number, speedKmh: number, slopePct: number): number {
  if (massKg <= 0 || speedKmh <= 0) return 0;
  const v = speedKmh / 3.6;
  const grav = massKg * 9.81 * Math.sin(Math.atan(slopePct / 100));
  const aero = 0.25 * v * v;
  return Math.max(0, (grav + aero) * v);
}

export default function BikeTrackDayPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { addSnapshot, snapshots, updateAthlete } = useCloudDataContext() as any;

  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [setup, setSetup] = useState<"ht" | "route">("ht");
  const [tempC, setTempC] = useState("");

  const effectiveRefs = useMemo(
    () => getEffectiveRefs(
      currentAthlete ? { id: currentAthlete.id, refs: currentAthlete.refs, active_snapshot_id: currentAthlete.active_snapshot_id } as any : null,
      (snapshots as any[]) || []
    ),
    [currentAthlete, snapshots]
  );
  const [weightKgManual, setWeightKgManual] = useState("");
  const [heightCmManual, setHeightCmManual] = useState("");
  const [fcReposManual, setFcReposManual] = useState("");
  const [fcMaxManual, setFcMaxManual] = useState("");
  const massKg = effectiveRefs.weightKg ?? num(weightKgManual);
  const heightCm = num(heightCmManual);
  const fcRepos = num(fcReposManual);
  const fcMax = effectiveRefs.fcMax ?? num(fcMaxManual);

  // Bloc 1 — sprints (HT puissance directe OU route vitesse+pente)
  const [p10s, setP10s] = useState("");
  const [p30s, setP30s] = useState("");
  const [p60s, setP60s] = useState("");
  const [v10s, setV10s] = useState(""); const [s10s, setS10s] = useState("");
  const [v30s, setV30s] = useState(""); const [s30s, setS30s] = useState("");
  const [v60s, setV60s] = useState(""); const [s60s, setS60s] = useState("");

  // Bloc 2 — Aérobie
  const [map5min, setMap5min] = useState("");
  const [fcMaxTest, setFcMaxTest] = useState("");
  const [cp3min, setCp3min] = useState("");

  // Bloc 3 — Seuil
  const [p20min, setP20min] = useState("");
  const [fc20Moy, setFc20Moy] = useState("");
  const [rampeLast, setRampeLast] = useState("");

  // Bloc 4 — Aérobie basse
  const [fcDebutZ2, setFcDebutZ2] = useState("");
  const [fcFinZ2, setFcFinZ2] = useState("");
  const [puissanceZ2, setPuissanceZ2] = useState("");

  // ─── Import Nolio ─────────────────────────────────────────────────────
  const [nolioLoading, setNolioLoading] = useState(false);
  const [nolioDates, setNolioDates] = useState<Record<string, string | null>>({});
  const [nolioPeriodOpen, setNolioPeriodOpen] = useState(false);

  // ─── Persistance localStorage par athlète ─────────────────────
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const storageKey = currentAthlete ? `tfcl_test_bikeday_${currentAthlete.id}` : null;
  const { clear: clearForm, clearStorageOnly } = useTestFormPersistence(storageKey, {
    testDate: { value: testDate, set: setTestDate, default: todayISO() },
    setup: { value: setup, set: setSetup, default: "ht" },
    tempC: { value: tempC, set: setTempC, default: "" },
    weightKgManual: { value: weightKgManual, set: setWeightKgManual, default: "" },
    heightCmManual: { value: heightCmManual, set: setHeightCmManual, default: "" },
    fcReposManual: { value: fcReposManual, set: setFcReposManual, default: "" },
    fcMaxManual: { value: fcMaxManual, set: setFcMaxManual, default: "" },
    p10s: { value: p10s, set: setP10s, default: "" },
    p30s: { value: p30s, set: setP30s, default: "" },
    p60s: { value: p60s, set: setP60s, default: "" },
    v10s: { value: v10s, set: setV10s, default: "" },
    s10s: { value: s10s, set: setS10s, default: "" },
    v30s: { value: v30s, set: setV30s, default: "" },
    s30s: { value: s30s, set: setS30s, default: "" },
    v60s: { value: v60s, set: setV60s, default: "" },
    s60s: { value: s60s, set: setS60s, default: "" },
    map5min: { value: map5min, set: setMap5min, default: "" },
    fcMaxTest: { value: fcMaxTest, set: setFcMaxTest, default: "" },
    cp3min: { value: cp3min, set: setCp3min, default: "" },
    p20min: { value: p20min, set: setP20min, default: "" },
    fc20Moy: { value: fc20Moy, set: setFc20Moy, default: "" },
    rampeLast: { value: rampeLast, set: setRampeLast, default: "" },
    fcDebutZ2: { value: fcDebutZ2, set: setFcDebutZ2, default: "" },
    fcFinZ2: { value: fcFinZ2, set: setFcFinZ2, default: "" },
    puissanceZ2: { value: puissanceZ2, set: setPuissanceZ2, default: "" },
  });

  const handleClearForm = () => {
    if (typeof window !== "undefined" && window.confirm("Effacer toutes les données du test ?")) {
      clearForm();
    }
  };

  const importFromNolio = async (period: { dateFrom: string; dateTo: string }) => {
    if (!currentAthlete) return;
    setNolioLoading(true);
    try {
      const { data, error } = await supabase
        .from("nolio_records" as any)
        .select("item_seconds, value, date_recorded, sport_id, cat, source")
        .eq("athlete_id", currentAthlete.id)
        .eq("cat", "ppr")
        .in("sport_id", [14, 18])
        .gte("date_recorded", period.dateFrom)
        .lte("date_recorded", period.dateTo);
      if (error) throw error;
      const rows = ((data ?? []) as unknown) as Array<{ item_seconds: number; value: number; date_recorded: string | null; source?: string }>;
      // Si plusieurs records pour la même métrique, le plus récent prime
      const bestBySec = new Map<number, { v: number; d: string | null; src: string }>();
      for (const r of rows) {
        const cur = bestBySec.get(r.item_seconds);
        const cand = { v: r.value, d: r.date_recorded, src: r.source ?? "nolio" };
        if (!cur) { bestBySec.set(r.item_seconds, cand); continue; }
        const curT = cur.d ? new Date(cur.d).getTime() : 0;
        const newT = cand.d ? new Date(cand.d).getTime() : 0;
        if (newT >= curT) bestBySec.set(r.item_seconds, cand);
      }
      const pick = (sec: number) => bestBySec.get(sec) ?? null;
      const labelDate = (r: { d: string | null; src: string }) =>
        r.d ? `${r.src === "manual" ? "Manuel ✍️" : "Nolio"} · ${new Date(r.d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}` : (r.src === "manual" ? "Manuel ✍️" : "Nolio");
      const dates: Record<string, string | null> = {};
      const r5 = pick(5); if (r5) { setP10s(String(Math.round(r5.v))); dates.p10s = labelDate(r5); }
      const r30 = pick(30); if (r30) { setP30s(String(Math.round(r30.v))); dates.p30s = labelDate(r30); }
      const r60 = pick(60); if (r60) { setP60s(String(Math.round(r60.v))); dates.p60s = labelDate(r60); }
      const r300 = pick(300); if (r300) { setMap5min(String(Math.round(r300.v))); dates.map5min = labelDate(r300); }
      const r1200 = pick(1200); if (r1200) { setP20min(String(Math.round(r1200.v))); dates.p20min = labelDate(r1200); }
      setNolioDates(dates);
      const count = Object.keys(dates).length;
      const fmtFr = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
      toast({
        title: "Records importés",
        description: `${count} record${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""} sur la période du ${fmtFr(period.dateFrom)} au ${fmtFr(period.dateTo)}.`,
      });
      setNolioPeriodOpen(false);
    } catch (e) {
      toast({ title: "Erreur import Nolio", description: (e as Error).message, variant: "destructive" });
    } finally {
      setNolioLoading(false);
    }
  };

  const fmtNolioDate = (d: string | null | undefined) => d || null;


  const calc = useMemo(() => {
    const p10 = setup === "ht" ? num(p10s) : powerFromSpeed(massKg, num(v10s), num(s10s));
    const p30 = setup === "ht" ? num(p30s) : powerFromSpeed(massKg, num(v30s), num(s30s));
    const p60 = setup === "ht" ? num(p60s) : powerFromSpeed(massKg, num(v60s), num(s60s));

    const map = num(map5min);
    const cp3 = num(cp3min);
    const ratioCp3Map = map > 0 && cp3 > 0 ? cp3 / map : 0;
    // W' rough estimate : (cp3 - FTP) × 180 (Skiba style) — fallback
    const ftp20 = num(p20min) > 0 ? num(p20min) * 0.95 : 0;
    const ftpRampe = num(rampeLast) > 0 ? num(rampeLast) * 0.75 : 0;
    const ftp = ftp20 > 0 ? ftp20 : ftpRampe;
    const wPrime = ftp > 0 && cp3 > 0 ? Math.max(0, (cp3 - ftp) * 180) : 0;
    const ftpKg = ftp > 0 && massKg > 0 ? ftp / massKg : 0;
    const fractUtil = map > 0 && ftp > 0 ? ftp / map : 0;

    // VLamax glycolytique (sprints) — Score G sur p10s/p30s relatif au poids
    const p10kg = massKg > 0 ? p10 / massKg : 0;
    const p30kg = massKg > 0 ? p30 / massKg : 0;
    const refs10 = 22, refs30 = 12;
    const sScore = [
      p10kg > 0 ? Math.min(1, p10kg / refs10) : null,
      p30kg > 0 ? Math.min(1, p30kg / refs30) : null,
    ].filter((v): v is number => v != null);
    const sprintScore = sScore.length > 0 ? sScore.reduce((a, b) => a + b, 0) / sScore.length : 0;
    const ratioInv = fractUtil > 0 ? Math.max(0, Math.min(1, (0.85 - fractUtil) / 0.15)) : 0.5;
    const scoreG = sprintScore * 0.6 + ratioInv * 0.4;
    const vlamaxEst = ftp > 0 ? 0.30 + scoreG * 0.55 : 0;

    const fcD = num(fcDebutZ2), fcF = num(fcFinZ2);
    const driftPct = fcD > 0 ? ((fcF - fcD) / fcD) * 100 : 0;
    const ratioZ2Ftp = num(puissanceZ2) > 0 && ftp > 0 ? num(puissanceZ2) / ftp : 0;
    const fatMaxPct = ftp > 0 ? Math.max(50, Math.min(78, 65 - driftPct * 2)) : 0;

    const tteEst = fractUtil > 0 ? Math.max(25, Math.min(75, 30 + (fractUtil - 0.75) * 400)) : 0;

    // VO2max estimé depuis MAP — Hawley & Noakes 1992 : VO2max ≈ MAP × 10.8 / poids + 7
    const vo2maxEst = map > 0 && massKg > 0 ? (map * 10.8) / massKg + 7 : 0;

    return {
      p10, p30, p60, map, cp3, ratioCp3Map,
      ftp20, ftpRampe, ftp, ftpKg, wPrime, fractUtil,
      vlamaxEst, scoreG, vo2maxEst,
      driftPct, ratioZ2Ftp, fatMaxPct, tteEst,
    };
  }, [setup, p10s, p30s, p60s, v10s, s10s, v30s, s30s, v60s, s60s, map5min, cp3min, p20min, rampeLast, fcDebutZ2, fcFinZ2, puissanceZ2, massKg]);

  const canCreate = !!currentAthlete && calc.ftp > 0;

  const handleCreate = async () => {
    if (!currentAthlete) {
      toast({ title: "Sélectionnez un athlète", variant: "destructive" });
      return;
    }
    const snap = await addSnapshot({
      athlete_id: currentAthlete.id,
      date: testDate,
      source: "bike_track_day",
      weight_kg: massKg > 0 ? massKg : null,
      fc_repos: fcRepos > 0 ? fcRepos : null,
      fc_max: fcMax > 0 ? fcMax : null,
      ftp: calc.ftp || null,
      vlamax: calc.vlamaxEst || null,
      pmax_5s: calc.p10 || null,
      vo2max: calc.vo2maxEst > 0 ? Math.round(calc.vo2maxEst * 10) / 10 : null,
      map5min_w: calc.map || null,
      p30s_w: calc.cp3 || null,
      tte_observed_min: calc.tteEst || null,
      coach_notes: `TFCL Bike Day™ — ${setup === "ht" ? "Home trainer" : "Route"} — T° ${tempC || "?"}°C — MAP ${fmt(calc.map, 0)}W · CP3' ${fmt(calc.cp3, 0)}W · W' ${fmt(calc.wPrime, 0)}J · fractUtil ${fmt(calc.fractUtil * 100, 0)}% · VO2max est. ${fmt(calc.vo2maxEst, 1)}ml/kg/min · FatMax ${fmt(calc.fatMaxPct, 0)}% · TTE ${fmt(calc.tteEst, 0)}min${heightCm > 0 ? ` · taille ${heightCm}cm` : ""}`,
    } as any);
    if (snap) {
      toast({ title: "Snapshot créé", description: "Ouverture pour validation…" });
      navigate(`/athlete/${currentAthlete.id}`);
    } else {
      toast({ title: "Échec création snapshot", variant: "destructive" });
    }
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in pb-12">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/diagnostic")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 rounded-xl bg-orange-600/10">
            <Bike className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">🚴 TFCL Bike Day™</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Protocole vélo 2h — FTP, VLamax, MAP, W' en une séance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => openDiagnosticProtocolPrint("bike-day", currentAthlete?.name)}
          >
            📄 Version papier
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Athlète</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={currentAthlete?.id ?? ""}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
              >
                <option value="">— sélectionner —</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
            <div>
              <Label>Setup</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={setup}
                onChange={(e) => setSetup(e.target.value as "ht" | "route")}
              >
                <option value="ht">Home trainer (puissance)</option>
                <option value="route">Vélo route (vitesse + pente)</option>
              </select>
            </div>
            <div>
              <Label>Température (°C)</Label>
              <Input type="number" value={tempC} onChange={(e) => setTempC(e.target.value)} placeholder="20" />
            </div>
          </CardContent>
        </Card>

        {/* Données de base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Données de base</CardTitle>
            <CardDescription className="text-xs">Communes à tous les blocs — alimentent les calculs (VO2max, FTP/kg) et le snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>
                Poids (kg) <span className="text-destructive">*</span>{" "}
                {effectiveRefs.weightKg != null && <span className="text-[10px] text-success">— auto</span>}
              </Label>
              {effectiveRefs.weightKg != null ? (
                <Input type="number" value={effectiveRefs.weightKg} disabled />
              ) : (
                <Input type="number" step="0.1" value={weightKgManual} onChange={(e) => setWeightKgManual(e.target.value)} placeholder="70" required />
              )}
            </div>
            <div>
              <Label>FC repos (bpm) <span className="text-[10px] text-muted-foreground">— optionnel</span></Label>
              <Input type="number" value={fcReposManual} onChange={(e) => setFcReposManual(e.target.value)} placeholder="52" />
            </div>
            <div>
              <Label>
                FC max (bpm) {effectiveRefs.fcMax != null && <span className="text-[10px] text-success">— auto</span>}
              </Label>
              {effectiveRefs.fcMax != null ? (
                <Input type="number" value={effectiveRefs.fcMax} disabled />
              ) : (
                <Input type="number" value={fcMaxManual} onChange={(e) => setFcMaxManual(e.target.value)} placeholder="188" />
              )}
            </div>
            <div>
              <Label>Taille (cm) <span className="text-[10px] text-muted-foreground">— IMC</span></Label>
              <Input type="number" value={heightCmManual} onChange={(e) => setHeightCmManual(e.target.value)} placeholder="178" />
            </div>
          </CardContent>
        </Card>

        {/* Import Nolio */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setNolioPeriodOpen(true)} disabled={nolioLoading || !currentAthlete}>
            <Download className="h-4 w-4 mr-1" />
            {nolioLoading ? "Import..." : "📥 Importer depuis Nolio"}
          </Button>
        </div>
        <NolioImportPeriodDialog
          open={nolioPeriodOpen}
          onOpenChange={setNolioPeriodOpen}
          onConfirm={async (p) => {
            if (currentAthlete && updateAthlete) {
              const refs = (currentAthlete.refs && typeof currentAthlete.refs === "object")
                ? { ...(currentAthlete.refs as Record<string, unknown>) }
                : {};
              refs.raceRecordsWindowMonths = p.windowMonths;
              try { await updateAthlete(currentAthlete.id, { refs: refs as any }); } catch { /* non-bloquant */ }
            }
            await importFromNolio({ dateFrom: p.dateFrom, dateTo: p.dateTo });
          }}
          defaultWindowMonths={
            (currentAthlete?.refs as any)?.raceRecordsWindowMonths === null
              ? null
              : ((currentAthlete?.refs as any)?.raceRecordsWindowMonths ?? 12)
          }
          loading={nolioLoading}
        />


        {/* Bloc 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> Bloc 1 — Neuromusculaire
              </CardTitle>
              <Badge variant="secondary">15 min</Badge>
            </div>
            <CardDescription className="text-xs">
              Sprint 10s · 30s · 60s, récup complète entre chaque. {setup === "route" && "Sur route : saisis vitesse + pente, conversion auto en watts."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["10s", "30s", "60s"] as const).map((d, i) => {
              const valW = setup === "ht" ? [p10s, p30s, p60s][i] : "";
              const setW = setup === "ht" ? [setP10s, setP30s, setP60s][i] : null;
              const valV = [v10s, v30s, v60s][i];
              const setV = [setV10s, setV30s, setV60s][i];
              const valS = [s10s, s30s, s60s][i];
              const setS = [setS10s, setS30s, setS60s][i];
              const result = [calc.p10, calc.p30, calc.p60][i];
              return (
                <div key={d} className="rounded-md border border-border/60 bg-background/40 p-2">
                  <div className="text-xs font-medium mb-2">Sprint {d} max</div>
                  {setup === "ht" ? (
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Puissance moy (W)</Label>
                        <Input type="number" value={valW} onChange={(e) => setW?.(e.target.value)} placeholder={d === "10s" ? "1200" : d === "30s" ? "800" : "500"} />
                        {(() => {
                          const key = d === "10s" ? "p10s" : d === "30s" ? "p30s" : "p60s";
                          const lbl = fmtNolioDate(nolioDates[key]);
                          return lbl ? <div className="text-[10px] text-muted-foreground/70 mt-0.5">{lbl}</div> : null;
                        })()}
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold text-right">
                        {result > 0 ? `${fmt(result, 0)} W (${fmt(result / Math.max(massKg, 1), 1)} W/kg)` : "—"}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Vitesse (km/h)</Label>
                        <Input type="number" step="0.1" value={valV} onChange={(e) => setV(e.target.value)} placeholder="50" />
                      </div>
                      <div>
                        <Label className="text-xs">Pente (%)</Label>
                        <Input type="number" step="0.1" value={valS} onChange={(e) => setS(e.target.value)} placeholder="0" />
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold text-right">
                        {result > 0 ? `${fmt(result, 0)} W` : "—"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
              <b>Réf :</b> Mader 1976 (VLamax glycolytique), Gardner et al. 2007 (sprint power).
            </p>
          </CardContent>
        </Card>

        {/* Bloc 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" /> Bloc 2 — Capacité Aérobie
              </CardTitle>
              <Badge variant="secondary">30 min</Badge>
            </div>
            <CardDescription className="text-xs">
              • <b>MAP</b> = 5 min max — récup 8 min — <b>CP court</b> = 3 min max
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>MAP 5 min (W)</Label>
              <Input type="number" value={map5min} onChange={(e) => setMap5min(e.target.value)} placeholder="350" />
              {fmtNolioDate(nolioDates.map5min) && (
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">{fmtNolioDate(nolioDates.map5min)}</div>
              )}
            </div>
            <div>
              <Label>FC max test (bpm)</Label>
              <Input type="number" value={fcMaxTest} onChange={(e) => setFcMaxTest(e.target.value)} placeholder="188" />
            </div>
            <div>
              <Label>CP 3 min (W)</Label>
              <Input type="number" value={cp3min} onChange={(e) => setCp3min(e.target.value)} placeholder="400" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-3 gap-2 text-xs">
              <Metric label="MAP" value={fmt(calc.map, 0)} unit="W" />
              <Metric label="CP3'/MAP" value={fmt(calc.ratioCp3Map * 100, 0)} unit="%" />
              <Metric label="W' estimé" value={fmt(calc.wPrime, 0)} unit="J" />
            </div>
          </CardContent>
        </Card>

        {/* Bloc 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" /> Bloc 3 — Seuil FTP
              </CardTitle>
              <Badge variant="secondary">35 min</Badge>
            </div>
            <CardDescription className="text-xs">
              <b>20 min max</b> (gold standard Coggan, FTP = P20 × 0.95). Alternative : test rampe (FTP = palier × 0.75).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>P 20 min (W)</Label>
              <Input type="number" value={p20min} onChange={(e) => setP20min(e.target.value)} placeholder="290" />
              {fmtNolioDate(nolioDates.p20min) && (
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">{fmtNolioDate(nolioDates.p20min)}</div>
              )}
            </div>
            <div>
              <Label>FC moyenne 20' (bpm)</Label>
              <Input type="number" value={fc20Moy} onChange={(e) => setFc20Moy(e.target.value)} placeholder="172" />
            </div>
            <div className="sm:col-span-2">
              <Label>Alternative — dernier palier rampe (W)</Label>
              <Input type="number" value={rampeLast} onChange={(e) => setRampeLast(e.target.value)} placeholder="380" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Metric label="FTP (20min)" value={fmt(calc.ftp20, 0)} unit="W" />
              <Metric label="FTP (rampe)" value={fmt(calc.ftpRampe, 0)} unit="W" />
              <Metric label="FTP retenue" value={fmt(calc.ftp, 0)} unit="W" />
              <Metric label="FTP/kg" value={fmt(calc.ftpKg, 2)} unit="W/kg" />
              <Metric label="FTP/MAP (fractUtil)" value={fmt(calc.fractUtil * 100, 0)} unit="%" />
            </div>
          </CardContent>
        </Card>

        {/* Bloc 4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" /> Bloc 4 — Aérobie Basse
              </CardTitle>
              <Badge variant="secondary">20 min</Badge>
            </div>
            <CardDescription className="text-xs">
              15 min Z2 stable (FC 65-72% FCmax) — mesure du drift et estimation FatMax.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>FC début (bpm)</Label>
              <Input type="number" value={fcDebutZ2} onChange={(e) => setFcDebutZ2(e.target.value)} placeholder="135" />
            </div>
            <div>
              <Label>FC fin (bpm)</Label>
              <Input type="number" value={fcFinZ2} onChange={(e) => setFcFinZ2(e.target.value)} placeholder="142" />
            </div>
            <div>
              <Label>Puissance Z2 (W)</Label>
              <Input type="number" value={puissanceZ2} onChange={(e) => setPuissanceZ2(e.target.value)} placeholder="180" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-3 gap-2 text-xs">
              <Metric label="Drift cardiaque" value={fmt(calc.driftPct, 1)} unit="%" />
              <Metric label="Z2/FTP" value={fmt(calc.ratioZ2Ftp * 100, 0)} unit="%" />
              <Metric label="FatMax est." value={fmt(calc.fatMaxPct, 0)} unit="% FTP" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bike className="h-4 w-4 text-orange-600" /> Synthèse — Profil vélo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Metric label="FTP" value={fmt(calc.ftp, 0)} unit="W" big />
              <Metric label="FTP/kg" value={fmt(calc.ftpKg, 2)} unit="W/kg" big />
              <Metric label="MAP" value={fmt(calc.map, 0)} unit="W" big />
              <Metric label="W'" value={fmt(calc.wPrime, 0)} unit="J" big />
              <Metric label="VLamax est." value={fmt(calc.vlamaxEst, 2)} unit="mmol/L/s" big />
              <Metric label="FatMax est." value={fmt(calc.fatMaxPct, 0)} unit="% FTP" big />
              <Metric label="TTE est." value={fmt(calc.tteEst, 0)} unit="min" big />
              <Metric label="VO2max est." value={fmt(calc.vo2maxEst, 1)} unit="ml/kg/min" big />
            </div>
            {calc.vo2maxEst > 0 && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                <b>VO2max</b> = MAP × 10.8 / poids + 7 (Hawley &amp; Noakes 1992) — <b>Estimé — confiance : moyenne (±3 ml/kg/min)</b>
              </p>
            )}
            {(() => {
              const fields = [
                { k: "Poids", ok: massKg > 0 },
                { k: "FC repos", ok: fcRepos > 0 },
                { k: "FC max", ok: fcMax > 0 },
                { k: "Taille", ok: heightCm > 0 },
                { k: "FTP", ok: calc.ftp > 0 },
                { k: "MAP", ok: calc.map > 0 },
                { k: "CP3'", ok: calc.cp3 > 0 },
                { k: "VLamax", ok: calc.vlamaxEst > 0 },
                { k: "VO2max", ok: calc.vo2maxEst > 0 },
              ];
              const filled = fields.filter((f) => f.ok).length;
              return (
                <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs">
                  <b>{filled}/{fields.length}</b> champs renseignés
                  <span className="text-muted-foreground"> — {fields.filter(f => !f.ok).map(f => f.k).join(", ") || "complet ✓"}</span>
                </div>
              );
            })()}
            <Button className="w-full" disabled={!canCreate} onClick={handleCreate}>
              <Save className="h-4 w-4" /> Créer snapshot depuis ces résultats
            </Button>
            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
              <b>Références :</b> Coggan & Allen 2010, Hawley & Noakes 1992, Jones & Vanhatalo 2017, Mader 1976, Skiba 2012.
              Confiance VLamax estimée : <b>0.65-0.80</b> (sans mesure lactate).
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

function Metric({ label, value, unit, big }: { label: string; value: string; unit: string; big?: boolean }) {
  return (
    <div className={`rounded-md border border-border/60 bg-background/60 px-2 py-1.5 ${big ? "py-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${big ? "text-base" : "text-sm"}`}>
        {value} <span className="text-muted-foreground font-normal text-[10px]">{unit}</span>
      </div>
    </div>
  );
}

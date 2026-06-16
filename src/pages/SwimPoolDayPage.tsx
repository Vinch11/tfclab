/**
 * SwimPoolDayPage — TFCL Pool Day™
 * Protocole piscine 1h30 : CSS, VLamax nage, capacité aérobie.
 *
 * Références :
 *  - Wakayoshi et al. 1992 (Critical Swim Speed)
 *  - Pelayo et al. 1996 (vitesse max nage)
 *  - Toussaint & Hollander 1994 (économie nage)
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Waves, Zap, Target, Heart, Save, ArrowLeft } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { toast } from "@/hooks/use-toast";
import { getEffectiveRefs } from "@/lib/effectiveRefs";

const num = (v: string): number => {
  const n = parseFloat((v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number, d = 1) => (Number.isFinite(n) && n > 0 ? n.toFixed(d) : "—");
const fmtPace = (secPer100: number): string => {
  if (!secPer100 || secPer100 <= 0) return "—";
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function SwimPoolDayPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { addSnapshot } = useCloudDataContext() as any;

  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [poolLen, setPoolLen] = useState<"25" | "50">("25");

  // Bloc 1 — sprints
  const [t25, setT25] = useState("");
  const [t50, setT50] = useState("");
  const [t100, setT100] = useState("");

  // Bloc 2 — CSS
  const [t400, setT400] = useState("");
  const [t200, setT200] = useState("");

  // Bloc 3 — aérobie
  const [fcDebut800, setFcDebut800] = useState("");
  const [fcFin800, setFcFin800] = useState("");
  const [t800, setT800] = useState("");

  const calc = useMemo(() => {
    const v25 = num(t25) > 0 ? 25 / num(t25) : 0;
    const v50 = num(t50) > 0 ? 50 / num(t50) : 0;
    const v100 = num(t100) > 0 ? 100 / num(t100) : 0;
    const vMax = Math.max(v25, v50);

    const css = num(t400) > 0 && num(t200) > 0 && num(t400) > num(t200)
      ? ((400 - 200) / (num(t400) - num(t200)))
      : 0; // m/s
    const cssPer100 = css > 0 ? 100 / css : 0; // sec/100m
    const ratioCssVmax = css > 0 && vMax > 0 ? css / vMax : 0;

    const fcD = num(fcDebut800), fcF = num(fcFin800);
    const driftPct = fcD > 0 ? ((fcF - fcD) / fcD) * 100 : 0;
    const t800Theo = cssPer100 > 0 ? cssPer100 * 8 * 1.10 : 0; // CSS+10% (plus lent)
    const ecart800 = num(t800) > 0 && t800Theo > 0 ? num(t800) - t800Theo : 0;

    // TTE estimé nage : plus le ratio CSS/Vmax est haut, plus la nage est endurante
    const tteEst = ratioCssVmax > 0
      ? Math.max(20, Math.min(60, 25 + (ratioCssVmax - 0.55) * 200))
      : 0;

    // VLamax nage indicatif (qualitatif) — sprint dominant si ratio bas
    const vlamaxSwimIdx = ratioCssVmax > 0
      ? Math.max(0.30, Math.min(0.80, 0.85 - ratioCssVmax))
      : 0;

    return { v25, v50, v100, vMax, css, cssPer100, ratioCssVmax, driftPct, t800Theo, ecart800, tteEst, vlamaxSwimIdx };
  }, [t25, t50, t100, t400, t200, fcDebut800, fcFin800, t800]);

  const canCreate = !!currentAthlete && calc.cssPer100 > 0;

  const handleCreate = async () => {
    if (!currentAthlete) {
      toast({ title: "Sélectionnez un athlète", variant: "destructive" });
      return;
    }
    const snap = await addSnapshot({
      athlete_id: currentAthlete.id,
      date: testDate,
      source: "swim_pool_day",
      css: calc.cssPer100 || null,
      coach_notes: `TFCL Pool Day™ — Bassin ${poolLen}m — CSS ${fmtPace(calc.cssPer100)}/100m · V max ${fmt(calc.vMax, 2)} m/s · CSS/Vmax ${fmt(calc.ratioCssVmax * 100, 0)}% · VLamax nage idx ${fmt(calc.vlamaxSwimIdx, 2)} · TTE est ${fmt(calc.tteEst, 0)}min · drift 800m ${fmt(calc.driftPct, 1)}%`,
    } as any);
    if (snap) {
      toast({ title: "Snapshot créé" });
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
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Waves className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">🏊 TFCL Pool Day™</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Protocole piscine 1h30 — CSS, VLamax nage, capacité aérobie
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <Label>Bassin</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={poolLen}
                onChange={(e) => setPoolLen(e.target.value as "25" | "50")}
              >
                <option value="25">25 m</option>
                <option value="50">50 m</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Bloc 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> Bloc 1 — Vitesse Max
              </CardTitle>
              <Badge variant="secondary">20 min</Badge>
            </div>
            <CardDescription className="text-xs">
              25 m / 50 m / 100 m max départ plongé. Récup complète 3-5 min entre chaque.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Temps 25 m (sec)</Label>
              <Input type="number" step="0.01" value={t25} onChange={(e) => setT25(e.target.value)} placeholder="13.50" />
            </div>
            <div>
              <Label>Temps 50 m (sec)</Label>
              <Input type="number" step="0.01" value={t50} onChange={(e) => setT50(e.target.value)} placeholder="29.50" />
            </div>
            <div>
              <Label>Temps 100 m (sec)</Label>
              <Input type="number" step="0.01" value={t100} onChange={(e) => setT100(e.target.value)} placeholder="65.00" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Metric label="V 25m" value={fmt(calc.v25, 2)} unit="m/s" />
              <Metric label="V 50m" value={fmt(calc.v50, 2)} unit="m/s" />
              <Metric label="V 100m" value={fmt(calc.v100, 2)} unit="m/s" />
              <Metric label="V max" value={fmt(calc.vMax, 2)} unit="m/s" />
            </div>
            <p className="sm:col-span-3 text-[10px] text-muted-foreground">
              <b>Réf :</b> Pelayo et al. 1996 — capacité glycolytique natation.
            </p>
          </CardContent>
        </Card>

        {/* Bloc 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" /> Bloc 2 — CSS Critical Swim Speed
              </CardTitle>
              <Badge variant="secondary">40 min</Badge>
            </div>
            <CardDescription className="text-xs">
              <b>400 m max</b> — récup 8 min — <b>200 m max</b>. CSS = (400 − 200) / (T400 − T200).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Temps 400 m (sec)</Label>
              <Input type="number" step="0.01" value={t400} onChange={(e) => setT400(e.target.value)} placeholder="320.0" />
            </div>
            <div>
              <Label>Temps 200 m (sec)</Label>
              <Input type="number" step="0.01" value={t200} onChange={(e) => setT200(e.target.value)} placeholder="148.0" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-3 gap-2 text-xs">
              <Metric label="CSS" value={fmt(calc.css, 2)} unit="m/s" />
              <Metric label="CSS /100m" value={fmtPace(calc.cssPer100)} unit="min" />
              <Metric label="CSS /100m" value={fmt(calc.cssPer100, 1)} unit="sec" />
            </div>
            <p className="sm:col-span-2 text-[10px] text-muted-foreground">
              <b>Réf :</b> Wakayoshi et al. 1992 (Eur J Appl Physiol).
            </p>
          </CardContent>
        </Card>

        {/* Bloc 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" /> Bloc 3 — Aérobie
              </CardTitle>
              <Badge variant="secondary">20 min</Badge>
            </div>
            <CardDescription className="text-xs">
              <b>800 m continu</b> à allure CSS+10% (plus lente que CSS). Cible : {fmtPace(calc.cssPer100 * 1.10)}/100m.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>FC début (bpm)</Label>
              <Input type="number" value={fcDebut800} onChange={(e) => setFcDebut800(e.target.value)} placeholder="140" />
            </div>
            <div>
              <Label>FC fin (bpm)</Label>
              <Input type="number" value={fcFin800} onChange={(e) => setFcFin800(e.target.value)} placeholder="155" />
            </div>
            <div>
              <Label>Temps 800m réel (sec)</Label>
              <Input type="number" value={t800} onChange={(e) => setT800(e.target.value)} placeholder="720" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-3 gap-2 text-xs">
              <Metric label="Drift cardiaque" value={fmt(calc.driftPct, 1)} unit="%" />
              <Metric label="T800 théo" value={fmt(calc.t800Theo, 0)} unit="sec" />
              <Metric label="Écart réel/théo" value={`${calc.ecart800 > 0 ? "+" : ""}${fmt(Math.abs(calc.ecart800), 0)}`} unit="sec" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-500" /> Synthèse — Profil nage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Metric label="CSS" value={fmtPace(calc.cssPer100)} unit="min/100m" big />
              <Metric label="CSS" value={fmt(calc.cssPer100, 1)} unit="sec/100m" big />
              <Metric label="V max" value={fmt(calc.vMax, 2)} unit="m/s" big />
              <Metric label="CSS/Vmax" value={fmt(calc.ratioCssVmax * 100, 0)} unit="%" big />
              <Metric label="VLamax nage (idx)" value={fmt(calc.vlamaxSwimIdx, 2)} unit="" big />
              <Metric label="TTE nage est." value={fmt(calc.tteEst, 0)} unit="min" big />
            </div>
            <Button className="w-full" disabled={!canCreate} onClick={handleCreate}>
              <Save className="h-4 w-4" /> Créer snapshot depuis ces résultats
            </Button>
            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
              <b>Références :</b> Wakayoshi et al. 1992, Pelayo et al. 1996, Toussaint & Hollander 1994.
              VLamax nage indicative (estimation qualitative sans lactate).
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

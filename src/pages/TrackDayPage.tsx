/**
 * TrackDayPage — TFCL Track Day™
 * Protocole piste complet en 2h pour estimer VMA, VLamax, Seuil, TTE, FatMax
 * en une seule séance.
 *
 * Références :
 *  - Billat 2001 (VMA & TTE)
 *  - Jones & Vanhatalo 2017 (CP/W')
 *  - Léger & Bouchard 1980 (VAM)
 *  - Skiba 2012 (W'bal)
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Activity, Zap, Target, Heart, Save, ArrowLeft } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { toast } from "@/hooks/use-toast";
import { getEffectiveRefs } from "@/lib/effectiveRefs";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const num = (v: string): number => {
  const n = parseFloat((v || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number, d = 1) => (Number.isFinite(n) && n > 0 ? n.toFixed(d) : "—");

/** Puissance simplifiée pour la course : P = m × v² × 0.0025 × v (W/kg → ÷ m) */
const powerWperKg = (vKmh: number): number => {
  if (!vKmh || vKmh <= 0) return 0;
  const v = vKmh / 3.6; // m/s
  return v * v * 0.0025 * v; // W/kg approx (formule fournie par le coach)
};

const paceMinKm = (vKmh: number): string => {
  if (!vKmh || vKmh <= 0) return "—";
  const sPerKm = 3600 / vKmh;
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function TrackDayPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { addSnapshot, snapshots } = useCloudDataContext() as any;

  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  // Header
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [surface, setSurface] = useState<"piste" | "route">("piste");
  const [tempC, setTempC] = useState("");
  const [wind, setWind] = useState("");

  // Anthropométrie (poids/taille) — auto depuis snapshot, fallback manuel
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
  const heightM = num(heightCmManual) > 0 ? num(heightCmManual) / 100 : 0;
  const fcRepos = num(fcReposManual);
  const fcMax = effectiveRefs.fcMax ?? num(fcMaxManual);

  // Bloc 1 — Neuromusculaire (5 options indépendantes)
  const [t30m, setT30m] = useState("");
  const [t100m, setT100m] = useState("");
  const [t200m, setT200m] = useState("");
  const [cmjCm, setCmjCm] = useState("");
  const [bonds5m, setBonds5m] = useState("");
  const [sprint15sM, setSprint15sM] = useState(""); // distance parcourue en 15s max — alimente vlamaxCapEstimator

  // Bloc 2 — Glycolytique
  const [t400m, setT400m] = useState("");
  const [t600m, setT600m] = useState("");

  // Bloc 3 — Seuil
  const [d6min, setD6min] = useState("");
  const [d20min, setD20min] = useState("");

  // Bloc 4 — Aérobie
  const [fcDebutZ2, setFcDebutZ2] = useState("");
  const [fcFinZ2, setFcFinZ2] = useState("");
  const [allureZ2SecKm, setAllureZ2SecKm] = useState("");

  // ──────────────── Calculs dérivés ────────────────
  const calc = useMemo(() => {
    // ── Bloc 1 — Neuromusculaire (5 options indépendantes) ──
    // Option 1 : 30m → V max (km/h), facteur 1.12 (correction départ arrêté → lancé) — Ferro 2001
    const vMaxFrom30 = num(t30m) > 0 ? (30 / num(t30m)) * 3.6 * 1.12 : 0;
    // Option 2 : 100m → P5s (W/kg) — Lockie 2011
    const P5sFrom100 = num(t100m) > 0 && massKg > 0
      ? massKg * Math.pow(100 / num(t100m), 2) * 0.0023
      : 0;
    // Option 3 : 200m → P30s (W/kg) — Morin 2011
    const P30sFrom200 = num(t200m) > 0 && massKg > 0
      ? massKg * Math.pow(200 / num(t200m), 2) * 0.0021
      : 0;
    // Option 4 : CMJ → P1s (W/kg) — Bosco 1983
    const P1sFromCmj = num(cmjCm) > 0
      ? 60.7 * Math.sqrt(num(cmjCm) / 100) + 45.3
      : 0;
    // Option 5 : 5 bonds horizontaux → Score_neuro — Maulder & Cronin 2005
    const scoreNeuroBonds = num(bonds5m) > 0 && heightM > 0
      ? num(bonds5m) / (heightM * 2.5)
      : 0;

    // P1s prioritaire CMJ, sinon dérivé de V max 30m (puissance approx)
    const P1s = P1sFromCmj > 0
      ? P1sFromCmj
      : (vMaxFrom30 > 0 ? powerWperKg(vMaxFrom30) : 0);
    const P5s = P5sFrom100;
    const P30s = P30sFrom200;

    // Score neuromusculaire global pondéré
    // P1s prioritaire (CMJ ou sprint), sinon bonds
    const neuroSamples: number[] = [];
    if (P1sFromCmj > 0) neuroSamples.push(Math.min(1, P1sFromCmj / 75));
    else if (scoreNeuroBonds > 0) neuroSamples.push(Math.min(1, scoreNeuroBonds / 1.6));
    if (vMaxFrom30 > 0) neuroSamples.push(Math.min(1, vMaxFrom30 / 35));
    if (P5s > 0) neuroSamples.push(Math.min(1, P5s / 18));
    if (P30s > 0) neuroSamples.push(Math.min(1, P30s / 12));
    const neuroScore = neuroSamples.length > 0
      ? neuroSamples.reduce((a, b) => a + b, 0) / neuroSamples.length
      : 0;
    const neuroCount = [t30m, t100m, t200m, cmjCm, bonds5m].filter((v) => num(v) > 0).length;

    // ── Bloc 2 — Glycolytique ──
    const v100 = num(t100m) > 0 ? (100 / num(t100m)) * 3.6 : 0;
    const v200 = num(t200m) > 0 ? (200 / num(t200m)) * 3.6 : 0;
    const v400 = num(t400m) > 0 ? (400 / num(t400m)) * 3.6 : 0;
    const v600 = num(t600m) > 0 ? (600 / num(t600m)) * 3.6 : 0;
    const P60s = powerWperKg(v400);

    // VMA depuis 400m
    const vma400 = num(t400m) > 0 ? (1440 / num(t400m)) * 3.6 : 0;
    // VMA depuis 6 min (Léger)
    const vma6min = num(d6min) > 0 ? (num(d6min) / 6) * 60 / 1000 * 1.05 : 0;
    const vmaConfirmee = vma6min > 0 ? vma6min : vma400;

    // Allure seuil depuis 20 min
    const vSeuilKmh = num(d20min) > 0 ? (num(d20min) / 20) * 60 / 1000 : 0;
    const ratioSeuilVMA = vmaConfirmee > 0 && vSeuilKmh > 0 ? vSeuilKmh / vmaConfirmee : 0;

    const tteEst = ratioSeuilVMA > 0 ? Math.max(25, Math.min(75, 30 + (ratioSeuilVMA - 0.85) * 400)) : 0;

    const fcD = num(fcDebutZ2);
    const fcF = num(fcFinZ2);
    const driftPct = fcD > 0 ? ((fcF - fcD) / fcD) * 100 : 0;
    const fatMaxPct = fcD > 0 ? Math.max(50, Math.min(78, 65 - driftPct * 2)) : 0;

    // VLamax — Score G fusionne sprints disponibles + ratio seuil/VMA inversé
    const sprintRefs = [22, 18, 12, 8];
    const sprintVals = [P1s, P5s, P30s, P60s];
    const sprintAvail = sprintVals
      .map((p, i) => p > 0 ? Math.max(0, Math.min(1, p / sprintRefs[i])) : null)
      .filter((v): v is number => v != null);
    const sprintScore = sprintAvail.length > 0
      ? sprintAvail.reduce((a, b) => a + b, 0) / sprintAvail.length
      : 0;

    const ratioInv = ratioSeuilVMA > 0
      ? Math.max(0, Math.min(1, (0.95 - ratioSeuilVMA) / 0.15))
      : 0.5;

    const scoreG = sprintScore * 0.6 + ratioInv * 0.4;
    const vlamaxEst = vmaConfirmee > 0 ? 0.25 + scoreG * 0.6 : 0;

    // VO2max estimé depuis VMA — Léger & Mercier 1984 : VO2max ≈ VMA × 3.5
    const vo2maxEst = vmaConfirmee > 0 ? vmaConfirmee * 3.5 : 0;

    return {
      vMaxFrom30, P5sFrom100, P30sFrom200, P1sFromCmj, scoreNeuroBonds,
      neuroScore, neuroCount,
      v100, v200, v400, v600,
      P1s, P5s, P30s, P60s,
      vma400, vma6min, vmaConfirmee,
      vSeuilKmh, ratioSeuilVMA,
      tteEst,
      driftPct, fatMaxPct,
      scoreG, vlamaxEst, vo2maxEst,
    };
  }, [t30m, t100m, t200m, cmjCm, bonds5m, t400m, t600m, d6min, d20min, fcDebutZ2, fcFinZ2, massKg, heightM]);

  const canCreateSnapshot =
    !!currentAthlete && calc.vmaConfirmee > 0 && calc.vlamaxEst > 0;

  const handleCreateSnapshot = async () => {
    if (!currentAthlete) {
      toast({ title: "Sélectionnez un athlète", variant: "destructive" });
      return;
    }
    const snap = await addSnapshot({
      athlete_id: currentAthlete.id,
      date: testDate,
      source: "track_day",
      weight_kg: massKg > 0 ? massKg : null,
      fc_repos: fcRepos > 0 ? fcRepos : null,
      fc_max: fcMax > 0 ? fcMax : null,
      vma: calc.vmaConfirmee || null,
      vo2max: calc.vo2maxEst > 0 ? Math.round(calc.vo2maxEst * 10) / 10 : null,
      vlamax_run: calc.vlamaxEst || null,
      tte_observed_min_run: calc.tteEst || null,
      pace_threshold_sec_per_km: calc.vSeuilKmh > 0 ? Math.round(3600 / calc.vSeuilKmh) : null,
      sprint_15s_distance: num(sprint15sM) > 0 ? num(sprint15sM) : null,
      coach_notes: `TFCL Track Day™ — ${surface} — T° ${tempC || "?"}°C, vent ${wind || "?"} km/h — Score G ${fmt(calc.scoreG, 2)} — FatMax est. ${fmt(calc.fatMaxPct, 0)}% VMA${heightM > 0 ? ` — taille ${(heightM * 100).toFixed(0)}cm` : ""}`,
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/diagnostic")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">TFCL Track Day™</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Protocole piste 400m — VMA, VLamax, Seuil, TTE en 2h
            </p>
          </div>
        </div>

        {/* Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration du test</CardTitle>
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
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date du test</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>
            <div>
              <Label>Surface</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={surface}
                onChange={(e) => setSurface(e.target.value as "piste" | "route")}
              >
                <option value="piste">Piste 400m</option>
                <option value="route">Route plate</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Température (°C)</Label>
                <Input type="number" value={tempC} onChange={(e) => setTempC(e.target.value)} placeholder="18" />
              </div>
              <div>
                <Label>Vent (km/h)</Label>
                <Input type="number" value={wind} onChange={(e) => setWind(e.target.value)} placeholder="5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Données de base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Données de base</CardTitle>
            <CardDescription className="text-xs">Communes à tous les blocs — alimentent les calculs et le snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>
                Poids (kg) <span className="text-destructive">*</span>{" "}
                {effectiveRefs.weightKg != null && (
                  <span className="text-[10px] text-success font-normal">— auto snapshot</span>
                )}
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
                FC max (bpm){" "}
                {effectiveRefs.fcMax != null && <span className="text-[10px] text-success font-normal">— auto</span>}
              </Label>
              {effectiveRefs.fcMax != null ? (
                <Input type="number" value={effectiveRefs.fcMax} disabled />
              ) : (
                <Input type="number" value={fcMaxManual} onChange={(e) => setFcMaxManual(e.target.value)} placeholder="188" />
              )}
            </div>
            <div>
              <Label>Taille (cm) <span className="text-[10px] text-muted-foreground">— IMC</span></Label>
              <Input type="number" step="1" value={heightCmManual} onChange={(e) => setHeightCmManual(e.target.value)} placeholder="178" />
            </div>
          </CardContent>
        </Card>

        {/* Bloc 1 — Neuromusculaire (5 options indépendantes) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Bloc 1 — Neuromusculaire
              </CardTitle>
              <Badge variant="secondary">20 min</Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              <b>Toutes les options sont optionnelles</b> — remplis ce que tu peux mesurer,
              le calcul s'adapte aux données disponibles. Après 15&apos; d&apos;échauffement
              progressif, 8-10 min de récupération complète entre chaque effort maximal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Option 1 — 30m */}
            <OptionRow
              num="1"
              title="30m départ arrêté"
              ref="Ferro et al. 2001"
              input={
                <Input type="number" step="0.01" value={t30m} onChange={(e) => setT30m(e.target.value)} placeholder="4.20" />
              }
              unit="sec"
              result={calc.vMaxFrom30 > 0 ? `V max = ${fmt(calc.vMaxFrom30, 1)} km/h` : null}
            />
            {/* Option 2 — 100m */}
            <OptionRow
              num="2"
              title="100m départ arrêté"
              ref="Lockie et al. 2011"
              input={
                <Input type="number" step="0.01" value={t100m} onChange={(e) => setT100m(e.target.value)} placeholder="13.20" />
              }
              unit="sec"
              result={
                calc.P5sFrom100 > 0
                  ? `P5s = ${fmt(calc.P5sFrom100, 2)} W/kg`
                  : num(t100m) > 0 && massKg <= 0
                    ? "⚠️ poids requis"
                    : null
              }
            />
            {/* Option 3 — 200m */}
            <OptionRow
              num="3"
              title="200m départ arrêté"
              ref="Morin et al. 2011"
              input={
                <Input type="number" step="0.01" value={t200m} onChange={(e) => setT200m(e.target.value)} placeholder="28.50" />
              }
              unit="sec"
              result={
                calc.P30sFrom200 > 0
                  ? `P30s = ${fmt(calc.P30sFrom200, 2)} W/kg`
                  : num(t200m) > 0 && massKg <= 0
                    ? "⚠️ poids requis"
                    : null
              }
            />
            {/* Option 4 — CMJ */}
            <OptionRow
              num="4"
              title="Saut vertical CMJ"
              ref="Bosco 1983"
              note="via app My Jump 2 ou tapis de saut"
              input={
                <Input type="number" step="0.1" value={cmjCm} onChange={(e) => setCmjCm(e.target.value)} placeholder="38" />
              }
              unit="cm"
              result={calc.P1sFromCmj > 0 ? `P1s = ${fmt(calc.P1sFromCmj, 1)} W/kg` : null}
            />
            {/* Option 5 — 5 bonds */}
            <OptionRow
              num="5"
              title="5 bonds horizontaux"
              ref="Maulder & Cronin 2005"
              input={
                <Input type="number" step="0.01" value={bonds5m} onChange={(e) => setBonds5m(e.target.value)} placeholder="14.50" />
              }
              unit="m"
              result={
                calc.scoreNeuroBonds > 0
                  ? `Score neuro = ${fmt(calc.scoreNeuroBonds, 2)}`
                  : num(bonds5m) > 0 && heightM <= 0
                    ? "⚠️ taille requise"
                    : null
              }
            />
            {/* Option 6 — Sprint 15s (distance) — alimente vlamaxCapEstimator */}
            <OptionRow
              num="6"
              title="Sprint 15s — distance max (m)"
              ref="TFCL VLamax CAP — Démarrer au signal, courir 15 secondes à vitesse maximale, marquer la position et mesurer la distance en mètres"
              input={
                <Input type="number" step="0.1" value={sprint15sM} onChange={(e) => setSprint15sM(e.target.value)} placeholder="115" />
              }
              unit="m"
              result={
                num(sprint15sM) > 0
                  ? `V_15s = ${fmt((num(sprint15sM) / 15) * 3.6, 1)} km/h → snapshot.sprint_15s_distance`
                  : null
              }
            />

            {/* Synthèse Profil Neuromusculaire */}
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
              <div className="text-xs font-semibold flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" />
                Profil Neuromusculaire
              </div>
              {calc.neuroCount === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Optionnel — saisissez au moins une mesure.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {calc.vMaxFrom30 > 0 && <Metric label="V max" value={fmt(calc.vMaxFrom30, 1)} unit="km/h" />}
                    {calc.P1s > 0 && <Metric label="P1s" value={fmt(calc.P1s, 1)} unit="W/kg" />}
                    {calc.P5s > 0 && <Metric label="P5s" value={fmt(calc.P5s, 2)} unit="W/kg" />}
                    {calc.P30s > 0 && <Metric label="P30s" value={fmt(calc.P30s, 2)} unit="W/kg" />}
                    {calc.scoreNeuroBonds > 0 && <Metric label="Score bonds" value={fmt(calc.scoreNeuroBonds, 2)} unit="" />}
                    <Metric label="Score global" value={fmt(calc.neuroScore * 100, 0)} unit="/100" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {calc.neuroCount}/5 mesure{calc.neuroCount > 1 ? "s" : ""} — pondération P1s prioritaire (CMJ {">"} bonds).
                  </p>
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
              <b>Références complètes :</b> Ferro et al. 2001 (J Sports Sci) — Lockie et al. 2011 (J Strength Cond Res) —
              Morin et al. 2011 (Eur J Appl Physiol) — Bosco 1983 (Eur J Appl Physiol) —
              Maulder & Cronin 2005 (Phys Ther Sport).
            </p>
          </CardContent>
        </Card>

        {/* Bloc 2 — Glycolytique */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Bloc 2 — Glycolytique
              </CardTitle>
              <Badge variant="secondary">25 min</Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              • <b>400m max</b> départ arrêté
              <br />• Récup 8 min
              <br />• <b>600m max</b>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Temps 400m (sec)</Label>
              <Input type="number" step="0.01" value={t400m} onChange={(e) => setT400m(e.target.value)} placeholder="62.0" />
            </div>
            <div>
              <Label>Temps 600m (sec)</Label>
              <Input type="number" step="0.01" value={t600m} onChange={(e) => setT600m(e.target.value)} placeholder="98.0" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-3 gap-2 mt-1 text-xs">
              <Metric label="VMA (400m)" value={fmt(calc.vma400, 1)} unit="km/h" />
              <Metric label="V 600m" value={fmt(calc.v600, 1)} unit="km/h" />
              <Metric label="P60s" value={fmt(calc.P60s, 2)} unit="W/kg" />
            </div>
          </CardContent>
        </Card>

        {/* Bloc 3 — Seuil */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Bloc 3 — Seuil
              </CardTitle>
              <Badge variant="secondary">35 min</Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              • Test <b>6 min max</b> sur piste (distance parcourue en mètres)
              <br />• Récup 10 min
              <br />• Test <b>20 min max</b> (distance parcourue)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Distance 6 min (m)</Label>
              <Input type="number" value={d6min} onChange={(e) => setD6min(e.target.value)} placeholder="1850" />
            </div>
            <div>
              <Label>Distance 20 min (m)</Label>
              <Input type="number" value={d20min} onChange={(e) => setD20min(e.target.value)} placeholder="5600" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-xs">
              <Metric label="VMA 6min" value={fmt(calc.vma6min, 1)} unit="km/h" />
              <Metric label="V seuil" value={fmt(calc.vSeuilKmh, 1)} unit="km/h" />
              <Metric label="Ratio seuil/VMA" value={fmt(calc.ratioSeuilVMA * 100, 1)} unit="%" />
              <Metric label="TTE est." value={fmt(calc.tteEst, 0)} unit="min" />
            </div>
          </CardContent>
        </Card>

        {/* Bloc 4 — Aérobie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Bloc 4 — Aérobie
              </CardTitle>
              <Badge variant="secondary">20 min</Badge>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              <b>12 min</b> de course continue en Z2 stable (FC cible <b>65-72% FCmax</b>).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>FC début Z2 (bpm)</Label>
              <Input type="number" value={fcDebutZ2} onChange={(e) => setFcDebutZ2(e.target.value)} placeholder="135" />
            </div>
            <div>
              <Label>FC fin Z2 (bpm)</Label>
              <Input type="number" value={fcFinZ2} onChange={(e) => setFcFinZ2(e.target.value)} placeholder="142" />
            </div>
            <div>
              <Label>Allure Z2 (sec/km)</Label>
              <Input type="number" value={allureZ2SecKm} onChange={(e) => setAllureZ2SecKm(e.target.value)} placeholder="300" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 gap-2 mt-1 text-xs">
              <Metric label="Drift cardiaque" value={fmt(calc.driftPct, 1)} unit="%" />
              <Metric label="FatMax est." value={fmt(calc.fatMaxPct, 0)} unit="% VMA" />
            </div>
          </CardContent>
        </Card>

        {/* Synthèse */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-purple-500" />
              Synthèse — Profil physiologique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Metric label="VMA" value={fmt(calc.vmaConfirmee, 1)} unit="km/h" big />
              <Metric label="Allure seuil" value={paceMinKm(calc.vSeuilKmh)} unit="min/km" big />
              <Metric label="Ratio seuil/VMA" value={fmt(calc.ratioSeuilVMA * 100, 1)} unit="%" big />
              <Metric label="VLamax est." value={fmt(calc.vlamaxEst, 2)} unit="mmol/L/s" big />
              <Metric label="TTE est." value={fmt(calc.tteEst, 0)} unit="min" big />
              <Metric label="FatMax est." value={fmt(calc.fatMaxPct, 0)} unit="% VMA" big />
            </div>

            <Button
              variant="default"
              className="w-full"
              disabled={!canCreateSnapshot}
              onClick={handleCreateSnapshot}
            >
              <Save className="h-4 w-4" />
              Créer un snapshot depuis ces résultats
            </Button>

            <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
              <b>Références :</b> Billat 2001, Jones &amp; Vanhatalo 2017, Léger &amp; Bouchard 1980,
              Skiba 2012. Confiance VLamax estimée : <b>0.70-0.80</b> (sans mesure lactate).
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

function OptionRow({
  num: n,
  title,
  ref: refStr,
  note,
  input,
  unit,
  result,
}: {
  num: string;
  title: string;
  ref: string;
  note?: string;
  input: React.ReactNode;
  unit: string;
  result: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr] gap-2 items-end rounded-md border border-border/60 bg-background/40 p-2">
      <div>
        <div className="text-xs font-medium">
          Option {n} — {title}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Réf : {refStr}
          {note ? ` · ${note}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {input}
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 sm:text-right">
        {result ?? <span className="text-muted-foreground font-normal italic">—</span>}
      </div>
    </div>
  );
}

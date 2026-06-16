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
  const { addSnapshot } = useCloudDataContext();

  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  // Header
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [surface, setSurface] = useState<"piste" | "route">("piste");
  const [tempC, setTempC] = useState("");
  const [wind, setWind] = useState("");

  // Bloc 1 — Neuromusculaire
  const [vMaxKmh, setVMaxKmh] = useState("");
  const [t100m, setT100m] = useState("");
  const [t200m, setT200m] = useState("");

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
    const vMax = num(vMaxKmh);
    const v100 = num(t100m) > 0 ? (100 / num(t100m)) * 3.6 : 0;
    const v200 = num(t200m) > 0 ? (200 / num(t200m)) * 3.6 : 0;
    const v400 = num(t400m) > 0 ? (400 / num(t400m)) * 3.6 : 0;
    const v600 = num(t600m) > 0 ? (600 / num(t600m)) * 3.6 : 0;

    const P1s = powerWperKg(vMax);
    const P5s = powerWperKg(v100 || vMax * 0.9);
    const P30s = powerWperKg(v200);
    const P60s = powerWperKg(v400);

    // VMA depuis 400m
    const vma400 = num(t400m) > 0 ? (1440 / num(t400m)) * 3.6 : 0;
    // VMA depuis 6 min (Léger)
    const vma6min = num(d6min) > 0 ? (num(d6min) / 6) * 60 / 1000 * 1.05 : 0;
    const vmaConfirmee = vma6min > 0 ? vma6min : vma400;

    // Allure seuil depuis 20 min
    const vSeuilKmh = num(d20min) > 0 ? (num(d20min) / 20) * 60 / 1000 : 0;
    const ratioSeuilVMA = vmaConfirmee > 0 && vSeuilKmh > 0 ? vSeuilKmh / vmaConfirmee : 0;

    // TTE estimé (Billat) : plus le ratio est haut, plus le TTE au seuil est élevé
    // Heuristique simple : TTE ≈ 30 + (ratio - 0.85) × 400, borné 25-75
    const tteEst = ratioSeuilVMA > 0 ? Math.max(25, Math.min(75, 30 + (ratioSeuilVMA - 0.85) * 400)) : 0;

    // Drift cardiaque Z2
    const fcD = num(fcDebutZ2);
    const fcF = num(fcFinZ2);
    const driftPct = fcD > 0 ? ((fcF - fcD) / fcD) * 100 : 0;

    // FatMax estimé : meilleur drift = FatMax plus haut (% VMA)
    // Heuristique : FatMax % ≈ 65 - drift × 2, borné 50-78
    const fatMaxPct = fcD > 0 ? Math.max(50, Math.min(78, 65 - driftPct * 2)) : 0;

    // VLamax — Score G inspiré de vlamaxRunV2Enhanced :
    // Fusion sprints (P1s/P5s/P30s/P60s normalisés) + ratio seuil/VMA inversé.
    // Score G ∈ [0,1] → VLamax ∈ [0.25 ; 0.85] mmol/L/s
    const sprintScore = [P1s, P5s, P30s, P60s]
      .map((p, i) => {
        const refs = [22, 18, 12, 8]; // W/kg refs élite
        return Math.max(0, Math.min(1, p / refs[i]));
      })
      .reduce((a, b) => a + b, 0) / 4;

    const ratioInv = ratioSeuilVMA > 0
      ? Math.max(0, Math.min(1, (0.95 - ratioSeuilVMA) / 0.15))
      : 0.5;

    const scoreG = sprintScore * 0.6 + ratioInv * 0.4;
    const vlamaxEst = vmaConfirmee > 0 ? 0.25 + scoreG * 0.6 : 0;

    return {
      v100, v200, v400, v600,
      P1s, P5s, P30s, P60s,
      vma400, vma6min, vmaConfirmee,
      vSeuilKmh, ratioSeuilVMA,
      tteEst,
      driftPct, fatMaxPct,
      scoreG, vlamaxEst,
    };
  }, [vMaxKmh, t100m, t200m, t400m, t600m, d6min, d20min, fcDebutZ2, fcFinZ2]);

  const canCreateSnapshot =
    !!currentAthlete && calc.vmaConfirmee > 0 && calc.vlamaxEst > 0;

  const handleCreateSnapshot = async () => {
    if (!currentAthlete) {
      toast({ title: "Sélectionnez un athlète", variant: "destructive" });
      return;
    }
    const snap = await addSnapshot({
      athlete_id: currentAthlete.id,
      label: `TFCL Track Day — ${testDate}`,
      vma: calc.vmaConfirmee || null,
      vlamax_run: calc.vlamaxEst || null,
      tte_observed_min_run: calc.tteEst || null,
      fatmax_pct: calc.fatMaxPct || null,
      notes: `Track Day ${surface} — T° ${tempC || "?"}°C, vent ${wind || "?"} — Score G ${fmt(calc.scoreG, 2)}`,
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

        {/* Bloc 1 — Neuromusculaire */}
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
              Après 15&apos; d&apos;échauffement progressif, réaliser <b>3 sprints maximaux</b> avec
              8-10 min de récupération complète entre chaque.
              <br />• Sprint 1 : <b>40m lancé</b> — mesurer vitesse max
              <br />• Sprint 2 : <b>100m départ arrêté</b>
              <br />• Sprint 3 : <b>200m départ arrêté</b>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>V max 40m (km/h)</Label>
              <Input type="number" step="0.1" value={vMaxKmh} onChange={(e) => setVMaxKmh(e.target.value)} placeholder="32.0" />
            </div>
            <div>
              <Label>Temps 100m (sec)</Label>
              <Input type="number" step="0.01" value={t100m} onChange={(e) => setT100m(e.target.value)} placeholder="13.20" />
            </div>
            <div>
              <Label>Temps 200m (sec)</Label>
              <Input type="number" step="0.01" value={t200m} onChange={(e) => setT200m(e.target.value)} placeholder="28.50" />
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-xs">
              <Metric label="P1s" value={fmt(calc.P1s, 2)} unit="W/kg" />
              <Metric label="P5s" value={fmt(calc.P5s, 2)} unit="W/kg" />
              <Metric label="P30s" value={fmt(calc.P30s, 2)} unit="W/kg" />
              <Metric label="V 200m" value={fmt(calc.v200, 1)} unit="km/h" />
            </div>
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

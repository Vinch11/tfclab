/**
 * TriTestDayPage — TFCL Tri Test Day™
 * Protocole triathlon combiné sur 2 jours (ou 3 séances séparées).
 * Onglets : Natation, Vélo, Course. Synthèse triathlon avec pondération distance.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, ExternalLink } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { toast } from "@/hooks/use-toast";

export default function TriTestDayPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { addSnapshot } = useCloudDataContext() as any;
  const [activeTab, setActiveTab] = useState("diagnostic");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState<"IM" | "703" | "olympic">("IM");

  // Statut de complétion par discipline (saisi manuellement par le coach après réalisation)
  const [swimDone, setSwimDone] = useState<"⬜" | "⚠️" | "✅">("⬜");
  const [bikeDone, setBikeDone] = useState<"⬜" | "⚠️" | "✅">("⬜");
  const [runDone, setRunDone] = useState<"⬜" | "⚠️" | "✅">("⬜");

  // Valeurs récapitulatives (reprises du snapshot ou saisies à la main)
  const [css, setCss] = useState("");        // sec/100m
  const [ftp, setFtp] = useState("");        // W
  const [vlamaxBike, setVlamaxBike] = useState("");
  const [vma, setVma] = useState("");        // km/h
  const [vlamaxRun, setVlamaxRun] = useState("");

  const ratios = distance === "IM"
    ? { swim: 0.10, bike: 0.55, run: 0.35 }
    : distance === "703"
      ? { swim: 0.12, bike: 0.52, run: 0.36 }
      : { swim: 0.15, bike: 0.50, run: 0.35 };

  const num = (v: string) => { const n = parseFloat((v || "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const vlamaxTriPondere =
    (num(vlamaxBike) * ratios.bike + num(vlamaxRun) * ratios.run) /
    Math.max(0.0001, (num(vlamaxBike) > 0 ? ratios.bike : 0) + (num(vlamaxRun) > 0 ? ratios.run : 0));

  const handleCreate = async () => {
    if (!currentAthlete) {
      toast({ title: "Sélectionnez un athlète", variant: "destructive" });
      return;
    }
    const snap = await addSnapshot({
      athlete_id: currentAthlete.id,
      date: testDate,
      source: "tri_test_day",
      css: num(css) || null,
      ftp: num(ftp) || null,
      vma: num(vma) || null,
      vlamax: num(vlamaxBike) || null,
      vlamax_run: num(vlamaxRun) || null,
      coach_notes: `TFCL Tri Test Day™ — Distance ${distance} — VLamax tri pondérée ${vlamaxTriPondere > 0 ? vlamaxTriPondere.toFixed(2) : "—"} mmol/L/s · Ratios temps: nage ${(ratios.swim * 100).toFixed(0)}% / vélo ${(ratios.bike * 100).toFixed(0)}% / run ${(ratios.run * 100).toFixed(0)}% · Statut: nage ${swimDone}, vélo ${bikeDone}, run ${runDone}`,
    } as any);
    if (snap) {
      toast({ title: "Snapshot triathlon créé" });
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
          <div className="p-2 rounded-xl bg-red-500/10">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">⚡ TFCL Tri Test Day™</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Protocole triathlon combiné — profil complet en 2 séances
            </p>
          </div>
        </div>

        <Card className="border-dashed border-red-500/30 bg-red-500/5">
          <CardContent className="py-3 text-sm leading-relaxed">
            Ce protocole combine les tests des 3 disciplines sur <b>2 jours consécutifs</b>.
            <br />• <b>Jour 1</b> : Natation + Vélo
            <br />• <b>Jour 2</b> : Course à pied
            <br />Alternativement réalisable en <b>3 séances séparées</b> (idéal : espacées de 48-72h).
          </CardContent>
        </Card>

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
              <Label>Date (dernier test)</Label>
              <input
                type="date"
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Distance cible</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={distance}
                onChange={(e) => setDistance(e.target.value as any)}
              >
                <option value="IM">Ironman</option>
                <option value="703">70.3</option>
                <option value="olympic">Olympique</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="swim" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="swim">🏊 Natation {swimDone}</TabsTrigger>
            <TabsTrigger value="bike">🚴 Vélo {bikeDone}</TabsTrigger>
            <TabsTrigger value="run">🏃 Course {runDone}</TabsTrigger>
          </TabsList>

          <TabsContent value="swim" className="space-y-3">
            <DiscCard
              title="🏊 Bloc Natation"
              proto="TFCL Pool Day™ (1h30) — Sprint 25/50/100, CSS 400+200, aérobie 800m"
              link="/diagnostic/swim-pool-day"
              status={swimDone}
              setStatus={setSwimDone}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>CSS (sec/100m)</Label>
                  <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" step="0.1" value={css} onChange={(e) => setCss(e.target.value)} placeholder="92.0" />
                </div>
              </div>
            </DiscCard>
          </TabsContent>

          <TabsContent value="bike" className="space-y-3">
            <DiscCard
              title="🚴 Bloc Vélo"
              proto="TFCL Bike Day™ (2h) — Sprints, MAP+CP3', 20min FTP, Z2 drift"
              link="/diagnostic/bike-track-day"
              status={bikeDone}
              setStatus={setBikeDone}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>FTP (W)</Label>
                  <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" value={ftp} onChange={(e) => setFtp(e.target.value)} placeholder="275" />
                </div>
                <div>
                  <Label>VLamax vélo (mmol/L/s)</Label>
                  <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" step="0.01" value={vlamaxBike} onChange={(e) => setVlamaxBike(e.target.value)} placeholder="0.45" />
                </div>
              </div>
            </DiscCard>
          </TabsContent>

          <TabsContent value="run" className="space-y-3">
            <DiscCard
              title="🏃 Bloc Course"
              proto="TFCL Track Day™ (2h) — Neuromusculaire, glycolytique, seuil, aérobie"
              link="/diagnostic/track-day"
              status={runDone}
              setStatus={setRunDone}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>VMA (km/h)</Label>
                  <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" step="0.1" value={vma} onChange={(e) => setVma(e.target.value)} placeholder="17.5" />
                </div>
                <div>
                  <Label>VLamax run (mmol/L/s)</Label>
                  <input className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm" type="number" step="0.01" value={vlamaxRun} onChange={(e) => setVlamaxRun(e.target.value)} placeholder="0.40" />
                </div>
              </div>
            </DiscCard>
          </TabsContent>
        </Tabs>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" /> Synthèse triathlon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Metric label="CSS" value={css || "—"} unit="sec/100m" />
              <Metric label="FTP" value={ftp || "—"} unit="W" />
              <Metric label="VMA" value={vma || "—"} unit="km/h" />
              <Metric label="VLamax vélo" value={vlamaxBike || "—"} unit="mmol/L/s" />
              <Metric label="VLamax run" value={vlamaxRun || "—"} unit="mmol/L/s" />
              <Metric label="VLamax tri (pondérée)" value={vlamaxTriPondere > 0 ? vlamaxTriPondere.toFixed(2) : "—"} unit="mmol/L/s" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed bg-background/60 rounded p-2 border border-border/60">
              <b>Note :</b> Pour le triathlon, la VLamax effective est une moyenne pondérée selon la distribution
              temps de course : <b>IM</b> (nage 10% / vélo 55% / run 35%), <b>70.3</b> (nage 12% / vélo 52% / run 36%).
              Ratios utilisés ici : nage {(ratios.swim * 100).toFixed(0)}% / vélo {(ratios.bike * 100).toFixed(0)}% / run {(ratios.run * 100).toFixed(0)}%.
            </p>
            <Button className="w-full" onClick={handleCreate} disabled={!currentAthlete}>
              Créer snapshot triathlon
            </Button>
            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
              <b>Références :</b> Wakayoshi 1992 (CSS), Coggan & Allen 2010 (FTP), Billat 2001 (VMA),
              Mader 1976 (VLamax). Pondérations : data Ironman Hawaii pro fields.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

function DiscCard({
  title, proto, link, status, setStatus, children,
}: {
  title: string;
  proto: string;
  link: string;
  status: "⬜" | "⚠️" | "✅";
  setStatus: (s: "⬜" | "⚠️" | "✅") => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{proto}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(link)}>
            <ExternalLink className="h-3 w-3" /> Ouvrir protocole
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Label className="text-xs">Statut :</Label>
          {(["⬜", "⚠️", "✅"] as const).map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s} {s === "⬜" ? "À faire" : s === "⚠️" ? "Partiel" : "Complet"}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums text-sm">
        {value} <span className="text-muted-foreground font-normal text-[10px]">{unit}</span>
      </div>
    </div>
  );
}

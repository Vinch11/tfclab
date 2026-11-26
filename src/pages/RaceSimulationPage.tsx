/**
 * SIMULATION DE COURSE — carte de course (refonte du 26/11/2026).
 *
 * Une seule question : le jour de la course, à quelle intensité faire chaque segment,
 * en combien de temps, avec combien de glucides, et avec quelle marge ?
 * Tous les chiffres viennent de `buildRaceCard` (src/lib/raceSimulation/raceCard.ts) :
 * page, export athlète et comparaison prévu / réel affichent les mêmes valeurs.
 * Les anciens blocs (couloirs multiples, scénarios d'erreur, probabilités d'échec)
 * ont été retirés après l'audit du 26/11/2026 : non fiables et contradictoires.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileDown, Mountain, AlertTriangle } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData } from "@/hooks/useCloudData";
import { useAthleteRaceGoals } from "@/hooks/useAthleteRaceGoals";
import { openPrintableHTML } from "@/lib/openPrintableHTML";
import { buildRaceCard } from "@/lib/raceSimulation/raceCard";
import { RaceCardBody } from "@/components/raceSimulation/RaceCardView";
import { raceCardAthlete, raceOptions, simulationUnavailable } from "@/lib/raceSimulation/raceCardData";
import { buildRaceCardHTML } from "@/lib/raceSimulation/buildRaceCardHTML";

export default function RaceSimulationPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { athletes, snapshots, updateAthlete } = useCloudData();
  const [activeTab, setActiveTab] = useState("simulation");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  useEffect(() => { localStorage.setItem("vlab-staff-mode", String(staffMode)); }, [staffMode]);

  const athleteId = currentAthlete?.id ?? null;
  const athlete = useMemo(() => athletes.find(a => a.id === athleteId) ?? null, [athletes, athleteId]);
  const { raceGoals, updateRaceGoalFormat } = useAthleteRaceGoals(athleteId);
  const options = useMemo(() => raceOptions(athlete, raceGoals), [athlete, raceGoals]);
  const unavailable = simulationUnavailable(athlete, options);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  useEffect(() => { setSelectedKey(null); }, [athleteId]);
  const option = options.find(o => o.key === selectedKey) ?? options[0] ?? null;

  // Long Course Weekend : format de l'objectif enregistré, sinon choix local (objectif principal).
  const lcwKey = athleteId ? `lcw-manual-${athleteId}` : null;
  const [lcwLocal, setLcwLocal] = useState(false);
  useEffect(() => { setLcwLocal(!!lcwKey && localStorage.getItem(lcwKey) === "true"); }, [lcwKey]);
  const lcwEligible = option?.kind === "IM" || option?.kind === "703";
  const lcw = lcwEligible && (option?.goalId ? option.lcw : lcwLocal);
  const toggleLcw = async (on: boolean) => {
    if (option?.goalId) { try { await updateRaceGoalFormat(option.goalId, on ? "lcw_3day" : "continuous"); } catch { /* toast déjà émis */ } return; }
    setLcwLocal(on);
    if (lcwKey) { if (on) localStorage.setItem(lcwKey, "true"); else localStorage.removeItem(lcwKey); }
  };

  const cardAthlete = useMemo(() => raceCardAthlete(athlete, snapshots), [athlete, snapshots]);
  const card = useMemo(() => option ? buildRaceCard({ kind: option.kind, lcw, athlete: cardAthlete }) : null, [option, lcw, cardAthlete]);

  const exportCard = () => {
    if (!card || !option) return;
    const html = buildRaceCardHTML({ card, athleteName: currentAthlete?.nom ?? "Athlète", raceLabel: option.label, athlete: cardAthlete, generatedAt: new Date().toLocaleDateString("fr-FR") });
    openPrintableHTML(html, { responsive: true, filenameHint: `Carte_de_course_${(currentAthlete?.nom ?? "athlete").replace(/\s+/g, "_")}_${option.kind}`, autoPrint: false });
  };

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab} staffMode={staffMode} onStaffModeChange={setStaffMode}>
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold">Simulation de course</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentAthlete?.nom ?? "Aucun athlète sélectionné"}</p>
          </div>
          {card && <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={exportCard}><FileDown className="h-4 w-4" />Carte athlète</Button>}
        </div>

        {!athleteId ? <EmptyState text="Choisis un athlète pour simuler sa course." /> : unavailable === "not_needed" ? (
          <EmptyState text="Pas de simulation pour un objectif StartToRun ou 5 km : l'allure se règle directement avec les zones de course." />
        ) : unavailable === "trail" ? (
          <Card><CardContent className="p-4 space-y-3 text-sm">
            <p className="flex items-center gap-2 font-medium"><Mountain className="h-4 w-4 text-primary" />Objectif trail : la simulation trail tient compte du dénivelé.</p>
            <Button asChild size="sm"><Link to="/simulation/trail">Ouvrir la simulation trail</Link></Button>
          </CardContent></Card>
        ) : unavailable === "no_goal" || !option || !card ? (
          <EmptyState text="Aucune course à simuler : ajoute un objectif de course (10 km, semi, marathon ou triathlon) dans la fiche de l'athlète." />
        ) : (
          <>
            <Card><CardContent className="p-3 sm:p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Course</Label>
                <Select value={option.key} onValueChange={setSelectedKey}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{options.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {lcwEligible && (
                <label className="flex items-center justify-between gap-3 text-sm min-h-11">
                  <span>Long Course Weekend <span className="text-muted-foreground">(3 épreuves sur 3 jours)</span></span>
                  <Switch checked={lcw} onCheckedChange={toggleLcw} />
                </label>
              )}
            </CardContent></Card>

            {card.missing.length > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/5"><CardContent className="p-3 sm:p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />À compléter pour une simulation juste</p>
                <ul className="space-y-1.5">
                  {card.missing.map(m => (
                    <li key={m.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0"><b>{m.label}</b> <span className="text-muted-foreground">· {m.why}</span></span>
                      <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => navigate(m.block === "athlete" ? "/athletes" : `/?vue=bilans&fiche=${m.block}`)}>Compléter</Button>
                    </li>
                  ))}
                </ul>
              </CardContent></Card>
            )}

            <RaceCardBody card={card} weightKg={cardAthlete.weightKg} athleteId={athleteId} raceKey={option.key} raceDate={option.date} refs={athlete?.refs}
              onSaveRefs={async refs => { if (athlete) await updateAthlete(athlete.id, { refs: refs as never }); }} />
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">{text}</CardContent></Card>;
}

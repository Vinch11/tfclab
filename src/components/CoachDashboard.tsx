import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesColumnIncreasing, ClipboardList, Compass, Flag, FlaskConical, FolderOpen, Users } from "lucide-react";
import { QuickObjectiveSelector } from "@/components/QuickObjectiveSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import { FieldMetricComparison } from "@/components/charts/FieldComparison";
import { DashboardLimiters } from "@/components/DashboardLimiters";
import { getObjectifLabel, type ObjectifType } from "@/types/athlete";
import type { compassFlow } from "@/lib/coachingCompass/compassFlow";
import { AMBITION_LEVELS_ORDERED, getAmbitionDefinition, type AmbitionLevel } from "@/types/ambitionLevel";
import type { DbSnapshot } from "@/hooks/useCloudData";

type DashboardPanel = "compass" | "bilans" | "analyses";
type Props = {
  athlete: { id: string; name: string; goal: string | null };
  athletes: { id: string; nom: string }[];
  onSelectAthlete: (id: string) => void;
  ambition: AmbitionLevel;
  onAmbitionChange: (level: AmbitionLevel) => void;
  onGoalChange: ComponentProps<typeof QuickObjectiveSelector>["onGoalChange"];
  snapshot: DbSnapshot | null;
  coverage: { filled: number; total: number } | null;
  flow: ReturnType<typeof compassFlow> | null;
  fatigueWarning?: string;
  nextRace?: { name: string; date: string };
  alert: ReactNode;
  /** Profile radar and comparisons, shown on the dashboard itself. */
  profile?: ReactNode;
  compass: ReactNode;
  analyses: ReactNode;
  bilans: ReactNode;
  onOpenReport: () => void;
};

const dateLabel = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" });
function displayDate(value?: string) {
  if (!value) return null;
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  return Number.isFinite(date.getTime()) ? dateLabel.format(date) : null;
}

const actionClass = "group flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-primary";
const arrow = <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground group-hover:text-primary" />;

export function CoachDashboard({ athlete, athletes, onSelectAthlete, ambition, onAmbitionChange, onGoalChange,
  snapshot, coverage, flow, fatigueWarning, nextRace, alert, profile, compass, analyses, bilans, onOpenReport }: Props) {
  const [search, setSearch] = useSearchParams();
  const express = snapshot?.source === "finisher-express";
  const panel = search.get("vue");
  const panels = { compass: express ? "Bilan Express" : "Compass", bilans: "Bilans de l’athlète", analyses: "Analyses complémentaires" };
  const activePanel: DashboardPanel | null = panel === "bilans" || (panel === "compass" && !!compass) || (panel === "analyses" && !!snapshot && !express) ? panel : null;
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPanel = useRef(activePanel);
  useEffect(() => {
    if (previousPanel.current === activePanel) return;
    previousPanel.current = activePanel;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [activePanel]);
  const linkTo = (view?: DashboardPanel) => {
    const query = new URLSearchParams(search);
    if (view) query.set("vue", view);
    else query.delete("vue");
    return { search: query.toString() };
  };
  const title = express ? "Premiers repères physiologiques" : flow?.title ?? "Renseigner le premier bilan";
  const detail = express ? "Le bilan Express présente les zones de fréquence cardiaque et les estimations disponibles." :
    flow?.detail ?? "Ajoute les résultats de terrain pour comparer le profil de cet athlète à son objectif.";
  const profileFirst = !!profile && !!flow && !express && !!snapshot;
  const reference = (
    <section className="flex min-w-0 flex-col items-start gap-3 rounded-3xl border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><ClipboardList aria-hidden className="size-5 text-muted-foreground" /> Bilan de référence</h2>
      <p className="text-xl font-semibold tracking-tight">{snapshot ? displayDate(snapshot.date) ?? "Date inconnue" : "Aucun bilan"}</p>
      {coverage && <div className="w-full space-y-2">
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{coverage.filled} sur {coverage.total}</span> repères renseignés</p>
        <progress aria-label="Repères physiologiques renseignés" value={coverage.filled} max={coverage.total}
          className="block h-2 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary" />
      </div>}
      {snapshot && <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary" to={linkTo("bilans")}>Gérer les bilans <ArrowRight className="size-4" /></Link>}
      <div className="mt-auto w-full border-t pt-1">
        {nextRace && <p className="my-2 text-sm leading-relaxed"><span className="block text-xs text-muted-foreground">Prochaine course · {displayDate(nextRace.date)}</span><strong>{nextRace.name}</strong></p>}
        <button type="button" onClick={onOpenReport} className={actionClass + " w-full"}><Flag className="size-5 shrink-0 text-primary" /> Bilan pré-objectif {arrow}</button>
        <Link to="/diagnostic/tests" className={actionClass}><FlaskConical className="size-5 shrink-0 text-primary" /> Tests de terrain {arrow}</Link>
      </div>
    </section>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-3 sm:space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 ref={activePanel ? undefined : heading} tabIndex={-1} className="outline-none text-xl font-semibold tracking-tight sm:text-2xl">Tableau de bord</h1>
          <Link to="/athletes" className="flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Users aria-hidden className="size-4" /> Tous les athlètes
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 rounded-2xl border bg-card px-4 py-3 sm:px-5">
          <label className="min-w-0 basis-full sm:flex-1">
            <span className="text-xs font-medium text-muted-foreground">Athlète</span>
            <Select value={athlete.id} onValueChange={id => {
              if (panel) setSearch(linkTo().search, { replace: true });
              onSelectAthlete(id);
            }}>
              <SelectTrigger aria-label="Changer d’athlète" className="mt-1 h-11 min-w-0 justify-between gap-3 text-base font-semibold">
                <SelectValue>{athlete.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <div className="min-w-0 flex-1 sm:max-w-56">
            <div className="text-xs font-medium text-muted-foreground">Objectif</div>
            <QuickObjectiveSelector currentGoal={athlete.goal} onGoalChange={onGoalChange} className="mt-1 h-11 w-full justify-between" />
          </div>
          <label className="min-w-0 flex-1 sm:max-w-56">
            <span className="text-xs font-medium text-muted-foreground">Ambition</span>
            <Select value={ambition} onValueChange={level => onAmbitionChange(level as AmbitionLevel)}>
              <SelectTrigger aria-label="Modifier l’ambition" className="mt-1 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{AMBITION_LEVELS_ORDERED.map(level => <SelectItem key={level} value={level}>{getAmbitionDefinition(level).label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        </div>
      </header>

      {activePanel ? <section className="min-w-0 space-y-3">
        <Link to={linkTo()} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="size-4" /> Retour au tableau de bord</Link>
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{panels[activePanel]}</h2>
        {activePanel === "compass" ? compass : activePanel === "bilans" ? bilans : analyses}
      </section> : <>
        {alert}
        {profileFirst ? <>
          {fatigueWarning && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{fatigueWarning}</p>}
          <div className="min-w-0 rounded-3xl border bg-card p-4 sm:p-6">{profile}</div>
          <DashboardLimiters flow={flow} objective={getObjectifLabel((athlete.goal ?? "IM") as ObjectifType)} ambition={getAmbitionDefinition(ambition).label} />
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11"><Link to={linkTo("compass")}><Compass /> Levier et décision du Compass <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="min-h-11"><Link to="/planning/ai-plan"><CalendarDays /> Plan d’entraînement</Link></Button>
          </div>
          {reference}
        </> : <>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] sm:gap-4">
          <section className="min-w-0 space-y-3 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.1] via-card to-card p-5 sm:space-y-4 sm:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Compass aria-hidden className="size-5" /> {express ? "Profil Express" : "Priorité du Compass"}</div>
            <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{detail}</p>
            {fatigueWarning && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{fatigueWarning}</p>}
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-11">
                <Link to={linkTo(snapshot ? "compass" : "bilans")}>{express ? "Voir les estimations" : snapshot ? "Ouvrir le Compass" : "Créer le bilan"} <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link to="/planning/ai-plan"><CalendarDays /> Plan d’entraînement</Link>
              </Button>
            </div>
            {flow?.gap && <FieldMetricComparison metric={flow.gap} hypothesis={flow.lead?.hypothesis} />}
            {flow?.lead?.comparison && <ReferenceGauge {...flow.lead.comparison} name={flow.lead.title} />}
          </section>
          {reference}
        </div>
        </>}
        <nav aria-label="Suivi de l’athlète" className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Suivi de l’athlète</h2>
          <div className={"grid rounded-2xl border bg-card p-1 " + (snapshot && !express ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            <Link to={'/athlete/' + athlete.id} className={actionClass}><FolderOpen className="size-5 shrink-0 text-primary" /> Fiche athlète {arrow}</Link>
            {snapshot && !express && <Link to={linkTo("analyses")} className={actionClass}><ChartNoAxesColumnIncreasing className="size-5 shrink-0 text-primary" /> Analyses complémentaires {arrow}</Link>}
            <Link to="/race?step=3" className={actionClass}><Flag className="size-5 shrink-0 text-primary" /> Stratégie de course {arrow}</Link>
          </div>
        </nav>
      </>}
    </div>
  );
}

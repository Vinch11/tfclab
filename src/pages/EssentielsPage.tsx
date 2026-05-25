/**
 * EssentielsPage — Les 8 piliers TFCL avec graphiques, lecture, pédagogie + export PDF.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, Download, ArrowRight, CheckCircle2, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import {
  computeEssentielsData,
  type PillarData,
  type PillarMetric,
} from "@/lib/essentiels/computeEssentielsData";
import { buildEssentielsHTML } from "@/lib/essentiels/buildEssentielsHTML";
import { PillarVisual } from "@/components/essentiels/PillarVisuals";
import { openPrintableHTML } from "@/lib/openPrintableHTML";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  string,
  { color: string; bg: string; border: string; label: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/30",
    label: "Dans la cible",
    Icon: CheckCircle2,
  },
  warn: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/30",
    label: "À travailler",
    Icon: AlertTriangle,
  },
  missing: {
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-500/10",
    border: "border-slate-200 dark:border-slate-500/30",
    label: "Données insuffisantes",
    Icon: HelpCircle,
  },
  info: {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/30",
    label: "Information",
    Icon: Info,
  },
};

function MetricGauge({ m }: { m: PillarMetric }) {
  if (m.value == null || !isFinite(m.value) || m.value === 0) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{m.label}</span>
        <span className="text-xs italic text-muted-foreground">Données insuffisantes</span>
      </div>
    );
  }

  const formatted =
    (m.decimals != null ? m.value.toFixed(m.decimals) : String(m.value)).replace(".", ",");

  if (!m.scale) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{m.label}</span>
        <span className="text-sm font-semibold text-foreground">
          {formatted}
          {m.unit && <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>}
        </span>
      </div>
    );
  }

  const [sMin, sMax] = m.scale;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - sMin) / (sMax - sMin)) * 100));
  const valuePct = pct(m.value);
  const inTarget =
    m.target && m.value >= m.target[0] && m.value <= m.target[1];

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{m.label}</span>
        <span className={cn("text-sm font-semibold", inTarget ? "text-emerald-600" : "text-foreground")}>
          {formatted}
          {m.unit && <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span>}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        {m.target && (
          <div
            className="absolute top-0 h-full bg-emerald-200 dark:bg-emerald-500/30"
            style={{
              left: `${pct(m.target[0])}%`,
              width: `${pct(m.target[1]) - pct(m.target[0])}%`,
            }}
          />
        )}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-foreground rounded-full"
          style={{ left: `calc(${valuePct}% - 2px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/70">
        <span>{sMin}</span>
        {m.target && (
          <span className="text-emerald-600 dark:text-emerald-400">
            cible {m.target[0]}–{m.target[1]}
          </span>
        )}
        <span>{sMax}</span>
      </div>
    </div>
  );
}

function PillarCard({
  p,
  ctx,
}: {
  p: PillarData;
  ctx: React.ComponentProps<typeof PillarVisual>["ctx"];
}) {
  const s = STATUS_STYLES[p.status];
  const Icon = s.Icon;
  return (
    <Card className={cn("overflow-hidden border-2 transition-all hover:shadow-lg", s.border)}>
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b", s.bg)}>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 shadow-sm",
            "bg-background",
            s.color,
          )}
        >
          {p.number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight text-foreground">{p.title}</h3>
          <div className={cn("flex items-center gap-1 text-[11px] mt-0.5", s.color)}>
            <Icon className="h-3 w-3" />
            <span className="font-medium">{s.label}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Visualisation dédiée */}
        <div className="rounded-lg bg-muted/30 p-2 border border-border/50">
          <PillarVisual p={p} ctx={ctx} />
        </div>

        {/* Métriques chiffrées avec jauge */}
        <div className="space-y-3">
          {p.metrics.map((m, i) => (
            <MetricGauge key={i} m={m} />
          ))}
        </div>


        <div
          className={cn(
            "text-xs leading-relaxed p-3 rounded-md border-l-2",
            s.bg,
            s.border,
            "border-l-current",
            s.color,
          )}
        >
          <span className="font-semibold">Lecture : </span>
          <span className="text-foreground/90">{p.interpretation}</span>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-b-0">
            <AccordionTrigger className="text-xs py-1.5 hover:no-underline">
              Définition · Pourquoi · Comment agir
            </AccordionTrigger>
            <AccordionContent className="text-xs space-y-2.5 pt-2">
              <div>
                <div className="font-semibold text-foreground mb-0.5">Définition</div>
                <p className="text-muted-foreground leading-relaxed">{p.definition}</p>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-0.5">Pourquoi c'est important</div>
                <p className="text-muted-foreground leading-relaxed">{p.whyMatters}</p>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-0.5">Comment on agit</div>
                <p className="text-muted-foreground leading-relaxed">{p.howToAct}</p>
              </div>
              <div className="text-[10px] text-muted-foreground/70 italic border-t pt-2">
                Source : {p.source}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function EssentielsPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests } = useCloudDataContext();
  const [activeTab, setActiveTab] = useState("essentiels");
  const [staffMode, setStaffMode] = useState(
    () => localStorage.getItem("vlab-staff-mode") === "true",
  );

  const bundle = useMemo(
    () => computeEssentielsData({ athlete: currentAthlete, snapshots: snapshots || [], tests: tests || [] }),
    [currentAthlete, snapshots, tests],
  );

  const handleExportPDF = () => {
    if (!bundle) return;
    const html = buildEssentielsHTML(bundle);
    openPrintableHTML(html, {
      filenameHint: `Essentiels TFCL — ${bundle.athleteName}`,
    });
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={(v) => {
        setStaffMode(v);
        localStorage.setItem("vlab-staff-mode", String(v));
      }}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Essentiels</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Les 8 piliers TFCL — chiffres, graphiques, pédagogie
              </p>
            </div>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={!bundle}
            size="sm"
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
        </div>

        {/* Sélecteur athlète */}
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">
              Athlète
            </span>
            <Select
              value={currentAthlete?.id ?? ""}
              onValueChange={(id) => setSelectedAthleteId(id)}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Sélectionner un athlète" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nom} · {a.objectif}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bundle && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                Snapshot : {bundle.snapshotDate ?? "aucun"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {!bundle && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Sélectionnez un athlète pour afficher ses 8 essentiels.
            </CardContent>
          </Card>
        )}

        {bundle && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            {bundle.pillars.map((p) => (
              <PillarCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {/* Footer */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pour aller plus loin : Dashboard (Compass), Diagnostic (audit signé), Simulation (race day).
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/diagnostic")}
              className="shrink-0"
            >
              Diagnostic <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

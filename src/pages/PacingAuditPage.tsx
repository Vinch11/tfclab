/**
 * Pacing Audit — Vue d'ensemble visuelle des stratégies de split et hypothèses
 * scientifiques par discipline. Mode lecture / debug pour coachs et athlètes.
 */

import React, { useMemo, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, FlaskConical, BookOpen, Activity } from "lucide-react";
import { AMBITION_LEVELS_ORDERED, AMBITION_DEFINITIONS, type AmbitionLevel } from "@/types/ambitionLevel";
import { PacingRulesChangelogCard } from "@/components/PacingRulesChangelogCard";

// ═══════════════════════════════════════════════════════════════════════════════
// MODÈLE DE DONNÉES — STRATÉGIES DE SPLIT PAR DISCIPLINE
// ═══════════════════════════════════════════════════════════════════════════════

type SplitStrategy = "negative" | "even" | "controlled_negative" | "reverse_modest" | "positive_tolerated";

interface SplitRow {
  segment: string;            // ex: "0-25%"
  intensityPct: string;       // ex: "-3 à -5%"
  cue: string;                // consigne coach
}

interface DisciplineAudit {
  id: string;
  label: string;
  emoji: string;
  format: string;             // 10K, Semi, Marathon, 70.3 run, 70.3 bike, IM run, IM bike
  defaultStrategy: SplitStrategy;
  splits: SplitRow[];
  // Variantes par ambition (uniquement IM run pour l'instant)
  ambitionVariants?: Partial<Record<AmbitionLevel, { strategy: SplitStrategy; firstPortion: string; tolerance: string; note: string }>>;
  scientificBasis: { title: string; refs: string[]; rationale: string }[];
  modelHypotheses: string[];
  bibliography: { author: string; year: number; topic: string }[];
}

const STRATEGY_META: Record<SplitStrategy, { label: string; color: string; description: string }> = {
  negative: {
    label: "Negative split",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    description: "2ème moitié plus rapide que la 1ère (1-3%)",
  },
  controlled_negative: {
    label: "Negative split contrôlé",
    color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    description: "Départ -3 à -5% sous cible, finish progressif",
  },
  even: {
    label: "Even split",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    description: "Allure quasi-constante (Δ ≤ ±1%)",
  },
  reverse_modest: {
    label: "Reverse split modéré",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    description: "Léger ralentissement final (+1 à +2%) — physiologique",
  },
  positive_tolerated: {
    label: "Positive split toléré",
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    description: "Ralentissement +3 à +8% accepté (course glycogène-limitée)",
  },
};

const DISCIPLINES: DisciplineAudit[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "10k",
    label: "10 km",
    emoji: "🏃",
    format: "Course pure",
    defaultStrategy: "negative",
    splits: [
      { segment: "0–20%",  intensityPct: "allure cible -1 à -2 sec/km", cue: "Installation rythme, pas de départ explosif" },
      { segment: "20–80%", intensityPct: "allure cible exacte",          cue: "Verrou métronomique, FC < 92% FCmax" },
      { segment: "80–100%", intensityPct: "allure cible +1 à +3%",       cue: "Finish kick — norme physiologique (Hanley 2020)" },
    ],
    scientificBasis: [
      { title: "Finish kick = norme, pas bonus", refs: ["Hanley 2020", "Casado 2021"], rationale: "78% des podiums mondiaux 10K affichent leurs 2 derniers km comme les plus rapides." },
    ],
    modelHypotheses: [
      "VLamax ≥ 0.45 mmol/L/s (réserve glycolytique disponible)",
      "TTE ≥ 30 min à allure cible",
      "Glycogène non limitant sur cette durée",
    ],
    bibliography: [
      { author: "Hanley B.", year: 2020, topic: "Pacing patterns of Olympic distance running medalists" },
      { author: "Casado A. et al.", year: 2021, topic: "Elite 10K pacing strategies" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "semi",
    label: "Semi-marathon",
    emoji: "🏃",
    format: "21.1 km",
    defaultStrategy: "even",
    splits: [
      { segment: "km 0–5",    intensityPct: "allure cible -2 à -3 sec/km", cue: "Verrouiller le rythme dès km 3" },
      { segment: "km 5–10",   intensityPct: "allure cible ±1%",            cue: "Stabilisation, FC stable" },
      { segment: "km 10–18",  intensityPct: "allure cible ±1%",            cue: "🔒 Verrou — zone de performance" },
      { segment: "km 18–21",  intensityPct: "allure cible ±0 à +2%",       cue: "Finish autorisé seulement si FC < 95% FCmax km 18" },
    ],
    scientificBasis: [
      { title: "Quasi-even split / reverse modeste", refs: ["Hanley 2020", "Casado 2021", "Diaz 2022"], rationale: "70-80% des podiums semi-marathon élites affichent Δ ≤ ±1% ou +1 à +2%, PAS un negative split agressif." },
      { title: "Finish kick conditionnel", refs: ["Diaz 2022"], rationale: "Le push final n'est rentable que si la FC reste sous 95% au km 18." },
    ],
    modelHypotheses: [
      "Allure cible = vitesse soutenable 75-90 min (≈ 92-94% MAS)",
      "Glycogène limitant après 75-80 min si fueling < 60 g/h",
      "VLamax 0.40-0.50 mmol/L/s optimal",
    ],
    bibliography: [
      { author: "Hanley B.", year: 2020, topic: "Pacing patterns of half-marathon medalists" },
      { author: "Casado A. et al.", year: 2021, topic: "Pacing in elite half-marathon" },
      { author: "Diaz J. et al.", year: 2022, topic: "Reverse split prevalence in elite half-marathons" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "marathon",
    label: "Marathon",
    emoji: "🏃",
    format: "42.2 km",
    defaultStrategy: "negative",
    splits: [
      { segment: "km 0–10",  intensityPct: "allure cible -2 à -3%",        cue: "Aucun push au PK — sanction métabolique" },
      { segment: "km 10–21", intensityPct: "allure cible -1 à -2%",        cue: "Économie maximale, FC stable" },
      { segment: "km 21–32", intensityPct: "allure cible exacte",          cue: "Stabilisation avant le mur" },
      { segment: "km 32–42", intensityPct: "allure cible -1 à +1%",        cue: "Negative split modéré si glycogène OK" },
    ],
    scientificBasis: [
      { title: "Negative split = standard élite", refs: ["Hanley 2020", "Casado 2021"], rationale: "80% des podiums marathon élites courent leur 2ème moitié 1-3% plus rapide." },
      { title: "Mur du 30e km", refs: ["Rapoport 2010"], rationale: "Déplétion glycogénique critique vers km 30 si fueling insuffisant ou départ trop rapide." },
    ],
    modelHypotheses: [
      "Allure cible = ≈ 80-88% MAS, soutenable 2h-4h",
      "Apport CHO 60-90 g/h obligatoire",
      "FatMax bien développé (Mader-Heck)",
    ],
    bibliography: [
      { author: "Hanley B.", year: 2020, topic: "Marathon pacing of world-class athletes" },
      { author: "Casado A. et al.", year: 2021, topic: "Negative splits and marathon performance" },
      { author: "Rapoport B.I.", year: 2010, topic: "Metabolic factors limiting marathon performance" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "703_bike",
    label: "70.3 — Vélo",
    emoji: "🚴",
    format: "90 km",
    defaultStrategy: "controlled_negative",
    splits: [
      { segment: "0–25%",   intensityPct: "FTP × 0.72-0.75",  cue: "Départ contrôlé -5% sous plafond enveloppe" },
      { segment: "25–75%",  intensityPct: "FTP × 0.75-0.78",  cue: "Centre enveloppe, IF cible ≈ 0.78" },
      { segment: "75–100%", intensityPct: "FTP × 0.74-0.77",  cue: "Préserver les jambes — derniers 20 km = premiers 10 km CAP" },
    ],
    scientificBasis: [
      { title: "IF cible 0.76-0.80", refs: ["Laursen 2011"], rationale: "Au-delà de IF 0.82 sur 70.3, le risque d'effondrement run augmente exponentiellement." },
    ],
    modelHypotheses: [
      "TTE bike > 90 min à FTP × 0.78",
      "VLamax bike < 0.45 mmol/L/s",
      "Apport CHO 80-100 g/h",
    ],
    bibliography: [
      { author: "Laursen P.B.", year: 2011, topic: "Long-distance triathlon pacing" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "703_run",
    label: "70.3 — CAP",
    emoji: "🏃",
    format: "21.1 km après vélo",
    defaultStrategy: "even",
    splits: [
      { segment: "km 0–5",   intensityPct: "allure cible -3 à -5%", cue: "Départ retenu, jambes cassées par le vélo" },
      { segment: "km 5–15",  intensityPct: "allure cible ±1%",      cue: "Stabilisation, fueling régulier" },
      { segment: "km 15–21", intensityPct: "allure cible ±0 à -2%", cue: "Push autorisé seulement si fraîcheur intacte" },
    ],
    scientificBasis: [
      { title: "Even split prioritaire", refs: ["Angehrn 2022"], rationale: "Sur 70.3, la fatigue du vélo interdit le negative split agressif. Even split = stratégie optimale." },
    ],
    modelHypotheses: [
      "Glycogène déjà entamé par le vélo (-30 à -40%)",
      "Allure cible ajustée -5 à -8% vs semi pur",
    ],
    bibliography: [
      { author: "Angehrn N. et al.", year: 2022, topic: "Pacing in long-distance triathlon" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "im_bike",
    label: "Ironman — Vélo",
    emoji: "🚴",
    format: "180 km",
    defaultStrategy: "controlled_negative",
    splits: [
      { segment: "0–30%",   intensityPct: "FTP × 0.65-0.70", cue: "Première heure NON NÉGOCIABLE — discipline absolue" },
      { segment: "30–70%",  intensityPct: "FTP × 0.68-0.72", cue: "IF cible ≈ 0.70, glucides 90-100 g/h" },
      { segment: "70–100%", intensityPct: "FTP × 0.66-0.70", cue: "Préserver jambes — chaque watt = 1 min sur marathon" },
    ],
    scientificBasis: [
      { title: "IF plafond 0.72", refs: ["Laursen 2011", "Skiba 2021"], rationale: "Au-dessus de IF 0.72 sur Ironman, probabilité d'effondrement run > 70%." },
    ],
    modelHypotheses: [
      "TTE bike > 5h à FTP × 0.70",
      "FatMax ≥ 0.6 g/min (Mader-Heck)",
      "Apport CHO 90-110 g/h, gut training validé",
    ],
    bibliography: [
      { author: "Laursen P.B.", year: 2011, topic: "Ironman bike pacing strategies" },
      { author: "Skiba P.", year: 2021, topic: "W' balance in ultra-endurance" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "im_run",
    label: "Ironman — Marathon",
    emoji: "🏃",
    format: "42.2 km après 180 km vélo",
    defaultStrategy: "even",
    splits: [
      { segment: "km 0–10",  intensityPct: "selon ambition (voir variantes)", cue: "Départ retenu — jamais à allure cible immédiate" },
      { segment: "km 10–32", intensityPct: "allure cible ±1%",                cue: "Verrou — zone qui décide la course" },
      { segment: "km 32–42", intensityPct: "selon ambition",                  cue: "Élite : push si OK. AG/Finisher : tenir, pas casser." },
    ],
    ambitionVariants: {
      elite: {
        strategy: "controlled_negative",
        firstPortion: "-3 à -5%",
        tolerance: "Δ ≤ ±2%",
        note: "Negative split contrôlé possible si VLamax < 0.45 et glycogène bien géré sur le vélo (Angehrn 2022, podiums Kona sub-8h45).",
      },
      competitor: {
        strategy: "even",
        firstPortion: "-4 à -6%",
        tolerance: "Δ ≤ ±2%",
        note: "Even split prioritaire. Negative split = bonus, pas cible.",
      },
      age_group: {
        strategy: "positive_tolerated",
        firstPortion: "-6 à -10%",
        tolerance: "+3 à +5%",
        note: "Léger positive split physiologique : 78% des AG sub-11h ralentissent de 3-8% (Angehrn 2022).",
      },
      finisher: {
        strategy: "positive_tolerated",
        firstPortion: "-10 à -15%",
        tolerance: "+5 à +10%",
        note: "Survie et nutrition. Marche planifiée à chaque ravito (30 sec). Finir en courant = victoire.",
      },
    },
    scientificBasis: [
      { title: "Stratégie calibrée par ambition", refs: ["Angehrn 2022", "Le Meur 2011", "Rüst 2013"], rationale: "Ironman = course glycogène-limitée. Le negative split agressif du marathon pur ne s'applique PAS hors élite." },
      { title: "Départ retenu obligatoire", refs: ["Le Meur 2011"], rationale: "Tout départ à allure cible immédiate = effondrement quasi-garanti après km 25 hors élite." },
    ],
    modelHypotheses: [
      "Glycogène entamé -50 à -60% par le vélo",
      "FatMax critique — détermine la tenue après km 30",
      "Allure cible ajustée -8 à -15% vs marathon pur",
      "FC ≈ 75-82% FCmax (drift attendu < 5% si pacing OK)",
    ],
    bibliography: [
      { author: "Angehrn N. et al.", year: 2022, topic: "Pacing strategies in Ironman triathlon by performance level" },
      { author: "Le Meur Y. et al.", year: 2011, topic: "Pacing strategy in Ironman triathlon" },
      { author: "Rüst C.A. et al.", year: 2013, topic: "Age-related pacing in Ironman" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

function StrategyBadge({ strategy }: { strategy: SplitStrategy }) {
  const meta = STRATEGY_META[strategy];
  return (
    <Badge variant="outline" className={`${meta.color} font-semibold`}>
      {meta.label}
    </Badge>
  );
}

function SplitTimeline({ splits }: { splits: SplitRow[] }) {
  return (
    <div className="space-y-2">
      {splits.map((s, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Badge variant="secondary" className="font-mono text-xs shrink-0">
            {s.segment}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{s.intensityPct}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.cue}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisciplineCard({
  discipline,
  ambition,
}: {
  discipline: DisciplineAudit;
  ambition: AmbitionLevel;
}) {
  const variant = discipline.ambitionVariants?.[ambition];
  const effectiveStrategy = variant?.strategy ?? discipline.defaultStrategy;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{discipline.emoji}</span>
              {discipline.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{discipline.format}</p>
          </div>
          <StrategyBadge strategy={effectiveStrategy} />
        </div>
        <p className="text-xs text-muted-foreground italic mt-2">
          {STRATEGY_META[effectiveStrategy].description}
        </p>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Variante ambition (si applicable) */}
        {variant && (
          <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 text-xs font-semibold mb-1">
              <span>{AMBITION_DEFINITIONS[ambition].icon}</span>
              <span>Calibration ambition : {AMBITION_DEFINITIONS[ambition].label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div>
                <div className="text-muted-foreground">Premiers 10 km</div>
                <div className="font-mono font-semibold">{variant.firstPortion}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tolérance globale</div>
                <div className="font-mono font-semibold">{variant.tolerance}</div>
              </div>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">{variant.note}</p>
          </div>
        )}

        {/* Splits */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Splits conseillés
          </h4>
          <SplitTimeline splits={discipline.splits} />
        </div>

        {/* Hypothèses scientifiques */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <FlaskConical className="h-3 w-3" /> Hypothèses physiologiques
          </h4>
          <ul className="space-y-1 text-xs">
            {discipline.modelHypotheses.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Base scientifique */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Base scientifique
          </h4>
          <div className="space-y-2">
            {discipline.scientificBasis.map((b, i) => (
              <div key={i} className="text-xs p-2 rounded border bg-muted/20">
                <div className="font-semibold">{b.title}</div>
                <div className="text-muted-foreground mt-0.5">{b.rationale}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {b.refs.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bibliographie */}
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Bibliographie ({discipline.bibliography.length})
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {discipline.bibliography.map((b, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="font-medium text-foreground">{b.author}</span> ({b.year}) — <em>{b.topic}</em>
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const FAMILIES = [
  { id: "running", label: "Running", ids: ["10k", "semi", "marathon"] },
  { id: "703",     label: "70.3",    ids: ["703_bike", "703_run"] },
  { id: "im",      label: "Ironman", ids: ["im_bike", "im_run"] },
];

export default function PacingAuditPage() {
  const [ambition, setAmbition] = useState<AmbitionLevel>("age_group");
  const [family, setFamily] = useState<string>("running");

  const visible = useMemo(() => {
    const ids = FAMILIES.find((f) => f.id === family)?.ids ?? [];
    return DISCIPLINES.filter((d) => ids.includes(d.id));
  }, [family]);

  return (
    <SidebarLayout activeTab="simulation" onTabChange={() => {}} staffMode={false} onStaffModeChange={() => {}}>
      <div className="container max-w-5xl mx-auto p-4 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Audit visuel — Stratégies de pacing</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble des splits conseillés et des hypothèses scientifiques utilisées par le moteur de pacing TFCL™
            pour chaque discipline et niveau d'ambition.
          </p>
        </header>

        {/* Changelog — du statique au personnalisé */}
        <PacingRulesChangelogCard />

        {/* Légende des stratégies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Légende des stratégies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(Object.keys(STRATEGY_META) as SplitStrategy[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <StrategyBadge strategy={s} />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {STRATEGY_META[s].description}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sélecteur ambition */}
        <Card>
          <CardContent className="pt-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">Niveau d'ambition :</span>
            <Select value={ambition} onValueChange={(v) => setAmbition(v as AmbitionLevel)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMBITION_LEVELS_ORDERED.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {AMBITION_DEFINITIONS[lvl].icon} {AMBITION_DEFINITIONS[lvl].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Module les stratégies sensibles à l'ambition (ex: marathon Ironman)
            </span>
          </CardContent>
        </Card>

        {/* Familles */}
        <Tabs value={family} onValueChange={setFamily}>
          <TabsList className="grid grid-cols-3 w-full">
            {FAMILIES.map((f) => (
              <TabsTrigger key={f.id} value={f.id}>{f.label}</TabsTrigger>
            ))}
          </TabsList>

          {FAMILIES.map((f) => (
            <TabsContent key={f.id} value={f.id} className="space-y-4 mt-4">
              {visible.map((d) => (
                <DisciplineCard key={d.id} discipline={d} ambition={ambition} />
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-xs text-muted-foreground italic text-center pt-4">
          Les règles affichées proviennent de <code>src/lib/v2/pacingDisciplineRules.ts</code> et reflètent
          la littérature 2010-2024 (Hanley, Casado, Diaz, Angehrn, Le Meur, Rüst, Laursen, Rapoport, Skiba).
        </p>
      </div>
    </SidebarLayout>
  );
}

/**
 * QuickStartWizard — Assistant guidé (12 étapes) pour coach/athlète débutant.
 *
 * Traduit un questionnaire "symptômes terrain" en CoachProfileFormPayload
 * (Lorang) + `extras` (chronos, blessure, terrain, sensations) que le parent
 * peut persister avant de lancer la génération.
 *
 * Modes de sortie :
 *  - "Vérifier avant génération" : pré-remplit CoachProfileForm via localStorage
 *  - "Générer directement" : appelle onGenerate(payload)
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wand2, Sparkles, Rocket, ClipboardCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CoachProfileFormPayload,
  MetabolicProfile,
  DurationMode,
} from "@/components/CoachProfileForm";
import type {
  LorangLimiter,
  LorangProhibition,
} from "@/lib/v2/lorangStrategyEngine";

// ─── Mapping symptôme → limiteur (aligné METRIC_TO_LIMITER_MAP) ─────────────
const LIMITER_META: Record<LorangLimiter, { metric: string; label: string }> = {
  motor:         { metric: "VO2max",        label: "Moteur (VO2max)" },
  glycolytic:    { metric: "VLamax",        label: "Explosivité (VLamax)" },
  durability:    { metric: "TTE",           label: "Tenue sur la durée (TTE)" },
  neuromuscular: { metric: "Économie",      label: "Force / Économie" },
  metabolic:     { metric: "FatMax",        label: "Carburant (FatMax)" },
  availability:  { metric: "Disponibilité", label: "Disponibilité / fatigue" },
};

interface SymptomOption {
  key: LorangLimiter;
  emoji: string;
  title: string;
  desc: string;
}

const SYMPTOMS: SymptomOption[] = [
  { key: "motor",         emoji: "🫁", title: "Il s'essouffle vite",              desc: "Sur les côtes, les accélérations, les efforts intenses." },
  { key: "durability",    emoji: "📉", title: "Il décroche à mi-course",           desc: "Bon départ, allure qui chute progressivement." },
  { key: "glycolytic",    emoji: "💥", title: "Il « meurt » en fin de course",    desc: "Explose ses réserves, s'éteint sur la distance." },
  { key: "metabolic",     emoji: "🍞", title: "Il tape dans le mur (fringale)",   desc: "Coup de barre sur les sorties longues (marathon/IM)." },
  { key: "neuromuscular", emoji: "🦵", title: "Il « rame » — foulée peu efficace",desc: "Se fatigue vite pour une allure pourtant modérée." },
  { key: "availability",  emoji: "😴", title: "Fatigué / stressé / peu de temps", desc: "Priorité : préserver plutôt que charger." },
];

const METABOLIC_QUESTIONS: Array<{ label: string; value: MetabolicProfile; desc: string; emoji: string }> = [
  { emoji: "⚡", value: "sprinter", label: "Explosif / nerveux",  desc: "À l'aise sur le court, s'épuise sur la distance." },
  { emoji: "⚖️", value: "balanced", label: "Polyvalent",           desc: "Ni sprinteur ni diesel. Cas le plus courant." },
  { emoji: "🚂", value: "diesel",   label: "Régulier / endurant",  desc: "Tient longtemps mais peu de punch." },
];

const OBJECTIVES = [
  { value: "StartToRun", label: "Start to Run (débutant · marche-course)" },
  { value: "5K",       label: "5 km" },
  { value: "10K",      label: "10 km" },
  { value: "Semi",     label: "Semi-marathon" },
  { value: "Marathon", label: "Marathon" },
  { value: "Trail",    label: "Trail / Ultra" },
  { value: "70.3",     label: "Triathlon 70.3" },
  { value: "IM",       label: "Ironman" },
];

const SESSIONS_PER_WEEK = [3, 4, 5, 6, 7];

// ─── Nouveaux axes (1 → 5) ──────────────────────────────────────────────────
export type InjuryStatus = "none" | "old" | "recent" | "chronic";
export type Terrain = "road" | "trail" | "track" | "urban_mix";
export type HillFeeling = "easy" | "moderate" | "hard";
export type RecoverySpeed = "fast" | "moderate" | "slow";

const INJURY_OPTIONS: Array<{ value: InjuryStatus; emoji: string; title: string; desc: string }> = [
  { value: "none",    emoji: "✅", title: "Aucune",              desc: "Aucun antécédent bloquant récent." },
  { value: "old",     emoji: "🩹", title: "Ancienne (guérie)",   desc: "Antécédent > 6 mois, sans gêne actuelle." },
  { value: "recent",  emoji: "⚠️", title: "Récente (< 3 mois)",  desc: "Prudence : on limite les stimuli à risque." },
  { value: "chronic", emoji: "🔁", title: "Chronique / récurrente", desc: "Réapparaît régulièrement (tendon, dos, genou…)." },
];

const TERRAIN_OPTIONS: Array<{ value: Terrain; emoji: string; title: string; desc: string }> = [
  { value: "road",      emoji: "🛣️", title: "Route / plat",       desc: "Bitume dominant, terrain régulier." },
  { value: "trail",     emoji: "⛰️", title: "Trail / montagne",   desc: "Sentiers, dénivelé, terrain technique." },
  { value: "track",     emoji: "🏟️", title: "Piste / structurée", desc: "Accès régulier à une piste ou stade." },
  { value: "urban_mix", emoji: "🏙️", title: "Urbain mixte",       desc: "Parcs, tapis, boucles vallonnées limitées." },
];

const HILL_OPTIONS: Array<{ value: HillFeeling; emoji: string; title: string; desc: string }> = [
  { value: "easy",     emoji: "🟢", title: "À l'aise dans les côtes", desc: "Grimpe sans surcoût perceptible." },
  { value: "moderate", emoji: "🟡", title: "Correct mais coûteux",     desc: "Passe mais paie l'effort ensuite." },
  { value: "hard",     emoji: "🔴", title: "Vraiment difficile",       desc: "S'essouffle et décroche en côte." },
];

const RECOVERY_OPTIONS: Array<{ value: RecoverySpeed; emoji: string; title: string; desc: string }> = [
  { value: "fast",     emoji: "🟢", title: "Rapide",   desc: "Enchaîne facilement, prêt le lendemain." },
  { value: "moderate", emoji: "🟡", title: "Moyenne",  desc: "Récupère mais à jauger séance après séance." },
  { value: "slow",     emoji: "🔴", title: "Lente",    desc: "Fatigue résiduelle marquée, besoin de jours faciles." },
];

// ─── Chronos (axe 3) ────────────────────────────────────────────────────────
export type ChronoDistanceKey = "5k" | "10k" | "half" | "marathon";
const CHRONO_LIST: Array<{ value: ChronoDistanceKey; label: string; km: number; snapField: string }> = [
  { value: "5k",       label: "5 km",             km: 5,        snapField: "time_5k_sec" },
  { value: "10k",      label: "10 km",            km: 10,       snapField: "time_10k_sec" },
  { value: "half",     label: "Semi (21,1 km)",   km: 21.0975,  snapField: "time_half_sec" },
  { value: "marathon", label: "Marathon (42,2)",  km: 42.195,   snapField: "time_marathon_sec" },
];

// ─── Branche Start to Run (débutant) ────────────────────────────────────────
// Pour un vrai débutant, les questions "limiteurs" n'ont pas de référentiel :
// l'athlète n'a jamais couru assez longtemps pour y répondre. La prescription
// dépend de la tolérance mécanique et du point de départ, pas du profil métabolique.
export type S2RExperience = "none" | "walk_only" | "under10" | "10to20" | "20plus";
export type S2RActivity = "sedentary" | "light" | "active";
export type S2RJoint = "none" | "occasional" | "frequent";
/** Dose de renforcement musculaire souhaitée sur un plan Start to Run. */
export type S2RStrength = "full" | "light" | "none";

const S2R_EXPERIENCE_OPTIONS: Array<{ value: S2RExperience; emoji: string; title: string; desc: string; startMin: number }> = [
  { value: "none",      emoji: "🌱", title: "Jamais couru",              desc: "Aucune pratique de course à pied.",                 startMin: 1 },
  { value: "walk_only", emoji: "🚶", title: "Je marche uniquement",      desc: "Marche régulière, pas de course.",                  startMin: 1 },
  { value: "under10",   emoji: "🏃", title: "Moins de 10 min en continu", desc: "Quelques minutes de course avant de devoir marcher.", startMin: 5 },
  { value: "10to20",    emoji: "🏃‍♂️", title: "10 à 20 min en continu",   desc: "Je tiens un petit footing sans m'arrêter.",         startMin: 12 },
  { value: "20plus",    emoji: "✅", title: "Plus de 20 min en continu",  desc: "Base déjà installée — progression accélérée.",      startMin: 20 },
];

const S2R_ACTIVITY_OPTIONS: Array<{ value: S2RActivity; emoji: string; title: string; desc: string }> = [
  { value: "sedentary", emoji: "🪑", title: "Peu ou pas d'activité", desc: "Moins d'1h de sport par semaine." },
  { value: "light",     emoji: "🚲", title: "Activité légère",        desc: "1 à 3h par semaine (marche, vélo, salle…)." },
  { value: "active",    emoji: "💪", title: "Déjà actif",             desc: "Plus de 3h par semaine d'un autre sport." },
];

const S2R_STRENGTH_OPTIONS: Array<{ value: S2RStrength; emoji: string; title: string; desc: string }> = [
  { value: "full",  emoji: "💪", title: "Oui — 2 séances/semaine", desc: "Recommandé : le limiteur du débutant est musculo-squelettique." },
  { value: "light", emoji: "🟡", title: "Version allégée — 1/semaine", desc: "Agenda serré : on garde l'essentiel (mollets, fessiers, gainage)." },
  { value: "none",  emoji: "🚫", title: "Non — course uniquement",  desc: "Aucune séance de renfo dans le plan (risque de blessure plus élevé)." },
];

const S2R_JOINT_OPTIONS: Array<{ value: S2RJoint; emoji: string; title: string; desc: string }> = [
  { value: "none",       emoji: "✅", title: "Aucune gêne",            desc: "Genoux, tendons, dos : rien à signaler." },
  { value: "occasional", emoji: "🟡", title: "Gêne occasionnelle",     desc: "Quelques douleurs après un effort inhabituel." },
  { value: "frequent",   emoji: "🔴", title: "Gêne fréquente",         desc: "Douleurs récurrentes — progression très prudente." },
];

export interface QuickStartS2RExtras {
  experience: S2RExperience;
  activity: S2RActivity;
  joint: S2RJoint;
  /** Dose de renforcement retenue par le coach/l'athlète. */
  strength: S2RStrength;
  /** Minutes de course continue estimées au départ — sert de palier initial marche-course. */
  startRunMinutes: number;
}

export interface QuickStartExtras {
  injury: InjuryStatus;
  /** Terrain principal (premier sélectionné) — conservé pour compat. */
  terrain: Terrain;
  /** Tous les terrains accessibles (multi-sélection). */
  terrains: Terrain[];
  hillFeeling: HillFeeling | null;
  recoverySpeed: RecoverySpeed | null;
  /** Chronos saisis (secondes). Une seule distance suffit — les autres sont extrapolées par le moteur (Riegel). */
  chronos: Partial<Record<ChronoDistanceKey, { sec: number; date: string }>>;
  /** Renseigné uniquement sur la branche Start to Run. */
  s2r?: QuickStartS2RExtras;
}


export interface QuickStartResult {
  payload: CoachProfileFormPayload;
  objective: string;
  action: "generate" | "review";
  extras: QuickStartExtras;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName?: string;
  defaultObjective?: string;
  onGenerate: (result: QuickStartResult) => void;
  onReview: (result: QuickStartResult) => void;
}

type Step =
  | "audience"
  | "objective"
  | "duration"
  | "injury"
  | "terrain"
  | "metabolic"
  | "primary"
  | "secondary"
  | "chronos"
  | "sensations"
  | "s2r_experience"
  | "s2r_activity"
  | "s2r_joint"
  | "s2r_strength"
  | "sessions"
  | "recap";

const STEPS: Step[] = [
  "audience", "objective", "duration",
  "injury", "terrain",
  "metabolic", "primary", "secondary",
  "chronos", "sensations",
  "sessions", "recap",
];

/** Parcours débutant : pas de limiteurs, on mesure le point de départ réel. */
const STEPS_S2R: Step[] = [
  "audience", "objective", "duration",
  "s2r_experience", "s2r_activity", "s2r_joint", "s2r_strength",
  "sessions", "recap",
];


export function QuickStartWizard({
  open,
  onOpenChange,
  athleteName,
  defaultObjective,
  onGenerate,
  onReview,
}: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [audience, setAudience] = useState<"coach" | "athlete" | null>(null);
  const [objective, setObjective] = useState<string>(defaultObjective || "");
  const [durationMode, setDurationMode] = useState<DurationMode>("free");
  const [freeWeeks, setFreeWeeks] = useState<string>("12");
  const [raceDate, setRaceDate] = useState<string>("");
  const [metabolic, setMetabolic] = useState<MetabolicProfile | null>(null);
  const [primary, setPrimary] = useState<LorangLimiter | null>(null);
  const [secondary, setSecondary] = useState<LorangLimiter | "skip" | null>(null);
  const [sessions, setSessions] = useState<number | "skip" | null>(null);

  // Nouveaux axes
  const [injury, setInjury] = useState<InjuryStatus | null>(null);
  const [terrains, setTerrains] = useState<Terrain[]>([]);
  const [hillFeeling, setHillFeeling] = useState<HillFeeling | null>(null);
  const [recoverySpeed, setRecoverySpeed] = useState<RecoverySpeed | null>(null);

  // Branche Start to Run
  const [s2rExperience, setS2rExperience] = useState<S2RExperience | null>(null);
  const [s2rActivity, setS2rActivity] = useState<S2RActivity | null>(null);
  const [s2rJoint, setS2rJoint] = useState<S2RJoint | null>(null);
  const [s2rStrength, setS2rStrength] = useState<S2RStrength | null>(null);

  // Chronos — saisie libre par distance
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [chronoDist, setChronoDist] = useState<ChronoDistanceKey>("10k");
  const [chH, setChH] = useState("");
  const [chM, setChM] = useState("");
  const [chS, setChS] = useState("");
  const [chDate, setChDate] = useState(today);
  const [chronos, setChronos] = useState<QuickStartExtras["chronos"]>({});

  const isS2R = objective === "StartToRun";
  const activeSteps = isS2R ? STEPS_S2R : STEPS;
  const step = activeSteps[Math.min(stepIdx, activeSteps.length - 1)];
  const isFirst = stepIdx === 0;
  const isLast = step === "recap";


  const subject = audience === "athlete" ? "toi" : "l'athlète";
  const subjectCapital = audience === "athlete" ? "Toi" : "L'athlète";
  const possessive = audience === "athlete" ? "ton" : "son";

  const computedWeeks = useMemo<number | null>(() => {
    if (durationMode === "date") {
      if (!raceDate) return null;
      try {
        const race = new Date(raceDate + "T00:00:00");
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        const days = Math.floor((race.getTime() - t.getTime()) / 86400000);
        if (days < 0) return null;
        return Math.max(1, Math.floor(days / 7) + 1);
      } catch { return null; }
    }
    const n = parseInt(freeWeeks, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [durationMode, freeWeeks, raceDate]);

  const canNext = (): boolean => {
    switch (step) {
      case "audience":   return audience !== null;
      case "objective":  return !!objective;
      case "duration":   return computedWeeks !== null && computedWeeks > 0;
      case "injury":     return injury !== null;
      case "terrain":    return terrains.length > 0;
      case "metabolic":  return metabolic !== null;
      case "primary":    return primary !== null;
      case "secondary":  return secondary !== null;
      case "chronos":    return true; // toujours skippable
      case "sensations": return hillFeeling !== null && recoverySpeed !== null;
      case "s2r_experience": return s2rExperience !== null;
      case "s2r_activity":   return s2rActivity !== null;
      case "s2r_joint":      return s2rJoint !== null;
      case "s2r_strength":   return s2rStrength !== null;
      case "sessions":   return sessions !== null;
      case "recap":      return true;
    }
  };


  const next = () => { if (!isLast && canNext()) setStepIdx((i) => i + 1); };
  const prev = () => { if (!isFirst) setStepIdx((i) => i - 1); };

  const addCurrentChrono = () => {
    const parsed = (Number(chH || 0) * 3600) + (Number(chM || 0) * 60) + Number(chS || 0);
    if (!parsed || parsed < 60) return;
    setChronos((prev) => ({ ...prev, [chronoDist]: { sec: parsed, date: chDate || today } }));
    setChH(""); setChM(""); setChS("");
  };
  const removeChrono = (k: ChronoDistanceKey) => {
    setChronos((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const s2rStartMinutes =
    S2R_EXPERIENCE_OPTIONS.find((o) => o.value === s2rExperience)?.startMin ?? 1;

  /**
   * Branche débutant : le limiteur n'est pas métabolique mais mécanique.
   * - gêne articulaire → tolérance tissulaire (neuromusculaire / économie)
   * - sinon → capacité à tenir dans la durée (durabilité)
   * Le secondaire reflète la disponibilité si l'athlète est sédentaire.
   */
  const buildS2RPayload = (): CoachProfileFormPayload | null => {
    if (!computedWeeks || !s2rExperience || !s2rActivity || !s2rJoint || !s2rStrength) return null;
    const primaryLimiter: LorangLimiter = s2rJoint === "none" ? "durability" : "neuromuscular";
    const secondaryLimiter: LorangLimiter | null =
      s2rActivity === "sedentary" ? "availability" : null;

    return {
      metabolicProfile: "balanced",
      primaryLimiter,
      primaryLimiterMetric: LIMITER_META[primaryLimiter].metric,
      secondaryLimiter,
      secondaryLimiterMetric: secondaryLimiter ? LIMITER_META[secondaryLimiter].metric : null,
      // Débutant : jamais de sprints ni de micro-intervalles, allure régulière.
      prohibitions: ["sprints", "micro_intervals", "erratic_pacing"],
      s2rStrength,
      sessionsPerWeek: typeof sessions === "number" ? sessions : null,
      durationMode,
      raceDate: durationMode === "date" && raceDate ? raceDate : null,
      weeksAvailable: computedWeeks,
      overriddenByCoach: { primary: true, secondary: !!secondaryLimiter },
    };
  };

  const buildPayload = (): CoachProfileFormPayload | null => {
    if (isS2R) return buildS2RPayload();
    if (!metabolic || !primary || !computedWeeks) return null;
    const primaryMeta = LIMITER_META[primary];


    // Auto-inférence du secondaire depuis sensations si non renseigné.
    let secondaryLimiter: LorangLimiter | null =
      secondary && secondary !== "skip" ? secondary : null;
    if (!secondaryLimiter) {
      if (hillFeeling === "hard" && primary !== "motor") secondaryLimiter = "motor";
      else if (recoverySpeed === "slow" && primary !== "availability") secondaryLimiter = "availability";
    }
    const secondaryMeta = secondaryLimiter ? LIMITER_META[secondaryLimiter] : null;

    // Prohibitions cumulatives (metabolic + injury).
    const prohibitionSet = new Set<LorangProhibition>();
    if (metabolic === "sprinter") {
      prohibitionSet.add("sprints");
      prohibitionSet.add("micro_intervals");
    }
    if (injury === "recent") {
      prohibitionSet.add("sprints");
      prohibitionSet.add("micro_intervals");
      prohibitionSet.add("erratic_pacing");
    } else if (injury === "chronic") {
      prohibitionSet.add("sprints");
      prohibitionSet.add("micro_intervals");
    }

    const spw = typeof sessions === "number" ? sessions : null;

    return {
      metabolicProfile: metabolic,
      primaryLimiter: primary,
      primaryLimiterMetric: primaryMeta.metric,
      secondaryLimiter,
      secondaryLimiterMetric: secondaryMeta?.metric ?? null,
      prohibitions: [...prohibitionSet],
      sessionsPerWeek: spw,
      durationMode,
      raceDate: durationMode === "date" && raceDate ? raceDate : null,
      weeksAvailable: computedWeeks,
      overriddenByCoach: { primary: true, secondary: !!secondaryLimiter },
    };
  };

  const handleFinish = (action: "generate" | "review") => {
    const payload = buildPayload();
    if (!payload || !objective) return;
    const inferredInjury: InjuryStatus = isS2R
      ? (s2rJoint === "frequent" ? "chronic" : s2rJoint === "occasional" ? "old" : "none")
      : (injury ?? "none");
    const extras: QuickStartExtras = {
      injury: inferredInjury,
      terrain: terrains[0] ?? "road",
      terrains: terrains.length > 0 ? terrains : ["road"],
      hillFeeling,
      recoverySpeed,
      chronos,
      ...(isS2R && s2rExperience && s2rActivity && s2rJoint && s2rStrength
        ? {
            s2r: {
              experience: s2rExperience,
              activity: s2rActivity,
              joint: s2rJoint,
              strength: s2rStrength ?? "full",
              startRunMinutes: s2rStartMinutes,
            },
          }
        : {}),
    };
    const result: QuickStartResult = { payload, objective, action, extras };
    if (action === "generate") onGenerate(result);
    else onReview(result);
    onOpenChange(false);
  };

  const stepNumber = stepIdx + 1;
  const totalSteps = activeSteps.length;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Démarrage guidé
            {athleteName ? <Badge variant="outline" className="ml-2">{athleteName}</Badge> : null}
          </DialogTitle>
          <DialogDescription>
            {stepNumber} / {totalSteps} — {isS2R
              ? "Parcours débutant : on part de ton point de départ réel, pas de jargon."
              : "Quelques questions simples pour générer un plan cohérent."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {activeSteps.map((_, i) => (

            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= stepIdx ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="min-h-[280px] py-2">
          {step === "audience" && (
            <StepBlock title="Qui remplit ce questionnaire ?" hint="Ça nous aide juste à ajuster le vocabulaire.">
              <CardChoice selected={audience === "coach"}   onClick={() => setAudience("coach")}   emoji="🧑‍🏫" title="Je suis coach"    desc="Je réponds pour l'athlète que j'accompagne." />
              <CardChoice selected={audience === "athlete"} onClick={() => setAudience("athlete")} emoji="🏃"   title="Je suis l'athlète" desc="Je réponds pour moi-même." />
            </StepBlock>
          )}

          {step === "objective" && (
            <StepBlock title="Quel est l'objectif ?" hint="Choisis la course visée (ou la distance préparée).">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setObjective(o.value)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-all",
                      objective === o.value
                        ? "border-primary bg-primary/15 ring-2 ring-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </StepBlock>
          )}

          {step === "duration" && (
            <StepBlock title="Sur combien de temps ?" hint="Date de course connue, ou durée libre.">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <ModeCard active={durationMode === "free"} onClick={() => setDurationMode("free")} title="Durée libre"   desc="Progression sur N semaines." />
                <ModeCard active={durationMode === "date"} onClick={() => setDurationMode("date")} title="Objectif daté" desc="Compte à rebours course." />
              </div>
              {durationMode === "free" ? (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[6, 8, 12, 16].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFreeWeeks(String(n))}
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-xs font-medium transition-all",
                          parseInt(freeWeeks, 10) === n
                            ? "border-primary bg-primary/20 ring-2 ring-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {n} sem
                      </button>
                    ))}
                  </div>
                  <Input type="number" min={2} max={52} placeholder="Nombre de semaines (2-52)" value={freeWeeks} onChange={(e) => setFreeWeeks(e.target.value)} className="max-w-[220px]" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} className="max-w-[220px]" />
                  {computedWeeks !== null && (
                    <div className="text-xs text-muted-foreground">
                      Soit environ <span className="font-medium">{computedWeeks} semaines</span> de préparation.
                    </div>
                  )}
                </div>
              )}
            </StepBlock>
          )}

          {step === "injury" && (
            <StepBlock
              title={`Blessures ou gênes actuelles ?`}
              hint="Détermine les stimuli à éviter (sprints, micro-intervalles…)."
            >
              {INJURY_OPTIONS.map((o) => (
                <CardChoice key={o.value} selected={injury === o.value} onClick={() => setInjury(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
              ))}
            </StepBlock>
          )}

          {step === "terrain" && (
            <StepBlock
              title="Lieux d'entraînement accessibles ?"
              hint="Sélection multiple — coche tout ce à quoi tu as accès régulièrement (plat, piste, trail, urbain…)."
            >
              {TERRAIN_OPTIONS.map((o) => {
                const selected = terrains.includes(o.value);
                return (
                  <CardChoice
                    key={o.value}
                    selected={selected}
                    onClick={() =>
                      setTerrains((prev) =>
                        prev.includes(o.value)
                          ? prev.filter((t) => t !== o.value)
                          : [...prev, o.value],
                      )
                    }
                    emoji={o.emoji}
                    title={o.title}
                    desc={o.desc}
                  />
                );
              })}
            </StepBlock>
          )}

          {step === "metabolic" && (
            <StepBlock title={`${subjectCapital} — plutôt explosif ou endurant ?`} hint="Choisis le profil qui décrit le mieux le comportement à l'entraînement.">
              {METABOLIC_QUESTIONS.map((m) => (
                <CardChoice key={m.value} selected={metabolic === m.value} onClick={() => setMetabolic(m.value)} emoji={m.emoji} title={m.label} desc={m.desc} />
              ))}
            </StepBlock>
          )}

          {step === "primary" && (
            <StepBlock title={audience === "athlete" ? "Qu'est-ce qui te limite le plus en course ?" : "Qu'est-ce qui limite le plus l'athlète en course ?"} hint="Choisis LE symptôme dominant. C'est ce que l'IA ciblera en priorité.">
              {SYMPTOMS.map((s) => (
                <CardChoice key={s.key} selected={primary === s.key} onClick={() => setPrimary(s.key)} emoji={s.emoji} title={s.title} desc={s.desc} />
              ))}
            </StepBlock>
          )}

          {step === "secondary" && (
            <StepBlock title="Un deuxième point faible ?" hint="Optionnel — si tu hésites, passe cette étape (on l'inférera au besoin depuis les sensations).">
              {SYMPTOMS.filter((s) => s.key !== primary).map((s) => (
                <CardChoice key={s.key} selected={secondary === s.key} onClick={() => setSecondary(s.key)} emoji={s.emoji} title={s.title} desc={s.desc} />
              ))}
              <CardChoice selected={secondary === "skip"} onClick={() => setSecondary("skip")} emoji="🤷" title="Je ne sais pas / je passe" desc="Aucun limiteur secondaire imposé." />
            </StepBlock>
          )}

          {step === "chronos" && (
            <StepBlock
              title="Chronos récents (optionnel)"
              hint="Une seule distance suffit — les autres seront extrapolées (Riegel). Sans chrono, le plan reste subjectif (~65% fiabilité) et un test de calibration sera injecté."
            >
              <div className="space-y-2">
                <Label className="text-xs">Distance</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CHRONO_LIST.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setChronoDist(c.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-md border text-xs font-medium transition-all",
                        chronoDist === c.value
                          ? "border-primary bg-primary/20 ring-2 ring-primary"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">h</Label>
                    <Input inputMode="numeric" value={chH} onChange={(e) => setChH(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">min</Label>
                    <Input inputMode="numeric" value={chM} onChange={(e) => setChM(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="45" />
                  </div>
                  <div>
                    <Label className="text-xs">sec</Label>
                    <Input inputMode="numeric" value={chS} onChange={(e) => setChS(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="30" />
                  </div>
                  <Button type="button" size="sm" onClick={addCurrentChrono}>Ajouter</Button>
                </div>
                <div>
                  <Label className="text-xs">Date du chrono</Label>
                  <Input type="date" value={chDate} onChange={(e) => setChDate(e.target.value)} className="max-w-[220px]" />
                </div>

                {Object.keys(chronos).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground">Chronos saisis :</div>
                    {CHRONO_LIST.filter((c) => chronos[c.value]).map((c) => {
                      const v = chronos[c.value]!;
                      const h = Math.floor(v.sec / 3600);
                      const m = Math.floor((v.sec % 3600) / 60);
                      const s = v.sec % 60;
                      const display = h > 0
                        ? `${h}h${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                        : `${m}:${String(s).padStart(2, "0")}`;
                      return (
                        <div key={c.value} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
                          <span><span className="font-medium">{c.label}</span> · {display} <span className="text-muted-foreground">({v.date})</span></span>
                          <button type="button" onClick={() => removeChrono(c.value)} className="text-muted-foreground hover:text-destructive">Retirer</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {Object.keys(chronos).length === 0 && (
                  <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                    Aucun chrono saisi — le plan sera basé sur tes réponses subjectives. Un test de calibration (CAP-test)
                    sera automatiquement injecté en semaine 2-3 pour ancrer les allures.
                  </div>
                )}
              </div>
            </StepBlock>
          )}

          {step === "sensations" && (
            <StepBlock
              title="Deux sensations clés"
              hint="Elles affinent le limiteur secondaire quand tu ne l'as pas défini."
            >
              <div>
                <Label className="text-xs font-semibold">Comportement en côte</Label>
                <div className="space-y-1.5 mt-1">
                  {HILL_OPTIONS.map((o) => (
                    <CardChoice key={o.value} selected={hillFeeling === o.value} onClick={() => setHillFeeling(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs font-semibold">Vitesse de récupération</Label>
                <div className="space-y-1.5 mt-1">
                  {RECOVERY_OPTIONS.map((o) => (
                    <CardChoice key={o.value} selected={recoverySpeed === o.value} onClick={() => setRecoverySpeed(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
                  ))}
                </div>
              </div>
            </StepBlock>
          )}

          {step === "s2r_experience" && (
            <StepBlock
              title={audience === "athlete" ? "Aujourd'hui, combien de temps peux-tu courir sans t'arrêter ?" : "Combien de temps l'athlète peut-il courir sans s'arrêter ?"}
              hint="C'est LA donnée qui fixe le palier de départ marche-course. Aucune estimation, réponds au plus juste."
            >
              {S2R_EXPERIENCE_OPTIONS.map((o) => (
                <CardChoice key={o.value} selected={s2rExperience === o.value} onClick={() => setS2rExperience(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
              ))}
            </StepBlock>
          )}

          {step === "s2r_activity" && (
            <StepBlock
              title="Quelle est l'activité physique actuelle ?"
              hint="Détermine la vitesse de progression du volume hebdomadaire."
            >
              {S2R_ACTIVITY_OPTIONS.map((o) => (
                <CardChoice key={o.value} selected={s2rActivity === o.value} onClick={() => setS2rActivity(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
              ))}
            </StepBlock>
          )}

          {step === "s2r_joint" && (
            <StepBlock
              title="Des gênes articulaires ou tendineuses ?"
              hint="Chez le débutant, le facteur limitant est mécanique avant d'être métabolique."
            >
              {S2R_JOINT_OPTIONS.map((o) => (
                <CardChoice key={o.value} selected={s2rJoint === o.value} onClick={() => setS2rJoint(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
              ))}
            </StepBlock>
          )}

          {step === "s2r_strength" && (
            <StepBlock
              title="Faut-il du renforcement musculaire dans le plan ?"
              hint="Chez un débutant, le renfo (mollets, fessiers, gainage) réduit fortement le risque de blessure. À n'écarter que si c'est impossible à tenir."
            >
              {S2R_STRENGTH_OPTIONS.map((o) => (
                <CardChoice key={o.value} selected={s2rStrength === o.value} onClick={() => setS2rStrength(o.value)} emoji={o.emoji} title={o.title} desc={o.desc} />
              ))}
            </StepBlock>
          )}

          {step === "sessions" && (

            <StepBlock title={`Combien de séances par semaine ${possessive} agenda permet-il ?`} hint="Compte toutes disciplines confondues. Si tu ne sais pas, laisse l'IA décider.">
              <div className="flex flex-wrap gap-2">
                {SESSIONS_PER_WEEK.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSessions(n)}
                    className={cn(
                      "px-4 py-2 rounded-md border text-sm font-medium transition-all",
                      sessions === n
                        ? "border-primary bg-primary/20 ring-2 ring-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {n} séances
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSessions("skip")}
                  className={cn(
                    "px-4 py-2 rounded-md border text-sm font-medium transition-all",
                    sessions === "skip"
                      ? "border-primary bg-primary/20 ring-2 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  Laisser l'IA décider
                </button>
              </div>
            </StepBlock>
          )}

          {step === "recap" && (() => {
            const draftPayload = buildPayload();
            const inferredSecondary = draftPayload?.secondaryLimiter ?? null;
            return (
              <StepBlock title="Récapitulatif" hint="Vérifie avant de continuer.">
                <RecapRow label="Objectif" value={OBJECTIVES.find((o) => o.value === objective)?.label ?? objective} />
                <RecapRow label="Durée" value={durationMode === "date" ? `Course le ${raceDate} (~${computedWeeks} sem)` : `${computedWeeks} semaines`} />
                {isS2R ? (
                  <>
                    <RecapRow label="Expérience course" value={S2R_EXPERIENCE_OPTIONS.find((o) => o.value === s2rExperience)?.title ?? "—"} />
                    <RecapRow label="Activité actuelle" value={S2R_ACTIVITY_OPTIONS.find((o) => o.value === s2rActivity)?.title ?? "—"} />
                    <RecapRow label="Gêne articulaire" value={S2R_JOINT_OPTIONS.find((o) => o.value === s2rJoint)?.title ?? "—"} />
                    <RecapRow label="Renforcement" value={S2R_STRENGTH_OPTIONS.find((o) => o.value === s2rStrength)?.title ?? "—"} />
                    <RecapRow label="Palier de départ" value={`${s2rStartMinutes} min de course en continu`} />
                    <RecapRow label="Terrain" value={terrains.length > 0 ? terrains.map((t) => TERRAIN_OPTIONS.find((o) => o.value === t)?.title).filter(Boolean).join(", ") : "—"} />
                    <RecapRow label="Focus du plan" value={draftPayload ? LIMITER_META[draftPayload.primaryLimiter].label : "—"} />
                  </>
                ) : (
                  <>
                    <RecapRow label="Blessure" value={INJURY_OPTIONS.find((o) => o.value === injury)?.title ?? "—"} />
                    <RecapRow label="Terrain" value={terrains.length > 0 ? terrains.map((t) => TERRAIN_OPTIONS.find((o) => o.value === t)?.title).filter(Boolean).join(", ") : "—"} />
                    <RecapRow label="Profil énergie" value={METABOLIC_QUESTIONS.find((m) => m.value === metabolic)?.label ?? "—"} />
                    <RecapRow label="Limiteur principal" value={primary ? LIMITER_META[primary].label : "—"} />
                    <RecapRow
                      label="Limiteur secondaire"
                      value={
                        inferredSecondary
                          ? <>
                              {LIMITER_META[inferredSecondary].label}
                              {(!secondary || secondary === "skip") && (
                                <span className="ml-1 text-[10px] text-muted-foreground italic">(inféré)</span>
                              )}
                            </>
                          : <span className="text-muted-foreground italic">non défini</span>
                      }
                    />
                    <RecapRow label="Sensations côte" value={HILL_OPTIONS.find((o) => o.value === hillFeeling)?.title ?? "—"} />
                    <RecapRow label="Récupération" value={RECOVERY_OPTIONS.find((o) => o.value === recoverySpeed)?.title ?? "—"} />
                    <RecapRow
                      label="Chronos"
                      value={
                        Object.keys(chronos).length === 0
                          ? <span className="text-muted-foreground italic">aucun (fiabilité ~65%)</span>
                          : CHRONO_LIST.filter((c) => chronos[c.value]).map((c) => c.label).join(", ")
                      }
                    />
                  </>
                )}

                <RecapRow label="Séances/semaine" value={typeof sessions === "number" ? `${sessions}` : <span className="text-muted-foreground italic">IA décide</span>} />
                {(draftPayload?.prohibitions.length ?? 0) > 0 && (
                  <RecapRow label="Interdits" value={<span className="text-xs">{draftPayload!.prohibitions.join(", ")}</span>} />
                )}
                <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    Ces réponses sont traduites en limiteurs Lorang + prohibitions. Les chronos saisis sont enregistrés
                    dans le snapshot actif de l'athlète avant génération.
                  </div>
                </div>
              </StepBlock>
            );
          })()}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={prev} disabled={isFirst} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Retour
          </Button>

          {!isLast ? (
            <Button onClick={next} disabled={!canNext()} className="gap-1">
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => handleFinish("review")} className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Vérifier avant génération
              </Button>
              <Button onClick={() => handleFinish("generate")} className="gap-2">
                <Rocket className="h-4 w-4" />
                Générer directement
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StepBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-semibold">{title}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CardChoice({
  selected, onClick, emoji, title, desc,
}: { selected: boolean; onClick: () => void; emoji: string; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border p-3 transition-all flex gap-3 items-start",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary"
          : "border-border hover:border-primary/40",
      )}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </button>
  );
}

function ModeCard({
  active, onClick, title, desc,
}: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-2 text-xs sm:text-sm text-left transition-all",
        active
          ? "border-primary bg-primary/20 ring-2 ring-primary"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </button>
  );
}

function RecapRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

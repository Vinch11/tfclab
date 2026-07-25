/**
 * QuickStartWizard — Assistant guidé pour coach/athlète débutant.
 *
 * Traduit un questionnaire "symptômes terrain" (langage non-technique) en
 * CoachProfileFormPayload (Lorang) prêt pour handleCoachFormGenerate.
 *
 * Modes de sortie :
 *  - "Vérifier avant génération" : pré-remplit CoachProfileForm via localStorage
 *  - "Générer directement" : appelle onGenerate(payload)
 *
 * Aucune logique métier n'est dupliquée — le wizard construit exactement
 * la même structure que CoachProfileForm.
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
  { value: "5K",       label: "5 km" },
  { value: "10K",      label: "10 km" },
  { value: "Semi",     label: "Semi-marathon" },
  { value: "Marathon", label: "Marathon" },
  { value: "Trail",    label: "Trail / Ultra" },
  { value: "70.3",     label: "Triathlon 70.3" },
  { value: "IM",       label: "Ironman" },
];

const SESSIONS_PER_WEEK = [3, 4, 5, 6, 7];

export interface QuickStartResult {
  payload: CoachProfileFormPayload;
  objective: string;
  action: "generate" | "review";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName?: string;
  defaultObjective?: string;
  /** L'utilisateur veut générer directement — le parent enchaîne sur handleCoachFormGenerate. */
  onGenerate: (result: QuickStartResult) => void;
  /** L'utilisateur veut vérifier — le parent pré-remplit + ouvre CoachProfileForm. */
  onReview: (result: QuickStartResult) => void;
}

type Step =
  | "audience"
  | "objective"
  | "duration"
  | "metabolic"
  | "primary"
  | "secondary"
  | "sessions"
  | "recap";

const STEPS: Step[] = ["audience", "objective", "duration", "metabolic", "primary", "secondary", "sessions", "recap"];

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

  const step = STEPS[stepIdx];
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = Math.floor((race.getTime() - today.getTime()) / 86400000);
        if (days < 0) return null;
        return Math.max(1, Math.floor(days / 7) + 1);
      } catch { return null; }
    }
    const n = parseInt(freeWeeks, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [durationMode, freeWeeks, raceDate]);

  const canNext = (): boolean => {
    switch (step) {
      case "audience":  return audience !== null;
      case "objective": return !!objective;
      case "duration":  return computedWeeks !== null && computedWeeks > 0;
      case "metabolic": return metabolic !== null;
      case "primary":   return primary !== null;
      case "secondary": return secondary !== null; // "skip" is valid
      case "sessions":  return sessions !== null;  // "skip" is valid
      case "recap":     return true;
    }
  };

  const next = () => { if (!isLast && canNext()) setStepIdx((i) => i + 1); };
  const prev = () => { if (!isFirst) setStepIdx((i) => i - 1); };

  const buildPayload = (): CoachProfileFormPayload | null => {
    if (!metabolic || !primary || !computedWeeks) return null;
    const primaryMeta = LIMITER_META[primary];
    const secondaryLimiter = secondary && secondary !== "skip" ? secondary : null;
    const secondaryMeta = secondaryLimiter ? LIMITER_META[secondaryLimiter] : null;

    // Prohibitions implicites pour profil sprinter (identiques à CoachProfileForm).
    const prohibitions: LorangProhibition[] = [];
    if (metabolic === "sprinter") {
      prohibitions.push("sprints", "micro_intervals");
    }

    const spw = typeof sessions === "number" ? sessions : null;

    return {
      metabolicProfile: metabolic,
      primaryLimiter: primary,
      primaryLimiterMetric: primaryMeta.metric,
      secondaryLimiter,
      secondaryLimiterMetric: secondaryMeta?.metric ?? null,
      prohibitions,
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
    const result: QuickStartResult = { payload, objective, action };
    if (action === "generate") onGenerate(result);
    else onReview(result);
    onOpenChange(false);
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
  const stepNumber = stepIdx + 1;
  const totalSteps = STEPS.length;

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
            {stepNumber} / {totalSteps} — Quelques questions simples pour générer un plan cohérent.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-2">
          {STEPS.map((_, i) => (
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
              <CardChoice
                selected={audience === "coach"}
                onClick={() => setAudience("coach")}
                emoji="🧑‍🏫"
                title="Je suis coach"
                desc="Je réponds pour l'athlète que j'accompagne."
              />
              <CardChoice
                selected={audience === "athlete"}
                onClick={() => setAudience("athlete")}
                emoji="🏃"
                title="Je suis l'athlète"
                desc="Je réponds pour moi-même."
              />
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
                <ModeCard
                  active={durationMode === "free"}
                  onClick={() => setDurationMode("free")}
                  title="Durée libre"
                  desc="Progression sur N semaines."
                />
                <ModeCard
                  active={durationMode === "date"}
                  onClick={() => setDurationMode("date")}
                  title="Objectif daté"
                  desc="Compte à rebours course."
                />
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
                  <Input
                    type="number"
                    min={2}
                    max={52}
                    placeholder="Nombre de semaines (2-52)"
                    value={freeWeeks}
                    onChange={(e) => setFreeWeeks(e.target.value)}
                    className="max-w-[220px]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={raceDate}
                    onChange={(e) => setRaceDate(e.target.value)}
                    className="max-w-[220px]"
                  />
                  {computedWeeks !== null && (
                    <div className="text-xs text-muted-foreground">
                      Soit environ <span className="font-medium">{computedWeeks} semaines</span> de préparation.
                    </div>
                  )}
                </div>
              )}
            </StepBlock>
          )}

          {step === "metabolic" && (
            <StepBlock
              title={`${subjectCapital} — plutôt explosif ou endurant ?`}
              hint="Choisis le profil qui décrit le mieux le comportement à l'entraînement."
            >
              {METABOLIC_QUESTIONS.map((m) => (
                <CardChoice
                  key={m.value}
                  selected={metabolic === m.value}
                  onClick={() => setMetabolic(m.value)}
                  emoji={m.emoji}
                  title={m.label}
                  desc={m.desc}
                />
              ))}
            </StepBlock>
          )}

          {step === "primary" && (
            <StepBlock
              title={`Qu'est-ce qui limite le plus ${subject} en course ?`}
              hint="Choisis LE symptôme dominant. C'est ce que l'IA ciblera en priorité."
            >
              {SYMPTOMS.map((s) => (
                <CardChoice
                  key={s.key}
                  selected={primary === s.key}
                  onClick={() => setPrimary(s.key)}
                  emoji={s.emoji}
                  title={s.title}
                  desc={s.desc}
                />
              ))}
            </StepBlock>
          )}

          {step === "secondary" && (
            <StepBlock
              title="Un deuxième point faible ?"
              hint="Optionnel — si tu hésites, passe cette étape."
            >
              {SYMPTOMS.filter((s) => s.key !== primary).map((s) => (
                <CardChoice
                  key={s.key}
                  selected={secondary === s.key}
                  onClick={() => setSecondary(s.key)}
                  emoji={s.emoji}
                  title={s.title}
                  desc={s.desc}
                />
              ))}
              <CardChoice
                selected={secondary === "skip"}
                onClick={() => setSecondary("skip")}
                emoji="🤷"
                title="Je ne sais pas / je passe"
                desc="Aucun limiteur secondaire imposé."
              />
            </StepBlock>
          )}

          {step === "sessions" && (
            <StepBlock
              title={`Combien de séances par semaine ${possessive} agenda permet-il ?`}
              hint="Compte toutes disciplines confondues. Si tu ne sais pas, laisse l'IA décider."
            >
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

          {step === "recap" && (
            <StepBlock title="Récapitulatif" hint="Vérifie avant de continuer.">
              <RecapRow label="Objectif" value={OBJECTIVES.find((o) => o.value === objective)?.label ?? objective} />
              <RecapRow
                label="Durée"
                value={
                  durationMode === "date"
                    ? `Course le ${raceDate} (~${computedWeeks} sem)`
                    : `${computedWeeks} semaines`
                }
              />
              <RecapRow label="Profil énergie" value={METABOLIC_QUESTIONS.find((m) => m.value === metabolic)?.label ?? "—"} />
              <RecapRow label="Limiteur principal" value={primary ? LIMITER_META[primary].label : "—"} />
              <RecapRow
                label="Limiteur secondaire"
                value={
                  secondary && secondary !== "skip"
                    ? LIMITER_META[secondary].label
                    : <span className="text-muted-foreground italic">non défini</span>
                }
              />
              <RecapRow
                label="Séances/semaine"
                value={
                  typeof sessions === "number"
                    ? `${sessions}`
                    : <span className="text-muted-foreground italic">IA décide</span>
                }
              />
              <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  Ces réponses sont traduites en limiteurs Lorang pour l'IA. Tu peux les
                  <span className="font-medium"> vérifier et affiner</span> dans le formulaire coach,
                  ou <span className="font-medium">générer directement</span>.
                </div>
              </div>
            </StepBlock>
          )}
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

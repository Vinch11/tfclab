/**
 * CoachProfileForm — Saisie manuelle des limiteurs Lorang par le coach.
 *
 * Remplace le "Démarrage Express" (qui devinait le profil). Le coach SAIT
 * (sprinteur/diesel), on ne devine plus. Le formulaire est l'entrée MANUELLE
 * vers le même flux que le diagnostic auto : il produit `identifiedLimiters`
 * (markdown), `identifiedLimitersRaw` (métriques) et `prohibitions` au format
 * attendu par useAITrainingPlan.
 *
 * Règle d'or — TOLÉRANCE À L'INCERTITUDE : les champs optionnels non renseignés
 * ("Je ne sais pas") sont transmis comme ABSENTS. On n'invente RIEN.
 */
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Save, User, AlertCircle, HelpCircle } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  LorangLimiter,
  LorangProhibition,
} from "@/lib/v2/lorangStrategyEngine";

// ─── Mapping Lorang → libellés & métriques (aligné METRIC_TO_LIMITER_MAP) ────
const LIMITER_OPTIONS: Array<{
  value: LorangLimiter;
  label: string;
  hint: string;
  metric: string; // pour identifiedLimitersRaw (scoring séance)
}> = [
  { value: "motor",         label: "Le moteur (VO2max)",           hint: "VO2max bas — développer la puissance aérobie", metric: "VO2max" },
  { value: "glycolytic",    label: "L'explosivité / vitesse",       hint: "VLamax haute — coûteuse en LD, à réduire",     metric: "VLamax" },
  { value: "durability",    label: "La tenue sur la durée",         hint: "TTE faible — endurance de seuil à construire",  metric: "TTE" },
  { value: "neuromuscular", label: "La force / l'économie",         hint: "Économie basse — force max & efficacité",       metric: "Économie" },
  { value: "metabolic",     label: "La gestion du carburant",       hint: "FatMax bas — oxydation lipidique à travailler", metric: "FatMax" },
  { value: "availability",  label: "La disponibilité / fatigue",    hint: "Fatigue, sommeil, stress — priorité récup",     metric: "Disponibilité" },
];

const PROHIBITION_OPTIONS: Array<{ value: LorangProhibition; label: string }> = [
  { value: "sprints",         label: "Pas de sprints all-out" },
  { value: "micro_intervals", label: "Pas de micro-intervalles explosifs (<20s)" },
  { value: "vo2_heavy_blocks",label: "Pas de gros blocs VO2max longs" },
  { value: "erratic_pacing",  label: "Pas de pacing erratique" },
  { value: "train_low",       label: "Pas de train-low (glycogène bas)" },
];

// Reverse map pour pré-remplir depuis un diagnostic auto (metric → Lorang).
const METRIC_TO_LORANG: Record<string, LorangLimiter> = {
  "VO2max": "motor",
  "FTP/kg": "motor",
  "VLamax": "glycolytic",
  "TTE": "durability",
  "FatMax": "metabolic",
  "Économie": "neuromuscular",
  "Economie": "neuromuscular",
};

// Notes pédagogiques "comment reconnaître cet athlète" — langage terrain, pas définition.
const LIMITER_PEDAGOGY: Record<LorangLimiter, string> = {
  motor: "L'athlète manque de cylindrée : il plafonne vite sur les efforts intenses, s'essouffle sur les côtes ou les accélérations. Typique du débutant ou de celui qui n'a jamais fait d'intensité.",
  glycolytic: "L'athlète a du punch mais 's'éteint' vite : bon sur le court, il explose ses réserves sur la distance et 'meurt' en fin de course. Souvent un ancien sportif de sports explosifs (foot, sprint).",
  durability: "L'athlète tient une bonne allure… mais pas longtemps. Il part bien puis décroche à mi-course. Le seuil est là, mais il ne le maintient pas.",
  neuromuscular: "L'athlète 'rame' : foulée peu efficace, dépense trop d'énergie pour une allure donnée. Se fatigue plus vite que son niveau cardio ne le laisserait penser.",
  metabolic: "L'athlète 'tape dans le mur' sur les sorties longues : coup de barre, fringale, baisse brutale. Il brûle trop de sucre, pas assez de gras. Crucial sur marathon/IM.",
  availability: "L'athlète est déjà fatigué, stressé, dort mal, ou a peu de temps. La priorité n'est pas de le charger mais de le préserver. Vaut pour un athlète en surcharge de vie.",
};

const METABOLIC_PEDAGOGY: Record<MetabolicProfile, string> = {
  sprinter: "Nerveux, explosif, à l'aise sur le court et les accélérations, mais s'épuise sur la distance. Ancien sport explosif fréquent.",
  balanced: "Ni pur sprinteur ni pur diesel — polyvalent. Le cas le plus courant si tu hésites.",
  diesel: "Régulier, endurant, à l'aise sur la durée mais peu de punch. Peut tenir longtemps sans exploser.",
};

export type MetabolicProfile = "sprinter" | "balanced" | "diesel";
export type DurationMode = "date" | "free";

export interface CoachProfileFormPayload {
  metabolicProfile: MetabolicProfile;
  primaryLimiter: LorangLimiter;
  primaryLimiterMetric: string;
  secondaryLimiter: LorangLimiter | null;   // null = "Je ne sais pas"
  secondaryLimiterMetric: string | null;
  prohibitions: LorangProhibition[];
  sessionsPerWeek: number | null;
  /** Mode de durée du plan choisi par le coach. */
  durationMode: DurationMode;
  /** Date de course (ISO yyyy-MM-dd) — mode "date" uniquement, sinon null. */
  raceDate: string | null;
  /** Nombre de semaines — TOUJOURS renseigné (calculé depuis raceDate si mode date). */
  weeksAvailable: number;
  /** Provenance de chaque champ (coach = saisie manuelle, diag = pré-rempli non modifié).
   *  Utilisé pour tracer que la saisie coach PRIME sur l'inférence. */
  overriddenByCoach: {
    primary: boolean;
    secondary: boolean;
  };
}

/** Optionnel — pré-remplissage depuis un diagnostic auto. */
export interface CoachProfilePrefill {
  metabolicProfile?: MetabolicProfile;
  primaryLimiterMetric?: string;  // ex "VLamax"
  secondaryLimiterMetric?: string;
  prohibitions?: LorangProhibition[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName?: string;
  objectifLabel?: string;
  /** Pré-remplissage issu du diagnostic (mode "estimé par le diagnostic"). */
  prefill?: CoachProfilePrefill | null;
  /** Enregistre le profil coach sans lancer la génération. */
  onSubmit?: (payload: CoachProfileFormPayload) => void;
  /** Enregistre + lance la génération IA. */
  onGenerate: (payload: CoachProfileFormPayload) => void;
}

/** Petite icône "?" qui affiche une note pédagogique au survol / tap. */
function CoachTip({ children }: { children: React.ReactNode }) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label="En savoir plus"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-72 p-3 text-sm leading-relaxed"
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}

export function CoachProfileForm({
  open,
  onOpenChange,
  athleteName,
  objectifLabel,
  prefill,
  onSubmit,
  onGenerate,
}: Props) {
  const prefillPrimary = prefill?.primaryLimiterMetric
    ? METRIC_TO_LORANG[prefill.primaryLimiterMetric]
    : undefined;
  const prefillSecondary = prefill?.secondaryLimiterMetric
    ? METRIC_TO_LORANG[prefill.secondaryLimiterMetric]
    : undefined;

  const [metabolic, setMetabolic] = useState<MetabolicProfile | null>(
    prefill?.metabolicProfile ?? null,
  );
  const [primary, setPrimary] = useState<LorangLimiter | null>(prefillPrimary ?? null);
  const [secondary, setSecondary] = useState<LorangLimiter | "unknown">(
    prefillSecondary ?? "unknown",
  );
  const [prohibitions, setProhibitions] = useState<LorangProhibition[]>(
    prefill?.prohibitions ?? [],
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>("");
  const [optionalOpen, setOptionalOpen] = useState(false);

  // ─── Durée du plan (obligatoire, pas de défaut caché) ─────────────────────
  const [durationMode, setDurationMode] = useState<DurationMode>("free");
  const [raceDate, setRaceDate] = useState<string>("");     // yyyy-MM-dd
  const [freeWeeks, setFreeWeeks] = useState<string>("");   // string pour input libre

  // Track whether the coach touched a pre-filled value (coach PRIME sur diagnostic).
  const [touchedPrimary, setTouchedPrimary] = useState(false);
  const [touchedSecondary, setTouchedSecondary] = useState(false);

  // Persistance locale par athlète (survit à la fermeture du dialogue).
  const storageKey = `tfcl:coachProfileForm:${athleteName ?? "default"}`;

  // Restore when opening: saved draft prime sur prefill.
  useEffect(() => {
    if (!open) return;
    let restored = false;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const s = JSON.parse(raw);
        setMetabolic(s.metabolic ?? prefill?.metabolicProfile ?? null);
        setPrimary(s.primary ?? prefillPrimary ?? null);
        setSecondary(s.secondary ?? prefillSecondary ?? "unknown");
        setProhibitions(s.prohibitions ?? prefill?.prohibitions ?? []);
        setSessionsPerWeek(s.sessionsPerWeek ?? "");
        setDurationMode(s.durationMode ?? "free");
        setRaceDate(s.raceDate ?? "");
        setFreeWeeks(s.freeWeeks ?? "");
        setTouchedPrimary(!!s.touchedPrimary);
        setTouchedSecondary(!!s.touchedSecondary);
        setOptionalOpen(!!s.optionalOpen);
        restored = true;
      }
    } catch {/* ignore */}
    if (!restored) {
      setMetabolic(prefill?.metabolicProfile ?? null);
      setPrimary(prefillPrimary ?? null);
      setSecondary(prefillSecondary ?? "unknown");
      setProhibitions(prefill?.prohibitions ?? []);
      setSessionsPerWeek("");
      setDurationMode("free");
      setRaceDate("");
      setFreeWeeks("");
      setTouchedPrimary(false);
      setTouchedSecondary(false);
      setOptionalOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Persist on every change while open.
  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          metabolic, primary, secondary, prohibitions,
          sessionsPerWeek, durationMode, raceDate, freeWeeks,
          touchedPrimary, touchedSecondary, optionalOpen,
        }),
      );
    } catch {/* ignore */}
  }, [open, storageKey, metabolic, primary, secondary, prohibitions, sessionsPerWeek, durationMode, raceDate, freeWeeks, touchedPrimary, touchedSecondary, optionalOpen]);

  // ─── Calcul de la durée effective ───────────────────────────────────────
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
  }, [durationMode, raceDate, freeWeeks]);

  const canSubmit = metabolic !== null && primary !== null && computedWeeks !== null && computedWeeks > 0;

  const build = (): CoachProfileFormPayload | null => {
    if (!metabolic || !primary || !computedWeeks) return null;
    const primaryDef = LIMITER_OPTIONS.find((o) => o.value === primary)!;
    const secondaryDef =
      secondary !== "unknown" ? LIMITER_OPTIONS.find((o) => o.value === secondary) ?? null : null;

    // Prohibition implicite pour profil sprinter (LD est décidé côté page).
    const finalProhibitions = new Set(prohibitions);
    if (metabolic === "sprinter") {
      finalProhibitions.add("sprints");
      finalProhibitions.add("micro_intervals");
    }

    const rawSpw = parseInt(sessionsPerWeek, 10);
    return {
      metabolicProfile: metabolic,
      primaryLimiter: primary,
      primaryLimiterMetric: primaryDef.metric,
      secondaryLimiter: secondaryDef ? secondaryDef.value : null,
      secondaryLimiterMetric: secondaryDef ? secondaryDef.metric : null,
      prohibitions: Array.from(finalProhibitions),
      sessionsPerWeek: Number.isFinite(rawSpw) && rawSpw > 0 ? rawSpw : null,
      durationMode,
      raceDate: durationMode === "date" && raceDate ? raceDate : null,
      weeksAvailable: computedWeeks,
      overriddenByCoach: {
        primary: touchedPrimary || !prefillPrimary,
        secondary: touchedSecondary || !prefillSecondary,
      },
    };
  };

  const handleSave = () => {
    const p = build();
    if (!p) return;
    onSubmit?.(p);
    onOpenChange(false);
  };
  const handleGenerate = () => {
    const p = build();
    if (!p) return;
    onGenerate(p);
    onOpenChange(false);
  };

  const hasPrefill = !!prefill;

  const toggleProhibition = (v: LorangProhibition) => {
    setProhibitions((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil coach — Limiteurs Lorang
            {athleteName ? (
              <Badge variant="outline" className="ml-2">{athleteName}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Le coach saisit ce qu'il SAIT du profil de l'athlète. Ces limiteurs
            alimentent directement la génération IA — mêmes moteurs que le
            diagnostic auto.
            {objectifLabel ? (
              <> Objectif&nbsp;: <span className="font-medium">{objectifLabel}</span>.</>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Pre-fill banner */}
          {hasPrefill && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                Champs pré-remplis à partir du diagnostic (marqués{" "}
                <Badge variant="outline" className="text-[10px] py-0 px-1 ml-0.5">estimé</Badge>).
                Votre saisie prime sur l'inférence.
              </div>
            </div>
          )}

          {/* Durée du plan — OBLIGATOIRE, pas de défaut caché */}
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Label className="text-sm font-semibold mb-2 block">
              Durée du plan <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setDurationMode("free")}
                className={cn(
                  "rounded-md border p-2 text-xs sm:text-sm text-left transition-all",
                  durationMode === "free"
                    ? "border-primary bg-primary/20 ring-2 ring-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="font-medium">Durée libre</div>
                <div className="text-[11px] text-muted-foreground">Sans date de course — progression sur N semaines.</div>
              </button>
              <button
                type="button"
                onClick={() => setDurationMode("date")}
                className={cn(
                  "rounded-md border p-2 text-xs sm:text-sm text-left transition-all",
                  durationMode === "date"
                    ? "border-primary bg-primary/20 ring-2 ring-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="font-medium">Objectif daté</div>
                <div className="text-[11px] text-muted-foreground">Compte à rebours jusqu'à la course.</div>
              </button>
            </div>

            {durationMode === "free" ? (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[6, 8, 12, 16].map((n) => {
                    const active = parseInt(freeWeeks, 10) === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFreeWeeks(String(n))}
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-xs font-medium transition-all",
                          active
                            ? "border-primary bg-primary/20 ring-2 ring-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {n} sem
                      </button>
                    );
                  })}
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
                    ≈ <span className="font-semibold text-primary">{computedWeeks}</span> semaines jusqu'à la course.
                  </div>
                )}
                {raceDate && computedWeeks === null && (
                  <div className="text-xs text-destructive">Date passée — choisis une date future.</div>
                )}
              </div>
            )}
            {!canSubmit && computedWeeks === null && (
              <div className="text-[11px] text-destructive mt-2">
                Durée requise pour générer un plan (pas de défaut caché).
              </div>
            )}
          </section>

          {/* a) Metabolic profile */}
          <section>
            <Label className="text-sm font-semibold mb-2 block">
              a) Profil métabolique <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { v: "sprinter", label: "Sprinteur / explosif", hint: "VLamax haute" },
                { v: "balanced", label: "Équilibré",              hint: "aucun dominant" },
                { v: "diesel",   label: "Diesel / endurant",      hint: "moteur aérobie" },
              ] as const).map((opt) => {
                const active = metabolic === opt.v;
                const wasPre = prefill?.metabolicProfile === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setMetabolic(opt.v)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/20 ring-2 ring-primary shadow-md"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <CoachTip>{METABOLIC_PEDAGOGY[opt.v]}</CoachTip>
                    </div>
                    <div className="flex items-start justify-between gap-1 mt-1">
                      <div className="text-xs text-muted-foreground">{opt.hint}</div>
                      {wasPre && !active && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 flex-shrink-0">estimé</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* b) Primary limiter */}
          <section>
            <Label className="text-sm font-semibold mb-2 block">
              b) Limiteur principal <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LIMITER_OPTIONS.map((opt) => {
                const active = primary === opt.value;
                const wasPre = prefillPrimary === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPrimary(opt.value);
                      setTouchedPrimary(true);
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/20 ring-2 ring-primary shadow-md"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <CoachTip>{LIMITER_PEDAGOGY[opt.value]}</CoachTip>
                    </div>
                    <div className="flex items-start justify-between gap-1 mt-1">
                      <div className="text-xs text-muted-foreground">{opt.hint}</div>
                      {wasPre && !touchedPrimary && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 flex-shrink-0">estimé</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Optionals */}
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Champs optionnels (recommandé si vous êtes sûr)</span>
                <span className="text-xs text-muted-foreground">
                  {optionalOpen ? "Masquer" : "Afficher"}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              {/* d) Secondary limiter */}
              <section>
                <Label className="text-sm font-semibold mb-2 block">
                  d) Limiteur secondaire
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSecondary("unknown");
                      setTouchedSecondary(true);
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      secondary === "unknown"
                        ? "border-primary bg-primary/20 ring-2 ring-primary"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="text-sm font-medium">Je ne sais pas</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Par défaut — transmis comme absent (plan plus générique mais juste).
                    </div>
                  </button>
                  {LIMITER_OPTIONS.map((opt) => {
                    const active = secondary === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSecondary(opt.value);
                          setTouchedSecondary(true);
                        }}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-all",
                          active
                            ? "border-primary bg-primary/20 ring-2 ring-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* e) Prohibitions */}
              <section>
                <Label className="text-sm font-semibold mb-2 block">
                  e) Prohibitions évidentes
                </Label>
                <div className="space-y-2">
                  {PROHIBITION_OPTIONS.map((opt) => {
                    const checked = prohibitions.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleProhibition(opt.value)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {metabolic === "sprinter" && (
                  <div className="text-xs text-muted-foreground mt-2">
                    ℹ️ Profil sprinteur → sprints & micro-intervalles seront ajoutés automatiquement.
                  </div>
                )}
              </section>

              {/* f) Sessions per week */}
              <section>
                <Label htmlFor="coach-spw" className="text-sm font-semibold mb-2 block">
                  f) Disponibilité — séances / semaine
                </Label>
                <Input
                  id="coach-spw"
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Laisser vide si inconnu"
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(e.target.value)}
                  className="max-w-[200px]"
                />
              </section>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!canSubmit || !onSubmit}
          >
            <Save className="h-4 w-4 mr-1" />
            Enregistrer sans générer
          </Button>
          <Button onClick={handleGenerate} disabled={!canSubmit} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Générer le plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

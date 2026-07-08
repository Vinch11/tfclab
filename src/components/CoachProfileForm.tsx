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
import { Sparkles, Save, User, AlertCircle } from "lucide-react";

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

export type MetabolicProfile = "sprinter" | "balanced" | "diesel";

export interface CoachProfileFormPayload {
  metabolicProfile: MetabolicProfile;
  primaryLimiter: LorangLimiter;
  primaryLimiterMetric: string;
  secondaryLimiter: LorangLimiter | null;   // null = "Je ne sais pas"
  secondaryLimiterMetric: string | null;
  prohibitions: LorangProhibition[];
  sessionsPerWeek: number | null;
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

  // Track whether the coach touched a pre-filled value (coach PRIME sur diagnostic).
  const [touchedPrimary, setTouchedPrimary] = useState(false);
  const [touchedSecondary, setTouchedSecondary] = useState(false);

  // Reset when opening with a new prefill.
  useEffect(() => {
    if (!open) return;
    setMetabolic(prefill?.metabolicProfile ?? null);
    setPrimary(prefillPrimary ?? null);
    setSecondary(prefillSecondary ?? "unknown");
    setProhibitions(prefill?.prohibitions ?? []);
    setSessionsPerWeek("");
    setTouchedPrimary(false);
    setTouchedSecondary(false);
    setOptionalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = metabolic !== null && primary !== null;

  const build = (): CoachProfileFormPayload | null => {
    if (!metabolic || !primary) return null;
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {wasPre && !active && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1">estimé</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.hint}</div>
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {wasPre && !touchedPrimary && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1">estimé</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.hint}</div>
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

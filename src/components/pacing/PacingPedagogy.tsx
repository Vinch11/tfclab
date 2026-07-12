/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING PEDAGOGY — Composants pédagogiques partagés
 *
 * Objectif : traduire le Pacing Envelope™ en langage coach/athlète.
 * Utilisé par PacingEnvelopeCard, PacingEnvelopeRunCard, PacingBriefingRunCard.
 *
 * Blocs exposés :
 * - PacingGlossaryHint  → tooltip "?" pour un terme technique
 * - PacingWhyBox        → "Pourquoi ce couloir ?" (drivers en clair)
 * - PacingRacePlanBox   → "Comment courir" (Départ / Milieu / Finish)
 * - PacingVisualBar     → barre horizontale zones + repères concrets
 * - PacingConceptCard   → mini-fiche "Comprendre en 30 secondes"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Flag, Gauge, Flame, ShieldCheck, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// GLOSSAIRE
// ═══════════════════════════════════════════════════════════════════════════════

export const PACING_GLOSSARY: Record<
  string,
  { label: string; short: string; detail: string; analogie?: string }
> = {
  couloir: {
    label: "Couloir de pacing",
    short: "La bande d'intensité tenable jusqu'au bout.",
    detail:
      "Fourchette basse–haute exprimée en % de ton seuil. Rester dedans = finir fort. En sortir par le haut = payer cash sur la fin.",
    analogie: "Comme les rails d'un bowling : ça t'empêche de finir dans la gouttière.",
  },
  ftp: {
    label: "FTP",
    short: "Puissance max tenable ~1h à vélo.",
    detail:
      "Functional Threshold Power. C'est ton seuil vélo : 100 % FTP = ton allure « je peux tenir 1 h en solo ». Tout est exprimé en % de ce repère.",
  },
  cs: {
    label: "CS (Vitesse Critique)",
    short: "Allure course tenable ~30–45 min à fond.",
    detail:
      "Critical Speed : point de bascule entre le tenable et le décroché rapide. Au-dessus, tu puises dans un réservoir limité (W').",
  },
  vma: {
    label: "VMA",
    short: "Vitesse à VO₂max — ton plafond aérobie.",
    detail:
      "Vitesse Maximale Aérobie. Utilisée pour convertir les zones en allure quand on n'a pas de mesure de seuil directe.",
  },
  seuil: {
    label: "% du seuil",
    short: "Repère universel : 100 % = ton allure seuil.",
    detail:
      "En dessous de 90 % : confortable. 90–100 % : dur mais tenable. > 100 % : réservoir limité qui se vide.",
  },
  vlamax: {
    label: "VLamax",
    short: "Vitesse de production de lactate.",
    detail:
      "Plus elle est haute, plus tu produis vite du lactate à intensité élevée → couloir plus étroit sur longue distance, tolérance à la dérive plus faible.",
    analogie: "Un moteur qui « pompe » vite : puissant mais qui chauffe.",
  },
  tte: {
    label: "TTE",
    short: "Temps que tu tiens à ton seuil.",
    detail:
      "Time to Exhaustion au seuil. > 55 min = tu peux étirer le couloir vers le haut. < 40 min = plafond bas obligatoire.",
  },
  wprime: {
    label: "W′ (W prime)",
    short: "Réservoir d'énergie au-dessus du seuil.",
    detail:
      "Une fois vidé, tu ne peux plus soutenir d'effort > seuil. Chaque accélération en pioche, chaque effort sous-seuil recharge un peu.",
    analogie: "Une batterie qui se vide vite et se recharge lentement.",
  },
  negative_split: {
    label: "Negative split",
    short: "Deuxième moitié plus rapide que la première.",
    detail:
      "Stratégie qui préserve le glycogène et le W′ en début de course pour finir en accélération. Statistiquement associée aux meilleures perfs longue distance.",
  },
  fatmax: {
    label: "FatMax",
    short: "Intensité où tu brûles le plus de graisses.",
    detail:
      "Point d'oxydation maximale des lipides. Elle décale légèrement le centre du couloir vers le haut (économique) ou le bas selon ton profil.",
  },
  discipline: {
    label: "Discipline requise",
    short: "Effort mental pour tenir le couloir.",
    detail:
      "Plus le couloir est étroit et le profil sensible, plus la discipline est haute. Ça se joue surtout dans les 30 premières minutes.",
  },
} as const;

export type PacingGlossaryKey = keyof typeof PACING_GLOSSARY;

/**
 * Tooltip inline "?" à côté d'un terme technique.
 */
export function PacingGlossaryHint({
  term,
  children,
  className,
}: {
  term: PacingGlossaryKey;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = PACING_GLOSSARY[term];
  if (!entry) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-primary transition-colors",
            className,
          )}
        >
          {children ?? entry.label}
          <HelpCircle className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs space-y-2" side="top">
        <div className="font-semibold text-sm text-foreground">{entry.label}</div>
        <div className="text-muted-foreground leading-snug">{entry.short}</div>
        <div className="leading-snug">{entry.detail}</div>
        {entry.analogie && (
          <div className="text-[11px] italic text-muted-foreground border-t pt-2">
            💡 {entry.analogie}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POURQUOI CE COULOIR ?
// ═══════════════════════════════════════════════════════════════════════════════

export interface PacingDriver {
  icon: React.ReactNode;
  label: string;
  value: string;
  interpretation: string;
  tone: "positive" | "neutral" | "warning";
}

export interface PacingWhyBoxProps {
  drivers: PacingDriver[];
  centerPct: number;
  referenceLabel: string;
  confidenceLabel: string;
  className?: string;
}

/**
 * Bloc "Pourquoi ce couloir est là et pas ailleurs ?"
 * Traduit les leviers physiologiques en phrases coach.
 */
export function PacingWhyBox({
  drivers,
  centerPct,
  referenceLabel,
  confidenceLabel,
  className,
}: PacingWhyBoxProps) {
  return (
    <div className={cn("rounded-lg border bg-card/50 p-3 space-y-3", className)}>
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Pourquoi ce couloir ?</h4>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Ta cible est <strong className="text-foreground">{centerPct}% de ton {referenceLabel}</strong>.
            Voici les 3 leviers qui la placent ici (fiabilité :{" "}
            <span className="font-medium">{confidenceLabel}</span>).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {drivers.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-md border px-2.5 py-2",
              d.tone === "positive" && "border-emerald-500/25 bg-emerald-500/5",
              d.tone === "warning" && "border-amber-500/30 bg-amber-500/5",
              d.tone === "neutral" && "border-border bg-muted/30",
            )}
          >
            <div className="shrink-0 mt-0.5">{d.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{d.label}</span>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  {d.value}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                → {d.interpretation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENT COURIR — Départ / Milieu / Finish
// ═══════════════════════════════════════════════════════════════════════════════

export interface RacePhase {
  label: string;
  window: string;              // ex : "0 → 30 min", "0 → 33%"
  targetPct: string;           // ex : "72–76% seuil"
  targetPace?: string | null;  // ex : "4'12/km" ou watts
  do: string;                  // consigne concrète
  dont: string;                // interdit
}

export interface PacingRacePlanBoxProps {
  phases: [RacePhase, RacePhase, RacePhase];
  keyPhrase?: string;
  className?: string;
}

/**
 * Bloc "Comment courir" en 3 phases explicites.
 */
export function PacingRacePlanBox({
  phases,
  keyPhrase,
  className,
}: PacingRacePlanBoxProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Comment courir cette course</h4>
      </div>

      {keyPhrase && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs italic text-primary">
          « {keyPhrase} »
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {phases.map((p, i) => {
          const tone =
            i === 0
              ? "border-blue-500/25 bg-blue-500/5"
              : i === 1
                ? "border-emerald-500/25 bg-emerald-500/5"
                : "border-purple-500/25 bg-purple-500/5";
          const num = i === 0 ? "1" : i === 1 ? "2" : "3";
          const numBg =
            i === 0
              ? "bg-blue-500 text-white"
              : i === 1
                ? "bg-emerald-500 text-white"
                : "bg-purple-500 text-white";

          return (
            <div key={i} className={cn("rounded-lg border p-3 space-y-2", tone)}>
              <header className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    numBg,
                  )}
                >
                  {num}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {p.window}
                  </div>
                </div>
              </header>

              <div className="rounded-md bg-background/60 border px-2 py-1.5 text-center">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Cible
                </div>
                <div className="text-xs font-bold font-mono">{p.targetPct}</div>
                {p.targetPace && (
                  <div className="text-[10px] font-mono text-primary mt-0.5">
                    {p.targetPace}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-[11px] leading-snug">
                <div className="flex gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    ✓
                  </span>
                  <span>{p.do}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-red-600 dark:text-red-400 font-bold shrink-0">
                    ✗
                  </span>
                  <span className="text-muted-foreground">{p.dont}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUEL — Barre horizontale zones + repères concrets
// ═══════════════════════════════════════════════════════════════════════════════

export interface PacingVisualBarProps {
  lowPct: number;
  centerPct: number;
  highPct: number;
  toleratedPct: number;
  referenceLabel: string;      // "FTP", "seuil", "VMA"
  /** Optionnel : valeur concrète du centre, ex "245 W", "4'18/km" */
  centerConcrete?: string | null;
  className?: string;
}

/**
 * Barre horizontale annotée avec zones colorées + libellés en clair.
 * Version plus pédagogique que la barre inline existante :
 * - Labels "Trop mou / Cible / Toléré / Interdit" directement sous chaque bande
 * - Repère concret (watts ou allure) sur le centre
 */
export function PacingVisualBar({
  lowPct,
  centerPct,
  highPct,
  toleratedPct,
  referenceLabel,
  centerConcrete,
  className,
}: PacingVisualBarProps) {
  // Domaine visuel : 50 → 105% pour laisser respirer les bornes
  const DOMAIN_MIN = 50;
  const DOMAIN_MAX = 105;
  const span = DOMAIN_MAX - DOMAIN_MIN;
  const pct = (v: number) => `${((v - DOMAIN_MIN) / span) * 100}%`;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Ticks du haut : center label */}
      <div className="relative h-4">
        <div
          className="absolute -translate-x-1/2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
          style={{ left: pct(centerPct) }}
        >
          ▼ Cible {centerPct}%
        </div>
      </div>

      {/* Barre principale */}
      <div className="relative h-8 rounded-md overflow-hidden bg-muted border">
        {/* Trop mou */}
        <div
          className="absolute inset-y-0 bg-slate-400/25"
          style={{ left: pct(DOMAIN_MIN), width: pct(lowPct - DOMAIN_MIN + DOMAIN_MIN) }}
        />
        {/* Zone optimale */}
        <div
          className="absolute inset-y-0 bg-emerald-500/40"
          style={{
            left: pct(lowPct),
            width: `${((highPct - lowPct) / span) * 100}%`,
          }}
        />
        {/* Zone tolérée */}
        <div
          className="absolute inset-y-0 bg-amber-500/35"
          style={{
            left: pct(highPct),
            width: `${((toleratedPct - highPct) / span) * 100}%`,
          }}
        />
        {/* Interdit */}
        <div
          className="absolute inset-y-0 bg-red-500/40"
          style={{
            left: pct(toleratedPct),
            width: `${((DOMAIN_MAX - toleratedPct) / span) * 100}%`,
          }}
        />

        {/* Marqueur centre */}
        <div
          className="absolute inset-y-0 w-[2px] bg-emerald-700 dark:bg-emerald-400"
          style={{ left: pct(centerPct) }}
        />

        {/* Concrete label overlay */}
        {centerConcrete && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-emerald-700 dark:bg-emerald-500 text-white text-[10px] font-mono font-bold shadow"
            style={{ left: pct(centerPct) }}
          >
            {centerConcrete}
          </div>
        )}
      </div>

      {/* Ticks du bas : bornes */}
      <div className="relative h-3 text-[9px] font-mono text-muted-foreground">
        <span className="absolute left-0">{DOMAIN_MIN}%</span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: pct(lowPct) }}
        >
          {lowPct}%
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: pct(highPct) }}
        >
          {highPct}%
        </span>
        <span
          className="absolute -translate-x-1/2"
          style={{ left: pct(toleratedPct) }}
        >
          {toleratedPct}%
        </span>
        <span className="absolute right-0">{DOMAIN_MAX}%+</span>
      </div>

      {/* Légende zones */}
      <div className="grid grid-cols-4 gap-1 text-[10px] pt-1">
        <ZoneLegend color="bg-slate-400/60" label="Trop mou" hint="Sous-exploité" />
        <ZoneLegend color="bg-emerald-500/70" label="Cible" hint="Tenable jusqu'au bout" />
        <ZoneLegend color="bg-amber-500/70" label="Toléré" hint="Court seulement" />
        <ZoneLegend color="bg-red-500/70" label="Interdit" hint="Explosion assurée" />
      </div>

      <p className="text-[10px] text-muted-foreground italic text-center pt-1">
        Intensités exprimées en % de ton{" "}
        <span className="font-semibold text-foreground">{referenceLabel}</span>.
      </p>
    </div>
  );
}

function ZoneLegend({
  color,
  label,
  hint,
}: {
  color: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div className={cn("h-1.5 w-full rounded-full", color)} />
      <span className="font-semibold text-foreground text-[10px] leading-tight">
        {label}
      </span>
      <span className="text-muted-foreground text-[9px] leading-tight">{hint}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI-FICHE "COMPRENDRE EN 30 SECONDES"
// ═══════════════════════════════════════════════════════════════════════════════

export function PacingConceptCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3 space-y-2", className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Comprendre en 30 secondes
      </h4>
      <ul className="text-[11px] leading-snug space-y-1.5 text-muted-foreground">
        <li>
          <Badge variant="outline" className="mr-1 text-[9px] py-0 h-4">1</Badge>
          Le{" "}
          <PacingGlossaryHint term="couloir">couloir</PacingGlossaryHint> est une
          fourchette d'intensité <strong className="text-foreground">tenable jusqu'à la ligne</strong>, exprimée en % de ton{" "}
          <PacingGlossaryHint term="seuil">seuil</PacingGlossaryHint>.
        </li>
        <li>
          <Badge variant="outline" className="mr-1 text-[9px] py-0 h-4">2</Badge>
          Il est calculé à partir de <strong className="text-foreground">3 leviers</strong> :
          ta{" "}
          <PacingGlossaryHint term="vlamax">VLamax</PacingGlossaryHint>, ta{" "}
          <PacingGlossaryHint term="tte">TTE</PacingGlossaryHint> et
          l'ambition course.
        </li>
        <li>
          <Badge variant="outline" className="mr-1 text-[9px] py-0 h-4">3</Badge>
          Sortir du couloir par le haut vide ton{" "}
          <PacingGlossaryHint term="wprime">W′</PacingGlossaryHint> → décroché rapide.
          Rester dedans → <strong className="text-foreground">finish fort</strong>.
        </li>
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — Construire des drivers depuis un envelope input
// ═══════════════════════════════════════════════════════════════════════════════

export function buildDriversFromEnvelope(args: {
  vlamaxValue: number | null;
  tteMin: number | null;
  ambition?: string | null;
  raceObjective: string;
}): PacingDriver[] {
  const drivers: PacingDriver[] = [];

  // 1. VLamax → sensibilité métabolique
  if (args.vlamaxValue != null && args.vlamaxValue > 0) {
    const v = args.vlamaxValue;
    let tone: PacingDriver["tone"] = "neutral";
    let interp = "";
    if (v >= 0.55) {
      tone = "warning";
      interp =
        "Moteur qui produit vite du lactate : couloir plus étroit, discipline élevée exigée au départ.";
    } else if (v <= 0.35) {
      tone = "positive";
      interp =
        "Moteur économique en lactate : tu peux étirer le couloir vers le haut sans exploser.";
    } else {
      interp = "Profil équilibré : couloir standard, marge de manœuvre modérée.";
    }
    drivers.push({
      icon: <Flame className="h-3.5 w-3.5 text-orange-500" />,
      label: "VLamax (production de lactate)",
      value: v.toFixed(2),
      interpretation: interp,
      tone,
    });
  }

  // 2. TTE → capacité à tenir le seuil
  if (args.tteMin != null && args.tteMin > 0) {
    const tte = args.tteMin;
    let tone: PacingDriver["tone"] = "neutral";
    let interp = "";
    if (tte >= 55) {
      tone = "positive";
      interp =
        "Tu tiens longtemps ton seuil : le plafond du couloir peut monter, la dérive fin de course est faible.";
    } else if (tte < 40) {
      tone = "warning";
      interp =
        "Tu ne tiens pas ton seuil longtemps : plafond bas obligatoire, sinon décroché avant la fin.";
    } else {
      interp = "Durabilité correcte : couloir standard, tenir la cible en fin de course reste jouable.";
    }
    drivers.push({
      icon: <Gauge className="h-3.5 w-3.5 text-blue-500" />,
      label: "TTE (temps au seuil)",
      value: `${Math.round(tte)} min`,
      interpretation: interp,
      tone,
    });
  }

  // 3. Ambition + distance → largeur & agressivité
  const ambLabel = args.ambition
    ? String(args.ambition).replace(/_/g, " ").toLowerCase()
    : "profil non renseigné";
  drivers.push({
    icon: <Flag className="h-3.5 w-3.5 text-purple-500" />,
    label: `Ambition · ${args.raceObjective}`,
    value: ambLabel,
    interpretation:
      "Plus l'ambition est élevée et la distance longue, plus le centre est bas et le couloir étroit. C'est ce qui protège le finish.",
    tone: "neutral",
  });

  return drivers;
}

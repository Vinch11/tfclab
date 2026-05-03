/**
 * F8 — Ergogenic Aids Protocol Card
 * Affiche les suppléments recommandés pour le profil de course
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, AlertTriangle, Check, X, Info, Sparkles, FlaskRound, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeErgogenicAids,
  ERGOGENIC_DISCLAIMER,
  type ErgogenicAidsInput,
  type RaceProfile,
} from "@/lib/ergogenicAidsProtocol";
import {
  suggestPreset,
  getPresetsByDiscipline,
  type Discipline,
  type ErgogenicPreset,
} from "@/lib/ergogenicAidsPresets";

interface ErgogenicAidsCardProps extends ErgogenicAidsInput {
  /** Discipline pour suggérer un preset adapté */
  discipline?: Discipline;
  className?: string;
  staffMode?: boolean;
}

const PROFILE_LABEL: Record<RaceProfile, string> = {
  sprint: "Sprint (<2 min)",
  short: "Court (2–10 min)",
  middle: "Moyen (10–40 min)",
  long: "Long (40 min–4h)",
  ultra: "Ultra (>4h)",
};

const EVIDENCE_COLOR: Record<"A" | "B" | "C", string> = {
  A: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  C: "bg-muted text-muted-foreground",
};

export function ErgogenicAidsCard({
  weightKg,
  durationMin,
  hasRepeatedEfforts = false,
  bicarbTested = false,
  vegetarian = false,
  discipline,
  className,
  staffMode = false,
}: ErgogenicAidsCardProps) {
  // Preset suggéré automatiquement selon discipline + durée
  const autoPreset = useMemo<ErgogenicPreset | null>(
    () => (discipline ? suggestPreset(discipline, durationMin) : null),
    [discipline, durationMin]
  );

  const availablePresets = useMemo<ErgogenicPreset[]>(
    () => (discipline ? getPresetsByDiscipline(discipline) : []),
    [discipline]
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(autoPreset?.id ?? null);
  const activePreset =
    availablePresets.find((p) => p.id === selectedPresetId) ?? autoPreset;

  // Fusion des overrides preset > props athlète
  const effectiveInput = useMemo<ErgogenicAidsInput>(
    () => ({
      weightKg,
      durationMin,
      hasRepeatedEfforts:
        activePreset?.overrides.hasRepeatedEfforts ?? hasRepeatedEfforts,
      bicarbTested:
        activePreset?.overrides.bicarbTested ?? bicarbTested,
      vegetarian:
        activePreset?.overrides.vegetarian ?? vegetarian,
    }),
    [weightKg, durationMin, hasRepeatedEfforts, bicarbTested, vegetarian, activePreset]
  );

  const result = useMemo(() => computeErgogenicAids(effectiveInput), [effectiveInput]);

  if (!result.isApplicable) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="w-4 h-4" />
            Ergogéniques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Données insuffisantes (poids et durée requis).</p>
        </CardContent>
      </Card>
    );
  }

  const recommendedCount = result.aids.filter((a) => a.recommended).length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            <span>Ergogéniques</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {PROFILE_LABEL[result.raceProfile]}
            </Badge>
            <Badge variant="default" className="text-[10px]">
              {recommendedCount}/{result.aids.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {availablePresets.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Preset suggéré</span>
              {autoPreset && selectedPresetId === autoPreset.id && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">auto</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {availablePresets.map((p) => {
                const isActive = activePreset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPresetId(p.id)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted hover:border-primary/50"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {activePreset && (
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>{activePreset.description}</p>
                <p className="flex flex-wrap gap-1">
                  {activePreset.priorityStack.map((s, i) => (
                    <span key={s} className="inline-flex items-center gap-0.5">
                      {i > 0 && <span className="opacity-50">→</span>}
                      <span className="font-medium">{s}</span>
                    </span>
                  ))}
                </p>
                {staffMode && (
                  <p className="italic text-primary/80">📋 {activePreset.coachNote}</p>
                )}
              </div>
            )}
          </div>
        )}

        {result.aids.map((aid) => (
          <div
            key={aid.name}
            className={cn(
              "p-3 rounded-lg border",
              aid.recommended ? "bg-card border-primary/30" : "bg-muted/30 border-muted opacity-75"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {aid.recommended ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <h4 className="text-sm font-medium truncate">{aid.name}</h4>
              </div>
              <Badge className={cn("text-[10px] border", EVIDENCE_COLOR[aid.evidenceLevel])} variant="outline">
                Niv. {aid.evidenceLevel}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-2">{aid.reason}</p>

            {aid.recommended && (
              <div className="space-y-1 text-xs">
                {aid.dose && (
                  <p>
                    <span className="font-medium">Dose :</span> {aid.dose}
                  </p>
                )}
                {aid.timing && (
                  <p>
                    <span className="font-medium">Timing :</span> {aid.timing}
                  </p>
                )}
                {aid.loadingPhase && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Charge :</span> {aid.loadingPhase}
                  </p>
                )}
              </div>
            )}

            {aid.recommended && aid.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {aid.warnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {staffMode && (
              <div className="mt-3 pt-2 border-t border-dashed border-muted-foreground/20 space-y-2">
                {/* Mécanisme */}
                <div className="text-[10px]">
                  <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-0.5">
                    <FlaskRound className="w-2.5 h-2.5" /> Mécanisme
                  </p>
                  <p className="text-muted-foreground leading-snug">{aid.mechanism}</p>
                </div>

                {/* Hypothèses */}
                {aid.assumptions.length > 0 && (
                  <div className="text-[10px]">
                    <p className="font-semibold text-muted-foreground mb-0.5">Hypothèses du calcul</p>
                    <ul className="list-disc pl-3 space-y-0.5 text-muted-foreground">
                      {aid.assumptions.map((a, i) => (
                        <li key={i} className="leading-snug">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Citations détaillées avec tags */}
                <div className="text-[10px]">
                  <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <BookOpen className="w-2.5 h-2.5" /> Sources
                  </p>
                  <ul className="space-y-1">
                    {aid.citations.map((c) => (
                      <li key={c.ref} className="flex flex-wrap items-start gap-1">
                        <span className="flex gap-0.5 shrink-0">
                          {c.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className={cn(
                                "text-[8px] h-3.5 px-1 leading-none border",
                                t === "IOC" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
                                t === "ISSN" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
                                t === "Meta-analysis" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              )}
                            >
                              {t}
                            </Badge>
                          ))}
                        </span>
                        <span className="text-muted-foreground leading-snug">
                          {c.ref}
                          {c.doi && (
                            <a
                              href={`https://doi.org/${c.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 underline hover:text-primary"
                            >
                              doi
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}

        {result.globalNotes.length > 0 && (
          <Alert className="py-2">
            <Info className="h-3.5 w-3.5" />
            <AlertDescription className="text-[11px] space-y-1">
              {result.globalNotes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-[10px] text-muted-foreground italic">{ERGOGENIC_DISCLAIMER}</p>

        {staffMode && (
          <details className="text-[10px] text-muted-foreground">
            <summary className="cursor-pointer font-medium">Références scientifiques</summary>
            <ul className="mt-1 space-y-0.5 pl-3 list-disc">
              {result.references.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

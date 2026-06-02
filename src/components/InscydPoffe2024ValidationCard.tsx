/**
 * InscydPoffe2024ValidationCard
 *
 * Affiche la référence externe de validation INSCYD MLSS bike publiée par
 * Poffé, Van Dael & Van Schuylenbergh (2024, Frontiers Sports Active Living)
 * et — si une PMLSS bike estimée est fournie — projette l'intervalle de
 * confiance propagé par computeMLSSConfidenceInterval.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sigma, ExternalLink } from "lucide-react";
import {
  INSCYD_POFFE_2024,
  computeMLSSConfidenceInterval,
} from "@/lib/v2/inscydPoffe2024Sensitivity";

interface Props {
  /** Optionnel : PMLSS bike estimé (W) pour propagation d'incertitude. */
  pmlssW?: number;
  vo2maxConfidence?: number;
  vlamaxConfidence?: number;
}

export function InscydPoffe2024ValidationCard({
  pmlssW,
  vo2maxConfidence,
  vlamaxConfidence,
}: Props) {
  const ci = pmlssW
    ? computeMLSSConfidenceInterval({ pmlssW, vo2maxConfidence, vlamaxConfidence })
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Validation externe MLSS bike — Poffé 2024
          <Badge variant="outline" className="ml-auto text-[10px] gap-1">
            <Sigma className="h-3 w-3" />
            N={INSCYD_POFFE_2024.n} · r={INSCYD_POFFE_2024.pearsonR}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Validation indépendante du moteur INSCYD (sur lequel notre pipeline Mader-Heck est
          aligné) contre le gold-standard MLSS (2-5 paliers constants) chez{" "}
          <strong>{INSCYD_POFFE_2024.n} cyclistes</strong> (19H / 10F).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Stat label="Corrélation" value={`r=${INSCYD_POFFE_2024.pearsonR}`} />
          <Stat label="Bias moyen" value={`+${INSCYD_POFFE_2024.meanBiasW} W`} />
          <Stat label="MLSS / VO₂max" value={`${INSCYD_POFFE_2024.pctVO2maxAtMLSS}%`} />
          <Stat label="Err. typique" value={`±${INSCYD_POFFE_2024.typicalErrorMLSSPct}%`} />
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5">
          <p className="font-medium text-foreground">Sensibilités publiées (test-retest)</p>
          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
            <li>
              VO₂max <span className="font-mono">±{INSCYD_POFFE_2024.vo2maxStepMlKgMin} ml/kg/min</span> →{" "}
              <strong>±7 % PMLSS</strong> (~17 W)
            </li>
            <li>
              VLamax <span className="font-mono">±{INSCYD_POFFE_2024.vlamaxStepMmolLS} mmol/L/s</span> →{" "}
              <strong>±5 % PMLSS</strong> (~12-15 W)
            </li>
          </ul>
        </div>

        {ci && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Intervalle de confiance PMLSS (cet athlète)</span>
              <Badge
                variant="outline"
                className={
                  ci.quality === "lab"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : ci.quality === "field"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }
              >
                Source {ci.quality}
              </Badge>
            </div>
            <div className="font-mono text-lg font-semibold text-primary">
              {ci.pmlssW} W <span className="text-sm">± {ci.uncertaintyW} W ({ci.uncertaintyPct}%)</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Plage : <strong>{ci.lowW} – {ci.highW} W</strong>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{ci.rationale}</p>
          </div>
        )}

        <a
          href={`https://doi.org/${INSCYD_POFFE_2024.doi}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {INSCYD_POFFE_2024.citation}
        </a>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="font-mono text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

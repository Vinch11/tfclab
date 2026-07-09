// =============================================
// GapAmbitionPanel — comparaison DÉTERMINISTE
// Snapshot athlète (VMA/seuil, volume) vs standards populationnels de l'ambition choisie.
// 100% frontend : aucune donnée du panneau ne provient du texte généré par l'IA.
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { deriveRaceTargets } from "@/lib/deriveRaceTargets";
import { AMBITIONS, formatPace, formatTime, parseTimeToSec, fractionVMAForAmbition } from "@/lib/raceAnalysis";

// Table locale des standards populationnels (miroir READ-ONLY de REFERENCE_STANDARDS côté edge).
// ⚠️ Standards populationnels — usage EXCLUSIF GapAmbitionPanel. Ne jamais consommer pour prescrire.
const REFERENCE_STANDARDS_FRONT: Record<string, Record<string, string>> = {
  "5K":       { finish: "28-35", perf: "22-26", sub: "18-21", elite: "16-18", world_class: "sub15" },
  "10K":      { finish: "55-1h10", perf: "45-52", sub: "38-44", elite: "33-37", world_class: "sub31" },
  "Semi":     { finish: "2h00-2h30", perf: "1h35-1h55", sub: "1h20-1h35", elite: "1h12-1h20", world_class: "sub1h08" },
  "Marathon": { finish: "4h30-5h00", perf: "3h30-4h15", sub: "3h00-3h30", elite: "2h45-3h00", world_class: "sub2h35" },
};

// Chantier 2 — Volume standard populationnel (heures/semaine) par objectif × ambition.
// Utilisé UNIQUEMENT pour la ligne "Volume hebdo" du GapAmbitionPanel.
const REFERENCE_VOLUMES_FRONT: Record<string, Partial<Record<string, [number, number]>>> = {
  "5K":       { finish: [3, 5],  perf: [5, 7],  sub: [6, 9],   elite: [8, 12],  world_class: [10, 14] },
  "10K":      { finish: [3, 5],  perf: [5, 7],  sub: [7, 10],  elite: [9, 13],  world_class: [11, 15] },
  "Semi":     { finish: [4, 6],  perf: [6, 8],  sub: [8, 11],  elite: [10, 14], world_class: [12, 16] },
  "Marathon": { finish: [5, 7],  perf: [7, 9],  sub: [9, 12],  elite: [11, 15], world_class: [13, 17] },
};


const OBJ_KM: Record<string, number> = { "5K": 5, "10K": 10, "Semi": 21.0975, "Marathon": 42.195 };
const AMB_ORDER: readonly ("finish" | "perf" | "sub" | "elite" | "world_class")[] = ["finish", "perf", "sub", "elite", "world_class"];

function normObjective(o: string): string | null {
  const s = o.trim().toLowerCase();
  if (/^5\s*k/.test(s) || s === "5k") return "5K";
  if (/^10\s*k/.test(s) || s === "10k") return "10K";
  if (/semi|half/.test(s)) return "Semi";
  if (/marathon/.test(s) && !/semi/.test(s)) return "Marathon";
  return null;
}
function normAmbition(a: string): "finish" | "perf" | "sub" | "elite" | "world_class" {
  const s = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("world") || s.includes("mond")) return "world_class";
  if (s.includes("elite") || s.includes("pro")) return "elite";
  if (s.includes("compet") || s.includes("sub")) return "sub";
  if (s.includes("age") || s.includes("perf") || s.includes("confirm")) return "perf";
  return "finish";
}

// Extrait un mid seconds depuis un standard textuel (utilisé pour VMA requise).
function midSecFromStandard(std: string): number | null {
  if (!std) return null;
  const cleaned = std.replace(/\s/g, "").toLowerCase();
  if (cleaned.startsWith("sub")) {
    const s = parseTimeToSec(cleaned.replace("sub", ""));
    return s ? Math.round(s * 0.97) : null;
  }
  const [lo, hi] = cleaned.split("-");
  const s1 = lo ? parseTimeToSec(lo) : null;
  const s2 = hi ? parseTimeToSec(hi) : null;
  if (s1 && s2) return Math.round((s1 + s2) / 2);
  return s1 || s2;
}

export interface GapAmbitionPanelProps {
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
  ambition?: string | null;
  /** Ambition effective (après déclassement niveau d'entraînement). Si différent de `ambition`, une note est affichée. */
  ambitionEffective?: string | null;
  objective?: string | null;
  weeklyHours?: number | null;
}

export function GapAmbitionPanel({ vmaKmh, thresholdPaceSecPerKm, ambition, ambitionEffective, objective, weeklyHours }: GapAmbitionPanelProps) {
  const objKey = objective ? normObjective(objective) : null;
  const ambKey = normAmbition(ambition || "perf");
  const distanceKm = objKey ? OBJ_KM[objKey] : null;

  const derived = useMemo(() => deriveRaceTargets({
    vmaKmh: vmaKmh ?? null,
    thresholdPaceSecPerKm: thresholdPaceSecPerKm ?? null,
    objective: objective || "",
    ambition: ambition || "",
    weeklyHours: weeklyHours ?? null,
    literatureHintText: objKey ? REFERENCE_STANDARDS_FRONT[objKey]?.[ambKey] ?? null : null,
  }), [vmaKmh, thresholdPaceSecPerKm, ambition, objective, weeklyHours, objKey, ambKey]);

  const ambDef = AMBITIONS.find(a => a.key === ambKey) ?? AMBITIONS[1];
  // Structure APPLIQUÉE = ambition EFFECTIVE (post-déclassement). L'ambition saisie
  // reste utilisée pour le calcul du gap (cible visée) mais l'étiquette "Structure X
  // appliquée" doit refléter ce que le plan a réellement construit.
  const ambKeyEff = normAmbition(ambitionEffective || ambition || "perf");
  const ambDefEff = AMBITIONS.find(a => a.key === ambKeyEff) ?? ambDef;

  // Ligne 3 : temps projeté (snapshot) — déjà dans `derived`.
  // "Requis" temps = milieu du standard populationnel.
  const stdStr = objKey ? REFERENCE_STANDARDS_FRONT[objKey]?.[ambKey] ?? null : null;
  const stdMidSec = stdStr ? midSecFromStandard(stdStr) : null;

  // VMA requise = vitesse pour atteindre stdMidSec au %VMA cible de l'ambition.
  const frac = distanceKm ? fractionVMAForAmbition(ambDef, distanceKm) : ambDef.pctVMA;
  const vmaRequiredKmh = (distanceKm && stdMidSec)
    ? (distanceKm / (stdMidSec / 3600)) / frac
    : null;

  // Allure requise pour standard populationnel.
  const paceRequiredSecPerKm = (distanceKm && stdMidSec) ? stdMidSec / distanceKm : null;

  const gapVmaPct = (vmaRequiredKmh && vmaKmh)
    ? ((vmaRequiredKmh - vmaKmh) / vmaKmh) * 100
    : null;

  // Volume requis = fourchette standard populationnelle (REFERENCE_VOLUMES_FRONT).
  const volumeRefRange = objKey ? REFERENCE_VOLUMES_FRONT[objKey]?.[ambKey] ?? null : null;
  const volumeRefMid = volumeRefRange ? (volumeRefRange[0] + volumeRefRange[1]) / 2 : null;
  const gapVolumePct = (volumeRefMid != null && typeof weeklyHours === "number" && weeklyHours > 0)
    ? ((weeklyHours - volumeRefMid) / volumeRefMid) * 100
    : null;

  // Logs traçables (Chantier 2)
  if (typeof window !== "undefined") {
    console.log("📊 GapAmbitionPanel", {
      vma: vmaKmh ?? null,
      vmaRequise: vmaRequiredKmh?.toFixed(1) ?? null,
      allureRequise: paceRequiredSecPerKm ?? null,
      temps: derived.raceTimeSec ?? null,
      volumeActuel: weeklyHours ?? null,
      volumeRef: volumeRefRange,
      gapVmaPct: gapVmaPct?.toFixed(1) ?? null,
      gapVolumePct: gapVolumePct?.toFixed(1) ?? null,
    });
  }


  if (!vmaKmh && !thresholdPaceSecPerKm) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Gap Ambition — Physiologie vs standard
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Snapshot physiologique indisponible (VMA / seuil manquants) — panneau non calculable.
        </CardContent>
      </Card>
    );
  }

  const gapBadge = (pct: number | null) => {
    if (pct == null) return <span className="text-muted-foreground">—</span>;
    const sign = pct >= 0 ? "+" : "";
    const cls = Math.abs(pct) > 8 ? "text-destructive font-semibold" : Math.abs(pct) > 3 ? "text-amber-600 font-medium" : "text-emerald-600";
    return <span className={cls}>{sign}{pct.toFixed(1)}%</span>;
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Gap Ambition — Physiologie actuelle vs standard "{ambDef.label}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="py-2 pr-2 font-semibold">Métrique</th>
                <th className="py-2 pr-2 font-semibold">Actuel (snapshot)</th>
                <th className="py-2 pr-2 font-semibold">Requis ({ambDef.label})</th>
                <th className="py-2 pr-2 font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-2 pr-2">VMA (km/h)</td>
                <td className="py-2 pr-2">{vmaKmh ? vmaKmh.toFixed(1) : "—"}</td>
                <td className="py-2 pr-2">{vmaRequiredKmh ? vmaRequiredKmh.toFixed(1) : "—"}</td>
                <td className="py-2 pr-2">{gapBadge(gapVmaPct)}</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2 pr-2">Allure course soutenable</td>
                <td className="py-2 pr-2">{derived.racePaceSecPerKm ? formatPace(derived.racePaceSecPerKm) : "—"}</td>
                <td className="py-2 pr-2">{paceRequiredSecPerKm ? formatPace(paceRequiredSecPerKm) : "—"}</td>
                <td className="py-2 pr-2">
                  {(derived.racePaceSecPerKm && paceRequiredSecPerKm)
                    ? gapBadge(((derived.racePaceSecPerKm - paceRequiredSecPerKm) / paceRequiredSecPerKm) * 100)
                    : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2 pr-2">Temps projeté</td>
                <td className="py-2 pr-2">{derived.raceTimeSec ? formatTime(derived.raceTimeSec) : "—"}</td>
                <td className="py-2 pr-2">{stdStr ?? "—"}</td>
                <td className="py-2 pr-2">{gapBadge(derived.divergencePct)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-2">Volume hebdo</td>
                <td className="py-2 pr-2">{typeof weeklyHours === "number" ? `${weeklyHours}h` : "—"}</td>
                <td className="py-2 pr-2">{volumeRefRange ? `${volumeRefRange[0]}-${volumeRefRange[1]}h/sem` : "—"}</td>
                <td className="py-2 pr-2">{gapBadge(gapVolumePct)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed">
          <p>
            <strong>Structure {ambDefEff.label}</strong> appliquée
            ({derived.qualitesParSemaine} qualité(s)/semaine, complexité "{derived.complexiteSeances}").
            {" "}Objectif du plan :{" "}
            <strong>{derived.raceTimeSec ? formatTime(derived.raceTimeSec) : "—"}</strong>
            {" "}(physiologie actuelle).
            {stdStr && vmaRequiredKmh && vmaKmh && (
              <>
                {" "}Le niveau "{ambDef.label}" ({stdStr}) nécessiterait VMA ≈{" "}
                <strong>{vmaRequiredKmh.toFixed(1)} km/h</strong>
                {" "}({gapVmaPct != null ? `${gapVmaPct >= 0 ? "+" : ""}${gapVmaPct.toFixed(1)}%` : "—"} vs actuelle).
              </>
            )}
          </p>
        </div>

        {(() => {
          if (!ambitionEffective) return null;
          const effKey = normAmbition(ambitionEffective);
          if (effKey === ambKey) return null;
          const effDef = AMBITIONS.find(a => a.key === effKey) ?? AMBITIONS[1];
          return (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-relaxed">
              <p>
                <strong>Plan dimensionné pour : {effDef.label}</strong>
                <span className="text-muted-foreground">
                  {" "}— Ambition ajustée <strong>{ambDef.label} → {effDef.label}</strong> en cohérence
                  avec le niveau d'entraînement déclaré. La physiologie commande, l'ambition module la structure.
                  Le gap ci-dessus reste calculé vers votre ambition visée ({ambDef.label}).
                </span>
              </p>
            </div>
          );
        })()}

        <p className="text-[10px] text-muted-foreground italic">
          Panneau calculé côté frontend — 100% déterministe, aucune donnée générée par l'IA. Standards populationnels : usage comparatif uniquement.
        </p>
      </CardContent>
    </Card>
  );
}

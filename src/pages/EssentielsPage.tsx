/**
 * EssentielsPage — Les 8 indicateurs essentiels TFCL par athlète
 * Vue pédagogique : pour chaque pilier, valeur de l'athlète + définition + explication.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sparkles,
  Activity,
  Compass,
  Gauge,
  Timer,
  Flame,
  ShieldCheck,
  Route,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const calculateAge = (birth?: string | null): number | null => {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const formatVal = (
  v: number | null | undefined,
  unit = "",
  digits = 1,
): { text: string; missing: boolean } => {
  if (v == null || !isFinite(v) || v === 0) {
    return { text: "Données insuffisantes", missing: true };
  }
  return { text: `${v.toFixed(digits)}${unit ? " " + unit : ""}`, missing: false };
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EssentielsPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests } = useCloudDataContext();
  const [activeTab, setActiveTab] = useState("essentiels");
  const [staffMode, setStaffMode] = useState(
    () => localStorage.getItem("vlab-staff-mode") === "true",
  );

  // Snapshot effectif
  const effectiveSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    const list = (snapshots || []).filter((s) => s.athlete_id === currentAthlete.id);
    if (list.length === 0) return null;
    if (currentAthlete.active_snapshot_id) {
      const active = list.find((s) => s.id === currentAthlete.active_snapshot_id);
      if (active) return active;
    }
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  }, [currentAthlete, snapshots]);

  // Calculs essentiels
  const vlamaxEff = useMemo(() => {
    if (!currentAthlete) return null;
    return computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: currentAthlete.objectif || "IM",
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests: (tests || []).map((t: any) => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: (snapshots || []).map(mapSnapshotToV2),
    });
  }, [currentAthlete, snapshots, tests]);

  const tteEff = useMemo(() => {
    if (!currentAthlete || !effectiveSnapshot) return null;
    return computeTTEEffectif({
      ftp: effectiveSnapshot.ftp ?? null,
      tss_7d: effectiveSnapshot.tss_7d ?? null,
      tte_mode: (effectiveSnapshot.tte_mode as any) ?? "LOAD",
      tte_observed_min: effectiveSnapshot.tte_observed_min ?? null,
      objectif: currentAthlete.objectif || "IM",
      age: calculateAge(currentAthlete.dateNaissance),
    });
  }, [currentAthlete, effectiveSnapshot]);

  const mlssRun = useMemo(() => {
    const vla = vlamaxEff?.value ?? null;
    const ce = (effectiveSnapshot as any)?.run_economy_score ?? null;
    return predictRunMLSSPctFromVLaCE(vla, ce);
  }, [vlamaxEff, effectiveSnapshot]);

  const fatmaxPct = useMemo(() => {
    return computeFatMaxAnchorPctFTP(
      vlamaxEff?.value ?? null,
      effectiveSnapshot?.vo2max ?? null,
    );
  }, [vlamaxEff, effectiveSnapshot]);

  const vo2 = effectiveSnapshot?.vo2max ?? currentAthlete?.vo2max ?? null;
  const vlaVal = vlamaxEff?.value ?? null;

  // Les 8 cartes
  const pillars = useMemo(
    () => [
      {
        id: "vo2-vlamax",
        icon: Activity,
        color: "text-red-500",
        bg: "bg-red-500/10",
        title: "1. VO₂max × VLamax",
        value: (() => {
          const vo2f = formatVal(vo2, "ml/kg/min", 1);
          const vlaf = formatVal(vlaVal, "mmol/L/s", 2);
          if (vo2f.missing && vlaf.missing)
            return { text: "Données insuffisantes", missing: true };
          return {
            text: `VO₂max: ${vo2f.text} • VLamax: ${vlaf.text}`,
            missing: false,
          };
        })(),
        definition:
          "Le VO₂max mesure la puissance aérobie (capacité à consommer l'oxygène). La VLamax mesure la puissance anaérobie glycolytique (vitesse de production de lactate). Le couple décrit l'identité métabolique de l'athlète.",
        explanation:
          "Un athlète d'endurance vise un VO₂max élevé + une VLamax basse (≈0.30) pour économiser le glycogène. Un sprinteur cherche l'inverse. C'est la base de toute prescription : intervalles, FatMax, nutrition.",
      },
      {
        id: "compass",
        icon: Compass,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        title: "2. Coaching Compass™",
        value: { text: "Voir Dashboard → onglet Compass", missing: false },
        definition:
          "Radar 5-6 axes (VO₂max, VLamax, Durabilité, Économie, Fraîcheur, Force) avec détection automatique du limiter primaire & secondaire et des leviers Lorang à activer.",
        explanation:
          "Le Compass traduit la physiologie en décision d'entraînement. Il évite de s'éparpiller : on travaille en priorité le maillon faible. Chaque axe est noté 0-100 sur des cibles ambition-aware.",
      },
      {
        id: "mlss-run",
        icon: Gauge,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        title: "3. MLSS Run (Model C)",
        value: mlssRun
          ? {
              text: `${mlssRun.mlssPct.toFixed(1)}% VMA (RMSE 2.64%)`,
              missing: false,
            }
          : { text: "Données insuffisantes (VLa + CE requis)", missing: true },
        definition:
          "Maximal Lactate Steady State : intensité maximale soutenable sans accumulation de lactate. Formule : MLSS_pct = 1 − 0.337·VLa − 0.0021·(CE−200). Précision RMSE ≈ 2.64%.",
        explanation:
          "C'est le seuil d'or pour le coureur d'endurance. En dessous : on accumule de l'aérobie pure. Au dessus : la fatigue glycolytique s'installe. On calibre tempo, sweet-spot et seuil sur cette valeur.",
      },
      {
        id: "tte",
        icon: Timer,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        title: "4. TTE / Durabilité",
        value:
          tteEff && tteEff.tte_min > 0
            ? {
                text: `${Math.round(tteEff.tte_min)} min @ FTP (cible ${tteEff.target ?? "?"} min)`,
                missing: false,
              }
            : { text: "Données insuffisantes", missing: true },
        definition:
          "Time To Exhaustion : temps maintenable à FTP/seuil. Reflète la capacité à tenir longtemps une intensité élevée, indépendamment du VO₂max. Ajusté pour les masters (−2/−5/−8 min selon âge).",
        explanation:
          "Deux athlètes même FTP, TTE différents → préparations radicalement différentes. La durabilité prédit la performance Ironman / marathon mieux que la PMA. Un TTE < cible = priorité aux longs sweet-spot.",
      },
      {
        id: "fatmax-nutrition",
        icon: Flame,
        color: "text-amber-600",
        bg: "bg-amber-500/10",
        title: "5. FatMax + Nutrition Mader-Heck",
        value:
          fatmaxPct != null
            ? { text: `FatMax ≈ ${fatmaxPct.toFixed(0)}% FTP`, missing: false }
            : { text: "Données insuffisantes", missing: true },
        definition:
          "FatMax : intensité maximisant l'oxydation des lipides. Formule canonique : clamp(78 − 52·(VLa−0.25) + 0.15·(VO₂−50), 48, 82). Les besoins en glucides sont dérivés de Mader-Heck (et non d'une table forfaitaire 60 g/h).",
        explanation:
          "Sous FatMax → on entraîne la machine à brûler du gras (long bike, base aérobie). Au-dessus → on dépend du glycogène → on alimente. Cela dimensionne le plan nutritionnel de course (g/h CHO).",
      },
      {
        id: "no-fake",
        icon: ShieldCheck,
        color: "text-green-600",
        bg: "bg-green-500/10",
        title: "6. Politique « No Fake Defaults »",
        value: { text: "Active sur tous les calculs", missing: false },
        definition:
          "Quand une donnée manque (VLamax, VO₂max, TTE…), l'app affiche « Données insuffisantes » et confidence=0, au lieu d'inventer une valeur neutre. Aucune décision ne repose sur une estimation fantôme.",
        explanation:
          "C'est une garantie scientifique majeure : pas de faux 0.45 mmol/L/s par défaut, pas de 45 min de TTE inventé. Si la carte affiche « Données insuffisantes », il faut faire le test — pas deviner.",
      },
      {
        id: "pacing",
        icon: Route,
        color: "text-cyan-600",
        bg: "bg-cyan-500/10",
        title: "7. Pacing Envelope + Race Simulation",
        value: { text: "Voir onglet Simulation", missing: false },
        definition:
          "Simulation 3 scénarios (optimiste, réaliste, prudent) avec précision ±2-3%, bloc fiche route (NP/cardio/montée/TSS) et cues nutrition localisés (km/D+).",
        explanation:
          "Passer du diagnostic à l'action le jour J : connaître son enveloppe physiologique permet de partir au bon rythme et de ne pas exploser sur les bosses. Les cues nutrition disent quand prendre quoi.",
      },
      {
        id: "traceability",
        icon: FileSearch,
        color: "text-indigo-600",
        bg: "bg-indigo-500/10",
        title: "8. Traçabilité scientifique",
        value: { text: "Rapport d'audit signé SHA-256", missing: false },
        definition:
          "Toutes les prédictions sont versionnées dans calibration_evidence, literature_cohort, vlamax_trace, run_mlss_trace. Un rapport HTML signé SHA-256 consolide les preuves.",
        explanation:
          "L'app n'est pas une boîte noire. Pour une fédération, un staff ou un audit : on peut prouver d'où vient chaque chiffre, sur quelle cohorte le modèle est calibré, quand le profil a dérivé.",
      },
    ],
    [vo2, vlaVal, mlssRun, tteEff, fatmaxPct],
  );

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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Essentiels</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Les 8 piliers TFCL — données + définitions + pédagogie
            </p>
          </div>
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
            {currentAthlete && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                Snapshot : {effectiveSnapshot?.date ?? "aucun"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {!currentAthlete && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Sélectionnez un athlète pour afficher ses 8 essentiels.
            </CardContent>
          </Card>
        )}

        {currentAthlete && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${p.bg} shrink-0`}>
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${p.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base leading-tight">
                          {p.title}
                        </CardTitle>
                        <p
                          className={`text-xs sm:text-sm mt-1 font-medium ${
                            p.value.missing
                              ? "text-muted-foreground italic"
                              : "text-foreground"
                          }`}
                        >
                          {p.value.text}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="def" className="border-b-0">
                        <AccordionTrigger className="text-xs sm:text-sm py-2 hover:no-underline">
                          Définition & explication pédagogique
                        </AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm space-y-2 leading-relaxed">
                          <div>
                            <span className="font-semibold text-foreground">Définition. </span>
                            <span className="text-muted-foreground">{p.definition}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
                              Pourquoi c'est important.{" "}
                            </span>
                            <span className="text-muted-foreground">{p.explanation}</span>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pour aller plus loin : Dashboard (Compass complet), Diagnostic (audit signé),
              Simulation (race day).
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

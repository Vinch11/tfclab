import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Zap, 
  Battery, 
  Flame, 
  Gauge,
  ArrowRight,
  Activity,
  Heart
} from "lucide-react";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";

// Types
interface PhaseInfo {
  id: number;
  name: string;
  shortName: string;
  objectif: string;
  vlamaxNote: string;
  tteNote: string;
  nutritionNote: string;
  risquePrincipal: string;
  color: string;
  bgColor: string;
}

const PHASES: PhaseInfo[] = [
  {
    id: 1,
    name: "Développement du Potentiel",
    shortName: "Potentiel",
    objectif: "Augmenter la cylindrée (VO2max / puissance aérobie)",
    vlamaxNote: "Toléré ou légèrement élevé",
    tteNote: "Secondaire",
    nutritionNote: "Standard",
    risquePrincipal: "Fatigue nerveuse si mal dosé",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  {
    id: 2,
    name: "Transformation / Durabilité",
    shortName: "Durabilité",
    objectif: "Transformer la puissance en capacité soutenable",
    vlamaxNote: "Stabilisation ou baisse progressive",
    tteNote: "Priorité",
    nutritionNote: "Début d'optimisation",
    risquePrincipal: "Sous-estimation de la charge métabolique",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-500/30",
  },
  {
    id: 3,
    name: "Spécifique Objectif",
    shortName: "Spécifique",
    objectif: "Tenir l'allure cible avec le bon carburant",
    vlamaxNote: "Doit être compatible avec l'objectif",
    tteNote: "Critique",
    nutritionNote: "Centrale (g/h, tolérance)",
    risquePrincipal: "Dérive + déplétion glucidique",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-500/30",
  },
  {
    id: 4,
    name: "Affûtage / Stabilisation",
    shortName: "Affûtage",
    objectif: "Exprimer le potentiel",
    vlamaxNote: "Ne plus modifier",
    tteNote: "Maintien",
    nutritionNote: "Sécurisation",
    risquePrincipal: "Surcharge tardive",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/30",
  },
  {
    id: 5,
    name: "Transition / Régénération",
    shortName: "Transition",
    objectif: "Récupération systémique",
    vlamaxNote: "Non prioritaire",
    tteNote: "Non prioritaire",
    nutritionNote: "Libre",
    risquePrincipal: "Reprise trop précoce",
    color: "text-slate-600",
    bgColor: "bg-slate-500/10 border-slate-500/30",
  },
];

// Objectif labels
const OBJECTIF_LABELS: Record<string, string> = {
  IM: "Ironman",
  "703": "Half Ironman (70.3)",
  "70.3": "Half Ironman (70.3)",
  Half: "Half Ironman",
  Marathon: "Marathon",
  Semi: "Semi-Marathon",
  OD: "Distance Olympique",
  Olympic: "Distance Olympique",
  Sprint: "Sprint",
  Trail: "Trail",
  TrailLong: "Trail Long",
  TrailUltra: "Ultra Trail",
  Course: "Course à pied",
};

interface SaisonPhasesViewProps {
  athleteName: string;
  objectif: string;
  dateCible?: string | null;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: PotentielPhysiologiqueEffectif;
  onGoToPotentiel: () => void;
  onGoToPhysioAnalysis: () => void;
  onGoToNutrition?: () => void;
}

export function SaisonPhasesView({
  athleteName,
  objectif,
  dateCible,
  vlamaxEffectif,
  tteEffectif,
  readiness,
  onGoToPotentiel,
  onGoToPhysioAnalysis,
  onGoToNutrition,
}: SaisonPhasesViewProps) {
  // Déterminer la phase probable basée sur les données physiologiques
  const phaseAnalysis = useMemo(() => {
    const vlamax = vlamaxEffectif.value;
    const tte = tteEffectif.tte_min;
    const tteTarget = tteEffectif.target ?? null;
    const score = readiness.score;
    const vlamaxSource = vlamaxEffectif.source;
    
    const incohérences: string[] = [];
    let phaseProposed = 1;
    let coherence: "faible" | "modéré" | "élevé" = "modéré";

    // Logique de détermination de phase
    if (!vlamax || vlamaxSource === "unknown") {
      incohérences.push("VLamax non disponible — phase difficile à évaluer précisément");
      coherence = "faible";
    }

    // Objectifs longue distance (IM, 703, Marathon, Trail)
    const isLongDistance = ["IM", "703", "70.3", "Half", "Marathon", "TrailLong", "TrailUltra"].includes(objectif);

    if (vlamax !== null && tte !== null && tteTarget !== null) {
      // Phase 1: Potentiel (VLamax élevé, TTE pas critique)
      if (vlamax > 0.5 && tte < tteTarget * 0.7) {
        phaseProposed = 1;
        if (isLongDistance && vlamax > 0.6) {
          incohérences.push("VLamax très élevé pour objectif longue distance");
        }
      }
      // Phase 2: Durabilité (VLamax en baisse, TTE en construction)
      else if (vlamax > 0.35 && vlamax <= 0.5 && tte < tteTarget * 0.9) {
        phaseProposed = 2;
      }
      // Phase 3: Spécifique (VLamax compatible, TTE proche cible)
      else if (vlamax <= 0.4 && tte >= tteTarget * 0.85) {
        phaseProposed = 3;
        if (isLongDistance && vlamax > 0.4) {
          incohérences.push("VLamax encore élevé pour phase spécifique longue distance");
        }
      }
      // Phase 4: Affûtage (tout aligné, score élevé)
      else if (score >= 75 && tte >= tteTarget) {
        phaseProposed = 4;
      }
      // Transition: Score très bas ou récupération
      else if (score < 40) {
        phaseProposed = 5;
      }
      // Default: Phase 2 (durabilité)
      else {
        phaseProposed = 2;
      }
    } else if (tteTarget === null) {
      incohérences.push("Cible TTE non définie — phase basée sur VLamax uniquement");
    }

    // Détection incohérences spécifiques
    if (phaseProposed === 3 && isLongDistance && vlamax && vlamax > 0.45) {
      incohérences.push("Phase spécifique avec VLamax > 0.45 : risque de dérive métabolique");
    }
    if (phaseProposed === 3 && tte !== null && tteTarget !== null && tte < tteTarget * 0.8) {
      incohérences.push("Phase spécifique mais TTE insuffisant : durabilité non acquise");
    }
    if (phaseProposed === 4 && score < 70) {
      incohérences.push("Affûtage envisagé mais score Potentiel Physiologique < 70%");
    }

    // Calcul cohérence globale
    if (incohérences.length === 0) {
      coherence = "élevé";
    } else if (incohérences.length <= 2) {
      coherence = "modéré";
    } else {
      coherence = "faible";
    }

    return {
      phaseProposed,
      phase: PHASES[phaseProposed - 1],
      incohérences,
      coherence,
    };
  }, [vlamaxEffectif, tteEffectif, readiness, objectif]);

  const coherenceColor = {
    faible: "text-destructive",
    modéré: "text-amber-600",
    élevé: "text-green-600",
  }[phaseAnalysis.coherence];

  const coherenceBg = {
    faible: "bg-destructive/10 border-destructive/30",
    modéré: "bg-amber-500/10 border-amber-500/30",
    élevé: "bg-green-500/10 border-green-500/30",
  }[phaseAnalysis.coherence];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête : Contexte saisonnier */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Saison & Phases — Lecture Physiologique
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {athleteName}
              </p>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1">
              {OBJECTIF_LABELS[objectif] || objectif}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Cette vue ne planifie pas. Elle vous aide à lire la logique physiologique de la saison.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Objectif */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                Objectif principal
              </div>
              <p className="font-semibold">{OBJECTIF_LABELS[objectif] || objectif}</p>
            </div>

            {/* Date cible */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Date cible
              </div>
              <p className="font-semibold">{dateCible || "Non renseignée"}</p>
            </div>

            {/* Cohérence saisonnière */}
            <div className={`p-4 rounded-lg border ${coherenceBg}`}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Cohérence saisonnière
              </div>
              <p className={`font-semibold capitalize ${coherenceColor}`}>
                {phaseAnalysis.coherence}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frise des phases */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Phases de développement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {PHASES.map((phase) => (
              <div
                key={phase.id}
                className={`flex-1 min-w-[140px] p-3 rounded-lg border-2 transition-all ${
                  phase.id === phaseAnalysis.phaseProposed
                    ? `${phase.bgColor} border-2 ring-2 ring-primary/30`
                    : "bg-muted/30 border-transparent opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${phase.color}`}>
                    Phase {phase.id}
                  </span>
                  {phase.id === phaseAnalysis.phaseProposed && (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  )}
                </div>
                <p className="text-sm font-medium">{phase.shortName}</p>
              </div>
            ))}
          </div>

          {/* Phase actuelle détaillée */}
          <div className={`p-4 rounded-lg border-2 ${phaseAnalysis.phase.bgColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={phaseAnalysis.phase.color} variant="outline">
                Phase {phaseAnalysis.phaseProposed}
              </Badge>
              <span className="font-semibold">{phaseAnalysis.phase.name}</span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Selon les données actuelles, l'athlète présente des caractéristiques compatibles avec cette phase.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logique physiologique par phase */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Logique physiologique — Phase actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Objectif physiologique */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Target className="h-4 w-4 text-primary" />
                Objectif physiologique
              </div>
              <p className="text-sm text-muted-foreground">
                {phaseAnalysis.phase.objectif}
              </p>
            </div>

            {/* VLamax */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
                VLamax
              </div>
              <p className="text-sm text-muted-foreground">
                {phaseAnalysis.phase.vlamaxNote}
              </p>
              {vlamaxEffectif.value && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Actuel : {vlamaxEffectif.value.toFixed(2)} mmol/L/s
                </p>
              )}
            </div>

            {/* TTE */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Battery className="h-4 w-4 text-green-500" />
                TTE
              </div>
              <p className="text-sm text-muted-foreground">
                {phaseAnalysis.phase.tteNote}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Actuel : {tteEffectif.tte_min} min / Cible : {tteEffectif.target ?? "—"} min
              </p>
            </div>

            {/* Nutrition */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Nutrition
              </div>
              <p className="text-sm text-muted-foreground">
                {phaseAnalysis.phase.nutritionNote}
              </p>
            </div>
          </div>

          {/* Risque principal */}
          <Alert className="mt-4 border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-sm text-amber-600">Risque principal</AlertTitle>
            <AlertDescription className="text-sm">
              {phaseAnalysis.phase.risquePrincipal}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Incohérences détectées */}
      {phaseAnalysis.incohérences.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Incohérences possibles détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {phaseAnalysis.incohérences.map((inc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4 italic">
              ⚠️ Aucun verrou, aucun forçage. Ces observations aident à la réflexion.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liens contextuels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Modules liés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onGoToPotentiel}>
              <Heart className="h-4 w-4 mr-2" />
              Potentiel Physiologique
            </Button>
            <Button variant="outline" onClick={onGoToPhysioAnalysis}>
              <Activity className="h-4 w-4 mr-2" />
              Analyse Physiologique
            </Button>
            {onGoToNutrition && phaseAnalysis.phaseProposed >= 3 && (
              <Button variant="outline" onClick={onGoToNutrition}>
                <Flame className="h-4 w-4 mr-2" />
                Nutrition Prédictive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Détail de toutes les phases (accordéon conceptuel) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Référentiel des phases
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PHASES.map((phase) => (
            <div
              key={phase.id}
              className={`p-4 rounded-lg border ${
                phase.id === phaseAnalysis.phaseProposed
                  ? phase.bgColor
                  : "bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={phase.color}>
                  Phase {phase.id}
                </Badge>
                <span className="font-medium">{phase.name}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Objectif :</span>{" "}
                  {phase.objectif}
                </div>
                <div>
                  <span className="text-muted-foreground">VLamax :</span>{" "}
                  {phase.vlamaxNote}
                </div>
                <div>
                  <span className="text-muted-foreground">TTE :</span>{" "}
                  {phase.tteNote}
                </div>
                <div>
                  <span className="text-muted-foreground">Nutrition :</span>{" "}
                  {phase.nutritionNote}
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Risque :</span>{" "}
                  <span className="text-amber-600">{phase.risquePrincipal}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Message Staff Central */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-medium">Message Staff</AlertTitle>
        <AlertDescription className="text-sm mt-2 space-y-2">
          <p>
            <strong>Two For Coaching Lab ne remplace pas le coach.</strong>
          </p>
          <p>
            Cette vue structure la réflexion physiologique.
            La planification reste un choix humain, contextuel et stratégique.
          </p>
        </AlertDescription>
      </Alert>

      {/* Règles absolues */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">✗ Aucune séance générée</Badge>
            <Badge variant="secondary">✗ Aucun volume proposé</Badge>
            <Badge variant="secondary">✗ Aucun rythme imposé</Badge>
            <Badge variant="secondary">✗ Aucune date automatique</Badge>
            <Badge variant="secondary">✗ Aucune décision à la place du coach</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Cette vue est un cadre de lecture, pas un plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Double Boucle CAP — TFCL Method™
 * Boucle lente (profil verrouillé 4-6 sem) + Boucle rapide (décision hebdo)
 * ✅ Seuils contextualisés par ambition
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { evaluateVLamax, evaluateReadiness } from "@/lib/ambitionThresholds";

interface DoubleBoucleCAPCardProps {
  vlamaxRun: number | null;
  vo2max: number | null;
  durability: number;
  objectif: string;
  readinessScore: number | null;
  confidence: number;
  ambition?: AmbitionLevel;
}

export function DoubleBoucleCAPCard({ vlamaxRun, vo2max, durability, objectif, readinessScore, confidence, ambition = DEFAULT_AMBITION }: DoubleBoucleCAPCardProps) {
  const isRunning = ["Marathon", "Semi-Marathon", "Semi", "10K", "5K", "Trail", "TrailShort", "TrailMountain", "TrailUltra"].some(g => objectif.includes(g));
  const ambDef = getAmbitionDefinition(ambition);

  // Guard: données insuffisantes si running mais pas de données physio
  if (isRunning && vlamaxRun === null && vo2max === null && durability === 0) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Double Boucle CAP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Renseignez VLamax, VO₂max ou TTE dans un snapshot pour activer la Double Boucle.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isRunning) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Double Boucle CAP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette section s'applique aux objectifs Course à Pied (Marathon, Semi, Trail...).
          </p>
        </CardContent>
      </Card>
    );
  }

  // Évaluations dynamiques par ambition
  const vlamaxEval = evaluateVLamax(vlamaxRun, objectif, ambition);
  const readinessEval = evaluateReadiness(readinessScore, ambition);

  const getLever = () => {
    if (!vlamaxRun) return { emoji: "🫀", label: "Endurance Aérobie" };
    if (vlamaxEval.status === "critical") return { emoji: "⬇️", label: "Baisser VLamax" };
    if (durability < 40) return { emoji: "⏱️", label: "Améliorer Durabilité" };
    if (vo2max && vo2max < 55) return { emoji: "🔥", label: "Développer VO2max" };
    return { emoji: "✅", label: "Maintien Profil" };
  };

  const lever = getLever();
  const readinessColor = readinessEval.status === "ok" ? "text-green-600" : readinessEval.status === "warning" ? "text-amber-600" : "text-red-600";
  const readinessLabel = readinessEval.status === "ok" ? "Bonne" : readinessEval.status === "warning" ? "Modérée" : "Faible";
  const readinessBg = readinessEval.status === "ok" ? "bg-green-500/10 border-green-500/20" : readinessEval.status === "warning" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
  const rs = readinessScore ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Double Boucle CAP — TFCL Method™
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ambDef.icon} {ambDef.shortLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg p-3 bg-primary/5 border border-primary/10">
          <p className="text-xs text-primary">
            <strong>📋 Concept :</strong> La Double Boucle sépare le <strong>Profil Verrouillé</strong> (boucle lente, 4-6 semaines) 
            de la <strong>Décision Hebdomadaire</strong> (boucle rapide).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Boucle Lente */}
          <div className="rounded-xl p-4 border-2 border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Boucle Lente (4-6 sem)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">VLamax CAP</span><span className="font-medium">{vlamaxRun ? vlamaxRun.toFixed(2) + ' mmol/L/s' : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VO₂max</span><span className="font-medium">{vo2max ? vo2max + ' ml/kg/min' : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Durabilité</span><span className="font-medium">{durability} min</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Objectif</span><span className="font-medium">{objectif}</span></div>
            </div>
            <div className="rounded-lg p-2 bg-background/80 flex items-center gap-2">
              <span className="text-lg">{lever.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-primary">{lever.label}</p>
                <p className="text-[10px] text-muted-foreground">Levier prioritaire du bloc</p>
              </div>
            </div>
          </div>

          {/* Boucle Rapide */}
          <div className={cn("rounded-xl p-4 border-2 space-y-3", readinessBg)}>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-semibold">Boucle Rapide (hebdo)</span>
            </div>
            <div className={cn("rounded-lg p-4 text-center", readinessBg)}>
              <p className="text-[10px] text-muted-foreground uppercase">Disponibilité</p>
              <p className={cn("text-2xl font-bold", readinessColor)}>{readinessLabel}</p>
              <p className={cn("text-xs", readinessColor)}>Score: {rs}% • Cible: {readinessEval.target}</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intensité autorisée</span>
                <span className="font-medium">{readinessEval.status === "ok" ? 'Haute ✓' : readinessEval.status === "warning" ? 'Modérée' : 'Faible ✗'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Long run</span>
                <span className="font-medium">{rs >= 50 ? '✓ Autorisé' : '✗ Non recommandé'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Séances clés max</span>
                <span className="font-medium">{readinessEval.status === "ok" ? '3' : readinessEval.status === "warning" ? '2' : '1'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confiance</span>
                <span className="font-medium">{Math.round(confidence * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          💡 La boucle lente verrouille le profil physiologique pendant 4-6 semaines. 
          La boucle rapide ajuste les décisions hebdomadaires sans modifier les seuils.
        </p>
      </CardContent>
    </Card>
  );
}

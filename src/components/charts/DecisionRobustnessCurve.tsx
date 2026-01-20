/**
 * TFCL Decision Robustness Curve™
 * 
 * Graphique signature montrant les rendements décroissants entre
 * précision physiologique et qualité de décision coaching.
 */

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, AlertTriangle, CheckCircle2, Beaker, BookOpen } from "lucide-react";
import {
  generateDecisionCurvePoints,
  computePrecisionScoreTFCL,
  computeLabRecommendation,
  getDecisionMessage,
  getZoneAdvice,
  DECISION_ZONES,
  type PrecisionInput,
  type PrecisionScore,
  type LabRecommendation,
} from "@/lib/v2/decisionRobustness";

interface DecisionRobustnessCurveProps {
  input: PrecisionInput;
  compact?: boolean;
  onOpenAcademy?: () => void;
}

// Custom tooltip pour le point mobile
function AthleteMarkerTooltip({
  precisionScore,
  labReco,
}: {
  precisionScore: PrecisionScore;
  labReco: LabRecommendation;
}) {
  const { score, breakdown, zone, zoneLabel, decisionQuality } = precisionScore;
  const message = getDecisionMessage(score, labReco);
  
  return (
    <div className="bg-popover border border-border rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant="outline"
          className={
            zone === "illusion"
              ? "border-destructive text-destructive"
              : zone === "robust"
              ? "border-green-500 text-green-600 dark:text-green-400"
              : "border-blue-500 text-blue-600 dark:text-blue-400"
          }
        >
          {zoneLabel}
        </Badge>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Précision TFCL</span>
          <span className="font-semibold">{score}/100</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Qualité décision</span>
          <span className="font-semibold">{decisionQuality}/100</span>
        </div>
      </div>
      
      {/* Décomposition */}
      <div className="space-y-1 text-xs border-t border-border pt-2 mb-3">
        <p className="text-muted-foreground font-medium mb-1">Décomposition :</p>
        <div className="grid grid-cols-2 gap-x-2">
          <span>Base</span>
          <span className="text-right">+{breakdown.base}</span>
          <span>VLamax</span>
          <span className="text-right">+{breakdown.vlamaxContribution}</span>
          <span>TTE</span>
          <span className="text-right">+{breakdown.tteContribution}</span>
          {breakdown.vo2maxContribution > 0 && (
            <>
              <span>VO₂max</span>
              <span className="text-right">+{breakdown.vo2maxContribution}</span>
            </>
          )}
          {breakdown.clusterContribution > 0 && (
            <>
              <span>Cluster</span>
              <span className="text-right">+{breakdown.clusterContribution}</span>
            </>
          )}
          {breakdown.testsContribution > 0 && (
            <>
              <span>Tests P30/60/MAP</span>
              <span className="text-right">+{breakdown.testsContribution}</span>
            </>
          )}
          <span>Protocole</span>
          <span className="text-right">+{breakdown.protocolBonus}</span>
        </div>
      </div>
      
      {/* Message principal */}
      <div
        className={`text-sm p-2 rounded ${
          labReco.recommended
            ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            : "bg-green-500/10 text-green-700 dark:text-green-400"
        }`}
      >
        {labReco.recommended ? (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
      
      {/* Raisons si labo recommandé */}
      {labReco.reasons.length > 0 && (
        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
          {labReco.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1">
              <span>•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DecisionRobustnessCurve({
  input,
  compact = false,
  onOpenAcademy,
}: DecisionRobustnessCurveProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Calculs
  const curvePoints = useMemo(() => generateDecisionCurvePoints(50), []);
  const precisionScore = useMemo(() => computePrecisionScoreTFCL(input), [input]);
  const labReco = useMemo(
    () => computeLabRecommendation(input, precisionScore.score),
    [input, precisionScore.score]
  );
  
  // Point de l'athlète
  const athletePoint = {
    x: precisionScore.score,
    y: precisionScore.decisionQuality,
  };
  
  // Couleur du marqueur selon la zone
  const markerColor =
    precisionScore.zone === "illusion"
      ? "hsl(var(--destructive))"
      : precisionScore.zone === "robust"
      ? "hsl(142, 60%, 45%)"
      : "hsl(220, 60%, 50%)";

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-primary" />
              Robustesse décisionnelle
            </span>
            <Badge
              variant="outline"
              className={
                precisionScore.zone === "illusion"
                  ? "border-destructive text-destructive"
                  : precisionScore.zone === "robust"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-blue-500 text-blue-600 dark:text-blue-400"
              }
            >
              {precisionScore.score}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curvePoints} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                {/* Zones de fond */}
                <ReferenceArea x1={0} x2={35} fill="hsl(0, 60%, 50%)" fillOpacity={0.1} />
                <ReferenceArea x1={35} x2={75} fill="hsl(142, 60%, 45%)" fillOpacity={0.15} />
                <ReferenceArea x1={75} x2={100} fill="hsl(220, 60%, 50%)" fillOpacity={0.1} />
                
                <XAxis dataKey="x" hide />
                <YAxis hide domain={[0, 100]} />
                
                {/* Courbe principale */}
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                />
                
                {/* Point athlète */}
                <ReferenceDot
                  x={athletePoint.x}
                  y={athletePoint.y}
                  r={6}
                  fill={markerColor}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {precisionScore.zoneLabel}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-primary" />
            TFCL Decision Robustness Curve™
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                precisionScore.zone === "illusion"
                  ? "border-destructive text-destructive"
                  : precisionScore.zone === "robust"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-blue-500 text-blue-600 dark:text-blue-400"
              }
            >
              {precisionScore.score}/100
            </Badge>
            {onOpenAcademy && (
              <Button variant="ghost" size="sm" onClick={onOpenAcademy} className="gap-1">
                <BookOpen className="w-4 h-4" />
                Comprendre
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Graphique principal */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={curvePoints} margin={{ top: 20, right: 20, bottom: 30, left: 40 }}>
              {/* Zones de fond */}
              <ReferenceArea
                x1={0}
                x2={35}
                fill="hsl(0, 60%, 50%)"
                fillOpacity={0.1}
                label={{ value: "Illusion", position: "insideTop", fontSize: 10, fill: "hsl(0, 60%, 50%)" }}
              />
              <ReferenceArea
                x1={35}
                x2={75}
                fill="hsl(142, 60%, 45%)"
                fillOpacity={0.15}
                label={{ value: "TFCL", position: "insideTop", fontSize: 10, fill: "hsl(142, 60%, 45%)" }}
              />
              <ReferenceArea
                x1={75}
                x2={100}
                fill="hsl(220, 60%, 50%)"
                fillOpacity={0.1}
                label={{ value: "Labo", position: "insideTop", fontSize: 10, fill: "hsl(220, 60%, 50%)" }}
              />
              
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="x"
                label={{ value: "Précision physiologique (%)", position: "bottom", offset: 10 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                label={{ value: "Qualité de décision", angle: -90, position: "insideLeft", offset: 10 }}
                domain={[0, 100]}
              />
              
              {/* Courbe principale */}
              <Area
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="hsl(var(--primary))"
                fillOpacity={0.08}
                name="Rendement décisionnel"
              />
              
              {/* Point athlète */}
              <ReferenceDot
                x={athletePoint.x}
                y={athletePoint.y}
                r={8}
                fill={markerColor}
                stroke="hsl(var(--background))"
                strokeWidth={3}
                onClick={() => setShowTooltip(true)}
                style={{ cursor: "pointer" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Texte explicatif pédagogique */}
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                Pourquoi cette courbe ?
              </p>
              <p className="text-muted-foreground">
                La <strong className="text-foreground">Decision Robustness Curve™</strong> illustre la loi des <em>rendements décroissants</em> : 
                au-delà d'un certain niveau de précision physiologique, chaque point supplémentaire 
                apporte un gain marginal pour la qualité des décisions coaching.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">TFCL</strong> se positionne dans la zone de <em>décision robuste</em> : 
                suffisamment précis pour guider l'entraînement efficacement, 
                tout en restant transparent sur les limites méthodologiques.
              </p>
              <p className="text-muted-foreground text-xs italic">
                Les tests laboratoire (zone "Labo") offrent une précision maximale, 
                utile dans des cas spécifiques (athlète élite, incohérence détectée, objectif majeur à fort enjeu).
              </p>
            </div>
          </div>
        </div>

        {/* Légende des zones */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {DECISION_ZONES.map((zone) => (
            <div
              key={zone.id}
              className="p-2 rounded border"
              style={{
                borderColor: zone.color,
                backgroundColor: `${zone.color}10`,
              }}
            >
              <p className="font-medium" style={{ color: zone.color }}>
                {zone.label}
              </p>
              <p className="text-muted-foreground mt-0.5">{zone.description}</p>
            </div>
          ))}
        </div>

        {/* Conseil de zone */}
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          {getZoneAdvice(precisionScore.zone)}
        </div>

        {/* Dialog détails */}
        <Dialog open={showTooltip} onOpenChange={setShowTooltip}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Position sur la courbe
              </DialogTitle>
              <DialogDescription>
                Détail du calcul de précision et recommandation
              </DialogDescription>
            </DialogHeader>
            <AthleteMarkerTooltip precisionScore={precisionScore} labReco={labReco} />
          </DialogContent>
        </Dialog>

        {/* Bouton pour ouvrir le détail */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowTooltip(true)}
        >
          <Info className="w-4 h-4 mr-2" />
          Voir le détail du score ({precisionScore.score}/100)
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from "react";
import {
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Save,
  PersonStanding,
  TrendingUp,
  History,
  Info,
  AlertCircle,
  ChevronDown,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Athlete } from "@/types/athlete";
import { StoredTestResult } from "@/types/testLibrary";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateAge } from "@/lib/ageAdjustment";
import {
  getAgeAdjustedVLamaxProfil,
  getAgeAdjustedVLamaxThresholds,
  computeAgeAdjustmentIndex,
} from "@/lib/ageAdjustment";

interface VLamaxRunFieldTestProps {
  athlete: Athlete | null;
  onAthleteUpdate?: (athlete: Athlete) => void;
  onTestSaved?: (result: StoredTestResult) => void;
  className?: string;
}

// Constantes du protocole
const TEST_ID = "run_vlamax_sprint15_12min";
const TEST_NOM = "VLamax CAP – Sprint 15s + 12 min";
const TEST_FIABILITE = 0.80;

// Calcul VLamax selon formule officielle
function computeVLamaxRun(
  distSprint1: number,
  distSprint2: number,
  dist12min: number
): { vlamax: number; v15: number; v12: number; srRun: number } {
  // Meilleure distance sur 15s
  const bestD15 = Math.max(distSprint1, distSprint2);
  const v15 = bestD15 / 15; // m/s
  const v12 = dist12min / 720; // 12 min = 720 s

  // Sprint Ratio course
  const srRun = v15 / v12;

  // Formule VLamax_run
  const normalized = Math.max(0, Math.min(1, (srRun - 1.55) / 0.35));
  let vlamax = 0.25 + 0.55 * normalized;
  vlamax = Math.max(0.25, Math.min(0.95, vlamax));

  return { vlamax, v15, v12, srRun };
}

// Calcul indice de confiance
function computeConfidence(distSprint1: number, distSprint2: number): number {
  // Écart entre les 2 sprints
  const maxD = Math.max(distSprint1, distSprint2);
  const minD = Math.min(distSprint1, distSprint2);
  const ecartPct = maxD > 0 ? ((maxD - minD) / maxD) * 100 : 0;

  // Règles de confiance
  if (ecartPct < 3) {
    return 0.85; // Protocole propre
  } else if (ecartPct < 6) {
    return 0.70; // Un critère moyen
  } else {
    return 0.55; // Conditions imparfaites
  }
}

// Interprétation du profil avec ajustement par âge
function getProfileInterpretation(
  vlamax: number,
  age: number | null
): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  ageContext: string | null;
} {
  const { profil, label: profilLabel, ageContext } = getAgeAdjustedVLamaxProfil(vlamax, age);
  const thresholds = getAgeAdjustedVLamaxThresholds(age);
  
  // Mapper le profil vers les couleurs et descriptions spécifiques CAP
  switch (profil) {
    case "diesel":
    case "endurant":
      return {
        label: `Profil Endurance${age !== null && age >= 40 ? " (ajusté)" : ""}`,
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        description: "Excellent potentiel sur longue distance. Capacité glycolytique modérée, favorise l'oxydation des graisses.",
        ageContext
      };
    case "equilibre":
      return {
        label: `Profil Équilibré${age !== null && age >= 40 ? " (ajusté)" : ""}`,
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        description: "Polyvalence métabolique. Bonne gestion des efforts variés du 10 km au marathon.",
        ageContext
      };
    case "explosif":
    case "sprinter":
      return {
        label: `Profil Glycolytique${age !== null && age >= 40 ? " (ajusté)" : ""}`,
        color: "text-orange-600",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        description: age !== null && age >= 40
          ? "Forte capacité anaérobie pour l'âge. Attention à la récupération sur les efforts longs."
          : "Forte capacité anaérobie. Avantage sur les efforts courts et les changements de rythme.",
        ageContext
      };
    default:
      return {
        label: "Profil Équilibré",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        description: "Polyvalence métabolique.",
        ageContext: null
      };
  }
}

// Filtrer l'historique des tests VLamax CAP
function getTestHistory(athlete: Athlete | null): StoredTestResult[] {
  if (!athlete?.tests) return [];
  return athlete.tests
    .filter(t => t.type === "VLAMAX" && t.nom === TEST_NOM)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function VLamaxRunFieldTest({
  athlete,
  onAthleteUpdate,
  onTestSaved,
  className
}: VLamaxRunFieldTestProps) {
  const { toast } = useToast();

  // Inputs
  const [distSprint1, setDistSprint1] = useState("");
  const [distSprint2, setDistSprint2] = useState("");
  const [dist12min, setDist12min] = useState("");
  const [hrAvg12min, setHrAvg12min] = useState("");
  const [comment, setComment] = useState("");

  // État du résultat calculé
  const [result, setResult] = useState<{
    vlamax: number;
    v15: number;
    v12: number;
    srRun: number;
    confidence: number;
  } | null>(null);

  // Historique
  const testHistory = useMemo(() => getTestHistory(athlete), [athlete?.tests]);

  // Validation des inputs
  const isValid = useMemo(() => {
    const d1 = parseFloat(distSprint1);
    const d2 = parseFloat(distSprint2);
    const d12 = parseFloat(dist12min);
    return d1 > 0 && d2 > 0 && d12 > 0 && d12 >= 1000 && d12 <= 5000;
  }, [distSprint1, distSprint2, dist12min]);

  // Calculer VLamax
  const handleCalculate = () => {
    const d1 = parseFloat(distSprint1);
    const d2 = parseFloat(distSprint2);
    const d12 = parseFloat(dist12min);

    if (!isValid) {
      toast({
        title: "Données invalides",
        description: "Vérifiez les valeurs saisies.",
        variant: "destructive"
      });
      return;
    }

    const calc = computeVLamaxRun(d1, d2, d12);
    const confidence = computeConfidence(d1, d2);

    setResult({ ...calc, confidence });
  };

  // Sauvegarder le test
  const handleSave = () => {
    if (!athlete || !result) return;

    const d1 = parseFloat(distSprint1);
    const d2 = parseFloat(distSprint2);
    const d12 = parseFloat(dist12min);
    const hr = hrAvg12min ? parseFloat(hrAvg12min) : null;

    const stored: StoredTestResult = {
      id: `${TEST_ID}_${Date.now()}`,
      type: "VLAMAX",
      nom: TEST_NOM,
      sport: "Course à pied",
      date: new Date().toISOString(),
      fiabilite: result.confidence,
      vlamax: result.vlamax,
      raw: {
        distSprint1: d1,
        distSprint2: d2,
        dist12min: d12,
        v15: result.v15,
        v12: result.v12,
        srRun: result.srRun,
        ...(hr && { hrAvg12min: hr })
      },
      note: `Sprint Ratio: ${result.srRun.toFixed(2)} | V15: ${result.v15.toFixed(2)} m/s | V12: ${result.v12.toFixed(2)} m/s`,
      source: "library",
      notes: comment.trim() || undefined
    };

    // Mettre à jour l'athlète
    const updatedAthlete = {
      ...athlete,
      tests: [...(athlete.tests || []), stored]
    };

    if (onAthleteUpdate) {
      onAthleteUpdate(updatedAthlete);
    }

    if (onTestSaved) {
      onTestSaved(stored);
    }

    toast({
      title: "Test VLamax CAP sauvegardé 🏃",
      description: (
        <div className="space-y-1 text-sm">
          <p>VLamax CAP: <strong>{result.vlamax.toFixed(2)} mmol/L/s</strong></p>
          <p>Confiance: {Math.round(result.confidence * 100)}%</p>
        </div>
      )
    });

    // Reset form
    setDistSprint1("");
    setDistSprint2("");
    setDist12min("");
    setHrAvg12min("");
    setComment("");
    setResult(null);
  };

  // Données pour le graphique historique
  const chartData = useMemo(() => {
    return testHistory
      .slice()
      .reverse()
      .map(t => ({
        date: format(parseISO(t.date), "dd MMM", { locale: fr }),
        fullDate: t.date,
        vlamax: t.vlamax,
        confidence: t.fiabilite
      }));
  }, [testHistory]);

  const athleteAge = athlete?.dateNaissance ? calculateAge(athlete.dateNaissance) : null;
  const profile = result ? getProfileInterpretation(result.vlamax, athleteAge) : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <PersonStanding className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{TEST_NOM}</CardTitle>
              <CardDescription>
                Test terrain officiel Two For Coaching Lab
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Objectif */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            Objectif du test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ce test permet d'estimer la VLamax en course à pied à partir d'un sprint court 
            (indice glycolytique) et d'un effort durable au seuil (indice aérobie).
          </p>
        </CardContent>
      </Card>

      {/* Protocole */}
      <Card>
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  Protocole officiel – RVFT (Sprint + 12 min)
                </span>
                <ChevronDown className="w-4 h-4 transition-transform" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Matériel */}
              <div>
                <h4 className="font-medium text-sm mb-2">Matériel</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Piste ou parcours plat mesuré (idéalement piste 400 m)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Montre GPS fiable ou footpod
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Ceinture HR recommandée
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Chronomètre
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Conditions */}
              <div>
                <h4 className="font-medium text-sm mb-2">Conditions</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    48 h sans séance intense
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    Pas de vent fort
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    Échauffement standardisé
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Étape A */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-primary">Étape A — Sprint 15 s maximal</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">1.</span>
                    Échauffement : 15–20 min Z2 + 4×20 s progressif
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">2.</span>
                    2 répétitions : 15 s all-out départ lancé
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">3.</span>
                    5–6 min récupération complète entre chaque
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">→</span>
                    On retient la meilleure distance sur 15 s
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Étape B */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-primary">Étape B — Test 12 min maximal</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">1.</span>
                    10–12 min récupération facile après les sprints
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">2.</span>
                    12 min all-out régulier
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-mono">→</span>
                    On retient la distance totale
                  </li>
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Saisie des données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Saisie des données
          </CardTitle>
          {!athlete && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sélectionnez un athlète pour saisir un test.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sprint 15s */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sprint 15 secondes (2 tentatives)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sprint1">Distance sprint 1 (m) *</Label>
                <Input
                  id="sprint1"
                  type="number"
                  placeholder="Ex: 85"
                  value={distSprint1}
                  onChange={e => setDistSprint1(e.target.value)}
                  disabled={!athlete}
                  min={30}
                  max={150}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 30–150 m</p>
              </div>
              <div>
                <Label htmlFor="sprint2">Distance sprint 2 (m) *</Label>
                <Input
                  id="sprint2"
                  type="number"
                  placeholder="Ex: 87"
                  value={distSprint2}
                  onChange={e => setDistSprint2(e.target.value)}
                  disabled={!athlete}
                  min={30}
                  max={150}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 30–150 m</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test 12 min */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Test 12 minutes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dist12">Distance 12 min (m) *</Label>
                <Input
                  id="dist12"
                  type="number"
                  placeholder="Ex: 3200"
                  value={dist12min}
                  onChange={e => setDist12min(e.target.value)}
                  disabled={!athlete}
                  min={1000}
                  max={5000}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 1000–5000 m</p>
              </div>
              <div>
                <Label htmlFor="hr12">FC moyenne 12 min (bpm)</Label>
                <Input
                  id="hr12"
                  type="number"
                  placeholder="Optionnel"
                  value={hrAvg12min}
                  onChange={e => setHrAvg12min(e.target.value)}
                  disabled={!athlete}
                  min={100}
                  max={220}
                />
                <p className="text-xs text-muted-foreground mt-1">Optionnel</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Commentaire */}
          <div>
            <Label htmlFor="comment">Commentaire test (optionnel)</Label>
            <Textarea
              id="comment"
              placeholder="Conditions : fatigue, vent, terrain..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={!athlete}
              maxLength={500}
              className="mt-1"
            />
          </div>

          {/* Bouton calcul */}
          <Button
            onClick={handleCalculate}
            disabled={!athlete || !isValid}
            className="w-full"
            size="lg"
          >
            Calculer VLamax CAP
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {result && (
        <Card className="border-primary/30">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Résultats du test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* VLamax principale */}
            <div className="text-center p-6 rounded-xl bg-secondary/30">
              <p className="text-sm text-muted-foreground mb-1">VLamax CAP estimée</p>
              <p className="text-4xl font-bold text-primary">
                {result.vlamax.toFixed(2)}
                <span className="text-lg ml-1 font-normal text-muted-foreground">mmol/L/s</span>
              </p>
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Confiance</p>
                <p className="text-lg font-semibold">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">V15 (m/s)</p>
                <p className="text-lg font-semibold">{result.v15.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">V12 (m/s)</p>
                <p className="text-lg font-semibold">{result.v12.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Sprint Ratio</p>
                <p className="text-lg font-semibold">{result.srRun.toFixed(2)}</p>
              </div>
            </div>

            {/* Interprétation profil */}
            {profile && (
              <div className={cn("p-4 rounded-lg", profile.bgColor)}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn("text-sm", profile.color)}>{profile.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{profile.description}</p>
              </div>
            )}

            {/* Explication */}
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pourquoi ce test fonctionne</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le sprint 15 s reflète la capacité glycolytique et neuromusculaire.
                    Le test 12 min reflète la durabilité aérobie proche du seuil.
                    Le rapport des deux permet d'estimer le profil énergétique en course.
                  </p>
                </div>
              </div>
            </div>

            {/* Avertissement */}
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Estimation terrain</AlertTitle>
              <AlertDescription>
                Marge d'erreur ±10–15 %. Utiliser pour le suivi longitudinal, pas comme valeur absolue unique.
              </AlertDescription>
            </Alert>

            {/* Bouton sauvegarde */}
            <Button
              onClick={handleSave}
              disabled={!athlete}
              className="w-full gap-2"
              size="lg"
            >
              <Save className="w-4 h-4" />
              Sauvegarder le test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              Historique VLamax CAP ({testHistory.length} test{testHistory.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Graphique */}
            {chartData.length >= 2 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0.2, 1.0]}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} mmol/L/s`, "VLamax"]}
                    />
                    <ReferenceLine y={0.40} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <ReferenceLine y={0.65} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="vlamax"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Liste des tests */}
            <div className="space-y-2">
              {testHistory.slice(0, 5).map((test) => {
                const testProfile = test.vlamax ? getProfileInterpretation(test.vlamax, athleteAge) : null;
                return (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(parseISO(test.date), "dd MMM yyyy", { locale: fr })}
                      </p>
                      {test.notes && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {test.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {testProfile && (
                        <Badge variant="outline" className={cn("text-xs", testProfile.color)}>
                          {testProfile.label}
                        </Badge>
                      )}
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {test.vlamax?.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((test.fiabilite || 0) * 100)}% conf.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

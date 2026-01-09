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
  Zap,
  Activity
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
import { useToast } from "@/hooks/use-toast";
import { Athlete } from "@/types/athlete";
import { StoredTestResult } from "@/types/testLibrary";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface VLamaxRunPowerTestProps {
  athlete: Athlete | null;
  onAthleteUpdate?: (athlete: Athlete) => void;
  onTestSaved?: (result: StoredTestResult) => void;
  className?: string;
}

// Constantes du protocole
const TEST_ID = "run_vlamax_power_advanced";
const TEST_NOM = "VLamax CAP – Test Puissance (Advanced)";
const TEST_FIABILITE_BASE = 0.90;

// Constantes physiologiques (Mader/Heck)
const AEROBIC_CONTRIBUTION_15S = 0.25; // 25% contribution aérobie sur sprint 15s
const ALACTIC_DELAY = 6; // 6 secondes délai phosphocréatine
const LACTATE_ENERGY_CONVERSION = 65; // J/kg par mmol lactate

// Calcul VLamax selon formule puissance
function computeVLamaxPower(
  powerSprint1: number,
  powerSprint2: number,
  power12min: number
): { 
  vlamax: number; 
  p15: number; 
  p12: number; 
  pgly: number; 
  egly: number; 
  lactate: number;
} {
  // Meilleure puissance sur 15s
  const p15 = Math.max(powerSprint1, powerSprint2);
  const p12 = power12min;

  // Puissance glycolytique nette (W/kg)
  const pgly = p15 - (AEROBIC_CONTRIBUTION_15S * p12);

  // Temps glycolytique actif (s)
  const tgly = 15 - ALACTIC_DELAY; // = 9s

  // Énergie glycolytique (J/kg)
  const egly = pgly * tgly;

  // Production lactate (mmol)
  const lactate = egly / LACTATE_ENERGY_CONVERSION;

  // VLamax (mmol/L/s)
  let vlamax = lactate / tgly;
  
  // Clamp entre 0.20 et 1.00
  vlamax = Math.max(0.20, Math.min(1.00, vlamax));

  return { vlamax, p15, p12, pgly, egly, lactate };
}

// Calcul indice de confiance
function computeConfidence(powerSprint1: number, powerSprint2: number): number {
  // Écart entre les 2 sprints
  const maxP = Math.max(powerSprint1, powerSprint2);
  const minP = Math.min(powerSprint1, powerSprint2);
  const ecartPct = maxP > 0 ? ((maxP - minP) / maxP) * 100 : 0;

  // Règles de confiance pour données puissance
  if (ecartPct < 3) {
    return 0.90; // Données puissance stables + répétitions cohérentes
  } else if (ecartPct < 6) {
    return 0.80; // Légère variabilité
  } else {
    return 0.65; // Conditions imparfaites
  }
}

// Interprétation du profil
function getProfileInterpretation(vlamax: number): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
} {
  if (vlamax < 0.40) {
    return {
      label: "Profil très économique",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "Excellente économie de course. Faible sollicitation glycolytique, idéal pour ultra-endurance."
    };
  } else if (vlamax <= 0.65) {
    return {
      label: "Profil Équilibré",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description: "Polyvalence métabolique. Capacité à gérer des efforts variés avec une bonne économie."
    };
  } else {
    return {
      label: "Profil fortement glycolytique",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      description: "Forte capacité anaérobie. Avantage sur les changements de rythme et les efforts courts."
    };
  }
}

// Filtrer l'historique des tests VLamax CAP (tous types)
function getTestHistory(athlete: Athlete | null, testNom: string): StoredTestResult[] {
  if (!athlete?.tests) return [];
  return athlete.tests
    .filter(t => t.type === "VLAMAX" && t.nom === testNom)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Tous les tests VLamax CAP pour comparaison
function getAllRunVLamaxTests(athlete: Athlete | null): StoredTestResult[] {
  if (!athlete?.tests) return [];
  return athlete.tests
    .filter(t => 
      t.type === "VLAMAX" && 
      t.sport === "Course à pied" &&
      (t.nom.includes("VLamax CAP") || t.nom.includes("Sprint"))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function VLamaxRunPowerTest({
  athlete,
  onAthleteUpdate,
  onTestSaved,
  className
}: VLamaxRunPowerTestProps) {
  const { toast } = useToast();

  // Inputs
  const [powerSprint1, setPowerSprint1] = useState("");
  const [powerSprint2, setPowerSprint2] = useState("");
  const [power12min, setPower12min] = useState("");
  const [hrAvg12min, setHrAvg12min] = useState("");
  const [comment, setComment] = useState("");

  // État du résultat calculé
  const [result, setResult] = useState<{
    vlamax: number;
    p15: number;
    p12: number;
    pgly: number;
    egly: number;
    lactate: number;
    confidence: number;
  } | null>(null);

  // Historiques
  const powerTestHistory = useMemo(() => getTestHistory(athlete, TEST_NOM), [athlete?.tests]);
  const allRunTests = useMemo(() => getAllRunVLamaxTests(athlete), [athlete?.tests]);

  // Validation des inputs
  const isValid = useMemo(() => {
    const p1 = parseFloat(powerSprint1);
    const p2 = parseFloat(powerSprint2);
    const p12 = parseFloat(power12min);
    return p1 > 0 && p2 > 0 && p12 > 0 && p1 <= 15 && p2 <= 15 && p12 <= 10;
  }, [powerSprint1, powerSprint2, power12min]);

  // Calculer VLamax
  const handleCalculate = () => {
    const p1 = parseFloat(powerSprint1);
    const p2 = parseFloat(powerSprint2);
    const p12 = parseFloat(power12min);

    if (!isValid) {
      toast({
        title: "Données invalides",
        description: "Vérifiez les valeurs saisies (W/kg).",
        variant: "destructive"
      });
      return;
    }

    const calc = computeVLamaxPower(p1, p2, p12);
    const confidence = computeConfidence(p1, p2);

    setResult({ ...calc, confidence });
  };

  // Sauvegarder le test
  const handleSave = () => {
    if (!athlete || !result) return;

    const p1 = parseFloat(powerSprint1);
    const p2 = parseFloat(powerSprint2);
    const p12 = parseFloat(power12min);
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
        powerSprint1: p1,
        powerSprint2: p2,
        power12min: p12,
        p15: result.p15,
        p12: result.p12,
        pgly: result.pgly,
        egly: result.egly,
        lactate: result.lactate,
        ...(hr && { hrAvg12min: hr })
      },
      note: `P15: ${result.p15.toFixed(2)} W/kg | P12: ${result.p12.toFixed(2)} W/kg | Pgly: ${result.pgly.toFixed(2)} W/kg`,
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
      title: "Test VLamax CAP Puissance sauvegardé ⚡",
      description: (
        <div className="space-y-1 text-sm">
          <p>VLamax CAP: <strong>{result.vlamax.toFixed(2)} mmol/L/s</strong></p>
          <p>Source: Power-based field test</p>
          <p>Confiance: {Math.round(result.confidence * 100)}%</p>
        </div>
      )
    });

    // Reset form
    setPowerSprint1("");
    setPowerSprint2("");
    setPower12min("");
    setHrAvg12min("");
    setComment("");
    setResult(null);
  };

  // Données pour le graphique comparatif
  const comparisonChartData = useMemo(() => {
    return allRunTests.map(t => ({
      date: format(parseISO(t.date), "dd MMM", { locale: fr }),
      fullDate: t.date,
      vlamax: t.vlamax,
      source: t.nom.includes("Puissance") ? "power" : "speed",
      sourceLabel: t.nom.includes("Puissance") ? "Puissance" : "Vitesse"
    }));
  }, [allRunTests]);

  const profile = result ? getProfileInterpretation(result.vlamax) : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="border-orange-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl">{TEST_NOM}</CardTitle>
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                  Staff / Avancé
                </Badge>
              </div>
              <CardDescription>
                Nécessite puissance CAP (Stryd, Garmin, Coros)
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
            Ce test utilise la puissance de course pour estimer directement la contribution 
            glycolytique. Il permet une estimation plus fine que les tests basés uniquement 
            sur la vitesse, mais nécessite un matériel compatible.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-xs text-muted-foreground">
              <strong>Priorité VLamax CAP :</strong> 1. Test Puissance (Advanced) → 2. Test Sprint + 12 min → 3. Estimation indirecte
            </p>
          </div>
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
                  Protocole – RUN VLamax Power Field Test
                </span>
                <ChevronDown className="w-4 h-4 transition-transform" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Matériel */}
              <div>
                <h4 className="font-medium text-sm mb-2">Matériel requis</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Montre Garmin / Coros avec puissance CAP
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Footpod (Stryd) recommandé
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Ceinture HR recommandée
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Piste ou terrain plat
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
                    Conditions stables
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    Échauffement standardisé
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Étape A */}
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30">
                <h4 className="font-medium text-sm mb-2 text-orange-700 dark:text-orange-400">
                  Étape A — Sprint puissance 15 s
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Objectif : mesurer la puissance glycolytique maximale
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-mono">1.</span>
                    15–20 min Z2 + 3×20 s progressif
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-mono">2.</span>
                    2 répétitions : 15 s all-out départ lancé
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-mono">3.</span>
                    5–6 min récupération complète entre chaque
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-mono">→</span>
                    Relever la puissance moyenne 15 s (W/kg)
                  </li>
                </ul>
              </div>

              {/* Étape B */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
                <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-400">
                  Étape B — Test seuil puissance 12 min
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Objectif : estimer la puissance durable aérobie
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-mono">1.</span>
                    10 min récupération facile
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-mono">2.</span>
                    12 min all-out régulier
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-mono">→</span>
                    Relever la puissance moyenne 12 min (W/kg)
                  </li>
                </ul>
              </div>

              {/* Formule */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h4 className="font-medium text-sm mb-2">Formule de calcul</h4>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <p>Pgly = P15 − 0.25 × P12</p>
                  <p>Tgly = 15 − 6 = 9 s</p>
                  <p>Egly = Pgly × Tgly (J/kg)</p>
                  <p>L = Egly / 65 (mmol)</p>
                  <p>VLamax = L / Tgly</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Saisie des données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
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
          {/* Sprint 15s puissance */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Sprint 15 s (puissance)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="power1">Puissance moyenne sprint 1 (W/kg) *</Label>
                <Input
                  id="power1"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 8.5"
                  value={powerSprint1}
                  onChange={e => setPowerSprint1(e.target.value)}
                  disabled={!athlete}
                  min={2}
                  max={15}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 2–15 W/kg</p>
              </div>
              <div>
                <Label htmlFor="power2">Puissance moyenne sprint 2 (W/kg) *</Label>
                <Input
                  id="power2"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 8.7"
                  value={powerSprint2}
                  onChange={e => setPowerSprint2(e.target.value)}
                  disabled={!athlete}
                  min={2}
                  max={15}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 2–15 W/kg</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test 12 min */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Test 12 minutes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="power12">Puissance moyenne 12 min (W/kg) *</Label>
                <Input
                  id="power12"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 4.2"
                  value={power12min}
                  onChange={e => setPower12min(e.target.value)}
                  disabled={!athlete}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground mt-1">Plage: 1–10 W/kg</p>
              </div>
              <div>
                <Label htmlFor="hr12power">FC moyenne 12 min (bpm)</Label>
                <Input
                  id="hr12power"
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
            <Label htmlFor="commentPower">Commentaire test (optionnel)</Label>
            <Textarea
              id="commentPower"
              placeholder="Conditions, capteur utilisé, sensations..."
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
            className="w-full gap-2"
            size="lg"
          >
            <Zap className="w-4 h-4" />
            Calculer VLamax CAP (Puissance)
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {result && (
        <Card className="border-orange-500/30">
          <CardHeader className="bg-orange-500/5">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Résultats du test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* VLamax principale */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-900/10">
              <p className="text-sm text-muted-foreground mb-1">VLamax CAP (Puissance)</p>
              <p className="text-4xl font-bold text-orange-600">
                {result.vlamax.toFixed(2)}
                <span className="text-lg ml-1 font-normal text-muted-foreground">mmol/L/s</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Source: Power-based field test
              </p>
            </div>

            {/* Métriques détaillées */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Confiance</p>
                <p className="text-lg font-semibold">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">P15 (W/kg)</p>
                <p className="text-lg font-semibold">{result.p15.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">P12 (W/kg)</p>
                <p className="text-lg font-semibold">{result.p12.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Pgly (W/kg)</p>
                <p className="text-lg font-semibold">{result.pgly.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Egly (J/kg)</p>
                <p className="text-lg font-semibold">{result.egly.toFixed(1)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">Lactate (mmol)</p>
                <p className="text-lg font-semibold">{result.lactate.toFixed(2)}</p>
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

            {/* Avertissement */}
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Test avancé</AlertTitle>
              <AlertDescription>
                La précision dépend de la qualité du capteur de puissance. 
                Utiliser en complément du test vitesse pour validation croisée.
              </AlertDescription>
            </Alert>

            {/* Bouton sauvegarde */}
            <Button
              onClick={handleSave}
              disabled={!athlete}
              className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              <Save className="w-4 h-4" />
              Sauvegarder le test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comparaison historique */}
      {allRunTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              Comparaison VLamax CAP
            </CardTitle>
            <CardDescription>
              Historique tous tests VLamax course à pied
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Graphique comparatif */}
            {comparisonChartData.length >= 1 && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(2)} mmol/L/s`, 
                        props.payload.sourceLabel
                      ]}
                    />
                    <Legend />
                    <ReferenceLine y={0.40} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <ReferenceLine y={0.65} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="vlamax"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const color = payload.source === "power" ? "#f97316" : "#3b82f6";
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={5} 
                            fill={color} 
                            stroke="white" 
                            strokeWidth={2}
                          />
                        );
                      }}
                      name="VLamax"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Légende */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Test Puissance</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Test Vitesse</span>
              </div>
            </div>

            {/* Liste des tests récents */}
            <div className="space-y-2">
              {allRunTests.slice(-5).reverse().map((test) => {
                const testProfile = test.vlamax ? getProfileInterpretation(test.vlamax) : null;
                const isPowerTest = test.nom.includes("Puissance");
                return (
                  <div
                    key={test.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isPowerTest 
                        ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30"
                        : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isPowerTest ? (
                        <Zap className="w-4 h-4 text-orange-500" />
                      ) : (
                        <PersonStanding className="w-4 h-4 text-blue-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(test.date), "dd MMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isPowerTest ? "Puissance" : "Vitesse"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {testProfile && (
                        <Badge variant="outline" className={cn("text-xs", testProfile.color)}>
                          {testProfile.label}
                        </Badge>
                      )}
                      <div className="text-right">
                        <p className={cn("font-semibold", isPowerTest ? "text-orange-600" : "text-blue-600")}>
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

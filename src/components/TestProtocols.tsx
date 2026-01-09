import { useState } from "react";
import { 
  BookOpen, 
  Bike, 
  PersonStanding, 
  Waves, 
  ChevronDown, 
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  X,
  Save,
  FlaskConical,
  TrendingUp,
  ExternalLink,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Athlete } from "@/types/athlete";
import {
  TestLibrary, 
  TestProtocol, 
  addTestResultToAthlete, 
  StoredTestResult 
} from "@/types/testLibrary";
import { calculVLamaxPonderee, calculIndiceConfiance } from "@/lib/physiologicalModel";
import { VLamaxRunFieldTest } from "./VLamaxRunFieldTest";
import { VLamaxRunPowerTest } from "./VLamaxRunPowerTest";

// IDs des tests avec interface dédiée
const DEDICATED_TESTS = {
  SPRINT_12MIN: "run_vlamax_sprint15_12min",
  POWER_ADVANCED: "run_vlamax_power_advanced"
};

interface TestProtocolsProps {
  className?: string;
  onTestSaved?: (result: StoredTestResult) => void;
  athlete?: Athlete | null;
  onAthleteUpdate?: (athlete: Athlete) => void;
}

const sportFilters = [
  { key: "tous", label: "Tous", icon: Target },
  { key: "Cyclisme", label: "Vélo", icon: Bike },
  { key: "Course à pied", label: "Course", icon: PersonStanding },
  { key: "Natation", label: "Natation", icon: Waves },
];

function getFiabiliteLabel(fiabilite: number | null): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (fiabilite === null) return { label: "Référence", variant: "outline" };
  if (fiabilite >= 0.85) return { label: "Excellente", variant: "default" };
  if (fiabilite >= 0.75) return { label: "Bonne", variant: "secondary" };
  return { label: "Moyenne", variant: "destructive" };
}

export function TestProtocols({ className, onTestSaved, athlete, onAthleteUpdate }: TestProtocolsProps) {
  const { toast } = useToast();
  
  const [activeSport, setActiveSport] = useState("tous");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestProtocol | null>(null);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testNotes, setTestNotes] = useState("");
  const [showDedicatedTest, setShowDedicatedTest] = useState<string | null>(null);

  const filteredTests = activeSport === "tous" 
    ? TestLibrary 
    : TestLibrary.filter(t => t.sport === activeSport || t.sport === "Multi-sport");

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case "Cyclisme": return <Bike className="w-4 h-4" />;
      case "Course à pied": return <PersonStanding className="w-4 h-4" />;
      case "Natation": return <Waves className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const isDedicatedTest = (testId: string) => 
    Object.values(DEDICATED_TESTS).includes(testId);

  const handleRunTest = (test: TestProtocol) => {
    if (!athlete) {
      toast({
        title: "Aucun athlète sélectionné",
        description: "Sélectionnez un athlète pour faire passer ce test.",
        variant: "destructive"
      });
      return;
    }
    
    // Tests avec interface dédiée
    if (isDedicatedTest(test.id)) {
      setShowDedicatedTest(test.id);
      return;
    }
    
    setSelectedTest(test);
    // Initialiser les inputs pour chaque variable
    const initialInputs: Record<string, string> = {};
    test.variables.forEach(v => {
      initialInputs[v.key] = "";
    });
    setTestInputs(initialInputs);
    setTestNotes("");
  };

  const handleInputChange = (key: string, value: string) => {
    setTestInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveTest = () => {
    if (!selectedTest || !athlete) return;
    
    // Valider les inputs
    const invalidInputs: string[] = [];
    selectedTest.variables.forEach(v => {
      const value = parseFloat(testInputs[v.key] || "");
      if (isNaN(value) || value <= 0) {
        invalidInputs.push(v.label);
      } else if (v.min !== undefined && value < v.min) {
        invalidInputs.push(`${v.label} (min: ${v.min})`);
      } else if (v.max !== undefined && value > v.max) {
        invalidInputs.push(`${v.label} (max: ${v.max})`);
      }
    });

    if (invalidInputs.length > 0) {
      toast({
        title: "Valeurs invalides",
        description: `Vérifier: ${invalidInputs.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    // Convertir les inputs en Record<string, number>
    const numericInputs: Record<string, number> = {};
    Object.keys(testInputs).forEach(key => {
      numericInputs[key] = parseFloat(testInputs[key]);
    });

    // Créer le résultat standardisé
    const athleteCopy = { ...athlete, tests: [...(athlete.tests || [])], refs: { ...athlete.refs } };
    const result = addTestResultToAthlete(athleteCopy, selectedTest, numericInputs);
    
    if (!result.ok || !result.entry) {
      toast({
        title: "Erreur",
        description: result.msg || "Erreur lors de la sauvegarde du test",
        variant: "destructive"
      });
      return;
    }

    const stored = result.entry;
    if (testNotes.trim()) {
      stored.notes = testNotes.trim();
    }

    // Mettre à jour l'athlète avec les tests et les refs potentiellement modifiés
    if (onAthleteUpdate) {
      onAthleteUpdate(athleteCopy);
    }

    // Calculer la VLamax pondérée pour affichage (seulement tests VLAMAX)
    const vlamaxTests = (athleteCopy.tests || []).filter(t => t.type === "VLAMAX" && t.vlamax !== null);
    const vlamaxPonderee = calculVLamaxPonderee(vlamaxTests);
    const confiance = calculIndiceConfiance(vlamaxTests);

    // Construire le message de feedback selon le type
    const isVlamaxTest = stored.type === "VLAMAX";

    toast({
      title: isVlamaxTest ? "Test VLamax sauvegardé 🧪" : "Référence enregistrée 📌",
      description: (
        <div className="space-y-1 text-sm">
          <p>{stored.nom}</p>
          {isVlamaxTest && stored.vlamax !== null && (
            <p className="font-medium">VLamax test: {stored.vlamax.toFixed(2)}</p>
          )}
          {isVlamaxTest && vlamaxPonderee !== null && (
            <p className="text-muted-foreground">
              VLamax pondérée: {vlamaxPonderee.toFixed(2)} | Confiance: {confiance}%
            </p>
          )}
          {!isVlamaxTest && (
            <p className="text-muted-foreground">
              Références mises à jour (ne modifie pas VLamax)
            </p>
          )}
          {stored.note && <p className="text-xs text-muted-foreground">{stored.note}</p>}
        </div>
      )
    });

    // Callback externe si fourni
    if (onTestSaved) {
      onTestSaved(stored);
    }

    setSelectedTest(null);
  };

  return (
    <div className={cn("glass-card p-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <FlaskConical className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bibliothèque de Tests</h2>
          <p className="text-sm text-muted-foreground">Protocoles avec conversion VLamax automatique</p>
        </div>
      </div>

      {/* Sport Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {sportFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.key}
              variant={activeSport === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSport(filter.key)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Tests List */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const isExpanded = expandedTest === test.id;
          const fiab = getFiabiliteLabel(test.fiabilite);
          
          return (
            <div
              key={test.id}
              className={cn(
                "rounded-xl border transition-all duration-200",
                "border-border hover:border-primary/30",
                isExpanded && "bg-secondary/30"
              )}
            >
              {/* Header */}
              <div 
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedTest(isExpanded ? null : test.id)}
              >
                <div className="p-2 rounded-lg bg-secondary/50">
                  {getSportIcon(test.sport)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{test.nom}</span>
                    <Badge variant="outline" className="text-xs">{test.sport}</Badge>
                    {test.type === "VLAMAX" ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <TrendingUp className="w-3 h-3" />
                        🧪 VLamax
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1">
                        📌 Référence
                      </Badge>
                    )}
                    {isDedicatedTest(test.id) && (
                      <Badge variant="outline" className="text-xs gap-1 border-primary text-primary">
                        <ExternalLink className="w-3 h-3" />
                        Interface dédiée
                      </Badge>
                    )}
                    {test.id === DEDICATED_TESTS.POWER_ADVANCED && (
                      <Badge variant="outline" className="text-xs gap-1 border-orange-500 text-orange-600">
                        <Zap className="w-3 h-3" />
                        Staff / Avancé
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{test.objectif}</p>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  {test.type === "VLAMAX" && test.fiabilite !== null && (
                    <Badge variant={fiab.variant} className="text-xs">
                      {Math.round(test.fiabilite * 100)}% fiable
                    </Badge>
                  )}
                </div>

                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in">
                  <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-4">
                    {/* Objectif */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                        <Target className="w-4 h-4 text-primary" />
                        Objectif
                      </div>
                      <p className="text-sm text-muted-foreground">{test.objectif}</p>
                    </div>

                    {/* Variables */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        Données requises
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {test.variables.map((v) => (
                          <Badge key={v.key} variant="secondary">
                            {v.label}
                            {v.min !== undefined && v.max !== undefined && (
                              <span className="ml-1 text-xs opacity-70">({v.min}-{v.max})</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Protocole */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Clock className="w-4 h-4 text-accent" />
                        Protocole détaillé
                      </div>
                      <ul className="space-y-1">
                        {test.protocole.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Calcul */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm">
                        <strong className="text-primary">Formule:</strong>{" "}
                        <span className="font-mono text-foreground">{test.calcul}</span>
                      </p>
                    </div>

                    {/* Commentaire coach */}
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">
                        <strong>💡 Conseil:</strong> {test.commentaire}
                      </p>
                    </div>

                    {/* Action Button */}
                    {athlete && (
                      <Button 
                        onClick={() => handleRunTest(test)}
                        className="w-full gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Faire passer ce test à {athlete.nom}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Input Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTest && getSportIcon(selectedTest.sport)}
              {selectedTest?.nom}
            </DialogTitle>
            <DialogDescription>
              Enregistrer le résultat pour {athlete?.nom}
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4 py-4">
              {/* Variables inputs */}
              {selectedTest.variables.map((variable) => (
                <div key={variable.key}>
                  <Label className="flex items-center gap-2">
                    {variable.label}
                    {variable.unit && (
                      <span className="text-xs text-muted-foreground">({variable.unit})</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    placeholder={`Entrer ${variable.label.toLowerCase()}`}
                    value={testInputs[variable.key] || ""}
                    onChange={(e) => handleInputChange(variable.key, e.target.value)}
                    className="mt-1"
                    min={variable.min}
                    max={variable.max}
                  />
                  {variable.min !== undefined && variable.max !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Plage valide: {variable.min} – {variable.max} {variable.unit}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <Label>Notes (optionnel)</Label>
                <Textarea
                  placeholder="Conditions du test, observations..."
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  className="mt-1"
                  maxLength={500}
                />
              </div>

              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-xs text-muted-foreground mb-1">Formule de calcul</p>
                <p className="font-mono text-sm">{selectedTest.calcul}</p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Fiabilité du test</p>
                <p className="font-medium">{Math.round(selectedTest.fiabilite * 100)}%</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTest(null)}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSaveTest}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour le test VLamax CAP Sprint+12min */}
      <Dialog 
        open={showDedicatedTest === DEDICATED_TESTS.SPRINT_12MIN} 
        onOpenChange={(open) => setShowDedicatedTest(open ? DEDICATED_TESTS.SPRINT_12MIN : null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PersonStanding className="w-5 h-5" />
              Test VLamax CAP – Sprint 15s + 12 min
            </DialogTitle>
            <DialogDescription>
              Test terrain officiel Two For Coaching Lab pour {athlete?.nom}
            </DialogDescription>
          </DialogHeader>
          <VLamaxRunFieldTest
            athlete={athlete || null}
            onAthleteUpdate={(updatedAthlete) => {
              if (onAthleteUpdate) onAthleteUpdate(updatedAthlete);
            }}
            onTestSaved={(result) => {
              if (onTestSaved) onTestSaved(result);
              setShowDedicatedTest(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog pour le test VLamax CAP Puissance (Advanced) */}
      <Dialog 
        open={showDedicatedTest === DEDICATED_TESTS.POWER_ADVANCED} 
        onOpenChange={(open) => setShowDedicatedTest(open ? DEDICATED_TESTS.POWER_ADVANCED : null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Test VLamax CAP – Puissance (Advanced)
            </DialogTitle>
            <DialogDescription>
              Test avancé avec puissance de course pour {athlete?.nom}
            </DialogDescription>
          </DialogHeader>
          <VLamaxRunPowerTest
            athlete={athlete || null}
            onAthleteUpdate={(updatedAthlete) => {
              if (onAthleteUpdate) onAthleteUpdate(updatedAthlete);
            }}
            onTestSaved={(result) => {
              if (onTestSaved) onTestSaved(result);
              setShowDedicatedTest(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Exports
export { TestLibrary };
export type { TestProtocol } from "@/types/testLibrary";
export { VLamaxRunFieldTest } from "./VLamaxRunFieldTest";
export { VLamaxRunPowerTest } from "./VLamaxRunPowerTest";

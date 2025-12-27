import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FlaskConical, 
  Play, 
  Clock, 
  Zap, 
  Target, 
  Save, 
  ChevronRight,
  Bike,
  PersonStanding,
  Activity,
  Trophy,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete } from "@/types/athlete";
import { 
  TestVLamax, 
  TestResultat, 
  TestProtocoleVLamax,
  testsVLamaxDisponibles,
  calculerVLamaxMoyenTests
} from "@/types/testVLamax";
import { MetricExplanationPopup } from "./MetricExplanationPopup";

interface VLamaxTestingPageProps {
  athlete: Athlete;
  onSaveTests: (tests: TestVLamax[]) => void;
}

const sportIcons = {
  vélo: Bike,
  course: PersonStanding,
  natation: Activity,
};

const difficultyColors = {
  Facile: "bg-success/10 text-success border-success/30",
  Modéré: "bg-warning/10 text-warning border-warning/30",
  Difficile: "bg-destructive/10 text-destructive border-destructive/30",
};

export function VLamaxTestingPage({ athlete, onSaveTests }: VLamaxTestingPageProps) {
  // Récupérer les tests existants depuis localStorage
  const [tests, setTests] = useState<TestVLamax[]>(() => {
    const saved = localStorage.getItem(`tests-${athlete.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<TestProtocoleVLamax | null>(null);
  const [testResultat, setTestResultat] = useState<TestResultat>({});
  const [testNotes, setTestNotes] = useState("");

  const handleStartTest = (protocole: TestProtocoleVLamax) => {
    // Pré-remplir avec résultat existant si disponible
    const existingTest = tests.find(t => t.nom === protocole.nom);
    if (existingTest) {
      setTestResultat(existingTest.resultat);
      setTestNotes(existingTest.notes || "");
    } else {
      setTestResultat({});
      setTestNotes("");
    }
    setActiveTest(protocole);
  };

  const handleSaveTest = () => {
    if (!activeTest) return;

    const vlamax = activeTest.calcVLamax(testResultat);
    
    const newTest: TestVLamax = {
      id: crypto.randomUUID(),
      nom: activeTest.nom,
      sport: activeTest.sport,
      date: new Date().toISOString().slice(0, 10),
      resultat: testResultat,
      vlamax,
      notes: testNotes
    };

    // Remplacer si existe, sinon ajouter
    const updatedTests = tests.filter(t => t.nom !== activeTest.nom);
    updatedTests.push(newTest);
    
    setTests(updatedTests);
    localStorage.setItem(`tests-${athlete.id}`, JSON.stringify(updatedTests));
    onSaveTests(updatedTests);
    setActiveTest(null);
  };

  const handleInputChange = (field: keyof TestResultat, value: string) => {
    setTestResultat(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const getExistingTest = (nom: string): TestVLamax | undefined => {
    return tests.find(t => t.nom === nom);
  };

  const vlamaxMoyen = calculerVLamaxMoyenTests(tests);

  const fieldLabels: Record<keyof TestResultat, { label: string; unit: string; icon: React.ElementType }> = {
    puissanceMax: { label: "Puissance Max", unit: "W", icon: Zap },
    puissance5s: { label: "Puissance 5s", unit: "W", icon: Zap },
    ftp: { label: "FTP", unit: "W", icon: Activity },
    vitesse: { label: "Vitesse", unit: "km/h", icon: Target },
    vitesseMoyenne: { label: "Vitesse Moy.", unit: "km/h", icon: Target },
    temps: { label: "Temps", unit: "s", icon: Clock },
    distance: { label: "Distance", unit: "m", icon: Target },
    lactatePic: { label: "Lactate Pic", unit: "mmol/L", icon: FlaskConical },
  };

  return (
    <div className="space-y-6">
      {/* Header avec VLamax moyen */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Tests VLamax</h2>
              <p className="text-sm text-muted-foreground">
                Protocoles validés pour {athlete.nom}
              </p>
            </div>
          </div>

          {tests.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">VLamax Moyen</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold font-mono text-primary">
                    {vlamaxMoyen.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">mmol/L/s</span>
                  <MetricExplanationPopup metric="VLamax" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
                <Trophy className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">{tests.length} test(s)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste des protocoles */}
      <div className="grid gap-4">
        {testsVLamaxDisponibles.map((protocole) => {
          const SportIcon = sportIcons[protocole.sport];
          const existingTest = getExistingTest(protocole.nom);
          const isExpanded = expandedTest === protocole.id;

          return (
            <div
              key={protocole.id}
              className={cn(
                "glass-card overflow-hidden transition-all duration-300",
                isExpanded && "border-primary/30"
              )}
            >
              {/* Header du test */}
              <div
                onClick={() => setExpandedTest(isExpanded ? null : protocole.id)}
                className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      existingTest ? "bg-success/10 text-success" : "bg-secondary/50 text-muted-foreground"
                    )}>
                      <SportIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{protocole.nom}</h3>
                        {existingTest && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                            ✓ Complété
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {protocole.duree}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          difficultyColors[protocole.difficulte]
                        )}>
                          {protocole.difficulte}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {existingTest && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">VLamax</p>
                        <p className="text-lg font-bold font-mono text-primary">
                          {existingTest.vlamax.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <ChevronRight
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contenu étendu */}
              {isExpanded && (
                <div className="p-4 pt-0 border-t border-border bg-secondary/10 animate-fade-in">
                  <div className="mt-4 space-y-4">
                    {/* Protocole */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm text-foreground">{protocole.protocole}</p>
                    </div>

                    {/* Résultat existant */}
                    {existingTest && (
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium text-success">
                            Dernier résultat ({existingTest.date})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(existingTest.resultat).map(([key, value]) => (
                            value ? (
                              <div key={key} className="text-sm">
                                <span className="text-muted-foreground">
                                  {fieldLabels[key as keyof TestResultat]?.label}:
                                </span>
                                <span className="ml-1 font-mono text-foreground">
                                  {value} {fieldLabels[key as keyof TestResultat]?.unit}
                                </span>
                              </div>
                            ) : null
                          ))}
                        </div>
                        {existingTest.notes && (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Notes: {existingTest.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bouton démarrer */}
                    <Button 
                      variant="glow" 
                      className="w-full"
                      onClick={() => handleStartTest(protocole)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {existingTest ? "Refaire le test" : "Démarrer le test"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog saisie résultat */}
      <Dialog open={!!activeTest} onOpenChange={() => setActiveTest(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              {activeTest?.nom}
            </DialogTitle>
            <DialogDescription>
              Saisissez les résultats du test pour calculer la VLamax.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Alerte protocole */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
              <p className="text-sm text-warning">{activeTest?.protocole}</p>
            </div>

            {/* Champs de saisie */}
            {activeTest?.champsRequis.map(field => {
              const fieldInfo = fieldLabels[field];
              const FieldIcon = fieldInfo.icon;
              return (
                <div key={field} className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1 text-muted-foreground">
                    <FieldIcon className="w-4 h-4" />
                    {fieldInfo.label}
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      type="number"
                      value={testResultat[field] || ""}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="bg-secondary/50 border-border"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground w-16">{fieldInfo.unit}</span>
                  </div>
                </div>
              );
            })}

            {/* Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right text-muted-foreground pt-2">Notes</Label>
              <Input
                value={testNotes}
                onChange={(e) => setTestNotes(e.target.value)}
                className="col-span-3 bg-secondary/50 border-border"
                placeholder="Conditions, sensations..."
              />
            </div>

            {/* Prévisualisation VLamax */}
            {activeTest && Object.keys(testResultat).length > 0 && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                <p className="text-sm text-muted-foreground mb-1">VLamax Estimé</p>
                <p className="text-4xl font-bold font-mono text-primary">
                  {activeTest.calcVLamax(testResultat).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">mmol/L/s</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveTest(null)}>
              Annuler
            </Button>
            <Button variant="glow" onClick={handleSaveTest}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

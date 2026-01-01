import { useState, useMemo } from "react";
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

// Type pour les tests cloud (simplifié)
interface CloudTest {
  id: string;
  athlete_id: string;
  type: string;
  name: string;
  sport: string | null;
  vlamax: number | null;
  reliability: number | null;
  raw: unknown; // Json type compatible
  note: string | null;
  date: string;
}

interface VLamaxTestingPageProps {
  athlete: Athlete;
  cloudTests: CloudTest[];
  onAddTest: (
    athleteId: string,
    type: string,
    name: string,
    sport: string | null,
    reliability: number | null,
    vlamax: number | null,
    raw?: unknown,
    note?: string | null
  ) => Promise<unknown>;
  onDeleteTest: (id: string) => Promise<boolean>;
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

export function VLamaxTestingPage({ athlete, cloudTests, onAddTest, onDeleteTest }: VLamaxTestingPageProps) {
  // ✅ Convertir les tests cloud en format local pour affichage
  const tests = useMemo<TestVLamax[]>(() => {
    return cloudTests.map(ct => ({
      id: ct.id,
      nom: ct.name,
      sport: (ct.sport as "vélo" | "course" | "natation") || "vélo",
      date: ct.date.slice(0, 10),
      resultat: (ct.raw as TestResultat) || {},
      vlamax: ct.vlamax ?? 0,
      notes: ct.note || "",
    }));
  }, [cloudTests]);

  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<TestProtocoleVLamax | null>(null);
  const [testResultat, setTestResultat] = useState<TestResultat>({});
  const [testNotes, setTestNotes] = useState("");
  const [sportFilter, setSportFilter] = useState<"tous" | "vélo" | "course" | "natation">("tous");
  
  // État pour les inputs inline (par protocole id)
  const [inlineInputs, setInlineInputs] = useState<Record<string, TestResultat>>({});

  // Filtrer les tests par sport
  const filteredTests = sportFilter === "tous" 
    ? testsVLamaxDisponibles 
    : testsVLamaxDisponibles.filter(t => t.sport === sportFilter);

  // Compter tests par sport
  const testCountBySport = {
    vélo: tests.filter(t => t.sport === "vélo").length,
    course: tests.filter(t => t.sport === "course").length,
    natation: tests.filter(t => t.sport === "natation").length,
  };

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

  const handleSaveTest = async () => {
    if (!activeTest) return;

    const vlamax = activeTest.calcVLamax(testResultat);
    
    // ✅ Supprimer l'ancien test s'il existe (même nom)
    const existingTest = cloudTests.find(t => t.name === activeTest.nom);
    if (existingTest) {
      await onDeleteTest(existingTest.id);
    }
    
    // ✅ Ajouter le nouveau test dans le cloud
    await onAddTest(
      athlete.id,
      activeTest.id, // type = protocole ID
      activeTest.nom, // name
      activeTest.sport, // sport
      0.8, // reliability par défaut
      vlamax,
      testResultat as Record<string, unknown>, // raw
      testNotes || null // note
    );
    
    setActiveTest(null);
  };

  const handleInputChange = (field: keyof TestResultat, value: string) => {
    setTestResultat(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Gérer les inputs inline sur les cartes
  const handleInlineInputChange = (protocoleId: string, field: keyof TestResultat, value: string) => {
    setInlineInputs(prev => ({
      ...prev,
      [protocoleId]: {
        ...prev[protocoleId],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  // Sauvegarder depuis input inline - ✅ Cloud
  const handleInlineSave = async (protocole: TestProtocoleVLamax) => {
    const resultat = inlineInputs[protocole.id] || {};
    const vlamax = protocole.calcVLamax(resultat);
    
    // ✅ Supprimer l'ancien test s'il existe (même nom)
    const existingTest = cloudTests.find(t => t.name === protocole.nom);
    if (existingTest) {
      await onDeleteTest(existingTest.id);
    }
    
    // ✅ Ajouter le nouveau test dans le cloud
    await onAddTest(
      athlete.id,
      protocole.id,
      protocole.nom,
      protocole.sport,
      0.8,
      vlamax,
      resultat as Record<string, unknown>,
      null
    );
  };

  // Calculer VLamax en temps réel pour un protocole
  const getInlineVLamax = (protocole: TestProtocoleVLamax): number => {
    const resultat = inlineInputs[protocole.id] || {};
    if (Object.keys(resultat).length === 0) return 0;
    return protocole.calcVLamax(resultat);
  };

  const getExistingTest = (nom: string): TestVLamax | undefined => {
    return tests.find(t => t.nom === nom);
  };

  // Barre de progression colorée
  const renderVLamaxBar = (vlamax: number, max: number = 1.0) => {
    const ratio = Math.min(vlamax / max, 1);
    const percentage = ratio * 100;
    
    let colorClass = "bg-destructive";
    if (ratio > 0.75) colorClass = "bg-success";
    else if (ratio > 0.5) colorClass = "bg-warning";
    else if (ratio > 0.25) colorClass = "bg-accent";
    
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500 rounded-full", colorClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-12">
          {vlamax.toFixed(2)}
        </span>
      </div>
    );
  };

  const vlamaxMoyen = calculerVLamaxMoyenTests(tests);

  const fieldLabels: Record<keyof TestResultat, { label: string; unit: string; icon: React.ElementType }> = {
    puissanceMax: { label: "Puissance Max", unit: "W", icon: Zap },
    puissanceMoyenne: { label: "Puissance Moy.", unit: "W", icon: Zap },
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

      {/* Filtres par sport */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={sportFilter === "tous" ? "default" : "outline"}
          size="sm"
          onClick={() => setSportFilter("tous")}
          className="gap-2"
        >
          Tous
          <span className="text-xs opacity-70">({testsVLamaxDisponibles.length})</span>
        </Button>
        <Button
          variant={sportFilter === "vélo" ? "default" : "outline"}
          size="sm"
          onClick={() => setSportFilter("vélo")}
          className="gap-2"
        >
          <Bike className="w-4 h-4" />
          Vélo
          <span className="text-xs opacity-70">({testCountBySport.vélo})</span>
        </Button>
        <Button
          variant={sportFilter === "course" ? "default" : "outline"}
          size="sm"
          onClick={() => setSportFilter("course")}
          className="gap-2"
        >
          <PersonStanding className="w-4 h-4" />
          Course
          <span className="text-xs opacity-70">({testCountBySport.course})</span>
        </Button>
        <Button
          variant={sportFilter === "natation" ? "default" : "outline"}
          size="sm"
          onClick={() => setSportFilter("natation")}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          Natation
          <span className="text-xs opacity-70">({testCountBySport.natation})</span>
        </Button>
      </div>

      {/* Liste des protocoles */}
      <div className="grid gap-4">
        {filteredTests.map((protocole) => {
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

                    {/* Barre VLamax en temps réel */}
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          VLamax estimé
                        </span>
                        <MetricExplanationPopup metric="VLamax" />
                      </div>
                      {renderVLamaxBar(
                        getInlineVLamax(protocole) || existingTest?.vlamax || 0,
                        1.0
                      )}
                    </div>

                    {/* Inputs inline directement sur la carte */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {protocole.champsRequis.map(field => {
                        const fieldInfo = fieldLabels[field];
                        const FieldIcon = fieldInfo.icon;
                        const currentValue = inlineInputs[protocole.id]?.[field] || existingTest?.resultat[field] || "";
                        
                        return (
                          <div key={field} className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-muted-foreground min-w-[100px]">
                              <FieldIcon className="w-4 h-4" />
                              <span className="text-xs">{fieldInfo.label}</span>
                            </div>
                            <Input
                              type="number"
                              value={currentValue}
                              onChange={(e) => handleInlineInputChange(protocole.id, field, e.target.value)}
                              className="bg-background/50 border-border h-9 text-sm"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground w-10">{fieldInfo.unit}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Résultat existant compact */}
                    {existingTest && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                        <Trophy className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">
                          Dernier test: {existingTest.date} — VLamax: {existingTest.vlamax.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex gap-2">
                      <Button 
                        variant="glow" 
                        className="flex-1"
                        onClick={() => handleInlineSave(protocole)}
                        disabled={!inlineInputs[protocole.id] || Object.keys(inlineInputs[protocole.id]).length === 0}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleStartTest(protocole)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Mode détaillé
                      </Button>
                    </div>
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

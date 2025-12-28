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
  FlaskConical
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
import { useAthletes } from "@/contexts/AthleteContext";
import { useToast } from "@/hooks/use-toast";

// Types pour les tests
interface TestProtocol {
  id: string;
  sport: "Cyclisme" | "Course à pied" | "Natation" | "Multi-sport";
  nom: string;
  objectif: string;
  variables: string[];
  protocole: string[];
  calcul: string;
  fiabilite: number;
  commentaire: string;
}

interface ResultatTest {
  testId: string;
  nom: string;
  sport: string;
  valeur: number;
  fiabilite: number;
  date: string;
  notes?: string;
}

// Bibliothèque complète des tests
const TestLibrary: TestProtocol[] = [
  {
    id: "bike_sprint_10s",
    sport: "Cyclisme",
    nom: "Sprint maximal 5–10 s",
    objectif: "Estimation VLamax (débit glycolytique)",
    variables: ["Puissance max (W)"],
    protocole: [
      "Échauffement 20 min progressif",
      "1 à 2 sprints maximaux de 5–10 s",
      "Récupération complète 5 min",
      "Capteur de puissance obligatoire"
    ],
    calcul: "VLamax ≈ Puissance max / 1000",
    fiabilite: 0.9,
    commentaire: "Très bon indicateur terrain de la capacité anaérobie."
  },
  {
    id: "bike_wingate",
    sport: "Cyclisme",
    nom: "Wingate 30 s",
    objectif: "Capacité anaérobie + VLamax",
    variables: ["Puissance moyenne 30 s (W)"],
    protocole: [
      "Échauffement 20–25 min",
      "Sprint maximal 30 s",
      "Résistance constante",
      "Repos complet après le test"
    ],
    calcul: "VLamax ≈ Puissance moyenne / 1000",
    fiabilite: 0.75,
    commentaire: "Plus fatigant, à éviter en période chargée."
  },
  {
    id: "bike_ftp",
    sport: "Cyclisme",
    nom: "Test FTP 20 min",
    objectif: "Estimation FTP (seuil fonctionnel)",
    variables: ["Puissance moyenne 20 min (W)"],
    protocole: [
      "Échauffement 20 min avec accélérations",
      "5 min à bloc pour purger l'anaérobie",
      "Récupération 10 min",
      "20 min à fond régulier",
      "FTP = 95% de la puissance moyenne"
    ],
    calcul: "FTP = Puissance 20 min × 0.95",
    fiabilite: 0.85,
    commentaire: "Test classique, bon indicateur du seuil."
  },
  {
    id: "run_sprint_40m",
    sport: "Course à pied",
    nom: "Sprint 30–50 m",
    objectif: "Estimation VLamax course",
    variables: ["Temps (s)", "Distance (m)"],
    protocole: [
      "Échauffement complet",
      "Sprint départ arrêté ou lancé",
      "Chronométrage précis",
      "2–3 essais max"
    ],
    calcul: "VLamax ≈ vitesse max / temps",
    fiabilite: 0.7,
    commentaire: "Sensibilité à la technique de course."
  },
  {
    id: "run_vma",
    sport: "Course à pied",
    nom: "Test VMA (Vameval / 6 min)",
    objectif: "Estimation VO2max / VMA",
    variables: ["VMA (km/h)"],
    protocole: [
      "Test progressif ou test 6 min",
      "Dernier palier tenu = VMA"
    ],
    calcul: "VO2max ≈ VMA × 3.5",
    fiabilite: 0.8,
    commentaire: "Base indispensable pour zones et planification."
  },
  {
    id: "run_cooper",
    sport: "Course à pied",
    nom: "Test Cooper 12 min",
    objectif: "Estimation VO2max",
    variables: ["Distance parcourue (m)"],
    protocole: [
      "Échauffement léger 10 min",
      "Courir à allure régulière pendant 12 min",
      "Mesurer la distance totale"
    ],
    calcul: "VO2max = (Distance - 504.9) / 44.73",
    fiabilite: 0.75,
    commentaire: "Simple mais moins précis que VMA."
  },
  {
    id: "swim_200m",
    sport: "Natation",
    nom: "Test 200 m nage libre",
    objectif: "Estimation VLamax / capacité anaérobie",
    variables: ["Temps 200 m (sec)"],
    protocole: [
      "Échauffement 15–20 min",
      "200 m à intensité maximale",
      "Chronométrage précis"
    ],
    calcul: "Indice anaérobie via vitesse moyenne",
    fiabilite: 0.7,
    commentaire: "Très dépendant de la technique."
  },
  {
    id: "swim_css",
    sport: "Natation",
    nom: "Test CSS (Critical Swim Speed)",
    objectif: "Estimation seuil lactique natation",
    variables: ["Temps 400 m (sec)", "Temps 200 m (sec)"],
    protocole: [
      "Échauffement 15–20 min",
      "400 m à fond, repos 10 min",
      "200 m à fond"
    ],
    calcul: "CSS = (400-200) / (T400 - T200) en m/s → sec/100m",
    fiabilite: 0.8,
    commentaire: "Excellent pour définir les zones natation."
  },
  {
    id: "hr_max",
    sport: "Multi-sport",
    nom: "Test FCmax terrain",
    objectif: "Déterminer la fréquence cardiaque maximale",
    variables: ["FC max (bpm)"],
    protocole: [
      "Échauffement progressif 15-20 min",
      "3 × 3 min à intensité croissante (90%, 95%, 100%)",
      "Récupération 2 min entre chaque",
      "Sprint final 30s-1min",
      "Noter la FC max atteinte"
    ],
    calcul: "FCmax = valeur pic observée",
    fiabilite: 0.95,
    commentaire: "À faire en état de forme optimale."
  }
];

interface TestProtocolsProps {
  className?: string;
}

const sportFilters = [
  { key: "tous", label: "Tous", icon: Target },
  { key: "Cyclisme", label: "Vélo", icon: Bike },
  { key: "Course à pied", label: "Course", icon: PersonStanding },
  { key: "Natation", label: "Natation", icon: Waves },
];

function getFiabiliteLabel(fiabilite: number): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (fiabilite >= 0.85) return { label: "Excellente", variant: "default" };
  if (fiabilite >= 0.75) return { label: "Bonne", variant: "secondary" };
  return { label: "Moyenne", variant: "destructive" };
}

export function TestProtocols({ className }: TestProtocolsProps) {
  const { currentAthlete } = useAthletes();
  const { toast } = useToast();
  
  const [activeSport, setActiveSport] = useState("tous");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestProtocol | null>(null);
  const [testValue, setTestValue] = useState("");
  const [testNotes, setTestNotes] = useState("");

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

  const handleRunTest = (test: TestProtocol) => {
    if (!currentAthlete) {
      toast({
        title: "Aucun athlète sélectionné",
        description: "Sélectionnez un athlète pour faire passer ce test.",
        variant: "destructive"
      });
      return;
    }
    setSelectedTest(test);
    setTestValue("");
    setTestNotes("");
  };

  const handleSaveTest = () => {
    if (!selectedTest || !currentAthlete) return;
    
    const value = parseFloat(testValue);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Valeur invalide",
        description: "Entrez une valeur numérique valide.",
        variant: "destructive"
      });
      return;
    }

    // Validation basique selon le type de test
    if (selectedTest.id === "hr_max" && (value < 100 || value > 250)) {
      toast({
        title: "Valeur hors limites",
        description: "La FCmax doit être entre 100 et 250 bpm.",
        variant: "destructive"
      });
      return;
    }

    if (selectedTest.id.includes("ftp") && (value < 50 || value > 600)) {
      toast({
        title: "Valeur hors limites",
        description: "Le FTP doit être entre 50 et 600 W.",
        variant: "destructive"
      });
      return;
    }

    const resultat: ResultatTest = {
      testId: selectedTest.id,
      nom: selectedTest.nom,
      sport: selectedTest.sport,
      valeur: value,
      fiabilite: selectedTest.fiabilite,
      date: new Date().toISOString(),
      notes: testNotes.trim().slice(0, 500) || undefined
    };

    console.log("Résultat test:", resultat);
    
    toast({
      title: "Test sauvegardé",
      description: `${selectedTest.nom}: ${value} pour ${currentAthlete.nom}`
    });

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
          <p className="text-sm text-muted-foreground">Protocoles validés pour évaluation physiologique</p>
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
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{test.objectif}</p>
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant={fiab.variant} className="text-xs">
                    {Math.round(test.fiabilite * 100)}% fiable
                  </Badge>
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
                        {test.variables.map((v, i) => (
                          <Badge key={i} variant="secondary">{v}</Badge>
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
                    {currentAthlete && (
                      <Button 
                        onClick={() => handleRunTest(test)}
                        className="w-full gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Faire passer ce test à {currentAthlete.nom}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTest && getSportIcon(selectedTest.sport)}
              {selectedTest?.nom}
            </DialogTitle>
            <DialogDescription>
              Enregistrer le résultat pour {currentAthlete?.nom}
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                <strong>Variables:</strong> {selectedTest.variables.join(", ")}
              </div>

              <div>
                <Label>Valeur mesurée</Label>
                <Input
                  type="number"
                  placeholder="Entrer la valeur"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="mt-1"
                  min={0}
                  max={10000}
                />
              </div>

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
    </div>
  );
}

// Export pour utilisation externe
export { TestLibrary };
export type { TestProtocol };

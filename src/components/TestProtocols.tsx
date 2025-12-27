import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlaskConical, Clock, Target, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestProtocol {
  id: string;
  name: string;
  duration: string;
  description: string;
  steps: string[];
  metrics: string[];
  difficulty: "Facile" | "Modéré" | "Difficile";
}

const protocols: TestProtocol[] = [
  {
    id: "ramp",
    name: "Test Rampe FTP",
    duration: "25-35 min",
    description: "Test progressif pour estimer le FTP et la VO2max",
    steps: [
      "Échauffement 10 min à Z1-Z2",
      "Départ à 100W, +20W toutes les minutes",
      "Continuer jusqu'à l'épuisement",
      "FTP ≈ 75% de la puissance moyenne dernière minute",
    ],
    metrics: ["FTP estimé", "VO2max proxy", "Pmax"],
    difficulty: "Difficile",
  },
  {
    id: "20min",
    name: "Test 20 minutes",
    duration: "45 min",
    description: "Test terrain classique pour déterminer le FTP",
    steps: [
      "Échauffement 15 min progressif",
      "5 min à effort soutenu (purge)",
      "5 min récupération",
      "20 min all-out régulier",
      "FTP = 95% de la puissance moyenne",
    ],
    metrics: ["FTP", "Puissance Normalisée", "VI"],
    difficulty: "Difficile",
  },
  {
    id: "lactate",
    name: "Test Lactate Simplifié",
    duration: "60 min",
    description: "Paliers pour estimer les seuils lactiques",
    steps: [
      "Échauffement 10 min",
      "Paliers de 4 min: 150W, 180W, 210W, 240W, 270W...",
      "2 min récup entre paliers",
      "Mesure lactate capillaire à chaque fin de palier",
      "Arrêt quand lactate > 4 mmol/L ou épuisement",
    ],
    metrics: ["LT1", "LT2", "VLamax estimé", "Courbe lactate"],
    difficulty: "Modéré",
  },
  {
    id: "sprint",
    name: "Test Sprint 5s",
    duration: "20 min",
    description: "Mesure de la puissance maximale anaérobie",
    steps: [
      "Échauffement 10 min avec 2-3 accélérations",
      "Repos 3 min",
      "Sprint maximal 5 secondes depuis départ arrêté",
      "Repos 5 min",
      "Sprint maximal 5 secondes lancé",
      "Retenir la meilleure valeur",
    ],
    metrics: ["Pmax 5s", "Pic de puissance", "Ratio W/kg"],
    difficulty: "Facile",
  },
];

const difficultyColors = {
  Facile: "bg-success/10 text-success",
  Modéré: "bg-warning/10 text-warning",
  Difficile: "bg-destructive/10 text-destructive",
};

export function TestProtocols() {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-success/10 text-success">
          <FlaskConical className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Protocoles de Test</h2>
          <p className="text-sm text-muted-foreground">Tests validés pour calibrer vos zones</p>
        </div>
      </div>

      <div className="grid gap-4">
        {protocols.map((protocol) => (
          <div
            key={protocol.id}
            className={cn(
              "border border-border rounded-xl overflow-hidden transition-all duration-300",
              expandedTest === protocol.id && "border-primary/30"
            )}
          >
            <div
              onClick={() => setExpandedTest(expandedTest === protocol.id ? null : protocol.id)}
              className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{protocol.duration}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{protocol.name}</h3>
                    <p className="text-sm text-muted-foreground">{protocol.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs px-2 py-1 rounded-full", difficultyColors[protocol.difficulty])}>
                    {protocol.difficulty}
                  </span>
                  <ChevronRight
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform duration-300",
                      expandedTest === protocol.id && "rotate-90"
                    )}
                  />
                </div>
              </div>
            </div>

            {expandedTest === protocol.id && (
              <div className="p-4 pt-0 border-t border-border bg-secondary/20 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Play className="w-4 h-4 text-primary" />
                      Étapes du protocole
                    </h4>
                    <ol className="space-y-2">
                      {protocol.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-accent" />
                      Métriques obtenues
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {protocol.metrics.map((metric) => (
                        <span
                          key={metric}
                          className="px-3 py-1.5 bg-accent/10 text-accent text-sm rounded-lg"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                    
                    <Button className="mt-6 w-full" variant="glow">
                      <Play className="w-4 h-4 mr-2" />
                      Démarrer le test
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

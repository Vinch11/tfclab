import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlaskConical, Clock, Target, ChevronRight, Play, Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestProtocol {
  id: string;
  nom: string;
  description: string;
  objectif: string;
  materiel: string[];
  procedure: string[];
  consignes: string[];
  duration?: string;
  difficulty?: "Facile" | "Modéré" | "Difficile";
}

const protocols: TestProtocol[] = [
  {
    id: "pmax5s",
    nom: "Test Pmax 5s",
    description: "Mesure puissance maximale 5s.",
    objectif: "Calculer VLamax.",
    materiel: ["Home-trainer", "Chronomètre", "Casque"],
    procedure: [
      "Échauffement 15 min",
      "Sprint maximal 5s",
      "Répéter si nécessaire après 3 min repos",
    ],
    consignes: ["Pas fatigué", "Sécurité sur le vélo"],
    duration: "20 min",
    difficulty: "Facile",
  },
  {
    id: "cp",
    nom: "Test CP",
    description: "Mesure puissance critique 20-30 min.",
    objectif: "Calculer puissance moyenne durable.",
    materiel: ["Home-trainer", "Chronomètre", "Nutrition habituelle"],
    procedure: [
      "Échauffement 20 min",
      "Effort maximal soutenu 20-30 min",
    ],
    consignes: ["Hydratation", "Pas malade/fatigué"],
    duration: "45-50 min",
    difficulty: "Difficile",
  },
  {
    id: "tte",
    nom: "Test TTE",
    description: "Durée maximale à puissance donnée.",
    objectif: "Évaluer tolérance à l'effort.",
    materiel: ["Home-trainer", "Chronomètre", "Capteur de puissance"],
    procedure: [
      "Échauffement 15 min",
      "Maintenir puissance cible jusqu'épuisement",
    ],
    consignes: ["Sécurité", "Pas malade/fatigué"],
    duration: "Variable",
    difficulty: "Difficile",
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
          <p className="text-sm text-muted-foreground">Tests validés pour calibrer VLamax</p>
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
                    <h3 className="font-medium text-foreground">{protocol.nom}</h3>
                    <p className="text-sm text-muted-foreground">{protocol.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {protocol.difficulty && (
                    <span className={cn("text-xs px-2 py-1 rounded-full", difficultyColors[protocol.difficulty])}>
                      {protocol.difficulty}
                    </span>
                  )}
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
                {/* Objectif */}
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                  <p className="text-sm">
                    <span className="font-medium text-primary">Objectif:</span>{" "}
                    <span className="text-foreground">{protocol.objectif}</span>
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Procédure */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Play className="w-4 h-4 text-primary" />
                      Procédure
                    </h4>
                    <ol className="space-y-2">
                      {protocol.procedure.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-4">
                    {/* Matériel */}
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-accent" />
                        Matériel requis
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {protocol.materiel.map((item) => (
                          <span
                            key={item}
                            className="px-3 py-1.5 bg-accent/10 text-accent text-sm rounded-lg"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Consignes */}
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        Consignes
                      </h4>
                      <ul className="space-y-1">
                        {protocol.consignes.map((consigne, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-warning">
                            <span>•</span>
                            {consigne}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button className="w-full" variant="glow">
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

// Helper function to find and display a protocol
export function getProtocol(testNom: string): TestProtocol | undefined {
  return protocols.find((t) => t.nom === testNom);
}

// Export protocols for external use
export { protocols };

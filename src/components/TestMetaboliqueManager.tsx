import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FlaskConical,
  Plus,
  CalendarIcon,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Timer,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TestMetabolique,
  defaultTestMetabolique,
  estimateVLamaxFromTest,
  formatTTE,
  computeWPrime,
} from "@/types/testMetabolique";

interface TestMetaboliqueManagerProps {
  tests: TestMetabolique[];
  onTestsChange: (tests: TestMetabolique[]) => void;
  athletePoids: number;
}

export function TestMetaboliqueManager({
  tests,
  onTestsChange,
  athletePoids,
}: TestMetaboliqueManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTest, setNewTest] = useState<TestMetabolique>({
    ...defaultTestMetabolique,
    id: crypto.randomUUID(),
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleAddTest = () => {
    if (!newTest.pmax_5s || !newTest.cp) return;

    const testToAdd: TestMetabolique = {
      ...newTest,
      date: selectedDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    const updatedTests = [...tests, testToAdd].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    onTestsChange(updatedTests);
    setNewTest({ ...defaultTestMetabolique, id: crypto.randomUUID() });
    setSelectedDate(new Date());
    setIsAdding(false);
  };

  const handleDeleteTest = (id: string) => {
    onTestsChange(tests.filter((t) => t.id !== id));
  };

  const getTestTrend = (index: number, field: keyof TestMetabolique): "up" | "down" | "neutral" => {
    if (index >= tests.length - 1) return "neutral";
    const current = tests[index][field] as number;
    const previous = tests[index + 1][field] as number;
    if (!current || !previous) return "neutral";
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3 text-success" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const latestTest = tests[0];
  const latestVlamax = latestTest ? estimateVLamaxFromTest(latestTest, athletePoids) : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-success/10 text-success">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Tests Métaboliques</h2>
            <p className="text-sm text-muted-foreground">Historique et suivi de progression</p>
          </div>
        </div>
        <Button
          variant={isAdding ? "outline" : "glow"}
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? (
            "Annuler"
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Test
            </>
          )}
        </Button>
      </div>

      {/* Latest Test Summary */}
      {latestTest && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Dernier test</span>
            <span className="text-sm text-foreground font-medium">
              {format(new Date(latestTest.date), "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pmax 5s</p>
              <p className="text-xl font-bold font-mono text-accent">{latestTest.pmax_5s}W</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">CP / FTP</p>
              <p className="text-xl font-bold font-mono text-primary">{latestTest.cp}W</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">VLamax Est.</p>
              <p className="text-xl font-bold font-mono text-success">{latestVlamax.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">W'</p>
              <p className="text-xl font-bold font-mono text-warning">{computeWPrime(latestTest)}kJ</p>
            </div>
          </div>
        </div>
      )}

      {/* Add New Test Form */}
      {isAdding && (
        <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border animate-fade-in">
          <h3 className="text-sm font-medium text-foreground mb-4">Ajouter un test</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Date du test</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pmax" className="text-muted-foreground">
                Pmax 5s (W)
              </Label>
              <Input
                id="pmax"
                type="number"
                value={newTest.pmax_5s || ""}
                onChange={(e) =>
                  setNewTest({ ...newTest, pmax_5s: parseFloat(e.target.value) || 0 })
                }
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="1200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp" className="text-muted-foreground">
                CP / FTP (W)
              </Label>
              <Input
                id="cp"
                type="number"
                value={newTest.cp || ""}
                onChange={(e) => setNewTest({ ...newTest, cp: parseFloat(e.target.value) || 0 })}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="280"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tte" className="text-muted-foreground">
                TTE (secondes)
              </Label>
              <Input
                id="tte"
                type="number"
                value={newTest.tte || ""}
                onChange={(e) => setNewTest({ ...newTest, tte: parseFloat(e.target.value) || 0 })}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="3600"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="glow" onClick={handleAddTest} disabled={!newTest.pmax_5s || !newTest.cp}>
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer le test
            </Button>
          </div>
        </div>
      )}

      {/* Tests History */}
      <div className="space-y-3">
        {tests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun test enregistré</p>
            <p className="text-sm">Ajoutez votre premier test métabolique</p>
          </div>
        ) : (
          tests.map((test, index) => (
            <div
              key={test.id}
              className="p-4 rounded-xl border border-border hover:border-primary/30 transition-all duration-200 bg-secondary/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-foreground">
                      {format(new Date(test.date), "d", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(new Date(test.date), "MMM yyyy", { locale: fr })}
                    </p>
                  </div>

                  <div className="h-10 w-px bg-border" />

                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pmax</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono font-medium text-foreground">{test.pmax_5s}W</p>
                          <TrendIcon trend={getTestTrend(index, "pmax_5s")} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">CP</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono font-medium text-foreground">{test.cp}W</p>
                          <TrendIcon trend={getTestTrend(index, "cp")} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-warning" />
                      <div>
                        <p className="text-xs text-muted-foreground">TTE</p>
                        <p className="font-mono font-medium text-foreground">{formatTTE(test.tte)}</p>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-success" />
                      <div>
                        <p className="text-xs text-muted-foreground">VLamax</p>
                        <p className="font-mono font-medium text-success">
                          {estimateVLamaxFromTest(test, athletePoids).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTest(test.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

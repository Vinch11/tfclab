import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Save } from "lucide-react";
import { Athlete } from "@/types/athlete";
import { StoredTestResult } from "@/types/testLibrary";
import { useToast } from "@/hooks/use-toast";

interface ManualTestsEditorProps {
  athlete: Athlete | null;
  onSave: (athlete: Athlete) => void;
  onBack: () => void;
}

function generateId(): string {
  return "T_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now().toString(36);
}

export function ManualTestsEditor({ athlete, onSave, onBack }: ManualTestsEditorProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<StoredTestResult | null>(null);

  // Form state
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [testType, setTestType] = useState("VLAMAX");
  const [testSport, setTestSport] = useState("cyclisme");
  const [testVlamax, setTestVlamax] = useState("");
  const [testFiabilite, setTestFiabilite] = useState("0.7");
  const [testNote, setTestNote] = useState("");

  if (!athlete) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Aucun athlète sélectionné.</p>
          <Button onClick={onBack} variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tests = (athlete.tests || []).slice().sort((a, b) => 
    (b.date || "").localeCompare(a.date || "")
  );

  const openNewTest = () => {
    setEditingTest(null);
    setTestName("Test VLamax (manuel)");
    setTestDate(new Date().toISOString().slice(0, 10));
    setTestType("VLAMAX");
    setTestSport("cyclisme");
    setTestVlamax("");
    setTestFiabilite("0.7");
    setTestNote("");
    setDialogOpen(true);
  };

  const openEditTest = (test: StoredTestResult) => {
    setEditingTest(test);
    setTestName(test.nom || "");
    setTestDate(test.date || "");
    setTestType(test.type || "VLAMAX");
    setTestSport(test.sport || "cyclisme");
    setTestVlamax(test.vlamax?.toString() || "");
    setTestFiabilite(test.fiabilite?.toString() || "0.7");
    setTestNote(test.note || "");
    setDialogOpen(true);
  };

  const handleSaveTest = () => {
    const test: StoredTestResult = {
      id: editingTest?.id || generateId(),
      nom: testName.trim(),
      date: testDate,
      type: testType as "VLAMAX" | "REF",
      sport: testSport,
      vlamax: testVlamax ? Number(testVlamax) : null,
      fiabilite: Math.max(0, Math.min(1, Number(testFiabilite) || 0.7)),
      note: testNote,
      raw: editingTest?.raw || {},
      source: "manual"
    };

    const updatedTests = [...(athlete.tests || [])];
    const existingIndex = updatedTests.findIndex(t => t.id === test.id);
    
    if (existingIndex >= 0) {
      updatedTests[existingIndex] = test;
    } else {
      updatedTests.push(test);
    }

    const updatedAthlete: Athlete = {
      ...athlete,
      tests: updatedTests,
      updatedAt: new Date().toISOString()
    };

    onSave(updatedAthlete);
    setDialogOpen(false);
    toast({
      title: editingTest ? "Test modifié" : "Test ajouté",
      description: `"${test.nom}" a été ${editingTest ? "mis à jour" : "ajouté"}.`
    });
  };

  const handleDeleteTest = (testId: string) => {
    if (!confirm("Supprimer ce test ?")) return;

    const updatedTests = (athlete.tests || []).filter(t => t.id !== testId);
    const updatedAthlete: Athlete = {
      ...athlete,
      tests: updatedTests,
      updatedAt: new Date().toISOString()
    };

    onSave(updatedAthlete);
    toast({
      title: "Test supprimé",
      description: "Le test a été supprimé."
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Tests — édition manuelle
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ajoute/édite des tests manuellement. Chaque test est tagué source=manual.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour profil
            </Button>
            <Button onClick={openNewTest}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tests list */}
      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Aucun test enregistré.</p>
          </CardContent>
        </Card>
      ) : (
        tests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <span className="font-medium">{test.nom}</span>
                <span className="text-muted-foreground ml-2">
                  ({test.type} • {test.sport} • {test.date})
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                VLamax: <strong>{test.vlamax ?? "—"}</strong> • 
                Fiabilité: <strong>{test.fiabilite ?? "—"}</strong>
              </div>
              {test.note && (
                <div className="text-sm text-muted-foreground">
                  Note: {test.note}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => openEditTest(test)} variant="outline" size="sm">
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button onClick={() => handleDeleteTest(test.id)} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog for adding/editing test */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTest ? "Modifier le test" : "Ajouter un test"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du test</Label>
              <Input value={testName} onChange={(e) => setTestName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VLAMAX">VLAMAX</SelectItem>
                  <SelectItem value="REF">REF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sport</Label>
              <Select value={testSport} onValueChange={setTestSport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cyclisme">Cyclisme</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="natation">Natation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>VLamax (si applicable)</Label>
              <Input 
                type="number" 
                step="0.01"
                placeholder="ex: 0.45" 
                value={testVlamax} 
                onChange={(e) => setTestVlamax(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Fiabilité (0.0 – 1.0)</Label>
              <Input 
                type="number" 
                min="0" 
                max="1" 
                step="0.1"
                value={testFiabilite} 
                onChange={(e) => setTestFiabilite(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Input value={testNote} onChange={(e) => setTestNote(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveTest}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================
// ÉCRAN 3 - SYNC NOLIO / SNAPSHOT MULTI-SPORT
// =============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Database, Bike, PersonStanding, Waves } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { SnapshotNolio, SportType } from "@/types/snapshotNolio";
import { toast } from "sonner";

export default function SnapshotSyncPage() {
  const navigate = useNavigate();
  const { currentAthlete, addSnapshot } = useAthletes();

  const [sport, setSport] = useState<SportType>("vélo");
  const [poids, setPoids] = useState("70");
  const [vo2max, setVo2max] = useState("");
  const [hrv, setHrv] = useState("");
  
  // Vélo
  const [ftp, setFtp] = useState("");
  const [pmax5s, setPmax5s] = useState("");
  const [tss7j, setTss7j] = useState("");
  
  // Course
  const [vma, setVma] = useState("");
  const [allureSeuil, setAllureSeuil] = useState("");
  
  // Natation
  const [pace100, setPace100] = useState("");
  const [css, setCss] = useState("");

  if (!currentAthlete) {
    return (
      <AppLayout title="Données NOLIO" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Sélectionnez d'abord un athlète
            </p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const validateSnapshot = (): boolean => {
    if (!poids) {
      toast.error("Le poids est requis");
      return false;
    }
    
    if (sport === "vélo" && (!ftp || !pmax5s || !tss7j)) {
      toast.error("FTP, Pmax 5s et TSS 7j sont requis pour le vélo");
      return false;
    }
    
    if (sport === "course" && !vma) {
      toast.error("La VMA est requise pour la course");
      return false;
    }
    
    if (sport === "natation" && !pace100) {
      toast.error("Le pace 100m est requis pour la natation");
      return false;
    }
    
    return true;
  };

  const handleAddSnapshot = () => {
    if (!validateSnapshot()) return;

    const snapshot: SnapshotNolio = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      sport,
      poids: parseFloat(poids),
      vo2max: vo2max ? parseFloat(vo2max) : undefined,
      hrv: hrv ? parseFloat(hrv) : undefined,
      source: "nolio",
    };

    // Données spécifiques au sport
    if (sport === "vélo") {
      snapshot.ftp = parseFloat(ftp);
      snapshot.pmax_5s = parseFloat(pmax5s);
      snapshot.tss_7j = parseFloat(tss7j);
    } else if (sport === "course") {
      snapshot.vma = parseFloat(vma);
      snapshot.allure_seuil = allureSeuil ? parseFloat(allureSeuil) : undefined;
    } else if (sport === "natation") {
      snapshot.pace100 = parseFloat(pace100);
      snapshot.css = css ? parseFloat(css) : undefined;
    }

    addSnapshot(currentAthlete.id, snapshot);
    toast.success(`Snapshot ${sport} ajouté`);
    navigate("/dashboard");
  };

  return (
    <AppLayout title="Données NOLIO" showBack>
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Import Snapshot Multi-Sport
            </CardTitle>
            <CardDescription>
              Sélectionnez le sport et entrez les données de performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sélection du sport */}
            <Tabs value={sport} onValueChange={(v) => setSport(v as SportType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vélo" className="gap-1">
                  <Bike className="h-4 w-4" />
                  Vélo
                </TabsTrigger>
                <TabsTrigger value="course" className="gap-1">
                  <PersonStanding className="h-4 w-4" />
                  Course
                </TabsTrigger>
                <TabsTrigger value="natation" className="gap-1">
                  <Waves className="h-4 w-4" />
                  Natation
                </TabsTrigger>
              </TabsList>

              {/* Données Vélo */}
              <TabsContent value="vélo" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ftp">FTP (W) *</Label>
                    <Input
                      id="ftp"
                      type="number"
                      placeholder="280"
                      value={ftp}
                      onChange={(e) => setFtp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pmax">Pmax 5s (W) *</Label>
                    <Input
                      id="pmax"
                      type="number"
                      placeholder="1050"
                      value={pmax5s}
                      onChange={(e) => setPmax5s(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tss">TSS 7 jours *</Label>
                  <Input
                    id="tss"
                    type="number"
                    placeholder="550"
                    value={tss7j}
                    onChange={(e) => setTss7j(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Données Course */}
              <TabsContent value="course" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vma">VMA (km/h) *</Label>
                    <Input
                      id="vma"
                      type="number"
                      step="0.1"
                      placeholder="18"
                      value={vma}
                      onChange={(e) => setVma(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allure">Allure seuil (min/km)</Label>
                    <Input
                      id="allure"
                      type="number"
                      step="0.1"
                      placeholder="4.2"
                      value={allureSeuil}
                      onChange={(e) => setAllureSeuil(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Données Natation */}
              <TabsContent value="natation" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pace">Pace 100m (sec) *</Label>
                    <Input
                      id="pace"
                      type="number"
                      placeholder="95"
                      value={pace100}
                      onChange={(e) => setPace100(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="css">CSS (min/100m)</Label>
                    <Input
                      id="css"
                      type="number"
                      step="0.01"
                      placeholder="1.6"
                      value={css}
                      onChange={(e) => setCss(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Données communes */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                Données communes (tous sports)
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="poids">Poids (kg) *</Label>
                  <Input
                    id="poids"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={poids}
                    onChange={(e) => setPoids(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vo2">VO2max</Label>
                  <Input
                    id="vo2"
                    type="number"
                    placeholder="52"
                    value={vo2max}
                    onChange={(e) => setVo2max(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hrv">HRV (ms)</Label>
                  <Input
                    id="hrv"
                    type="number"
                    placeholder="60"
                    value={hrv}
                    onChange={(e) => setHrv(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleAddSnapshot} className="w-full gap-2" size="lg">
          <RefreshCw className="h-4 w-4" />
          Ajouter Snapshot {sport}
        </Button>
      </div>
    </AppLayout>
  );
}

// =============================================
// ÉCRAN 3 - SYNC NOLIO / SNAPSHOT
// =============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Database, ArrowRight } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { SnapshotNolio } from "@/types/snapshotNolio";
import { toast } from "sonner";

export default function SnapshotSyncPage() {
  const navigate = useNavigate();
  const { currentAthlete, addSnapshot } = useAthletes();

  const [ftp, setFtp] = useState("");
  const [pmax5s, setPmax5s] = useState("");
  const [poids, setPoids] = useState("70");
  const [vo2max, setVo2max] = useState("");
  const [hrv, setHrv] = useState("");
  const [tss7j, setTss7j] = useState("");
  const [fcMax, setFcMax] = useState("");
  const [fcRepos, setFcRepos] = useState("");

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

  const handleAddSnapshot = () => {
    if (!ftp || !pmax5s || !poids || !tss7j) {
      toast.error("FTP, Pmax 5s, Poids et TSS 7j sont requis");
      return;
    }

    const snapshot: SnapshotNolio = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      ftp: parseFloat(ftp),
      pmax_5s: parseFloat(pmax5s),
      poids: parseFloat(poids),
      vo2max: vo2max ? parseFloat(vo2max) : undefined,
      hrv: hrv ? parseFloat(hrv) : undefined,
      fc_max: fcMax ? parseFloat(fcMax) : undefined,
      fc_repos: fcRepos ? parseFloat(fcRepos) : undefined,
      tss_7j: parseFloat(tss7j),
      source: "nolio",
    };

    addSnapshot(currentAthlete.id, snapshot);
    toast.success("Snapshot ajouté");
    navigate("/dashboard");
  };

  return (
    <AppLayout title="Données NOLIO" showBack>
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Import Snapshot NOLIO
            </CardTitle>
            <CardDescription>
              Entrez les données de performance depuis NOLIO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Données essentielles */}
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

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="tss">TSS 7 jours *</Label>
                <Input
                  id="tss"
                  type="number"
                  placeholder="550"
                  value={tss7j}
                  onChange={(e) => setTss7j(e.target.value)}
                />
              </div>
            </div>

            {/* Données optionnelles */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                Données optionnelles (améliorent la précision)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vo2">VO2max (ml/kg/min)</Label>
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

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fcmax">FC max (bpm)</Label>
                  <Input
                    id="fcmax"
                    type="number"
                    placeholder="190"
                    value={fcMax}
                    onChange={(e) => setFcMax(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fcrepos">FC repos (bpm)</Label>
                  <Input
                    id="fcrepos"
                    type="number"
                    placeholder="50"
                    value={fcRepos}
                    onChange={(e) => setFcRepos(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleAddSnapshot} className="w-full gap-2" size="lg">
          <RefreshCw className="h-4 w-4" />
          Ajouter Snapshot
        </Button>
      </div>
    </AppLayout>
  );
}

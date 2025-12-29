import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, Target, Scale, Activity, Percent, Plus, Database, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete, ObjectifType, SexeType, getObjectifLabel, getDernierSnapshot } from "@/types/athlete";
import { SnapshotNolio, creerSnapshotVide, scoreConfiance, estimerTTE } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { MetricExplanationPopup } from "./MetricExplanationPopup";
import { SnapshotEditor } from "./SnapshotEditor";
import { CSVImporter } from "./CSVImporter";

interface AthleteProfileProps {
  athlete: Athlete;
  onUpdate: (athlete: Athlete) => void;
}

export function AthleteProfile({ athlete, onUpdate }: AthleteProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSnapshot, setIsAddingSnapshot] = useState(false);
  const [formData, setFormData] = useState<Athlete>(athlete);
  const [newSnapshot, setNewSnapshot] = useState<SnapshotNolio>(creerSnapshotVide());

  const snapshot = getDernierSnapshot(athlete);
  const vlamax = snapshot ? calculVLamaxSnapshot(snapshot, athlete.objectif) : 0;
  const tte = snapshot ? estimerTTE(snapshot.ftp, snapshot.tss_7j) : 0;
  const confiance = snapshot ? scoreConfiance(snapshot) : 0;

  const handleSave = () => {
    onUpdate({ ...formData, updatedAt: new Date().toISOString() });
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Athlete, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSnapshotChange = (field: keyof SnapshotNolio, value: string | number) => {
    setNewSnapshot((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSnapshot = () => {
    const updatedAthlete: Athlete = {
      ...athlete,
      historique: [...(athlete.historique || []), { ...newSnapshot, id: crypto.randomUUID() }],
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedAthlete);
    setIsAddingSnapshot(false);
    setNewSnapshot(creerSnapshotVide());
  };

  const handleCSVImport = (snapshots: SnapshotNolio[]) => {
    const updatedAthlete: Athlete = {
      ...athlete,
      historique: [...(athlete.historique || []), ...snapshots],
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedAthlete);
  };

  const handleSnapshotEdit = (updatedSnapshot: SnapshotNolio) => {
    const updatedHistorique = (athlete.historique || []).map(s => 
      s.id === updatedSnapshot.id ? updatedSnapshot : s
    );
    const updatedAthlete: Athlete = {
      ...athlete,
      historique: updatedHistorique,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedAthlete);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Profil Athlète</h2>
            <p className="text-sm text-muted-foreground">Données depuis NOLIO</p>
          </div>
        </div>
        <div className="flex gap-2">
          <CSVImporter onImport={handleCSVImport} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSnapshot(!isAddingSnapshot)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Snapshot
          </Button>
          {snapshot && (
            <SnapshotEditor 
              snapshot={snapshot} 
              onSave={handleSnapshotEdit}
              trigger={
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Éditer
                </Button>
              }
            />
          )}
          <Button
            variant={isEditing ? "glow" : "outline"}
            size="sm"
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            ) : (
              "Modifier"
            )}
          </Button>
        </div>
      </div>

      {/* Add Snapshot Form */}
      {isAddingSnapshot && (
        <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Nouveau Snapshot NOLIO</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={newSnapshot.date}
                onChange={(e) => handleSnapshotChange("date", e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">FTP (W)</Label>
              <Input
                type="number"
                value={newSnapshot.ftp || ""}
                onChange={(e) => handleSnapshotChange("ftp", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Pmax 5s (W)</Label>
              <Input
                type="number"
                value={newSnapshot.pmax_5s || ""}
                onChange={(e) => handleSnapshotChange("pmax_5s", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Poids (kg)</Label>
              <Input
                type="number"
                value={newSnapshot.poids || ""}
                onChange={(e) => handleSnapshotChange("poids", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">TSS 7j</Label>
              <Input
                type="number"
                value={newSnapshot.tss_7j || ""}
                onChange={(e) => handleSnapshotChange("tss_7j", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">VO2max (ml/kg)</Label>
              <Input
                type="number"
                value={newSnapshot.vo2max || ""}
                onChange={(e) => handleSnapshotChange("vo2max", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">HRV (ms)</Label>
              <Input
                type="number"
                value={newSnapshot.hrv || ""}
                onChange={(e) => handleSnapshotChange("hrv", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>
          <Button onClick={handleAddSnapshot} variant="glow" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter Snapshot
          </Button>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          {/* Name & Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom" className="text-muted-foreground">Nom</Label>
              <Input
                id="nom"
                value={formData.nom || ""}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="Nom de l'athlète"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Sexe</Label>
              <div className="flex gap-2">
                {(["M", "F"] as SexeType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleInputChange("sexe", s)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all duration-200",
                      formData.sexe === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {s === "M" ? "Homme" : "Femme"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Objectif</Label>
              <div className="flex gap-2">
                {(["IM", "703"] as ObjectifType[]).map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => handleInputChange("objectif", obj)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all duration-200 text-sm",
                      formData.objectif === obj
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-accent/50"
                    )}
                  >
                    {obj === "IM" ? "Ironman" : "70.3"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Masse grasse */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="masse_grasse" className="text-muted-foreground">Masse grasse (%)</Label>
              <Input
                id="masse_grasse"
                type="number"
                value={formData.masse_grasse || ""}
                onChange={(e) => handleInputChange("masse_grasse", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="18"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Display */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {formData.nom?.[0] || formData.sexe}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {formData.nom || "Athlète"}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">{formData.sexe === "M" ? "Homme" : "Femme"}</span>
                <span className="text-sm px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  {getObjectifLabel(formData.objectif)}
                </span>
                <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {athlete.historique?.length || 0} snapshots
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid from Latest Snapshot */}
          {snapshot ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Poids</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">{snapshot.poids}<span className="text-sm text-muted-foreground ml-1">kg</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">FTP</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-primary">{snapshot.ftp}<span className="text-sm text-muted-foreground ml-1">W</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">VO2max</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-success">{snapshot.vo2max || "—"}<span className="text-sm text-muted-foreground ml-1">ml/kg</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Percent className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Masse grasse</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-warning">{formData.masse_grasse || "—"}<span className="text-sm text-muted-foreground ml-1">%</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">VLamax</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-accent">{vlamax.toFixed(2)}<span className="text-sm text-muted-foreground ml-1">mmol/L/s</span></p>
                </div>
              </div>

              {/* W/kg Display */}
              {snapshot.ftp && snapshot.poids > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ratio Puissance/Poids</p>
                      <p className="text-3xl font-bold font-mono text-foreground">
                        {(snapshot.ftp / snapshot.poids).toFixed(2)}
                        <span className="text-lg text-muted-foreground ml-2">W/kg</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">TTE Estimé</p>
                      <p className="text-2xl font-bold font-mono text-primary">{tte}<span className="text-sm text-muted-foreground ml-1">min</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Confiance données</p>
                      <p className="text-2xl font-bold font-mono text-success">{confiance}<span className="text-sm text-muted-foreground ml-1">%</span></p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-secondary/20 rounded-xl border border-border">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun snapshot disponible</p>
              <p className="text-sm">Ajoutez un snapshot pour voir les métriques</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

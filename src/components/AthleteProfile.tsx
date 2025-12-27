import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, Target, Scale, Activity, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete, ObjectifType, SexeType, getObjectifLabel } from "@/types/athlete";

interface AthleteProfileProps {
  athlete: Athlete;
  onUpdate: (athlete: Athlete) => void;
}

export function AthleteProfile({ athlete, onUpdate }: AthleteProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Athlete>(athlete);

  const handleSave = () => {
    onUpdate({ ...formData, updatedAt: new Date().toISOString() });
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Athlete, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
            <p className="text-sm text-muted-foreground">Vos données personnelles</p>
          </div>
        </div>
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

      {isEditing ? (
        <div className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom" className="text-muted-foreground">Prénom</Label>
              <Input
                id="prenom"
                value={formData.prenom || ""}
                onChange={(e) => handleInputChange("prenom", e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom" className="text-muted-foreground">Nom</Label>
              <Input
                id="nom"
                value={formData.nom || ""}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="Votre nom"
              />
            </div>
          </div>

          {/* Core Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poids" className="text-muted-foreground">Poids (kg)</Label>
              <Input
                id="poids"
                type="number"
                value={formData.poids}
                onChange={(e) => handleInputChange("poids", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
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

          {/* Performance Fields Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ftp" className="text-muted-foreground">FTP (W)</Label>
              <Input
                id="ftp"
                type="number"
                value={formData.ftp || ""}
                onChange={(e) => handleInputChange("ftp", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="320"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vo2max" className="text-muted-foreground">VO2max (ml/kg/min)</Label>
              <Input
                id="vo2max"
                type="number"
                value={formData.vo2max || ""}
                onChange={(e) => handleInputChange("vo2max", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="52"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="masse_musculaire" className="text-muted-foreground">Masse musculaire (%)</Label>
              <Input
                id="masse_musculaire"
                type="number"
                value={formData.masse_musculaire || ""}
                onChange={(e) => handleInputChange("masse_musculaire", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="45"
              />
            </div>
          </div>

          {/* Performance Fields Row 2 - Cardio */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fc_max" className="text-muted-foreground">FC Max (bpm)</Label>
              <Input
                id="fc_max"
                type="number"
                value={formData.fc_max || ""}
                onChange={(e) => handleInputChange("fc_max", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="190"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fc_repos" className="text-muted-foreground">FC Repos (bpm)</Label>
              <Input
                id="fc_repos"
                type="number"
                value={formData.fc_repos || ""}
                onChange={(e) => handleInputChange("fc_repos", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrv" className="text-muted-foreground">HRV (ms)</Label>
              <Input
                id="hrv"
                type="number"
                value={formData.hrv || ""}
                onChange={(e) => handleInputChange("hrv", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vlamax" className="text-muted-foreground">VLamax</Label>
              <Input
                id="vlamax"
                type="number"
                step="0.01"
                value={formData.vlamax || ""}
                onChange={(e) => handleInputChange("vlamax", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="0.42"
              />
            </div>
          </div>

          {/* Readiness Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sommeil" className="text-muted-foreground">Sommeil (heures)</Label>
              <Input
                id="sommeil"
                type="number"
                step="0.5"
                value={formData.sommeil || ""}
                onChange={(e) => handleInputChange("sommeil", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatigue_subjective" className="text-muted-foreground">Fatigue subjective (1-10)</Label>
              <Input
                id="fatigue_subjective"
                type="number"
                min="1"
                max="10"
                value={formData.fatigue_subjective || ""}
                onChange={(e) => handleInputChange("fatigue_subjective", parseFloat(e.target.value) || 0)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="4"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Display */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {formData.prenom?.[0] || formData.sexe}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {formData.prenom && formData.nom
                  ? `${formData.prenom} ${formData.nom}`
                  : "Athlète"}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">{formData.sexe === "M" ? "Homme" : "Femme"}</span>
                <span className="text-sm px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  {getObjectifLabel(formData.objectif)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Scale className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Poids</span>
              </div>
              <p className="text-2xl font-bold font-mono text-foreground">{formData.poids}<span className="text-sm text-muted-foreground ml-1">kg</span></p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">FTP</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{formData.ftp || "—"}<span className="text-sm text-muted-foreground ml-1">W</span></p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">VO2max</span>
              </div>
              <p className="text-2xl font-bold font-mono text-success">{formData.vo2max || "—"}<span className="text-sm text-muted-foreground ml-1">ml/kg</span></p>
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
              <p className="text-2xl font-bold font-mono text-accent">{formData.vlamax || "—"}<span className="text-sm text-muted-foreground ml-1">mmol/L/s</span></p>
            </div>
          </div>

          {/* W/kg Display */}
          {formData.ftp && formData.poids > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ratio Puissance/Poids</p>
                  <p className="text-3xl font-bold font-mono text-foreground">
                    {(formData.ftp / formData.poids).toFixed(2)}
                    <span className="text-lg text-muted-foreground ml-2">W/kg</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Catégorie</p>
                  <p className="text-lg font-semibold text-primary">
                    {(() => {
                      const wkg = formData.ftp / formData.poids;
                      if (wkg >= 5.5) return "World Tour";
                      if (wkg >= 4.5) return "Cat 1 / Elite";
                      if (wkg >= 4.0) return "Cat 2";
                      if (wkg >= 3.5) return "Cat 3";
                      if (wkg >= 3.0) return "Cat 4";
                      return "Récréatif";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

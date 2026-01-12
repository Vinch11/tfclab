import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FlaskConical, Save, Calendar } from "lucide-react";
import { Athlete, AthleteRefs } from "@/types/athlete";
import { useToast } from "@/hooks/use-toast";
import { calculateAge } from "@/lib/ageAdjustment";

interface AthleteEditorProps {
  athlete: Athlete | null;
  onSave: (athlete: Athlete) => void;
  onBack: () => void;
  onEditTests?: () => void;
}

interface ZoneRow {
  z: string;
  min: number;
  max: number;
}

function computeZones(refs: AthleteRefs): { fcZones: ZoneRow[]; vmaZones: ZoneRow[] } {
  const fcMax = refs.fcMax;
  const vma = refs.vma;

  const fcZones: ZoneRow[] = fcMax ? [
    { z: "Z1", min: Math.round(fcMax * 0.60), max: Math.round(fcMax * 0.70) },
    { z: "Z2", min: Math.round(fcMax * 0.70), max: Math.round(fcMax * 0.80) },
    { z: "Z3", min: Math.round(fcMax * 0.80), max: Math.round(fcMax * 0.87) },
    { z: "Z4a", min: Math.round(fcMax * 0.87), max: Math.round(fcMax * 0.92) },
    { z: "Z4b", min: Math.round(fcMax * 0.92), max: Math.round(fcMax * 0.97) },
    { z: "Z5", min: Math.round(fcMax * 0.97), max: fcMax }
  ] : [];

  const vmaZones: ZoneRow[] = vma ? [
    { z: "Z1", min: Math.round(vma * 0.60 * 10) / 10, max: Math.round(vma * 0.70 * 10) / 10 },
    { z: "Z2", min: Math.round(vma * 0.70 * 10) / 10, max: Math.round(vma * 0.80 * 10) / 10 },
    { z: "Z3", min: Math.round(vma * 0.80 * 10) / 10, max: Math.round(vma * 0.87 * 10) / 10 },
    { z: "Z4a", min: Math.round(vma * 0.87 * 10) / 10, max: Math.round(vma * 0.92 * 10) / 10 },
    { z: "Z4b", min: Math.round(vma * 0.92 * 10) / 10, max: Math.round(vma * 0.97 * 10) / 10 },
    { z: "Z5", min: Math.round(vma * 0.97 * 10) / 10, max: vma }
  ] : [];

  return { fcZones, vmaZones };
}

function ZonesTable({ zones, unit }: { zones: ZoneRow[]; unit: string }) {
  if (!zones.length) return <p className="text-muted-foreground">—</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Zone</th>
            <th className="text-left p-2">Min</th>
            <th className="text-left p-2">Max</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((row) => (
            <tr key={row.z} className="border-b border-border/50">
              <td className="p-2 font-medium">{row.z}</td>
              <td className="p-2">{row.min} {unit}</td>
              <td className="p-2">{row.max} {unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AthleteEditor({ athlete, onSave, onBack, onEditTests }: AthleteEditorProps) {
  const { toast } = useToast();

  const [nom, setNom] = useState(athlete?.nom || "");
  const [dateNaissance, setDateNaissance] = useState(athlete?.dateNaissance || "");
  const [objectif, setObjectif] = useState<string>(athlete?.objectif || "IM");
  const [fcMax, setFcMax] = useState<string>(athlete?.refs?.fcMax?.toString() || "");
  const [vma, setVma] = useState<string>(athlete?.refs?.vma?.toString() || "");
  const [ftp, setFtp] = useState<string>(athlete?.refs?.ftp?.toString() || "");
  const [css, setCss] = useState<string>(athlete?.refs?.css?.toString() || "");
  const [vo2max, setVo2max] = useState<string>(athlete?.vo2max?.toString() || "");

  const age = dateNaissance ? calculateAge(dateNaissance) : null;

  const [zones, setZones] = useState<{ fcZones: ZoneRow[]; vmaZones: ZoneRow[] }>({ fcZones: [], vmaZones: [] });

  useEffect(() => {
    const refs: AthleteRefs = {
      fcMax: fcMax ? Number(fcMax) : null,
      vma: vma ? Number(vma) : null,
      ftp: ftp ? Number(ftp) : null,
      css: css ? Number(css) : null
    };
    setZones(computeZones(refs));
  }, [fcMax, vma, ftp, css]);

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

  const handleSave = () => {
    const updatedAthlete: Athlete = {
      ...athlete,
      nom: nom.trim() || athlete.nom,
      dateNaissance: dateNaissance || undefined,
      objectif: objectif as Athlete["objectif"],
      vo2max: vo2max ? Number(vo2max) : undefined,
      refs: {
        fcMax: fcMax ? Number(fcMax) : null,
        vma: vma ? Number(vma) : null,
        ftp: ftp ? Number(ftp) : null,
        css: css ? Number(css) : null
      },
      updatedAt: new Date().toISOString()
    };

    onSave(updatedAthlete);
    toast({
      title: "Athlète sauvegardé",
      description: "Les modifications ont été enregistrées."
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✏️ Édition Athlète
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Modification manuelle. Les données sont sauvegardées localement.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            {onEditTests && (
              <Button onClick={onEditTests} variant="outline">
                <FlaskConical className="w-4 h-4 mr-2" />
                Éditer les tests
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date de naissance
            </Label>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={dateNaissance} 
                onChange={(e) => setDateNaissance(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              {age !== null && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  ({age} ans)
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>Objectif</Label>
            <Select value={objectif} onValueChange={setObjectif}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IM">Ironman</SelectItem>
                <SelectItem value="703">70.3</SelectItem>
                <SelectItem value="Marathon">Marathon</SelectItem>
                <SelectItem value="Semi">Semi-marathon</SelectItem>
                <SelectItem value="TrailShort">Trail 20–40 km</SelectItem>
                <SelectItem value="TrailMountain">Trail 40–80 km</SelectItem>
                <SelectItem value="TrailUltra">Ultra trail 80km+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Références */}
      <Card>
        <CardHeader>
          <CardTitle>Références physiologiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>FCmax (bpm)</Label>
            <Input type="number" placeholder="ex: 190" value={fcMax} onChange={(e) => setFcMax(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>VMA (km/h)</Label>
            <Input type="number" placeholder="ex: 18.5" step="0.1" value={vma} onChange={(e) => setVma(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>FTP (W)</Label>
            <Input type="number" placeholder="ex: 300" value={ftp} onChange={(e) => setFtp(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>CSS (s/100m)</Label>
            <Input type="number" placeholder="ex: 95" value={css} onChange={(e) => setCss(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
            <Label>VO₂max</Label>
            <Input type="number" placeholder="ex: 65" value={vo2max} onChange={(e) => setVo2max(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Zones */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu des zones (auto)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!fcMax && !vma ? (
            <p className="text-muted-foreground">Renseigne FCmax et/ou VMA pour afficher les zones.</p>
          ) : (
            <>
              {zones.fcZones.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Zones FC (%FCmax)</h4>
                  <ZonesTable zones={zones.fcZones} unit="bpm" />
                </div>
              )}
              {zones.vmaZones.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Zones VMA (%VMA)</h4>
                  <ZonesTable zones={zones.vmaZones} unit="km/h" />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Card>
        <CardContent className="p-4">
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer les modifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

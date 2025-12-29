// =============================================
// SNAPSHOT MANAGER - Gestion des snapshots Dan Lorang
// =============================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Trash2, Edit, TrendingUp, Brain, Calendar, Pin } from "lucide-react";
import { DbSnapshot, useCloudData } from "@/hooks/useCloudData";
import { deriveMetabolicProfile, generateLorangInsights, calculateDelta, formatValue } from "@/types/snapshot";

interface SnapshotManagerProps {
  athleteId: string;
  athleteName: string;
  athleteGoal: string;
  activeSnapshotId?: string | null;
}

export function SnapshotManager({ athleteId, athleteName, athleteGoal, activeSnapshotId }: SnapshotManagerProps) {
  const { getSnapshotsForAthlete, addSnapshot, updateSnapshot, deleteSnapshot, setActiveSnapshot } = useCloudData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<DbSnapshot | null>(null);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const snapshots = getSnapshotsForAthlete(athleteId);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    cycle_tag: "",
    confidence: "",
    fc_max: "",
    vma: "",
    ftp: "",
    css: "",
    vo2max: "",
    vlamax: "",
    weight_kg: "",
    fat_pct: "",
    pmax_5s: "",
    coach_notes: "",
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      cycle_tag: "",
      confidence: "",
      fc_max: "",
      vma: "",
      ftp: "",
      css: "",
      vo2max: "",
      vlamax: "",
      weight_kg: "",
      fat_pct: "",
      pmax_5s: "",
      coach_notes: "",
    });
  };

  const loadSnapshotToForm = (s: DbSnapshot) => {
    setFormData({
      date: s.date || new Date().toISOString().slice(0, 10),
      cycle_tag: s.cycle_tag || "",
      confidence: s.confidence != null ? String(s.confidence) : "",
      fc_max: s.fc_max != null ? String(s.fc_max) : "",
      vma: s.vma != null ? String(s.vma) : "",
      ftp: s.ftp != null ? String(s.ftp) : "",
      css: s.css != null ? String(s.css) : "",
      vo2max: s.vo2max != null ? String(s.vo2max) : "",
      vlamax: s.vlamax != null ? String(s.vlamax) : "",
      weight_kg: s.weight_kg != null ? String(s.weight_kg) : "",
      fat_pct: s.fat_pct != null ? String(s.fat_pct) : "",
      pmax_5s: s.pmax_5s != null ? String(s.pmax_5s) : "",
      coach_notes: s.coach_notes || "",
    });
  };

  const parseNum = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const handleCreate = async () => {
    const vlamax = parseNum(formData.vlamax);
    const vo2max = parseNum(formData.vo2max);
    const { profile, score } = deriveMetabolicProfile(vlamax, vo2max);

    await addSnapshot({
      athlete_id: athleteId,
      coach_id: "", // sera remplacé dans le hook
      date: formData.date,
      source: "manual",
      cycle_tag: formData.cycle_tag || null,
      confidence: parseNum(formData.confidence),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax,
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,
      metabolic_profile: profile,
      metabolic_score: score,
      coach_notes: formData.coach_notes || null,
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingSnapshot) return;

    const vlamax = parseNum(formData.vlamax);
    const vo2max = parseNum(formData.vo2max);
    const { profile, score } = deriveMetabolicProfile(vlamax, vo2max);

    await updateSnapshot(editingSnapshot.id, {
      date: formData.date,
      cycle_tag: formData.cycle_tag || null,
      confidence: parseNum(formData.confidence),
      fc_max: parseNum(formData.fc_max) ? Math.round(parseNum(formData.fc_max)!) : null,
      vma: parseNum(formData.vma),
      ftp: parseNum(formData.ftp) ? Math.round(parseNum(formData.ftp)!) : null,
      css: parseNum(formData.css),
      vo2max,
      vlamax,
      weight_kg: parseNum(formData.weight_kg),
      fat_pct: parseNum(formData.fat_pct),
      pmax_5s: parseNum(formData.pmax_5s) ? Math.round(parseNum(formData.pmax_5s)!) : null,
      metabolic_profile: profile,
      metabolic_score: score,
      coach_notes: formData.coach_notes || null,
    });

    setIsEditOpen(false);
    setEditingSnapshot(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce snapshot ?")) {
      await deleteSnapshot(id);
    }
  };

  const openEdit = (s: DbSnapshot) => {
    setEditingSnapshot(s);
    loadSnapshotToForm(s);
    setIsEditOpen(true);
  };

  const renderForm = () => (
    <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cycle_tag">Tag de cycle</Label>
          <Input
            id="cycle_tag"
            placeholder="Base1, Build2, Peak..."
            value={formData.cycle_tag}
            onChange={(e) => setFormData({ ...formData, cycle_tag: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vo2max">VO₂max</Label>
          <Input
            id="vo2max"
            type="number"
            step="0.1"
            placeholder="55"
            value={formData.vo2max}
            onChange={(e) => setFormData({ ...formData, vo2max: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="vlamax">VLamax</Label>
          <Input
            id="vlamax"
            type="number"
            step="0.01"
            placeholder="0.40"
            value={formData.vlamax}
            onChange={(e) => setFormData({ ...formData, vlamax: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="confidence">Confiance (0-1)</Label>
          <Input
            id="confidence"
            type="number"
            step="0.1"
            min="0"
            max="1"
            placeholder="0.8"
            value={formData.confidence}
            onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="ftp">FTP (W)</Label>
          <Input
            id="ftp"
            type="number"
            placeholder="280"
            value={formData.ftp}
            onChange={(e) => setFormData({ ...formData, ftp: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="vma">VMA (km/h)</Label>
          <Input
            id="vma"
            type="number"
            step="0.1"
            placeholder="18"
            value={formData.vma}
            onChange={(e) => setFormData({ ...formData, vma: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="fc_max">FC max</Label>
          <Input
            id="fc_max"
            type="number"
            placeholder="190"
            value={formData.fc_max}
            onChange={(e) => setFormData({ ...formData, fc_max: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="weight_kg">Poids (kg)</Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.1"
            placeholder="70"
            value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="pmax_5s">Pmax 5s (W)</Label>
          <Input
            id="pmax_5s"
            type="number"
            placeholder="1200"
            value={formData.pmax_5s}
            onChange={(e) => setFormData({ ...formData, pmax_5s: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="css">CSS (min/100m)</Label>
          <Input
            id="css"
            type="number"
            step="0.01"
            placeholder="1.40"
            value={formData.css}
            onChange={(e) => setFormData({ ...formData, css: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="coach_notes">Notes coach</Label>
        <Textarea
          id="coach_notes"
          placeholder="Observations, ressenti, contexte..."
          value={formData.coach_notes}
          onChange={(e) => setFormData({ ...formData, coach_notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  const renderSnapshotCard = (s: DbSnapshot) => {
    const { profile, score } = deriveMetabolicProfile(s.vlamax ?? null, s.vo2max ?? null);
    const insights = generateLorangInsights(
      {
        id: s.id,
        athlete_id: s.athlete_id,
        coach_id: s.coach_id,
        date: s.date,
        source: s.source as "manual" | "nolio" | "import",
        cycle_tag: s.cycle_tag ?? undefined,
        confidence: s.confidence ?? undefined,
        vlamax: s.vlamax ?? undefined,
        vo2max: s.vo2max ?? undefined,
        ftp: s.ftp ?? undefined,
        vma: s.vma ?? undefined,
        weight_kg: s.weight_kg ?? undefined,
        coach_notes: s.coach_notes ?? undefined,
      },
      athleteGoal
    );

    const isActive = s.id === activeSnapshotId;

    return (
      <Card key={s.id} className={`border-border/50 ${isActive ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {s.date}
                {s.cycle_tag && (
                  <Badge variant="secondary" className="ml-2">
                    {s.cycle_tag}
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="default" className="ml-2">
                    <Pin className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Profil: <span className="font-medium text-foreground">{profile}</span>
                {score != null && ` (score ${score}/100)`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant={isActive ? "secondary" : "ghost"} 
                onClick={() => setActiveSnapshot(athleteId, isActive ? null : s.id)}
                title={isActive ? "Retirer comme actif" : "Définir comme actif"}
              >
                <Pin className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">VO₂max:</span>{" "}
              <span className="font-medium">{formatValue(s.vo2max)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">VLamax:</span>{" "}
              <span className="font-medium">{formatValue(s.vlamax)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">FTP:</span>{" "}
              <span className="font-medium">{formatValue(s.ftp, "W")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">VMA:</span>{" "}
              <span className="font-medium">{formatValue(s.vma, "km/h")}</span>
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="insights" className="border-none">
              <AccordionTrigger className="py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Lecture Dan Lorang
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-sm">
                  {insights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            {s.coach_notes && (
              <AccordionItem value="notes" className="border-none">
                <AccordionTrigger className="py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Notes coach
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{s.coach_notes}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  const renderComparison = () => {
    const A = snapshots.find((s) => s.id === compareA);
    const B = snapshots.find((s) => s.id === compareB);

    if (!A || !B) return <p className="text-muted-foreground">Sélectionnez deux snapshots à comparer.</p>;

    const rows = [
      { label: "VO₂max", a: A.vo2max, b: B.vo2max },
      { label: "VLamax", a: A.vlamax, b: B.vlamax },
      { label: "FTP (W)", a: A.ftp, b: B.ftp },
      { label: "VMA (km/h)", a: A.vma, b: B.vma },
      { label: "Poids (kg)", a: A.weight_kg, b: B.weight_kg },
      { label: "Confiance", a: A.confidence, b: B.confidence },
    ];

    const insightsB = generateLorangInsights(
      {
        id: B.id,
        athlete_id: B.athlete_id,
        coach_id: B.coach_id,
        date: B.date,
        source: B.source as "manual" | "nolio" | "import",
        vlamax: B.vlamax ?? undefined,
        vo2max: B.vo2max ?? undefined,
        ftp: B.ftp ?? undefined,
        vma: B.vma ?? undefined,
        weight_kg: B.weight_kg ?? undefined,
        confidence: B.confidence ?? undefined,
        coach_notes: B.coach_notes ?? undefined,
      },
      athleteGoal
    );

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Variable</th>
                <th className="text-center py-2">A ({A.date})</th>
                <th className="text-center py-2">B ({B.date})</th>
                <th className="text-center py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/30">
                  <td className="py-2">{row.label}</td>
                  <td className="text-center">{formatValue(row.a)}</td>
                  <td className="text-center">{formatValue(row.b)}</td>
                  <td className="text-center font-medium">{calculateDelta(row.a, row.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Lecture Dan Lorang (sur B)
          </h4>
          <ul className="space-y-1 text-sm">
            {insightsB.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Snapshots — {athleteName}
          </CardTitle>
          <div className="flex gap-2">
            {snapshots.length >= 2 && (
              <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Comparer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Comparaison de snapshots</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Snapshot A (avant)</Label>
                      <Select value={compareA} onValueChange={setCompareA}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.date} {s.cycle_tag && `• ${s.cycle_tag}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Snapshot B (après)</Label>
                      <Select value={compareB} onValueChange={setCompareB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.date} {s.cycle_tag && `• ${s.cycle_tag}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {renderComparison()}
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau snapshot
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Créer un snapshot</DialogTitle>
                </DialogHeader>
                {renderForm()}
                <Button onClick={handleCreate} className="mt-4">
                  Créer
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Un snapshot = une "photo" du profil physiologique à un moment clé. Base de l'analyse Dan Lorang.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun snapshot pour cet athlète.</p>
            <p className="text-sm">Créez un snapshot après un test clé ou à la fin d'un cycle.</p>
          </div>
        ) : (
          snapshots.map(renderSnapshotCard)
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le snapshot</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <Button onClick={handleUpdate} className="mt-4">
            Sauvegarder
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

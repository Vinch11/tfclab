// =============================================
// CHECKIN MANAGER - Suivi hebdomadaire Two For Coaching Lab™
// =============================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Plus, Trash2, Edit, AlertTriangle, TrendingUp, Moon, Battery, Activity } from "lucide-react";
import { DbCheckin, useCloudData } from "@/contexts/CloudDataContext";

interface CheckinManagerProps {
  athleteId: string;
  athleteName: string;
}

// Calcule le score de readiness (0-100)
// INVERSÉ: fatigue haute = mieux (donc on additionne au lieu de soustraire)
function computeReadiness(checkin: Partial<DbCheckin>): number {
  const sleep = checkin.sleep ?? 5;
  const fatigue = checkin.fatigue ?? 5;  // Maintenant: 10=Super, 1=Nul
  const soreness = checkin.soreness ?? 5;
  const stress = checkin.stress ?? 5;
  const motivation = checkin.motivation ?? 5;

  // fatigue inversée: on l'ajoute au lieu de la soustraire
  let score = 50
    + (sleep - 5) * 6
    + (fatigue - 5) * 7   // INVERSÉ: + au lieu de -
    - (soreness - 5) * 6
    - (stress - 5) * 5
    + (motivation - 5) * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Génère les alertes basées sur les valeurs (INVERSÉ pour fatigue)
function getWarnings(checkin: DbCheckin): string[] {
  const warnings: string[] = [];
  if (checkin.sleep != null && checkin.sleep <= 4) warnings.push("Sommeil faible (≤4/10)");
  if (checkin.fatigue != null && checkin.fatigue <= 3) warnings.push("Forme très basse (≤3/10)");
  if (checkin.soreness != null && checkin.soreness >= 8) warnings.push("Douleurs élevées (≥8/10)");
  if (checkin.stress != null && checkin.stress >= 8) warnings.push("Stress élevé (≥8/10)");
  if (checkin.pain_flag) warnings.push("Alerte blessure signalée");
  return warnings;
}

// Génère le tag de semaine par défaut
function getDefaultWeekTag(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const millis = d.getTime() - onejan.getTime();
  const day = Math.floor(millis / 86400000) + 1;
  const week = Math.ceil(day / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function CheckinManager({ athleteId, athleteName }: CheckinManagerProps) {
  const { getCheckinsForAthlete, addCheckin, updateCheckin, deleteCheckin } = useCloudDataContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState<DbCheckin | null>(null);

  const checkins = getCheckinsForAthlete(athleteId);

  const [formData, setFormData] = useState({
    date_iso: new Date().toISOString().slice(0, 10),
    week_tag: getDefaultWeekTag(),
    sleep: "",
    fatigue: "",
    soreness: "",
    stress: "",
    motivation: "",
    rpe_key1: "",
    rpe_key2: "",
    pain_flag: false,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      date_iso: new Date().toISOString().slice(0, 10),
      week_tag: getDefaultWeekTag(),
      sleep: "",
      fatigue: "",
      soreness: "",
      stress: "",
      motivation: "",
      rpe_key1: "",
      rpe_key2: "",
      pain_flag: false,
      notes: "",
    });
  };

  const loadCheckinToForm = (c: DbCheckin) => {
    setFormData({
      date_iso: c.date_iso || new Date().toISOString().slice(0, 10),
      week_tag: c.week_tag || "",
      sleep: c.sleep != null ? String(c.sleep) : "",
      fatigue: c.fatigue != null ? String(c.fatigue) : "",
      soreness: c.soreness != null ? String(c.soreness) : "",
      stress: c.stress != null ? String(c.stress) : "",
      motivation: c.motivation != null ? String(c.motivation) : "",
      rpe_key1: c.rpe_key1 != null ? String(c.rpe_key1) : "",
      rpe_key2: c.rpe_key2 != null ? String(c.rpe_key2) : "",
      pain_flag: c.pain_flag || false,
      notes: c.notes || "",
    });
  };

  const parseNum = (v: string, min = 1, max = 10): number | null => {
    if (!v.trim()) return null;
    const n = parseInt(v, 10);
    if (isNaN(n)) return null;
    return Math.max(min, Math.min(max, n));
  };

  const buildCheckinData = () => {
    const data = {
      athlete_id: athleteId,
      coach_id: "",
      date_iso: formData.date_iso,
      week_tag: formData.week_tag || null,
      sleep: parseNum(formData.sleep),
      fatigue: parseNum(formData.fatigue),
      soreness: parseNum(formData.soreness),
      stress: parseNum(formData.stress),
      motivation: parseNum(formData.motivation),
      rpe_key1: parseNum(formData.rpe_key1),
      rpe_key2: parseNum(formData.rpe_key2),
      pain_flag: formData.pain_flag,
      notes: formData.notes || null,
      readiness: 0,
    };
    data.readiness = computeReadiness(data);
    return data;
  };

  const handleCreate = async () => {
    await addCheckin(buildCheckinData());
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingCheckin) return;
    const data = buildCheckinData();
    await updateCheckin(editingCheckin.id, data);
    setIsEditOpen(false);
    setEditingCheckin(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce check-in ?")) {
      await deleteCheckin(id);
    }
  };

  const openEdit = (c: DbCheckin) => {
    setEditingCheckin(c);
    loadCheckinToForm(c);
    setIsEditOpen(true);
  };

  // Calcul des tendances (3 derniers check-ins)
  const last3 = checkins.slice(0, 3);
  const avg = (key: keyof DbCheckin) => {
    const vals = last3.map(c => c[key]).filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const renderForm = () => (
    <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date_iso">Date</Label>
          <Input
            id="date_iso"
            type="date"
            value={formData.date_iso}
            onChange={(e) => setFormData({ ...formData, date_iso: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="week_tag">Tag semaine</Label>
          <Input
            id="week_tag"
            placeholder="2025-W03"
            value={formData.week_tag}
            onChange={(e) => setFormData({ ...formData, week_tag: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div>
          <Label htmlFor="sleep" className="text-xs">Sommeil</Label>
          <Input
            id="sleep"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.sleep}
            onChange={(e) => setFormData({ ...formData, sleep: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="fatigue" className="text-xs">Forme (1=Nul, 10=Super)</Label>
          <Input
            id="fatigue"
            type="number"
            min="1"
            max="10"
            placeholder="1=Nul, 10=Super"
            value={formData.fatigue}
            onChange={(e) => setFormData({ ...formData, fatigue: e.target.value })}
            title="1=Épuisé, 5=Moyen, 10=Super forme"
          />
        </div>
        <div>
          <Label htmlFor="soreness" className="text-xs">Douleurs</Label>
          <Input
            id="soreness"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.soreness}
            onChange={(e) => setFormData({ ...formData, soreness: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="stress" className="text-xs">Stress</Label>
          <Input
            id="stress"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.stress}
            onChange={(e) => setFormData({ ...formData, stress: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="motivation" className="text-xs">Motivation</Label>
          <Input
            id="motivation"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.motivation}
            onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rpe_key1">RPE séance clé 1</Label>
          <Input
            id="rpe_key1"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.rpe_key1}
            onChange={(e) => setFormData({ ...formData, rpe_key1: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="rpe_key2">RPE séance clé 2</Label>
          <Input
            id="rpe_key2"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={formData.rpe_key2}
            onChange={(e) => setFormData({ ...formData, rpe_key2: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="pain_flag"
          checked={formData.pain_flag}
          onCheckedChange={(checked) => setFormData({ ...formData, pain_flag: checked })}
        />
        <Label htmlFor="pain_flag">Alerte douleur / blessure</Label>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Contexte, charge, sensations..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  const renderCheckinCard = (c: DbCheckin) => {
    const readiness = c.readiness ?? computeReadiness(c);
    const warnings = getWarnings(c);
    const potentielColor = readiness >= 70 ? "text-green-500" : readiness >= 50 ? "text-yellow-500" : "text-red-500";

    return (
      <Card key={c.id} className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {c.week_tag || "Semaine"} — {c.date_iso}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-bold ${potentielColor}`}>Readiness: {readiness}/100</span>
                {warnings.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warnings.length} alerte{warnings.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={readiness} className="h-2" />
          
          <div className="grid grid-cols-5 gap-2 text-sm text-center">
            <div>
              <Moon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="font-medium">{c.sleep ?? "—"}</span>
            </div>
            <div>
              <Battery className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="font-medium">{c.fatigue ?? "—"}</span>
            </div>
            <div>
              <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="font-medium">{c.soreness ?? "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Stress</span>
              <div className="font-medium">{c.stress ?? "—"}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Motiv.</span>
              <div className="font-medium">{c.motivation ?? "—"}</div>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="text-sm text-destructive">
              {warnings.map((w, i) => (
                <div key={i}>⚠️ {w}</div>
              ))}
            </div>
          )}

          {c.notes && (
            <Accordion type="single" collapsible>
              <AccordionItem value="notes" className="border-none">
                <AccordionTrigger className="py-2 text-sm">Notes</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{c.notes}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Check-ins — {athleteName}
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau check-in
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau check-in hebdomadaire</DialogTitle>
              </DialogHeader>
              {renderForm()}
              <Button onClick={handleCreate} className="mt-4">
                Ajouter
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Suivi hebdomadaire : sommeil, fatigue, douleurs, stress, motivation. Base de la méthode Two For Coaching Lab™.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tendances */}
        {checkins.length >= 2 && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium text-sm">Tendance (3 derniers)</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-sm text-center">
                <div>
                  <span className="text-muted-foreground text-xs">Sommeil</span>
                  <div className="font-medium">{avg("sleep") ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Fatigue</span>
                  <div className="font-medium">{avg("fatigue") ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Douleurs</span>
                  <div className="font-medium">{avg("soreness") ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Stress</span>
                  <div className="font-medium">{avg("stress") ?? "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Readiness</span>
                  <div className="font-medium">{avg("readiness") ?? "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {checkins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun check-in pour cet athlète.</p>
            <p className="text-sm">Ajoute un check-in 1x/semaine (2 min). Ça rend les décisions plus fiables.</p>
          </div>
        ) : (
          checkins.map(renderCheckinCard)
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le check-in</DialogTitle>
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

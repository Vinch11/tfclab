/**
 * SessionEditDialog — Dialog to edit a training_plan session inline
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SessionData {
  id: string;
  date: string;
  custom_workout_title: string | null;
  custom_workout_description: string | null;
  status: string;
  phase: string | null;
  notes: string | null;
}

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planifiée" },
  { value: "COMPLETED", label: "✅ Complétée" },
  { value: "SKIPPED", label: "⏭️ Ratée" },
  { value: "ADJUSTED", label: "🔄 Ajustée" },
];

interface SessionEditDialogProps {
  session: SessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: SessionData) => void;
}

export function SessionEditDialog({ session, open, onOpenChange, onSaved }: SessionEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [phase, setPhase] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form when session changes
  const resetForm = (s: SessionData) => {
    setTitle(s.custom_workout_title || "");
    setDescription(s.custom_workout_description || "");
    setDate(s.date);
    setStatus(s.status || "PLANNED");
    setPhase(s.phase || "");
    setNotes(s.notes || "");
  };

  // Reset on open
  if (session && open && title === "" && date === "") {
    resetForm(session);
  }

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updates = {
        custom_workout_title: title || null,
        custom_workout_description: description || null,
        date,
        status,
        phase: phase || null,
        notes: notes || null,
        adjusted: status === "ADJUSTED",
      };

      const { error } = await supabase
        .from("training_plan")
        .update(updates)
        .eq("id", session.id);

      if (error) throw error;

      onSaved({ ...session, ...updates });
      onOpenChange(false);
      toast.success("Séance mise à jour !");
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Inconnu"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTitle(""); setDate(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phase</Label>
            <Input value={phase} onChange={e => setPhase(e.target.value)} placeholder="Ex: Phase 1 : Base Aérobie" />
          </div>
          <div className="space-y-2">
            <Label>Notes coach</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes libres..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

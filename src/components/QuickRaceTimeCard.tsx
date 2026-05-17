/**
 * QuickRaceTimeCard — Bloc « Saisir un chrono récent »
 * Permet de renseigner rapidement un chrono (5K/10K/20K/Semi/Marathon)
 * sur le snapshot actif de l'athlète. Crée un snapshot minimal si nécessaire.
 *
 * Ces chronos alimentent : raceTimeEstimator, runningEconomyV2 (fallback Raw),
 * pacingEnvelopeEngine, coachabilityAudit.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Timer, Save } from "lucide-react";
import { toast } from "sonner";
import { useCloudData } from "@/contexts/CloudDataContext";
import { supabase } from "@/integrations/supabase/client";

type Distance = "5k" | "10k" | "20k" | "half" | "marathon";

const DISTANCE_OPTIONS: { value: Distance; label: string; km: number }[] = [
  { value: "5k", label: "5 km", km: 5 },
  { value: "10k", label: "10 km", km: 10 },
  { value: "20k", label: "20 km", km: 20 },
  { value: "half", label: "Semi-marathon (21,1 km)", km: 21.0975 },
  { value: "marathon", label: "Marathon (42,2 km)", km: 42.195 },
];

const DB_FIELDS: Record<Distance, { sec: string; date: string }> = {
  "5k": { sec: "time_5k_sec", date: "time_5k_date" },
  "10k": { sec: "time_10k_sec", date: "time_10k_date" },
  "20k": { sec: "time_20k_sec", date: "time_20k_date" },
  half: { sec: "time_half_sec", date: "time_half_date" },
  marathon: { sec: "time_marathon_sec", date: "time_marathon_date" },
};

/** Parse "h:mm:ss", "mm:ss" or "1h28" / "1h28m45" → secondes. */
function parseChrono(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  // h:mm:ss or hh:mm:ss
  let m = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

  // mm:ss
  m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  // 1h28m45 / 1h28m / 28m45 / 1h
  m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (m && (m[1] || m[2] || m[3])) {
    return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
  }
  return null;
}

function formatPace(sec: number, km: number): string {
  const paceSec = Math.round(sec / km);
  const min = Math.floor(paceSec / 60);
  const s = paceSec % 60;
  return `${min}:${String(s).padStart(2, "0")}/km`;
}

interface QuickRaceTimeCardProps {
  athleteId: string;
}

export function QuickRaceTimeCard({ athleteId }: QuickRaceTimeCardProps) {
  const { athletes, snapshots, addSnapshot, loadData } = useCloudData();
  const athlete = athletes.find((a) => a.id === athleteId);
  const activeSnapshot = useMemo(() => {
    if (!athlete?.active_snapshot_id) {
      // fallback : dernier snapshot
      return snapshots
        .filter((s) => s.athlete_id === athleteId)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    }
    return snapshots.find((s) => s.id === athlete.active_snapshot_id);
  }, [athlete, snapshots, athleteId]);

  const [distance, setDistance] = useState<Distance>("half");
  const [chrono, setChrono] = useState("");
  const [dateChrono, setDateChrono] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const opt = DISTANCE_OPTIONS.find((d) => d.value === distance)!;

  /** Auto-format: digits-only → mm:ss (≤4) ou h:mm:ss (5-6). Laisse passer ":" manuel. */
  const formatChronoInput = (raw: string): string => {
    // Si l'utilisateur a tapé ":" lui-même, on respecte sa saisie (nettoyée)
    if (raw.includes(":")) {
      return raw.replace(/[^\d:]/g, "").slice(0, 8);
    }
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      // mm:ss
      return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
    }
    // h:mm:ss
    const ss = digits.slice(-2);
    const mm = digits.slice(-4, -2);
    const h = digits.slice(0, digits.length - 4);
    return `${h}:${mm}:${ss}`;
  };

  const parsed = parseChrono(chrono);
  const paceHint = parsed && parsed > 0 ? formatPace(parsed, opt.km) : null;

  const existingTimes = useMemo(() => {
    if (!activeSnapshot) return [] as { label: string; sec: number; date: string | null }[];
    return DISTANCE_OPTIONS.flatMap((o) => {
      const sec = (activeSnapshot as any)[DB_FIELDS[o.value].sec] as number | null;
      const date = (activeSnapshot as any)[DB_FIELDS[o.value].date] as string | null;
      if (!sec) return [];
      return [{ label: o.label, sec, date }];
    });
  }, [activeSnapshot]);

  const handleSave = async () => {
    const sec = parseChrono(chrono);
    if (!sec || sec < 60) {
      toast.error("Chrono invalide. Format attendu : 1:28:45 ou 28:30");
      return;
    }
    if (!dateChrono) {
      toast.error("Renseigne la date du chrono");
      return;
    }
    setSaving(true);

    const fields = DB_FIELDS[distance];
    const payload: Record<string, any> = {
      [fields.sec]: sec,
      [fields.date]: dateChrono,
    };

    try {
      let snapshotId = activeSnapshot?.id;

      // Si aucun snapshot, on en crée un minimal
      if (!snapshotId) {
        const created = await addSnapshot({
          athlete_id: athleteId,
          coach_id: "", // remplacé par useCloudData
          date: dateChrono,
          source: "race_time_quick_entry",
        } as any);
        if (!created) {
          setSaving(false);
          return;
        }
        snapshotId = created.id;
      }

      // Bypass schema (les champs time_* ne sont pas dans snapshotSchema)
      const { error } = await supabase
        .from("snapshots")
        .update(payload)
        .eq("id", snapshotId);

      if (error) {
        console.error("Update race time error:", error.message);
        toast.error(`Erreur : ${error.message}`);
        setSaving(false);
        return;
      }

      toast.success(`Chrono ${opt.label} enregistré`);
      setChrono("");
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Saisir un chrono récent
        </CardTitle>
        <CardDescription>
          Alimente l'analyse durabilité, l'économie de course (CAP) et la calibration MLSS.
          Format : <code>1:28:45</code> ou <code>28:30</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Distance</Label>
            <Select value={distance} onValueChange={(v) => setDistance(v as Distance)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Chrono</Label>
            <Input
              placeholder="ex : 1:28:45"
              value={chrono}
              onChange={(e) => setChrono(formatChronoInput(e.target.value))}
              inputMode="numeric"
              pattern="[0-9:]*"
              maxLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date du chrono</Label>
            <Input
              type="date"
              value={dateChrono}
              onChange={(e) => setDateChrono(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {paceHint && (
          <p className="text-xs text-muted-foreground">
            Allure moyenne : <span className="font-medium text-foreground">{paceHint}</span>
          </p>
        )}

        <Button onClick={handleSave} disabled={saving || !parsed} className="w-full sm:w-auto gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer le chrono"}
        </Button>

        {existingTimes.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Chronos déjà enregistrés
            </p>
            <div className="flex flex-wrap gap-2">
              {existingTimes.map((t) => {
                const h = Math.floor(t.sec / 3600);
                const m = Math.floor((t.sec % 3600) / 60);
                const s = t.sec % 60;
                const fmt = h > 0
                  ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
                  : `${m}:${String(s).padStart(2, "0")}`;
                return (
                  <Badge key={t.label} variant="secondary" className="font-mono">
                    {t.label} : {fmt}
                    {t.date && <span className="ml-1.5 text-[10px] opacity-70">({t.date})</span>}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {!activeSnapshot && (
          <p className="text-xs text-muted-foreground italic">
            Aucun snapshot actif — un snapshot minimal sera créé automatiquement.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

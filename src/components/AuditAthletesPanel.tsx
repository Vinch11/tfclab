import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auditProfile } from "@/lib/profileAudit";
import { ProfileAuditDialog } from "@/components/ProfileAuditDialog";
import { CoachabilityAuditDialog } from "@/components/CoachabilityAuditDialog";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  athleteId: string;
  athleteName: string;
  athleteGoal: string | null;
  snapshot: any | null;
  snapshotDate: string | null;
  critical: number;
  warning: number;
  info: number;
};

export function AuditAthletesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Charge athlètes
      const { data: athletes } = await supabase
        .from("athletes")
        .select("id, name, active_snapshot_id, goal")
        .eq("coach_id", user.id)
        .order("name");

      if (!athletes || cancelled) {
        setLoading(false);
        return;
      }

      // Pour chaque athlète, snapshot actif OU dernier
      const out: Row[] = [];
      for (const a of athletes) {
        let snap: any = null;
        if (a.active_snapshot_id) {
          const { data } = await supabase
            .from("snapshots")
            .select("*")
            .eq("id", a.active_snapshot_id)
            .maybeSingle();
          snap = data;
        }
        if (!snap) {
          const { data } = await supabase
            .from("snapshots")
            .select("*")
            .eq("athlete_id", a.id)
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();
          snap = data;
        }
        const report = snap ? auditProfile(snap, a.name, (a as any).goal) : null;
        out.push({
          athleteId: a.id,
          athleteName: a.name,
          athleteGoal: (a as any).goal ?? null,
          snapshot: snap,
          snapshotDate: snap?.date ?? null,
          critical: report?.stats.critical ?? 0,
          warning: report?.stats.warning ?? 0,
          info: report?.stats.info ?? 0,
        });
      }
      if (!cancelled) {
        // Tri : critical d'abord, puis warning
        out.sort((a, b) =>
          b.critical - a.critical || b.warning - a.warning || a.athleteName.localeCompare(b.athleteName)
        );
        setRows(out);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Analyse des profils en cours…
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun athlète à auditer.
        </CardContent>
      </Card>
    );
  }

  const totalIssues = rows.reduce((acc, r) => acc + r.critical + r.warning, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Stethoscope className="w-5 h-5 text-primary" />
            Audit de cohérence — Profils athlètes
          </CardTitle>
          <Badge variant={totalIssues > 0 ? "destructive" : "secondary"}>
            {totalIssues > 0 ? `${totalIssues} point${totalIssues > 1 ? "s" : ""} à vérifier` : "Tout est cohérent"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Détecte les incohérences de données qui faussent les estimations physiologiques. Cliquez sur un athlète pour ouvrir l'audit détaillé + analyse IA.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.athleteId} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusIcon critical={r.critical} warning={r.warning} info={r.info} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.athleteName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.snapshotDate ? `Snapshot du ${r.snapshotDate}` : "Aucun snapshot"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.critical > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{r.critical} critique</Badge>
                )}
                {r.warning > 0 && (
                  <Badge className="text-[10px] bg-warning text-warning-foreground hover:bg-warning/90">
                    {r.warning} alerte{r.warning > 1 ? "s" : ""}
                  </Badge>
                )}
                {r.snapshot ? (
                  <>
                    <CoachabilityAuditDialog
                      snapshot={r.snapshot}
                      athleteName={r.athleteName}
                      athleteGoal={r.athleteGoal}
                      trigger={
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <Gauge className="w-3.5 h-3.5" />
                          Coachabilité
                        </Button>
                      }
                    />
                    <ProfileAuditDialog
                      snapshot={r.snapshot}
                      athleteName={r.athleteName}
                      athleteGoal={r.athleteGoal}
                      trigger={
                        <Button size="sm" variant="outline">Auditer</Button>
                      }
                    />
                  </>
                ) : (
                  <Button size="sm" variant="outline" disabled>—</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ critical, warning, info }: { critical: number; warning: number; info: number }) {
  if (critical > 0) return <AlertTriangle className={cn("w-5 h-5", "text-destructive")} />;
  if (warning > 0) return <AlertCircle className={cn("w-5 h-5", "text-warning")} />;
  if (info > 0) return <AlertCircle className={cn("w-5 h-5", "text-primary")} />;
  return <CheckCircle2 className={cn("w-5 h-5", "text-success")} />;
}

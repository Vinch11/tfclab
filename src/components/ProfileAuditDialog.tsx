import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, AlertTriangle, AlertCircle, Info, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { auditProfile, type AuditFinding, type ProfileAuditReport } from "@/lib/profileAudit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { deduceSportMainFromGoal } from "@/lib/sportMainDeduction";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";

interface ProfileAuditDialogProps {
  snapshot: any;
  athleteName: string;
  athleteGoal?: string | null;
  trigger?: React.ReactNode;
  variant?: "compact" | "full";
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Critique" },
  warning: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "Attention" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30", label: "Info" },
  ok: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/30", label: "OK" },
};

const verdictConfig = {
  clean: { label: "Profil cohérent", color: "text-success", bg: "bg-success/10" },
  minor: { label: "Quelques points à vérifier", color: "text-primary", bg: "bg-primary/10" },
  moderate: { label: "Plusieurs incohérences", color: "text-warning", bg: "bg-warning/10" },
  severe: { label: "Incohérence critique", color: "text-destructive", bg: "bg-destructive/10" },
};

export function ProfileAuditDialog({ snapshot, athleteName, athleteGoal, trigger, variant = "compact" }: ProfileAuditDialogProps) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [fixingSport, setFixingSport] = useState(false);
  const queryClient = useQueryClient();

  const report: ProfileAuditReport = auditProfile(snapshot ?? {}, athleteName, athleteGoal);
  const verdict = verdictConfig[report.overallVerdict];

  const fixSportMismatch = async () => {
    const deduced = deduceSportMainFromGoal(athleteGoal);
    if (!deduced || !snapshot?.id) {
      toast.error("Impossible de corriger : snapshot ou objectif manquant");
      return;
    }
    setFixingSport(true);
    try {
      const { error } = await supabase
        .from("snapshots")
        .update({ sport_main: deduced })
        .eq("id", snapshot.id);
      if (error) throw error;
      toast.success(`sport_main mis à jour : "${deduced}"`);
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["cloud-data"] });
      setOpen(false);
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message ?? "inconnue"));
    } finally {
      setFixingSport(false);
    }
  };

  const runAIAudit = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("profile-audit-ai", {
        body: { snapshot, athleteName, staticFindings: report.findings },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setAiAnalysis(data?.analysis ?? "Aucune analyse générée.");
      }
    } catch (e: any) {
      toast.error("Erreur audit IA : " + (e?.message ?? "inconnue"));
    } finally {
      setAiLoading(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size={variant === "compact" ? "sm" : "default"}
      className="gap-2"
    >
      <Stethoscope className="w-4 h-4" />
      Auditer ce profil
      {report.stats.critical > 0 && (
        <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{report.stats.critical}</Badge>
      )}
      {report.stats.critical === 0 && report.stats.warning > 0 && (
        <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-warning text-warning-foreground hover:bg-warning/90">
          {report.stats.warning}
        </Badge>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div>Audit physiologique — {report.athleteName}</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Snapshot du {report.snapshotDate}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4">
            {/* Verdict global */}
            <div className={cn("p-4 rounded-xl border", verdict.bg, "border-border")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Verdict global</span>
                <span className={cn("text-sm font-semibold", verdict.color)}>{verdict.label}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
              <div className="flex gap-2 mt-3 text-xs">
                {report.stats.critical > 0 && (
                  <Badge variant="destructive">{report.stats.critical} critique{report.stats.critical > 1 ? "s" : ""}</Badge>
                )}
                {report.stats.warning > 0 && (
                  <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">
                    {report.stats.warning} avertissement{report.stats.warning > 1 ? "s" : ""}
                  </Badge>
                )}
                {report.stats.info > 0 && (
                  <Badge variant="secondary">{report.stats.info} info</Badge>
                )}
              </div>
            </div>

            {/* Findings */}
            {report.findings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-success" />
                <p className="text-sm">Aucune incohérence détectée par les règles standard.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {report.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            )}

            {/* Audit IA */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Analyse approfondie IA
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Analyse contextuelle nuancée par Gemini 2.5 Flash
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={runAIAudit}
                  disabled={aiLoading}
                  variant={aiAnalysis ? "outline" : "default"}
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours…
                    </>
                  ) : aiAnalysis ? (
                    "Relancer"
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Approfondir avec IA
                    </>
                  )}
                </Button>
              </div>

              {aiAnalysis && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const cfg = severityConfig[finding.severity];
  const Icon = cfg.icon;
  return (
    <div className={cn("p-4 rounded-xl border", cfg.bg, cfg.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", cfg.color)} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{finding.title}</h4>
            <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{finding.detail}</p>
          <div className="text-xs space-y-1.5 pt-1">
            <div>
              <span className="font-medium text-muted-foreground">Conséquence : </span>
              <span className="text-foreground/80">{finding.consequence}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Action : </span>
              <span className="text-foreground/80">{finding.fix}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

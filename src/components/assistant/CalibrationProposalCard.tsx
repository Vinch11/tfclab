// =============================================
// CalibrationProposalCard
// Parse [PROPOSE_CALIBRATION]{...}[/PROPOSE_CALIBRATION]
// Renders an approve/reject card; on approve, inserts into calibration_evidence
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface CalibrationProposal {
  athlete_id: string;
  evidence_type: string;
  raw_values: Record<string, unknown>;
  notes?: string;
  confidence_evidence?: number;
  protocol_quality?: number;
  source_type?: string;
  date?: string;
}

const VALID_EVIDENCE_TYPES = [
  "SPRINT_15S","P30","P60","MAP","TTE_OBS","PACED_RACE","DRIFT","ECONOMY",
  "RUN_MLSS_MODEL_C_TRACE","RUN_MLSS_EXTERNAL_COHORT","VLAMAX_CAP_ANCHOR","VLAMAX_MODEL_TRACE",
];
const VALID_SOURCE_TYPES = ["TEST_PROTOCOL", "FIT_IMPORT", "POST_RACE"];

/**
 * Extracts all calibration proposal blocks from a markdown string.
 * Returns { cleaned, proposals }.
 */
export function extractCalibrationProposals(content: string): {
  cleaned: string;
  proposals: CalibrationProposal[];
} {
  const re = /\[PROPOSE_CALIBRATION\]([\s\S]*?)\[\/PROPOSE_CALIBRATION\]/g;
  const proposals: CalibrationProposal[] = [];
  const cleaned = content.replace(re, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim());
      if (parsed && parsed.athlete_id && parsed.evidence_type) {
        proposals.push(parsed);
      }
    } catch {
      // ignore malformed
    }
    return ""; // remove block from displayed text
  });
  return { cleaned: cleaned.trim(), proposals };
}

interface Props {
  proposal: CalibrationProposal;
}

export function CalibrationProposalCard({ proposal }: Props) {
  const [status, setStatus] = useState<"pending" | "saving" | "saved" | "dismissed">("pending");

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non connecté");
        setStatus("pending");
        return;
      }

      const evidence_type = VALID_EVIDENCE_TYPES.includes(proposal.evidence_type)
        ? proposal.evidence_type
        : "PACED_RACE";
      const source_type = VALID_SOURCE_TYPES.includes(proposal.source_type ?? "")
        ? proposal.source_type!
        : "POST_RACE";

      const { error } = await supabase.from("calibration_evidence").insert([{
        athlete_id: proposal.athlete_id,
        coach_id: user.id,
        date: proposal.date ?? new Date().toISOString().slice(0, 10),
        source_type,
        evidence_type,
        raw_values: (proposal.raw_values ?? {}) as never,
        confidence_evidence: proposal.confidence_evidence ?? 0.7,
        protocol_quality: Math.min(5, Math.max(1, proposal.protocol_quality ?? 3)),
        notes: proposal.notes ?? null,
        validity: "OK",
      }]);

      if (error) {
        console.error("Calibration insert error:", error);
        toast.error("Erreur enregistrement : " + error.message);
        setStatus("pending");
        return;
      }
      toast.success("Calibration enregistrée");
      setStatus("saved");
    } catch (e) {
      console.error(e);
      toast.error("Erreur inattendue");
      setStatus("pending");
    }
  };

  if (status === "dismissed") return null;

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 my-2 space-y-2">
      <div className="flex items-center gap-2">
        <Save className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Proposition de calibration</span>
      </div>
      <div className="text-xs space-y-0.5">
        <div><span className="text-muted-foreground">Type :</span> <strong>{proposal.evidence_type}</strong></div>
        {proposal.notes && (
          <div className="text-muted-foreground italic">{proposal.notes}</div>
        )}
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer">Données brutes</summary>
          <pre className="mt-1 bg-background/50 p-1.5 rounded overflow-auto">
            {JSON.stringify(proposal.raw_values, null, 2)}
          </pre>
        </details>
      </div>
      {status === "saved" ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré dans la base de calibration
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={handleSave}
            disabled={status === "saving"}
          >
            {status === "saving" ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Enregistrement…</>
            ) : (
              <>Enregistrer la calibration</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setStatus("dismissed")}
            disabled={status === "saving"}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

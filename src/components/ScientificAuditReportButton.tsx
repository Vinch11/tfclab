/**
 * Bouton "Rapport d'audit scientifique" — agrège toutes les traces de l'athlète
 * sélectionné et ouvre un HTML imprimable signé (SHA-256).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAthletes } from "@/contexts/AthleteContext";
import { useAuth } from "@/contexts/AuthContext";
import { gatherScientificAuditData, buildScientificAuditHTML } from "@/lib/audit/buildScientificAuditHTML";
import { openPrintableHTML } from "@/lib/openPrintableHTML";

export function ScientificAuditReportButton() {
  const { currentAthlete } = useAthletes();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!currentAthlete?.id) {
      toast.error("Sélectionnez un athlète d'abord");
      return;
    }
    setLoading(true);
    try {
      const data = await gatherScientificAuditData({
        athleteId: currentAthlete.id,
        athleteName: currentAthlete.nom ?? currentAthlete.name ?? "Athlète",
        sport: currentAthlete.sport_principal ?? currentAthlete.sport ?? null,
        objectif: currentAthlete.objectif ?? null,
        generatedBy: user?.email ?? "Coach TFCL",
      });
      const html = buildScientificAuditHTML(data);
      openPrintableHTML(html, {
        filenameHint: `Audit scientifique — ${data.athlete.name}`,
        autoPrint: false,
      });
      toast.success("Rapport d'audit généré", {
        description: `Empreinte : ${data.signature.slice(0, 12)}…`,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("[ScientificAudit]", err);
      toast.error("Erreur lors de la génération du rapport d'audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Rapport d'audit scientifique consolidé
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Agrège toutes les traces scientifiques de l'athlète sélectionné : traces VLamax (V2),
          traces Run MLSS Modèle C, snapshots de calibration, preuves terrain, overrides coach,
          version courante de la cohorte littérature. Le rapport est signé (SHA-256) pour
          garantir son intégrité — exportable en PDF (Ctrl/Cmd + P).
        </p>
        <Button
          onClick={handleClick}
          disabled={loading || !currentAthlete?.id}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Agrégation en cours…
            </>
          ) : (
            <>
              <FileCheck2 className="h-4 w-4 mr-2" />
              Générer le rapport d'audit signé
            </>
          )}
        </Button>
        {!currentAthlete?.id && (
          <p className="text-xs text-muted-foreground italic">
            Sélectionnez un athlète pour activer le bouton.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

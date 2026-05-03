/**
 * PacingRulesSnapshotsCard
 *
 * Permet de capturer un snapshot des règles par surface
 * (interactive_full, staff_report, athlete_briefing) et de comparer
 * deux snapshots pour visualiser ce qui a changé après une modification
 * du mapping (règles ajoutées / supprimées / modifiées, drops par surface,
 * delta de parité).
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Trash2, GitCompare, Download, History, Plus, Minus, Edit3 } from "lucide-react";
import {
  saveSnapshot,
  listSnapshots,
  deleteSnapshot,
  diffSnapshots,
  exportSnapshotsJSON,
  type StoredSnapshot,
} from "@/lib/v2/pacingRulesSnapshotStore";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";
import type { ExportSurface } from "@/lib/v2/pacingRulesParityCheck";

interface Props {
  rules: DisciplineRulesResult | null | undefined;
  contextLabel?: {
    raceObjective?: string;
    discipline?: string;
    athleteName?: string;
  };
  className?: string;
}

const SURFACE_LABEL: Record<ExportSurface, string> = {
  interactive_full: "Vue interactive",
  staff_report: "Rapport staff",
  athlete_briefing: "Briefing athlète",
};

export function PacingRulesSnapshotsCard({ rules, contextLabel, className }: Props) {
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>(() => listSnapshots());
  const [label, setLabel] = useState("");
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  const refresh = () => setSnapshots(listSnapshots());

  const handleSave = () => {
    if (!rules) return;
    saveSnapshot(rules, label, contextLabel ?? {});
    setLabel("");
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    if (selectedA === id) setSelectedA(null);
    if (selectedB === id) setSelectedB(null);
    refresh();
  };

  const handleExport = () => {
    const blob = new Blob([exportSnapshotsJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pacing-rules-snapshots-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const diff = useMemo(() => {
    if (!selectedA || !selectedB || selectedA === selectedB) return null;
    const a = snapshots.find((s) => s.id === selectedA);
    const b = snapshots.find((s) => s.id === selectedB);
    if (!a || !b) return null;
    // L'ordre : prev = plus ancien, next = plus récent
    const prev = a.createdAt < b.createdAt ? a : b;
    const next = a.createdAt < b.createdAt ? b : a;
    return { prev, next, ...diffSnapshots(prev, next) };
  }, [selectedA, selectedB, snapshots]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Snapshots de règles par surface
        </CardTitle>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Capture l'état complet des règles affichées (vue interactive, rapport staff,
          briefing athlète) puis compare deux instants pour détecter ce qui a changé
          après une modification du mapping.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Capture */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Libellé du snapshot (ex. avant refacto v4.4)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-xs flex-1 min-w-[200px]"
            disabled={!rules}
          />
          <Button size="sm" onClick={handleSave} disabled={!rules} className="h-8">
            <Camera className="h-3.5 w-3.5 mr-1" /> Capturer
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={snapshots.length === 0} className="h-8">
            <Download className="h-3.5 w-3.5 mr-1" /> Export JSON
          </Button>
        </div>

        {!rules && (
          <p className="text-[11px] text-muted-foreground italic">
            Lance une simulation pour pouvoir capturer un snapshot.
          </p>
        )}

        {/* Liste */}
        {snapshots.length === 0 ? (
          <Alert>
            <AlertDescription className="text-xs">
              Aucun snapshot enregistré. Capture deux états (avant / après ta modif) pour
              activer la comparaison.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{snapshots.length} snapshot(s)</p>
              <p className="text-[10px] text-muted-foreground">
                Sélectionne A puis B pour diff
              </p>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {snapshots.map((s) => {
                const isA = selectedA === s.id;
                const isB = selectedB === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-md border p-2 text-xs flex items-center justify-between gap-2 transition ${
                      isA || isB ? "border-primary bg-primary/5" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString("fr-FR")} · {s.rules.length} règles ·{" "}
                        {s.context.raceObjective ?? "—"} / {s.context.discipline ?? "—"}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(Object.keys(s.surfaces) as ExportSurface[]).map((sf) => (
                          <Badge key={sf} variant="outline" className="text-[9px] px-1 py-0">
                            {SURFACE_LABEL[sf]} : {s.surfaces[sf].ruleIds.length}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant={isA ? "default" : "outline"}
                        className="h-6 text-[10px] px-2"
                        onClick={() => setSelectedA(isA ? null : s.id)}
                      >
                        A
                      </Button>
                      <Button
                        size="sm"
                        variant={isB ? "default" : "outline"}
                        className="h-6 text-[10px] px-2"
                        onClick={() => setSelectedB(isB ? null : s.id)}
                      >
                        B
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Diff */}
        {diff && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold">
                Diff : « {diff.prev.label} » → « {diff.next.label} »
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2">
                <Plus className="h-3.5 w-3.5 mx-auto text-emerald-600" />
                <p className="text-lg font-bold">{diff.addedRuleIds.length}</p>
                <p className="text-[10px] text-muted-foreground">ajoutée(s)</p>
              </div>
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2">
                <Minus className="h-3.5 w-3.5 mx-auto text-red-600" />
                <p className="text-lg font-bold">{diff.removedRuleIds.length}</p>
                <p className="text-[10px] text-muted-foreground">supprimée(s)</p>
              </div>
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
                <Edit3 className="h-3.5 w-3.5 mx-auto text-amber-600" />
                <p className="text-lg font-bold">{diff.changedRuleIds.length}</p>
                <p className="text-[10px] text-muted-foreground">modifiée(s)</p>
              </div>
            </div>

            {/* Par surface */}
            <div className="space-y-1.5">
              {(Object.keys(diff.bySurface) as ExportSurface[]).map((sf) => {
                const d = diff.bySurface[sf];
                if (d.added.length === 0 && d.removed.length === 0) return null;
                return (
                  <div key={sf} className="rounded-md bg-background border p-2">
                    <p className="text-[11px] font-semibold mb-1">{SURFACE_LABEL[sf]}</p>
                    {d.added.length > 0 && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        + {d.added.join(", ")}
                      </p>
                    )}
                    {d.removed.length > 0 && (
                      <p className="text-[10px] text-red-700 dark:text-red-400 font-mono">
                        − {d.removed.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Détail des règles modifiées */}
            {diff.changedRuleIds.length > 0 && (
              <div className="rounded-md bg-background border p-2 space-y-1">
                <p className="text-[11px] font-semibold">Contenu modifié</p>
                {diff.changedRuleIds.map((id) => {
                  const a = diff.prev.rules.find((r) => r.id === id);
                  const b = diff.next.rules.find((r) => r.id === id);
                  if (!a || !b) return null;
                  return (
                    <div key={id} className="text-[10px] space-y-0.5">
                      <p className="font-mono text-muted-foreground">{id}</p>
                      {a.title !== b.title && (
                        <p>
                          <span className="text-red-600">titre: </span>« {a.title} » → « {b.title} »
                        </p>
                      )}
                      {a.message !== b.message && (
                        <p className="text-muted-foreground">message modifié</p>
                      )}
                      {a.priority !== b.priority && (
                        <p>
                          <span className="text-amber-600">priorité: </span>
                          {a.priority} → {b.priority}
                        </p>
                      )}
                      {a.source !== b.source && (
                        <p>
                          <span className="text-amber-600">source: </span>
                          {a.source ?? "—"} → {b.source ?? "—"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delta de parité */}
            <div className="rounded-md bg-background border p-2 text-[11px]">
              <p className="font-semibold mb-1">Parité UI ↔ Exports</p>
              <p>
                Drop staff : {diff.parityDelta.droppedInStaffDelta >= 0 ? "+" : ""}
                {diff.parityDelta.droppedInStaffDelta} · Drop athlète :{" "}
                {diff.parityDelta.droppedInAthleteDelta >= 0 ? "+" : ""}
                {diff.parityDelta.droppedInAthleteDelta} · Critiques :{" "}
                <span
                  className={
                    diff.parityDelta.criticalIssuesDelta > 0
                      ? "text-red-600 font-semibold"
                      : diff.parityDelta.criticalIssuesDelta < 0
                      ? "text-emerald-600 font-semibold"
                      : ""
                  }
                >
                  {diff.parityDelta.criticalIssuesDelta >= 0 ? "+" : ""}
                  {diff.parityDelta.criticalIssuesDelta}
                </span>
              </p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic pt-1 border-t">
          Stockage local (navigateur) — limite 20 snapshots. Export JSON pour archivage long terme.
        </p>
      </CardContent>
    </Card>
  );
}

export default PacingRulesSnapshotsCard;

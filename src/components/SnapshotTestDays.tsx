import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { TEST_DAYS, checkSnapshotForm, snapshotReadiness, type TestDayFieldKey } from "@/lib/snapshotTestDays";

interface Props {
  formData: Record<string, string>;
  onChange: (key: string, value: string) => void;
  filledFrom: Record<string, string>;
  /** Contenu affiché sous un champ (provenance, valeur Nolio…). */
  renderExtra?: (key: TestDayFieldKey) => ReactNode;
}

/** Fiche athlète : un bloc par sport, chaque valeur saisie à un seul endroit. */
export function SnapshotTestDays({ formData, onChange, filledFrom, renderExtra }: Props) {
  const check = checkSnapshotForm(formData);
  const readiness = snapshotReadiness(formData);
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Fiche athlète</p>
      <Tabs defaultValue="ctx">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          {TEST_DAYS.map((d) => {
            const filled = d.fields.filter((f) => formData[f.key]?.trim()).length;
            return (
              <TabsTrigger key={d.id} value={d.id} className="flex-col gap-0.5 px-1 py-2 text-xs">
                <span>{d.title}</span>
                <span className="text-muted-foreground">{filled}/{d.fields.length}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {TEST_DAYS.map((d) => (
          <TabsContent key={d.id} value={d.id} className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">{d.hint}</p>
            <div className="grid grid-cols-2 gap-3">
              {d.fields.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={`day-${f.key}`} className="flex items-center gap-1.5 text-xs">
                    {f.label}{f.unit && ` (${f.unit})`}
                    {filledFrom[f.key] && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{filledFrom[f.key]}</Badge>}
                  </Label>
                  <Input
                    id={`day-${f.key}`}
                    type={f.type ?? "number"}
                    inputMode={f.type === "text" ? "text" : undefined}
                    placeholder={f.placeholder}
                    value={formData[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="h-11"
                  />
                  {renderExtra?.(f.key)}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-1">
        <p className="text-xs font-medium">Ce bilan permet de calculer</p>
        {readiness.map((r) => (
          <p key={r.label} className="flex items-center gap-1.5 text-xs">
            {r.ready ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={r.ready ? "" : "text-muted-foreground"}>{r.label}{!r.ready && ` — manque : ${r.need}`}</span>
          </p>
        ))}
      </div>

      {(check.errors.length > 0 || check.warnings.length > 0) && (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2">
          {check.errors.map((e) => (
            <p key={e} className="flex gap-1.5 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{e}</p>
          ))}
          {check.warnings.map((w) => (
            <p key={w} className="flex gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

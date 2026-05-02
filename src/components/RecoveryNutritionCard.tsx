import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Apple, AlertTriangle, Info, Clock } from "lucide-react";
import { computeRecoveryProtocol, type RecoveryInput } from "@/lib/recoveryProtocol";

interface Props {
  input: RecoveryInput;
  staffMode?: boolean;
}

export function RecoveryNutritionCard({ input, staffMode = false }: Props) {
  if (input.durationMin <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Récupération nutritionnelle (4R)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Données insuffisantes (durée requise).</p>
        </CardContent>
      </Card>
    );
  }

  const p = computeRecoveryProtocol(input);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Récupération nutritionnelle (4R)
          </CardTitle>
          <Badge variant="outline" className="capitalize">{input.intensity}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Window 1 */}
        <Window
          title="Fenêtre aiguë (0–60 min)"
          color="text-emerald-600"
          stats={[
            { label: "CHO", value: `${p.acuteWindow.cho_g} g` },
            { label: "Protéine", value: `${p.acuteWindow.protein_g} g` },
            { label: "Liquide", value: `${p.acuteWindow.fluid_ml} mL` },
            { label: "Sodium", value: `${p.acuteWindow.sodium_mg} mg` },
          ]}
          examples={p.acuteWindow.examples}
        />

        {/* Window 2 */}
        <Window
          title={`Refuel (1–${p.refuelWindow.durationH}h)`}
          color="text-amber-600"
          stats={[
            { label: "CHO/h", value: `${p.refuelWindow.cho_g_per_h} g` },
            { label: "Total CHO", value: `${p.refuelWindow.cho_total_g} g` },
            { label: "PRO/repas", value: `${p.refuelWindow.protein_per_meal_g} g` },
            { label: "Repas", value: `${p.refuelWindow.meals}` },
          ]}
        />

        {/* Daily */}
        <Window
          title="24h (totaux quotidiens)"
          color="text-primary"
          stats={[
            { label: "CHO", value: `${p.daily24h.cho_g} g` },
            { label: "Protéine", value: `${p.daily24h.protein_g} g` },
            { label: "Liquide", value: `${(p.daily24h.fluid_ml / 1000).toFixed(1)} L` },
          ]}
        />

        {/* Recommendations */}
        <div className="space-y-1.5">
          {p.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {p.warnings.map((w, i) => (
          <Alert key={i} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{w}</AlertDescription>
          </Alert>
        ))}

        {staffMode && (
          <div className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
            <p className="font-medium">Références scientifiques</p>
            <p>• Burke et al. (2017) — IOC consensus refuelling</p>
            <p>• Moore et al. (2014) — 0.4 g/kg leucine-rich protein × 4</p>
            <p>• Shirreffs &amp; Sawka (2011) — 150% deficit fluid replacement</p>
            <p>• Areta et al. (2013) — Pulse feeding 20–40g/3–4h</p>
            <p>• Kerksick et al. (2018) — ISSN nutrient timing</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Window({
  title,
  color,
  stats,
  examples,
}: {
  title: string;
  color: string;
  stats: Array<{ label: string; value: string }>;
  examples?: string[];
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
        <Clock className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded border bg-background px-2 py-1.5">
            <p className="text-[10px] uppercase text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      {examples && examples.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {examples.map((ex, i) => (
            <li key={i}>• {ex}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

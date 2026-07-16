/**
 * TrailProbePanel — intercepte console.log/warn/info et retient les lignes
 * commençant par [trail_probe], [trail_probe_client] ou [trail_probe_phase].
 * Panneau de diagnostic pour /debug/plan-qa.
 *
 * Note: les logs `[trail_probe]` proviennent de l'edge function et
 * n'apparaissent PAS dans la console navigateur. Ils sont visibles côté
 * serveur (logs edge). Ce panneau capture uniquement les probes client
 * (`[trail_probe_client]`, `[trail_probe_phase]`).
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type Line = { ts: number; kind: "client" | "phase" | "edge"; text: string };

const PREFIXES: Array<{ rx: RegExp; kind: Line["kind"] }> = [
  { rx: /^\[trail_probe_client\]/, kind: "client" },
  { rx: /^\[trail_probe_phase\]/, kind: "phase" },
  { rx: /^\[trail_probe\]/, kind: "edge" },
];

function matchPrefix(msg: string): Line["kind"] | null {
  for (const p of PREFIXES) if (p.rx.test(msg)) return p.kind;
  return null;
}

export function TrailProbePanel() {
  const [lines, setLines] = useState<Line[]>([]);
  const [enabled, setEnabled] = useState(true);
  const originalRef = useRef<{ log: typeof console.log; info: typeof console.info; warn: typeof console.warn } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const orig = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
    };
    originalRef.current = orig;
    const wrap = (fn: (...a: unknown[]) => void) => (...args: unknown[]) => {
      try {
        const first = args[0];
        if (typeof first === "string") {
          const kind = matchPrefix(first);
          if (kind) {
            const text = args
              .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
              .join(" ");
            setLines((prev) => [...prev, { ts: Date.now(), kind, text }]);
          }
        }
      } catch { /* ignore */ }
      fn(...args);
    };
    console.log = wrap(orig.log);
    console.info = wrap(orig.info);
    console.warn = wrap(orig.warn);
    return () => {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
    };
  }, [enabled]);

  const asText = () => lines.map((l) => l.text).join("\n");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">🐾 Trail Probe — sondes diagnostic</h3>
        <span className="text-xs text-muted-foreground">
          {lines.length} ligne{lines.length > 1 ? "s" : ""} · client & phase capturés en direct
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(asText()).then(
                () => toast.success("Logs trail_probe copiés"),
                () => toast.error("Copie impossible"),
              );
            }}
            disabled={lines.length === 0}
          >
            Copier
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setLines([])} disabled={lines.length === 0}>
            Vider
          </Button>
          <Button size="sm" variant={enabled ? "outline" : "default"} onClick={() => setEnabled((v) => !v)}>
            {enabled ? "Pause" : "Reprendre"}
          </Button>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Les lignes <code>[trail_probe]</code> (edge) n'apparaissent PAS ici — visibles dans les
        logs de la fonction <code>ai-training-plan</code>. Les <code>[trail_probe_client]</code> et{" "}
        <code>[trail_probe_phase]</code> sont capturées automatiquement au lancement d'un run QA.
      </div>
      {lines.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          Aucune sonde capturée pour l'instant. Lance un run QA (B-70.3 N=1) — les lignes s'afficheront ici en direct.
        </div>
      ) : (
        <pre className="text-[11px] leading-relaxed bg-muted/40 rounded p-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">
{lines
  .map((l) => {
    const tag =
      l.kind === "client" ? "CLIENT" : l.kind === "phase" ? "PHASE " : "EDGE  ";
    return `[${tag}] ${l.text}`;
  })
  .join("\n")}
        </pre>
      )}
    </Card>
  );
}

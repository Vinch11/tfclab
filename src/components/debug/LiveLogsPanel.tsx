/**
 * LiveLogsPanel — viewer temps-réel des logs edge/client associés au run
 * de génération de plan en cours.
 *
 * Capture par préfixe (intercepte console.log/info/warn/error) :
 *   [SSE evt]              — événements SSE reçus (edge → client)
 *   [TRAIL DEBUG           — bloc trail-debug forwardé par l'edge
 *   [trail_probe           — sondes edge relayées côté client (si présentes)
 *   [trail_probe_client]   — sondes client
 *   [trail_probe_phase]    — sondes client par phase
 *   [normalize]            — normalisation catalogId edge (si loggé côté client)
 *   [phase_widened]        — élargissement de phase catalogue
 *   [b5_                   — checkers B5 (hallucinations catalog)
 *   [plan-chunk]           — progression chunk edge → client
 *
 * Non-invasif : filtre par catégorie, copie/vidage/pause, autoscroll.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type Kind = "sse" | "trail-debug" | "trail-probe" | "normalize" | "phase" | "b5" | "chunk" | "error";

const RULES: Array<{ rx: RegExp; kind: Kind }> = [
  { rx: /^\[SSE evt\]/, kind: "sse" },
  { rx: /^\[TRAIL DEBUG/, kind: "trail-debug" },
  { rx: /^===== \[\/?TRAIL DEBUG/, kind: "trail-debug" },
  { rx: /^\[trail_probe(_client|_phase)?\]/, kind: "trail-probe" },
  { rx: /^\[normalize\]/, kind: "normalize" },
  { rx: /^\[phase_widened\]/, kind: "phase" },
  { rx: /^\[b5_/, kind: "b5" },
  { rx: /^\[plan-chunk\]/, kind: "chunk" },
];

const COLOR: Record<Kind, string> = {
  "sse": "text-sky-500",
  "trail-debug": "text-amber-500",
  "trail-probe": "text-emerald-500",
  "normalize": "text-fuchsia-500",
  "phase": "text-indigo-500",
  "b5": "text-rose-500",
  "chunk": "text-cyan-500",
  "error": "text-red-600",
};

const LABEL: Record<Kind, string> = {
  "sse": "SSE",
  "trail-debug": "TRAIL",
  "trail-probe": "PROBE",
  "normalize": "NORM ",
  "phase": "PHASE",
  "b5": "B5   ",
  "chunk": "CHUNK",
  "error": "ERROR",
};

type Line = { ts: number; kind: Kind; text: string };

function detect(msg: string): Kind | null {
  for (const r of RULES) if (r.rx.test(msg)) return r.kind;
  return null;
}

export function LiveLogsPanel() {
  const [lines, setLines] = useState<Line[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [filter, setFilter] = useState<Set<Kind>>(new Set(Object.keys(LABEL) as Kind[]));
  const [autoscroll, setAutoscroll] = useState(true);
  const preRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const orig = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
    const wrap = (fn: (...a: unknown[]) => void, isErr = false) => (...args: unknown[]) => {
      try {
        const first = args[0];
        if (typeof first === "string") {
          const kind = detect(first) ?? (isErr ? "error" : null);
          if (kind) {
            const text = args.map(a => typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(" ");
            setLines(prev => {
              const next = [...prev, { ts: Date.now(), kind, text }];
              return next.length > 800 ? next.slice(-800) : next;
            });
          }
        }
      } catch { /* ignore */ }
      fn(...args);
    };
    console.log = wrap(orig.log);
    console.info = wrap(orig.info);
    console.warn = wrap(orig.warn);
    console.error = wrap(orig.error, true);
    return () => {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
    };
  }, [enabled]);

  const visible = useMemo(() => lines.filter(l => filter.has(l.kind)), [lines, filter]);

  useEffect(() => {
    if (!autoscroll || !preRef.current) return;
    preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [visible, autoscroll]);

  const counts = useMemo(() => {
    const c: Partial<Record<Kind, number>> = {};
    for (const l of lines) c[l.kind] = (c[l.kind] ?? 0) + 1;
    return c;
  }, [lines]);

  const toggle = (k: Kind) => setFilter(prev => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const asText = () => visible.map(l => `[${LABEL[l.kind].trim()}] ${l.text}`).join("\n");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">📡 Logs live — génération en cours</h3>
        <span className="text-xs text-muted-foreground">
          {visible.length}/{lines.length} lignes
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            navigator.clipboard.writeText(asText()).then(
              () => toast.success(`${visible.length} lignes copiées`),
              () => toast.error("Copie impossible"),
            );
          }} disabled={visible.length === 0}>Copier</Button>
          <Button size="sm" variant="ghost" onClick={() => setLines([])} disabled={lines.length === 0}>Vider</Button>
          <Button size="sm" variant={autoscroll ? "outline" : "ghost"} onClick={() => setAutoscroll(v => !v)}>
            {autoscroll ? "Autoscroll ✓" : "Autoscroll"}
          </Button>
          <Button size="sm" variant={enabled ? "outline" : "default"} onClick={() => setEnabled(v => !v)}>
            {enabled ? "Pause" : "Reprendre"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LABEL) as Kind[]).map(k => {
          const on = filter.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                on ? "bg-muted border-border" : "bg-transparent border-border/40 opacity-50"
              } ${COLOR[k]}`}
            >
              {LABEL[k].trim()} · {counts[k] ?? 0}
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-muted-foreground">
        Capture : <code>[SSE evt]</code>, <code>[TRAIL DEBUG]</code>, <code>[trail_probe*]</code>, <code>[normalize]</code>,{" "}
        <code>[phase_widened]</code>, <code>[b5_*]</code>, <code>[plan-chunk]</code>, erreurs console.
        Les probes <code>[trail_probe]</code> pures edge n'apparaissent que si l'edge les forwarde via SSE.
      </div>

      {visible.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          Aucun log capturé pour l'instant. Lance un run — les événements SSE et sondes s'afficheront en direct.
        </div>
      ) : (
        <pre
          ref={preRef}
          className="text-[11px] leading-relaxed bg-muted/40 rounded p-2 max-h-[420px] overflow-auto whitespace-pre-wrap break-all font-mono"
        >
{visible.map((l, i) => (
  <div key={i} className={COLOR[l.kind]}>
    <span className="opacity-60">[{new Date(l.ts).toLocaleTimeString()}] </span>
    <span className="opacity-80">[{LABEL[l.kind].trim()}]</span> {l.text}
  </div>
))}
        </pre>
      )}
    </Card>
  );
}

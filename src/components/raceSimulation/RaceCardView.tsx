/**
 * Affichage de la carte de course (page Simulation et harnais e2e) : résumé, segments,
 * curseurs « et si », règles, détails coach et prévu / réel. Aucun calcul ici : tout vient de buildRaceCard.
 */
import React, { useEffect, useState } from "react";
import { Bike, ChevronDown, Flag, Footprints, Timer, Waves, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bikeWhatIf, runWhatIf, fmtDuration, fmtPace, isTriathlon, type RaceCard, type RaceSegment, type Confidence } from "@/lib/raceSimulation/raceCard";
import { compareResult, fmtRaceTime, parseRaceTime, readRaceResults, snapshotPrediction, withRaceResult, withoutRaceResult } from "@/lib/raceSimulation/raceResults";

const SPORT_ICON = { swim: Waves, t1: Timer, bike: Bike, t2: Timer, run: Footprints } as const;
const CONFIDENCE: Record<Confidence, { label: string; cls: string }> = {
  measured: { label: "Mesuré", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  estimated: { label: "Estimé", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400" },
  missing: { label: "À compléter", cls: "bg-muted text-muted-foreground" },
};

/** Corps de la carte de course, sous le choix de la course et les données manquantes. */
export function RaceCardBody({ card, weightKg, athleteId, raceKey, raceDate, refs, onSaveRefs }: {
  card: RaceCard; weightKg: number | null; athleteId: string | null; raceKey: string; raceDate: string | null;
  refs: unknown; onSaveRefs: (refs: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <>
      <Card><CardContent className="p-4">
        {card.lcw ? (
          <p className="text-sm"><b>Long Course Weekend</b> : trois épreuves sur trois jours, chacune simulée comme une course à part.</p>
        ) : card.totalMin != null ? (
          <div>
            <p className="text-xs text-muted-foreground">Temps prévu · {card.label}</p>
            <p className="text-3xl font-bold tabular-nums" data-testid="race-total">{fmtDuration(card.totalMin)}</p>
            {card.totalRange && <p className="text-sm text-muted-foreground">Fourchette {fmtDuration(card.totalRange[0])} – {fmtDuration(card.totalRange[1])}{card.partial ? " · total partiel (données manquantes)" : ""}</p>}
          </div>
        ) : <p className="text-sm text-muted-foreground">Temps total indisponible : complète les données ci-dessus.</p>}
      </CardContent></Card>

      <div className="space-y-2">{card.segments.map((s, i) => <SegmentCard key={`${s.sport}-${i}`} s={s} />)}</div>

      {card.fuel.warning && <Card className="border-amber-500/40 bg-amber-500/5"><CardContent className="p-3 text-sm">{card.fuel.warning}</CardContent></Card>}

      <WhatIf card={card} weightKg={weightKg} />

      <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Flag className="h-4 w-4 text-primary" />Les règles du jour</CardTitle></CardHeader>
        <CardContent className="pt-0"><ol className="list-decimal pl-5 space-y-1.5 text-sm">{card.rules.map(r => <li key={r}>{r}</li>)}</ol></CardContent></Card>

      <CoachDetails card={card} athleteId={athleteId} />

      <ResultCard card={card} raceKey={raceKey} raceDate={raceDate} refs={refs}
        snapshotChrono={card.run?.recorded && raceDate && card.run.recorded.date === raceDate ? card.run.recorded.timeSec : null}
        onSave={onSaveRefs} />
    </>
  );
}


function SegmentCard({ s }: { s: RaceSegment }) {
  const Icon = SPORT_ICON[s.sport];
  const transition = s.sport === "t1" || s.sport === "t2";
  if (transition) return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{s.label}</span>
      <span className="tabular-nums">≈ {s.timeMin != null ? fmtDuration(s.timeMin) : "—"} <span className="text-xs">(repère type)</span></span>
    </div>
  );
  const conf = CONFIDENCE[s.confidence];
  return (
    <Card><CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-sm"><Icon className="h-4 w-4 text-primary" />{s.day ? `Jour ${s.day} · ` : ""}{s.label}</span>
        <Badge variant="outline" className={`text-[10px] ${conf.cls}`}>{conf.label}</Badge>
      </div>
      {s.target ? (
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Cible</p><p className="text-xl font-bold tabular-nums">{s.target.text}</p></div>
          <div><p className="text-xs text-muted-foreground">Temps</p><p className="text-xl font-bold tabular-nums">{s.timeMin != null ? fmtDuration(s.timeMin) : "—"}</p>
            {s.timeRange && <p className="text-xs text-muted-foreground tabular-nums">{fmtDuration(s.timeRange[0])} – {fmtDuration(s.timeRange[1])}</p>}</div>
        </div>
      ) : <p className="text-sm text-muted-foreground">{s.source}</p>}
      {s.hr && <p className="text-sm"><span className="text-muted-foreground">FC repère</span> {s.hr}</p>}
      {s.carbs && (
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-sm"><span className="text-muted-foreground">Glucides à prendre</span> <b className="tabular-nums">{s.carbs.text}</b></p>
          <p className="text-xs text-muted-foreground">{s.carbs.why}</p>
        </div>
      )}
      {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
    </CardContent></Card>
  );
}

function WhatIf({ card, weightKg }: { card: RaceCard; weightKg: number | null }) {
  const [watts, setWatts] = useState(0);
  const [pace, setPace] = useState(0);
  useEffect(() => { setWatts(0); setPace(0); }, [card.kind, card.lcw]);
  const bike = card.bike ? bikeWhatIf(card, watts, weightKg) : null;
  const run = runWhatIf(card, pace);
  if (!bike && !run) return null;
  const verdict = bike ? { below: "Sous la charge visée : marge pour la course à pied.", ok: "Dans la charge visée : la course à pied reste jouable.", risky: "Au-dessus de la charge visée : la course à pied risque d'en souffrir.", high: "Bien au-dessus : marche probable sur la course à pied." }[bike.verdict] : null;
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base">Et si… ?</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-5">
        {bike && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Vélo {watts > 0 ? "+" : ""}{watts} W</span><b className="tabular-nums">{bike.watts} W</b></div>
            <Slider min={-20} max={20} step={1} value={[watts]} onValueChange={v => setWatts(v[0])} aria-label="Écart de puissance vélo" />
            <p className="text-sm tabular-nums">Vélo en {fmtDuration(bike.timeMin)} ({bike.deltaMin <= 0 ? "−" : "+"}{Math.abs(Math.round(bike.deltaMin))} min) · charge {bike.tss} TSS (visée {bike.tssRange[0]}–{bike.tssRange[1]})</p>
            <p className={`text-sm ${bike.verdict === "risky" || bike.verdict === "high" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{verdict}</p>
          </div>
        )}
        {run && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Course {pace > 0 ? "+" : pace < 0 ? "−" : ""}{Math.abs(pace)} s/km</span><b className="tabular-nums">{fmtPace(run.paceSec)}/km</b></div>
            <Slider min={-20} max={20} step={1} value={[pace]} onValueChange={v => setPace(v[0])} aria-label="Écart d'allure course" />
            <p className="text-sm tabular-nums">Course en {fmtDuration(run.timeMin)} ({run.deltaMin <= 0 ? "−" : "+"}{Math.abs(Math.round(run.deltaMin))} min) · {Math.round(run.fractionOfCs * 100)} % de la vitesse critique</p>
            <p className={`text-sm ${run.risky ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{run.risky ? "Trop rapide pour cette durée : risque nettement plus élevé de craquer en deuxième moitié." : "Allure tenable pour cette durée."}</p>
          </div>
        )}
      </CardContent></Card>
  );
}

function CoachDetails({ card, athleteId }: { card: RaceCard; athleteId: string | null }) {
  const [open, setOpen] = useState(false);
  const [nolioBest, setNolioBest] = useState<number | null>(null);
  const runKm = card.segments.find(s => s.sport === "run")?.distanceKm ?? null;
  useEffect(() => {
    setNolioBest(null);
    if (!open || !runKm || !athleteId || isTriathlon(card.kind)) return;
    let cancelled = false;
    (async () => {
      // Records Nolio (vitesse m/s ; record_type distance → item_seconds = mètres, time → secondes).
      const { data } = await supabase.from("nolio_records" as never).select("item_seconds, value, record_type").eq("athlete_id", athleteId).eq("cat", "par").in("sport_id", [2, 52]);
      const rows = ((data ?? []) as unknown as Array<{ item_seconds: number; value: number; record_type: string }>)
        .filter(r => r.value > 0 && r.item_seconds > 0)
        .map(r => r.record_type === "distance" ? { km: r.item_seconds / 1000, sec: r.item_seconds / r.value } : { km: (r.item_seconds * r.value) / 1000, sec: r.item_seconds })
        .filter(r => Math.abs(r.km - runKm) / runKm < 0.03);
      if (!cancelled && rows.length) setNolioBest(Math.min(...rows.map(r => r.sec)));
    })();
    return () => { cancelled = true; };
  }, [open, runKm, card.kind, athleteId]);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card><CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-sm font-medium min-h-11">
        Détails du calcul (coach)<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
        <CollapsibleContent><CardContent className="pt-0 space-y-2 text-sm">
          {card.segments.filter(s => !s.sport.startsWith("t")).map((s, i) => <p key={i}><b>{s.label}</b> · {s.source}</p>)}
          {card.ambitionAssumed && <p className="text-amber-700 dark:text-amber-400">Ambition non renseignée : calcul fait en age-group.</p>}
          <FuelDetails card={card} />
          {card.run?.recorded && <p><b>Chrono enregistré dans la fiche</b> · {fmtRaceTime(card.run.recorded.timeSec)}{card.run.recorded.date ? ` (${card.run.recorded.date.split("-").reverse().join("/")})` : ""}</p>}
          {nolioBest && <p><b>Meilleur temps Nolio sur la distance</b> · {fmtRaceTime(nolioBest)}</p>}
          <p className="text-xs text-muted-foreground">Sources : course seule calée sur Smyth et Muniz-Pumares 2020 (25 000 marathoniens) ; vélo par la charge visée (TSS) et le modèle de vitesse ; natation CSS + 2 à 5 % ; glucides : dépense du modèle de Mader à la cible, plafonnée par la tolérance testée et les repères de Jeukendrup 2014 (jusqu'à 30, 60 ou 90 g/h selon la durée). Transitions : repères types.</p>
        </CardContent></CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ResultCard({ card, raceKey, raceDate, refs, snapshotChrono, onSave }: {
  card: RaceCard; raceKey: string; raceDate: string | null; refs: unknown;
  snapshotChrono: number | null; onSave: (refs: Record<string, unknown>) => Promise<void>;
}) {
  const saved = readRaceResults(refs)[raceKey] ?? null;
  const tri = isTriathlon(card.kind);
  const [total, setTotal] = useState(""); const [swim, setSwim] = useState(""); const [bike, setBike] = useState(""); const [run, setRun] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTotal(snapshotChrono ? fmtRaceTime(snapshotChrono) : ""); setSwim(""); setBike(""); setRun(""); }, [raceKey, snapshotChrono]);
  const comparison = saved ? compareResult(saved) : null;
  const save = async () => {
    const parts = [parseRaceTime(swim), parseRaceTime(bike), parseRaceTime(run)];
    // Long Course Weekend : pas de temps total enchaîné, la somme des trois jours sert de total.
    const totalSec = card.lcw ? (parts.every(Boolean) ? parts.reduce((a, b) => a! + b!, 0) : null) : parseRaceTime(total);
    if (!totalSec) { toast.error(card.lcw ? "Saisis les trois temps (par exemple 1:12:00)." : "Temps total illisible : écris par exemple 3:58:12 ou 3h58."); return; }
    setBusy(true);
    try {
      await onSave(withRaceResult(refs, { raceKey, kind: card.kind, date: raceDate, savedAt: new Date().toISOString(), predicted: snapshotPrediction(card),
        actual: { totalSec, swimSec: parseRaceTime(swim), bikeSec: parseRaceTime(bike), runSec: parseRaceTime(run) ?? (!tri ? totalSec : null) } }));
      toast.success("Résultat enregistré.");
    } finally { setBusy(false); }
  };
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Après la course : prévu / réel</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-3 text-sm">
        {comparison && saved ? (
          <>
            <table className="w-full tabular-nums"><thead><tr className="text-xs text-muted-foreground text-left"><th className="font-medium py-1">Segment</th><th className="font-medium">Prévu</th><th className="font-medium">Réel</th><th className="font-medium">Écart</th></tr></thead>
              <tbody>{comparison.rows.map(r => <tr key={r.label} className="border-t"><td className="py-1.5">{r.label}</td><td>{fmtDuration(r.predictedMin)}</td><td>{fmtRaceTime(r.actualMin * 60)}</td><td className={Math.abs(r.deltaPct) > 3 ? "text-amber-700 dark:text-amber-400" : ""}>{r.deltaPct > 0 ? "+" : ""}{r.deltaPct.toFixed(1).replace(".", ",")} %</td></tr>)}</tbody></table>
            <p>{comparison.reading}</p>
            <Button variant="outline" size="sm" className="h-9" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(withoutRaceResult(refs, raceKey)); } finally { setBusy(false); } }}>Effacer ce résultat</Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Saisis le chrono réel : l'écart avec la prévision dira si les tests de référence sont justes.{snapshotChrono ? " Prérempli depuis le chrono de la fiche." : ""}</p>
            <div className="grid grid-cols-2 gap-2">
              {!card.lcw && <div className="col-span-2 space-y-1"><Label className="text-xs">Temps total</Label><Input className="h-11" inputMode="numeric" placeholder="3:58:12" value={total} onChange={e => setTotal(e.target.value)} /></div>}
              {tri && <>
                <div className="space-y-1"><Label className="text-xs">Natation</Label><Input className="h-11" placeholder="1:12:00" value={swim} onChange={e => setSwim(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Vélo</Label><Input className="h-11" placeholder="5:50:00" value={bike} onChange={e => setBike(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Course</Label><Input className="h-11" placeholder="4:20:00" value={run} onChange={e => setRun(e.target.value)} /></div>
              </>}
            </div>
            <Button size="sm" className="h-10" disabled={busy || (card.lcw ? !(swim.trim() && bike.trim() && run.trim()) : !total.trim())} onClick={save}>Enregistrer le résultat</Button>
          </>
        )}
      </CardContent></Card>
  );
}

/** Bilan glucides pour le coach : dépense, réserve, apport prévu. */
function FuelDetails({ card }: { card: RaceCard }) {
  const f = card.fuel;
  const burns = card.segments.filter(s => s.carbs?.burnGH != null);
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <p className="font-medium">Glucides</p>
      {f.method === "individual"
        ? <p>Calculés pour cet athlète : glucides brûlés à sa cible ({burns.map(s => `${s.sport === "bike" ? "vélo" : "course"} ≈ ${Math.round(s.carbs!.burnGH!)} g/h`).join(", ")}), avec une marge si la VLamax est estimée.</p>
        : <p>Repère général par durée : VO₂max, VLamax ou poids manquant pour calculer la dépense.</p>}
      {f.needG != null && f.glycogenG != null && f.supplyG != null && (
        <p className="tabular-nums">Sur toute l'épreuve : dépense ≈ {Math.round(f.needG)} g · réserve de glycogène mobilisable ≈ {Math.round(f.glycogenG)} g · apport prévu ≈ {Math.round(f.supplyG - f.glycogenG)} g.</p>
      )}
      {f.notes.map(n => <p key={n} className="text-muted-foreground">{n}</p>)}
    </div>
  );
}

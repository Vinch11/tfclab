import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Hourglass, Circle } from "lucide-react";
import { buildTestChecklist, buildTestingPlan, type DayKey, type TestItem, type TestStatus } from "@/lib/diagnostic/athleteTestChecklist";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import type { TestPlans, TestRoute } from "@/components/TestSessionsNolioExport";

const STATUS: Record<TestStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "À jour", cls: "bg-[var(--mint)] text-accent", Icon: CheckCircle2 },
  stale: { label: "À retester", cls: "bg-[#fff0ce] text-[#3d2e13]", Icon: Hourglass },
  missing: { label: "À faire", cls: "bg-muted text-muted-foreground", Icon: Circle },
};
/** Route de la page de tests qui porte le protocole détaillé et l'envoi vers Nolio. */
const ROUTE: Partial<Record<DayKey, TestRoute>> = {
  "bike-day": "bike-day", "track-day": "track-day", "cp-day": "cp-day", "cs-day": "cs-day",
  "durability-bike": "durability-bike", "durability-run": "durability-run",
};
const SPORT = { bike: "Vélo", run: "Course à pied", both: "Tous sports" } as const;

function Row({ item, onOpen }: { item: TestItem; onOpen: (route: TestRoute) => void }) {
  const st = STATUS[item.status];
  const route = ROUTE[item.day];
  return (
    <li className="compass-step space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold leading-snug">{item.label}</h4>
          <p className="text-xs text-muted-foreground">{SPORT[item.sport]} · alimente : {item.feeds}</p>
        </div>
        <span className={"ui-badge inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs " + st.cls}><st.Icon aria-hidden className="size-3.5" />{st.label}</span>
      </div>
      {item.valueText && <p className="text-sm">Valeur conservée : <strong className="tabular-nums">{item.valueText}</strong></p>}
      <p className={"text-xs leading-relaxed " + (item.status === "stale" ? "font-medium text-[#3d2e13] dark:text-[#ffe2a3]" : "text-muted-foreground")}>{item.message}{item.note ? " " + item.note : ""}</p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer py-1 font-medium text-foreground">Protocole</summary>
        <ul className="list-disc space-y-1 pl-4 pt-1">{item.protocol.map(p => <li key={p}>{p}</li>)}</ul>
        <p className="pt-2">Validité : {item.validityDays} jours. Passé ce délai, la valeur reste affichée et utilisée ; le coach est seulement averti.</p>
      </details>
      {route && <button type="button" onClick={() => onOpen(route)} className="text-xs font-medium underline">Voir le protocole détaillé et l’envoyer vers Nolio</button>}
    </li>
  );
}

/**
 * Tests à faire pour cet athlète : section repliée par défaut. Une valeur dont la validité est
 * dépassée reste affichée et utilisée ; la section avertit seulement qu'il faudrait retester.
 * `renderExporter` fournit la page de tests (protocole détaillé, impression, envoi vers Nolio) ;
 * elle n'est montée qu'à la demande.
 */
export function DashboardTestChecklist({ input, today, renderExporter }: {
  input: CoachingCompassInput; today?: string;
  renderExporter?: (route: TestRoute, plans: TestPlans) => ReactNode;
}) {
  const checklist = useMemo(() => buildTestChecklist(input, today), [input, today]);
  const todo = useMemo(() => buildTestingPlan(checklist, false), [checklist]);
  const all = useMemo(() => buildTestingPlan(checklist, true), [checklist]);
  const plans = useMemo<TestPlans>(() => ({
    "plan-todo": { label: "Plan des tests à faire ou à retester (" + todo.length + " Day" + (todo.length > 1 ? "s" : "") + ")", sessions: todo.map(d => d.session) },
    "plan-all": { label: "Plan de tests complet (" + all.length + " Day" + (all.length > 1 ? "s" : "") + ")", sessions: all.map(d => d.session) },
  }), [todo, all]);
  const [route, setRoute] = useState<TestRoute | null>(null);
  const { items, summary } = checklist;
  if (!items.length) return null;
  const toRedo = summary.stale + summary.missing;
  const plan = (days: typeof todo) => days.map(d => `J${d.dayNumber} · ${d.label}`).join(" → ");
  return (
    <details className="ui-card min-w-0 rounded-3xl border bg-card p-5 sm:p-7" aria-label="Tests à faire pour cet athlète">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
        <span className="flex items-center gap-2"><ClipboardList aria-hidden className="size-5 text-primary" />Tests à faire pour cet athlète</span>
        <span className={"ui-badge px-2.5 py-1 text-xs font-medium " + (toRedo ? STATUS.stale.cls : STATUS.ok.cls)}>
          {summary.ok} sur {summary.total} à jour{summary.stale ? " · " + summary.stale + " à retester" : ""}{summary.missing ? " · " + summary.missing + " à faire" : ""}
        </span>
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-sm text-muted-foreground">
          Liste des tests utiles pour cet objectif et ce sport. Une valeur dont la validité est dépassée n’est jamais retirée : elle reste affichée et utilisée, et la ligne signale qu’il faudrait retester.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">{items.map(i => <Row key={i.key} item={i} onOpen={setRoute} />)}</ul>
        <section aria-label="Tout tester en quelques jours" className="space-y-2 rounded-2xl border p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold"><CalendarDays aria-hidden className="size-4 text-primary" />Tout tester en quelques jours</h3>
          <p className="text-sm text-muted-foreground">Les Days regroupent les tests : un Day par jour, au moins 48 h entre deux Days du même sport. La durabilité et le laboratoire se programment à part.</p>
          {todo.length > 0
            ? <p className="text-sm"><strong>Tests à faire ou à retester :</strong> {plan(todo)}</p>
            : <p className="text-sm">Tous les tests programmables par les Days sont à jour.</p>}
          {all.length > 0 && <p className="text-sm"><strong>Plan complet :</strong> {plan(all)}</p>}
          <div className="flex flex-wrap gap-2">
            {todo.length > 0 && <button type="button" onClick={() => setRoute("plan-todo")} className="min-h-11 rounded-full border px-4 text-sm font-medium">Voir et envoyer le plan des tests à faire</button>}
            {all.length > 0 && <button type="button" onClick={() => setRoute("plan-all")} className="min-h-11 rounded-full border px-4 text-sm font-medium">Voir et envoyer le plan complet</button>}
          </div>
        </section>
        {route && renderExporter && <div key={route}>{renderExporter(route, plans)}</div>}
      </div>
    </details>
  );
}

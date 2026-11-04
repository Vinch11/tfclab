import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { buildDetExpectations, checkPdfHtml, type DetPlanLike } from "../detExportConformity";

/**
 * Contrôle PDF PAR SÉANCE (bloc ↔ séance source) — HTML seulement, aucune
 * impression réelle. Sorties réelles des 4 marathons acceptés du labo DET
 * (synthétiques, non prescriptives) + reproduction de l'échange A/B.
 */
vi.mock("@/lib/openPrintableHTML", () => ({ openPrintableHTML: vi.fn() }));

const START = "2026-10-26";
type Mode = { o: "portrait" | "landscape"; d: "full" | "compact" };
const MODES: Mode[] = [
  { o: "portrait", d: "full" }, { o: "portrait", d: "compact" },
  { o: "landscape", d: "full" }, { o: "landscape", d: "compact" },
];

async function render(plan: ParsedPlan, m: Mode): Promise<string> {
  const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
  const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
  const mock = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
  mock.mockClear();
  exportAIPlanToPDF(plan, "QA_DET_A", new Date(START), undefined, m.o, m.d);
  return mock.mock.calls[0][0] as string;
}

const twoSessions: DetPlanLike = { weeks: [{ weekNumber: 1, sessions: [
  { weekNumber: 1, dayIndex: 0, dayName: "Lundi", sport: "run", title: "Séance A", details: "2x5 min Z2 récup 1min", isRest: false, durationMin: 30 },
  { weekNumber: 1, dayIndex: 1, dayName: "Mardi", sport: "run", title: "Séance B", details: "4x8 min Z4 récup 3min", isRest: false, durationMin: 60 },
] }] };
const asParsed = (p: DetPlanLike) => ({ title: "QA", totalWeeks: 1, phases: [], weeks: p.weeks.map((w) => ({ ...w, phase: "base", focus: "", totalHours: 0 })) } as unknown as ParsedPlan);

function swapBlocks(html: string, a: string, b: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const A = doc.querySelector(`[data-session-key="${a}"]`)!;
  const B = doc.querySelector(`[data-session-key="${b}"]`)!;
  const tmp = A.innerHTML; A.innerHTML = B.innerHTML; B.innerHTML = tmp;
  return doc.documentElement.outerHTML;
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
});
afterAll(() => vi.restoreAllMocks());

describe("reproduction : échange complet A/B entre deux séances", () => {
  it('durées V3 lisibles : la représentation conforme passe, une minute ou une cible changée échoue toujours',async()=>{
    const p:DetPlanLike={weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:0,dayName:'Lundi',sport:'run',title:'Endurance V3',catalogId:'V3P_RUN_084',isRest:false,durationMin:157,
      details:'0: 600s Échauffement | 1: 6600s Endurance | 2: 2220s Retour au calme | DURÉE CALCULÉE : 9420 secondes exactes (sans arrondi) | CIBLES INDIVIDUALISÉES: moderate_lt1 292.7 320 sec_per_km'}]}]};
    const expected=buildDetExpectations(p,START),before=structuredClone(p);
    for(const mode of MODES){
      const html=await render(asParsed(p),mode);
      expect(checkPdfHtml(expected,html,START)).toEqual([]);
      expect(html).toContain('1 h 50 min Endurance');
      for(const [from,to] of [['1 h 50 min Endurance','1 h 49 min Endurance'],['292.7 320 sec_per_km','290 320 sec_per_km']]){
        expect(checkPdfHtml(expected,html.replace(from,to),START).map(i=>i.code)).toContain('pdf_instructions_divergent');
      }
    }
    expect(p).toEqual(before);
  });
  for (const m of MODES) {
    it(`${m.o}/${m.d} : rendu fidèle = [] ; échange dates/doses/instructions = échec par séance`, async () => {
      const html = await render(asParsed(twoSessions), m);
      const exp = buildDetExpectations(twoSessions, START);
      expect(checkPdfHtml(exp, html, START)).toEqual([]);
      const swapped = swapBlocks(html, "S1-J0-0", "S1-J1-1");
      const issues = checkPdfHtml(exp, swapped, START);
      for (const key of ["S1-J0-0", "S1-J1-1"]) {
        const codes = issues.filter((i) => i.sessionKey === key).map((i) => i.code);
        expect(codes).toEqual(expect.arrayContaining(["pdf_date_divergent", "pdf_title_divergent", "pdf_duration_divergent", "pdf_instructions_divergent"]));
      }
    });
  }

  it("bloc absent, doublé, ou instructions déplacées dans une fiche : échec", async () => {
    const html = await render(asParsed(twoSessions), MODES[0]);
    const exp = buildDetExpectations(twoSessions, START);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const B = doc.querySelector('[data-session-key="S1-J1-1"]')!;
    const dup = doc.documentElement.outerHTML.replace(B.outerHTML, B.outerHTML + B.outerHTML);
    expect(checkPdfHtml(exp, dup, START).map((i) => i.code)).toContain("pdf_session_duplicated");
    const gone = doc.documentElement.outerHTML.replace(B.outerHTML, "");
    expect(checkPdfHtml(exp, gone, START).map((i) => i.code)).toContain("pdf_session_missing");
    // Instructions retirées du bloc mais recopiées dans un bloc d'information.
    const det = B.querySelector('[data-src="details"]')!;
    const info = doc.createElement("div"); info.setAttribute("data-role", "info"); info.textContent = det.textContent;
    det.textContent = ""; B.appendChild(info);
    const moved = checkPdfHtml(exp, doc.documentElement.outerHTML, START);
    expect(moved.filter((i) => i.sessionKey === "S1-J1-1").map((i) => i.code)).toEqual(expect.arrayContaining(["pdf_instructions_divergent", "pdf_repetitions_missing", "pdf_targets_missing"]));
  });

  it("texte avec références « (2018) · … (2018) » : formatage sans perte (défaut réel corrigé)", async () => {
    const p: DetPlanLike = { weeks: [{ weekNumber: 1, sessions: [{ weekNumber: 1, dayIndex: 0, dayName: "Lundi", sport: "strength", title: "Force", isRest: false, durationMin: 50,
      details: "Main: 4×3 @ 85% → 4×5 sauts. Repos 15s. | Références: Berryman et al. (2018) · Blagrove et al. (2018) — transfert." }] }] };
    for (const m of MODES) expect(checkPdfHtml(buildDetExpectations(p, START), await render(asParsed(p), m), START)).toEqual([]);
  });

  it("séance vélo Z4 dans un plan running pur : le PDF garde Z4 (aucune réécriture en Z2)", async () => {
    const p: DetPlanLike = { weeks: [{ weekNumber: 1, sessions: [{ weekNumber: 1, dayIndex: 2, dayName: "Mercredi", sport: "bike", title: "Vélo", isRest: false, durationMin: 60, details: "3x10 min Z4 récup 3 min" }] }] };
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    const mock = openPrintableHTML as unknown as ReturnType<typeof vi.fn>; mock.mockClear();
    exportAIPlanToPDF(asParsed(p), "QA", new Date(START), undefined, "portrait", "full", { objective: "Marathon" } as never);
    const html = mock.mock.calls[0][0] as string;
    expect(checkPdfHtml(buildDetExpectations(p, START), html, START)).toEqual([]);
    expect(html).toContain("prescription sauvegardée affichée telle quelle");
  });
});

describe("4 marathons DET acceptés : PDF HTML fidèle séance par séance (4 rendus)", async () => {
  const { DET_LAB_SCENARIOS, runDetLabScenario } = await import("@/qa/det-lab/detLab");
  const accepted = DET_LAB_SCENARIOS.filter((s) => s.expectation === "accepted");
  it("exactement 4 scénarios acceptés", () => expect(accepted).toHaveLength(4));
  for (const sc of accepted) {
    it(`${sc.id}`, async () => {
      const out = runDetLabScenario(sc.id, { engineVersion: "a".repeat(64), now: () => new Date("2026-11-02T00:00:00Z") });
      expect(out.kind).toBe("accepted");
      if (out.kind !== "accepted") return;
      const plan = out.plan as unknown as ParsedPlan;
      const exp = buildDetExpectations(plan as unknown as DetPlanLike, START);
      expect(exp.length).toBe(out.sessions);
      for (const m of MODES) {
        const html = await render(plan, m);
        const issues = checkPdfHtml(exp, html, START).filter((i) => i.code !== "det_duration_absent");
        expect({ mode: `${m.o}/${m.d}`, issues }).toEqual({ mode: `${m.o}/${m.d}`, issues: [] });
      }
      // Sabotage sur la vraie sortie : échange de deux séances distinctes.
      const html = await render(plan, MODES[2]);
      const [a, b] = exp.filter((e, i, arr) => arr.findIndex((x) => x.details === e.details) === i).slice(0, 2);
      const bad = checkPdfHtml(exp, swapBlocks(html, a.key, b.key), START);
      expect(bad.some((i) => i.sessionKey === a.key && i.code === "pdf_instructions_divergent")).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    }, 600000);
  }
});

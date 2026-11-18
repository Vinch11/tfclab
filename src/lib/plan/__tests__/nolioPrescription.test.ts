import { describe, expect, it } from "vitest";
import { firstDurationSeconds, parsePrescription, prescriptionSeconds, prescriptionPartsFromText, splitSportParts, type PrescriptionNode, type PrescriptionStep } from "../../../../supabase/functions/_shared/nolioPrescription";

function flatten(nodes: PrescriptionNode[]): PrescriptionStep[] {
  return nodes.flatMap(n => n.kind === "step" ? [n] : Array.from({length:n.times}, () => flatten(n.steps)).flat());
}
describe("fidelity of the prescription sent to Nolio", () => {
  it("does not read Z2 haut as two hours or a pace as a duration", () => {
    expect(firstDurationSeconds("Z2 haut")).toBeNull();
    expect(firstDurationSeconds("10' Z2 haut")).toBe(600);
    expect(firstDurationSeconds("allure 4'30/km")).toBeNull();
  });
  it("exports all five stages of the 50-minute progressive tempo", () => {
    const nodes = parsePrescription("15' Z2 + 10' Z2 haut + 10' Z3 + 5' Z4a + 10' Z1 cool");
    expect(flatten(nodes).map(n => n.value)).toEqual([900,600,600,300,600]);
    expect(prescriptionSeconds(nodes)).toBe(3000);
  });
  it("keeps one-minute recoveries between five six-minute reps", () => {
    const steps = flatten(parsePrescription("5x6' Z4a r=1' trot"));
    expect(steps.filter(s => !s.recovery).map(s => s.value)).toEqual([360,360,360,360,360]);
    expect(steps.filter(s => s.recovery).map(s => s.value)).toEqual([60,60,60,60]);
  });
  it("preserves a prescribed recovery after each repetition", () => {
    const nodes = parsePrescription("3x15' SST (88-94% FTP) / 5' Z1 après chaque répétition");
    expect(prescriptionSeconds(nodes)).toBe(3600);
    expect(flatten(nodes).filter(s => s.recovery)).toHaveLength(3);
  });
  it("keeps distances and does not guess a time from VMA", () => {
    const nodes = parsePrescription("10x400m à 4:00-4:10/km r=60s trot");
    expect(flatten(nodes).filter(s => !s.recovery).map(s => [s.unit,s.value])).toEqual(Array.from({length:10},()=>["distance",400]));
    expect(prescriptionSeconds(nodes)).toBeNull();
  });
  it("keeps both nested sets, inner recoveries and the between-set recovery", () => {
    const steps=flatten(parsePrescription("2x(6x30s Z5/30s Z1) R=4min Z1"));
    expect(steps.filter(s=>!s.recovery)).toHaveLength(12);
    expect(steps.filter(s=>s.recovery&&s.value===30)).toHaveLength(12);
    expect(steps.filter(s=>s.recovery&&s.value===240)).toHaveLength(1);
    expect(steps.reduce((sum,s)=>sum+s.value,0)).toBe(960);
  });
  it("supports conventional short/short seconds notation", () => {
    expect(prescriptionSeconds(parsePrescription("6x30/30"))).toBe(360);
  });
  it("does not add an included interval on top of its enclosing duration", () => {
    expect(prescriptionSeconds(parsePrescription("20min Z2 dont 4x1min Z4 / 1min Z1"))).toBe(1200);
  });
  it("reports ambiguous repetitions and missing recoveries", () => {
    for(const text of ["4-6x5min Z4 r=1min", "3x12' → 3x15' → 3x18'", "10x400m Z5"])
      expect(()=>parsePrescription(text)).toThrow();
  });
  it("keeps unlabelled text and never silently drops a leading prescription", () => {
    expect(prescriptionPartsFromText("15min Z2 + 10min Z3 [ID:EXAMPLE]")[0].text).toBe("15min Z2 + 10min Z3");
    expect(prescriptionPartsFromText("200m souple | Main: 800m à 1:30/100m")).toHaveLength(2);
  });
  it("separates swimming and cycling with their own distance and targets", () => {
    const parts=prescriptionPartsFromText("Warm-up: 200m souple | Main: Natation: 1500m à 1:30-1:35/100m + Vélo: 45min 180-210W | Cool-down: 10min vélo souple");
    const segments=splitSportParts("brick",parts);
    expect(segments.map(s=>s.sport)).toEqual(["natation","cyclisme"]);
    expect(flatten(segments[0].parts.flatMap(p=>parsePrescription(p.text))).map(s=>s.value)).toEqual([200,1500]);
    expect(prescriptionSeconds(segments[1].parts.flatMap(p=>parsePrescription(p.text)))).toBe(3300);
  });
  it("requires named sports instead of silently treating a brick as running", () => {
    expect(()=>splitSportParts("brick",[{part:"Main",text:"60min Z2",zones:["Z2"]}])).toThrow(/segments/);
    expect(()=>splitSportParts("run",[{part:"Main",text:"Natation: 1500m souple",zones:[]}])).toThrow(/sport/);
  });
});

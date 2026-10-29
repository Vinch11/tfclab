import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync, writeFileSync } from "node:fs";
import Cohort from "@/pages/VlamaxCapCohortPage";
import { buildAnchorEntry, buildAnchorReport } from "@/lib/v2/vlamaxCapAnchorCalibration";
import { CAP_COHORT_CSV_VERSION, DECLARED_CAP_REFERENCE_LABEL, cohortStatisticalNote, entriesToCSV, qualifyCohortReference } from "@/lib/v2/vlamaxCapCohortPresentation";
import type { ReferenceEvidence } from "@/lib/scientificQualification";
const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], user: null as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/contexts/AthleteContext", () => ({ useAthletes: () => ({ athletes: [{ id: "synthetic:A", name: "Synthetic A" }] }) }));
vi.mock("@/components/SidebarLayout", () => ({ SidebarLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: mocks.rows, error: null }) };
  return query;
} } }));
afterEach(() => { cleanup(); mocks.rows = []; mocks.user = null; vi.restoreAllMocks(); });
const proof: ReferenceEvidence = { subjectId: "synthetic:A", quantity: "vlamax", discipline: "run", value: 0.7, unit: "mmol/L/s", methodKind: "blood_lactate_protocol", nature: "calculated", method: "Synthetic documented post-sprint protocol", date: "2026-10-20", sourceRef: "fixture:cohort-A", primaryMeasurementSourceRef: "fixture:lactate-A" };
const row = (quality = 4, evidence?: ReferenceEvidence) => ({ id: `synthetic:row-${quality}`, athlete_id: "synthetic:A", date: "2026-10-20", protocol_quality: quality, notes: 'Historical "labo" declaration\nnot primary evidence', raw_values: { vlamaxRunMeasured: 0.7, sprint15sDistance: 85, ...(evidence ? { physiologicalEvidence: { vlamax: evidence } } : {}) } });
const fill = (r: ReturnType<typeof render>) => {
  fireEvent.change(r.container.querySelector('input[placeholder="0.45"]')!, { target: { value: "0.70" } });
  fireEvent.change(r.container.querySelector('input[placeholder="85"]')!, { target: { value: "85" } });
};
it("0.70 / 85 m without selected athlete renders a declared reference, not a laboratory measurement", () => {
  const r = render(<Cohort />); fill(r);
  expect(r.container.textContent).toContain(DECLARED_CAP_REFERENCE_LABEL);
  expect(r.container.textContent).not.toContain("Mesuré (labo)");
  expect(r.container.textContent).toContain("0.7"); expect(r.container.textContent).toContain("0.51");
  expect(r.container.textContent).toContain("sans validation scientifique indépendante");
  if (process.env.C8_V232_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.3.2/evidence/render-after.txt", r.container.textContent!);
});
it("selecting an athlete without documentary proof cannot upgrade the live preview", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  const r = render(<Cohort />); fill(r);
  fireEvent.keyDown(screen.getAllByRole("combobox")[0], { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Synthetic A" }));
  expect(screen.getAllByRole("combobox")[0].textContent).toContain("Synthetic A");
  expect(r.container.textContent).toContain(DECLARED_CAP_REFERENCE_LABEL);
  expect(r.container.textContent).not.toContain("Mesuré (labo)");
});
it("table and RMSE render quality groups and distinguish documented lactate derivation from unknown references", async () => {
  mocks.user = { id: "synthetic:coach" }; mocks.rows = [row(4), row(5, proof), row(2)];
  const r = render(<Cohort />);
  await waitFor(() => expect(r.container.textContent).toContain("Qualité déclarée 4–5"));
  expect(r.container.textContent).toContain("Qualité déclarée 2–3");
  expect(r.container.textContent).toContain("VLamax dérivée de mesures de lactate sanguin déclarées");
  expect(r.container.textContent).toContain(DECLARED_CAP_REFERENCE_LABEL);
  expect(r.container.textContent).not.toContain("ancrages valides");
  expect(r.container.textContent).not.toContain("Mesuré (labo)");
  expect(r.container.textContent).toContain("RMSE pondéré");
  const headers = [...r.container.querySelectorAll("th")].map(e => e.textContent);
  expect(headers).toContain("VLamax de référence déclarée"); expect(headers).toContain("Qualification scientifique");
  const entries = mocks.rows.map(r => buildAnchorEntry(r as ReturnType<typeof row>)!); const report = buildAnchorReport(entries);
  expect(r.container.textContent).toContain(String(report.byTier.combined.rmse));
});
it.each([1, 2, 3, 4, 5])("declared protocol quality %s, historical ID and free notes do not establish scientific method", quality => {
  const r = row(quality); const before = JSON.stringify(r);
  expect(qualifyCohortReference(r).status).toBe("unknown"); expect(JSON.stringify(r)).toBe(before);
});
it("explicit coherent evidence is documentary only; wrong subject, date or unit remains unknown", () => {
  const q = qualifyCohortReference(row(4, proof)); expect(q.status).toBe("documented_context"); expect(q.nature).toBe("calculated");
  expect(q.individualDoseApproved).toBe(false); expect(q.individualValidityEstablished).toBe(false);
  for (const change of [{ subjectId: "synthetic:B" }, { date: "2026-10-19" }, { unit: "mmol/L" }, { nature: "measured" as const }, { primaryMeasurementSourceRef: null }]) {
    expect(qualifyCohortReference(row(4, { ...proof, ...change })).status).toBe("unknown");
  }
});
// RFC-style quoted cells; preserves comma, quote and newline within a field.
function parseCSV(csv: string): string[][] {
  const rows: string[][] = [[]]; let cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) { rows.at(-1)!.push(cell); cell = ""; }
    else if (ch === "\n" && !quoted) { rows.at(-1)!.push(cell); rows.push([]); cell = ""; }
    else cell += ch;
  }
  rows.at(-1)!.push(cell); return rows;
}
it("CSV v2 retains every historical scalar/group and quotes notes losslessly without claiming measurement", () => {
  const raws = [row(4), row(5, proof), row(2)]; const entries = raws.map(r => buildAnchorEntry(r)!);
  const before = JSON.stringify(entries), qs = new Map(raws.map(r => [r.id, qualifyCohortReference(r)]));
  const csv = entriesToCSV(entries, qs), parsed = parseCSV(csv), headers = parsed[0];
  expect(headers).not.toContain("vlamax_measured_mmolLs"); expect(headers).not.toContain("tier");
  expect(headers).toContain("vlamax_reference_declared_mmolLs");
  parsed.slice(1).forEach((cells, i) => {
    const obj = Object.fromEntries(headers.map((h, j) => [h, cells[j]])); const e = entries[i];
    expect(obj.schema_version).toBe(CAP_COHORT_CSV_VERSION);
    expect(obj.legacy_internal_quality_tier_NOT_scientific_method).toBe(e.tier);
    expect(Number(obj.protocol_quality_declared)).toBe(e.protocolQuality);
    expect(Number(obj.vlamax_reference_declared_mmolLs)).toBe(e.vlamaxRunMeasured);
    expect(Number(obj.predicted_vlamax)).toBe(e.predictedVLamax); expect(Number(obj.delta_vlamax)).toBe(e.deltaVLamax);
    expect(obj.notes).toBe(e.notes); expect(obj.individual_validity_established).toBe("false"); expect(obj.individual_dose_approved).toBe("false");
    expect(obj.scientific_qualification).toBe(i === 1 ? "documented_context" : "unknown");
    expect(obj.observation_date).toBe(i === 1 ? proof.date : "");
  });
  expect(JSON.stringify(entries)).toBe(before);
  if (process.env.C8_V232_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.3.2/evidence/export-v2.csv", csv);
});
it("actual export button uses the versioned CSV contract", async () => {
  mocks.user = { id: "synthetic:coach" }; mocks.rows = [row(4)];
  let exported: Blob | undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation(blob => { exported = blob as Blob; return "blob:synthetic-only"; });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<Cohort />);
  const button = screen.getByRole("button", { name: "Export CSV v2" }); await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button); expect(exported).toBeDefined(); expect(await exported!.text()).toContain(CAP_COHORT_CSV_VERSION);
});
it("historical statistics and numeric groups are unchanged against the immutable pre-correction capture", async () => {
  const captured = JSON.parse(readFileSync("docs/physiology-validation/v2.3.2/evidence/cohort-before.json", "utf8"));
  const entries = captured.rawRows.map((r: ReturnType<typeof row>) => buildAnchorEntry(r, "Synthetic A")!);
  expect(entries).toEqual(captured.entries); expect(buildAnchorReport(entries)).toEqual(captured.report);
  mocks.user = { id: "synthetic:coach" }; mocks.rows = captured.rawRows;
  const r = render(<Cohort />); await waitFor(() => expect(screen.getByRole("button", { name: "Export CSV v2" })).not.toBeDisabled()); fill(r);
  expect(r.container.textContent).not.toContain("ancrages valides"); expect(r.container.textContent).not.toContain("Mesuré (labo)");
  if (process.env.C8_V232_EVIDENCE === "1") {
    writeFileSync("docs/physiology-validation/v2.3.2/evidence/cohort-after.json", JSON.stringify({ entries, report: buildAnchorReport(entries) }, null, 2) + "\n");
    writeFileSync("docs/physiology-validation/v2.3.2/evidence/render-after-cohort.txt", r.container.textContent!);
    writeFileSync("docs/physiology-validation/v2.3.2/evidence/export-v2-baseline.csv", entriesToCSV(entries));
  }
});
it("statistical commentary does not turn agreement or a suggested coefficient adjustment into validation", () => {
  expect(cohortStatisticalNote("RMSE 0.05 ≤ tolérance 0.08 — ancrages valides.")).toContain("validation indépendante non établie");
  expect(cohortStatisticalNote("Réduire ancrages Sprint/Puissance d'environ 4%.")).not.toContain("Réduire ancrages");
});

it("CSV preserves explicitly reported uncertainty as unverified documentary metadata", () => {
  const p = { ...proof, documentedUncertainty: { absoluteBound: 0.03, unit: "mmol/L/s", basis: "Synthetic serialization fixture, not an individual experiment", sourceRef: "fixture:uncertainty-only" } };
  const raw = row(4, p), e = buildAnchorEntry(raw)!; const parsed = parseCSV(entriesToCSV([e], new Map([[e.id, qualifyCohortReference(raw)]])));
  const result = Object.fromEntries(parsed[0].map((h, i) => [h, parsed[1][i]]));
  expect(result.scientific_uncertainty_status).toBe("reported_not_independently_verified");
  expect(JSON.parse(result.reported_scientific_uncertainty_json)).toEqual(p.documentedUncertainty);
  expect(result.primary_measurement_source_ref).toBe(proof.primaryMeasurementSourceRef);
  expect(result.individual_validity_established).toBe("false");
});

it("CSV cannot attach a documentary source from another observation date to an equal scalar", () => {
  const raw = row(4, proof), entry = buildAnchorEntry(raw)!;
  const parsed = parseCSV(entriesToCSV([{ ...entry, date: "2026-10-21" }], new Map([[entry.id, qualifyCohortReference(raw)]])));
  const result = Object.fromEntries(parsed[0].map((h, i) => [h, parsed[1][i]]));
  expect(result.scientific_qualification).toBe("unknown"); expect(result.observation_date).toBe("");
});

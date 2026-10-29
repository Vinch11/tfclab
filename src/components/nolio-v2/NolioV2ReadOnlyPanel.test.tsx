import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DataState, NolioV2ReadOnlyPanel } from "./NolioV2ReadOnlyPanel";
import type { CalendarDTO, LinkDTO, NolioV2Api, ReadResult, StatusDTO } from "@/lib/nolio-v2/types";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const local = "22222222-2222-4222-8222-222222222222";
const link: LinkDTO = { id: "link", athleteId: local, nolioUserId: "usr_DemoA", accessStatus: "verified", lastVerifiedAt: "2026-01-01" };
const complete = <T,>(data: T): ReadResult<T> => ({ data, availability: "complete", issue: null, quota: null, nextCursor: null });
const status: StatusDTO = { mode: "mock", applicationType: "personal", scopes: ["planned:read"], quota: { hourlyLimit: 100, hourlyRemaining: 90, dailyLimit: 1000, dailyRemaining: 900 } };
function mockApi(existing: LinkDTO | null = null) {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in UI tests"); }));
  const call = vi.fn(async (_endpoint: string, body: Record<string, unknown>) => {
    if (body.action === "get") return existing;
    if (body.action === "status") return status;
    if (body.action === "athletes") return complete([
      { id: "usr_DemoA", name: "Même nom", hasApiAccess: true },
      { id: "usr_DemoB", name: "Refus synthétique", hasApiAccess: false },
    ]);
    if (body.action === "associate") return link;
    if (body.action === "unlink") return { removed: true };
    if (body.action === "calendar") return { from: body.from, to: body.to, collections: Object.fromEntries(
      ["training", "competition", "cycle", "note", "message", "quiz"].map(kind => [kind, complete([{ id: kind, kind, name: `Exemple ${kind}`, date: "2026-12-31", endDate: null, sport: null, durationSeconds: null, distanceKm: null, hasStructuredWorkout: false, restricted: false }])])) } as CalendarDTO;
    if (body.action === "sports") return { catalog: complete([]), profiles: complete([]) };
    if (body.action === "zones") return { ...complete([]), availability: "denied", issue: { code: "athlete_api_access_denied", status: 403, retryAfter: null } };
    throw new Error("Unexpected action");
  });
  return { api: { call } as unknown as NolioV2Api, call };
}
describe("Nolio v2 separate consultation panel", () => {
  it("does not infer a link from matching names or allow association without explicit confirmation", async () => {
    const { api, call } = mockApi();
    render(<NolioV2ReadOnlyPanel api={api} athletes={[{ id: local, name: "Même nom" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Vérifier la connexion simulée" }));
    await screen.findByText(/Accès refusé/);
    expect(screen.getByLabelText("Utilisateur Nolio v2")).toHaveValue("");
    const submit = screen.getByRole("button", { name: "Confirmer l’association locale v2" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Utilisateur Nolio v2"), { target: { value: "usr_DemoA" } });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(submit).not.toBeDisabled()); fireEvent.click(submit);
    await screen.findByText(/Association locale/);
    expect(call).toHaveBeenCalledWith("links", { action: "associate", athleteId: local, nolioUserId: "usr_DemoA", confirmed: true });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
  it("renders all six calendar families and exact civil dates without exporting anything", async () => {
    const { api } = mockApi(link);
    render(<NolioV2ReadOnlyPanel api={api} athletes={[{ id: local, name: "Local" }]} />);
    await screen.findByText(/Association locale/);
    fireEvent.change(screen.getByLabelText("Début calendrier v2"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Fin calendrier v2"), { target: { value: "2027-01-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Consulter le calendrier" }));
    await screen.findByText("2026-12-31 → 2027-01-02");
    for (const family of ["Entraînements", "Compétitions", "Cycles", "Notes", "Messages planifiés", "Questionnaires planifiés"])
      expect(screen.getByRole("heading", { name: new RegExp(family) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /envoyer|publier|modifier.*séance/i })).not.toBeInTheDocument();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
  it("displays denied zones separately from available sports", async () => {
    const { api } = mockApi(link);
    render(<NolioV2ReadOnlyPanel api={api} athletes={[{ id: local, name: "Local" }]} />);
    await screen.findByText(/Association locale/);
    fireEvent.click(screen.getByRole("button", { name: "Consulter sports et zones" }));
    await screen.findByText(/Refusées/);
    expect(screen.getByRole("region", { name: "Sports v2" })).toHaveTextContent("Complètes");
    expect(screen.getByRole("region", { name: "Zones v2" })).toHaveTextContent("Aucune correspondance automatique");
  });
  it("local unlink only calls the v2 link endpoint", async () => {
    const { api, call } = mockApi(link);
    render(<NolioV2ReadOnlyPanel api={api} athletes={[{ id: local, name: "Local" }]} />);
    await screen.findByText(/Association locale/);
    fireEvent.click(screen.getByRole("button", { name: "Retirer uniquement le lien local v2" }));
    await waitFor(() => expect(screen.queryByText(/Association locale/)).not.toBeInTheDocument());
    expect(call).toHaveBeenCalledWith("links", { action: "unlink", athleteId: local });
    expect(call.mock.calls.every(([endpoint]) => endpoint === "links")).toBe(true);
  });
  it("reports completeness, partial quota delay, denial and unavailable data distinctly", () => {
    for (const [availability, label] of [["complete", "Complètes"], ["partial", "Partielles"], ["denied", "Refusées"], ["unavailable", "Indisponibles"]] as const) {
      const r = { ...complete([]), availability, issue: availability === "partial" ? { code: "throttled", status: 429, retryAfter: 60 } : null };
      const { unmount } = render(<DataState result={r} />);
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
      if (availability === "partial") expect(screen.getByText(/60 s/)).toBeInTheDocument();
      unmount();
    }
  });
  it("clears the previous athlete calendar when the association is denied", async () => {
    const { api, call } = mockApi(link);
    render(<NolioV2ReadOnlyPanel api={api} athletes={[{ id: local, name: "Local" }]} />);
    await screen.findByText(/Association locale/);
    fireEvent.click(screen.getByRole("button", { name: "Consulter le calendrier" }));
    await screen.findByRole("region", { name: "Calendrier planifié v2" });
    call.mockRejectedValueOnce(new Error("athlete_api_access_denied"));
    fireEvent.click(screen.getByRole("button", { name: "Consulter le calendrier" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("region", { name: "Calendrier planifié v2" })).not.toBeInTheDocument();
  });
});

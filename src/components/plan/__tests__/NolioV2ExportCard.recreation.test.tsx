import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NolioV2ExportCard } from "../NolioV2ExportCard";
import { nolioV2 } from "@/lib/nolio/nolioV2Client";

vi.mock("@/lib/nolio/nolioV2Client", () => ({
  nolioV2: { status: vi.fn(), prepare: vi.fn(), verify: vi.fn(), recreateMissing: vi.fn(), sendBatch: vi.fn() },
  isRefusal: () => false, reasonLabel: (s: string) => s,
}));

it("relit 103 séances, restaure celle affichée et garde la séance refusée dans le bilan", async () => {
  const version = "saved-test-version";
  const counts = { total: 103, expected: 103, operations: 102, rest: 0, refused: 1 };
  const refusal = { sessionKey: "S12-refused", date: "2027-01-28", title: "Séance sans durée", sport: "run", reason: "duration_unknown" };
  const missing = { sessionKey: "S1-J1-1", date: "2026-11-10", title: "Seuil", opKey: "a".repeat(64), remoteId: "ptrn_old" };
  vi.mocked(nolioV2.status).mockResolvedValue({ status: "OK", configured: true, connected: true, reconnectRequired: false,
    athletes: [], nolioUserRef: "usr_test", link: {nolioAthleteRef:"usr_test", nolioAthleteName:"QA", sportIds:{}, sports:[], refsLoadedAt:""} });
  vi.mocked(nolioV2.prepare).mockResolvedValue({ status: "PREPARED", engine: "det", counts, alreadySent: 102,
    problems: [], refused: [refusal], nolioAthleteName: "QA", firstDate: null, lastDate: null });
  const verified = {status:"VERIFIED" as const, counts, totalConfirmed:102, nextIndex:null, checked:102, refused:[refusal], unknown:[]};
  vi.mocked(nolioV2.verify).mockResolvedValueOnce({...verified, present:101, missing:[missing]})
    .mockResolvedValueOnce({...verified, present:102, missing:[]});
  vi.mocked(nolioV2.recreateMissing).mockResolvedValue({status:"DONE", confirmed:1,total:1,createdThisBatch:1,reason:null,failedSession:null});

  render(<NolioV2ExportCard athleteId="qa" planVersionId={version} />);
  fireEvent.click(await screen.findByRole("button", {name:/Vérifier l.export/i}));
  fireEvent.click(await screen.findByRole("button", {name:/Relire le calendrier/i}));
  fireEvent.click(await screen.findByRole("button", {name:/Recréer ces 1/i}));
  await screen.findByText(/102 sur 103/);
  expect(within(screen.getByTestId("nolio-v2-report")).getByText(/Séance sans durée/)).toBeTruthy();
  expect(nolioV2.recreateMissing).toHaveBeenCalledExactlyOnceWith(version, missing.opKey, missing.remoteId);
  expect(nolioV2.sendBatch).not.toHaveBeenCalled();
});

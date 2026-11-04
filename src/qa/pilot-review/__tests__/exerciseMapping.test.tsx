/** Correction des correspondances exercice — catalogue SYNTHÉTIQUE, aucun réseau. */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { mappingRows, searchCatalog, canSaveMappings, finalExerciseIds, reviewKey } from "@/qa/pilot-review/exerciseMapping";
import { ExerciseMappingEditor } from "@/qa/pilot-review/ExerciseMappingEditor";

const LUNGE = "Fente arrière assistée ; créneau";
const RDL = "Charnière hanche soulevé roumain ; créneau";
const CAT = [
  { id: "exf_SYNTHWALK", name: "Walking lunge", type: null },
  { id: "exf_SYNTHREV", name: "Assisted reverse lunge", type: null },
  { id: "exf_SYNTHDL", name: "Weighted deadlift", type: null },
  { id: "exf_SYNTHRDL", name: "Romanian deadlift", type: null },
];

describe("règles de correspondance", () => {
  it("aucune équivalence déduite : une association inchangée reste telle quelle, aucune proposition automatique", () => {
    const r = mappingRows([LUNGE, RDL], { [LUNGE]: "exf_SYNTHWALK" }, { [LUNGE]: "exf_SYNTHWALK" }, CAT);
    expect(r[0]).toMatchObject({ change: "unchanged", needsReview: false, currentName: "Walking lunge" });
    expect(r[1]).toMatchObject({ change: "unmapped", draftId: null }); // pas de « Romanian deadlift » choisi par ressemblance
  });
  it("changement / ajout / retrait exigent une vérification explicite par ligne", () => {
    const r = mappingRows([LUNGE, RDL], { [LUNGE]: "exf_SYNTHWALK", [RDL]: "exf_SYNTHDL" }, { [LUNGE]: "exf_SYNTHREV" }, CAT);
    expect(r.map((x) => x.change)).toEqual(["changed", "removed"]);
    expect(canSaveMappings(r, new Set()).ok).toBe(false);
    expect(canSaveMappings(r, new Set([reviewKey(r[0])])).pending).toEqual([RDL]);
    expect(canSaveMappings(r, new Set(r.map(reviewKey))).ok).toBe(true);
    // une vérification faite pour un AUTRE choix ne compte pas
    expect(canSaveMappings(r, new Set([`${LUNGE}|exf_SYNTHWALK`, reviewKey(r[1])])).ok).toBe(false);
  });
  it("aucun changement ⇒ rien à enregistrer pour les exercices", () => {
    expect(canSaveMappings(mappingRows([LUNGE], { [LUNGE]: "exf_SYNTHREV" }, { [LUNGE]: "exf_SYNTHREV" }, CAT), new Set()).ok).toBe(false);
  });
  it("association actuelle absente du catalogue relu ⇒ signalée à corriger", () => {
    expect(mappingRows([LUNGE], { [LUNGE]: "exf_GONE" }, { [LUNGE]: "exf_GONE" }, CAT)[0]).toMatchObject({ staleCurrent: true, currentName: null });
  });
  it("recherche = simple filtre du catalogue officiel", () => {
    expect(searchCatalog(CAT, "lunge").map((x) => x.id)).toEqual(["exf_SYNTHWALK", "exf_SYNTHREV"]);
    expect(searchCatalog(CAT, "ROMAN").map((x) => x.id)).toEqual(["exf_SYNTHRDL"]);
  });
  it("retrait = clé absente ; correspondances hors plan conservées", () => {
    expect(finalExerciseIds({ [LUNGE]: "exf_SYNTHWALK", other: "exf_SYNTHDL" }, {}, [LUNGE])).toEqual({ other: "exf_SYNTHDL" });
  });
});

function Harness({ onSave }: { onSave: (d: Record<string, string>, ok: boolean) => void }) {
  const current = { [LUNGE]: "exf_SYNTHWALK" };
  const [draft, setDraft] = useState<Record<string, string>>({ ...current });
  const [rev, setRev] = useState<Set<string>>(new Set());
  return <>
    <ExerciseMappingEditor labels={[LUNGE]} current={current} draft={draft} catalog={CAT} onDraft={setDraft} reviewed={rev} onReviewed={setRev} disabled={false} />
    <button onClick={() => onSave(draft, canSaveMappings(mappingRows([LUNGE], current, draft, CAT), rev).ok)}>save</button>
  </>;
}
describe("éditeur", () => {
  it("source, actuel et choisi visibles ; changement exige la case de vérification", () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    expect(screen.getByText(/Fente arrière assistée ; créneau/)).toBeTruthy();
    expect(screen.getByText(/Association actuelle : Walking lunge/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Rechercher un exercice officiel/), { target: { value: "reverse" } });
    fireEvent.change(screen.getByLabelText(/^Exercice Nolio pour/), { target: { value: "exf_SYNTHREV" } });
    expect(screen.getByText(/choisie : Assisted reverse lunge · changement/)).toBeTruthy();
    fireEvent.click(screen.getByText("save")); expect(onSave).toHaveBeenLastCalledWith({ [LUNGE]: "exf_SYNTHREV" }, false);
    fireEvent.click(screen.getByLabelText(/Vérification requise/));
    fireEvent.click(screen.getByText("save")); expect(onSave).toHaveBeenLastCalledWith({ [LUNGE]: "exf_SYNTHREV" }, true);
  });
});

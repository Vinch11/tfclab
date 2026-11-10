/**
 * Panneau d'approbation coach des séances avancées.
 *
 * Le panneau ne décide de rien : il affiche la liste fermée, le texte réel des
 * fiches et le verdict du garde-fou pour le profil. Ces tests vérifient ce que
 * le coach LIT avant de cocher, et ce que la page reçoit quand il coche.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AdvancedSessionApprovalPanel } from "../plan/AdvancedSessionApprovalPanel";
import type { AdvancedSessionProfileSignal } from "@/lib/plan/advancedSessionApproval";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

/** Navette sévère course : fiche approuvable prise comme exemple. */
const CLEARANCE = "ENR_RUN_LACTATE_CLEARANCE";
/** Sélection automatique bloquée : jamais proposées à l'approbation. */
const BLOCKED = ["TPL_SWIM_HYPOXIE", "A_HEAT_ACCLIM_RUN", "C_HEAT_ACCLIM_BIKE_INDOOR", "B_RUN_LACTATE_SHUTTLE"];
const TRAINED_MANUAL: AdvancedSessionProfileSignal = {
  trainingLevel: "trained",
  trainingLevelSource: "manual",
  weeklyHours: 6,
};

function renderPanel(overrides: Partial<Parameters<typeof AdvancedSessionApprovalPanel>[0]> = {}) {
  const onChange = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <AdvancedSessionApprovalPanel
      approvedIds={[]}
      onChange={onChange}
      profile={TRAINED_MANUAL}
      open
      onOpenChange={onOpenChange}
      {...overrides}
    />,
  );
  return { onChange, onOpenChange };
}

/** Carte d'une fiche : le conteneur qui porte la case, le texte et le blocage. */
function cardFor(id: string): HTMLElement {
  const checkbox = document.getElementById(`advanced-approval-${id}`);
  expect(checkbox, id).not.toBeNull();
  return checkbox!.parentElement as HTMLElement;
}

describe("AdvancedSessionApprovalPanel", () => {
  it("fermé : n'affiche que l'en-tête et le compteur, aucune case", () => {
    renderPanel({ open: false, approvedIds: [CLEARANCE] });
    expect(screen.getByRole("button", { name: "Séances avancées — approbation coach" })).toBeInTheDocument();
    expect(screen.getByText("1 approuvée")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("ouvert : liste les 30 fiches approuvables, jamais une fiche à sélection bloquée", () => {
    renderPanel();
    expect(screen.getAllByRole("checkbox")).toHaveLength(30);
    expect(screen.getByText("Aucune approuvée")).toBeInTheDocument();
    for (const blocked of BLOCKED) {
      expect(document.getElementById(`advanced-approval-${blocked}`), blocked).toBeNull();
      expect(screen.queryByText(blocked)).toBeNull();
    }
    expect(screen.getByText(/ne sont pas approuvables ici/)).toBeInTheDocument();
  });

  it("montre au coach le texte réel de la fiche (quand / à éviter), pas un résumé", () => {
    renderPanel();
    const workout = WorkoutLibrary.find(entry => entry.id === CLEARANCE);
    expect(workout).toBeDefined();
    const card = cardFor(CLEARANCE);
    expect(within(card).getByText(workout!.objectif)).toBeInTheDocument();
    expect(card).toHaveTextContent(`Quand : ${workout!.when}`);
    expect(card).toHaveTextContent(`À éviter : ${workout!.avoid}`);
    expect(card).toHaveTextContent(CLEARANCE);
  });

  it("affiche les minimums que l'approbation ne lève pas (double seuil norvégien)", () => {
    renderPanel();
    const card = cardFor("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY");
    expect(card).toHaveTextContent("niveau minimal « Très chargé »");
    expect(card).toHaveTextContent("au moins 8 h/sem");
    // Profil « Bien entraîné » : cocher n'aurait aucun effet, et c'est dit.
    expect(card).toHaveTextContent("la fiche exige un niveau « Très chargé » ou plus");
  });

  it("volume insuffisant : le blocage cite les heures exigées par la fiche", () => {
    renderPanel({ profile: { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 6 } });
    expect(cardFor("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY")).toHaveTextContent("la fiche exige au moins 8 h/sem");
  });

  it("cocher une fiche remonte la liste triée ; décocher la retire", () => {
    const { onChange } = renderPanel({ approvedIds: ["V2_RUN_SPRINT_PLAT"] });
    fireEvent.click(document.getElementById(`advanced-approval-${CLEARANCE}`)!);
    expect(onChange).toHaveBeenLastCalledWith([CLEARANCE, "V2_RUN_SPRINT_PLAT"]);
    fireEvent.click(document.getElementById("advanced-approval-V2_RUN_SPRINT_PLAT")!);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("« Tout décocher » est absent tant qu'aucune fiche n'est approuvée", () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: "Tout décocher" })).toBeNull();
  });

  it("« Tout décocher » vide la liste", () => {
    const { onChange } = renderPanel({ approvedIds: [CLEARANCE, "V2_RUN_SPRINT_PLAT"] });
    expect(screen.getByText("2 approuvées")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tout décocher" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("profil vérifié, très chargé, 10 h/sem : aucun avertissement, aucune fiche annoncée sans effet", () => {
    renderPanel({ profile: { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 10 } });
    expect(screen.queryByTestId("advanced-approval-profile-unverified")).toBeNull();
    expect(screen.queryByTestId("advanced-approval-profile-caution")).toBeNull();
    expect(screen.queryByTestId("advanced-approval-profile-pending")).toBeNull();
    expect(screen.queryByText(/Sans effet pour ce profil/)).toBeNull();
  });

  it("niveau non vérifié (« Auto » sans TSS) : alerte unique « aucun effet »", () => {
    renderPanel({ profile: { trainingLevel: "trained", trainingLevelSource: "fallback-prudent", weeklyHours: 6 } });
    const alert = screen.getByTestId("advanced-approval-profile-unverified");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent(/aucun effet/);
    // L'explication est donnée une fois en tête, pas répétée sur 26 cartes.
    expect(screen.queryByText(/Sans effet pour ce profil/)).toBeNull();
  });

  it("profil non résolu : le dit, sans annoncer ni effet ni blocage", () => {
    renderPanel({ profile: null });
    expect(screen.getByTestId("advanced-approval-profile-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("advanced-approval-profile-unverified")).toBeNull();
    expect(screen.queryByText(/Sans effet pour ce profil/)).toBeNull();
  });

  it("débutant vérifié : mise en garde + blocages nominatifs issus du garde-fou", () => {
    renderPanel({ profile: { trainingLevel: "light", trainingLevelSource: "manual", weeklyHours: 5 } });
    expect(screen.getByTestId("advanced-approval-profile-caution")).toHaveTextContent(/Un peu entraîné/);

    // Niveau minimal audité non atteint.
    expect(within(cardFor("V3_BIKE_VO2_TABATA")).getByText(/la fiche exige un niveau « Bien entraîné » ou plus/))
      .toBeInTheDocument();
    expect(within(cardFor("B_SWIM_SPRINT_25S")).getByText(/la fiche exige un niveau « Bien entraîné » ou plus/))
      .toBeInTheDocument();
    expect(cardFor("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY")).toHaveTextContent("la fiche exige un niveau « Très chargé » ou plus");
    // Fiches de l'axe historique : fermées à un débutant même approuvées.
    for (const id of ["KENYAN_WEEK_STRUCTURE_MARATHON", "NORWEGIAN_WEEK_STRUCTURE_RUN"]) {
      expect(within(cardFor(id)).getByText(/fiche fermée à un niveau débutant, même approuvée/)).toBeInTheDocument();
    }
    // Les autres fiches ne sont pas annoncées sans effet.
    expect(within(cardFor(CLEARANCE)).queryByText(/Sans effet pour ce profil/)).toBeNull();
    expect(screen.getAllByText(/Sans effet pour ce profil/)).toHaveLength(5);
  });

  it("clic sur l'en-tête : demande l'ouverture à la page (composant contrôlé)", () => {
    const { onOpenChange } = renderPanel({ open: false });
    fireEvent.click(screen.getByRole("button", { name: "Séances avancées — approbation coach" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

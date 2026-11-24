import { describe, expect, it } from "vitest";
import { fillEmpty, labValuesToForm } from "@/lib/snapshotFill";

describe("remplir la fiche depuis un bilan", () => {
  it("ne remplace jamais une case remplie et garde la provenance avec sa valeur", () => {
    const { form, filled } = fillEmpty(
      { ftp: "", ftp_origin: "", vma: "15", pace_threshold: "" },
      { ftp: "250", ftp_origin: "cp_test", vma: "16", pace_threshold: "5:05", pace_threshold_origin: "track_day_cs" },
    );
    expect(form.ftp).toBe("250");
    expect(form.ftp_origin).toBe("cp_test");
    expect(form.vma).toBe("15");
    expect((form as Record<string, unknown>).pace_threshold_origin).toBe("track_day_cs");
    expect(filled).toEqual(["ftp", "pace_threshold"]);
  });
  it("une provenance seule ne remplit rien si la valeur était déjà saisie", () => {
    const { form } = fillEmpty({ ftp: "240", ftp_origin: "" }, { ftp: "250", ftp_origin: "cp_test" });
    expect(form.ftp_origin).toBe("");
  });
  it("repères critiques : seuls les sports absents sont ajoutés", () => {
    const mine = JSON.stringify({ cycling: { critical: 250 } });
    const theirs = { cycling: { critical: 999 }, running: { critical: 3.9 } };
    const { form, filled } = fillEmpty({ critical_metrics: mine }, { critical_metrics: theirs });
    const out = JSON.parse(String(form.critical_metrics));
    expect(out.cycling.critical).toBe(250);
    expect(out.running.critical).toBe(3.9);
    expect(filled).toContain("critical_metrics");
  });
});

describe("rapport labo", () => {
  it("la VO₂max du labo est marquée « labo » ; les valeurs absentes sont ignorées", () => {
    expect(labValuesToForm({ vo2max: 58.2, vlamax: 0.42, fat_pct: 12, ftp: null })).toEqual({ vo2max: "58.2", vlamax: "0.42", fat_pct: "12", vo2max_origin: "lab" });
  });
});

import { describe, it, expect } from "vitest";
import {
  collapseDuplicateValueAnnotations,
  resolveWideDurationRanges,
  postProcessSessionText,
} from "@/engines/plan/sessionTextPostProcessor";

describe("collapseDuplicateValueAnnotations", () => {
  it("collapse '74% FTP (74% FTP)' → '74% FTP'", () => {
    const r = collapseDuplicateValueAnnotations("120' @ 74% FTP (74% FTP)");
    expect(r.text).toBe("120' @ 74% FTP");
    expect(r.collapsed).toBe(1);
  });

  it("collapse '2x20' à 92% FTP (92% FTP)'", () => {
    const r = collapseDuplicateValueAnnotations("2x20' à 92% FTP (92% FTP) r=5'");
    expect(r.text).toContain("92% FTP r=5'");
    expect(r.collapsed).toBe(1);
  });

  it("collapse '252W (252W)'", () => {
    const r = collapseDuplicateValueAnnotations("Bloc à 252W (252W)");
    expect(r.text).toBe("Bloc à 252W");
  });

  it("tolérant aux espaces : '74%FTP (74 % FTP)'", () => {
    const r = collapseDuplicateValueAnnotations("74%FTP (74 % FTP)");
    expect(r.collapsed).toBe(1);
  });

  it("garde intact quand valeurs divergent + log mismatch", () => {
    const r = collapseDuplicateValueAnnotations("74% FTP (80% FTP)");
    expect(r.text).toBe("74% FTP (80% FTP)");
    expect(r.collapsed).toBe(0);
    expect(r.mismatched).toBe(1);
  });
});

describe("resolveWideDurationRanges", () => {
  it("résout '2h30-4h30' (Δ=120min) → durée unique base", () => {
    const r = resolveWideDurationRanges("2h30-4h30 Z2 stable", { phase: "base" });
    expect(r.text).not.toMatch(/2h30-4h30/);
    expect(r.resolved).toBe(1);
  });

  it("plage étroite '40-50'' passe inchangée (Δ=10min)", () => {
    const r = resolveWideDurationRanges("40'-50' allure Z3", { phase: "base" });
    expect(r.text).toBe("40'-50' allure Z3");
    expect(r.resolved).toBe(0);
  });

  it("phase peak biaise vers le haut", () => {
    const rBase = resolveWideDurationRanges("1h-4h Z2", { phase: "base" });
    const rPeak = resolveWideDurationRanges("1h-4h Z2", { phase: "peak" });
    // extraire les minutes résolues
    const parse = (t: string) => {
      const m = t.match(/(\d+)h(?:(\d{0,2}))?/);
      if (!m) return null;
      return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
    };
    expect(parse(rPeak.text)!).toBeGreaterThan(parse(rBase.text)!);
  });
});

describe("postProcessSessionText", () => {
  it("dedup + resolve range en un passage", () => {
    const s = {
      title: "SL vélo 2h30-4h30 @ 74% FTP (74% FTP)",
      details: "",
      phase: "base",
    };
    const stats = postProcessSessionText(s);
    expect(s.title).not.toContain("(74% FTP)");
    expect(s.title).not.toMatch(/2h30-4h30/);
    expect(stats.duplicatesCollapsed).toBe(1);
    expect(stats.durationRangesResolved).toBe(1);
  });
});

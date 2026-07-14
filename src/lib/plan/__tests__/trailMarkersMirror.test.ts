// @ts-nocheck
import { describe, it, expect } from "vitest";
import * as clientMirror from "@/lib/plan/trailMarkers";
import fs from "node:fs";
import path from "node:path";

// PHASE 2A.2 — garantit que le mirror edge reste strictement identique au client.
describe("trailMarkers — client ↔ edge mirror equality", () => {
  const edgePath = path.resolve(
    process.cwd(),
    "supabase/functions/ai-training-plan/trailMarkers.ts",
  );
  const edgeSrc = fs.readFileSync(edgePath, "utf-8");

  it("edge duplique bien les DEUX patterns exportés (source + flags)", () => {
    // Extrait littéralement chaque regex depuis le source edge (parse simple).
    const critMatch = edgeSrc.match(/TRAIL_DETAILS_CRITICAL_RX\s*=\s*(\/.+\/[a-z]*);/s);
    const warnMatch = edgeSrc.match(/TRAIL_DETAILS_WARNING_RX\s*=\s*(\/.+\/[a-z]*);/);
    expect(critMatch, "edge critical rx introuvable").toBeTruthy();
    expect(warnMatch, "edge warning rx introuvable").toBeTruthy();
    expect(critMatch![1]).toBe(clientMirror.TRAIL_DETAILS_CRITICAL_RX.toString());
    expect(warnMatch![1]).toBe(clientMirror.TRAIL_DETAILS_WARNING_RX.toString());
  });

  it("400m facile + 200m éducatifs (nat) — NE MATCHE PAS", () => {
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("400m facile + 200m éducatifs r=15s")).toBe(false);
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("4x400m à CSS (90s/100m) r=30s")).toBe(false);
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("6x200m allure 10K")).toBe(false);
  });

  it("D+ chiffré — matche dans les deux ordres", () => {
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("800m de D+")).toBe(true);
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("800m D+")).toBe(true);
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("D+ 1200m")).toBe(true);
    expect(clientMirror.TRAIL_DETAILS_CRITICAL_RX.test("D+1200")).toBe(true);
  });
});

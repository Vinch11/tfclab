// @ts-nocheck
/**
 * Verrouille l'égalité stricte du mirror des zones client ↔ edge.
 * Toute divergence de plage (%FCmax/%VMA/%FTP/%CPRun) fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import { TRAINING_ZONES_MIRROR as CLIENT } from "@/lib/plan/trainingZonesMirror";
import fs from "node:fs";
import path from "node:path";

describe("training zones mirror — client ↔ edge equality", () => {
  it("edge TRAINING_ZONES_MIRROR is byte-equal to client after JSON canonicalization", async () => {
    const edgePath = path.resolve(process.cwd(), "supabase/functions/_shared/trainingZonesDefinition.ts");
    const edgeSrc = fs.readFileSync(edgePath, "utf-8");
    // extract JSON-like object literal for each row: match id + numeric bounds.
    // simpler: eval-import via dynamic module is out-of-scope for vitest; parse rows via regex
    const rowRx = /\{\s*id:\s*"(Z\w+)",\s*label:\s*"([^"]+)",\s*fcMax:\s*(\{[^}]+\}|null),\s*vma:\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\},\s*ftp:\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\},\s*cpRun:\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\}\s*\}/g;
    const edgeRows: any[] = [];
    let m: RegExpExecArray | null;
    while ((m = rowRx.exec(edgeSrc)) !== null) {
      let fcMax: any = null;
      if (m[3] !== "null") {
        const fm = m[3].match(/min:\s*(\d+),\s*max:\s*(\d+)/);
        if (fm) fcMax = { min: Number(fm[1]), max: Number(fm[2]) };
      }
      edgeRows.push({
        id: m[1], label: m[2], fcMax,
        vma: { min: +m[4], max: +m[5] },
        ftp: { min: +m[6], max: +m[7] },
        cpRun: { min: +m[8], max: +m[9] },
      });
    }
    expect(edgeRows.length).toBe(CLIENT.length);
    expect(edgeRows).toEqual(CLIENT);
  });
});

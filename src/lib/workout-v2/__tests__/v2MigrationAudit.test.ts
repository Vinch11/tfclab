import {describe,it,expect} from "vitest";
import {auditV2Migration} from "../../../../experimental/workout-v2/v2MigrationAudit";

describe("V2 migration: enumerate V1 before extending the model family",()=>{
  it("reports whole legacy library and fails closed on undocumented physiology",()=>{
    const audit=auditV2Migration();
    expect(audit.v1Total).toBeGreaterThan(audit.v2ModelCount);
    expect(audit.v1DocumentedIntent+audit.v1MissingIntent).toBe(audit.v1Total);
    expect(audit.bySport.reduce((n,s)=>n+s.total,0)).toBe(audit.v1Total);
    expect(audit.v2BySport.reduce((n,s)=>n+s.count,0)).toBe(audit.v2ModelCount);
    expect(audit.autoMigrated).toBe(0);
    expect(audit.approved).toBe(0);
    console.log("V2_MIGRATION_INVENTORY="+JSON.stringify(audit));
  });
});

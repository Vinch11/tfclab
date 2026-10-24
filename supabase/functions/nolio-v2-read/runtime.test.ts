import assert from "node:assert/strict";
import {
  localSupabaseUrl,
  runtimeHandler,
} from "../_shared/nolio-v2/runtime.ts";
Deno.test({
  name:
    "runtime refuses production/remote Supabase before reading secrets or contacting DB/auth",
  permissions: { net: false, env: false },
  async fn() {
    for (
      const url of [
        "https://production.supabase.co",
        "http://127.0.0.1.attacker.test",
        "http://user:password@localhost:54321",
      ]
    ) {
      const reads: string[] = [];
      const values: Record<string, string> = {
        NOLIO_V2_ENABLED: "true",
        NOLIO_V2_ENV: "development",
        NOLIO_V2_MODE: "mock",
        NOLIO_V2_OWNER_USER_ID: "local-owner",
        NOLIO_V2_EXPECTED_NOLIO_USER_ID: "usr_Owner",
        SUPABASE_URL: url,
      };
      const response = await runtimeHandler("read", (name) => {
        reads.push(name);
        return values[name];
      })(
        new Request("http://localhost", {
          method: "POST",
          body: '{"action":"status"}',
        }),
      );
      assert.equal(response.status, 503);
      assert(!reads.includes("SUPABASE_SERVICE_ROLE_KEY"));
      assert(!reads.includes("NOLIO_V2_PAT"));
      assert(!(await response.text()).includes(url));
    }
    assert.equal(
      localSupabaseUrl("http://127.0.0.1:54321"),
      "http://127.0.0.1:54321",
    );
  },
});

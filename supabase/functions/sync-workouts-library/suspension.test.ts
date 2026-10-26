import { assertEquals } from "jsr:@std/assert@1";
import { handleSyncRequest } from "./index.ts";

Deno.test("sync suspension refuses writes before reading the body, environment or database", async () => {
  for (const method of ["POST", "GET", "DELETE"]) {
    const req = new Request("https://offline.invalid", { method, ...(method === "POST" ? { body: "invalid JSON" } : {}) });
    const response = handleSyncRequest(req);
    assertEquals(response.status, 503);
    assertEquals((await response.json()).code, "WORKOUT_SYNC_SUSPENDED");
    assertEquals(req.bodyUsed, false);
  }
});
Deno.test("sync suspension retains CORS preflight without opening the write path", () => {
  const response = handleSyncRequest(new Request("https://offline.invalid", { method: "OPTIONS" }));
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

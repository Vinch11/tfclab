import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { appOrigin, b64urlDecode, b64urlEncode, randomString } from "./index.ts";

// ─── randomString ────────────────────────────────────────────────────────────

Deno.test("randomString — longueur par défaut 24 (hex de 16 bytes → 32 chars)", () => {
  // len=24 (bytes) → 24 paires hex → 48 caractères
  assertEquals(randomString().length, 48);
  assertEquals(randomString(16).length, 32);
});

Deno.test("randomString — alphabet hexadécimal uniquement, deux tirages différents", () => {
  const a = randomString(16);
  const b = randomString(16);
  assertMatch(a, /^[0-9a-f]+$/);
  assertEquals(a === b, false);
});

// ─── b64urlEncode / b64urlDecode ────────────────────────────────────────────

Deno.test("b64urlEncode/Decode — roundtrip texte simple", () => {
  const original = JSON.stringify({ u: "user-123", r: "abcd", o: "https://tfclab.lovable.app" });
  const encoded = b64urlEncode(original);
  assertEquals(b64urlDecode(encoded), original);
});

Deno.test("b64urlEncode — alphabet URL-safe (pas de +, /, = en sortie)", () => {
  // Texte choisi pour produire des caractères + et / en base64 standard
  const encoded = b64urlEncode("??>>subaru??>>");
  assertEquals(encoded.includes("+"), false);
  assertEquals(encoded.includes("/"), false);
  assertEquals(encoded.includes("="), false);
});

Deno.test("b64urlDecode — gère un padding manquant de 1, 2 ou 3 '='", () => {
  // "a" → base64 "YQ==" (2 '='), "ab" → "YWI=" (1 '='), "abc" → "YWJj" (0 '=')
  assertEquals(b64urlDecode(b64urlEncode("a")), "a");
  assertEquals(b64urlDecode(b64urlEncode("ab")), "ab");
  assertEquals(b64urlDecode(b64urlEncode("abc")), "abc");
});

// ─── appOrigin ───────────────────────────────────────────────────────────────

Deno.test("appOrigin — lit l'origin depuis le header Origin", () => {
  const req = new Request("https://example.com", { headers: { origin: "https://tfclab.lovable.app/foo" } });
  assertEquals(appOrigin(req), "https://tfclab.lovable.app");
});

Deno.test("appOrigin — fallback sur Referer si Origin absent", () => {
  const req = new Request("https://example.com", { headers: { referer: "https://tfclab.lovable.app/configuration?x=1" } });
  assertEquals(appOrigin(req), "https://tfclab.lovable.app");
});

Deno.test("appOrigin — ni Origin ni Referer → défaut tfclab.lovable.app", () => {
  const req = new Request("https://example.com");
  assertEquals(appOrigin(req), "https://tfclab.lovable.app");
});

Deno.test("appOrigin — header présent mais invalide comme URL → défaut", () => {
  const req = new Request("https://example.com", { headers: { origin: "not a url" } });
  assertEquals(appOrigin(req), "https://tfclab.lovable.app");
});

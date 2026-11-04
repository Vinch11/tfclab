import { describe, expect, it } from "vitest";
import { validateNolioAuthorizeUrl as v } from "../nolioAuthorizeUrl";

describe("validateNolioAuthorizeUrl", () => {
  it("accepte l'origine et le chemin exacts", () => {
    expect(v("https://www.nolio.io/api/authorize/?client_id=x&state=s")).toBe("https://www.nolio.io/api/authorize/?client_id=x&state=s");
  });
  it.each([
    "http://www.nolio.io/api/authorize/?a=1",
    "https://nolio.io/api/authorize/",
    "https://www.nolio.io.evil.com/api/authorize/",
    "https://user:pw@www.nolio.io/api/authorize/",
    "https://www.nolio.io:8443/api/authorize/",
    "https://www.nolio.io/api/authorize",
    "https://www.nolio.io/api/authorize/../token/",
    "https://www.nolio.io/api/token/",
    "javascript:alert(1)",
    "https://WWW.nolio.io/api/authorize/?a=1", // non canonique : refusé, jamais réécrit
    "https://www.nolio.io/api/x/../authorize/?a=1",
    "",
  ])("refuse %s", (u) => {
    // "/api/authorize/../token/" est normalisé par URL en /api/token/ → refusé
    expect(v(u)).toBeNull();
  });
  it("refuse les non-chaînes", () => { expect(v(undefined)).toBeNull(); expect(v(42)).toBeNull(); });
});

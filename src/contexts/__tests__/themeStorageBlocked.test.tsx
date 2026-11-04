import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/contexts/ThemeContext";

describe("ThemeProvider — stockage bloqué", () => {
  it("rend les enfants avec le thème par défaut quand getItem/setItem jettent", () => {
    const g = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    const s = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    render(<ThemeProvider><p>contenu</p></ThemeProvider>);
    expect(screen.getByText("contenu")).toBeTruthy();
    expect(document.documentElement.classList.contains("bevel")).toBe(true);
    g.mockRestore(); s.mockRestore();
  });
});

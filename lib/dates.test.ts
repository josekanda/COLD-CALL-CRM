import { describe, it, expect } from "vitest";
import { addDaysIso } from "./dates";

describe("addDaysIso", () => {
  it("ajoute 30 jours", () => {
    expect(addDaysIso("2026-06-10", 30)).toBe("2026-07-10");
  });
  it("gère le passage d'année", () => {
    expect(addDaysIso("2026-12-15", 30)).toBe("2027-01-14");
  });
});

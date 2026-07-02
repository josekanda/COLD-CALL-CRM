import { describe, it, expect } from "vitest";
import {
  isServerLocal,
  isLocalHostHeader,
  isLocalOrigin,
  isBrowserLocal,
} from "./runtime-env";

describe("isServerLocal", () => {
  it("local sans VERCEL", () => {
    expect(isServerLocal({})).toBe(true);
  });
  it("distant si VERCEL est posé", () => {
    expect(isServerLocal({ VERCEL: "1" })).toBe(false);
  });
});

describe("isLocalHostHeader", () => {
  it("accepte localhost avec port", () => {
    expect(isLocalHostHeader("localhost:3000")).toBe(true);
    expect(isLocalHostHeader("127.0.0.1:3000")).toBe(true);
    expect(isLocalHostHeader("LOCALHOST")).toBe(true);
  });
  it("refuse un host distant ou vide", () => {
    expect(isLocalHostHeader("aura.vercel.app")).toBe(false);
    expect(isLocalHostHeader(null)).toBe(false);
    expect(isLocalHostHeader("")).toBe(false);
  });
});

describe("isLocalOrigin", () => {
  it("accepte une origine http(s) locale", () => {
    expect(isLocalOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalOrigin("https://127.0.0.1:3000")).toBe(true);
  });
  it("refuse une origine distante ou non http", () => {
    expect(isLocalOrigin("https://evil.example.com")).toBe(false);
    expect(isLocalOrigin("file:///etc/passwd")).toBe(false);
    expect(isLocalOrigin("pas une url")).toBe(false);
  });
});

describe("isBrowserLocal", () => {
  it("vrai sur localhost / 127.0.0.1", () => {
    expect(isBrowserLocal("localhost")).toBe(true);
    expect(isBrowserLocal("127.0.0.1")).toBe(true);
  });
  it("faux sur un domaine distant ou undefined", () => {
    expect(isBrowserLocal("aura.vercel.app")).toBe(false);
    expect(isBrowserLocal(undefined)).toBe(false);
  });
});

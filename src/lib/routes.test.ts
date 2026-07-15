import { describe, expect, it } from "vitest";
import { AUTH_PATHS, isAuthPath, isProtectedPath, NAV_ITEMS } from "@/lib/routes";

describe("NAV_ITEMS", () => {
  it("містить чотири розділи платформи", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      "/dashboard",
      "/transactions",
      "/assistant",
      "/settings",
    ]);
  });
});

describe("isProtectedPath", () => {
  it("захищає внутрішні сторінки", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/transactions")).toBe(true);
    expect(isProtectedPath("/assistant")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
  });

  it("захищає вкладені шляхи", () => {
    expect(isProtectedPath("/settings/monobank")).toBe(true);
  });

  it("не захищає публічні сторінки", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/register")).toBe(false);
  });

  it("не плутає префікси з підрядками", () => {
    expect(isProtectedPath("/settingsfake")).toBe(false);
  });
});

describe("isAuthPath", () => {
  it("розпізнає сторінки входу", () => {
    expect(AUTH_PATHS).toEqual(["/login", "/register"]);
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/register")).toBe(true);
    expect(isAuthPath("/dashboard")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryForMcc, colorForCategory } from "@/lib/categories";

describe("categoryForMcc", () => {
  it("відомі MCC-коди", () => {
    expect(categoryForMcc(5411)).toBe("Продукти");
    expect(categoryForMcc(5814)).toBe("Кафе і ресторани");
    expect(categoryForMcc(4121)).toBe("Транспорт");
    expect(categoryForMcc(5912)).toBe("Здоровʼя");
    expect(categoryForMcc(7832)).toBe("Розваги");
    expect(categoryForMcc(4814)).toBe("Комуналка і звʼязок");
    expect(categoryForMcc(5651)).toBe("Шопінг");
    expect(categoryForMcc(4829)).toBe("Перекази");
  });
  it("діапазони подорожей", () => {
    expect(categoryForMcc(3245)).toBe("Подорожі");
    expect(categoryForMcc(3550)).toBe("Подорожі");
    expect(categoryForMcc(7011)).toBe("Подорожі");
  });
  it("невідомий або відсутній MCC → Інше", () => {
    expect(categoryForMcc(9999)).toBe("Інше");
    expect(categoryForMcc(null)).toBe("Інше");
    expect(categoryForMcc(undefined)).toBe("Інше");
  });
});

describe("colorForCategory", () => {
  it("кожна категорія має hex-колір", () => {
    for (const c of CATEGORIES) {
      expect(colorForCategory(c)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it("невідома категорія отримує колір «Інше»", () => {
    expect(colorForCategory("Щось дивне")).toBe(colorForCategory("Інше"));
  });
});

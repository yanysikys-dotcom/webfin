import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "@/lib/format";

describe("formatMoney", () => {
  it("форматує копійки у гривні з розділювачем тисяч", () => {
    expect(formatMoney(123456)).toBe("1 234,56 ₴");
    expect(formatMoney(0)).toBe("0,00 ₴");
  });
  it("відʼємні суми — зі знаком мінус", () => {
    expect(formatMoney(-2500)).toBe("−25,00 ₴");
  });
});

describe("formatDate", () => {
  it("форматує дату українською", () => {
    expect(formatDate("2026-07-15")).toBe("15 липня 2026");
    expect(formatDate("2026-01-02T10:00:00Z")).toBe("2 січня 2026");
  });
});

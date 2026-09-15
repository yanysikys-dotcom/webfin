import { describe, expect, it } from "vitest";
import { capitalize, formatDate, formatMoney, plural } from "@/lib/format";

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

describe("plural", () => {
  it("правильна форма для одиниць", () => {
    expect(plural(1, "покупка", "покупки", "покупок")).toBe("покупка");
    expect(plural(21, "покупка", "покупки", "покупок")).toBe("покупка");
    expect(plural(101, "покупка", "покупки", "покупок")).toBe("покупка");
  });
  it("правильна форма для 2–4", () => {
    expect(plural(2, "покупка", "покупки", "покупок")).toBe("покупки");
    expect(plural(23, "покупка", "покупки", "покупок")).toBe("покупки");
  });
  it("правильна форма для 5+ і підступних 11–14", () => {
    expect(plural(5, "покупка", "покупки", "покупок")).toBe("покупок");
    expect(plural(11, "покупка", "покупки", "покупок")).toBe("покупок");
    expect(plural(12, "покупка", "покупки", "покупок")).toBe("покупок");
    expect(plural(14, "покупка", "покупки", "покупок")).toBe("покупок");
    expect(plural(0, "покупка", "покупки", "покупок")).toBe("покупок");
  });
});

describe("capitalize", () => {
  it("робить першу літеру великою", () => {
    expect(capitalize("цього місяця ви витратили")).toBe("Цього місяця ви витратили");
  });
  it("порожній рядок не ламає", () => {
    expect(capitalize("")).toBe("");
  });
});

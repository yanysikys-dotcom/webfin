import { describe, expect, it } from "vitest";
import type { Tx } from "@/lib/analytics";
import { buildAnswer, SUGGESTIONS } from "@/lib/assistant/answer";
import type { Period } from "@/lib/assistant/period";

const period: Period = {
  from: new Date("2026-09-01T00:00:00"),
  to: new Date("2026-09-15T23:59:59"),
  label: "цього місяця",
};

const T = (date: string, amount: number, category = "Продукти", description = "Сільпо"): Tx => ({
  occurred_at: date,
  amount,
  category,
  description,
});

const txs: Tx[] = [
  T("2026-09-02T10:00:00Z", -50000, "Продукти", "Сільпо"),
  T("2026-09-05T10:00:00Z", -30000, "Продукти", "АТБ"),
  T("2026-09-07T10:00:00Z", -20000, "Транспорт", "Uklon"),
  T("2026-09-09T10:00:00Z", -120000, "Подорожі", "Booking.com"),
  T("2026-09-10T10:00:00Z", 4500000, "Надходження", "Зарплата"),
];

describe("buildAnswer — total", () => {
  it("називає суму і період", () => {
    const a = buildAnswer({ kind: "total" }, period, txs);
    expect(a.text).toContain("2 200,00 ₴");
    // Речення починається з великої літери, назва періоду — на початку.
    expect(a.text.startsWith("Цього місяця")).toBe(true);
    expect(a.kind).toBe("total");
  });

  it("порожній період — чесно каже, що витрат не було", () => {
    const a = buildAnswer({ kind: "total" }, period, []);
    expect(a.text).toContain("не знайшов");
  });
});

describe("buildAnswer — top_categories", () => {
  it("перелічує категорії з сумами і відсотками", () => {
    const a = buildAnswer({ kind: "top_categories" }, period, txs);
    expect(a.text).toContain("Подорожі");
    expect(a.text).toContain("1 200,00 ₴");
    expect(a.text).toContain("55%");
    expect(a.text).toContain("Продукти");
  });
});

describe("buildAnswer — biggest", () => {
  it("називає найбільшу покупку з датою", () => {
    const a = buildAnswer({ kind: "biggest" }, period, txs);
    expect(a.text).toContain("Booking.com");
    expect(a.text).toContain("1 200,00 ₴");
    expect(a.text).toContain("9 вересня 2026");
  });
});

describe("buildAnswer — category", () => {
  it("рахує лише вказану категорію", () => {
    const a = buildAnswer({ kind: "category", category: "Продукти" }, period, txs);
    expect(a.text).toContain("Продукти");
    expect(a.text).toContain("800,00 ₴");
    // Українські числівники: 2 покупки, а не «2 покупок»
    expect(a.text).toContain("2 покупки");
  });

  it("категорія без витрат", () => {
    const a = buildAnswer({ kind: "category", category: "Розваги" }, period, txs);
    expect(a.text).toContain("Розваги");
    expect(a.text).toContain("не було");
  });
});

describe("buildAnswer — count / average / income", () => {
  it("кількість покупок", () => {
    const a = buildAnswer({ kind: "count" }, period, txs);
    expect(a.text).toContain("4");
  });

  it("середній чек", () => {
    const a = buildAnswer({ kind: "average" }, period, txs);
    expect(a.text).toContain("550,00 ₴");
    expect(a.text).toContain("усього 4 покупки");
  });

  it("надходження", () => {
    const a = buildAnswer({ kind: "income" }, period, txs);
    expect(a.text).toContain("45 000,00 ₴");
    expect(a.text).toContain("Зарплата");
  });
});

describe("buildAnswer — unusual", () => {
  it("знаходить покупку, що різко вибивається", () => {
    const a = buildAnswer({ kind: "unusual" }, period, txs);
    expect(a.text).toContain("Booking.com");
  });

  it("рівні витрати — нічого незвичного", () => {
    const even = [
      T("2026-09-02T10:00:00Z", -10000),
      T("2026-09-03T10:00:00Z", -11000),
      T("2026-09-04T10:00:00Z", -9000),
      T("2026-09-05T10:00:00Z", -10500),
    ];
    const a = buildAnswer({ kind: "unusual" }, period, even);
    expect(a.text).toContain("нічого незвичного");
  });
});

describe("buildAnswer — compare", () => {
  it("порівнює два місяці", () => {
    const two = [
      T("2026-09-05T10:00:00Z", -30000),
      T("2026-08-05T10:00:00Z", -60000),
    ];
    const a = buildAnswer({ kind: "compare" }, period, two, new Date("2026-09-15T12:00:00"));
    expect(a.text).toContain("300,00 ₴");
    expect(a.text).toContain("600,00 ₴");
    expect(a.text).toContain("менше");
  });
});

describe("buildAnswer — unknown", () => {
  it("чесно каже, що не зрозумів, і показує приклади", () => {
    const a = buildAnswer({ kind: "unknown" }, period, txs);
    expect(a.text).toContain("поки що");
    expect(a.kind).toBe("unknown");
  });
});

describe("SUGGESTIONS", () => {
  it("є готові питання для кнопок", () => {
    expect(SUGGESTIONS.length).toBeGreaterThanOrEqual(4);
    expect(SUGGESTIONS.every((s) => s.length > 0)).toBe(true);
  });
});

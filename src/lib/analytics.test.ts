import { describe, expect, it } from "vitest";
import {
  avgPerDay, biggestExpense, filterSinceDays, monthSpent,
  spendingByCategory, spendingByDay, totalSpent, type Tx,
} from "@/lib/analytics";

const T = (
  occurred_at: string, amount: number,
  category = "Продукти", description = "Тест",
): Tx => ({ occurred_at, amount, category, description });

const until = new Date("2026-07-15T23:59:59Z");

describe("totalSpent / avgPerDay / biggestExpense", () => {
  const txs = [
    T("2026-07-10T10:00:00Z", -10000),
    T("2026-07-11T10:00:00Z", -25000, "Кафе і ресторани", "Кафе"),
    T("2026-07-12T10:00:00Z", 500000, "Надходження", "Зарплата"),
  ];
  it("рахує лише витрати (додатні ігнорує)", () => {
    expect(totalSpent(txs)).toBe(35000);
  });
  it("середнє за день", () => {
    expect(avgPerDay(txs, 7)).toBe(5000);
  });
  it("найбільша покупка", () => {
    expect(biggestExpense(txs)?.description).toBe("Кафе");
  });
  it("порожній список", () => {
    expect(biggestExpense([])).toBeNull();
    expect(totalSpent([])).toBe(0);
  });
});

describe("filterSinceDays", () => {
  it("лишає транзакції за останні N днів", () => {
    const txs = [T("2026-07-14T10:00:00Z", -100), T("2026-06-01T10:00:00Z", -200)];
    expect(filterSinceDays(txs, 30, until)).toHaveLength(1);
  });
});

describe("monthSpent", () => {
  it("рахує лише поточний календарний місяць", () => {
    const txs = [T("2026-07-01T10:00:00Z", -1000), T("2026-06-30T10:00:00Z", -5000)];
    expect(monthSpent(txs, new Date("2026-07-15T00:00:00Z"))).toBe(1000);
  });
});

describe("spendingByDay", () => {
  it("точка на кожен день, сума по днях, label = ДД.ММ", () => {
    const txs = [T("2026-07-14T08:00:00Z", -1000), T("2026-07-14T20:00:00Z", -2000)];
    const points = spendingByDay(txs, 3, until);
    expect(points).toHaveLength(3);
    const p14 = points.find((p) => p.date === "2026-07-14");
    expect(p14).toMatchObject({ total: 3000, label: "14.07" });
  });
});

describe("spendingByCategory", () => {
  it("сортує за сумою і згортає хвіст у «Інше»", () => {
    const txs = [
      T("2026-07-10T10:00:00Z", -600, "Продукти"),
      T("2026-07-10T10:00:00Z", -500, "Кафе і ресторани"),
      T("2026-07-10T10:00:00Z", -400, "Транспорт"),
      T("2026-07-10T10:00:00Z", -300, "Здоровʼя"),
      T("2026-07-10T10:00:00Z", -200, "Розваги"),
      T("2026-07-10T10:00:00Z", -100, "Шопінг"),
      T("2026-07-10T10:00:00Z", -50, "Перекази"),
    ];
    const slices = spendingByCategory(txs, 5);
    expect(slices).toHaveLength(6);
    expect(slices[0]).toEqual({ category: "Продукти", total: 600 });
    expect(slices[5]).toEqual({ category: "Інше", total: 150 });
  });
});

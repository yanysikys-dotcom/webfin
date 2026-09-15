import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { generateDemoTransactions } from "@/lib/demo-data";

describe("generateDemoTransactions", () => {
  const until = new Date("2026-07-15T12:00:00Z");
  const txs = generateDemoTransactions(120, until);

  it("генерує достатньо транзакцій за 120 днів", () => {
    expect(txs.length).toBeGreaterThan(100);
  });

  it("покупки відʼємні, зарплата додатна", () => {
    expect(txs.some((t) => t.category === "Надходження" && t.amount > 0)).toBe(true);
    expect(txs.filter((t) => t.category !== "Надходження").every((t) => t.amount < 0)).toBe(true);
  });

  it("усі дати в межах періоду", () => {
    const start = new Date(until);
    start.setDate(start.getDate() - 121);
    const end = new Date(until);
    end.setDate(end.getDate() + 1);
    expect(txs.every((t) => {
      const d = new Date(t.occurred_at);
      return d >= start && d <= end;
    })).toBe(true);
  });

  it("кожна транзакція має відому категорію і позначку демо", () => {
    expect(txs.every((t) => CATEGORIES.includes(t.category) && t.is_demo === true)).toBe(true);
  });
});

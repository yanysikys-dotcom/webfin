import { describe, expect, it } from "vitest";
import { parsePeriod } from "@/lib/assistant/period";

// Вівторок, 15 вересня 2026
const now = new Date("2026-09-15T12:00:00");

// Порівнюємо за МІСЦЕВОЮ датою: parsePeriod працює з місцевою північчю,
// а toISOString() перевів би її в UTC і в Києві дав би попередній день.
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate(),
  ).padStart(2, "0")}`;
const d = (p: { from: Date; to: Date }) => [ymd(p.from), ymd(p.to)];

describe("parsePeriod", () => {
  it("сьогодні", () => {
    const p = parsePeriod("скільки я витратила сьогодні", now);
    expect(d(p)).toEqual(["2026-09-15", "2026-09-15"]);
    expect(p.label).toBe("сьогодні");
  });

  it("вчора", () => {
    const p = parsePeriod("а вчора?", now);
    expect(d(p)).toEqual(["2026-09-14", "2026-09-14"]);
    expect(p.label).toBe("вчора");
  });

  it("цей тиждень — від понеділка", () => {
    const p = parsePeriod("витрати цього тижня", now);
    expect(d(p)).toEqual(["2026-09-14", "2026-09-15"]);
    expect(p.label).toBe("цього тижня");
  });

  it("минулий тиждень — повний попередній", () => {
    const p = parsePeriod("скільки минулого тижня", now);
    expect(d(p)).toEqual(["2026-09-07", "2026-09-13"]);
    expect(p.label).toBe("минулого тижня");
  });

  it("цей місяць", () => {
    const p = parsePeriod("витрати цього місяця", now);
    expect(d(p)).toEqual(["2026-09-01", "2026-09-15"]);
    expect(p.label).toBe("цього місяця");
  });

  it("минулий місяць — повний", () => {
    const p = parsePeriod("а минулого місяця скільки", now);
    expect(d(p)).toEqual(["2026-08-01", "2026-08-31"]);
    expect(p.label).toBe("минулого місяця");
  });

  it("за N днів", () => {
    const p = parsePeriod("що було за останні 10 днів", now);
    expect(d(p)).toEqual(["2026-09-06", "2026-09-15"]);
    expect(p.label).toBe("за останні 10 днів");
  });

  it("рік", () => {
    const p = parsePeriod("скільки за рік", now);
    expect(d(p)).toEqual(["2026-01-01", "2026-09-15"]);
    expect(p.label).toBe("цього року");
  });

  it("без вказівки на час — цей місяць", () => {
    const p = parsePeriod("на що я витрачаю найбільше", now);
    expect(d(p)).toEqual(["2026-09-01", "2026-09-15"]);
    expect(p.label).toBe("цього місяця");
  });
});

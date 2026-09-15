import { describe, expect, it } from "vitest";
import {
  FREE_HISTORY_DAYS, historyDaysFor, isPremiumActive, premiumDaysLeft,
} from "@/lib/premium";

const now = new Date("2026-09-15T12:00:00Z");
const free = { is_premium: false, premium_until: null };
const active = { is_premium: true, premium_until: "2026-10-05T12:00:00Z" };
const expired = { is_premium: true, premium_until: "2026-09-01T12:00:00Z" };
const noDate = { is_premium: true, premium_until: null };

describe("isPremiumActive", () => {
  it("активний преміум із датою в майбутньому", () => {
    expect(isPremiumActive(active, now)).toBe(true);
  });
  it("прострочений преміум неактивний", () => {
    expect(isPremiumActive(expired, now)).toBe(false);
  });
  it("безкоштовний акаунт неактивний", () => {
    expect(isPremiumActive(free, now)).toBe(false);
  });
  it("прапорець без дати не вважається преміумом", () => {
    expect(isPremiumActive(noDate, now)).toBe(false);
  });
});

describe("historyDaysFor", () => {
  it("безкоштовний бачить лише 30 днів", () => {
    expect(historyDaysFor(free, now)).toBe(FREE_HISTORY_DAYS);
    expect(historyDaysFor(expired, now)).toBe(30);
  });
  it("преміум бачить усю історію", () => {
    expect(historyDaysFor(active, now)).toBeUndefined();
  });
});

describe("premiumDaysLeft", () => {
  it("рахує дні до кінця підписки", () => {
    expect(premiumDaysLeft(active, now)).toBe(20);
  });
  it("нуль для неактивного", () => {
    expect(premiumDaysLeft(free, now)).toBe(0);
    expect(premiumDaysLeft(expired, now)).toBe(0);
  });
});

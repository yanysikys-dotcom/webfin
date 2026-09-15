import { describe, expect, it } from "vitest";
import { accountLabel, currencyName, monoTxToRow } from "@/lib/monobank";

describe("monoTxToRow", () => {
  it("мапить транзакцію Monobank у рядок бази", () => {
    const row = monoTxToRow(
      { id: "abc", time: 1752570000, description: "Сільпо", mcc: 5411, amount: -25000, balance: 1000000 },
      "user-1",
      "acc-1",
    );
    expect(row).toMatchObject({
      user_id: "user-1",
      account_id: "acc-1",
      mono_id: "abc",
      description: "Сільпо",
      amount: -25000,
      mcc: 5411,
      category: "Продукти",
      balance_after: 1000000,
      is_demo: false,
    });
    expect(row.occurred_at).toBe(new Date(1752570000 * 1000).toISOString());
  });

  it("надходження отримують категорію «Надходження»", () => {
    const row = monoTxToRow(
      { id: "x", time: 1752570000, description: "Переказ", mcc: 4829, amount: 5000, balance: 0 },
      "u",
      "a",
    );
    expect(row.category).toBe("Надходження");
  });
});

describe("довідники", () => {
  it("назви валют", () => {
    expect(currencyName(980)).toBe("UAH");
    expect(currencyName(840)).toBe("USD");
    expect(currencyName(978)).toBe("EUR");
  });
  it("підпис картки", () => {
    expect(
      accountLabel({ id: "id1", currencyCode: 980, balance: 0, maskedPan: ["537541******1234"], type: "black" }),
    ).toBe("black •1234 (UAH)");
  });
});

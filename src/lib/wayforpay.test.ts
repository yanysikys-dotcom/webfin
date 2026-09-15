import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.WAYFORPAY_MERCHANT_ACCOUNT = "test_merch_n1";
  process.env.WAYFORPAY_SECRET_KEY = "flk3409refn54t54t*FNJRET";
  process.env.WAYFORPAY_DOMAIN = "localhost";
});

// Еталонний приклад з документації WayForPay (wiki.wayforpay.com/en/view/852102).
// Сам хеш прикладу відтворити неможливо — його зроблено мерчантом «test_merchant»,
// чий секретний ключ не опублікований. Тому перевіряємо те, що документація
// дійсно фіксує: порядок полів і склейку через «;». Далі HMAC_MD5 — стандартний.
const DOC_FIELDS = {
  merchantAccount: "test_merchant",
  merchantDomainName: "www.market.ua",
  orderReference: "DH783023",
  orderDate: 1415379863,
  amount: "1547.36",
  currency: "UAH",
  productName: [
    "Процесор Intel Core i5-4670 3.4GHz",
    "Пам'ять Kingston DDR3-1600 4096MB PC3-12800",
  ],
  productCount: [1, 1],
  productPrice: ["1000", "547.36"],
};

const DOC_BASE =
  "test_merchant;www.market.ua;DH783023;1415379863;1547.36;UAH;" +
  "Процесор Intel Core i5-4670 3.4GHz;Пам'ять Kingston DDR3-1600 4096MB PC3-12800;" +
  "1;1;1000;547.36";

describe("purchaseSignatureBase", () => {
  it("склеює поля у порядку з документації WayForPay", async () => {
    const { purchaseSignatureBase } = await import("@/lib/wayforpay");
    expect(purchaseSignatureBase(DOC_FIELDS)).toBe(DOC_BASE);
  });

  it("усі назви товарів ідуть перед усіма кількостями і цінами", async () => {
    const { purchaseSignatureBase } = await import("@/lib/wayforpay");
    const parts = purchaseSignatureBase(DOC_FIELDS).split(";");
    expect(parts).toHaveLength(12);
    expect(parts.slice(6, 8)).toEqual(DOC_FIELDS.productName);
    expect(parts.slice(8, 10)).toEqual(["1", "1"]);
    expect(parts.slice(10, 12)).toEqual(["1000", "547.36"]);
  });
});

describe("purchaseSignature", () => {
  it("це HMAC_MD5 від базового рядка на секретному ключі", async () => {
    const { purchaseSignature, purchaseSignatureBase } = await import("@/lib/wayforpay");
    const { createHmac } = await import("node:crypto");
    const secret = "flk3409refn54t54t*FNJRET";
    const expected = createHmac("md5", secret)
      .update(purchaseSignatureBase(DOC_FIELDS), "utf8")
      .digest("hex");
    expect(purchaseSignature(DOC_FIELDS, secret)).toBe(expected);
  });

  it("зміна будь-якого поля змінює підпис", async () => {
    const { purchaseSignature } = await import("@/lib/wayforpay");
    const secret = "flk3409refn54t54t*FNJRET";
    const base = purchaseSignature(DOC_FIELDS, secret);
    expect(purchaseSignature({ ...DOC_FIELDS, amount: "1547.37" }, secret)).not.toBe(base);
    expect(purchaseSignature(DOC_FIELDS, "інший-ключ")).not.toBe(base);
  });
});

describe("checkStatusSignature", () => {
  it("підписує merchantAccount;orderReference", async () => {
    const { checkStatusSignature } = await import("@/lib/wayforpay");
    const sig = checkStatusSignature("test_merch_n1", "WF-abc-123", "secret");
    expect(sig).toMatch(/^[0-9a-f]{32}$/);
    // той самий вхід — той самий підпис; інший orderReference — інший підпис
    expect(checkStatusSignature("test_merch_n1", "WF-abc-123", "secret")).toBe(sig);
    expect(checkStatusSignature("test_merch_n1", "WF-abc-124", "secret")).not.toBe(sig);
  });
});

describe("createOrderReference", () => {
  it("унікальний, містить префікс і частину id користувача", async () => {
    const { createOrderReference } = await import("@/lib/wayforpay");
    const a = createOrderReference("11111111-2222-3333-4444-555555555555");
    const b = createOrderReference("11111111-2222-3333-4444-555555555555");
    expect(a).toMatch(/^WF-11111111-\d+-[a-z0-9]{6}$/);
    expect(a).not.toBe(b);
  });
});

describe("buildPurchaseParams", () => {
  it("збирає повний набір параметрів для віджета", async () => {
    const { buildPurchaseParams, PREMIUM_PRICE_UAH } = await import("@/lib/wayforpay");
    const params = buildPurchaseParams("WF-test-1-abcdef", 1789000000);
    expect(params).toMatchObject({
      merchantAccount: "test_merch_n1",
      merchantDomainName: "localhost",
      authorizationType: "SimpleSignature",
      orderReference: "WF-test-1-abcdef",
      amount: PREMIUM_PRICE_UAH,
      currency: "UAH",
      productCount: [1],
      language: "UA",
    });
    expect(params.merchantSignature).toMatch(/^[0-9a-f]{32}$/);
    expect(params.productPrice).toEqual([PREMIUM_PRICE_UAH]);
  });
});

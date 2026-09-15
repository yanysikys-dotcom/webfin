import { createHmac, randomBytes } from "node:crypto";

const API_URL = "https://api.wayforpay.com/api";

export const PREMIUM_PRICE_UAH = "100.00";
export const PREMIUM_PRICE_KOPECKS = 10000;
export const PREMIUM_DAYS = 30;
export const PREMIUM_PRODUCT_NAME = "WebFin Преміум (30 днів)";

export type PurchaseParams = {
  merchantAccount: string;
  merchantDomainName: string;
  authorizationType: "SimpleSignature";
  merchantSignature: string;
  orderReference: string;
  orderDate: number;
  amount: string;
  currency: "UAH";
  productName: string[];
  productPrice: string[];
  productCount: number[];
  language: "UA";
};

function config() {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const secret = process.env.WAYFORPAY_SECRET_KEY;
  // Домен має збігатися з тим, де відкривається віджет, інакше WayForPay
  // відхилить підпис. На Vercel він відомий зі змінної VERCEL_URL,
  // локально — з WAYFORPAY_DOMAIN (localhost).
  const domain =
    process.env.WAYFORPAY_DOMAIN ||
    (process.env.VERCEL_URL ? process.env.VERCEL_URL.replace(/^https?:\/\//, "") : "");
  if (!merchantAccount || !secret || !domain) {
    throw new Error(
      "Бракує WAYFORPAY_MERCHANT_ACCOUNT / WAYFORPAY_SECRET_KEY, або не вдалося визначити домен",
    );
  }
  return { merchantAccount, secret, domain };
}

export type PurchaseSignatureFields = {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: string;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: string[];
};

function sign(parts: Array<string | number>, secret: string): string {
  return createHmac("md5", secret).update(parts.join(";"), "utf8").digest("hex");
}

// Порядок полів зафіксований документацією WayForPay і не може змінюватись:
// спершу всі назви товарів, потім усі кількості, потім усі ціни.
export function purchaseSignatureBase(fields: PurchaseSignatureFields): string {
  return [
    fields.merchantAccount,
    fields.merchantDomainName,
    fields.orderReference,
    fields.orderDate,
    fields.amount,
    fields.currency,
    ...fields.productName,
    ...fields.productCount,
    ...fields.productPrice,
  ].join(";");
}

export function purchaseSignature(
  fields: PurchaseSignatureFields,
  secret: string,
): string {
  return sign([purchaseSignatureBase(fields)], secret);
}

export function checkStatusSignature(
  merchantAccount: string,
  orderReference: string,
  secret: string,
): string {
  return sign([merchantAccount, orderReference], secret);
}

export function createOrderReference(userId: string, now = new Date()): string {
  return `WF-${userId.slice(0, 8)}-${now.getTime()}-${randomBytes(3).toString("hex")}`;
}

export function buildPurchaseParams(
  orderReference: string,
  orderDate: number,
): PurchaseParams {
  const { merchantAccount, secret, domain } = config();
  const base = {
    merchantAccount,
    merchantDomainName: domain,
    orderReference,
    orderDate,
    amount: PREMIUM_PRICE_UAH,
    currency: "UAH",
    productName: [PREMIUM_PRODUCT_NAME],
    productCount: [1],
    productPrice: [PREMIUM_PRICE_UAH],
  };
  return {
    ...base,
    currency: "UAH",
    authorizationType: "SimpleSignature",
    merchantSignature: purchaseSignature(base, secret),
    language: "UA",
  };
}

export async function checkPaymentStatus(
  orderReference: string,
): Promise<{ transactionStatus: string; amount?: number; reason?: string }> {
  const { merchantAccount, secret } = config();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      transactionType: "CHECK_STATUS",
      merchantAccount,
      orderReference,
      merchantSignature: checkStatusSignature(merchantAccount, orderReference, secret),
      apiVersion: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`WayForPay недоступний (HTTP ${res.status})`);
  }
  return res.json();
}

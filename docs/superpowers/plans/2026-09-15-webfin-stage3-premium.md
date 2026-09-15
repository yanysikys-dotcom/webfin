# WebFin — Етап 3 «Преміум (WayForPay)»: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Користувач купує преміум через спливаючий віджет WayForPay прямо на сайті (без редіректу) і одразу отримує повну історію, порівняння місяців та експорт у Excel.

**Architecture:** Підпис платежу і перевірка статусу — тільки на сервері (секретний ключ ніколи не йде в браузер). Браузер відкриває офіційний віджет WayForPay з готовими параметрами, а після оплати сервер **самостійно** запитує WayForPay `CHECK_STATUS` і лише тоді вмикає преміум — результату з браузера не довіряємо. Обмеження безкоштовного тарифу (30 днів історії) застосовується в одному місці — `src/lib/premium.ts`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, Supabase, `node:crypto` (HMAC_MD5), `exceljs` (генерація .xlsx на сервері), Vitest.

**Специфікація:** `docs/superpowers/specs/2026-07-15-webfin-design.md` (розділ 7)

## Global Constraints

- Мова інтерфейсу — українська; світла тема; акцент UI — emerald; преміум-акцент — amber (значок ⭐).
- **Тестовий режим WayForPay:** `merchantAccount = test_merch_n1`, `secretKey = flk3409refn54t54t*FNJRET` (публічні тестові дані з [wiki.wayforpay.com](https://wiki.wayforpay.com/en/view/852472)). Реальні гроші не списуються. Значення читаються з `.env.local`, щоб Yana підставила свої без зміни коду.
- Секретний ключ WayForPay і `SUPABASE_SERVICE_ROLE_KEY` — тільки в серверному коді; у клієнтські компоненти не імпортувати.
- Ціна преміуму: **100.00 грн**, термін — **30 днів** від моменту активації.
- Суми платежів у базі (`payments.amount`) — копійки (`bigint`), як і всюди; у WayForPay передаються гривні рядком («100.00»).
- Підпис Purchase — HMAC_MD5 над `merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName…;productCount…;productPrice…` (порядок точний, роздільник `;`).
- Підпис CHECK_STATUS — HMAC_MD5 над `merchantAccount;orderReference`.
- ⚠️ НЕ запускати `npm run build`, поки працює дев-сервер. Для перевірки типів: `npx tsc --noEmit`.
- Дії Yana потрібні лише на фінальній приймальній перевірці.

---

### Task 1: Модуль WayForPay (підписи і перевірка статусу)

**Files:**
- Create: `src/lib/wayforpay.ts`
- Test: `src/lib/wayforpay.test.ts`
- Modify: `.env.local` (додати три змінні, автоматично)

**Interfaces:**
- Consumes: змінні оточення `WAYFORPAY_MERCHANT_ACCOUNT`, `WAYFORPAY_SECRET_KEY`, `WAYFORPAY_DOMAIN`
- Produces:
  - `type PurchaseParams = { merchantAccount: string; merchantDomainName: string; authorizationType: "SimpleSignature"; merchantSignature: string; orderReference: string; orderDate: number; amount: string; currency: "UAH"; productName: string[]; productPrice: string[]; productCount: number[]; language: "UA" }`
  - `PREMIUM_PRICE_UAH = "100.00"`, `PREMIUM_PRICE_KOPECKS = 10000`, `PREMIUM_DAYS = 30`, `PREMIUM_PRODUCT_NAME = "WebFin Преміум (30 днів)"`
  - `purchaseSignature(fields: { merchantAccount: string; merchantDomainName: string; orderReference: string; orderDate: number; amount: string; currency: string; productName: string[]; productCount: number[]; productPrice: string[] }, secret: string): string`
  - `checkStatusSignature(merchantAccount: string, orderReference: string, secret: string): string`
  - `createOrderReference(userId: string, now?: Date): string`
  - `buildPurchaseParams(orderReference: string, orderDate: number): PurchaseParams`
  - `checkPaymentStatus(orderReference: string): Promise<{ transactionStatus: string; amount?: number; reason?: string }>`

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/wayforpay.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.WAYFORPAY_MERCHANT_ACCOUNT = "test_merch_n1";
  process.env.WAYFORPAY_SECRET_KEY = "flk3409refn54t54t*FNJRET";
  process.env.WAYFORPAY_DOMAIN = "localhost";
});

describe("purchaseSignature", () => {
  it("відтворює еталонний підпис з документації WayForPay", async () => {
    const { purchaseSignature } = await import("@/lib/wayforpay");
    const signature = purchaseSignature(
      {
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
      },
      "flk3409refn54t54t*FNJRET",
    );
    expect(signature).toBe("b95932786cbe243a76b014846b63fe92");
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/lib/wayforpay'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/wayforpay.ts`:

```ts
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
  const domain = process.env.WAYFORPAY_DOMAIN;
  if (!merchantAccount || !secret || !domain) {
    throw new Error(
      "У .env.local бракує WAYFORPAY_MERCHANT_ACCOUNT / WAYFORPAY_SECRET_KEY / WAYFORPAY_DOMAIN",
    );
  }
  return { merchantAccount, secret, domain };
}

function sign(parts: Array<string | number>, secret: string): string {
  return createHmac("md5", secret).update(parts.join(";"), "utf8").digest("hex");
}

export function purchaseSignature(
  fields: {
    merchantAccount: string;
    merchantDomainName: string;
    orderReference: string;
    orderDate: number;
    amount: string;
    currency: string;
    productName: string[];
    productCount: number[];
    productPrice: string[];
  },
  secret: string,
): string {
  return sign(
    [
      fields.merchantAccount,
      fields.merchantDomainName,
      fields.orderReference,
      fields.orderDate,
      fields.amount,
      fields.currency,
      ...fields.productName,
      ...fields.productCount,
      ...fields.productPrice,
    ],
    secret,
  );
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
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS — усі тести, включно з 4 новими.

- [ ] **Step 5: Додати змінні в .env.local**

```bash
grep -q "^WAYFORPAY_MERCHANT_ACCOUNT=" .env.local || cat >> .env.local << 'EOF'
# WayForPay — тестові дані (замінити на свої, коли зʼявиться акаунт)
WAYFORPAY_MERCHANT_ACCOUNT=test_merch_n1
WAYFORPAY_SECRET_KEY=flk3409refn54t54t*FNJRET
WAYFORPAY_DOMAIN=localhost
EOF
grep -c "^WAYFORPAY_" .env.local
```

Expected: `3`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/wayforpay.ts src/lib/wayforpay.test.ts
git commit -m "feat: модуль WayForPay (підписи платежу і перевірка статусу)"
```

---

### Task 2: Правила преміуму

**Files:**
- Create: `src/lib/premium.ts`
- Test: `src/lib/premium.test.ts`

**Interfaces:**
- Consumes: тип `Profile` з `@/lib/data` (Етап 2)
- Produces:
  - `FREE_HISTORY_DAYS = 30`
  - `isPremiumActive(profile: Pick<Profile, "is_premium" | "premium_until">, now?: Date): boolean`
  - `historyDaysFor(profile: Pick<Profile, "is_premium" | "premium_until">, now?: Date): number | undefined` — `30` для безкоштовного, `undefined` (без обмеження) для преміуму
  - `premiumDaysLeft(profile: Pick<Profile, "is_premium" | "premium_until">, now?: Date): number`

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/premium.test.ts`:

```ts
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/lib/premium'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/premium.ts`:

```ts
type PremiumFields = { is_premium: boolean; premium_until: string | null };

export const FREE_HISTORY_DAYS = 30;

export function isPremiumActive(profile: PremiumFields, now = new Date()): boolean {
  if (!profile.is_premium || !profile.premium_until) return false;
  return new Date(profile.premium_until) > now;
}

export function historyDaysFor(
  profile: PremiumFields,
  now = new Date(),
): number | undefined {
  return isPremiumActive(profile, now) ? undefined : FREE_HISTORY_DAYS;
}

export function premiumDaysLeft(profile: PremiumFields, now = new Date()): number {
  if (!isPremiumActive(profile, now)) return 0;
  const ms = new Date(profile.premium_until!).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/premium.ts src/lib/premium.test.ts
git commit -m "feat: правила преміуму (активність, ліміт історії, дні до кінця)"
```

---

### Task 3: API створення платежу і підтвердження оплати

**Files:**
- Create: `src/app/api/payments/create/route.ts`, `src/app/api/payments/verify/route.ts`

**Interfaces:**
- Consumes: `buildPurchaseParams`, `createOrderReference`, `checkPaymentStatus`, `PREMIUM_PRICE_KOPECKS`, `PREMIUM_DAYS` (Task 1); `createAdminClient` (Етап 2); `createClient` server (Етап 1)
- Produces:
  - `POST /api/payments/create` → `{ params: PurchaseParams }`; створює рядок `payments` зі статусом `"created"`
  - `POST /api/payments/verify` body `{ orderReference }` → `{ premium: boolean, status: string, premiumUntil?: string }` або `{ error }`

- [ ] **Step 1: Роут створення платежу**

Створити `src/app/api/payments/create/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  buildPurchaseParams, createOrderReference, PREMIUM_PRICE_KOPECKS,
} from "@/lib/wayforpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const orderReference = createOrderReference(user.id);
  const orderDate = Math.floor(Date.now() / 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    user_id: user.id,
    order_reference: orderReference,
    amount: PREMIUM_PRICE_KOPECKS,
    status: "created",
  });
  if (error) {
    return NextResponse.json({ error: "Не вдалося створити замовлення" }, { status: 500 });
  }

  return NextResponse.json({ params: buildPurchaseParams(orderReference, orderDate) });
}
```

- [ ] **Step 2: Роут підтвердження оплати**

Створити `src/app/api/payments/verify/route.ts`:

```ts
import { NextResponse } from "next/server";
import { checkPaymentStatus, PREMIUM_DAYS } from "@/lib/wayforpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { orderReference } = await request.json().catch(() => ({}));
  if (typeof orderReference !== "string" || !orderReference) {
    return NextResponse.json({ error: "Не вказано замовлення" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Замовлення має належати цьому користувачеві — інакше чужу оплату можна
  // було б «привласнити», підставивши чужий orderReference.
  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, status")
    .eq("order_reference", orderReference)
    .maybeSingle();
  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Замовлення не знайдено" }, { status: 404 });
  }

  // Джерело істини — відповідь WayForPay, а не браузер користувача.
  const status = await checkPaymentStatus(orderReference);
  const approved = status.transactionStatus === "Approved";

  await admin
    .from("payments")
    .update({ status: status.transactionStatus ?? "Unknown" })
    .eq("id", payment.id);

  if (!approved) {
    return NextResponse.json({
      premium: false,
      status: status.transactionStatus ?? "Unknown",
    });
  }

  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS);
  await admin
    .from("profiles")
    .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
    .eq("id", user.id);

  return NextResponse.json({
    premium: true,
    status: status.transactionStatus,
    premiumUntil: premiumUntil.toISOString(),
  });
}
```

- [ ] **Step 3: Перевірити типи і захист**

```bash
npx tsc --noEmit
curl -s -X POST http://localhost:3000/api/payments/create | head -c 60
echo
curl -s -X POST http://localhost:3000/api/payments/verify -H "Content-Type: application/json" -d '{"orderReference":"WF-fake"}' | head -c 60
```

Expected: `tsc` без помилок; обидва curl → `{"error":"Не авторизовано"}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments
git commit -m "feat: API створення платежу і серверне підтвердження оплати"
```

---

### Task 4: Кнопка «Купити Преміум» із віджетом WayForPay

**Files:**
- Create: `src/components/settings/premium-card.tsx`
- Modify: `src/app/(app)/settings/page.tsx` (додати картку преміуму), `src/components/sidebar.tsx` (значок Преміум)

**Interfaces:**
- Consumes: `POST /api/payments/create`, `POST /api/payments/verify` (Task 3); `isPremiumActive`, `premiumDaysLeft` (Task 2); тип `Profile` (Етап 2)
- Produces: компонент `PremiumCard({ profile })`; сайдбар показує значок «Преміум ⭐» для активної підписки

- [ ] **Step 1: Картка преміуму з віджетом**

Створити `src/components/settings/premium-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Profile } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isPremiumActive, premiumDaysLeft } from "@/lib/premium";

// Віджет WayForPay підвантажується скриптом і кладе конструктор у window.
declare global {
  interface Window {
    Wayforpay?: new () => {
      run: (
        params: Record<string, unknown>,
        approved: () => void,
        declined: () => void,
        pending: () => void,
      ) => void;
    };
  }
}

const BENEFITS = [
  "Уся історія транзакцій (без обмеження 30 днів)",
  "Порівняння місяців на дашборді",
  "Експорт транзакцій у Excel",
];

export function PremiumCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = isPremiumActive(profile);

  async function verify(orderReference: string) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderReference }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (json.premium) {
      setNotice("Преміум активовано! ⭐");
      router.refresh();
    } else {
      setError(json.error ?? `Оплата не пройшла (статус: ${json.status ?? "невідомо"})`);
    }
  }

  async function handleBuy() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/payments/create", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? "Не вдалося створити замовлення");
      return;
    }

    if (!window.Wayforpay) {
      setBusy(false);
      setError("Віджет оплати ще завантажується. Спробуй за кілька секунд.");
      return;
    }

    const orderReference = json.params.orderReference as string;
    new window.Wayforpay().run(
      json.params,
      () => verify(orderReference),
      () => {
        setBusy(false);
        setError("Оплату відхилено");
      },
      () => {
        setBusy(false);
        setNotice("Платіж обробляється — перевір статус за хвилину.");
      },
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <Script src="https://secure.wayforpay.com/server/pay-widget.js" strategy="afterInteractive" />

      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="font-medium text-slate-900">Преміум</h2>
        {active && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Активний
          </span>
        )}
      </div>

      {active ? (
        <p className="mt-2 text-sm text-slate-600">
          Підписка діє до {formatDate(profile.premium_until!)} (залишилось{" "}
          {premiumDaysLeft(profile)} дн.)
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            100 ₴ за 30 днів. Оплата у тестовому режимі — реальні гроші не списуються.
          </p>
          <ul className="mt-3 space-y-1.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {b}
              </li>
            ))}
          </ul>
          <button
            onClick={handleBuy}
            disabled={busy}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "Відкриваю оплату…" : "Купити Преміум"}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
    </section>
  );
}
```

- [ ] **Step 2: Додати картку на сторінку Налаштувань**

У `src/app/(app)/settings/page.tsx` додати імпорт після наявних імпортів:

```tsx
import { PremiumCard } from "@/components/settings/premium-card";
```

і замінити блок:

```tsx
      <SettingsPanel profile={profile} monoAccounts={monoAccounts ?? []} />
```

на:

```tsx
      <div className="max-w-2xl">
        <PremiumCard profile={profile} />
      </div>
      <SettingsPanel profile={profile} monoAccounts={monoAccounts ?? []} />
```

- [ ] **Step 3: Значок «Преміум» у сайдбарі**

У `src/components/sidebar.tsx` замінити рядок імпорту іконок:

```tsx
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Wallet,
} from "lucide-react";
```

на:

```tsx
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
```

Замінити сигнатуру компонента:

```tsx
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
```

на:

```tsx
export function Sidebar({ isPremium = false }: { isPremium?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
```

І замінити блок логотипа:

```tsx
      <div className="flex items-center gap-2 overflow-hidden px-4 py-5">
        <Wallet className="h-7 w-7 shrink-0 text-emerald-600" />
        {!collapsed && (
          <span className="whitespace-nowrap text-lg font-semibold text-slate-900">
            WebFin
          </span>
        )}
      </div>
```

на:

```tsx
      <div className="flex items-center gap-2 overflow-hidden px-4 py-5">
        <Wallet className="h-7 w-7 shrink-0 text-emerald-600" />
        {!collapsed && (
          <>
            <span className="whitespace-nowrap text-lg font-semibold text-slate-900">
              WebFin
            </span>
            {isPremium && (
              <span
                title="Активний Преміум"
                className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                <Sparkles className="h-3 w-3" />
                Преміум
              </span>
            )}
          </>
        )}
      </div>
```

- [ ] **Step 4: Передати прапорець преміуму в сайдбар**

Замінити ПОВНІСТЮ вміст `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getProfile } from "@/lib/data";
import { isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Другий рубіж захисту на додачу до middleware
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isPremium={isPremiumActive(profile)} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Перевірити наживо**

```bash
npx tsc --noEmit
```

Expected: без помилок.

У браузері (з активною сесією) відкрити http://localhost:3000/settings.

Expected: картка «Преміум» із трьома перевагами і кнопкою «Купити Преміум». Натискання кнопки відкриває спливаюче вікно WayForPay **поверх сторінки** (без переходу на інший сайт). Закриття вікна не ламає сторінку.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/premium-card.tsx "src/app/(app)/settings" "src/app/(app)/layout.tsx" src/components/sidebar.tsx
git commit -m "feat: картка преміуму з віджетом WayForPay і значок у сайдбарі"
```

---

### Task 5: Обмеження історії та порівняння місяців

**Files:**
- Create: `src/components/dashboard/month-comparison.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/transactions/page.tsx`, `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts` (додати блок)

**Interfaces:**
- Consumes: `historyDaysFor`, `isPremiumActive` (Task 2); `getVisibleTransactions` (Етап 2)
- Produces: `compareMonths(txs: Tx[], now?: Date): { current: number; previous: number; diff: number; percent: number }`; компонент `MonthComparison`; безкоштовний акаунт бачить лише 30 днів

- [ ] **Step 1: Тест порівняння місяців (падає)**

Додати В КІНЕЦЬ `src/lib/analytics.test.ts`:

```ts
describe("compareMonths", () => {
  it("рахує поточний і попередній місяць та різницю у відсотках", async () => {
    const { compareMonths } = await import("@/lib/analytics");
    const txs = [
      T("2026-09-05T10:00:00Z", -12000),
      T("2026-09-10T10:00:00Z", -8000),
      T("2026-08-05T10:00:00Z", -10000),
      T("2026-08-20T10:00:00Z", -10000),
      T("2026-07-01T10:00:00Z", -99999),
    ];
    const r = compareMonths(txs, new Date("2026-09-15T12:00:00Z"));
    expect(r.current).toBe(20000);
    expect(r.previous).toBe(20000);
    expect(r.diff).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("зростання витрат дає додатний відсоток", async () => {
    const { compareMonths } = await import("@/lib/analytics");
    const txs = [
      T("2026-09-05T10:00:00Z", -15000),
      T("2026-08-05T10:00:00Z", -10000),
    ];
    const r = compareMonths(txs, new Date("2026-09-15T12:00:00Z"));
    expect(r.diff).toBe(5000);
    expect(r.percent).toBe(50);
  });

  it("порожній попередній місяць не ділить на нуль", async () => {
    const { compareMonths } = await import("@/lib/analytics");
    const r = compareMonths([T("2026-09-05T10:00:00Z", -15000)], new Date("2026-09-15T12:00:00Z"));
    expect(r.previous).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("грудень порівнюється з листопадом того ж року", async () => {
    const { compareMonths } = await import("@/lib/analytics");
    const r = compareMonths(
      [T("2026-12-05T10:00:00Z", -5000), T("2026-11-05T10:00:00Z", -2500)],
      new Date("2026-12-15T12:00:00Z"),
    );
    expect(r.current).toBe(5000);
    expect(r.previous).toBe(2500);
    expect(r.percent).toBe(100);
  });

  it("січень порівнюється з груднем попереднього року", async () => {
    const { compareMonths } = await import("@/lib/analytics");
    const r = compareMonths(
      [T("2027-01-05T10:00:00Z", -3000), T("2026-12-05T10:00:00Z", -6000)],
      new Date("2027-01-15T12:00:00Z"),
    );
    expect(r.current).toBe(3000);
    expect(r.previous).toBe(6000);
    expect(r.percent).toBe(-50);
  });
});
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `compareMonths is not a function` (або `undefined`).

- [ ] **Step 3: Реалізація compareMonths**

Додати В КІНЕЦЬ `src/lib/analytics.ts`:

```ts
export function compareMonths(
  txs: Tx[],
  now = new Date(),
): { current: number; previous: number; diff: number; percent: number } {
  const inMonth = (year: number, month: number) =>
    totalSpent(
      txs.filter((t) => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    );

  const current = inMonth(now.getFullYear(), now.getMonth());
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previous = inMonth(prevDate.getFullYear(), prevDate.getMonth());
  const diff = current - previous;
  const percent = previous === 0 ? 0 : Math.round((diff / previous) * 100);
  return { current, previous, diff, percent };
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Компонент порівняння місяців**

Створити `src/components/dashboard/month-comparison.tsx`:

```tsx
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/format";

export function MonthComparison({
  current,
  previous,
  diff,
  percent,
}: {
  current: number;
  previous: number;
  diff: number;
  percent: number;
}) {
  const grew = diff > 0;
  const Icon = grew ? TrendingUp : TrendingDown;
  // Зростання витрат — червоне, зменшення — зелене.
  const tone = diff === 0 ? "text-slate-500" : grew ? "text-red-600" : "text-green-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-slate-700">Цей місяць проти минулого</h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Преміум
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-slate-500">Цей місяць</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {formatMoney(current)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Минулий місяць</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-400">
            {formatMoney(previous)}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 ${tone}`}>
          <Icon className="h-5 w-5" />
          <span className="font-medium tabular-nums">
            {diff === 0
              ? "без змін"
              : `${grew ? "+" : "−"}${formatMoney(Math.abs(diff)).replace("−", "")} (${
                  percent > 0 ? "+" : ""
                }${percent}%)`}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Підключити обмеження історії і порівняння на дашборді**

У `src/app/(app)/dashboard/page.tsx` замінити блок імпортів аналітики:

```tsx
import {
  avgPerDay, biggestExpense, filterSinceDays, monthSpent,
  spendingByCategory, spendingByDay,
} from "@/lib/analytics";
```

на:

```tsx
import {
  avgPerDay, biggestExpense, compareMonths, filterSinceDays, monthSpent,
  spendingByCategory, spendingByDay,
} from "@/lib/analytics";
```

Додати імпорти після наявних:

```tsx
import { historyDaysFor, isPremiumActive } from "@/lib/premium";
import { MonthComparison } from "@/components/dashboard/month-comparison";
```

Замінити блок завантаження даних:

```tsx
  let txs = await getVisibleTransactions(supabase, profile, { sinceDays: 62 });
  if (profile.data_source === "demo" && txs.length === 0) {
    await seedDemoData(profile.id);
    txs = await getVisibleTransactions(supabase, profile, { sinceDays: 62 });
  }
```

на:

```tsx
  // Безкоштовний акаунт бачить 30 днів; преміум — усю історію
  // (historyDaysFor повертає undefined = без обмеження за датою).
  const premium = isPremiumActive(profile);
  const sinceDays = historyDaysFor(profile);

  let txs = await getVisibleTransactions(supabase, profile, { sinceDays });
  if (profile.data_source === "demo" && txs.length === 0) {
    await seedDemoData(profile.id);
    txs = await getVisibleTransactions(supabase, profile, { sinceDays });
  }
```

Замінити блок рендера графіків:

```tsx
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpendingChart data={spendingByDay(last30, 30)} />
        <CategoryDonut data={spendingByCategory(last30)} />
      </div>
```

на:

```tsx
      {premium && <MonthComparison {...compareMonths(txs)} />}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpendingChart data={spendingByDay(last30, 30)} />
        <CategoryDonut data={spendingByCategory(last30)} />
      </div>
      {!premium && (
        <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Безкоштовний акаунт показує аналітику за останні 30 днів. Преміум відкриває
          всю історію, порівняння місяців і експорт у Excel — у «Налаштуваннях».
        </p>
      )}
```

- [ ] **Step 7: Обмеження історії на сторінці транзакцій**

(Кнопку експорту додасть Task 6 — тут лише обмеження історії.)

Замінити ПОВНІСТЮ вміст `src/app/(app)/transactions/page.tsx`:

```tsx
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { historyDaysFor, isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { TransactionsList } from "@/components/transactions/transactions-list";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const premium = isPremiumActive(profile);
  const transactions = await getVisibleTransactions(supabase, profile, {
    sinceDays: historyDaysFor(profile),
    limit: premium ? 5000 : 1000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Транзакції</h1>
      <TransactionsList
        transactions={transactions}
        showSync={profile.data_source === "monobank"}
      />
    </div>
  );
}
```

- [ ] **Step 8: Перевірити типи і дашборд наживо**

```bash
npx tsc --noEmit
```

Expected: без помилок.

У браузері відкрити http://localhost:3000/dashboard (акаунт без преміуму).

Expected: блоку порівняння місяців НЕМА, внизу зʼявилась жовта плашка про обмеження 30 днів.

- [ ] **Step 9: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts src/components/dashboard/month-comparison.tsx "src/app/(app)/dashboard" "src/app/(app)/transactions"
git commit -m "feat: обмеження історії для безкоштовного тарифу і порівняння місяців"
```

---

### Task 6: Експорт транзакцій у Excel

**Files:**
- Create: `src/app/api/export/route.ts`
- Modify: `src/components/transactions/transactions-list.tsx`, `src/app/(app)/transactions/page.tsx`, `package.json` (exceljs)

**Interfaces:**
- Consumes: `isPremiumActive` (Task 2); `getProfile`, `getVisibleTransactions` (Етап 2); `formatDate` (Етап 2)
- Produces: `GET /api/export` → файл `.xlsx` (лише для преміуму, інакше 403); кнопка «Експорт у Excel» у списку транзакцій

- [ ] **Step 1: Встановити exceljs**

```bash
npm i exceljs
```

- [ ] **Step 2: Роут експорту**

Створити `src/app/api/export/route.ts`:

```ts
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const profile = await getProfile(supabase);
  if (!isPremiumActive(profile)) {
    return NextResponse.json({ error: "Експорт доступний у Преміумі" }, { status: 403 });
  }

  const transactions = await getVisibleTransactions(supabase, profile, { limit: 5000 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Транзакції");
  sheet.columns = [
    { header: "Дата", key: "date", width: 20 },
    { header: "Опис", key: "description", width: 36 },
    { header: "Категорія", key: "category", width: 22 },
    { header: "Сума, ₴", key: "amount", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const t of transactions) {
    sheet.addRow({
      date: new Date(t.occurred_at),
      description: t.description,
      category: t.category,
      amount: t.amount / 100,
    });
  }
  sheet.getColumn("date").numFmt = "dd.mm.yyyy hh:mm";
  sheet.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `webfin-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 3: Кнопка експорту в списку транзакцій**

У `src/components/transactions/transactions-list.tsx` замінити рядок імпорту іконок:

```tsx
import { RefreshCw, Search } from "lucide-react";
```

на:

```tsx
import { Download, RefreshCw, Search } from "lucide-react";
```

Замінити сигнатуру компонента:

```tsx
export function TransactionsList({
  transactions,
  showSync,
}: {
  transactions: TxRow[];
  showSync: boolean;
}) {
```

на:

```tsx
export function TransactionsList({
  transactions,
  showSync,
  isPremium,
}: {
  transactions: TxRow[];
  showSync: boolean;
  isPremium: boolean;
}) {
```

Замінити блок кнопки синхронізації:

```tsx
        {showSync && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-auto flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Оновлюю…" : "Оновити з Monobank"}
          </button>
        )}
```

на:

```tsx
        <div className="ml-auto flex items-center gap-3">
          {isPremium && (
            <a
              href="/api/export"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Експорт у Excel
            </a>
          )}
          {showSync && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Оновлюю…" : "Оновити з Monobank"}
            </button>
          )}
        </div>
```

- [ ] **Step 4: Передати прапорець преміуму в список**

У `src/app/(app)/transactions/page.tsx` замінити:

```tsx
      <TransactionsList
        transactions={transactions}
        showSync={profile.data_source === "monobank"}
      />
```

на:

```tsx
      <TransactionsList
        transactions={transactions}
        showSync={profile.data_source === "monobank"}
        isPremium={premium}
      />
```

- [ ] **Step 5: Перевірити типи і захист**

```bash
npx tsc --noEmit
curl -s -o /dev/null -w "експорт без входу: %{http_code}\n" http://localhost:3000/api/export
```

Expected: `tsc` без помилок; експорт без входу → `401`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/export src/components/transactions "src/app/(app)/transactions" package.json package-lock.json
git commit -m "feat: експорт транзакцій у Excel для преміум-акаунтів"
```

---

### Task 7: Наскрізна перевірка преміуму і фінал етапу

**Files:**
- Create: `scripts/set-premium.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: усе з Tasks 1–6
- Produces: скрипт для ручного вмикання/вимикання преміуму (перевірка UI без реальної оплати); перевірений Етап 3

- [ ] **Step 1: Скрипт перемикання преміуму**

Створити `scripts/set-premium.mjs`:

```js
// Вмикає або вимикає преміум для користувача — щоб перевірити преміум-функції
// без проходження оплати. Використання:
//   node scripts/set-premium.mjs test1@webfin.local on
//   node scripts/set-premium.mjs test1@webfin.local off
import { readFileSync } from "node:fs";

const [email, mode = "on"] = process.argv.slice(2);
if (!email) {
  console.log("Використання: node scripts/set-premium.mjs <email> [on|off]");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const until = new Date();
until.setDate(until.getDate() + 30);
const sql =
  mode === "off"
    ? `update public.profiles set is_premium = false, premium_until = null where email = '${email}';`
    : `update public.profiles set is_premium = true, premium_until = '${until.toISOString()}' where email = '${email}';`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

console.log(
  res.ok
    ? `✅ Преміум ${mode === "off" ? "вимкнено" : "увімкнено"} для ${email}`
    : `❌ Помилка HTTP ${res.status}: ${await res.text()}`,
);
process.exit(res.ok ? 0 : 1);
```

- [ ] **Step 2: Перевірити преміум-функції з увімкненим преміумом**

```bash
node scripts/set-premium.mjs test1@webfin.local on
```

Expected: `✅ Преміум увімкнено`.

У браузері (сесія `test1@webfin.local`), оновити сторінки:
1. /dashboard — зверху блок «Цей місяць проти минулого» зі стрілкою і відсотком; жовта плашка про обмеження ЗНИКЛА
2. Сайдбар — біля логотипа значок «Преміум ⭐»
3. /settings — картка Преміум пише «Активний» і «діє до …»
4. /transactions — зʼявилася кнопка «Експорт у Excel»; натискання завантажує файл `.xlsx`

- [ ] **Step 3: Перевірити обмеження без преміуму**

```bash
node scripts/set-premium.mjs test1@webfin.local off
```

Expected: `✅ Преміум вимкнено`.

У браузері оновити сторінки:
1. /dashboard — блок порівняння місяців зник, зʼявилась жовта плашка про 30 днів
2. /transactions — кнопки «Експорт у Excel» немає
3. Пряме звернення до `/api/export` у браузері → повідомлення «Експорт доступний у Преміумі»

- [ ] **Step 4: Повна перевірка**

```bash
npm test
```

Expected: усі тести PASS.

Зупинити дев-сервер, потім:

```bash
pkill -f "next dev"; sleep 2; npm run build
```

Expected: `Compiled successfully`. Далі знову запустити дев-сервер.

- [ ] **Step 5: Оновити README**

У `README.md` замінити:

```markdown
Етап 2 «Дані й дашборд» готовий: демо-дані, підключення Monobank,
дашборд із графіками, транзакції з пошуком і фільтром.
Далі — Етап 3 «Преміум (WayForPay)».
```

на:

```markdown
Етап 3 «Преміум» готовий: оплата віджетом WayForPay (тестовий режим),
повна історія, порівняння місяців і експорт у Excel.
Далі — Етап 4 «AI-помічник».

Перемкнути преміум вручну для перевірки:
`node scripts/set-premium.mjs <email> on|off`
```

- [ ] **Step 6: 🧑 ДІЯ КОРИСТУВАЧА (Yana) — приймальна перевірка**

Передати Yana в чат дослівно:

> Етап 3 готовий! Перевір, будь ласка:
> 1. Відкрий http://localhost:3000, увійди своїм акаунтом і зайди в «Налаштування».
> 2. Знайди картку «Преміум» і натисни **«Купити Преміум»**.
> 3. Має зʼявитися спливаюче вікно оплати WayForPay **прямо поверх нашої сторінки** — без переходу на інший сайт. Це головне, що ми перевіряємо.
> 4. Вікно можна просто закрити хрестиком — нічого не зламається. Реальні гроші не списуються (тестовий режим).
> 5. Щоб побачити, ЩО дає преміум, скажи мені — я увімкну його тобі вручну однією командою, і ти побачиш на Дашборді блок «Цей місяць проти минулого», значок ⭐ у меню і кнопку «Експорт у Excel» у Транзакціях.
> Напиши, чи відкрилося вікно оплати і як воно виглядає.

Чекати на підтвердження.

- [ ] **Step 7: Фінальний commit**

```bash
git add scripts/set-premium.mjs README.md
git commit -m "feat: скрипт перемикання преміуму і README (Етап 3 завершено)"
```

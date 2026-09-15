# WebFin — Етап 2 «Дані й дашборд»: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Живий дашборд WebFin: демо-транзакції для нових користувачів, підключення Monobank з кнопкою «Оновити», картки-підсумки, графіки та сторінка транзакцій з пошуком і фільтром.

**Architecture:** Чиста логіка (формат, категорії, аналітика, генератор, шифрування) — окремі модулі в `src/lib/` з юніт-тестами. Записи в базу — тільки через серверні API-роути з admin-клієнтом (service-ключ); читання — через серверні компоненти з RLS-клієнтом користувача. Дашборд і Транзакції — серверні сторінки, що передають дані клієнтським компонентам (Recharts, пошук/фільтр).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Supabase (`@/lib/supabase/{client,server}` вже існують), Recharts, Vitest, node:crypto (AES-256-GCM).

**Специфікація:** `docs/superpowers/specs/2026-07-15-webfin-design.md`

## Global Constraints

- Мова інтерфейсу — українська; світла тема; акцент UI — emerald; кольори графіків — лише перевірена палітра з `src/lib/categories.ts` (валідована dataviz-валідатором).
- Суми — `bigint` у копійках; відʼємне значення = витрата; формат виводу — `formatMoney` («1 234,56 ₴»).
- Секрети лише в `.env.local`; токен Monobank зберігається тільки зашифрованим (AES-256-GCM), у браузер не потрапляє.
- Читання даних — RLS-клієнтом користувача; запис — admin-клієнтом у API-роутах після перевірки `auth.getUser()`.
- ⚠️ НЕ запускати `npm run build`, поки працює дев-сервер (конфлікт папки `.next`). Для перевірки типів під час роботи: `npx tsc --noEmit`.
- Ліміт Monobank: 1 запит на 60 с, максимум 31 день за запит — код має це поважати (зрозуміла помилка при 429).
- Дії користувача не потрібні до фінальної приймальної перевірки (SQL — через `node scripts/run-sql.mjs`, якщо знадобиться).

---

### Task 1: Формат грошей і дат

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `formatMoney(kopecks: number): string` («1 234,56 ₴», мінус — символ «−»); `formatDate(iso: string): string` («15 липня 2026»)

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "@/lib/format";

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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/format'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/format.ts`:

```ts
const MONTHS = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

export function formatMoney(kopecks: number): string {
  const sign = kopecks < 0 ? "−" : "";
  const abs = Math.abs(kopecks);
  const hrn = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const kop = String(abs % 100).padStart(2, "0");
  return `${sign}${hrn},${kop} ₴`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS (усі, включно з 6 тестами Етапу 1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: формат грошей і дат українською"
```

---

### Task 2: Категорії витрат (MCC → українські назви + кольори)

**Files:**
- Create: `src/lib/categories.ts`
- Test: `src/lib/categories.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `CATEGORIES: string[]`; `categoryForMcc(mcc: number | null | undefined): string`; `colorForCategory(category: string): string`. Кольори — валідована палітра (виконано `validate_palette.js`, ΔE 24.2, PASS).

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryForMcc, colorForCategory } from "@/lib/categories";

describe("categoryForMcc", () => {
  it("відомі MCC-коди", () => {
    expect(categoryForMcc(5411)).toBe("Продукти");
    expect(categoryForMcc(5814)).toBe("Кафе і ресторани");
    expect(categoryForMcc(4121)).toBe("Транспорт");
    expect(categoryForMcc(5912)).toBe("Здоровʼя");
    expect(categoryForMcc(7832)).toBe("Розваги");
    expect(categoryForMcc(4814)).toBe("Комуналка і звʼязок");
    expect(categoryForMcc(5651)).toBe("Шопінг");
    expect(categoryForMcc(4829)).toBe("Перекази");
  });
  it("діапазони подорожей", () => {
    expect(categoryForMcc(3245)).toBe("Подорожі");
    expect(categoryForMcc(3550)).toBe("Подорожі");
    expect(categoryForMcc(7011)).toBe("Подорожі");
  });
  it("невідомий або відсутній MCC → Інше", () => {
    expect(categoryForMcc(9999)).toBe("Інше");
    expect(categoryForMcc(null)).toBe("Інше");
    expect(categoryForMcc(undefined)).toBe("Інше");
  });
});

describe("colorForCategory", () => {
  it("кожна категорія має hex-колір", () => {
    for (const c of CATEGORIES) {
      expect(colorForCategory(c)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it("невідома категорія отримує колір «Інше»", () => {
    expect(colorForCategory("Щось дивне")).toBe(colorForCategory("Інше"));
  });
});
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/categories'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/categories.ts`:

```ts
// Кольори — перевірена палітра (dataviz validate_palette.js: PASS, ΔE 24.2).
// «Перекази», «Надходження», «Інше» — нейтральні, не з категоріальних слотів.
export const CATEGORY_COLORS: Record<string, string> = {
  "Продукти": "#2a78d6",
  "Кафе і ресторани": "#1baf7a",
  "Транспорт": "#eda100",
  "Здоровʼя": "#008300",
  "Розваги": "#4a3aa7",
  "Комуналка і звʼязок": "#e34948",
  "Шопінг": "#e87ba4",
  "Подорожі": "#eb6834",
  "Перекази": "#898781",
  "Надходження": "#006300",
  "Інше": "#c3c2b7",
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

const MCC_MAP: Record<string, number[]> = {
  "Продукти": [5411, 5422, 5441, 5451, 5462, 5499],
  "Кафе і ресторани": [5811, 5812, 5813, 5814],
  "Транспорт": [4111, 4121, 4131, 5541, 5542, 7523],
  "Здоровʼя": [5912, 8011, 8021, 8043, 8062, 8099],
  "Розваги": [5735, 5815, 5816, 7832, 7922, 7941, 7994, 7996, 7999],
  "Комуналка і звʼязок": [4814, 4899, 4900],
  "Шопінг": [5311, 5331, 5399, 5651, 5661, 5691, 5732, 5942, 5977, 5999],
  "Перекази": [4829, 6012, 6538],
  "Подорожі": [4511, 4722, 7011],
};

// Діапазони MCC авіаліній (3000–3299) і готелів (3501–3999)
const MCC_RANGES: Array<[number, number, string]> = [
  [3000, 3299, "Подорожі"],
  [3501, 3999, "Подорожі"],
];

export function categoryForMcc(mcc: number | null | undefined): string {
  if (!mcc) return "Інше";
  for (const [category, codes] of Object.entries(MCC_MAP)) {
    if (codes.includes(mcc)) return category;
  }
  for (const [from, to, category] of MCC_RANGES) {
    if (mcc >= from && mcc <= to) return category;
  }
  return "Інше";
}

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Інше"];
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.ts src/lib/categories.test.ts
git commit -m "feat: мапа MCC-кодів у категорії з валідованою палітрою"
```

---

### Task 3: Аналітика витрат

**Files:**
- Create: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type Tx = { occurred_at: string; description: string; amount: number; category: string }`
  - `type DayPoint = { date: string; label: string; total: number }`
  - `type CategorySlice = { category: string; total: number }`
  - `filterSinceDays<T extends Tx>(txs: T[], days: number, until?: Date): T[]`
  - `totalSpent(txs: Tx[]): number` (копійки, додатне)
  - `monthSpent(txs: Tx[], now?: Date): number`
  - `avgPerDay(txs: Tx[], days: number): number`
  - `biggestExpense(txs: Tx[]): Tx | null`
  - `spendingByDay(txs: Tx[], days: number, until?: Date): DayPoint[]`
  - `spendingByCategory(txs: Tx[], topN?: number): CategorySlice[]` (хвіст згортається в «Інше»)

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/analytics.test.ts`:

```ts
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/analytics'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/analytics.ts`:

```ts
export type Tx = {
  occurred_at: string;
  description: string;
  amount: number; // копійки; відʼємне = витрата
  category: string;
};

export type DayPoint = { date: string; label: string; total: number };
export type CategorySlice = { category: string; total: number };

export function filterSinceDays<T extends Tx>(
  txs: T[], days: number, until = new Date(),
): T[] {
  const since = new Date(until);
  since.setDate(since.getDate() - days);
  return txs.filter((t) => {
    const d = new Date(t.occurred_at);
    return d >= since && d <= until;
  });
}

export function totalSpent(txs: Tx[]): number {
  return txs.reduce((sum, t) => (t.amount < 0 ? sum - t.amount : sum), 0);
}

export function monthSpent(txs: Tx[], now = new Date()): number {
  return totalSpent(
    txs.filter((t) => {
      const d = new Date(t.occurred_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }),
  );
}

export function avgPerDay(txs: Tx[], days: number): number {
  return days > 0 ? Math.round(totalSpent(txs) / days) : 0;
}

export function biggestExpense(txs: Tx[]): Tx | null {
  let best: Tx | null = null;
  for (const t of txs) {
    if (t.amount < 0 && (!best || t.amount < best.amount)) best = t;
  }
  return best;
}

export function spendingByDay(
  txs: Tx[], days: number, until = new Date(),
): DayPoint[] {
  const byDate = new Map<string, number>();
  for (const t of txs) {
    if (t.amount < 0) {
      const key = t.occurred_at.slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) - t.amount);
    }
  }
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(until);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const label = `${date.slice(8, 10)}.${date.slice(5, 7)}`;
    points.push({ date, label, total: byDate.get(date) ?? 0 });
  }
  return points;
}

export function spendingByCategory(txs: Tx[], topN = 5): CategorySlice[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.amount < 0) map.set(t.category, (map.get(t.category) ?? 0) - t.amount);
  }
  const sorted = [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  if (sorted.length <= topN) return sorted;

  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN).reduce((s, x) => s + x.total, 0);
  const other = top.find((s) => s.category === "Інше");
  if (other) {
    other.total += rest;
    return top.sort((a, b) => b.total - a.total);
  }
  return [...top, { category: "Інше", total: rest }];
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat: аналітика витрат (підсумки, по днях, по категоріях)"
```

---

### Task 4: Шифрування токена + admin-клієнт + ключ шифрування

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/supabase/admin.ts`
- Test: `src/lib/crypto.test.ts`
- Modify: `.env.local` (додати `TOKEN_ENCRYPTION_KEY`, автоматично)

**Interfaces:**
- Consumes: змінна оточення `TOKEN_ENCRYPTION_KEY` (64 hex-символи)
- Produces: `encryptToken(plain: string): string`; `decryptToken(payload: string): string`; `createAdminClient(): SupabaseClient` (service-ключ, тільки для серверного коду)

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/crypto.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
});

describe("encryptToken / decryptToken", () => {
  it("розшифровує те, що зашифрував; шифротекст не містить оригінал", async () => {
    const { decryptToken, encryptToken } = await import("@/lib/crypto");
    const token = "uXm-testToken123";
    const encrypted = encryptToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted)).toBe(token);
  });
  it("два шифрування дають різні рядки (випадковий IV)", async () => {
    const { encryptToken } = await import("@/lib/crypto");
    expect(encryptToken("x")).not.toBe(encryptToken("x"));
  });
});
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/crypto'`.

- [ ] **Step 3: Реалізація crypto**

Створити `src/lib/crypto.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY має бути 64 hex-символи (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64"))
    .join(".");
}

export function decryptToken(payload: string): string {
  const [iv, tag, encrypted] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Admin-клієнт і ключ у .env.local**

Створити `src/lib/supabase/admin.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ТІЛЬКИ для серверного коду (API-роути, серверні компоненти):
// service-ключ обходить RLS. Ніколи не імпортувати в клієнтські компоненти.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

Додати ключ шифрування (тільки якщо його ще немає):

```bash
grep -q "^TOKEN_ENCRYPTION_KEY=" .env.local || echo "TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.local
grep -c "^TOKEN_ENCRYPTION_KEY=" .env.local
```

Expected: `1`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.ts src/lib/crypto.test.ts src/lib/supabase/admin.ts
git commit -m "feat: шифрування токена (AES-256-GCM) і admin-клієнт Supabase"
```

---

### Task 5: Генератор демо-транзакцій

**Files:**
- Create: `src/lib/demo-data.ts`
- Test: `src/lib/demo-data.test.ts`

**Interfaces:**
- Consumes: `categoryForMcc` з `@/lib/categories` (Task 2)
- Produces:
  - `type DemoTx = { occurred_at: string; description: string; amount: number; mcc: number; category: string; balance_after: number; is_demo: true }`
  - `generateDemoTransactions(days?: number, until?: Date): DemoTx[]` — ~4 місяці реалістичних покупок + щомісячна зарплата

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/demo-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/demo-data'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/demo-data.ts`:

```ts
import { categoryForMcc } from "@/lib/categories";

export type DemoTx = {
  occurred_at: string;
  description: string;
  amount: number;
  mcc: number;
  category: string;
  balance_after: number;
  is_demo: true;
};

type Merchant = { name: string; mcc: number; min: number; max: number; weight: number };

// Суми — у гривнях (конвертуються в копійки при генерації)
const MERCHANTS: Merchant[] = [
  { name: "Сільпо", mcc: 5411, min: 150, max: 1800, weight: 10 },
  { name: "АТБ", mcc: 5411, min: 100, max: 900, weight: 10 },
  { name: "Кавʼярня Aroma", mcc: 5814, min: 60, max: 220, weight: 8 },
  { name: "Glovo", mcc: 5812, min: 250, max: 700, weight: 6 },
  { name: "Uklon", mcc: 4121, min: 90, max: 350, weight: 6 },
  { name: "Київський метрополітен", mcc: 4111, min: 8, max: 50, weight: 5 },
  { name: "Аптека АНЦ", mcc: 5912, min: 80, max: 600, weight: 3 },
  { name: "WOG", mcc: 5541, min: 800, max: 2500, weight: 2 },
  { name: "Rozetka", mcc: 5732, min: 300, max: 5000, weight: 2 },
  { name: "Netflix", mcc: 5815, min: 199, max: 199, weight: 1 },
  { name: "Київстар", mcc: 4814, min: 200, max: 200, weight: 1 },
  { name: "Multiplex", mcc: 7832, min: 180, max: 500, weight: 1 },
  { name: "Zara", mcc: 5651, min: 500, max: 3500, weight: 1 },
  { name: "Booking.com", mcc: 4722, min: 1500, max: 8000, weight: 1 },
];

const TOTAL_WEIGHT = MERCHANTS.reduce((s, m) => s + m.weight, 0);

function pickMerchant(): Merchant {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const m of MERCHANTS) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return MERCHANTS[0];
}

function makeTx(
  day: Date, hour: number, description: string, amount: number,
  mcc: number, category: string, balance: number,
): DemoTx {
  const d = new Date(day);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return {
    occurred_at: d.toISOString(),
    description,
    amount,
    mcc,
    category,
    balance_after: balance,
    is_demo: true,
  };
}

export function generateDemoTransactions(days = 120, until = new Date()): DemoTx[] {
  const txs: DemoTx[] = [];
  let balance = 50_000_00; // 50 000 грн стартовий баланс
  const start = new Date(until);
  start.setDate(start.getDate() - days);

  for (let i = 0; i <= days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    if (day.getDate() === 1) {
      balance += 45_000_00;
      txs.push(makeTx(day, 9, "Зарахування заробітної плати", 45_000_00, 0, "Надходження", balance));
    }

    const purchases = Math.floor(Math.random() * 4); // 0–3 покупки на день
    for (let p = 0; p < purchases; p++) {
      const m = pickMerchant();
      const amount = -Math.round((m.min + Math.random() * (m.max - m.min)) * 100);
      balance += amount;
      const hour = 8 + Math.floor(Math.random() * 14);
      txs.push(makeTx(day, hour, m.name, amount, m.mcc, categoryForMcc(m.mcc), balance));
    }
  }
  return txs;
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demo-data.ts src/lib/demo-data.test.ts
git commit -m "feat: генератор реалістичних демо-транзакцій"
```

---

### Task 6: Читання даних + посів демо в базу + API демо

**Files:**
- Create: `src/lib/data.ts`, `src/lib/demo-seed.ts`, `src/app/api/demo/seed/route.ts`

**Interfaces:**
- Consumes: `createClient` (server, Етап 1), `createAdminClient` (Task 4), `generateDemoTransactions` (Task 5)
- Produces:
  - `type Profile = { id: string; email: string; is_premium: boolean; premium_until: string | null; data_source: "demo" | "monobank" }`
  - `type TxRow = { id: string; occurred_at: string; description: string; amount: number; mcc: number | null; category: string; account_id: string }`
  - `type AccountRow = { id: string; name: string; currency: string; balance: number; mono_account_id: string | null; is_demo: boolean }`
  - `getProfile(supabase): Promise<Profile>`; `getVisibleTransactions(supabase, profile, opts?: { sinceDays?: number; limit?: number }): Promise<TxRow[]>`; `getAccounts(supabase, profile): Promise<AccountRow[]>`
  - `seedDemoData(userId: string): Promise<number>` — пересіває демо-дані, повертає кількість
  - `POST /api/demo/seed` → `{ added: number }`

- [ ] **Step 1: Модуль читання даних**

Створити `src/lib/data.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string;
  is_premium: boolean;
  premium_until: string | null;
  data_source: "demo" | "monobank";
};

export type TxRow = {
  id: string;
  occurred_at: string;
  description: string;
  amount: number;
  mcc: number | null;
  category: string;
  account_id: string;
};

export type AccountRow = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  mono_account_id: string | null;
  is_demo: boolean;
};

export async function getProfile(supabase: SupabaseClient): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, is_premium, premium_until, data_source")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getVisibleTransactions(
  supabase: SupabaseClient,
  profile: Profile,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<TxRow[]> {
  let query = supabase
    .from("transactions")
    .select("id, occurred_at, description, amount, mcc, category, account_id")
    .eq("is_demo", profile.data_source === "demo")
    .order("occurred_at", { ascending: false })
    .limit(opts.limit ?? 2000);
  if (opts.sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - opts.sinceDays);
    query = query.gte("occurred_at", since.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TxRow[];
}

export async function getAccounts(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, currency, balance, mono_account_id, is_demo")
    .eq("is_demo", profile.data_source === "demo");
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}
```

- [ ] **Step 2: Посів демо-даних**

Створити `src/lib/demo-seed.ts`:

```ts
import { generateDemoTransactions } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/admin";

// Видаляє старі демо-дані користувача і засіває нові. Повертає кількість транзакцій.
export async function seedDemoData(userId: string): Promise<number> {
  const admin = createAdminClient();

  await admin.from("transactions").delete().eq("user_id", userId).eq("is_demo", true);
  await admin.from("accounts").delete().eq("user_id", userId).eq("is_demo", true);

  const { data: account, error: accErr } = await admin
    .from("accounts")
    .insert({ user_id: userId, name: "Демо-картка", currency: "UAH", is_demo: true })
    .select("id")
    .single();
  if (accErr || !account) throw accErr ?? new Error("Не вдалося створити демо-рахунок");

  const txs = generateDemoTransactions();
  const rows = txs.map((t) => ({ ...t, user_id: userId, account_id: account.id }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("transactions").insert(rows.slice(i, i + 500));
    if (error) throw error;
  }

  const last = txs[txs.length - 1];
  await admin.from("accounts").update({ balance: last.balance_after }).eq("id", account.id);
  await admin.from("profiles").update({ data_source: "demo" }).eq("id", userId);
  return rows.length;
}
```

- [ ] **Step 3: API-роут**

Створити `src/app/api/demo/seed/route.ts`:

```ts
import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-seed";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  const added = await seedDemoData(user.id);
  return NextResponse.json({ added });
}
```

- [ ] **Step 4: Перевірити типи і роут наживо**

```bash
npx tsc --noEmit
```

Expected: без помилок.

Із запущеним дев-сервером (у браузері має бути активна сесія — залогінитись як `test1@webfin.local`), перевірити роут через браузерну консоль або одразу переходити до Task 10, де посів викликається автоматично. Мінімальна перевірка зараз:

```bash
curl -s -X POST http://localhost:3000/api/demo/seed | head -c 200
```

Expected: `{"error":"Не авторизовано"}` (без cookie сесії — 401; це підтверджує, що захист працює).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/lib/demo-seed.ts src/app/api/demo/seed/route.ts
git commit -m "feat: читання даних, посів демо-транзакцій і API демо"
```

---

### Task 7: Клієнт Monobank

**Files:**
- Create: `src/lib/monobank.ts`
- Test: `src/lib/monobank.test.ts`

**Interfaces:**
- Consumes: `categoryForMcc` (Task 2)
- Produces:
  - `type MonoAccount = { id: string; currencyCode: number; balance: number; maskedPan: string[]; type: string }`
  - `type MonoClientInfo = { name: string; accounts: MonoAccount[] }`
  - `type MonoStatementItem = { id: string; time: number; description: string; mcc: number; amount: number; balance: number }`
  - `class MonobankError extends Error { status: number }`
  - `fetchClientInfo(token: string): Promise<MonoClientInfo>`
  - `fetchStatement(token: string, accountId: string, fromSec: number, toSec: number): Promise<MonoStatementItem[]>`
  - `currencyName(code: number): string`; `accountLabel(acc: MonoAccount): string`
  - `monoTxToRow(item: MonoStatementItem, userId: string, accountId: string)` → обʼєкт рядка таблиці `transactions`

- [ ] **Step 1: Тест, що падає (мапінг і довідники — без мережі)**

Створити `src/lib/monobank.test.ts`:

```ts
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/monobank'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/monobank.ts`:

```ts
import { categoryForMcc } from "@/lib/categories";

const BASE = "https://api.monobank.ua";

export type MonoAccount = {
  id: string;
  currencyCode: number;
  balance: number;
  maskedPan: string[];
  type: string;
};

export type MonoClientInfo = { name: string; accounts: MonoAccount[] };

export type MonoStatementItem = {
  id: string;
  time: number; // unix-секунди
  description: string;
  mcc: number;
  amount: number; // копійки; відʼємне = витрата
  balance: number;
};

export class MonobankError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function monoFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Token": token },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    throw new MonobankError("Невалідний токен Monobank. Перевір його на api.monobank.ua", res.status);
  }
  if (res.status === 429) {
    throw new MonobankError("Monobank дозволяє 1 запит на хвилину. Зачекай хвилинку і спробуй ще раз.", 429);
  }
  if (!res.ok) {
    throw new MonobankError(`Monobank недоступний (HTTP ${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchClientInfo(token: string): Promise<MonoClientInfo> {
  return monoFetch<MonoClientInfo>("/personal/client-info", token);
}

export function fetchStatement(
  token: string, accountId: string, fromSec: number, toSec: number,
): Promise<MonoStatementItem[]> {
  return monoFetch<MonoStatementItem[]>(
    `/personal/statement/${accountId}/${fromSec}/${toSec}`,
    token,
  );
}

const CURRENCY_NAMES: Record<number, string> = { 980: "UAH", 840: "USD", 978: "EUR" };

export function currencyName(code: number): string {
  return CURRENCY_NAMES[code] ?? `#${code}`;
}

export function accountLabel(acc: MonoAccount): string {
  const pan = acc.maskedPan?.[0];
  const last4 = pan ? pan.slice(-4) : acc.id.slice(0, 4);
  return `${acc.type} •${last4} (${currencyName(acc.currencyCode)})`;
}

export function monoTxToRow(item: MonoStatementItem, userId: string, accountId: string) {
  return {
    user_id: userId,
    account_id: accountId,
    mono_id: item.id,
    occurred_at: new Date(item.time * 1000).toISOString(),
    description: item.description,
    amount: item.amount,
    mcc: item.mcc,
    category: item.amount > 0 ? "Надходження" : categoryForMcc(item.mcc),
    balance_after: item.balance,
    is_demo: false,
  };
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monobank.ts src/lib/monobank.test.ts
git commit -m "feat: клієнт Monobank API з мапінгом транзакцій"
```

---

### Task 8: API Monobank — підключення, синхронізація, перемикання джерела

**Files:**
- Create: `src/app/api/monobank/connect/route.ts`, `src/app/api/monobank/sync/route.ts`, `src/app/api/profile/data-source/route.ts`

**Interfaces:**
- Consumes: `fetchClientInfo`, `fetchStatement`, `monoTxToRow`, `accountLabel`, `currencyName`, `MonobankError` (Task 7); `encryptToken`, `decryptToken` (Task 4); `createAdminClient` (Task 4); `createClient` server (Етап 1)
- Produces:
  - `POST /api/monobank/connect` body `{ token }` → `{ connected: number, name: string }` або `{ error }`
  - `POST /api/monobank/sync` → `{ added: number, rateLimited: boolean }` або `{ error }`
  - `POST /api/profile/data-source` body `{ source: "demo" | "monobank" }` → `{ ok: true }` або `{ error }`

- [ ] **Step 1: Роут підключення**

Створити `src/app/api/monobank/connect/route.ts`:

```ts
import { NextResponse } from "next/server";
import { encryptToken } from "@/lib/crypto";
import { accountLabel, currencyName, fetchClientInfo, MonobankError } from "@/lib/monobank";
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

  const { token } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Встав токен з api.monobank.ua" }, { status: 400 });
  }

  try {
    const info = await fetchClientInfo(token);
    const admin = createAdminClient();

    await admin
      .from("monobank_tokens")
      .upsert({ user_id: user.id, encrypted_token: encryptToken(token) });

    for (const acc of info.accounts) {
      await admin.from("accounts").upsert(
        {
          user_id: user.id,
          mono_account_id: acc.id,
          name: accountLabel(acc),
          currency: currencyName(acc.currencyCode),
          balance: acc.balance,
          is_demo: false,
        },
        { onConflict: "user_id,mono_account_id" },
      );
    }

    await admin.from("profiles").update({ data_source: "monobank" }).eq("id", user.id);
    return NextResponse.json({ connected: info.accounts.length, name: info.name });
  } catch (e) {
    if (e instanceof MonobankError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
```

- [ ] **Step 2: Роут синхронізації**

Створити `src/app/api/monobank/sync/route.ts`:

```ts
import { NextResponse } from "next/server";
import { decryptToken } from "@/lib/crypto";
import { fetchStatement, MonobankError, monoTxToRow } from "@/lib/monobank";
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

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("monobank_tokens")
    .select("encrypted_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tokenRow) {
    return NextResponse.json(
      { error: "Спочатку підключи Monobank у Налаштуваннях" },
      { status: 400 },
    );
  }
  const token = decryptToken(tokenRow.encrypted_token);

  const { data: accounts } = await admin
    .from("accounts")
    .select("id, mono_account_id")
    .eq("user_id", user.id)
    .eq("is_demo", false)
    .not("mono_account_id", "is", null);

  const toSec = Math.floor(Date.now() / 1000);
  const fromSec = toSec - 31 * 24 * 60 * 60;
  let added = 0;
  let rateLimited = false;

  for (const acc of accounts ?? []) {
    try {
      const items = await fetchStatement(token, acc.mono_account_id!, fromSec, toSec);
      if (items.length === 0) continue;

      const rows = items.map((i) => monoTxToRow(i, user.id, acc.id));
      const { count, error } = await admin
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,mono_id", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      added += count ?? 0;

      // items[0] — найновіша операція, її balance = актуальний баланс картки
      await admin.from("accounts").update({ balance: items[0].balance }).eq("id", acc.id);
    } catch (e) {
      if (e instanceof MonobankError && e.status === 429) {
        rateLimited = true;
        break;
      }
      if (e instanceof MonobankError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  return NextResponse.json({ added, rateLimited });
}
```

- [ ] **Step 3: Роут перемикання джерела даних**

Створити `src/app/api/profile/data-source/route.ts`:

```ts
import { NextResponse } from "next/server";
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

  const { source } = await request.json().catch(() => ({}));
  if (source !== "demo" && source !== "monobank") {
    return NextResponse.json({ error: "Невідоме джерело даних" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (source === "monobank") {
    const { data } = await admin
      .from("monobank_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) {
      return NextResponse.json(
        { error: "Спочатку підключи Monobank токеном нижче" },
        { status: 400 },
      );
    }
  }

  await admin.from("profiles").update({ data_source: source }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Перевірка типів і захисту**

```bash
npx tsc --noEmit
curl -s -X POST http://localhost:3000/api/monobank/sync | head -c 200
curl -s -X POST http://localhost:3000/api/profile/data-source | head -c 200
```

Expected: `tsc` без помилок; обидва curl → `{"error":"Не авторизовано"}`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/monobank src/app/api/profile
git commit -m "feat: API Monobank (підключення, синхронізація) і перемикання джерела"
```

---

### Task 9: Сторінка Налаштувань

**Files:**
- Create: `src/components/settings/settings-panel.tsx`
- Modify: `src/app/(app)/settings/page.tsx` (повна заміна вмісту)

**Interfaces:**
- Consumes: `getProfile`, типи `Profile` (Task 6); `formatMoney` (Task 1); роути `/api/demo/seed`, `/api/monobank/connect`, `/api/profile/data-source` (Tasks 6, 8)
- Produces: сторінка `/settings` з перемикачем джерела, формою токена Monobank, списком карток, кнопкою перегенерації демо

- [ ] **Step 1: Клієнтська панель**

Створити `src/components/settings/settings-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import type { Profile } from "@/lib/data";

type MonoAccountView = { id: string; name: string; currency: string; balance: number };

function sourceButton(active: boolean): string {
  return `rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
      : "border-slate-300 text-slate-600 hover:bg-slate-100"
  }`;
}

export function SettingsPanel({
  profile,
  monoAccounts,
}: {
  profile: Profile;
  monoAccounts: MonoAccountView[];
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(url: string, body?: object) {
    setBusy(url);
    setError(null);
    setMessage(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Щось пішло не так");
      return null;
    }
    router.refresh();
    return json;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-medium text-slate-900">Джерело даних</h2>
        <p className="mt-1 text-sm text-slate-500">
          Звідки платформа бере транзакції для аналітики.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => post("/api/profile/data-source", { source: "demo" })}
            disabled={busy !== null}
            className={sourceButton(profile.data_source === "demo")}
          >
            Демо-дані
          </button>
          <button
            onClick={() => post("/api/profile/data-source", { source: "monobank" })}
            disabled={busy !== null}
            className={sourceButton(profile.data_source === "monobank")}
          >
            Мій Monobank
          </button>
        </div>
        {profile.data_source === "demo" && (
          <button
            onClick={async () => {
              const r = await post("/api/demo/seed");
              if (r) setMessage(`Демо-дані перегенеровано (${r.added} транзакцій)`);
            }}
            disabled={busy !== null}
            className="mt-3 text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50"
          >
            {busy === "/api/demo/seed" ? "Генерую…" : "Перегенерувати демо-дані"}
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-medium text-slate-900">Monobank</h2>
        <p className="mt-1 text-sm text-slate-500">
          Отримай персональний токен на{" "}
          <a
            href="https://api.monobank.ua"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-600 hover:underline"
          >
            api.monobank.ua
          </a>{" "}
          і встав його сюди. Токен зберігається зашифрованим і в браузер ніколи не передається.
        </p>
        <div className="mt-4 flex gap-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Токен Monobank"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={async () => {
              const r = await post("/api/monobank/connect", { token });
              if (r) {
                setToken("");
                setMessage(`Підключено! Карток: ${r.connected}`);
              }
            }}
            disabled={busy !== null || token.length < 10}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "/api/monobank/connect" ? "Перевіряю…" : "Підключити"}
          </button>
        </div>
        {monoAccounts.length > 0 && (
          <ul className="mt-4 space-y-2">
            {monoAccounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm"
              >
                <span className="text-slate-700">{a.name}</span>
                <span className="font-medium text-slate-900">{formatMoney(a.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Сторінка**

Замінити ПОВНІСТЮ вміст `src/app/(app)/settings/page.tsx`:

```tsx
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default async function SettingsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const { data: monoAccounts } = await supabase
    .from("accounts")
    .select("id, name, currency, balance")
    .eq("is_demo", false)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Налаштування</h1>
      <SettingsPanel profile={profile} monoAccounts={monoAccounts ?? []} />
    </div>
  );
}
```

- [ ] **Step 3: Перевірити наживо**

`npx tsc --noEmit` → без помилок. У браузері (з активною сесією) відкрити http://localhost:3000/settings.

Expected: секція «Джерело даних» з активним «Демо-дані», секція Monobank з полем токена; натискання «Перегенерувати демо-дані» показує повідомлення про кількість транзакцій.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings "src/app/(app)/settings"
git commit -m "feat: сторінка Налаштувань (джерело даних, підключення Monobank)"
```

---

### Task 10: Дашборд — картки і графіки

**Files:**
- Create: `src/components/dashboard/summary-cards.tsx`, `src/components/dashboard/spending-chart.tsx`, `src/components/dashboard/category-donut.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx` (повна заміна вмісту), `package.json` (recharts)

**Interfaces:**
- Consumes: `getProfile`, `getVisibleTransactions`, `getAccounts` (Task 6); `seedDemoData` (Task 6); аналітика (Task 3); `formatMoney`, `formatDate` (Task 1); `colorForCategory` (Task 2); типи `DayPoint`, `CategorySlice` (Task 3)
- Produces: живий дашборд `/dashboard` з 4 картками, стовпчиковим графіком за 30 днів і кільцевою діаграмою категорій; авто-посів демо для нових користувачів

- [ ] **Step 1: Встановити Recharts**

```bash
npm i recharts
```

- [ ] **Step 2: Картки-підсумки**

Створити `src/components/dashboard/summary-cards.tsx`:

```tsx
type Card = { label: string; value: string; hint?: string };

export function SummaryCards({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-slate-900">{c.value}</p>
          {c.hint && <p className="mt-1 truncate text-xs text-slate-400">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Графік витрат по днях**

Створити `src/components/dashboard/spending-chart.tsx` (специфікація марок: тонкі стовпчики, радіус 4px зверху, сітка-волосинка, осі приглушені, ховер-тултіп — обовʼязково):

```tsx
"use client";

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/analytics";
import { formatDate, formatMoney } from "@/lib/format";

export function SpendingChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-700">Витрати за 30 днів</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1e0d9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#c3c2b7" }}
              tick={{ fill: "#898781", fontSize: 12 }}
              interval={6}
            />
            <YAxis
              tickFormatter={(v) => String(Math.round(Number(v) / 100))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#898781", fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(11,11,11,0.04)" }}
              formatter={(value) => [formatMoney(Number(value)), "Витрати"]}
              labelFormatter={(label, payload) =>
                payload?.[0] ? formatDate((payload[0].payload as DayPoint).date) : String(label)
              }
            />
            <Bar dataKey="total" name="Витрати" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-400">Вертикальна вісь — гривні</p>
    </div>
  );
}
```

- [ ] **Step 4: Кільцева діаграма категорій**

Створити `src/components/dashboard/category-donut.tsx` (2px білий проміжок між сегментами; поруч — легенда зі значеннями і відсотками: видимі підписи — обовʼязкова компенсація для світлих кольорів палітри):

```tsx
"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySlice } from "@/lib/analytics";
import { colorForCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const sum = data.reduce((s, x) => s + x.total, 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-700">Витрати за категоріями (30 днів)</h2>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(value, name) => [formatMoney(Number(value)), String(name)]} />
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                innerRadius={60}
                outerRadius={100}
                stroke="#ffffff"
                strokeWidth={2}
                paddingAngle={1}
              >
                {data.map((s) => (
                  <Cell key={s.category} fill={colorForCategory(s.category)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-2">
          {data.map((s) => (
            <li key={s.category} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorForCategory(s.category) }}
              />
              <span className="flex-1 text-slate-700">{s.category}</span>
              <span className="font-medium text-slate-900">{formatMoney(s.total)}</span>
              <span className="w-10 text-right text-slate-400">
                {sum ? Math.round((s.total / sum) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Сторінка дашборда з авто-посівом демо**

Замінити ПОВНІСТЮ вміст `src/app/(app)/dashboard/page.tsx`:

```tsx
import {
  avgPerDay, biggestExpense, filterSinceDays, monthSpent,
  spendingByCategory, spendingByDay,
} from "@/lib/analytics";
import { getAccounts, getProfile, getVisibleTransactions } from "@/lib/data";
import { seedDemoData } from "@/lib/demo-seed";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SummaryCards } from "@/components/dashboard/summary-cards";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  // Новий користувач із джерелом «демо» і порожньою базою — засіваємо одразу,
  // щоб дашборд ніколи не був порожнім.
  let txs = await getVisibleTransactions(supabase, profile, { sinceDays: 62 });
  if (profile.data_source === "demo" && txs.length === 0) {
    await seedDemoData(profile.id);
    txs = await getVisibleTransactions(supabase, profile, { sinceDays: 62 });
  }
  const accounts = await getAccounts(supabase, profile);

  const last30 = filterSinceDays(txs, 30);
  const biggest = biggestExpense(last30);
  const balance = accounts.reduce((s, a) => s + a.balance, 0);

  const cards = [
    { label: "Витрати цього місяця", value: formatMoney(monthSpent(txs)) },
    { label: "Середнє за день (30 дн)", value: formatMoney(avgPerDay(last30, 30)) },
    {
      label: "Найбільша покупка",
      value: biggest ? formatMoney(-biggest.amount) : "—",
      hint: biggest?.description,
    },
    { label: "Баланс", value: formatMoney(balance) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Дашборд</h1>
      <SummaryCards cards={cards} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpendingChart data={spendingByDay(last30, 30)} />
        <CategoryDonut data={spendingByCategory(last30)} />
      </div>
      {txs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Даних поки немає. Відкрий «Транзакції» і натисни «Оновити з Monobank», або
          увімкни демо-дані в «Налаштуваннях».
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Перевірити наживо**

`npx tsc --noEmit` → без помилок. У браузері відкрити http://localhost:3000/dashboard (сесія активна).

Expected: 4 картки з цифрами, стовпчиковий графік із тултіпом при наведенні, кільцева діаграма з легендою (назва + сума + %). Для нового користувача без даних — все зʼявляється автоматично (авто-посів).

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard "src/app/(app)/dashboard" package.json package-lock.json
git commit -m "feat: дашборд з картками-підсумками і графіками (Recharts)"
```

---

### Task 11: Сторінка Транзакцій + фінальна перевірка етапу

**Files:**
- Create: `src/components/transactions/transactions-list.tsx`
- Modify: `src/app/(app)/transactions/page.tsx` (повна заміна вмісту), `README.md` (рядок статусу)

**Interfaces:**
- Consumes: `getProfile`, `getVisibleTransactions`, тип `TxRow` (Task 6); `CATEGORIES`, `colorForCategory` (Task 2); `formatDate`, `formatMoney` (Task 1); `POST /api/monobank/sync` (Task 8)
- Produces: сторінка `/transactions` зі списком по днях, пошуком, фільтром категорій і кнопкою «Оновити з Monobank» (лише для джерела monobank)

- [ ] **Step 1: Клієнтський список**

Створити `src/components/transactions/transactions-list.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { CATEGORIES, colorForCategory } from "@/lib/categories";
import type { TxRow } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export function TransactionsList({
  transactions,
  showSync,
}: {
  transactions: TxRow[];
  showSync: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Всі категорії");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (category === "Всі категорії" || t.category === category) &&
          t.description.toLowerCase().includes(search.toLowerCase()),
      ),
    [transactions, search, category],
  );

  const groups = useMemo(() => {
    const map = new Map<string, TxRow[]>();
    for (const t of filtered) {
      const key = t.occurred_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [filtered]);

  async function handleSync() {
    setSyncing(true);
    setNotice(null);
    const res = await fetch("/api/monobank/sync", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setNotice(json.error ?? "Не вдалося оновити");
      return;
    }
    setNotice(
      json.rateLimited
        ? `Додано ${json.added}. Monobank обмежує запити — зачекай хвилину і онови ще раз.`
        : `Готово! Нових транзакцій: ${json.added}`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за описом"
            className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option>Всі категорії</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
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
      </div>

      {notice && <p className="text-sm text-slate-600">{notice}</p>}

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Транзакцій не знайдено
        </p>
      )}

      {groups.map(([date, rows]) => (
        <div key={date} className="rounded-2xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-5 py-3 text-sm font-medium text-slate-500">
            {formatDate(date)}
          </p>
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForCategory(t.category) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.amount > 0 ? "text-green-700" : "text-slate-900"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {formatMoney(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Сторінка**

Замінити ПОВНІСТЮ вміст `src/app/(app)/transactions/page.tsx`:

```tsx
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TransactionsList } from "@/components/transactions/transactions-list";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const transactions = await getVisibleTransactions(supabase, profile, { limit: 1000 });

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

- [ ] **Step 3: Оновити статус у README**

У `README.md` замінити:

```markdown
Етап 1 «Каркас» готовий: реєстрація/вхід, сайдбар, захищені сторінки.
Далі — Етап 2 «Дані й дашборд».
```

на:

```markdown
Етап 2 «Дані й дашборд» готовий: демо-дані, підключення Monobank,
дашборд із графіками, транзакції з пошуком і фільтром.
Далі — Етап 3 «Преміум (WayForPay)».
```

- [ ] **Step 4: Повна перевірка**

```bash
npm test
npx tsc --noEmit
```

Expected: усі тести PASS, типи без помилок.

Зупинити дев-сервер (`pkill -f "next dev"`), потім:

```bash
npm run build
```

Expected: `Compiled successfully`. Після цього знову запустити дев-сервер.

Ручна перевірка в браузері (сесія `test1@webfin.local`):
1. /dashboard — картки з цифрами, обидва графіки з демо-даними
2. /transactions — список по днях; пошук «Сільпо» фільтрує; фільтр «Кафе і ресторани» працює
3. /settings — «Перегенерувати демо-дані» → цифри на дашборді змінилися
4. Перевірка ізоляції (RLS): зареєструвати другого користувача `test2@webfin.local` — у нього СВОЇ демо-дані, не такі, як у першого

- [ ] **Step 5: 🧑 ДІЯ КОРИСТУВАЧА (Yana) — приймальна перевірка**

Передати Yana в чат дослівно:

> Етап 2 готовий! Перевір, будь ласка:
> 1. Відкрий http://localhost:3000 і увійди своїм акаунтом.
> 2. На Дашборді мають бути: 4 картки з цифрами, графік витрат по днях і кругова діаграма категорій.
> 3. Наведи мишку на графік — має зʼявлятися підказка з сумою за день.
> 4. Відкрий «Транзакції»: покрути список, спробуй пошук (наприклад, «Сільпо») і фільтр категорій.
> 5. У «Налаштуваннях» натисни «Перегенерувати демо-дані» і повернись на Дашборд — цифри мають змінитися.
> 6. (За бажанням, якщо хочеш підключити свій справжній банк) Отримай токен на api.monobank.ua, встав у «Налаштуваннях» і натисни «Підключити», потім на «Транзакціях» — «Оновити з Monobank».
> Напиши, що спрацювало, а що ні.

Чекати на підтвердження.

- [ ] **Step 6: Фінальний commit**

```bash
git add src/components/transactions "src/app/(app)/transactions" README.md
git commit -m "feat: сторінка транзакцій з пошуком, фільтром і синхронізацією"
```

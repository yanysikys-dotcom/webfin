# WebFin — Етап 4 «AI-помічник»: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка-чат, де можна запитати про свої витрати звичайною мовою («скільки я витратила цього тижня?», «на що найбільше?») і отримати точну відповідь, пораховану з власних транзакцій — без платних AI-сервісів.

**Architecture:** Чат виглядає і працює як повноцінний AI-помічник, але «мозок» першої версії — наш власний код: розбір питання (намір + період + категорія) і побудова відповіді з агрегацій. Логіка розбору й формулювання — чисті функції з юніт-тестами, без мережі та бази. Джерело відповіді схоже за інтерфейсом `AssistantProvider`, тож коли зʼявиться ключ OpenAI, провайдера можна підмінити без переробки чату й API.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, Supabase, Vitest. Жодних нових залежностей.

**Специфікація:** `docs/superpowers/specs/2026-07-15-webfin-design.md` (розділ 8)

## Global Constraints

- **Жодних платних API.** Ліміти OpenAI/Anthropic не поповнені — код не має робити запитів до них. Місце для майбутнього провайдера передбачене, але не активоване.
- Мова інтерфейсу і відповідей — українська; світла тема; акцент UI — emerald.
- Помічник бачить **лише транзакції поточного користувача** — дані читаються серверним клієнтом під RLS-сесією користувача, як у Етапі 2.
- Відповідь ніколи не вигадує чисел: усе рахується з реальних рядків; якщо даних немає — так і кажемо.
- На нерозпізнане питання відповідаємо чесно («поки вмію ось це…») і показуємо підказки — не імітуємо розуміння.
- Історію чату в базі не зберігаємо (поза обсягом першої версії).
- Суми форматуються через `formatMoney`; дати — через `formatDate`.
- ⚠️ НЕ запускати `npm run build`, поки працює дев-сервер. Перевірка типів: `npx tsc --noEmit`.
- Дії Yana потрібні лише на фінальній приймальній перевірці.

---

### Task 1: Розбір питання — період

**Files:**
- Create: `src/lib/assistant/period.ts`
- Test: `src/lib/assistant/period.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type Period = { from: Date; to: Date; label: string }`
  - `parsePeriod(question: string, now?: Date): Period` — за замовчуванням «цей місяць»

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/assistant/period.test.ts`:

```ts
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/lib/assistant/period'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/assistant/period.ts`:

```ts
export type Period = { from: Date; to: Date; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Понеділок вважаємо першим днем тижня (українська норма).
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const shift = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - shift);
  return x;
}

export function parsePeriod(question: string, now = new Date()): Period {
  const q = question.toLowerCase();

  if (q.includes("сьогодні")) {
    return { from: startOfDay(now), to: endOfDay(now), label: "сьогодні" };
  }

  if (q.includes("вчора")) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: "вчора" };
  }

  if (q.includes("тижд") || q.includes("тиждень")) {
    const thisWeek = startOfWeek(now);
    if (q.includes("минул") || q.includes("попередн")) {
      const from = new Date(thisWeek);
      from.setDate(from.getDate() - 7);
      const to = new Date(thisWeek);
      to.setDate(to.getDate() - 1);
      return { from, to: endOfDay(to), label: "минулого тижня" };
    }
    return { from: thisWeek, to: endOfDay(now), label: "цього тижня" };
  }

  const days = q.match(/(\d+)\s*(дн|день|днів|дні)/);
  if (days) {
    const n = Number(days[1]);
    const from = new Date(now);
    from.setDate(from.getDate() - (n - 1));
    return {
      from: startOfDay(from),
      to: endOfDay(now),
      label: `за останні ${n} днів`,
    };
  }

  if (q.includes("рік") || q.includes("року")) {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: endOfDay(now),
      label: "цього року",
    };
  }

  if (q.includes("минул") || q.includes("попередн")) {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      label: "минулого місяця",
    };
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: endOfDay(now),
    label: "цього місяця",
  };
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/period.ts src/lib/assistant/period.test.ts
git commit -m "feat: розбір періоду з питання користувача"
```

---

### Task 2: Розбір питання — намір і категорія

**Files:**
- Create: `src/lib/assistant/intent.ts`
- Test: `src/lib/assistant/intent.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES` з `@/lib/categories` (Етап 2)
- Produces:
  - `type IntentKind = "total" | "top_categories" | "biggest" | "unusual" | "category" | "compare" | "count" | "average" | "income" | "unknown"`
  - `type Intent = { kind: IntentKind; category?: string }`
  - `parseIntent(question: string): Intent`

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/assistant/intent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/assistant/intent";

describe("parseIntent", () => {
  it("загальна сума витрат", () => {
    expect(parseIntent("скільки я витратила цього тижня").kind).toBe("total");
    expect(parseIntent("Скільки грошей пішло за місяць?").kind).toBe("total");
  });

  it("топ категорій", () => {
    expect(parseIntent("на що я витрачаю найбільше").kind).toBe("top_categories");
    expect(parseIntent("покажи топ категорій").kind).toBe("top_categories");
    expect(parseIntent("куди йдуть мої гроші").kind).toBe("top_categories");
  });

  it("найбільша покупка", () => {
    expect(parseIntent("яка була найбільша покупка").kind).toBe("biggest");
    expect(parseIntent("найдорожча витрата за місяць").kind).toBe("biggest");
  });

  it("нетипові покупки", () => {
    expect(parseIntent("чи були незвичні покупки").kind).toBe("unusual");
    expect(parseIntent("щось нетипове цього тижня?").kind).toBe("unusual");
    expect(parseIntent("дивні витрати").kind).toBe("unusual");
  });

  it("порівняння місяців", () => {
    expect(parseIntent("порівняй з минулим місяцем").kind).toBe("compare");
    expect(parseIntent("я стала більше витрачати?").kind).toBe("compare");
  });

  it("витрати в конкретній категорії", () => {
    const i = parseIntent("скільки я витратила на продукти");
    expect(i.kind).toBe("category");
    expect(i.category).toBe("Продукти");

    const j = parseIntent("а на кафе і ресторани цього місяця?");
    expect(j.kind).toBe("category");
    expect(j.category).toBe("Кафе і ресторани");
  });

  it("категорія за синонімом", () => {
    expect(parseIntent("скільки на таксі").category).toBe("Транспорт");
    expect(parseIntent("витрати на їжу").category).toBe("Продукти");
    expect(parseIntent("скільки на ліки").category).toBe("Здоровʼя");
  });

  it("кількість покупок", () => {
    expect(parseIntent("скільки разів я платила цього тижня").kind).toBe("count");
    expect(parseIntent("скільки покупок було").kind).toBe("count");
  });

  it("середній чек", () => {
    expect(parseIntent("який середній чек").kind).toBe("average");
    expect(parseIntent("середня покупка за місяць").kind).toBe("average");
  });

  it("надходження", () => {
    expect(parseIntent("скільки я отримала цього місяця").kind).toBe("income");
    expect(parseIntent("які були надходження").kind).toBe("income");
  });

  it("незрозуміле питання", () => {
    expect(parseIntent("яка погода завтра").kind).toBe("unknown");
    expect(parseIntent("привіт").kind).toBe("unknown");
  });
});
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/lib/assistant/intent'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/assistant/intent.ts`:

```ts
import { CATEGORIES } from "@/lib/categories";

export type IntentKind =
  | "total"
  | "top_categories"
  | "biggest"
  | "unusual"
  | "category"
  | "compare"
  | "count"
  | "average"
  | "income"
  | "unknown";

export type Intent = { kind: IntentKind; category?: string };

// Розмовні синоніми → наші категорії. Самі назви категорій теж шукаються.
const CATEGORY_SYNONYMS: Record<string, string> = {
  "їж": "Продукти",
  "продукт": "Продукти",
  "магазин": "Продукти",
  "супермаркет": "Продукти",
  "кафе": "Кафе і ресторани",
  "ресторан": "Кафе і ресторани",
  "каву": "Кафе і ресторани",
  "кава": "Кафе і ресторани",
  "доставк": "Кафе і ресторани",
  "таксі": "Транспорт",
  "транспорт": "Транспорт",
  "паливо": "Транспорт",
  "бензин": "Транспорт",
  "метро": "Транспорт",
  "ліки": "Здоровʼя",
  "аптек": "Здоровʼя",
  "здоров": "Здоровʼя",
  "лікар": "Здоровʼя",
  "розваг": "Розваги",
  "кіно": "Розваги",
  "підписк": "Розваги",
  "комунал": "Комуналка і звʼязок",
  "звʼяз": "Комуналка і звʼязок",
  "звязок": "Комуналка і звʼязок",
  "інтернет": "Комуналка і звʼязок",
  "шопінг": "Шопінг",
  "одяг": "Шопінг",
  "покупки в магазинах": "Шопінг",
  "подорож": "Подорожі",
  "готел": "Подорожі",
  "квитк": "Подорожі",
  "переказ": "Перекази",
};

function findCategory(q: string): string | undefined {
  for (const category of CATEGORIES) {
    if (q.includes(category.toLowerCase())) return category;
  }
  for (const [needle, category] of Object.entries(CATEGORY_SYNONYMS)) {
    if (q.includes(needle)) return category;
  }
  return undefined;
}

function hasAny(q: string, words: string[]): boolean {
  return words.some((w) => q.includes(w));
}

export function parseIntent(question: string): Intent {
  const q = question.toLowerCase();

  if (hasAny(q, ["незвич", "нетипов", "дивн", "аномал", "підозр"])) {
    return { kind: "unusual" };
  }

  if (hasAny(q, ["порівня", "більше витрача", "менше витрача", "проти минулого"])) {
    return { kind: "compare" };
  }

  if (hasAny(q, ["найбільша покупка", "найбільшу покупку", "найдорожч", "найбільша витрата"])) {
    return { kind: "biggest" };
  }

  if (hasAny(q, ["середній чек", "середня покупка", "середній платіж", "в середньому"])) {
    return { kind: "average" };
  }

  if (hasAny(q, ["скільки разів", "скільки покупок", "кількість покупок", "як часто"])) {
    return { kind: "count" };
  }

  if (hasAny(q, ["отримал", "надходженн", "заробил", "зарплат", "дохід"])) {
    return { kind: "income" };
  }

  if (hasAny(q, ["топ категор", "на що", "куди йдут", "куди пішл", "категорі", "найбільше витрача"])) {
    const category = findCategory(q);
    // «скільки на продукти» — це питання про категорію, а не про топ.
    if (category && hasAny(q, ["скільки", "витратила", "витратив"])) {
      return { kind: "category", category };
    }
    return { kind: "top_categories" };
  }

  const category = findCategory(q);
  if (category) return { kind: "category", category };

  if (hasAny(q, ["скільки", "витрат", "сума", "потратил", "пішло"])) {
    return { kind: "total" };
  }

  return { kind: "unknown" };
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/intent.ts src/lib/assistant/intent.test.ts
git commit -m "feat: розпізнавання наміру і категорії з питання"
```

---

### Task 3: Побудова відповіді

**Files:**
- Create: `src/lib/assistant/answer.ts`
- Test: `src/lib/assistant/answer.test.ts`

**Interfaces:**
- Consumes: типи `Intent` (Task 2), `Period` (Task 1); `Tx`, `totalSpent`, `spendingByCategory`, `biggestExpense`, `compareMonths` з `@/lib/analytics`; `formatMoney`, `formatDate` з `@/lib/format`
- Produces:
  - `type AssistantAnswer = { text: string; kind: IntentKind }`
  - `buildAnswer(intent: Intent, period: Period, txs: Tx[], now?: Date): AssistantAnswer` — `txs` вже відфільтровані за періодом, крім `compare` (там потрібні два місяці)
  - `SUGGESTIONS: string[]` — готові питання для кнопок-підказок

- [ ] **Step 1: Тест, що падає**

Створити `src/lib/assistant/answer.test.ts`:

```ts
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
    expect(a.text).toContain("цього місяця");
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
    expect(a.text).toContain("2 покуп");
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
```

- [ ] **Step 2: Переконатися, що падає**

Run: `npm test`
Expected: FAIL — `Cannot find package '@/lib/assistant/answer'`.

- [ ] **Step 3: Реалізація**

Створити `src/lib/assistant/answer.ts`:

```ts
import {
  biggestExpense, compareMonths, spendingByCategory, totalSpent, type Tx,
} from "@/lib/analytics";
import { formatDate, formatMoney } from "@/lib/format";
import type { Intent, IntentKind } from "@/lib/assistant/intent";
import type { Period } from "@/lib/assistant/period";

export type AssistantAnswer = { text: string; kind: IntentKind };

export const SUGGESTIONS = [
  "Скільки я витратила цього місяця?",
  "На що я витрачаю найбільше?",
  "Яка була найбільша покупка?",
  "Чи були незвичні покупки?",
  "Скільки я витратила на продукти?",
  "Порівняй з минулим місяцем",
];

const NO_DATA = "За цей період я не знайшов жодної витрати.";

function expenses(txs: Tx[]): Tx[] {
  return txs.filter((t) => t.amount < 0);
}

function answerTotal(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length === 0) return NO_DATA;
  const total = totalSpent(list);
  const top = spendingByCategory(list, 1)[0];
  return (
    `${period.label} ви витратили ${formatMoney(total)} — це ${list.length} покупок. ` +
    `Найбільше пішло на «${top.category}»: ${formatMoney(top.total)}.`
  );
}

function answerTopCategories(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length === 0) return NO_DATA;
  const slices = spendingByCategory(list, 5);
  const total = slices.reduce((s, x) => s + x.total, 0);
  const lines = slices.map(
    (s) =>
      `• ${s.category} — ${formatMoney(s.total)} (${Math.round((s.total / total) * 100)}%)`,
  );
  return `Ось куди пішли гроші ${period.label}:\n${lines.join("\n")}`;
}

function answerBiggest(period: Period, txs: Tx[]): string {
  const biggest = biggestExpense(txs);
  if (!biggest) return NO_DATA;
  return (
    `Найбільша покупка ${period.label} — «${biggest.description}» на ${formatMoney(-biggest.amount)} ` +
    `(${formatDate(biggest.occurred_at)}, категорія «${biggest.category}»).`
  );
}

function answerCategory(period: Period, txs: Tx[], category: string): string {
  const list = expenses(txs).filter((t) => t.category === category);
  if (list.length === 0) {
    return `${period.label} витрат у категорії «${category}» не було.`;
  }
  const total = totalSpent(list);
  const allTotal = totalSpent(expenses(txs));
  const share = allTotal > 0 ? Math.round((total / allTotal) * 100) : 0;
  return (
    `На «${category}» ${period.label} пішло ${formatMoney(total)} — ` +
    `${list.length} покупок, це ${share}% усіх витрат.`
  );
}

function answerCount(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length === 0) return NO_DATA;
  return `${period.label} у вас ${list.length} покупок на загальну суму ${formatMoney(totalSpent(list))}.`;
}

function answerAverage(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length === 0) return NO_DATA;
  const avg = Math.round(totalSpent(list) / list.length);
  return `Середня покупка ${period.label} — ${formatMoney(avg)} (з ${list.length} покупок).`;
}

function answerIncome(period: Period, txs: Tx[]): string {
  const list = txs.filter((t) => t.amount > 0);
  if (list.length === 0) return `${period.label} надходжень не було.`;
  const total = list.reduce((s, t) => s + t.amount, 0);
  const biggest = list.reduce((a, b) => (b.amount > a.amount ? b : a));
  return (
    `${period.label} надійшло ${formatMoney(total)} (${list.length} шт.). ` +
    `Найбільше — «${biggest.description}»: ${formatMoney(biggest.amount)}.`
  );
}

// «Незвичне» = покупка, що помітно вибивається з власної звички:
// більша за медіану щонайменше втричі. Медіана стійкіша за середнє,
// бо одна велика покупка не зміщує поріг.
function answerUnusual(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length < 4) {
    return "Замало покупок за цей період, щоб робити висновки про незвичні витрати.";
  }
  const amounts = list.map((t) => -t.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const outliers = list
    .filter((t) => -t.amount >= median * 3)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 3);

  if (outliers.length === 0) {
    return `${period.label} нічого незвичного — усі покупки приблизно в межах ваших звичайних сум (близько ${formatMoney(median)}).`;
  }
  const lines = outliers.map(
    (t) =>
      `• «${t.description}» — ${formatMoney(-t.amount)} (${formatDate(t.occurred_at)}, «${t.category}»)`,
  );
  return (
    `Ці покупки помітно вибиваються (звичайна сума ≈ ${formatMoney(median)}):\n${lines.join("\n")}`
  );
}

function answerCompare(txs: Tx[], now: Date): string {
  const r = compareMonths(txs, now);
  if (r.current === 0 && r.previous === 0) return NO_DATA;
  if (r.diff === 0) {
    return `Цього місяця ${formatMoney(r.current)} — рівно стільки ж, скільки минулого.`;
  }
  const word = r.diff > 0 ? "більше" : "менше";
  return (
    `Цього місяця ви витратили ${formatMoney(r.current)}, минулого — ${formatMoney(r.previous)}. ` +
    `Це на ${formatMoney(Math.abs(r.diff))} ${word} (${Math.abs(r.percent)}%).`
  );
}

function answerUnknown(): string {
  return (
    "Я поки що вмію відповідати на питання про ваші витрати: суми за період, " +
    "топ категорій, найбільшу покупку, незвичні витрати, порівняння місяців. " +
    "Спробуйте одну з підказок нижче."
  );
}

export function buildAnswer(
  intent: Intent,
  period: Period,
  txs: Tx[],
  now = new Date(),
): AssistantAnswer {
  const text = (() => {
    switch (intent.kind) {
      case "total":
        return answerTotal(period, txs);
      case "top_categories":
        return answerTopCategories(period, txs);
      case "biggest":
        return answerBiggest(period, txs);
      case "category":
        return answerCategory(period, txs, intent.category ?? "Інше");
      case "count":
        return answerCount(period, txs);
      case "average":
        return answerAverage(period, txs);
      case "income":
        return answerIncome(period, txs);
      case "unusual":
        return answerUnusual(period, txs);
      case "compare":
        return answerCompare(txs, now);
      default:
        return answerUnknown();
    }
  })();

  return { text, kind: intent.kind };
}
```

- [ ] **Step 4: Тести проходять**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/answer.ts src/lib/assistant/answer.test.ts
git commit -m "feat: побудова відповідей помічника з агрегацій"
```

---

### Task 4: Провайдер помічника і API

**Files:**
- Create: `src/lib/assistant/provider.ts`, `src/app/api/assistant/route.ts`

**Interfaces:**
- Consumes: `parsePeriod` (Task 1), `parseIntent` (Task 2), `buildAnswer` (Task 3); `getProfile`, `getVisibleTransactions` (Етап 2); `historyDaysFor` (Етап 3)
- Produces:
  - `type AssistantProvider = { name: string; ask(question: string, txs: Tx[], now?: Date): Promise<AssistantAnswer> }`
  - `builtinProvider: AssistantProvider`
  - `getProvider(): AssistantProvider` — сьогодні завжди вбудований; місце для OpenAI в майбутньому
  - `POST /api/assistant` body `{ question }` → `{ answer: string, kind: string, provider: string }`

- [ ] **Step 1: Провайдер**

Створити `src/lib/assistant/provider.ts`:

```ts
import type { Tx } from "@/lib/analytics";
import { buildAnswer, type AssistantAnswer } from "@/lib/assistant/answer";
import { parseIntent } from "@/lib/assistant/intent";
import { parsePeriod } from "@/lib/assistant/period";

export type AssistantProvider = {
  name: string;
  ask(question: string, txs: Tx[], now?: Date): Promise<AssistantAnswer>;
};

// Вбудований помічник: жодних зовнішніх сервісів, усе рахується локально
// з транзакцій користувача.
export const builtinProvider: AssistantProvider = {
  name: "builtin",
  async ask(question, txs, now = new Date()) {
    const intent = parseIntent(question);
    const period = parsePeriod(question, now);

    // Порівнянню місяців потрібні обидва місяці, тому період не звужуємо.
    const scoped =
      intent.kind === "compare"
        ? txs
        : txs.filter((t) => {
            const d = new Date(t.occurred_at);
            return d >= period.from && d <= period.to;
          });

    return buildAnswer(intent, period, scoped, now);
  },
};

// Коли зʼявиться ключ OpenAI — тут повертатиметься openaiProvider,
// а решта коду (API-роут і чат) не зміниться.
export function getProvider(): AssistantProvider {
  return builtinProvider;
}
```

- [ ] **Step 2: API-роут**

Створити `src/app/api/assistant/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { historyDaysFor } from "@/lib/premium";
import { getProvider } from "@/lib/assistant/provider";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { question } = await request.json().catch(() => ({}));
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "Порожнє питання" }, { status: 400 });
  }

  const profile = await getProfile(supabase);
  // Читаємо під сесією користувача — RLS гарантує, що це лише його транзакції.
  // Для порівняння місяців потрібні два місяці, тому безкоштовному даємо 62 дні.
  const premiumDays = historyDaysFor(profile);
  const transactions = await getVisibleTransactions(supabase, profile, {
    sinceDays: premiumDays === undefined ? undefined : 62,
    limit: 5000,
  });

  const provider = getProvider();
  const answer = await provider.ask(question, transactions);

  return NextResponse.json({
    answer: answer.text,
    kind: answer.kind,
    provider: provider.name,
  });
}
```

- [ ] **Step 3: Перевірити типи і захист**

```bash
npx tsc --noEmit
curl -s -X POST http://localhost:3000/api/assistant -H "Content-Type: application/json" -d '{"question":"скільки я витратила"}' | head -c 60
```

Expected: `tsc` без помилок; curl → `{"error":"Не авторизовано"}`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assistant/provider.ts src/app/api/assistant
git commit -m "feat: провайдер помічника і API чату"
```

---

### Task 5: Інтерфейс чату

**Files:**
- Create: `src/components/assistant/chat.tsx`
- Modify: `src/app/(app)/assistant/page.tsx` (повна заміна вмісту)

**Interfaces:**
- Consumes: `SUGGESTIONS` (Task 3); `POST /api/assistant` (Task 4)
- Produces: сторінка `/assistant` — чат із бульбашками, полем вводу і кнопками-підказками

- [ ] **Step 1: Компонент чату**

Створити `src/components/assistant/chat.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { SUGGESTIONS } from "@/lib/assistant/answer";

type Message = { role: "user" | "assistant"; text: string };

const GREETING: Message = {
  role: "assistant",
  text:
    "Привіт! Я знаю все про ваші витрати у WebFin. Запитайте, скільки ви витратили " +
    "за період, на що йде найбільше, яка була найбільша чи незвична покупка. " +
    "Можна просто натиснути підказку нижче.",
};

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: res.ok
          ? json.answer
          : (json.error ?? "Не вдалося відповісти. Спробуйте ще раз."),
      },
    ]);
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
          >
            {m.role === "assistant" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <User className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Bot className="h-4 w-4" />
            </span>
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
              Рахую…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Запитайте про свої витрати…"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            aria-label="Надіслати"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Сторінка**

Замінити ПОВНІСТЮ вміст `src/app/(app)/assistant/page.tsx`:

```tsx
import { AssistantChat } from "@/components/assistant/chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI-помічник</h1>
        <p className="mt-1 text-sm text-slate-500">
          Запитайте про свої витрати звичайною мовою — відповідь рахується з ваших
          транзакцій.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
```

- [ ] **Step 3: Перевірити наживо**

```bash
npx tsc --noEmit
```

Expected: без помилок.

У браузері (з активною сесією) відкрити http://localhost:3000/assistant і перевірити:
1. Показується вітальне повідомлення і 6 кнопок-підказок
2. Натискання підказки «Скільки я витратила цього місяця?» дає відповідь із сумою і кількістю покупок
3. «На що я витрачаю найбільше?» дає список категорій із відсотками
4. Власне питання «скільки на таксі минулого тижня» дає відповідь про Транспорт за минулий тиждень
5. «яка погода завтра» дає чесну відповідь про те, що помічник вміє

- [ ] **Step 4: Commit**

```bash
git add src/components/assistant "src/app/(app)/assistant"
git commit -m "feat: інтерфейс чату AI-помічника"
```

---

### Task 6: Наскрізна перевірка і завершення проєкту

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-07-15-webfin-design.md` (статус)

**Interfaces:**
- Consumes: усе з Tasks 1–5
- Produces: перевірений Етап 4; документація описує готову платформу

- [ ] **Step 1: Перевірити ізоляцію даних помічника**

Створити другого користувача не потрібно — перевіряємо, що помічник читає дані під RLS-сесією: у роуті `src/app/api/assistant/route.ts` використовується `createClient()` (сесія користувача), а не `createAdminClient()`.

```bash
grep -n "createAdminClient" src/app/api/assistant/route.ts || echo "✅ помічник не використовує admin-клієнт (читає лише свої дані під RLS)"
```

Expected: `✅ помічник не використовує admin-клієнт…`.

- [ ] **Step 2: Повна перевірка**

```bash
npm test
```

Expected: усі тести PASS.

Зупинити дев-сервер, потім:

```bash
pkill -f "next dev"; sleep 2; npm run build
```

Expected: `Compiled successfully`. Далі знову запустити дев-сервер.

- [ ] **Step 3: Оновити README**

У `README.md` замінити:

```markdown
Етап 3 «Преміум» готовий: оплата віджетом WayForPay (тестовий режим),
повна історія, порівняння місяців і експорт у Excel.
Далі — Етап 4 «AI-помічник».
```

на:

```markdown
Усі чотири етапи готові: реєстрація, дані з Monobank або демо, дашборд
із графіками, преміум через WayForPay і чат-помічник про витрати.

AI-помічник працює без платних API: розбирає питання і рахує відповідь
з ваших транзакцій. Коли зʼявиться ключ OpenAI, провайдера у
`src/lib/assistant/provider.ts` можна замінити без переробки чату.
```

- [ ] **Step 4: Оновити статус у специфікації**

У `docs/superpowers/specs/2026-07-15-webfin-design.md` замінити рядок:

```markdown
**Статус:** дизайн затверджено користувачем (Yana), очікує ревʼю специфікації
```

на:

```markdown
**Статус:** реалізовано повністю (етапи 1–4), 2026-09-15
```

- [ ] **Step 5: 🧑 ДІЯ КОРИСТУВАЧА (Yana) — приймальна перевірка**

Передати Yana в чат дослівно:

> Етап 4 готовий — це останній! Перевір, будь ласка:
> 1. Відкрий http://localhost:3000 і зайди у вкладку **«AI-помічник»**.
> 2. Натисни будь-яку підказку внизу, наприклад «Скільки я витратила цього місяця?» — помічник має відповісти сумою і кількістю покупок.
> 3. Спробуй «На що я витрачаю найбільше?» — має бути список категорій із відсотками.
> 4. Напиши щось своє, наприклад: «скільки на таксі минулого тижня» або «чи були незвичні покупки».
> 5. Спробуй питання не по темі («яка погода завтра») — помічник має чесно сказати, що вміє лише про витрати.
> Напиши, які відповіді сподобались, а де він не зрозумів — я допишу розпізнавання.

Чекати на підтвердження.

- [ ] **Step 6: Фінальний commit**

```bash
git add README.md docs/superpowers/specs/2026-07-15-webfin-design.md
git commit -m "docs: README і статус специфікації (Етап 4 завершено)"
```

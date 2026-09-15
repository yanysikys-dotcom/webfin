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

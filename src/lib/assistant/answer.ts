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
// щонайменше вдвічі більша за медіанну. Медіана стійкіша за середнє,
// бо одна велика покупка не зміщує поріг. Показуємо не більше трьох.
const UNUSUAL_THRESHOLD = 2;
function answerUnusual(period: Period, txs: Tx[]): string {
  const list = expenses(txs);
  if (list.length < 4) {
    return "Замало покупок за цей період, щоб робити висновки про незвичні витрати.";
  }
  const amounts = list.map((t) => -t.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const outliers = list
    .filter((t) => -t.amount >= median * UNUSUAL_THRESHOLD)
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

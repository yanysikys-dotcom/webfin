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

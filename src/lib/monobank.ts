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

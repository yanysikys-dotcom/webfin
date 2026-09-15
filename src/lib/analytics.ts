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

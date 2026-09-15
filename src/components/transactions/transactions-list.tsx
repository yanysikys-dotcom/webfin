"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Search } from "lucide-react";
import { CATEGORIES, colorForCategory } from "@/lib/categories";
import type { TxRow } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export function TransactionsList({
  transactions,
  showSync,
  isPremium,
}: {
  transactions: TxRow[];
  showSync: boolean;
  isPremium: boolean;
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
                  className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
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

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

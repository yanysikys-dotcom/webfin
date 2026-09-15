"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  // null — ще перевіряємо посилання; true — можна міняти; false — посилання недійсне
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Перехід за посиланням з листа створює тимчасову сесію відновлення.
    // Клієнт Supabase обробляє адресу сам, тому просто чекаємо на сесію.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(() => setReady((r) => (r === null ? false : r)), 2500);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== repeat) {
      setError("Паролі не збігаються");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(`Не вдалося змінити пароль: ${error.message}`);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <KeyRound className="h-7 w-7 text-emerald-600" />
          <h1 className="text-xl font-semibold text-slate-900">Новий пароль</h1>
        </div>

        {ready === null && <p className="text-sm text-slate-500">Перевіряю посилання…</p>}

        {ready === false && (
          <>
            <p className="text-sm text-slate-600">
              Посилання недійсне або застаріле — вони діють одну годину. Запросіть нове.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 block rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Надіслати нове посилання
            </Link>
          </>
        )}

        {ready === true && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Новий пароль
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Щонайменше 6 символів"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="repeat"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Повторіть пароль
              </label>
              <input
                id="repeat"
                type="password"
                required
                minLength={6}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                placeholder="Той самий пароль"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Зберігаю…" : "Зберегти пароль"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

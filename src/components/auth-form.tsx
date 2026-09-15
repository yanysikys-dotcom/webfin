"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { mode: "login" | "register" };

const TEXTS = {
  login: {
    title: "Вхід у WebFin",
    button: "Увійти",
    switchText: "Ще немає акаунта?",
    switchHref: "/register",
    switchLabel: "Зареєструватися",
  },
  register: {
    title: "Реєстрація у WebFin",
    button: "Створити акаунт",
    switchText: "Вже є акаунт?",
    switchHref: "/login",
    switchLabel: "Увійти",
  },
} as const;

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = TEXTS[mode];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(
        mode === "login"
          ? "Невірний email або пароль"
          : `Не вдалося зареєструватися: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Wallet className="h-7 w-7 text-emerald-600" />
          <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Пароль
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Зачекайте…" : t.button}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-slate-500 hover:text-emerald-600 hover:underline"
            >
              Забули пароль?
            </Link>
          </p>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          {t.switchText}{" "}
          <Link
            href={t.switchHref}
            className="font-medium text-emerald-600 hover:underline"
          >
            {t.switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("rate")
          ? "Забагато спроб. Зачекайте кілька хвилин і спробуйте ще раз."
          : "Не вдалося надіслати лист. Перевірте адресу і спробуйте ще раз.",
      );
      return;
    }
    // Показуємо те саме повідомлення незалежно від того, чи існує акаунт —
    // щоб сторонні не могли перевіряти, хто зареєстрований на платформі.
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <KeyRound className="h-7 w-7 text-emerald-600" />
          <h1 className="text-xl font-semibold text-slate-900">Відновлення пароля</h1>
        </div>

        {sent ? (
          <>
            <p className="text-sm text-slate-600">
              Якщо акаунт з адресою <span className="font-medium">{email}</span> існує,
              ми надіслали на неї лист із посиланням для зміни пароля. Перевірте пошту
              (і теку «Спам») — посилання діє годину.
            </p>
            <Link
              href="/login"
              className="mt-6 block rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Повернутися до входу
            </Link>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">
              Введіть пошту, якою ви реєструвалися — ми надішлемо посилання для
              встановлення нового пароля.
            </p>
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

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Надсилаю…" : "Надіслати посилання"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              Згадали пароль?{" "}
              <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                Увійти
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

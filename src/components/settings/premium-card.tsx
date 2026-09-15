"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Profile } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isPremiumActive, premiumDaysLeft } from "@/lib/premium";

// Віджет WayForPay підвантажується скриптом і кладе конструктор у window.
declare global {
  interface Window {
    Wayforpay?: new () => {
      run: (
        params: Record<string, unknown>,
        approved: () => void,
        declined: () => void,
        pending: () => void,
      ) => void;
    };
  }
}

const BENEFITS = [
  "Уся історія транзакцій (без обмеження 30 днів)",
  "Порівняння місяців на дашборді",
  "Експорт транзакцій у Excel",
];

export function PremiumCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = isPremiumActive(profile);

  // Закриття вікна оплати не викликає жодного з трьох колбеків run(),
  // тому без цього кнопка назавжди залишилась би заблокованою.
  useEffect(() => {
    function onWidgetMessage(event: MessageEvent) {
      if (event.data === "WfpWidgetEventClose") setBusy(false);
    }
    window.addEventListener("message", onWidgetMessage);
    return () => window.removeEventListener("message", onWidgetMessage);
  }, []);

  async function verify(orderReference: string) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderReference }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (json.premium) {
      setNotice("Преміум активовано! ⭐");
      router.refresh();
    } else {
      setError(json.error ?? `Оплата не пройшла (статус: ${json.status ?? "невідомо"})`);
    }
  }

  async function handleBuy() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/payments/create", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? "Не вдалося створити замовлення");
      return;
    }

    if (!window.Wayforpay) {
      setBusy(false);
      setError("Віджет оплати ще завантажується. Спробуй за кілька секунд.");
      return;
    }

    const orderReference = json.params.orderReference as string;
    new window.Wayforpay().run(
      json.params,
      () => verify(orderReference),
      () => {
        setBusy(false);
        setError("Оплату відхилено");
      },
      () => {
        setBusy(false);
        setNotice("Платіж обробляється — перевір статус за хвилину.");
      },
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <Script src="https://secure.wayforpay.com/server/pay-widget.js" strategy="afterInteractive" />

      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="font-medium text-slate-900">Преміум</h2>
        {active && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Активний
          </span>
        )}
      </div>

      {active ? (
        <p className="mt-2 text-sm text-slate-600">
          Підписка діє до {formatDate(profile.premium_until!)} (залишилось{" "}
          {premiumDaysLeft(profile)} дн.)
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            100 ₴ за 30 днів. Оплата у тестовому режимі — реальні гроші не списуються.
          </p>
          <ul className="mt-3 space-y-1.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {b}
              </li>
            ))}
          </ul>
          <button
            onClick={handleBuy}
            disabled={busy}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "Відкриваю оплату…" : "Купити Преміум"}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
    </section>
  );
}

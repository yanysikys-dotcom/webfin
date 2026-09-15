import {
  avgPerDay, biggestExpense, compareMonths, filterSinceDays, monthSpent,
  spendingByCategory, spendingByDay,
} from "@/lib/analytics";
import { getAccounts, getProfile, getVisibleTransactions } from "@/lib/data";
import { seedDemoData } from "@/lib/demo-seed";
import { formatMoney } from "@/lib/format";
import { historyDaysFor, isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { MonthComparison } from "@/components/dashboard/month-comparison";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SummaryCards } from "@/components/dashboard/summary-cards";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  // Новий користувач із джерелом «демо» і порожньою базою — засіваємо одразу,
  // щоб дашборд ніколи не був порожнім.
  // Безкоштовний акаунт бачить 30 днів; преміум — усю історію
  // (historyDaysFor повертає undefined = без обмеження за датою).
  const premium = isPremiumActive(profile);
  const sinceDays = historyDaysFor(profile);

  let txs = await getVisibleTransactions(supabase, profile, { sinceDays });
  if (profile.data_source === "demo" && txs.length === 0) {
    await seedDemoData(profile.id);
    txs = await getVisibleTransactions(supabase, profile, { sinceDays });
  }
  const accounts = await getAccounts(supabase, profile);

  const last30 = filterSinceDays(txs, 30);
  const biggest = biggestExpense(last30);
  const balance = accounts.reduce((s, a) => s + a.balance, 0);

  const cards = [
    { label: "Витрати цього місяця", value: formatMoney(monthSpent(txs)) },
    { label: "Середнє за день (30 дн)", value: formatMoney(avgPerDay(last30, 30)) },
    {
      label: "Найбільша покупка",
      value: biggest ? formatMoney(-biggest.amount) : "—",
      hint: biggest?.description,
    },
    { label: "Баланс", value: formatMoney(balance) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Дашборд</h1>
      <SummaryCards cards={cards} />
      {premium && <MonthComparison {...compareMonths(txs)} />}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpendingChart data={spendingByDay(last30, 30)} />
        <CategoryDonut data={spendingByCategory(last30)} />
      </div>
      {!premium && (
        <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Безкоштовний акаунт показує аналітику за останні 30 днів. Преміум відкриває
          всю історію, порівняння місяців і експорт у Excel — у «Налаштуваннях».
        </p>
      )}
      {txs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Даних поки немає. Відкрий «Транзакції» і натисни «Оновити з Monobank», або
          увімкни демо-дані в «Налаштуваннях».
        </p>
      )}
    </div>
  );
}

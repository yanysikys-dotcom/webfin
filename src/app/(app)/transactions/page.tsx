import { getProfile, getVisibleTransactions } from "@/lib/data";
import { historyDaysFor, isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { TransactionsList } from "@/components/transactions/transactions-list";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const premium = isPremiumActive(profile);
  const transactions = await getVisibleTransactions(supabase, profile, {
    sinceDays: historyDaysFor(profile),
    limit: premium ? 5000 : 1000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Транзакції</h1>
      <TransactionsList
        transactions={transactions}
        showSync={profile.data_source === "monobank"}
      />
    </div>
  );
}

import { getProfile, getVisibleTransactions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TransactionsList } from "@/components/transactions/transactions-list";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const transactions = await getVisibleTransactions(supabase, profile, { limit: 1000 });

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

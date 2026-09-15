import { generateDemoTransactions } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/admin";

// Видаляє старі демо-дані користувача і засіває нові. Повертає кількість транзакцій.
export async function seedDemoData(userId: string): Promise<number> {
  const admin = createAdminClient();

  await admin.from("transactions").delete().eq("user_id", userId).eq("is_demo", true);
  await admin.from("accounts").delete().eq("user_id", userId).eq("is_demo", true);

  const { data: account, error: accErr } = await admin
    .from("accounts")
    .insert({ user_id: userId, name: "Демо-картка", currency: "UAH", is_demo: true })
    .select("id")
    .single();
  if (accErr || !account) throw accErr ?? new Error("Не вдалося створити демо-рахунок");

  const txs = generateDemoTransactions();
  const rows = txs.map((t) => ({ ...t, user_id: userId, account_id: account.id }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("transactions").insert(rows.slice(i, i + 500));
    if (error) throw error;
  }

  const last = txs[txs.length - 1];
  await admin.from("accounts").update({ balance: last.balance_after }).eq("id", account.id);
  await admin.from("profiles").update({ data_source: "demo" }).eq("id", userId);
  return rows.length;
}

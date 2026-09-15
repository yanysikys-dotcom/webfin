import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string;
  is_premium: boolean;
  premium_until: string | null;
  data_source: "demo" | "monobank";
};

export type TxRow = {
  id: string;
  occurred_at: string;
  description: string;
  amount: number;
  mcc: number | null;
  category: string;
  account_id: string;
};

export type AccountRow = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  mono_account_id: string | null;
  is_demo: boolean;
};

export async function getProfile(supabase: SupabaseClient): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, is_premium, premium_until, data_source")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getVisibleTransactions(
  supabase: SupabaseClient,
  profile: Profile,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<TxRow[]> {
  let query = supabase
    .from("transactions")
    .select("id, occurred_at, description, amount, mcc, category, account_id")
    .eq("is_demo", profile.data_source === "demo")
    .order("occurred_at", { ascending: false })
    .limit(opts.limit ?? 2000);
  if (opts.sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - opts.sinceDays);
    query = query.gte("occurred_at", since.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TxRow[];
}

export async function getAccounts(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, currency, balance, mono_account_id, is_demo")
    .eq("is_demo", profile.data_source === "demo");
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { PremiumCard } from "@/components/settings/premium-card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const { data: monoAccounts } = await supabase
    .from("accounts")
    .select("id, name, currency, balance")
    .eq("is_demo", false)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Налаштування</h1>
      <div className="max-w-2xl">
        <PremiumCard profile={profile} />
      </div>
      <SettingsPanel profile={profile} monoAccounts={monoAccounts ?? []} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getProfile } from "@/lib/data";
import { isPremiumActive } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Другий рубіж захисту на додачу до middleware
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isPremium={isPremiumActive(profile)} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

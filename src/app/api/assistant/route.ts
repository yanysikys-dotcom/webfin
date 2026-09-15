import { NextResponse } from "next/server";
import { getProfile, getVisibleTransactions } from "@/lib/data";
import { historyDaysFor } from "@/lib/premium";
import { getProvider } from "@/lib/assistant/provider";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { question } = await request.json().catch(() => ({}));
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "Порожнє питання" }, { status: 400 });
  }

  const profile = await getProfile(supabase);
  // Читаємо під сесією користувача — RLS гарантує, що це лише його транзакції.
  // Для порівняння місяців потрібні два місяці, тому безкоштовному даємо 62 дні.
  const premiumDays = historyDaysFor(profile);
  const transactions = await getVisibleTransactions(supabase, profile, {
    sinceDays: premiumDays === undefined ? undefined : 62,
    limit: 5000,
  });

  const provider = getProvider();
  const answer = await provider.ask(question, transactions);

  return NextResponse.json({
    answer: answer.text,
    kind: answer.kind,
    provider: provider.name,
  });
}

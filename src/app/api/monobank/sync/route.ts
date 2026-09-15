import { NextResponse } from "next/server";
import { decryptToken } from "@/lib/crypto";
import { fetchStatement, MonobankError, monoTxToRow } from "@/lib/monobank";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("monobank_tokens")
    .select("encrypted_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tokenRow) {
    return NextResponse.json(
      { error: "Спочатку підключи Monobank у Налаштуваннях" },
      { status: 400 },
    );
  }
  const token = decryptToken(tokenRow.encrypted_token);

  const { data: accounts } = await admin
    .from("accounts")
    .select("id, mono_account_id")
    .eq("user_id", user.id)
    .eq("is_demo", false)
    .not("mono_account_id", "is", null);

  const toSec = Math.floor(Date.now() / 1000);
  const fromSec = toSec - 31 * 24 * 60 * 60;
  let added = 0;
  let rateLimited = false;

  for (const acc of accounts ?? []) {
    try {
      const items = await fetchStatement(token, acc.mono_account_id!, fromSec, toSec);
      if (items.length === 0) continue;

      const rows = items.map((i) => monoTxToRow(i, user.id, acc.id));
      const { count, error } = await admin
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,mono_id", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      added += count ?? 0;

      // items[0] — найновіша операція, її balance = актуальний баланс картки
      await admin.from("accounts").update({ balance: items[0].balance }).eq("id", acc.id);
    } catch (e) {
      if (e instanceof MonobankError && e.status === 429) {
        rateLimited = true;
        break;
      }
      if (e instanceof MonobankError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  return NextResponse.json({ added, rateLimited });
}

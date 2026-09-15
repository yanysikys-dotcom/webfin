import { NextResponse } from "next/server";
import { encryptToken } from "@/lib/crypto";
import { accountLabel, currencyName, fetchClientInfo, MonobankError } from "@/lib/monobank";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { token } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Встав токен з api.monobank.ua" }, { status: 400 });
  }

  try {
    const info = await fetchClientInfo(token);
    const admin = createAdminClient();

    await admin
      .from("monobank_tokens")
      .upsert({ user_id: user.id, encrypted_token: encryptToken(token) });

    for (const acc of info.accounts) {
      await admin.from("accounts").upsert(
        {
          user_id: user.id,
          mono_account_id: acc.id,
          name: accountLabel(acc),
          currency: currencyName(acc.currencyCode),
          balance: acc.balance,
          is_demo: false,
        },
        { onConflict: "user_id,mono_account_id" },
      );
    }

    await admin.from("profiles").update({ data_source: "monobank" }).eq("id", user.id);
    return NextResponse.json({ connected: info.accounts.length, name: info.name });
  } catch (e) {
    if (e instanceof MonobankError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
